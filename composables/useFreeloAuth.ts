/**
 * Autentizace pomocí Freelo API
 * Email + API klíč místo Firebase
 */

export interface FreeloUser {
  email: string;
  displayName?: string;
  id?: number; // Freelo user ID
}

export const useFreeloAuth = () => {
  const { setCredentials, clearCredentials, testCredentials, getCredentials, freeloFetch } = useFreeloApi();
  
  const user = useState<FreeloUser | null>('freelo-user', () => null);
  const loading = useState('freelo-auth-loading', () => false);
  const error = useState<string | null>('freelo-auth-error', () => null);

  /**
   * Přihlášení pomocí Freelo emailu a API klíče
   */
  const signIn = async (email: string, apiKey: string): Promise<FreeloUser | null> => {
    try {
      error.value = null;
      loading.value = true;

      // Ověření credentials a získání user ID
      const { isValid, userId } = await testCredentialsAndGetUserId(email, apiKey);
      
      if (!isValid) {
        error.value = 'Neplatné přihlašovací údaje. Zkontrolujte email a API klíč.';
        return null;
      }

      // Uložení credentials
      setCredentials(email, apiKey);

      // Nastavení uživatele
      const freeloUser: FreeloUser = {
        email,
        displayName: email.split('@')[0], // Jako fallback použijeme část před @
        id: userId,
      };

      user.value = freeloUser;
      
      console.log('[Freelo Auth] User signed in:', email);
      
      return freeloUser;
    } catch (err: any) {
      error.value = err.message || 'Chyba při přihlášení';
      console.error('[Freelo Auth] Sign in error:', err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Odhlášení
   */
  const signOut = async () => {
    try {
      error.value = null;
      
      console.log('[Freelo Auth] Signing out user:', user.value?.email);
      
      clearCredentials();
      user.value = null;
      
      // Vyčištění store
      const projectsStore = useProjectsStore();
      const scrumBoardStore = useScrumBoardStore();
      
      projectsStore.clearProjects();
      projectsStore.setCurrentUserId(null);
      
      scrumBoardStore.clearTasks();
      scrumBoardStore.setCurrentUserId(null);
      
      console.log('[Freelo Auth] User signed out successfully');
    } catch (err: any) {
      error.value = err.message || 'Chyba při odhlášení';
      console.error('[Freelo Auth] Sign out error:', err);
    }
  };

  /**
   * Kontrola, zda je uživatel přihlášen
   * Obnoví uživatele z Firestore a získá user ID z API
   */
  const checkAuth = async () => {
    const credentials = await getCredentials();
    if (credentials && !user.value) {
      // Obnovení uživatele z credentials
      const freeloUser: FreeloUser = {
        email: credentials.email,
        displayName: credentials.email.split('@')[0],
      };
      
      // Zkusit získat user ID z API (z projektů)
      try {
        const projects = await freeloFetch<any[]>('/projects?order_by=name&order=asc');
        if (projects && projects.length > 0 && projects[0].owner) {
          freeloUser.id = projects[0].owner.id;
          console.log('[Freelo Auth] User ID obtained from projects:', freeloUser.id);
        }
      } catch (error: any) {
        console.warn('[Freelo Auth] Could not fetch user ID from projects:', error.message);
        // Pokračovat bez user ID - může být získán později
      }
      
      user.value = freeloUser;
    } else if (credentials && user.value && !user.value.id) {
      // Pokud uživatel existuje, ale nemá ID, zkusit ho získat
      try {
        const projects = await freeloFetch<any[]>('/projects?order_by=name&order=asc');
        if (projects && projects.length > 0 && projects[0].owner) {
          // Aktualizovat user ID - vytvořit nový objekt (user je useState, ne readonly uvnitř composable)
          const currentUser = user.value;
          user.value = {
            ...currentUser,
            id: projects[0].owner.id
          };
          console.log('[Freelo Auth] User ID obtained from projects:', user.value.id);
        }
      } catch (error: any) {
        console.warn('[Freelo Auth] Could not fetch user ID from projects:', error.message);
      }
    }
    return !!user.value;
  };

  /**
   * Testování credentials a získání user ID z prvního projektu
   */
  const testCredentialsAndGetUserId = async (email: string, apiKey: string): Promise<{ isValid: boolean; userId?: number }> => {
    try {
      // Dočasně nastavit credentials pro test
      const originalCredentials = await getCredentials();
      await setCredentials(email, apiKey);
      
      try {
        // Zkusit načíst projekty - z prvního projektu získáme owner.id (což je ID uživatele)
        const projects = await freeloFetch<any[]>('/projects?order_by=name&order=asc');
        
        if (projects && projects.length > 0 && projects[0].owner) {
          const userId = projects[0].owner.id;
          return { isValid: true, userId };
        }
        
        // Pokud není owner, zkusit zjistit jinak - možná z author v úkolech
        return { isValid: true }; // Credentials jsou platné, ale ID neznáme
      } finally {
        // Obnovit původní credentials
        if (originalCredentials) {
          await setCredentials(originalCredentials.email, originalCredentials.apiKey);
        } else {
          await clearCredentials();
        }
      }
    } catch (error) {
      console.error('[Freelo Auth] Test credentials error:', error);
      return { isValid: false };
    }
  };

  /**
   * Automatické přihlášení z Firestore nebo .env
   */
  const autoSignIn = async () => {
    const credentials = await getCredentials();
    if (credentials && !user.value) {
      const config = useRuntimeConfig();
      
      // Pokud jsou credentials v .env, automaticky se přihlásit
      if (config.public.freeloEmail && config.public.freeloApiKey) {
        console.log('[Freelo Auth] Auto-signing in from .env');
        await signIn(credentials.email, credentials.apiKey);
      } else if (credentials.email && credentials.apiKey) {
        // Pokud jsou credentials v Firestore, automaticky se přihlásit
        console.log('[Freelo Auth] Auto-signing in from Firestore');
        try {
          await signIn(credentials.email, credentials.apiKey);
        } catch (error: any) {
          // Pokud credentials nejsou platné, vymazat je
          console.warn('[Freelo Auth] Auto-sign in failed, clearing credentials:', error);
          await clearCredentials();
        }
      } else {
        // Jinak jen obnovit uživatele z Firestore (pokud jsou data)
        await checkAuth();
      }
    }
  };

  // Kontrola při inicializaci
  if (process.client) {
    // Zkusit automatické přihlášení (funguje pro .env i localStorage)
    autoSignIn();
  }

  /**
   * Získá nebo aktualizuje user ID z API
   */
  const ensureUserId = async (): Promise<number | null> => {
    if (user.value?.id) {
      console.log('[Freelo Auth] User ID already exists:', user.value.id);
      return user.value.id;
    }
    
    console.log('[Freelo Auth] Fetching user ID from API...');
    
    try {
      // Zkusit získat z projektů
      const projects = await freeloFetch<any[]>('/projects?order_by=name&order=asc');
      console.log('[Freelo Auth] Projects fetched:', projects?.length || 0);
      
      if (projects && Array.isArray(projects) && projects.length > 0) {
        const firstProject = projects[0];
        console.log('[Freelo Auth] First project:', {
          id: firstProject.id,
          name: firstProject.name,
          hasOwner: !!firstProject.owner,
          owner: firstProject.owner
        });
        
        if (firstProject.owner && firstProject.owner.id) {
          const userId = firstProject.owner.id;
          console.log('[Freelo Auth] User ID obtained from project owner:', userId);
          
          if (user.value) {
            // Aktualizovat user ID
            user.value = {
              ...user.value,
              id: userId
            };
            console.log('[Freelo Auth] User ID updated in user.value');
          }
          return userId;
        }
      }
      
      // Pokud není žádný projekt, zkusit z úkolů
      console.log('[Freelo Auth] No projects found, trying to get user ID from tasks...');
      const freeloTasks = useFreeloTasks();
      const allTasks = await freeloTasks.fetchAllTasks({});
      
      if (allTasks && allTasks.data && allTasks.data.tasks && allTasks.data.tasks.length > 0) {
        const firstTask = allTasks.data.tasks[0];
        if (firstTask.author && firstTask.author.id) {
          const userId = firstTask.author.id;
          console.log('[Freelo Auth] User ID obtained from task author:', userId);
          
          if (user.value) {
            user.value = {
              ...user.value,
              id: userId
            };
          }
          return userId;
        }
      }
      
      console.warn('[Freelo Auth] Could not find user ID in projects or tasks');
    } catch (error: any) {
      console.error('[Freelo Auth] Error fetching user ID from API:', error);
      console.error('[Freelo Auth] Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    return null;
  };

  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    signIn,
    signOut,
    checkAuth,
    ensureUserId,
    isAuthenticated: computed(() => !!user.value),
  };
};

