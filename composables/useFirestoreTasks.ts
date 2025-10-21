import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
  type Unsubscribe
} from 'firebase/firestore';
import type { TaskItem } from '~/stores/todos';

export const useFirestoreTasks = () => {
  const { $firestore } = useNuxtApp();
  const auth = useAuth();
  const scrumBoardStore = useScrumBoardStore();
  
  let unsubscribe: Unsubscribe | null = null;

  const startListening = () => {
    if (!$firestore || !auth.isAuthenticated.value) {
      console.warn('[Firestore] Cannot start listening - not authenticated');
      return;
    }

    // Stop existing listener if any
    if (unsubscribe) {
      unsubscribe();
    }

    const tasksRef = collection($firestore, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));

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
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      scrumBoardStore.tasks = tasks;
      console.log('[Firestore] Tasks synced:', tasks.length);
    }, (error) => {
      console.error('[Firestore] Error listening to tasks:', error);
    });
  };

  const stopListening = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  const addTask = async (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!$firestore || !auth.user.value) {
      console.warn('[Firestore] Cannot add task - not authenticated');
      return null;
    }

    try {
      const tasksRef = collection($firestore, 'tasks');
      const docRef = await addDoc(tasksRef, {
        ...task,
        createdBy: auth.user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('[Firestore] Task added:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('[Firestore] Error adding task:', error);
      return null;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<TaskItem>) => {
    if (!$firestore || !auth.user.value) {
      console.warn('[Firestore] Cannot update task - not authenticated');
      return false;
    }

    try {
      const taskRef = doc($firestore, 'tasks', taskId);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      console.log('[Firestore] Task updated:', taskId);
      return true;
    } catch (error) {
      console.error('[Firestore] Error updating task:', error);
      return false;
    }
  };

  const updateTaskStatus = async (taskId: string, status: 'todo' | 'in-progress' | 'done') => {
    return await updateTask(taskId, { status });
  };

  const deleteTask = async (taskId: string) => {
    if (!$firestore || !auth.user.value) {
      console.warn('[Firestore] Cannot delete task - not authenticated');
      return false;
    }

    try {
      const taskRef = doc($firestore, 'tasks', taskId);
      await deleteDoc(taskRef);

      console.log('[Firestore] Task deleted:', taskId);
      return true;
    } catch (error) {
      console.error('[Firestore] Error deleting task:', error);
      return false;
    }
  };

  return {
    startListening,
    stopListening,
    addTask,
    updateTask,
    updateTaskStatus,
    deleteTask
  };
};
