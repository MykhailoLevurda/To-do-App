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

      // Pokud se přihlašuje jiný uživatel, vyčistit starého
      const currentEmail = user.value?.email;
      if (currentEmail && currentEmail !== email) {
        console.log('[Freelo Auth] Different user detected, clearing old user:', currentEmail);
        // Nevyčistit credentials - nové se uloží a přepíšou staré
      }

      // Ověření credentials a získání user ID
      const { isValid, userId } = await testCredentialsAndGetUserId(email, apiKey);
      
      if (!isValid) {
        error.value = 'Neplatné přihlašovací údaje. Zkontrolujte email a API klíč.';
        return null;
      }

      // Uložení credentials (přepíše staré, pokud existují)
      await setCredentials(email, apiKey);

      // Nastavení uživatele
      const freeloUser: FreeloUser = {
        email,
        displayName: email.split('@')[0], // Jako fallback použijeme část před @
        id: userId,
      };

      user.value = freeloUser;
      
      console.log('[Freelo Auth] User signed in:', email, 'User ID:', userId);
      
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
   * Obnoví uživatele z Firestore bez volání API (aby se neodhlašoval při chybě)
   * User ID se získá později při prvním API volání
   */
  const checkAuth = async () => {
    try {
      const credentials = await getCredentials();
      if (credentials && !user.value) {
        // Obnovení uživatele z credentials (bez volání API)
        const freeloUser: FreeloUser = {
          email: credentials.email,
          displayName: credentials.email.split('@')[0],
        };
        
        user.value = freeloUser;
        console.log('[Freelo Auth] User restored from credentials:', freeloUser.email);
        
        // Zkusit získat user ID z API (z projektů) - ale nevyžadovat to
        // Pokud selže, uživatel zůstane přihlášený, user ID se získá později
        ensureUserId().catch((error) => {
          console.warn('[Freelo Auth] Could not fetch user ID immediately:', error.message);
          // Pokračovat bez user ID - může být získán později
        });
      } else if (credentials && user.value && !user.value.id) {
        // Pokud uživatel existuje, ale nemá ID, zkusit ho získat (nevyžadovat)
        ensureUserId().catch((error) => {
          console.warn('[Freelo Auth] Could not fetch user ID:', error.message);
        });
      }
      return !!user.value;
    } catch (error: any) {
      console.error('[Freelo Auth] checkAuth error:', error);
      return false;
    }
  };

  /**
   * Testování credentials a získání user ID z prvního projektu
   * Testuje credentials bez ukládání do Firestore
   */
  const testCredentialsAndGetUserId = async (email: string, apiKey: string): Promise<{ isValid: boolean; userId?: number }> => {
    try {
      // Použít přímé volání API s poskytnutými credentials (bez ukládání do Firestore)
      const credentialsString = `${email}:${apiKey}`;
      const authHeader = `Basic ${btoa(credentialsString)}`;
      
      // Použít fetch (stejně jako v useFreeloApi pro GET requesty)
      const proxyUrl = '/api/freelo/projects?order_by=name&order=asc';
      
      console.log('[Freelo Auth] Testing credentials for email:', email);
      console.log('[Freelo Auth] Proxy URL:', proxyUrl);
      console.log('[Freelo Auth] Headers being sent:', {
        'Authorization': 'Basic ***',
        'x-freelo-email': email,
        'x-freelo-api-key': '***',
      });
      
      try {
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'x-freelo-email': email,
            'x-freelo-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        });

        console.log('[Freelo Auth] Response status:', response.status, response.statusText);

        if (!response.ok) {
          // Zkusit načíst error message z response
          let errorMessage = '';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || '';
            console.error('[Freelo Auth] Test credentials failed:', response.status, response.statusText, errorMessage);
          } catch {
            const errorText = await response.text();
            console.error('[Freelo Auth] Test credentials failed:', response.status, response.statusText, errorText);
          }
          
          // Pokud je to 401, credentials jsou neplatné
          if (response.status === 401) {
            return { isValid: false };
          }
          
          // Jinak je to jiná chyba
          return { isValid: false };
        }

        const projects = await response.json();
        console.log('[Freelo Auth] Projects fetched:', projects?.length || 0);
        
        if (projects && Array.isArray(projects) && projects.length > 0 && projects[0].owner) {
          const userId = projects[0].owner.id;
          console.log('[Freelo Auth] User ID obtained:', userId);
          return { isValid: true, userId };
        }
        
        // Pokud není owner, zkusit zjistit jinak - možná z author v úkolech
        console.log('[Freelo Auth] Credentials valid but no user ID found');
        return { isValid: true }; // Credentials jsou platné, ale ID neznáme
      } catch (fetchError: any) {
        console.error('[Freelo Auth] Test credentials error:', fetchError);
        console.error('[Freelo Auth] Error details:', {
          message: fetchError.message,
          name: fetchError.name,
          stack: fetchError.stack
        });
        
        return { isValid: false };
      }
    } catch (error: any) {
      console.error('[Freelo Auth] Unexpected error:', error);
      return { isValid: false };
    }
  };

  /**
   * Automatické přihlášení z Firestore nebo .env
   * Pro Firestore používá checkAuth (bez testování credentials)
   * Pro .env používá signIn (s testováním)
   */
  const autoSignIn = async () => {
    try {
      const credentials = await getCredentials();
      if (credentials && !user.value) {
        const config = useRuntimeConfig();
        
        // Pokud jsou credentials v .env, automaticky se přihlásit (s testem)
        if (config.public.freeloEmail && config.public.freeloApiKey) {
          console.log('[Freelo Auth] Auto-signing in from .env');
          await signIn(credentials.email, credentials.apiKey);
        } else if (credentials.email && credentials.apiKey) {
          // Pokud jsou credentials v Firestore, obnovit uživatele bez testování
          // (testování se provede až při prvním API volání, pokud selže, pak se credentials vymažou)
          console.log('[Freelo Auth] Auto-restoring user from Firestore (no credential test)');
          await checkAuth();
          
          if (user.value) {
            console.log('[Freelo Auth] User restored from Firestore:', user.value.email);
          } else {
            console.warn('[Freelo Auth] Failed to restore user from Firestore');
          }
        }
      } else if (credentials && user.value) {
        // Pokud už máme uživatele, jen zkontrolovat, jestli má user ID
        console.log('[Freelo Auth] User already exists, ensuring user ID');
        await checkAuth();
      }
    } catch (error: any) {
      console.error('[Freelo Auth] Auto-sign in error:', error);
      // Neodhlašovat uživatele při chybě - jen logovat
    }
  };

  // Kontrola při inicializaci
  if (process.client) {
    // Zkusit automatické přihlášení (funguje pro .env i localStorage)
    autoSignIn();
  }

  /**
   * Získá nebo aktualizuje user ID z API
   * Používá přímé volání API místo freeloFetch, aby neodhlašovala uživatele při 401
   */
  const ensureUserId = async (): Promise<number | null> => {
    if (user.value?.id) {
      console.log('[Freelo Auth] User ID already exists:', user.value.id);
      return user.value.id;
    }
    
    if (!user.value?.email) {
      console.warn('[Freelo Auth] Cannot fetch user ID - no user email');
      return null;
    }
    
    console.log('[Freelo Auth] Fetching user ID from API...');
    
    try {
      // Použít přímé volání API místo freeloFetch, aby se neodhlašoval uživatel při 401
      const credentials = await getCredentials();
      if (!credentials) {
        console.warn('[Freelo Auth] No credentials available for fetching user ID');
        return null;
      }
      
      const credentialsString = `${credentials.email}:${credentials.apiKey}`;
      const authHeader = `Basic ${btoa(credentialsString)}`;
      
      // Zkusit získat z projektů
      const response = await fetch('/api/freelo/projects?order_by=name&order=asc', {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'x-freelo-email': credentials.email,
          'x-freelo-api-key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const projects = await response.json();
        console.log('[Freelo Auth] Projects fetched:', projects?.length || 0);
        
        if (projects && Array.isArray(projects) && projects.length > 0) {
          const firstProject = projects[0];
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
      } else {
        // Pokud je 401, credentials jsou neplatné, ale neodhlašovat uživatele
        // (credentials se vymažou až při dalším API volání přes freeloFetch)
        console.warn('[Freelo Auth] Could not fetch user ID - API returned:', response.status);
      }
      
      console.warn('[Freelo Auth] Could not find user ID in projects');
    } catch (error: any) {
      console.error('[Freelo Auth] Error fetching user ID from API:', error);
      // Neodhlašovat uživatele při chybě - jen logovat
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

