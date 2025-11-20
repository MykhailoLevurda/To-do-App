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
  type Unsubscribe
} from 'firebase/firestore';
import type { TaskItem } from '~/stores/todos';

export const useFirestoreTasks = () => {
  const { $firestore } = useNuxtApp();
  const firestore = $firestore;
  const auth = useAuth();
  const scrumBoardStore = useScrumBoardStore();

  let unsubscribe: Unsubscribe | null = null;

  const startListening = () => {
    if (!auth.isAuthenticated || !auth.user.value) return;

    if (unsubscribe) unsubscribe();

    const tasksRef = collection(firestore, 'tasks');
    const q = query(tasksRef, where('createdBy', '==', auth.user.value.uid));

    unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks: TaskItem[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        tasks.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          assignee: data.assignee,
          storyPoints: data.storyPoints,
          projectId: data.projectId,
          dueDate: data.dueDate?.toDate(),
          approved: data.approved || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      scrumBoardStore.tasks = tasks;
    });
  };

  const stopListening = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  const addTask = async (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!auth.user.value) return null;

    try {
      const tasksRef = collection(firestore, 'tasks');
      const docRef = await addDoc(tasksRef, {
        ...task,
        createdBy: auth.user.value.uid,
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

      return docRef.id;
    } catch {
      return null;
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

      await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch {
      return false;
    }
  };

  const updateTaskStatus = async (taskId: string, status: 'todo' | 'in-progress' | 'done') => {
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

    try {
      const ref = collection(firestore, 'tasks', taskId, 'comments');
      await addDoc(ref, {
        text,
        author: auth.user.value.email || 'Neznámý',
        userId: auth.user.value.uid,
        createdAt: serverTimestamp()
      });

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
      taskComments.value[taskId] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));
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
