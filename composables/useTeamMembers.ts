import {
  collection,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  query,
  where,
  getDocs
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

      // Zkus najít uživatele s tímto emailem
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', normalizedEmail));
      const querySnapshot = await getDocs(q);

      let userId: string;
      let displayName: string | undefined;

      if (!querySnapshot.empty) {
        // Uživatel existuje
        const userDoc = querySnapshot.docs[0];
        userId = userDoc.id;
        displayName = userDoc.data().displayName;
      } else {
        // Uživatel neexistuje - vytvoříme placeholder
        // V produkci byste zde mohli odeslat pozvánku emailem
        userId = `pending_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`;
        displayName = normalizedEmail.split('@')[0];
      }

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

      const newMember: Omit<TeamMember, 'addedAt'> & { addedAt: any } = {
        userId,
        email: normalizedEmail,
        displayName,
        addedAt: serverTimestamp(),
        addedBy: auth.user.value.uid,
        role
      };

      const projectData = projectDoc.exists() ? projectDoc.data() : {};
      const existingMembers = (projectData.teamMembers || []) as TeamMember[];
      const existingRoles = (projectData.memberRoles || {}) as ProjectMemberRoles;
      const existingMemberIds = (projectData.memberIds || []) as string[];
      const newMemberRoles = { ...existingRoles, [userId]: role };
      const newMemberIds = existingMemberIds.includes(userId) ? existingMemberIds : [...existingMemberIds, userId];

      await updateDoc(projectRef, {
        teamMembers: arrayUnion(newMember),
        memberRoles: newMemberRoles,
        memberIds: newMemberIds,
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
      
      return await updateTeamMembers(projectId, updatedMembers);
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
    changeMemberRole
  };
};

