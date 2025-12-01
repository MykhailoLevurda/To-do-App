/**
 * Composable pro práci s Freelo API
 * Používá HTTP Basic Authentication - email jako username, API key jako password
 */

export interface FreeloApiConfig {
  email: string;
  apiKey: string;
}

export interface FreeloProject {
  id: number;
  name: string;
  date_add: string;
  date_edited_at: string;
  tasklists?: Array<{
    id: number;
    name: string;
  }>;
  owner?: {
    id: number;
    fullname: string;
  };
  state?: {
    id: number;
    state: string;
  };
  client?: {
    id: number;
    email: string;
    name: string;
    company?: string;
  };
}

export interface FreeloTask {
  id: number;
  name: string;
  date_add: string;
  date_edited_at: string;
  due_date?: string | null;
  due_date_end?: string | null;
  date_finished?: string | null;
  count_comments: number;
  count_subtasks: number;
  author: {
    id: number;
    fullname: string;
  };
  worker?: {
    id: number;
    email: string;
    fullname: string;
  } | null;
  state: {
    id: number;
    state: string;
  };
  project: {
    id: number;
    name: string;
    state: {
      id: number;
      state: string;
    };
  };
  tasklist: {
    id: number;
    name: string;
    state: {
      id: number;
      state: string;
    };
  };
  labels?: Array<{
    uuid: string;
    name: string;
    color: string;
  }>;
  parent_task_id?: number | null;
  priority_enum?: string;
}

export interface FreeloPaginatedResponse<T> {
  total: number;
  count: number;
  page: number;
  per_page: number;
  data: T;
}

const FREELO_API_BASE = 'https://api2.freelo.io/v1';

