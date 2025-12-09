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
  // Flag pro sledování, jestli se syncProjects právě provádí
  let isSyncing = false;
  let syncPromise: Promise<Project[]> | null = null;

  const syncProjects = async () => {
    // Pokud se už synchronizace provádí, vrátit existující promise
    if (isSyncing && syncPromise) {
      console.log('[Freelo Projects] Sync already in progress, returning existing promise');
      return syncPromise;
    }

    // Vytvořit nový promise pro synchronizaci
    syncPromise = (async () => {
      isSyncing = true;
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
        
        // 4. Odstranit duplicity (podle ID) - použít Map pro lepší výkon
        const freeloProjectsMap = new Map<number, FreeloProject>();
        for (const project of allProjects) {
          if (project.id && !freeloProjectsMap.has(project.id)) {
            freeloProjectsMap.set(project.id, project);
          }
        }
        const uniqueProjects = Array.from(freeloProjectsMap.values());
        
        console.log('[Freelo Projects] Total unique projects:', uniqueProjects.length, '(own + invited, removed', allProjects.length - uniqueProjects.length, 'duplicates)');
      
        if (uniqueProjects.length === 0) {
          console.warn('[Freelo Projects] No projects found. User might not have any projects in Freelo.');
          projectsStore.setProjects([]);
          projectsStore.setLoading(false);
          return [];
        }
        
        const freeloProjects = uniqueProjects;
        
        // Převod Freelo projektů na formát používaný v aplikaci
        const projects = freeloProjects.map((fp: FreeloProject) => {
          console.log('[Freelo Projects] Processing project:', fp.id, fp.name, 'state:', fp.state);
          
          // Správné mapování stavu projektu
          // Freelo API: state.id 1 = active, 2 = archived, 3 = template
          // state.state = "active" | "archived" | "template"
          let projectStatus: 'active' | 'archived' = 'active';
          
          if (fp.state) {
            // Pokud má state objekt, použít jeho hodnotu
            if (fp.state.state === 'archived' || fp.state.id === 2) {
              projectStatus = 'archived';
            } else if (fp.state.state === 'active' || fp.state.id === 1) {
              projectStatus = 'active';
            } else {
              // Pro template nebo jiné stavy - považovat za active
              projectStatus = 'active';
            }
          } else {
            // Pokud není state objekt, považovat za active (default)
            projectStatus = 'active';
          }
          
          return {
            id: `freelo-${fp.id}`, // Prefix pro rozlišení od Firestore projektů
            name: fp.name,
            description: '', // Freelo API neposkytuje description v základním endpointu
            color: generateColorFromId(fp.id),
            createdBy: fp.owner?.id?.toString() || 'unknown',
            status: projectStatus,
            taskCount: fp.tasklists?.length || 0,
            teamMembers: [], // Budeme muset načíst z jiného endpointu
            createdAt: new Date(fp.date_add),
            updatedAt: new Date(fp.date_edited_at),
            freeloId: fp.id, // Uložení původního Freelo ID
            freeloData: fp, // Uložení celých dat pro případné další použití
          };
        });

        // 5. Odstranit duplicity - použít Map s ID jako klíčem
        // Vytvořit Map z nově načtených projektů (mají přednost, protože jsou aktuálnější)
        const projectsMap = new Map<string, Project>();
        
        // Nejdřív přidat nově načtené projekty z Freelo API
        // Tyto projekty mají přednost, protože jsou aktuálnější
        for (const project of projects) {
          projectsMap.set(project.id, project);
        }
        
        // Pak přidat stávající projekty ze store, které nejsou Freelo projekty
        // (pro případy, kdy projekt není z Freelo nebo ještě není synchronizován)
        for (const existingProject of projectsStore.projects) {
          // Přidat pouze pokud není Freelo projekt (nemá prefix "freelo-")
          // Freelo projekty už jsou v projectsMap z předchozího kroku
          if (!existingProject.id.startsWith('freelo-')) {
            // Zkontrolovat, jestli už není v mapě (pro jistotu)
            if (!projectsMap.has(existingProject.id)) {
              projectsMap.set(existingProject.id, existingProject);
            }
          }
        }
        
        // Nastavit všechny projekty (bez duplikátů)
        const finalProjects = Array.from(projectsMap.values());
        
        // Debug: zkontrolovat duplicity před uložením
        const duplicateIds = finalProjects.filter((p, index, arr) => 
          arr.findIndex(proj => proj.id === p.id) !== index
        ).map(p => p.id);
        
        if (duplicateIds.length > 0) {
          console.warn('[Freelo Projects] ⚠️ Found duplicates before saving:', duplicateIds);
          // Odstranit duplicity (zachovat první výskyt)
          const uniqueProjects = finalProjects.filter((p, index, arr) => 
            arr.findIndex(proj => proj.id === p.id) === index
          );
          projectsStore.setProjects(uniqueProjects);
          console.log('[Freelo Projects] Removed', duplicateIds.length, 'duplicates, saved', uniqueProjects.length, 'unique projects');
        } else {
          projectsStore.setProjects(finalProjects);
        }
        projectsStore.setLoading(false);
        
        console.log('[Freelo Projects] Synced', finalProjects.length, 'projects');
        
        return finalProjects;
      } catch (error: any) {
        projectsStore.setLoading(false);
        console.error('[Freelo Projects] Sync error:', error);
        throw error;
      } finally {
        isSyncing = false;
        syncPromise = null;
      }
    })();
    
    return syncPromise;
  };

  /**
   * Načte detail projektu podle ID z Freelo API
   */
  const fetchProjectById = async (projectId: number | string): Promise<FreeloProject | null> => {
    try {
      // Extrahovat čisté ID z formátu "freelo-123"
      const cleanProjectId = typeof projectId === 'string' && projectId.startsWith('freelo-')
        ? parseInt(projectId.replace('freelo-', ''))
        : projectId;

      console.log('[Freelo Projects] Fetching project detail for ID:', cleanProjectId);
      
      // Freelo API endpoint pro detail projektu: /project/{id} (singular!)
      // Pokud selže, zkusit načíst ze seznamu projektů
      try {
        const response = await freeloFetch<any>(`/project/${cleanProjectId}`);
        
        console.log('[Freelo Projects] Project detail response:', response);
        
        // Freelo API může vracet buď přímo objekt, nebo objekt s project property
        if (response && response.id) {
          return response as FreeloProject;
        }
        
        if (response && response.project && response.project.id) {
          return response.project as FreeloProject;
        }
        
        // Možná je to paginated response
        if (response && response.data && response.data.project && response.data.project.id) {
          return response.data.project as FreeloProject;
        }
        
        if (response && response.data && response.data.projects && Array.isArray(response.data.projects) && response.data.projects.length > 0) {
          return response.data.projects[0] as FreeloProject;
        }
        
        console.warn('[Freelo Projects] Unexpected project detail response structure');
        return null;
      } catch (error: any) {
        // Pokud přímý fetch selže (404), zkusit načíst ze seznamu projektů
        if (error.message?.includes('404') || error.message?.includes('Not Found')) {
          console.warn('[Freelo Projects] Direct project fetch failed (404), trying from projects list');
          
          // Načíst všechny projekty a najít ten s daným ID
          const allProjects = await fetchAllProjects();
          const project = allProjects.find(p => {
            const projectFreeloId = typeof p.freeloId === 'number' ? p.freeloId : parseInt(String(p.freeloId || '').replace('freelo-', ''));
            return projectFreeloId === cleanProjectId;
          });
          
          if (project && project.freeloData) {
            console.log('[Freelo Projects] Found project in projects list');
            return project.freeloData as FreeloProject;
          }
          
          console.warn('[Freelo Projects] Project not found in projects list:', cleanProjectId);
          return null;
        }
        throw error;
      }
    } catch (error: any) {
      console.error('[Freelo Projects] Error fetching project detail:', error);
      throw error;
    }
  };

  /**
   * Načte členy týmu projektu (workers) z Freelo API
   * @param projectId - ID projektu (může být string "freelo-123" nebo number)
   */
  const fetchProjectWorkers = async (projectId: number | string): Promise<Array<{ id: number; fullname: string }>> => {
    try {
      // Extrahovat čisté ID z formátu "freelo-123"
      const cleanProjectId = typeof projectId === 'string' && projectId.startsWith('freelo-')
        ? parseInt(projectId.replace('freelo-', ''))
        : projectId;

      console.log('[Freelo Projects] Fetching workers for project:', cleanProjectId);
      
      // Freelo API endpoint pro načtení workers: GET /project/{id}/workers
      const response = await freeloFetch<any>(`/project/${cleanProjectId}/workers`);
      
      console.log('[Freelo Projects] Workers response:', response);
      
      // Freelo API může vracet buď přímo pole, nebo objekt s workers/data.workers
      if (Array.isArray(response)) {
        return response;
      }
      
      if (response && response.workers && Array.isArray(response.workers)) {
        return response.workers;
      }
      
      if (response && response.data && response.data.workers && Array.isArray(response.data.workers)) {
        return response.data.workers;
      }
      
      console.warn('[Freelo Projects] Unexpected workers response structure');
      return [];
    } catch (error: any) {
      console.error('[Freelo Projects] Error fetching project workers:', error);
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

  /**
   * Vytvoří nový projekt ve Freelo
   * @param name - Název projektu
   * @param currencyIso - Měna projektu (CZK, EUR, USD), defaultně CZK
   */
  const createProject = async (
    name: string,
    currencyIso: string = 'CZK'
  ): Promise<FreeloProject> => {
    try {
      const auth = useFreeloAuth();
      
      // Získat user ID - pokud není v user.value, zkusit ho získat z API
      let userId = auth.user.value?.id;
      
      console.log('[Freelo Projects] Current user:', {
        email: auth.user.value?.email,
        hasId: !!auth.user.value?.id,
        id: auth.user.value?.id
      });
      
      if (!userId) {
        console.log('[Freelo Projects] User ID not found in auth, calling ensureUserId()...');
        try {
          userId = await auth.ensureUserId();
          console.log('[Freelo Projects] ensureUserId() returned:', userId);
        } catch (error: any) {
          console.error('[Freelo Projects] Error in ensureUserId():', error);
        }
      }
      
      if (!userId) {
        // Poslední pokus - zkusit získat z aktuálně načtených projektů
        console.log('[Freelo Projects] User ID still not found, trying to get from existing projects...');
        try {
          const existingProjects = await fetchProjects();
          if (existingProjects && existingProjects.length > 0 && existingProjects[0].owner) {
            userId = existingProjects[0].owner.id;
            console.log('[Freelo Projects] User ID obtained from existing projects:', userId);
          }
        } catch (error: any) {
          console.error('[Freelo Projects] Error fetching projects for user ID:', error);
        }
      }
      
      // Pokud stále nemáme userId, zkusit vytvořit projekt bez project_owner_id
      // (Freelo API může automaticky přiřadit vlastníka podle přihlášeného uživatele)
      const requestBody: any = {
        name,
        currency_iso: currencyIso
      };
      
      if (userId) {
        requestBody.project_owner_id = userId;
        console.log('[Freelo Projects] Creating project with owner ID:', { name, currencyIso, project_owner_id: userId });
      } else {
        console.warn('[Freelo Projects] Creating project without owner ID (will use authenticated user):', { name, currencyIso });
        console.warn('[Freelo Projects] Note: This may fail if project_owner_id is required by Freelo API');
      }
      
      // Freelo API očekává body bez wrapperu podle dokumentace
      let response: any;
      try {
        response = await freeloFetch<{ project: FreeloProject } | FreeloProject>(
          '/projects',
          {
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('[Freelo Projects] Project created successfully:', response);
        
        // Pokud jsme vytvořili projekt bez project_owner_id, zkusit získat user ID z nově vytvořeného projektu
        if (!userId && response) {
          const createdProject = (response as any).project || response;
          if (createdProject.id) {
            // Načíst detail projektu, který by měl obsahovat owner
            try {
              const projectDetail = await fetchProjectById(createdProject.id);
              if (projectDetail && projectDetail.owner && projectDetail.owner.id) {
                userId = projectDetail.owner.id;
                console.log('[Freelo Projects] User ID obtained from created project:', userId);
                // Aktualizovat user.value s userId
                if (auth.user.value) {
                  auth.user.value = {
                    ...auth.user.value,
                    id: userId
                  };
                }
              }
            } catch (error: any) {
              console.warn('[Freelo Projects] Could not fetch project detail for user ID:', error);
            }
          }
        }
      } catch (error: any) {
        // Pokud selhalo vytvoření bez project_owner_id, zkusit znovu získat user ID a zkusit znovu
        if (!userId && error.status === 400) {
          console.log('[Freelo Projects] Project creation failed, trying to get user ID one more time...');
          // Zkusit znovu získat user ID
          userId = await auth.ensureUserId();
          if (userId) {
            requestBody.project_owner_id = userId;
            console.log('[Freelo Projects] Retrying project creation with owner ID:', userId);
            response = await freeloFetch<{ project: FreeloProject } | FreeloProject>(
              '/projects',
              {
                method: 'POST',
                body: JSON.stringify(requestBody),
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
            console.log('[Freelo Projects] Project created successfully on retry:', response);
          } else {
            throw error; // Pokud stále nemáme userId, vyhodit původní chybu
          }
        } else {
          throw error;
        }
      }
      
      // Po vytvoření projektu načíst projekty znovu pro synchronizaci
      await syncProjects();
      
      // Freelo API může vracet buď { project: ... } nebo přímo project
      if ((response as any).project) {
        return (response as any).project;
      }
      return response as FreeloProject;
    } catch (error: any) {
      console.error('[Freelo Projects] Error creating project:', error);
      throw error;
    }
  };

  /**
   * Aktualizuje projekt ve Freelo
   * POZNÁMKA: Freelo API nepodporuje úpravu projektů přes API endpoint.
   * Tato funkce vždy vyhodí chybu s informací, že úprava není podporována.
   * @param projectId - ID projektu (může být string "freelo-123" nebo number)
   * @param updates - Objekt s aktualizacemi (name, currency_iso, project_owner_id)
   */
  const updateProject = async (
    projectId: number | string,
    updates: {
      name?: string;
      currency_iso?: string;
      project_owner_id?: number;
    }
  ): Promise<FreeloProject | null> => {
    // Freelo API nepodporuje úpravu projektů přes API
    // Podle dokumentace (freelo-apib.md) existuje pouze:
    // - GET /project/{project_id} - získat projekt
    // - DELETE /project/{project_id} - smazat projekt
    // Není tam žádný PUT/PATCH endpoint pro úpravu
    throw new Error('Úprava projektů není podporována přes Freelo API. Prosím upravte projekt přímo ve Freelo aplikaci.');
  };

  /**
   * Smaže projekt ve Freelo
   * POZNÁMKA: Freelo API může vracet chybu, že mazání projektů není podporováno přes API.
   * V takovém případě tato funkce vyhodí chybu s informací pro uživatele.
   * @param projectId - ID projektu (může být string "freelo-123" nebo number)
   */
  const deleteProject = async (projectId: number | string): Promise<void> => {
    try {
      // Extrahovat čisté ID z formátu "freelo-123"
      const cleanProjectId = typeof projectId === 'string' && projectId.startsWith('freelo-')
        ? parseInt(projectId.replace('freelo-', ''))
        : projectId;

      // Najít projekt v store podle ID (může být "freelo-123" nebo čisté ID)
      const projectIdString = typeof projectId === 'string' 
        ? projectId 
        : `freelo-${projectId}`;
      
      console.log('[Freelo Projects] Deleting project:', cleanProjectId);
      
      // Freelo API endpoint pro smazání projektu: DELETE /project/{id}
      try {
        await freeloFetch<{ result: string }>(
          `/project/${cleanProjectId}`,
          {
            method: 'DELETE'
          }
        );
        
        console.log('[Freelo Projects] Project deleted successfully');
        
        // OKAMŽITĚ odstranit projekt ze store před synchronizací (pro lepší UX)
        projectsStore.removeProject(projectIdString);
        
        // Pokud je to aktuální projekt, vymazat ho
        if (projectsStore.currentProject?.id === projectIdString) {
          projectsStore.setCurrentProject(null);
        }
        
        // Po smazání projektu načíst projekty znovu pro synchronizaci (na pozadí)
        // Použít setTimeout, aby se UI aktualizovalo okamžitě
        setTimeout(async () => {
          try {
            await syncProjects();
          } catch (syncError) {
            console.warn('[Freelo Projects] Error syncing after delete (non-critical):', syncError);
          }
        }, 100);
      } catch (apiError: any) {
        // Zkontrolovat, jestli API vrací chybu, že mazání není podporováno
        const errorMessage = apiError.message || String(apiError) || '';
        const errorData = apiError.data || apiError.response?.data || {};
        
        // Pokud API vrací chybu 403, 405, nebo specifickou hlášku, informovat uživatele
        if (apiError.status === 403 || apiError.statusCode === 403 || 
            apiError.status === 405 || apiError.statusCode === 405 ||
            errorMessage.toLowerCase().includes('not allowed') ||
            errorMessage.toLowerCase().includes('not supported') ||
            errorMessage.toLowerCase().includes('dostupné pouze')) {
          throw new Error('Mazání projektů je dostupné pouze přímo ve Freelo aplikaci. Prosím smažte projekt na https://app.freelo.io');
        }
        
        // Jinak vyhodit původní chybu
        throw apiError;
      }
    } catch (error: any) {
      console.error('[Freelo Projects] Error deleting project:', error);
      throw error;
    }
  };

  /**
   * Archivuje projekt ve Freelo
   * @param projectId - ID projektu (může být string "freelo-123" nebo number)
   */
  const archiveProject = async (projectId: number | string): Promise<void> => {
    try {
      // Extrahovat čisté ID z formátu "freelo-123"
      const cleanProjectId = typeof projectId === 'string' && projectId.startsWith('freelo-')
        ? parseInt(projectId.replace('freelo-', ''))
        : projectId;

      // Najít projekt v store podle ID (může být "freelo-123" nebo čisté ID)
      const projectIdString = typeof projectId === 'string' 
        ? projectId 
        : `freelo-${projectId}`;

      console.log('[Freelo Projects] Archiving project:', cleanProjectId);
      
      // Freelo API endpoint pro archivaci projektu: POST /project/{id}/archive
      await freeloFetch<{ result: string }>(
        `/project/${cleanProjectId}/archive`,
        {
          method: 'POST'
        }
      );
      
      console.log('[Freelo Projects] Project archived successfully');
      
      // OKAMŽITĚ aktualizovat stav projektu v store (pro lepší UX)
      projectsStore.updateProject(projectIdString, { status: 'archived' });
      
      // Po archivaci projektu načíst projekty znovu pro synchronizaci (na pozadí)
      setTimeout(async () => {
        try {
          await syncProjects();
        } catch (syncError) {
          console.warn('[Freelo Projects] Error syncing after archive (non-critical):', syncError);
        }
      }, 100);
    } catch (error: any) {
      console.error('[Freelo Projects] Error archiving project:', error);
      throw error;
    }
  };

  /**
   * Aktivuje (odarchivuje) projekt ve Freelo
   * @param projectId - ID projektu (může být string "freelo-123" nebo number)
   */
  const activateProject = async (projectId: number | string): Promise<void> => {
    try {
      // Extrahovat čisté ID z formátu "freelo-123"
      const cleanProjectId = typeof projectId === 'string' && projectId.startsWith('freelo-')
        ? parseInt(projectId.replace('freelo-', ''))
        : projectId;

      // Najít projekt v store podle ID (může být "freelo-123" nebo čisté ID)
      const projectIdString = typeof projectId === 'string' 
        ? projectId 
        : `freelo-${projectId}`;

      console.log('[Freelo Projects] Activating project:', cleanProjectId);
      
      // Freelo API endpoint pro aktivaci projektu: POST /project/{id}/activate
      await freeloFetch<{ result: string }>(
        `/project/${cleanProjectId}/activate`,
        {
          method: 'POST'
        }
      );
      
      console.log('[Freelo Projects] Project activated successfully');
      
      // OKAMŽITĚ aktualizovat stav projektu v store (pro lepší UX)
      projectsStore.updateProject(projectIdString, { status: 'active' });
      
      // Po aktivaci projektu načíst projekty znovu pro synchronizaci (na pozadí)
      setTimeout(async () => {
        try {
          await syncProjects();
        } catch (syncError) {
          console.warn('[Freelo Projects] Error syncing after activate (non-critical):', syncError);
        }
      }, 100);
    } catch (error: any) {
      console.error('[Freelo Projects] Error activating project:', error);
      throw error;
    }
  };

  return {
    fetchProjects,
    fetchAllProjects,
    fetchInvitedProjects,
    fetchArchivedProjects,
    fetchProjectById,
    fetchProjectWorkers,
    syncProjects,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    activateProject,
  };
};

