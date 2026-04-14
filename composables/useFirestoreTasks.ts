import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  onSnapshot,
  serverTimestamp,
  where,
  increment,
  orderBy,
  deleteField,
  type Unsubscribe
} from 'firebase/firestore';
import type { TaskItem } from '~/stores/todos';

export const useFirestoreTasks = () => {
  const { $firestore } = useNuxtApp();
  const firestore = $firestore;
  const auth = useAuth();
  const scrumBoardStore = useScrumBoardStore();
  const projectsStore = useProjectsStore();

  let unsubscribe: Unsubscribe | null = null;
  let projectsWatchStop: (() => void) | null = null;

  const handleSnapshot = (snapshot: any) => {
    const tasks: TaskItem[] = [];

    snapshot.forEach((doc: any) => {
      const data = doc.data();
      const task: any = {
        id: doc.id,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assigneeId: data.assigneeId,
        assignee: data.assignee,
        storyPoints: data.storyPoints,
        projectId: data.projectId,
        dueDate: data.dueDate?.toDate(),
        approved: data.approved || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        checklist: data.checklist || [],
        attachmentLinks: data.attachmentLinks || [],
        backlogOrder: data.backlogOrder ?? 0,
        labelIds: data.labelIds || [],
        sprintId: data.sprintId || undefined
      };
      tasks.push(task);
    });

    tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    scrumBoardStore.setTasks(tasks);
  };

  const startListening = (projectId?: string) => {
    if (!auth.isAuthenticated || !auth.user.value) return;

    if (unsubscribe) unsubscribe();
    if (projectsWatchStop) {
      projectsWatchStop();
      projectsWatchStop = null;
    }

    const tasksRef = collection(firestore, 'tasks');
    const userId = auth.user.value.uid;

    if (projectId) {
      // Filtrovat pouze podle projektu – Firestore pravidla zajišťují, že
      // dotaz smí číst jen člen daného projektu (owner/admin/member).
      // Odstraněn filtr createdBy, aby členové viděli i úkoly vytvořené jinými.
      const q = query(tasksRef, where('projectId', '==', projectId));
      unsubscribe = onSnapshot(q, handleSnapshot);
      return;
    }

    // Globální listener (bez projectId, např. Reporty) –
    // dotazuje úkoly ze všech projektů uživatele přes projectId in [...].
    const buildGlobalQuery = () => {
      const projectIds = projectsStore.projects.map(p => p.id);
      if (projectIds.length === 0) {
        // Projekty se ještě nenačetly – použij fallback na createdBy
        return query(tasksRef, where('createdBy', '==', userId));
      }
      // Firestore 'in' podporuje max 30 prvků; při větším počtu projektů
      // by bylo potřeba dotazy rozdělit – pro běžné použití postačí.
      return query(tasksRef, where('projectId', 'in', projectIds.slice(0, 30)));
    };

    unsubscribe = onSnapshot(buildGlobalQuery(), handleSnapshot);

    // Jakmile se projekty načtou (nebo změní), restartuj listener se správnými projectIds
    projectsWatchStop = watch(
      () => projectsStore.projects.map(p => p.id).join(','),
      () => {
        if (unsubscribe) unsubscribe();
        unsubscribe = onSnapshot(buildGlobalQuery(), handleSnapshot);
      }
    );
  };

  const stopListening = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (projectsWatchStop) {
      projectsWatchStop();
      projectsWatchStop = null;
    }
  };

  const addTask = async (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ id: string | null; error?: string }> => {
    if (!auth.user.value) return { id: null, error: 'Nejste přihlášeni.' };
    if (!firestore) {
      console.error('[Firestore Tasks] Firestore není k dispozici.');
      return { id: null, error: 'Databáze není připojena. Obnovte stránku.' };
    }

    try {
      const tasksRef = collection(firestore, 'tasks');
      const createdBy = auth.user.value.uid;
      const docRef = await addDoc(tasksRef, {
        ...task,
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (task.projectId) {
        const projectRef = doc(firestore, 'projects', task.projectId);
        await updateDoc(projectRef, {
          taskCount: increment(1),
          updatedAt: serverTimestamp()
        });
      }

      return { id: docRef.id };
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error('[Firestore Tasks] addTask failed:', e);
      return { id: null, error: msg || 'Nepodařilo se vytvořit úkol.' };
    }
  };

  const updateTask = async (taskId: string, updates: Partial<TaskItem>) => {
    if (!auth.user.value) return false;

    try {
      const taskRef = doc(firestore, 'tasks', taskId);

      if (updates.projectId !== undefined) {
        const taskDoc = await getDoc(taskRef);
        const oldProjectId = taskDoc.data()?.projectId;
        const newProjectId = updates.projectId;

        if (oldProjectId && oldProjectId !== newProjectId) {
          const oldProjectRef = doc(firestore, 'projects', oldProjectId);
          await updateDoc(oldProjectRef, {
            taskCount: increment(-1),
            updatedAt: serverTimestamp()
          });

          if (newProjectId) {
            const newProjectRef = doc(firestore, 'projects', newProjectId);
            await updateDoc(newProjectRef, {
              taskCount: increment(1),
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined && (key === 'sprintId' || key === 'dueDate')) {
          payload[key] = deleteField();
        } else if (value !== undefined) {
          payload[key] = value;
        }
      }
      await updateDoc(taskRef, payload);

      return true;
    } catch {
      return false;
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    return await updateTask(taskId, { status });
  };

  const deleteTask = async (taskId: string) => {
    if (!auth.user.value) return false;

    try {
      const taskRef = doc(firestore, 'tasks', taskId);
      const taskDoc = await getDoc(taskRef);
      const projectId = taskDoc.data()?.projectId;

      await deleteDoc(taskRef);

      if (projectId) {
        const projectRef = doc(firestore, 'projects', projectId);
        await updateDoc(projectRef, {
          taskCount: increment(-1),
          updatedAt: serverTimestamp()
        });
      }

      return true;
    } catch {
      return false;
    }
  };

  const syncProjectTaskCounts = async () => {
    if (!auth.user.value) return false;

    try {
      const userId = auth.user.value.uid;

      const projectsRef = collection(firestore, 'projects');
      const projectsQuery = query(projectsRef, where('createdBy', '==', userId));
      const projectsSnapshot = await getDocs(projectsQuery);

      const tasksRef = collection(firestore, 'tasks');
      const tasksQuery = query(tasksRef, where('createdBy', '==', userId));
      const tasksSnapshot = await getDocs(tasksQuery);

      const counts: Record<string, number> = {};

      tasksSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.projectId) {
          counts[data.projectId] = (counts[data.projectId] || 0) + 1;
        }
      });

      const updates = [];

      projectsSnapshot.forEach((doc) => {
        const projectId = doc.id;
        const correct = counts[projectId] || 0;
        const current = doc.data().taskCount || 0;

        if (current !== correct) {
          updates.push(
            updateDoc(doc.ref, {
              taskCount: correct,
              updatedAt: serverTimestamp()
            })
          );
        }
      });

      await Promise.all(updates);
      return true;
    } catch {
      return false;
    }
  };

  const approveTask = async (taskId: string) => {
    if (!auth.user.value) return false;

    try {
      const taskRef = doc(firestore, 'tasks', taskId);
      await updateDoc(taskRef, {
        approved: true,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch {
      return false;
    }
  };

  const taskComments = ref<Record<string, any[]>>({});
  const commentUnsubscribes: Record<string, Unsubscribe | null> = {};

  const addComment = async (taskId: string, text: string) => {
    if (!auth.user.value) return null;

    const author = auth.user.value.displayName || auth.user.value.email || 'Neznámý';

    try {
      const ref = collection(firestore, 'tasks', taskId, 'comments');
      const docRef = await addDoc(ref, {
        text,
        author,
        userId: auth.user.value.uid,
        createdAt: serverTimestamp()
      });

      // Optimistická aktualizace – hned zobrazit komentář (listener ho pak může přepsat)
      const optimisticComment = {
        id: docRef.id,
        text,
        author,
        userId: auth.user.value.uid,
        createdAt: new Date()
      };
      const current = taskComments.value[taskId] || [];
      taskComments.value = { ...taskComments.value, [taskId]: [...current, optimisticComment] };

      return true;
    } catch {
      return false;
    }
  };

  const updateComment = async (taskId: string, commentId: string, text: string) => {
    if (!auth.user.value) return false;

    try {
      const ref = doc(firestore, 'tasks', taskId, 'comments', commentId);
      await updateDoc(ref, {
        text,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch {
      return false;
    }
  };

  const deleteComment = async (taskId: string, commentId: string) => {
    if (!auth.user.value) return false;

    try {
      const ref = doc(firestore, 'tasks', taskId, 'comments', commentId);
      await deleteDoc(ref);
      return true;
    } catch {
      return false;
    }
  };

  const listenComments = (taskId: string) => {
    if (commentUnsubscribes[taskId]) commentUnsubscribes[taskId]!();

    const ref = collection(firestore, 'tasks', taskId, 'comments');
    const q = query(ref, orderBy('createdAt', 'asc'));

    commentUnsubscribes[taskId] = onSnapshot(q, (snapshot) => {
      const next = { ...taskComments.value, [taskId]: snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      })) };
      taskComments.value = next;
    }, (err) => {
      console.error('[Firestore Tasks] Comments listener error (zkontrolujte Firestore pravidla pro komentáře):', err);
    });
  };

  const stopListeningComments = (taskId: string) => {
    if (commentUnsubscribes[taskId]) {
      commentUnsubscribes[taskId]!();
      commentUnsubscribes[taskId] = null;
    }
  };

  return {
    startListening,
    stopListening,
    addTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    syncProjectTaskCounts,
    approveTask,

    addComment,
    updateComment,
    deleteComment,
    listenComments,
    stopListeningComments,
    taskComments
  };
};