export const useFreeloApi = () => {
  const config = useRuntimeConfig();
  
  // Uložení credentials do Firestore (pouze email + API klíč)
  // Pro vývoj lze použít .env proměnné (volitelné)
  const getCredentials = async (): Promise<FreeloApiConfig | null> => {
    // Nejdřív zkusit .env proměnné z runtime config (pro vývoj)
    const envEmail = config.public.freeloEmail;
    const envApiKey = config.public.freeloApiKey;
    
    if (envEmail && envApiKey) {
      return { email: envEmail, apiKey: envApiKey };
    }
    
    // Pak zkusit Firestore (pro trvalé přihlášení)
    if (!process.client) return null;
    
    // Zkusit načíst z localStorage email (pouze pro identifikaci)
    const email = localStorage.getItem('freelo_email');
    if (!email) return null;
    
    // Načíst API klíč z Firestore
    const firestoreUsers = useFirestoreUsers();
    const credentials = await firestoreUsers.getUserCredentials(email);
    
    if (!credentials || !credentials.apiKey) return null;
    
    return { email: credentials.email, apiKey: credentials.apiKey };
  };

  const setCredentials = async (email: string, apiKey: string) => {
    if (!process.client) return;
    
    // Uložit email do localStorage (pro rychlou identifikaci)
    localStorage.setItem('freelo_email', email);
    
    // Uložit credentials do Firestore
    const firestoreUsers = useFirestoreUsers();
    await firestoreUsers.saveUserCredentials(email, apiKey);
  };

  const clearCredentials = async () => {
    if (!process.client) return;
    
    const email = localStorage.getItem('freelo_email');
    localStorage.removeItem('freelo_email');
    
    // Smazat z Firestore
    if (email) {
      const firestoreUsers = useFirestoreUsers();
      await firestoreUsers.deleteUserCredentials(email);
    }
  };

  // Vytvoření Basic Auth headeru
  const getAuthHeader = (credentials: FreeloApiConfig): string => {
    const credentialsString = `${credentials.email}:${credentials.apiKey}`;
    return `Basic ${btoa(credentialsString)}`;
  };

  // Generický fetch pro Freelo API přes server-side proxy (řeší CORS)
  const freeloFetch = async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const credentials = await getCredentials();
    
    if (!credentials) {
      throw new Error('Freelo credentials not found. Please log in.');
    }

    // Použít server-side proxy místo přímého volání (řeší CORS problém)
    const proxyUrl = `/api/freelo${endpoint}`;
    
    // Debug logging pro POST requesty
    if (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH') {
      console.log('[Freelo API] ===== Sending', options.method, 'request =====');
      console.log('[Freelo API] Endpoint:', endpoint);
      console.log('[Freelo API] Proxy URL:', proxyUrl);
      console.log('[Freelo API] Full URL:', window.location.origin + proxyUrl);
      console.log('[Freelo API] Request body:', options.body);
      console.log('[Freelo API] Request headers:', {
        'Content-Type': 'application/json',
        'X-Freelo-Email': credentials.email ? '***' : undefined,
        'X-Freelo-Api-Key': credentials.apiKey ? '***' : undefined,
        'Authorization': 'Basic ***'
      });
    }
    
    // Pro POST/PUT/PATCH requesty použít $fetch (lépe funguje s Nuxt serverem)
    // Pro GET requesty použít fetch (zachovat kompatibilitu)
    if (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH') {
      try {
        console.log('[Freelo API] Using $fetch for', options.method, 'request...');
        
        // Parse body if it's a string
        let bodyData: any = options.body;
        if (typeof options.body === 'string') {
          try {
            bodyData = JSON.parse(options.body);
          } catch {
            // If parsing fails, use as is
            bodyData = options.body;
          }
        }
        
        const response = await $fetch<T>(proxyUrl, {
          method: options.method as any,
          headers: {
            'Authorization': getAuthHeader(credentials),
            'X-Freelo-Email': credentials.email,
            'X-Freelo-Api-Key': credentials.apiKey,
            'Content-Type': 'application/json',
            ...options.headers as any,
          },
          body: bodyData,
        });
        
        console.log('[Freelo API] ✅ $fetch completed successfully');
        return response;
      } catch (fetchError: any) {
        console.error('[Freelo API] ❌ $fetch error:', fetchError);
        console.error('[Freelo API] Error details:', {
          message: fetchError.message,
          name: fetchError.name,
          status: fetchError.status,
          statusCode: fetchError.statusCode,
          data: fetchError.data
        });
        
        if (fetchError.status === 401 || fetchError.statusCode === 401) {
          await clearCredentials();
          throw new Error('Neplatné přihlašovací údaje. Zkontrolujte email a API klíč.');
        }
        if (fetchError.status === 429 || fetchError.statusCode === 429) {
          throw new Error('Překročen limit požadavků. Počkejte 60 sekund.');
        }
        
        const errorMessage = fetchError.data?.error || fetchError.data?.message || fetchError.message || 'Unknown error';
        throw new Error(errorMessage);
      }
    }
    
    // Pro GET requesty použít fetch (zachovat kompatibilitu)
    let response: Response;
    try {
      console.log('[Freelo API] Using fetch for GET request...');
      response = await fetch(proxyUrl, {
        ...options,
        method: options.method || 'GET',
        headers: {
          'Authorization': getAuthHeader(credentials),
          'X-Freelo-Email': credentials.email,
          'X-Freelo-Api-Key': credentials.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      console.log('[Freelo API] ✅ Fetch completed, status:', response.status);
    } catch (fetchError: any) {
      console.error('[Freelo API] ❌ Fetch error (network/CORS):', fetchError);
      throw new Error(`Síťová chyba při volání API: ${fetchError.message || 'Nelze se připojit k serveru'}`);
    }

    if (!response.ok) {
      let errorData: any = { error: 'Unknown error' };
      const contentType = response.headers.get('content-type') || '';
      
      try {
        const text = await response.text();
        if (text) {
          if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
            try {
              errorData = JSON.parse(text);
            } catch (parseError) {
              errorData = { error: text.substring(0, 200) };
            }
          } else {
            errorData = { error: `Server error: ${response.status} ${response.statusText}` };
          }
        }
      } catch (e) {
        errorData = { error: `Request failed: ${response.status} ${response.statusText}` };
      }
      
      if (response.status === 401) {
        await clearCredentials();
        throw new Error('Neplatné přihlašovací údaje. Zkontrolujte email a API klíč.');
      }
      if (response.status === 429) {
        throw new Error('Překročen limit požadavků. Počkejte 60 sekund.');
      }
      
      const errorMessage = errorData.error || errorData.message || `Freelo API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return await response.json();
  };

  // Testování credentials - ověření, že jsou platné (přes server-side proxy)
  const testCredentials = async (email: string, apiKey: string): Promise<boolean> => {
    try {
      const credentialsString = `${email}:${apiKey}`;
      const authHeader = `Basic ${btoa(credentialsString)}`;
      
      // Použít server-side proxy místo přímého volání (řeší CORS problém)
      const response = await fetch('/api/freelo/projects', {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'X-Freelo-Email': email,
          'X-Freelo-Api-Key': apiKey,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('[Freelo API] Test credentials error:', error);
      return false;
    }
  };

  return {
    getCredentials,
    setCredentials,
    clearCredentials,
    testCredentials,
    freeloFetch,
  };
};

