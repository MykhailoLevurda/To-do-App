import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  serverTimestamp,
  where,
  type Unsubscribe
} from 'firebase/firestore';
import type { Project } from '~/types';

export const useFirestoreProjects = () => {
  const { $firestore } = useNuxtApp();
  const firestore = $firestore;
  const auth = useAuth();
  const projectsStore = useProjectsStore();
  
  let unsubscribe: Unsubscribe | null = null;

  const startListening = () => {
    if (!auth.isAuthenticated.value || !auth.user.value) {
      console.warn('[Firestore Projects] Cannot start listening - not authenticated');
      projectsStore.setLoading(false);
      return;
    }

    const userId = auth.user.value.uid;
    console.log('[Firestore Projects] Starting listener for user:', userId);

    projectsStore.setLoading(true);

    // Stop existing listener if any
    if (unsubscribe) {
      console.log('[Firestore Projects] Stopping previous listener');
      unsubscribe();
    }

    const projectsRef = collection(firestore, 'projects');
    // Filter projects by current user
    const q = query(
      projectsRef, 
      where('createdBy', '==', userId)
    );

    console.log('[Firestore Projects] Query created for user:', userId);

    unsubscribe = onSnapshot(q, (snapshot) => {
      const projects: Project[] = [];
      
      console.log('[Firestore Projects] Snapshot received, documents:', snapshot.size);
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        projects.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          color: data.color,
          createdBy: data.createdBy,
          status: data.status || 'active',
          taskCount: data.taskCount || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      // Sort by creation date descending
      projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      projectsStore.setProjects(projects);
      projectsStore.setLoading(false);
      console.log(`[Firestore Projects] ✅ Projects synced for user ${userId}:`, projects.length, 'projects');
    }, (error) => {
      console.error('[Firestore Projects] ❌ Error listening to projects:', error);
      projectsStore.setLoading(false);
    });
  };

  const stopListening = () => {
    if (unsubscribe) {
      console.log('[Firestore Projects] Stopping listener');
      unsubscribe();
      unsubscribe = null;
    }
  };

  const addProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!auth.user.value) {
      console.warn('[Firestore Projects] Cannot add project - not authenticated');
      return null;
    }

    try {
      const projectsRef = collection(firestore, 'projects');
      const docRef = await addDoc(projectsRef, {
        ...project,
        createdBy: auth.user.value.uid,
        taskCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('[Firestore Projects] Project added:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('[Firestore Projects] Error adding project:', error);
      return null;
    }
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    if (!auth.user.value) {
      console.warn('[Firestore Projects] Cannot update project - not authenticated');
      return false;
    }

    try {
      const projectRef = doc(firestore, 'projects', projectId);
      await updateDoc(projectRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      console.log('[Firestore Projects] Project updated:', projectId);
      return true;
    } catch (error) {
      console.error('[Firestore Projects] Error updating project:', error);
      return false;
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!auth.user.value) {
      console.warn('[Firestore Projects] Cannot delete project - not authenticated');
      return false;
    }

    try {
      const projectRef = doc(firestore, 'projects', projectId);
      await deleteDoc(projectRef);

      console.log('[Firestore Projects] Project deleted:', projectId);
      return true;
    } catch (error) {
      console.error('[Firestore Projects] Error deleting project:', error);
      return false;
    }
  };

  const archiveProject = async (projectId: string) => {
    return await updateProject(projectId, { status: 'archived' });
  };

  const unarchiveProject = async (projectId: string) => {
    return await updateProject(projectId, { status: 'active' });
  };

  return {
    startListening,
    stopListening,
    addProject,
    updateProject,
    deleteProject,
    archiveProject,
    unarchiveProject
  };
};

