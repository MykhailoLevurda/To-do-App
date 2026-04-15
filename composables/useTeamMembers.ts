import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import type { TeamMember, TeamMemberRole, ProjectMemberRoles } from '~/types';

function membersToRoles(members: TeamMember[]): ProjectMemberRoles {
  return members.reduce<ProjectMemberRoles>(
    (acc, m) => ({ ...acc, [m.userId]: (m.role === 'admin' ? 'admin' : 'member') }),
    {}
  );
}

function membersToMemberIds(members: TeamMember[]): string[] {
  return members.map((m) => m.userId);
}

export const useTeamMembers = () => {
  const { $firestore } = useNuxtApp();
  const firestore = $firestore;
  const auth = useAuth();

  /**
   * Přidá uživatele do týmu projektu přes email.
   * Role výchozí 'member'. Pouze Owner/Admin mohou přidávat.
   */
  const addTeamMember = async (
    projectId: string,
    email: string,
    role: 'admin' | 'member' = 'member'
  ) => {
    if (!auth.user.value) {
      console.warn('[Team] Cannot add member - not authenticated');
      return false;
    }

    try {
      // Normalizuj email
      const normalizedEmail = email.toLowerCase().trim();

      // Pro pozvánky vždy používáme pending_ placeholder – Firestore pravidla nedovolují
      // klientovi číst ostatní uživatele (users/{userId} allow read pouze vlastní dokument).
      // Při přijetí pozvánky acceptProjectInvite nahradí pending skutečným userId.
      const userId = `pending_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`;
      const displayName = normalizedEmail.split('@')[0];

      // Zkontroluj, jestli už není v týmu
      const projectRef = doc(firestore, 'projects', projectId);
      const projectDoc = await getDoc(projectRef);
      
      if (projectDoc.exists()) {
        const projectData = projectDoc.data();
        const existingMembers = projectData.teamMembers || [];
        
        // Zkontroluj, jestli už není v týmu
        if (existingMembers.some((m: any) => m.email === normalizedEmail)) {
          console.warn('[Team] Member already in team:', normalizedEmail);
          return false;
        }
      }

      // arrayUnion() neakceptuje serverTimestamp() – používáme new Date()
      const newMember: Omit<TeamMember, 'addedAt'> & { addedAt: Date } = {
        userId,
        email: normalizedEmail,
        displayName,
        addedAt: new Date(),
        addedBy: auth.user.value.uid,
        role
      };

      const projectData = projectDoc.exists() ? projectDoc.data() : {};
      const existingMembers = (projectData.teamMembers || []) as TeamMember[];
      const existingRoles = (projectData.memberRoles || {}) as ProjectMemberRoles;
      const existingMemberIds = (projectData.memberIds || []) as string[];
      const newMemberRoles = { ...existingRoles, [userId]: role };
      const newMemberIds = existingMemberIds.includes(userId) ? existingMemberIds : [...existingMemberIds, userId];
      const pendingInviteEmails = (projectData.pendingInviteEmails || []) as string[];
      const newPendingInviteEmails = userId.startsWith('pending_')
        ? [...new Set([...pendingInviteEmails, normalizedEmail])]
        : pendingInviteEmails;

      await updateDoc(projectRef, {
        teamMembers: arrayUnion(newMember),
        memberRoles: newMemberRoles,
        memberIds: newMemberIds,
        pendingInviteEmails: newPendingInviteEmails,
        updatedAt: serverTimestamp()
      });

      console.log('[Team] Member added:', normalizedEmail);
      return true;
    } catch (error) {
      console.error('[Team] Error adding member:', error);
      return false;
    }
  };

  /**
   * Odebere uživatele z týmu projektu
   * Poznámka: arrayRemove vyžaduje přesnou shodu objektu, proto používáme updateTeamMembers
   */
  const removeTeamMember = async (projectId: string, email: string) => {
    try {
      const projectRef = doc(firestore, 'projects', projectId);
      const projectDoc = await getDoc(projectRef);
      
      if (!projectDoc.exists()) {
        console.warn('[Team] Project not found:', projectId);
        return false;
      }

      const projectData = projectDoc.data();
      const currentMembers = (projectData.teamMembers || []) as TeamMember[];
      const updatedMembers = currentMembers.filter(m => m.email !== email);
      const pendingEmails = (projectData.pendingInviteEmails || []) as string[];
      const removedMember = currentMembers.find(m => m.email === email);
      const newPendingEmails = removedMember?.userId?.startsWith('pending_')
        ? pendingEmails.filter(e => e !== email.toLowerCase().trim())
        : pendingEmails;

      await updateDoc(projectRef, {
        teamMembers: updatedMembers as any,
        memberRoles: membersToRoles(updatedMembers),
        memberIds: membersToMemberIds(updatedMembers),
        pendingInviteEmails: newPendingEmails,
        updatedAt: serverTimestamp()
      });
      console.log('[Team] Member removed:', email);
      return true;
    } catch (error) {
      console.error('[Team] Error removing member:', error);
      return false;
    }
  };

  /**
   * Aktualizuje seznam členů týmu (používá se když chceme odebrat člena nebo změnit role).
   */
  const updateTeamMembers = async (projectId: string, members: TeamMember[]) => {
    if (!auth.user.value) {
      console.warn('[Team] Cannot update members - not authenticated');
      return false;
    }

    try {
      const projectRef = doc(firestore, 'projects', projectId);
      const memberRoles = membersToRoles(members);
      const memberIds = membersToMemberIds(members);
      await updateDoc(projectRef, {
        teamMembers: members as any,
        memberRoles,
        memberIds,
        updatedAt: serverTimestamp()
      });

      console.log('[Team] Team members updated');
      return true;
    } catch (error) {
      console.error('[Team] Error updating members:', error);
      return false;
    }
  };

  /**
   * Přijme pozvánku přes server API (obchází Firestore rules).
   * Při selhání API (chybí FIREBASE_SERVICE_ACCOUNT) zkusí fallback na přímé Firestore.
   */
  const acceptProjectInviteViaApi = async (
    projectId: string,
    fallbackEmail?: string,
    fallbackRole: 'admin' | 'member' = 'member',
    inviteToken?: string
  ): Promise<boolean> => {
    if (!auth.user.value) return false;

    try {
      const nuxtApp = useNuxtApp();
      const firebaseAuth = (nuxtApp as any).$firebaseAuth;
      if (!firebaseAuth?.currentUser) return false;

      const token = await firebaseAuth.currentUser.getIdToken();
      const body: Record<string, string> = inviteToken
        ? { inviteToken }
        : { projectId };

      const res = await $fetch<{ success: boolean; error?: string }>('/api/invite/accept', {
        method: 'POST',
        body,
        headers: { Authorization: `Bearer ${token}` }
      });

      return res.success;
    } catch (e) {
      console.warn('[Team] acceptProjectInviteViaApi failed, fallback to Firestore:', e);
      const email = fallbackEmail || auth.user.value?.email;
      if (!email) return false;
      return acceptProjectInvite(projectId, email, fallbackRole);
    }
  };

  /**
   * Přijme pozvánku – nahradí pending člena skutečným uživatelem.
   * Volá uživatel, který byl pozván (jeho email musí být v pendingInviteEmails).
   * Problém: Firestore rules mohou selhat kvůli request.auth.token.email (case, null).
   * Preferujte acceptProjectInviteViaApi.
   */
  const acceptProjectInvite = async (
    projectId: string,
    email: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<boolean> => {
    if (!auth.user.value) return false;

    const normalizedEmail = email.toLowerCase().trim();
    const realUserId = auth.user.value.uid;
    const displayName = auth.user.value.displayName || auth.user.value.email?.split('@')[0];

    try {
      const projectRef = doc(firestore, 'projects', projectId);
      const projectDoc = await getDoc(projectRef);
      if (!projectDoc.exists()) return false;

      const projectData = projectDoc.data();
      const members = (projectData.teamMembers || []) as TeamMember[];
      const pendingEmails = (projectData.pendingInviteEmails || []) as string[];

      const pendingIndex = members.findIndex(
        (m) => m.email === normalizedEmail && m.userId?.startsWith('pending_')
      );
      if (pendingIndex === -1) {
        console.warn('[Team] No pending invite found for:', normalizedEmail);
        return false;
      }

      const newMember: TeamMember = {
        userId: realUserId,
        email: normalizedEmail,
        displayName,
        addedAt: members[pendingIndex].addedAt instanceof Date ? members[pendingIndex].addedAt : new Date(),
        addedBy: members[pendingIndex].addedBy,
        role
      };

      const updatedMembers = [...members];
      updatedMembers[pendingIndex] = newMember;

      const newPendingEmails = pendingEmails.filter((e) => e !== normalizedEmail);

      await updateDoc(projectRef, {
        teamMembers: updatedMembers as any,
        memberRoles: membersToRoles(updatedMembers),
        memberIds: membersToMemberIds(updatedMembers),
        pendingInviteEmails: newPendingEmails,
        updatedAt: serverTimestamp()
      });

      console.log('[Team] Invite accepted:', normalizedEmail);
      return true;
    } catch (error) {
      console.error('[Team] Error accepting invite:', error);
      return false;
    }
  };

  /**
   * Změní roli člena týmu (admin | member). Owner měnit nelze – ten je vždy createdBy.
   * Pouze Owner/Admin mohou měnit role.
   */
  const changeMemberRole = async (
    projectId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<boolean> => {
    try {
      const projectRef = doc(firestore, 'projects', projectId);
      const projectDoc = await getDoc(projectRef);
      if (!projectDoc.exists()) return false;

      const projectData = projectDoc.data();
      const members = (projectData.teamMembers || []) as TeamMember[];
      const index = members.findIndex((m) => m.userId === userId);
      if (index === -1) return false;

      const updated = [...members];
      updated[index] = { ...updated[index], role };
      return await updateTeamMembers(projectId, updated);
    } catch (error) {
      console.error('[Team] Error changing role:', error);
      return false;
    }
  };

  return {
    addTeamMember,
    removeTeamMember,
    updateTeamMembers,
    changeMemberRole,
    acceptProjectInvite,
    acceptProjectInviteViaApi
  };
};

