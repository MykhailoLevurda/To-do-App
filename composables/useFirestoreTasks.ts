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
  const firestore = $firestore;
  const auth = useAuth();
  const scrumBoardStore = useScrumBoardStore();
  
  let unsubscribe: Unsubscribe | null = null;

  const startListening = () => {
    if (!auth.isAuthenticated.value || !auth.user.value) {
      console.warn('[Firestore] Cannot start listening - not authenticated');
      return;
    }

    // Stop existing listener if any
    if (unsubscribe) {
      unsubscribe();
    }

    const tasksRef = collection(firestore, 'tasks');
    // Filter tasks by current user and order by creation date
    const q = query(
      tasksRef, 
      where('createdBy', '==', auth.user.value.uid),
      orderBy('createdAt', 'desc')
    );

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
      
      // If it's an index error, provide helpful message
      if (error.message.includes('index')) {
        console.error('❌ Firebase composite index required!');
        console.error('📋 Please create an index with these fields:');
        console.error('   Collection: tasks');
        console.error('   Fields: createdBy (Ascending), createdAt (Descending)');
        
        // Try to extract the link from error message
        const linkMatch = error.message.match(/https:\/\/[^\s]+/);
        if (linkMatch) {
          console.error('🔗 Create index here:', linkMatch[0]);
        }
      }
    });
  };

  const stopListening = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  const addTask = async (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!auth.user.value) {
      console.warn('[Firestore] Cannot add task - not authenticated');
      return null;
    }

    try {
      const tasksRef = collection(firestore, 'tasks');
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
    if (!auth.user.value) {
      console.warn('[Firestore] Cannot update task - not authenticated');
      return false;
    }

    try {
      const taskRef = doc(firestore, 'tasks', taskId);
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
    if (!auth.user.value) {
      console.warn('[Firestore] Cannot delete task - not authenticated');
      return false;
    }

    try {
      const taskRef = doc(firestore, 'tasks', taskId);
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
