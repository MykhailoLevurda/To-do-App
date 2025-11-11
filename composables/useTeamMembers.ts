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
import type { TeamMember } from '~/types';

export const useTeamMembers = () => {
  const { $firestore } = useNuxtApp();
  const firestore = $firestore;
  const auth = useAuth();

  /**
   * Přidá uživatele do týmu projektu přes email
   * Pokud uživatel s daným emailem existuje, přidá ho
   * Pokud ne, vytvoří pending pozvánku
   */
  const addTeamMember = async (projectId: string, email: string) => {
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

      // Přidej člena do týmu
      const newMember: Omit<TeamMember, 'addedAt'> & { addedAt: any } = {
        userId,
        email: normalizedEmail,
        displayName,
        addedAt: serverTimestamp(),
        addedBy: auth.user.value.uid
      };

      await updateDoc(projectRef, {
        teamMembers: arrayUnion(newMember),
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
   * Aktualizuje seznam členů týmu (používá se když chceme odebrat člena)
   */
  const updateTeamMembers = async (projectId: string, members: TeamMember[]) => {
    if (!auth.user.value) {
      console.warn('[Team] Cannot update members - not authenticated');
      return false;
    }

    try {
      const projectRef = doc(firestore, 'projects', projectId);
      await updateDoc(projectRef, {
        teamMembers: members as any,
        updatedAt: serverTimestamp()
      });

      console.log('[Team] Team members updated');
      return true;
    } catch (error) {
      console.error('[Team] Error updating members:', error);
      return false;
    }
  };

  return {
    addTeamMember,
    removeTeamMember,
    updateTeamMembers
  };
};

