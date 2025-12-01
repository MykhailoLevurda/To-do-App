import type { FreeloTask, FreeloPaginatedResponse } from './useFreeloApi';

export const useFreeloTasks = () => {
  const { freeloFetch } = useFreeloApi();

  /**
   * Načte všechny úkoly s možností filtrování
   */
  const fetchAllTasks = async (params: {
    projects_ids?: number[];
    tasklists_ids?: number[];
    state_id?: number;
    worker_id?: number;
    search_query?: string;
    order_by?: string;
    order?: 'asc' | 'desc';
    page?: number;
  } = {}): Promise<FreeloPaginatedResponse<{ tasks: FreeloTask[] }>> => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.projects_ids) {
        params.projects_ids.forEach(id => queryParams.append('projects_ids[]', id.toString()));
      }
      if (params.tasklists_ids) {
        params.tasklists_ids.forEach(id => queryParams.append('tasklists_ids[]', id.toString()));
      }
      if (params.state_id) {
        queryParams.append('state_id', params.state_id.toString());
      }
      if (params.worker_id) {
        queryParams.append('worker_id', params.worker_id.toString());
      }
      if (params.search_query) {
        queryParams.append('search_query', params.search_query);
      }
      if (params.order_by) {
        queryParams.append('order_by', params.order_by);
      }
      if (params.order) {
        queryParams.append('order', params.order);
      }
      if (params.page !== undefined) {
        queryParams.append('p', params.page.toString());
      }

      const response = await freeloFetch<FreeloPaginatedResponse<{ tasks: FreeloTask[] }>>(
        `/all-tasks?${queryParams.toString()}`
      );
      
      return response;
    } catch (error: any) {
      console.error('[Freelo Tasks] Error fetching tasks:', error);
      throw error;
    }
  };

  /**
   * Načte úkoly pro konkrétní projekt
   * @param projectId - ID projektu
   * @param workerId - ID uživatele (volitelné, pro filtrování pouze přiřazených úkolů)
   */
  const fetchTasksByProject = async (projectId: number, workerId?: number): Promise<FreeloTask[]> => {
    try {
      // Načíst úkoly se všemi stavy (active i finished)
      // Freelo API používá state_id: 1 = active, 2 = finished
      // Pokud nezadáme state_id, může ve výchozím nastavení filtrovat dokončené úkoly
      // Proto načteme úkoly se všemi stavy zvlášť a spojíme je
      
      // 1. Načíst aktivní úkoly (state_id = 1)
      let urlActive = `/all-tasks?projects_ids[]=${projectId}&state_id=1`;
      if (workerId) {
        urlActive += `&worker_id=${workerId}`;
      }
      
      console.log('[Freelo Tasks] Loading active tasks...');
      const responseActive = await freeloFetch<FreeloPaginatedResponse<{ tasks: FreeloTask[] }>>(urlActive);
      
      // 2. Načíst dokončené úkoly (state_id = 2)
      let urlFinished = `/all-tasks?projects_ids[]=${projectId}&state_id=2`;
      if (workerId) {
        urlFinished += `&worker_id=${workerId}`;
      }
      
      console.log('[Freelo Tasks] Loading finished tasks...');
      const responseFinished = await freeloFetch<FreeloPaginatedResponse<{ tasks: FreeloTask[] }>>(urlFinished);
      
      // Zpracovat aktivní úkoly
      let activeTasks: FreeloTask[] = [];
      if (Array.isArray(responseActive)) {
        activeTasks = responseActive;
      } else if (responseActive.data && responseActive.data.tasks) {
        activeTasks = responseActive.data.tasks;
      } else if ((responseActive as any).tasks) {
        activeTasks = (responseActive as any).tasks;
      }
      
      // Zpracovat dokončené úkoly
      let finishedTasks: FreeloTask[] = [];
      if (Array.isArray(responseFinished)) {
        finishedTasks = responseFinished;
      } else if (responseFinished.data && responseFinished.data.tasks) {
        finishedTasks = responseFinished.data.tasks;
      } else if ((responseFinished as any).tasks) {
        finishedTasks = (responseFinished as any).tasks;
      }
      
      // Spojit všechny úkoly a odstranit duplikáty podle ID
      const allTasks = [...activeTasks, ...finishedTasks];
      
      // Odstranit duplikáty podle ID (pokud by se nějaký úkol objevil v obou seznamech)
      const uniqueTasksMap = new Map<number, FreeloTask>();
      allTasks.forEach(task => {
        if (!uniqueTasksMap.has(task.id)) {
          uniqueTasksMap.set(task.id, task);
        } else {
          console.warn('[Freelo Tasks] Duplicate task found:', task.id, task.name);
        }
      });
      
      const tasks = Array.from(uniqueTasksMap.values());
      
      console.log('[Freelo Tasks] Loaded tasks:', {
        active: activeTasks.length,
        finished: finishedTasks.length,
        beforeDedup: allTasks.length,
        afterDedup: tasks.length,
        duplicatesRemoved: allTasks.length - tasks.length
      });
      
      // Zkontrolovat strukturu odpovědi (pro debug)
      console.log('[Freelo Tasks] API response summary:', {
        activeResponse: {
          total: responseActive.total,
          count: responseActive.count,
          hasData: !!responseActive.data,
          tasksCount: activeTasks.length
        },
        finishedResponse: {
          total: responseFinished.total,
          count: responseFinished.count,
          hasData: !!responseFinished.data,
          tasksCount: finishedTasks.length
        }
      });
      
      
      // Debug: zkontrolovat, jestli úkoly mají labely
      console.log('[Freelo Tasks] Checking labels in tasks...');
      const tasksWithLabels = tasks.filter(t => t.labels && t.labels.length > 0);
      const tasksWithInProgressLabel = tasks.filter(t => 
        t.labels?.some(l => l.name?.toLowerCase() === 'in progress' || l.name?.toLowerCase() === 'in-progress')
      );
      
      // Debug: zkontrolovat stavy úkolů
      const tasksByState = {
        active: tasks.filter(t => t.state?.state === 'active').length,
        finished: tasks.filter(t => t.state?.state === 'finished').length,
        unknown: tasks.filter(t => !t.state || !t.state.state).length
      };
      
      console.log('[Freelo Tasks] Tasks summary:', {
        total: tasks.length,
        byState: tasksByState,
        withLabels: tasksWithLabels.length,
        withInProgressLabel: tasksWithInProgressLabel.length,
        sampleTask: tasks[0] ? {
          id: tasks[0].id,
          name: tasks[0].name,
          state: tasks[0].state?.state,
          labels: tasks[0].labels?.map(l => l.name) || []
        } : null
      });
      
      return tasks;
    } catch (error: any) {
      console.error('[Freelo Tasks] Error fetching tasks by project:', error);
      throw error;
    }
  };

  /**
   * Načte úkoly pro konkrétní tasklist
   */
  const fetchTasksByTasklist = async (
    projectId: number,
    tasklistId: number
  ): Promise<FreeloTask[]> => {
    try {
      const tasks = await freeloFetch<FreeloTask[]>(
        `/project/${projectId}/tasklist/${tasklistId}/tasks`
      );
      return tasks;
    } catch (error: any) {
      console.error('[Freelo Tasks] Error fetching tasks by tasklist:', error);
      throw error;
    }
  };

  /**
   * Převod Freelo úkolu na formát používaný v aplikaci (TaskItem)
   */
  const convertFreeloTaskToAppTask = (freeloTask: FreeloTask) => {
    // Mapování stavů Freelo na stavy aplikace
    // Freelo používá:
    // - state.state = "active" + žádný label "In progress" → todo
    // - state.state = "active" + label "In progress" → in-progress
    // - state.state = "finished" → done
    
    let appStatus: 'todo' | 'in-progress' | 'done' = 'todo';
    
    // Debug: logovat stav úkolu z Freelo
    const taskLabels = freeloTask.labels || [];
    const hasInProgressLabel = taskLabels.some(
      label => label.name?.toLowerCase() === 'in progress' || label.name?.toLowerCase() === 'in-progress'
    );
    
    console.log('[Freelo Tasks] Converting task:', {
      id: freeloTask.id,
      name: freeloTask.name,
      state: freeloTask.state?.state,
      labels: taskLabels.map(l => l.name),
      hasInProgressLabel: hasInProgressLabel
    });
    
    if (freeloTask.state?.state === 'finished') {
      appStatus = 'done';
    } else if (freeloTask.state?.state === 'active') {
      // Zkontrolovat, jestli má label "In progress"
      appStatus = hasInProgressLabel ? 'in-progress' : 'todo';
    }
    
    console.log('[Freelo Tasks] Mapped status:', appStatus, 'for task', freeloTask.id);

    // Převod priority
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (freeloTask.priority_enum === 'h') {
      priority = 'high';
    } else if (freeloTask.priority_enum === 'm') {
      priority = 'medium';
    } else if (freeloTask.priority_enum === 'l') {
      priority = 'low';
    }

    // Získat jméno přiřazeného uživatele
    const assignee = freeloTask.worker?.fullname || freeloTask.worker?.email || undefined;

    // Dokončené úkoly z Freelo jsou automaticky schválené
    // (pokud je úkol dokončený ve Freelo, považujeme ho za schválený)
    const approved = appStatus === 'done';

    return {
      id: `freelo-${freeloTask.id}`,
      title: freeloTask.name,
      description: '', // Freelo API neposkytuje description v základním endpointu
      status: appStatus,
      priority: priority,
      assignee: assignee,
      storyPoints: undefined, // Freelo API neposkytuje story points
      projectId: `freelo-${freeloTask.project.id}`,
      dueDate: freeloTask.due_date ? new Date(freeloTask.due_date) : undefined,
      createdAt: new Date(freeloTask.date_add),
      updatedAt: new Date(freeloTask.date_edited_at),
      approved: approved, // Dokončené úkoly z Freelo jsou automaticky schválené
    };
  };

  /**
   * Synchronizuje úkoly z Freelo pro konkrétní projekt
   * @param projectId - ID projektu (může být string "freelo-123" nebo number)
   * @param workerId - ID uživatele (volitelné, pro filtrování pouze přiřazených úkolů)
   */
  const syncTasksForProject = async (projectId: number | string, workerId?: number) => {
    try {
      // Extrahujeme čisté ID z formátu "freelo-123"
      const cleanProjectId = typeof projectId === 'string' && projectId.startsWith('freelo-')
        ? parseInt(projectId.replace('freelo-', ''))
        : projectId;

      console.log('[Freelo Tasks] ===== Starting sync for project =====', cleanProjectId);
      
      const freeloTasks = await fetchTasksByProject(cleanProjectId, workerId);
      
      // DŮLEŽITÉ: Zkontrolovat, jestli úkoly mají labely
      // Endpoint /all-tasks by měl vracet labely, ale někdy je nevrací
      // Pokud ne, načíst detail každého úkolu zvlášť (endpoint /task/{id} vrací labely jistě)
      const tasksWithoutLabels = freeloTasks.filter(t => !t.labels || t.labels.length === 0);
      const tasksWithLabels = freeloTasks.filter(t => t.labels && t.labels.length > 0);
      
      console.log('[Freelo Tasks] Tasks with labels from /all-tasks:', tasksWithLabels.length);
      console.log('[Freelo Tasks] Tasks without labels from /all-tasks:', tasksWithoutLabels.length);
      
      // Pokud některé úkoly nemají labely, načíst jejich detail zvlášť
      // Toto je důležité pro správné mapování stavů (in-progress vs todo)
      if (tasksWithoutLabels.length > 0) {
        console.log('[Freelo Tasks] ⚠️ Some tasks are missing labels from /all-tasks endpoint');
        console.log('[Freelo Tasks] Fetching details for', tasksWithoutLabels.length, 'tasks to get labels...');
        console.log('[Freelo Tasks] This might be slow, but ensures correct status mapping');
        
        // Načíst detail pro úkoly bez labelů
        // Použít Promise.allSettled místo Promise.all, aby se nepřerušilo načítání při chybě jednoho úkolu
        const detailResults = await Promise.allSettled(
          tasksWithoutLabels.map(async (task) => {
            try {
              const detail = await fetchTaskDetail(task.id);
              if (detail) {
                // Aktualizovat labely z detailu
                return {
                  ...task,
                  labels: detail.labels || task.labels || []
                };
              }
              return task;
            } catch (error: any) {
              console.warn('[Freelo Tasks] Could not fetch detail for task', task.id, ':', error.message);
              return task;
            }
          })
        );
        
        // Zpracovat výsledky
        const tasksWithDetails = detailResults.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            console.warn('[Freelo Tasks] Failed to fetch detail for task:', tasksWithoutLabels[index].id);
            return tasksWithoutLabels[index];
          }
        });
        
        // Nahradit úkoly bez labelů úkoly s detailem a odstranit duplikáty
        const allTasks = [
          ...tasksWithLabels,
          ...tasksWithDetails
        ];
        
        // Odstranit duplikáty podle ID
        const uniqueTasksMap = new Map<number, FreeloTask>();
        allTasks.forEach(task => {
          if (!uniqueTasksMap.has(task.id)) {
            uniqueTasksMap.set(task.id, task);
          } else {
            console.warn('[Freelo Tasks] Duplicate task found after fetching details:', task.id, task.name);
          }
        });
        
        const uniqueTasks = Array.from(uniqueTasksMap.values());
        
        // Znovu zkontrolovat labely
        const finalTasksWithLabels = uniqueTasks.filter(t => t.labels && t.labels.length > 0);
        console.log('[Freelo Tasks] ✅ After fetching details:', finalTasksWithLabels.length, 'tasks have labels');
        console.log('[Freelo Tasks] Removed', allTasks.length - uniqueTasks.length, 'duplicates');
        
        // Převod na formát aplikace
        const tasks = uniqueTasks.map(convertFreeloTaskToAppTask);
        
        console.log(`[Freelo Tasks] ✅ Synced ${tasks.length} tasks for project ${cleanProjectId}${workerId ? ` (filtered by worker ${workerId})` : ''}`);
        
        return tasks;
      } else {
        // Všechny úkoly mají labely z /all-tasks, můžeme použít přímo
        console.log('[Freelo Tasks] ✅ All tasks have labels from /all-tasks, no need to fetch details');
        
        // Převod na formát aplikace
        const tasks = freeloTasks.map(convertFreeloTaskToAppTask);
        
        console.log(`[Freelo Tasks] ✅ Synced ${tasks.length} tasks for project ${cleanProjectId}${workerId ? ` (filtered by worker ${workerId})` : ''}`);
        
        return tasks;
      }
    } catch (error: any) {
      console.error('[Freelo Tasks] ❌ Sync error:', error);
      throw error;
    }
  };

  /**
   * Aktualizuje úkol přes Freelo API
   * @param taskId - ID úkolu (může být string "freelo-123" nebo number)
   * @param updates - Objekt s aktualizacemi
   */
  const updateTask = async (
    taskId: number | string,
    updates: {
      name?: string;
      due_date?: string | null;
      due_date_end?: string;
      worker?: number;
      priority_enum?: 'l' | 'm' | 'h';
      state_id?: number; // Pro změnu stavu (1 = active, 2 = finished)
    }
  ): Promise<FreeloTask | null> => {
    try {
      // Extrahovat čisté ID z formátu "freelo-123"
      const cleanTaskId = typeof taskId === 'string' && taskId.startsWith('freelo-')
        ? parseInt(taskId.replace('freelo-', ''))
        : taskId;

      // Odfiltrovat undefined hodnoty a vytvořit čistý objekt
      const cleanUpdates: any = {};
      Object.keys(updates).forEach(key => {
        const value = (updates as any)[key];
        if (value !== undefined && value !== null) {
          cleanUpdates[key] = value;
        }
      });

      // Pokud není žádná změna, nevolat API
      if (Object.keys(cleanUpdates).length === 0) {
        console.log('[Freelo Tasks] No updates to send, skipping API call');
        return null;
      }

      // Podle Freelo API dokumentace: POST /task/{task_id}
      // Body formát: přímo objekt s updates, BEZ wrapperu "task"
      // Příklad z dokumentace:
      // {
      //   "name": "Edited task name",
      //   "due_date": "2016-08-10T08:00:00+0200",
      //   "due_date_end": "2016-09-10",
      //   "worker": 1
      // }
      console.log('[Freelo Tasks] Updating task:', cleanTaskId, 'with updates:', cleanUpdates);
      
      // Posílat updates přímo, bez wrapperu "task"
      const response = await freeloFetch<{ task: FreeloTask }>(
        `/task/${cleanTaskId}`,
        {
          method: 'POST',
          body: JSON.stringify(cleanUpdates),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('[Freelo Tasks] Task updated successfully:', response);

      return response.task || (response as any);
    } catch (error: any) {
      console.error('[Freelo Tasks] Error updating task:', error);
      throw error;
    }
  };

  /**
   * Aktivuje úkol (otevře zavřený úkol)
   * @param taskId - ID úkolu
   */
  const activateTask = async (taskId: number | string): Promise<boolean> => {
    try {
      const cleanTaskId = typeof taskId === 'string' && taskId.startsWith('freelo-')
        ? parseInt(taskId.replace('freelo-', ''))
        : taskId;

      await freeloFetch(`/task/${cleanTaskId}/activate`, {
        method: 'POST'
      });

      return true;
    } catch (error: any) {
      console.error('[Freelo Tasks] Error activating task:', error);
      throw error;
    }
  };

  /**
   * Dokončí úkol (zavře úkol)
   * @param taskId - ID úkolu
   */
  const finishTask = async (taskId: number | string): Promise<boolean> => {
    try {
      const cleanTaskId = typeof taskId === 'string' && taskId.startsWith('freelo-')
        ? parseInt(taskId.replace('freelo-', ''))
        : taskId;

      await freeloFetch(`/task/${cleanTaskId}/finish`, {
        method: 'POST'
      });

      return true;
    } catch (error: any) {
      console.error('[Freelo Tasks] Error finishing task:', error);
      throw error;
    }
  };

  /**
   * Přidá komentář k úkolu
   * @param taskId - ID úkolu
   * @param content - Obsah komentáře
   */
  const addComment = async (taskId: number | string, content: string): Promise<any> => {
    try {
      const cleanTaskId = typeof taskId === 'string' && taskId.startsWith('freelo-')
        ? parseInt(taskId.replace('freelo-', ''))
        : taskId;

      const response = await freeloFetch(`/task/${cleanTaskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: content
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response;
    } catch (error: any) {
      console.error('[Freelo Tasks] Error adding comment:', error);
      throw error;
    }
  };

  /**
   * Přidá label "In progress" k úkolu
   */
  const addInProgressLabel = async (taskId: number | string): Promise<boolean> => {
    try {
      const cleanTaskId = typeof taskId === 'string' && taskId.startsWith('freelo-')
        ? parseInt(taskId.replace('freelo-', ''))
        : taskId;

      console.log('[Freelo Tasks] ===== addInProgressLabel CALLED =====');
      console.log('[Freelo Tasks] Original taskId:', taskId);
      console.log('[Freelo Tasks] Clean taskId:', cleanTaskId);
      
      if (!cleanTaskId || isNaN(Number(cleanTaskId))) {
        throw new Error(`Invalid task ID: ${taskId} (cleaned: ${cleanTaskId})`);
      }
      
      const requestBody = {
        labels: [{
          name: 'In progress',
          color: '#f2830b'
        }]
      };
      
      console.log('[Freelo Tasks] Request body:', JSON.stringify(requestBody));
      console.log('[Freelo Tasks] Calling freeloFetch with endpoint: /task-labels/add-to-task/' + cleanTaskId);
      
      const endpoint = `/task-labels/add-to-task/${cleanTaskId}`;
      console.log('[Freelo Tasks] Full endpoint:', endpoint);
      
      const response = await freeloFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('[Freelo Tasks] ✅ Label added successfully:', response);
      return true;
    } catch (error: any) {
      // Pokud je to volané z background sync, logovat jen jako warning
      const isBackgroundSync = error.stack?.includes('syncWithFreeloInBackground') || false;
      
      if (isBackgroundSync) {
        console.log('[Freelo Tasks] ⚠️ Could not add in-progress label (background sync, non-critical):', error.message);
      } else {
        console.error('[Freelo Tasks] ❌ Error adding in-progress label:', error);
        console.error('[Freelo Tasks] Error details:', {
          taskId,
          cleanTaskId: typeof taskId === 'string' && taskId.startsWith('freelo-')
            ? parseInt(taskId.replace('freelo-', ''))
            : taskId,
          errorMessage: error.message,
          errorStack: error.stack,
          errorName: error.name,
          errorCause: error.cause
        });
      }
      
      // Přidat více informací o chybě
      if (error.message) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('Síťová chyba: Nelze se připojit k serveru. Zkontrolujte připojení k internetu.');
        } else if (error.message.includes('401') || error.message.includes('credentials')) {
          throw new Error('Chyba autentizace: Neplatné přihlašovací údaje. Zkuste se znovu přihlásit.');
        } else if (error.message.includes('404')) {
          throw new Error('Endpoint nebyl nalezen. Zkontrolujte, že server běží správně.');
        } else if (error.message.includes('500')) {
          throw new Error('Chyba serveru: Server vrátil chybu 500. Zkontrolujte server logy.');
        }
      }
      
      throw error;
    }
  };

  /**
   * Odstraní label "In progress" z úkolu
   */
  const removeInProgressLabel = async (taskId: number | string): Promise<boolean> => {
    try {
      const cleanTaskId = typeof taskId === 'string' && taskId.startsWith('freelo-')
        ? parseInt(taskId.replace('freelo-', ''))
        : taskId;

      // Nejdřív načíst úkol, abychom získali UUID labelu
      const task = await fetchTaskDetail(cleanTaskId);
      if (!task || !task.labels) {
        // Úkol nemá žádné labely, není co odstraňovat - to je OK
        console.log('[Freelo Tasks] Task has no labels, nothing to remove');
        return true;
      }

      const inProgressLabel = task.labels.find(
        label => label.name?.toLowerCase() === 'in progress' || label.name?.toLowerCase() === 'in-progress'
      );

      if (!inProgressLabel || !inProgressLabel.uuid) {
        // Label "In progress" neexistuje - to je OK, není co odstraňovat
        console.log('[Freelo Tasks] Task does not have "In progress" label, nothing to remove');
        return true;
      }

      await freeloFetch(`/task-labels/remove-from-task/${cleanTaskId}`, {
        method: 'POST',
        body: JSON.stringify({
          labels: [{
            uuid: inProgressLabel.uuid
          }]
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return true;
    } catch (error: any) {
      console.error('[Freelo Tasks] Error removing in-progress label:', error);
      throw error;
    }
  };

  /**
   * Načte detail úkolu včetně komentářů
   * @param taskId - ID úkolu
   */
  const fetchTaskDetail = async (taskId: number | string): Promise<FreeloTask | null> => {
    try {
      const cleanTaskId = typeof taskId === 'string' && taskId.startsWith('freelo-')
        ? parseInt(taskId.replace('freelo-', ''))
        : taskId;

      const response = await freeloFetch<{ task: FreeloTask } | FreeloTask>(
        `/task/${cleanTaskId}`
      );

      // Freelo API může vracet buď { task: ... } nebo přímo task
      if ((response as any).task) {
        return (response as any).task;
      }
      return response as FreeloTask;
    } catch (error: any) {
      console.error('[Freelo Tasks] Error fetching task detail:', error);
      throw error;
    }
  };

  /**
   * Vytvoří nový úkol v Freelo
   * @param projectId - ID projektu
   * @param tasklistId - ID tasklistu (povinné)
   * @param taskData - Data úkolu
   */
  const createTask = async (
    projectId: number,
    tasklistId: number,
    taskData: {
      name: string;
      due_date?: string;
      due_date_end?: string;
      worker?: number;
      priority_enum?: 'l' | 'm' | 'h';
      comment?: {
        content: string;
      };
    }
  ): Promise<FreeloTask | null> => {
    try {
      const response = await freeloFetch<{ task: FreeloTask }>(
        `/project/${projectId}/tasklist/${tasklistId}/tasks`,
        {
          method: 'POST',
          body: JSON.stringify(taskData),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.task || (response as any);
    } catch (error: any) {
      console.error('[Freelo Tasks] Error creating task:', error);
      throw error;
    }
  };

  return {
    fetchAllTasks,
    fetchTasksByProject,
    fetchTasksByTasklist,
    convertFreeloTaskToAppTask,
    syncTasksForProject,
    updateTask,
    activateTask,
    finishTask,
    addComment,
    fetchTaskDetail,
    createTask,
    addInProgressLabel,
    removeInProgressLabel,
  };
};

