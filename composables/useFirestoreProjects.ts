import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
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
    if (!auth.isAuthenticated || !auth.user.value) {
      console.warn('[Firestore Projects] Cannot start listening - not authenticated');
      projectsStore.setLoading(false);
      return;
    }

    const userId = auth.user.value.uid;
    console.log('[Firestore Projects] Starting listener for user:', userId);

    // Set current user and check if we need to clear old data
    projectsStore.setCurrentUserId(userId);
    
    // Try to load from manual cache
    let hasCachedData = false;
    if (process.client) {
      try {
        const cached = localStorage.getItem('projects-cache');
        if (cached) {
          const cacheData = JSON.parse(cached);
          if (cacheData.currentUserId === userId && cacheData.projects) {
            console.log('[Firestore Projects] Loading from manual cache:', cacheData.projects.length, 'projects');
            // Restore projects from cache with proper Date objects
            const cachedProjects = cacheData.projects.map((p: any) => ({
              ...p,
              teamMembers: p.teamMembers?.map((m: any) => ({
                ...m,
                addedAt: new Date(m.addedAt)
              })),
              createdAt: new Date(p.createdAt),
              updatedAt: new Date(p.updatedAt)
            }));
            projectsStore.setProjects(cachedProjects);
            hasCachedData = true;
          }
        }
      } catch (e) {
        console.warn('[Firestore Projects] Failed to load from cache:', e);
      }
    }
    
    // Set loading state
    if (hasCachedData) {
      console.log('[Firestore Projects] Using cached data while fetching updates');
      projectsStore.setLoading(false);
    } else {
      console.log('[Firestore Projects] No cached data, showing loading state');
      projectsStore.setLoading(true);
    }

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
        
        // Parse teamMembers array
        const teamMembers = (data.teamMembers || []).map((member: any) => ({
          userId: member.userId,
          email: member.email,
          displayName: member.displayName,
          addedAt: member.addedAt?.toDate() || new Date(),
          addedBy: member.addedBy
        }));
        
        projects.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          color: data.color,
          createdBy: data.createdBy,
          status: data.status || 'active',
          taskCount: data.taskCount || 0,
          teamMembers,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      // Sort by creation date descending
      projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      projectsStore.setProjects(projects);
      projectsStore.setLoading(false);
      console.log(`[Firestore Projects] ✅ Projects synced for user ${userId}:`, projects.length, 'projects');
      
      // Manual cache to localStorage (safe serialization)
      if (process.client) {
        try {
          const cacheData = {
            projects: projects.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description,
              color: p.color,
              createdBy: p.createdBy,
              status: p.status,
              taskCount: p.taskCount,
              teamMembers: p.teamMembers?.map(m => ({
                ...m,
                addedAt: m.addedAt.toISOString()
              })),
              createdAt: p.createdAt.toISOString(),
              updatedAt: p.updatedAt.toISOString()
            })),
            currentUserId: userId,
            cachedAt: new Date().toISOString()
          };
          localStorage.setItem('projects-cache', JSON.stringify(cacheData));
        } catch (e) {
          console.warn('[Firestore Projects] Failed to cache projects:', e);
        }
      }
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
      throw new Error('Pro vytvoření projektu se musíte přihlásit.');
    }

    try {
      const projectsRef = collection(firestore, 'projects');
      const createdBy = auth.user.value.uid;
      const docRef = await addDoc(projectsRef, {
        ...project,
        createdBy,
        taskCount: 0,
        teamMembers: project.teamMembers ?? [],
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
      // First, delete all tasks associated with this project
      const tasksRef = collection(firestore, 'tasks');
      const tasksQuery = query(tasksRef, where('projectId', '==', projectId));
      const tasksSnapshot = await getDocs(tasksQuery);
      
      const deleteTaskPromises = [];
      tasksSnapshot.forEach((taskDoc) => {
        deleteTaskPromises.push(deleteDoc(taskDoc.ref));
      });
      
      await Promise.all(deleteTaskPromises);
      console.log('[Firestore Projects] Deleted', deleteTaskPromises.length, 'tasks for project:', projectId);
      
      // Then delete the project itself
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

