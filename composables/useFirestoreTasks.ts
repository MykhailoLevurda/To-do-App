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
    if (!auth.isAuthenticated || !auth.user.value) {
      console.warn('[Firestore] Cannot start listening - not authenticated');
      return;
    }

    // Stop existing listener if any
    if (unsubscribe) {
      unsubscribe();
    }

    const tasksRef = collection(firestore, 'tasks');
    // Filter tasks by current user (no orderBy to avoid needing composite index)
    const q = query(
      tasksRef, 
      where('createdBy', '==', auth.user.value.uid)
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
          projectId: data.projectId,
          dueDate: data.dueDate?.toDate(),
          approved: data.approved || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      // Sort on client side by createdAt descending
      tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
      
      // Update project's task count
      if (task.projectId) {
        const projectRef = doc(firestore, 'projects', task.projectId);
        await updateDoc(projectRef, {
          taskCount: increment(1),
          updatedAt: serverTimestamp()
        });
        console.log('[Firestore] Project task count incremented for:', task.projectId);
      }
      
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
      
      // If projectId is being changed, update counts for both projects
      if (updates.projectId !== undefined) {
        const taskDoc = await getDoc(taskRef);
        const oldProjectId = taskDoc.data()?.projectId;
        const newProjectId = updates.projectId;
        
        if (oldProjectId && oldProjectId !== newProjectId) {
          // Decrement old project
          const oldProjectRef = doc(firestore, 'projects', oldProjectId);
          await updateDoc(oldProjectRef, {
            taskCount: increment(-1),
            updatedAt: serverTimestamp()
          });
          console.log('[Firestore] Task count decremented for old project:', oldProjectId);
          
          // Increment new project
          if (newProjectId) {
            const newProjectRef = doc(firestore, 'projects', newProjectId);
            await updateDoc(newProjectRef, {
              taskCount: increment(1),
              updatedAt: serverTimestamp()
            });
            console.log('[Firestore] Task count incremented for new project:', newProjectId);
          }
        }
      }
      
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
      
      // Get task data first to know which project to update
      const taskDoc = await getDoc(taskRef);
      const taskData = taskDoc.data();
      const projectId = taskData?.projectId;
      
      // Delete the task
      await deleteDoc(taskRef);
      console.log('[Firestore] Task deleted:', taskId);
      
      // Update project's task count
      if (projectId) {
        const projectRef = doc(firestore, 'projects', projectId);
        await updateDoc(projectRef, {
          taskCount: increment(-1),
          updatedAt: serverTimestamp()
        });
        console.log('[Firestore] Project task count decremented for:', projectId);
      }
      
      return true;
    } catch (error) {
      console.error('[Firestore] Error deleting task:', error);
      return false;
    }
  };

  /**
   * Synchronizes task counts for all projects based on actual task data
   * Useful for fixing incorrect counts from old data
   */
  const syncProjectTaskCounts = async () => {
    if (!auth.user.value) {
      console.warn('[Firestore] Cannot sync task counts - not authenticated');
      return false;
    }

    try {
      const userId = auth.user.value.uid;
      
      // Get all projects for current user
      const projectsRef = collection(firestore, 'projects');
      const projectsQuery = query(projectsRef, where('createdBy', '==', userId));
      const projectsSnapshot = await getDocs(projectsQuery);
      
      // Get all tasks for current user
      const tasksRef = collection(firestore, 'tasks');
      const tasksQuery = query(tasksRef, where('createdBy', '==', userId));
      const tasksSnapshot = await getDocs(tasksQuery);
      
      // Count tasks per project
      const taskCountsByProject: Record<string, number> = {};
      tasksSnapshot.forEach((doc) => {
        const data = doc.data();
        const projectId = data.projectId;
        if (projectId) {
          taskCountsByProject[projectId] = (taskCountsByProject[projectId] || 0) + 1;
        }
      });
      
      // Update each project with correct count
      const updatePromises = [];
      projectsSnapshot.forEach((doc) => {
        const projectId = doc.id;
        const correctCount = taskCountsByProject[projectId] || 0;
        const currentCount = doc.data().taskCount || 0;
        
        if (correctCount !== currentCount) {
          console.log(`[Firestore] Syncing project ${projectId}: ${currentCount} -> ${correctCount}`);
          const projectRef = doc.ref;
          updatePromises.push(
            updateDoc(projectRef, {
              taskCount: correctCount,
              updatedAt: serverTimestamp()
            })
          );
        }
      });
      
      await Promise.all(updatePromises);
      console.log('[Firestore] Task count sync completed:', updatePromises.length, 'projects updated');
      return true;
    } catch (error) {
      console.error('[Firestore] Error syncing task counts:', error);
      return false;
    }
  };

    const approveTask = async (taskId: string) => {
      if (!auth.user.value) {
        console.warn('[Firestore] Cannot approve task - not authenticated');
        return false;
      }

      try {
        const taskRef = doc(firestore, 'tasks', taskId);
        await updateDoc(taskRef, {
          approved: true,
          updatedAt: serverTimestamp()
        });

        console.log('[Firestore] Task approved:', taskId);
        return true;
      } catch (error) {
        console.error('[Firestore] Error approving task:', error);
        return false;
      }
    };

    const taskComments = ref<Record<string, any[]>>({})
    const commentUnsubscribes: Record<string, Unsubscribe | null> = {}

    // přidání nového komentáře
    const addComment = async (taskId: string, text: string) => {
      if (!auth.user.value) {
        console.warn('[Firestore] Cannot add comment - not authenticated')
        return null
      }

      try {
        const commentRef = collection(firestore, 'tasks', taskId, 'comments')
        await addDoc(commentRef, {
          text,
          author: auth.user.value.email || 'Neznámý',
          userId: auth.user.value.uid,
          createdAt: serverTimestamp()
        })

        console.log('[Firestore] Comment added to task:', taskId)
        return true
      } catch (error) {
        console.error('[Firestore] Error adding comment:', error)
        return false
      }
    }

    const listenComments = (taskId: string) => {
      if (commentUnsubscribes[taskId]) {
        commentUnsubscribes[taskId]!()
      }

      const commentsRef = collection(firestore, 'tasks', taskId, 'comments')
      const q = query(commentsRef, orderBy('createdAt', 'asc'))

      commentUnsubscribes[taskId] = onSnapshot(q, (snapshot) => {
        taskComments.value[taskId] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }))
      })
    }

    const stopListeningComments = (taskId: string) => {
      if (commentUnsubscribes[taskId]) {
        commentUnsubscribes[taskId]!()
        commentUnsubscribes[taskId] = null
      }
    }


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
    listenComments,
    stopListeningComments,
    taskComments
  };
};
