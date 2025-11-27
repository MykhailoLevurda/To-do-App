import type { FreeloProject, FreeloPaginatedResponse } from './useFreeloApi';

export const useFreeloProjects = () => {
  const { freeloFetch } = useFreeloApi();
  const projectsStore = useProjectsStore();

  /**
   * Načte všechny vlastní aktivní projekty
   */
  const fetchProjects = async (): Promise<FreeloProject[]> => {
    try {
      console.log('[Freelo Projects] Fetching projects from API...');
      const response = await freeloFetch<any>('/projects?order_by=name&order=asc');
      
      console.log('[Freelo Projects] Raw API response:', response);
      console.log('[Freelo Projects] Response type:', typeof response);
      console.log('[Freelo Projects] Is array:', Array.isArray(response));
      
      // Freelo API může vracet buď přímo pole, nebo objekt s projects
      if (Array.isArray(response)) {
        console.log('[Freelo Projects] Response is array, returning', response.length, 'projects');
        return response;
      }
      
      // Možná je to objekt s projects property
      if (response && response.projects && Array.isArray(response.projects)) {
        console.log('[Freelo Projects] Response has projects property, returning', response.projects.length, 'projects');
        return response.projects;
      }
      
      // Možná je to paginated response
      if (response && response.data && response.data.projects && Array.isArray(response.data.projects)) {
        console.log('[Freelo Projects] Response is paginated, returning', response.data.projects.length, 'projects');
        return response.data.projects;
      }
      
      console.warn('[Freelo Projects] Unexpected response structure, returning empty array');
      return [];
    } catch (error: any) {
      console.error('[Freelo Projects] Error fetching projects:', error);
      throw error;
    }
  };

  /**
   * Načte všechny projekty (vlastní i pozvané) s paginací
   */
  const fetchAllProjects = async (
    page: number = 0,
    orderBy: string = 'date_add',
    order: 'asc' | 'desc' = 'asc'
  ): Promise<FreeloPaginatedResponse<{ projects: FreeloProject[] }>> => {
    try {
      const response = await freeloFetch<FreeloPaginatedResponse<{ projects: FreeloProject[] }>>(
        `/all-projects?p=${page}&order_by=${orderBy}&order=${order}&states_ids[]=1`
      );
      return response;
    } catch (error: any) {
      console.error('[Freelo Projects] Error fetching all projects:', error);
      throw error;
    }
  };

  /**
   * Načte pozvané projekty
   */
  const fetchInvitedProjects = async (
    page: number = 0
  ): Promise<FreeloPaginatedResponse<{ invited_projects: FreeloProject[] }>> => {
    try {
      const response = await freeloFetch<FreeloPaginatedResponse<{ invited_projects: FreeloProject[] }>>(
        `/invited-projects?p=${page}`
      );
      return response;
    } catch (error: any) {
      console.error('[Freelo Projects] Error fetching invited projects:', error);
      throw error;
    }
  };

  /**
   * Načte archivované projekty
   */
  const fetchArchivedProjects = async (
    page: number = 0
  ): Promise<FreeloPaginatedResponse<{ archived_projects: FreeloProject[] }>> => {
    try {
      const response = await freeloFetch<FreeloPaginatedResponse<{ archived_projects: FreeloProject[] }>>(
        `/archived-projects?p=${page}`
      );
      return response;
    } catch (error: any) {
      console.error('[Freelo Projects] Error fetching archived projects:', error);
      throw error;
    }
  };

  /**
   * Synchronizuje projekty z Freelo do store
   * Načte vlastní projekty i pozvané projekty a spojí je dohromady
   */
  const syncProjects = async () => {
    try {
      projectsStore.setLoading(true);
      
      const allProjects: FreeloProject[] = [];
      
      // 1. Načíst vlastní aktivní projekty
      try {
        const ownProjects = await fetchProjects();
        console.log('[Freelo Projects] Fetched', ownProjects.length, 'own projects from /projects');
        allProjects.push(...ownProjects);
      } catch (error: any) {
        console.warn('[Freelo Projects] Error fetching own projects:', error);
      }
      
      // 2. Načíst pozvané projekty
      try {
        const invitedResponse = await fetchInvitedProjects(0);
        if (invitedResponse && invitedResponse.data && invitedResponse.data.invited_projects) {
          const invitedProjects = invitedResponse.data.invited_projects;
          console.log('[Freelo Projects] Fetched', invitedProjects.length, 'invited projects from /invited-projects');
          allProjects.push(...invitedProjects);
        }
      } catch (error: any) {
        console.warn('[Freelo Projects] Error fetching invited projects:', error);
      }
      
      // 3. Pokud stále není žádný projekt, zkusit /all-projects jako fallback
      if (allProjects.length === 0) {
        console.log('[Freelo Projects] No projects found, trying /all-projects as fallback...');
        try {
          const allProjectsResponse = await fetchAllProjects(0, 'date_add', 'desc');
          if (allProjectsResponse && allProjectsResponse.data && allProjectsResponse.data.projects) {
            const fallbackProjects = allProjectsResponse.data.projects;
            console.log('[Freelo Projects] Fetched', fallbackProjects.length, 'projects from /all-projects (fallback)');
            allProjects.push(...fallbackProjects);
          }
        } catch (error: any) {
          console.warn('[Freelo Projects] Error fetching all-projects:', error);
        }
      }
      
      // 4. Odstranit duplicity (podle ID)
      const uniqueProjects = allProjects.filter((project, index, self) =>
        index === self.findIndex((p) => p.id === project.id)
      );
      
      console.log('[Freelo Projects] Total unique projects:', uniqueProjects.length, '(own + invited)');
      
      if (uniqueProjects.length === 0) {
        console.warn('[Freelo Projects] No projects found. User might not have any projects in Freelo.');
        projectsStore.setProjects([]);
        projectsStore.setLoading(false);
        return [];
      }
      
      const freeloProjects = uniqueProjects;
      
      // Převod Freelo projektů na formát používaný v aplikaci
      const projects = freeloProjects.map((fp: FreeloProject) => {
        console.log('[Freelo Projects] Processing project:', fp.id, fp.name);
        return {
          id: `freelo-${fp.id}`, // Prefix pro rozlišení od Firestore projektů
          name: fp.name,
          description: '', // Freelo API neposkytuje description v základním endpointu
          color: generateColorFromId(fp.id),
          createdBy: fp.owner?.id?.toString() || 'unknown',
          status: fp.state?.state === 'active' ? 'active' : 'archived',
          taskCount: fp.tasklists?.length || 0,
          teamMembers: [], // Budeme muset načíst z jiného endpointu
          createdAt: new Date(fp.date_add),
          updatedAt: new Date(fp.date_edited_at),
          freeloId: fp.id, // Uložení původního Freelo ID
          freeloData: fp, // Uložení celých dat pro případné další použití
        };
      });

      projectsStore.setProjects(projects);
      projectsStore.setLoading(false);
      
      console.log('[Freelo Projects] Synced', projects.length, 'projects');
      
      return projects;
    } catch (error: any) {
      projectsStore.setLoading(false);
      console.error('[Freelo Projects] Sync error:', error);
      throw error;
    }
  };

  /**
   * Generuje barvu z ID (pro konzistentní zobrazení)
   */
  const generateColorFromId = (id: number): string => {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e',
      '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
      '#84cc16', '#f59e0b', '#10b981', '#14b8a6'
    ];
    return colors[id % colors.length];
  };

  return {
    fetchProjects,
    fetchAllProjects,
    fetchInvitedProjects,
    fetchArchivedProjects,
    syncProjects,
  };
};

