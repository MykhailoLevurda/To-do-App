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
   */
  const checkAuth = () => {
    const credentials = getCredentials();
    if (credentials && !user.value) {
      // Obnovení uživatele z credentials
      user.value = {
        email: credentials.email,
        displayName: credentials.email.split('@')[0],
      };
    }
    return !!user.value;
  };

  /**
   * Testování credentials a získání user ID z prvního projektu
   */
  const testCredentialsAndGetUserId = async (email: string, apiKey: string): Promise<{ isValid: boolean; userId?: number }> => {
    try {
      // Dočasně nastavit credentials pro test
      const originalCredentials = getCredentials();
      setCredentials(email, apiKey);
      
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
          setCredentials(originalCredentials.email, originalCredentials.apiKey);
        } else {
          clearCredentials();
        }
      }
    } catch (error) {
      console.error('[Freelo Auth] Test credentials error:', error);
      return { isValid: false };
    }
  };

  /**
   * Automatické přihlášení z .env (pro vývoj)
   */
  const autoSignIn = async () => {
    const credentials = getCredentials();
    if (credentials && !user.value) {
      // Pokud jsou credentials v .env, automaticky se přihlásit
      const config = useRuntimeConfig();
      if (config.public.freeloEmail && config.public.freeloApiKey) {
        console.log('[Freelo Auth] Auto-signing in from .env');
        await signIn(credentials.email, credentials.apiKey);
      } else {
        // Jinak jen obnovit uživatele z sessionStorage
        checkAuth();
      }
    }
  };

  // Kontrola při inicializaci
  if (process.client) {
    // Zkusit automatické přihlášení (funguje i pro .env)
    autoSignIn();
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    signIn,
    signOut,
    checkAuth,
    isAuthenticated: computed(() => !!user.value),
  };
};

