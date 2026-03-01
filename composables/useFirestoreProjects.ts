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
import type { Project, ProjectStatus } from '~/types';

/** Výchozí stavy pro projekty bez vlastních statuses (zpětná kompatibilita) */
export const DEFAULT_PROJECT_STATUSES: ProjectStatus[] = [
  { id: 'todo', title: 'To Do', color: 'blue', order: 0 },
  { id: 'in-progress', title: 'In Progress', color: 'yellow', order: 1 },
  { id: 'done', title: 'Done', color: 'green', order: 2 }
];

export const useFirestoreProjects = () => {
  const nuxtApp = useNuxtApp();
  const firestore = (nuxtApp as any).$firestore ?? null;
  const auth = useAuth();
  const projectsStore = useProjectsStore();
  
  let unsubscribes: (() => void)[] = [];

  /** Převod Firestore doc na Project (sdílená logika pro oba dotazy). */
  function docToProject(doc: { id: string; data: () => Record<string, any> }): Project {
    const data = doc.data();
    const teamMembers = (data.teamMembers || []).map((member: any) => ({
      userId: member.userId,
      email: member.email,
      displayName: member.displayName,
      addedAt: member.addedAt?.toDate() || new Date(),
      addedBy: member.addedBy,
      role: member.role === 'admin' ? ('admin' as const) : ('member' as const)
    }));
    const rawStatuses = (data.statuses || []) as ProjectStatus[];
    const statuses = rawStatuses.length > 0
      ? rawStatuses.map((s: any) => ({
          id: s.id,
          title: s.title,
          color: s.color ?? 'gray',
          order: typeof s.order === 'number' ? s.order : 0
        })).sort((a: { order: number }, b: { order: number }) => a.order - b.order)
      : [...DEFAULT_PROJECT_STATUSES];
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      color: data.color,
      createdBy: data.createdBy,
      status: data.status || 'active',
      taskCount: data.taskCount || 0,
      teamMembers,
      memberRoles: data.memberRoles,
      memberIds: data.memberIds,
      statuses,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  }

  const startListening = () => {
    if (!firestore) {
      if (import.meta.client) console.warn('[Firestore Projects] Firestore not available (SSR?)');
      return;
    }
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

    // Stop existing listeners if any
    if (unsubscribes.length > 0) {
      console.log('[Firestore Projects] Stopping previous listeners');
      unsubscribes.forEach((unsub) => unsub());
      unsubscribes = [];
    }

    const projectsRef = collection(firestore, 'projects');
    const qOwner = query(projectsRef, where('createdBy', '==', userId));
    const qMember = query(projectsRef, where('memberIds', 'array-contains', userId));

    const projectsByOwner = new Map<string, Project>();
    const projectsByMember = new Map<string, Project>();

    function mergeAndPublish() {
      const merged = new Map<string, Project>([...projectsByOwner, ...projectsByMember]);
      const projects = Array.from(merged.values());
      projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      projectsStore.setProjects(projects);
      projectsStore.setLoading(false);
      console.log(`[Firestore Projects] ✅ Projects synced for user ${userId}:`, projects.length, 'projects');

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
              statuses: p.statuses,
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
    }

    const onOwnerSnapshot = (snapshot: { forEach: (fn: (doc: { id: string; data: () => Record<string, any> }) => void) => void }) => {
      projectsByOwner.clear();
      snapshot.forEach((docSnapshot) => {
        const project = docToProject(docSnapshot);
        projectsByOwner.set(project.id, project);
      });
      mergeAndPublish();
    };

    const onMemberSnapshot = (snapshot: { forEach: (fn: (doc: { id: string; data: () => Record<string, any> }) => void) => void }) => {
      projectsByMember.clear();
      snapshot.forEach((docSnapshot) => {
        const project = docToProject(docSnapshot);
        projectsByMember.set(project.id, project);
      });
      mergeAndPublish();
    };

    const onError = (error: Error) => {
      console.error('[Firestore Projects] ❌ Error listening to projects:', error);
      projectsStore.setLoading(false);
    };

    unsubscribes.push(
      onSnapshot(qOwner, onOwnerSnapshot, onError)
    );
    unsubscribes.push(
      onSnapshot(qMember, onMemberSnapshot, onError)
    );

    console.log('[Firestore Projects] Listening: createdBy + memberIds array-contains');
  };

  const stopListening = () => {
    if (unsubscribes.length > 0) {
      console.log('[Firestore Projects] Stopping listeners');
      unsubscribes.forEach((unsub) => unsub());
      unsubscribes = [];
    }
  };

  /**
   * Jednorázové načtení projektů (getDocs místo listeneru).
   * Použijte při otevření modalu pro přidání člena, aby byly projekty jistě k dispozici.
   */
  const fetchProjectsOnce = async (): Promise<boolean> => {
    if (!import.meta.client) return false;
    if (!firestore || !auth.user.value) return false;
    const userId = auth.user.value.uid;
    try {
      projectsStore.setLoading(true);
      const projectsRef = collection(firestore, 'projects');
      const [ownerSnap, memberSnap] = await Promise.all([
        getDocs(query(projectsRef, where('createdBy', '==', userId))),
        getDocs(query(projectsRef, where('memberIds', 'array-contains', userId)))
      ]);
      const projectsMap = new Map<string, Project>();
      const processDoc = (d: { id: string; data: () => Record<string, any> }) => {
        const project = docToProject(d);
        projectsMap.set(project.id, project);
      };
      ownerSnap.forEach(processDoc);
      memberSnap.forEach(processDoc);
      const projects = Array.from(projectsMap.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      projectsStore.setProjects(projects);
      projectsStore.setLoading(false);
      console.log('[Firestore Projects] fetchProjectsOnce:', projects.length, 'projects');
      return true;
    } catch (e) {
      console.error('[Firestore Projects] fetchProjectsOnce failed:', e);
      projectsStore.setLoading(false);
      return false;
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
      const statuses = (project.statuses && project.statuses.length > 0)
        ? project.statuses
        : [];
      const teamMembers = project.teamMembers ?? [];
      const memberRoles = teamMembers.reduce<Record<string, 'admin' | 'member'>>(
        (acc, m) => ({ ...acc, [m.userId]: (m.role === 'admin' ? 'admin' : 'member') }),
        {}
      );
      const memberIds = teamMembers.map((m) => m.userId);

      const docRef = await addDoc(projectsRef, {
        ...project,
        createdBy,
        taskCount: 0,
        teamMembers,
        memberRoles,
        memberIds,
        statuses,
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
    fetchProjectsOnce,
    addProject,
    updateProject,
    deleteProject,
    archiveProject,
    unarchiveProject
  };
};

