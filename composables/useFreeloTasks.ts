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
      let url = `/all-tasks?projects_ids[]=${projectId}`;
      
      // Pokud je zadán worker_id, filtrovat pouze úkoly přiřazené tomuto uživateli
      if (workerId) {
        url += `&worker_id=${workerId}`;
        console.log('[Freelo Tasks] Filtering tasks by worker_id:', workerId);
      } else {
        console.log('[Freelo Tasks] Loading all tasks for project (no worker filter)');
      }
      
      const response = await freeloFetch<FreeloPaginatedResponse<{ tasks: FreeloTask[] }>>(url);
      
      // Zkontrolovat strukturu odpovědi
      console.log('[Freelo Tasks] API response:', {
        total: response.total,
        count: response.count,
        hasData: !!response.data,
        tasksCount: response.data?.tasks?.length || 0
      });
      
      // Možná je response přímo pole úkolů, ne paginated response
      if (Array.isArray(response)) {
        console.log('[Freelo Tasks] Response is array, returning directly');
        return response;
      }
      
      // Nebo je to paginated response s data.tasks
      if (response.data && response.data.tasks) {
        return response.data.tasks;
      }
      
      // Fallback - zkusit response.tasks
      if ((response as any).tasks) {
        return (response as any).tasks;
      }
      
      console.warn('[Freelo Tasks] Unexpected response structure:', response);
      return [];
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
    const stateMap: Record<string, 'todo' | 'in-progress' | 'done'> = {
      'active': 'todo',
      'in-progress': 'in-progress',
      'finished': 'done',
      'done': 'done',
    };

    const appStatus = stateMap[freeloTask.state?.state || 'active'] || 'todo';

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

      const freeloTasks = await fetchTasksByProject(cleanProjectId, workerId);
      
      // Převod na formát aplikace
      const tasks = freeloTasks.map(convertFreeloTaskToAppTask);
      
      console.log(`[Freelo Tasks] Synced ${tasks.length} tasks for project ${cleanProjectId}${workerId ? ` (filtered by worker ${workerId})` : ''}`);
      
      return tasks;
    } catch (error: any) {
      console.error('[Freelo Tasks] Sync error:', error);
      throw error;
    }
  };

  return {
    fetchAllTasks,
    fetchTasksByProject,
    fetchTasksByTasklist,
    convertFreeloTaskToAppTask,
    syncTasksForProject,
  };
};

