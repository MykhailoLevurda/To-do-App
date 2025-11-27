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
  
  // Uložení credentials do sessionStorage (ne localStorage kvůli bezpečnosti)
  // Pro vývoj lze použít .env proměnné (volitelné)
  const getCredentials = (): FreeloApiConfig | null => {
    // Nejdřív zkusit .env proměnné z runtime config (pro vývoj)
    const envEmail = config.public.freeloEmail;
    const envApiKey = config.public.freeloApiKey;
    
    if (envEmail && envApiKey) {
      return { email: envEmail, apiKey: envApiKey };
    }
    
    // Pak zkusit sessionStorage (pro produkci)
    if (!process.client) return null;
    
    const email = sessionStorage.getItem('freelo_email');
    const apiKey = sessionStorage.getItem('freelo_api_key');
    
    if (!email || !apiKey) return null;
    
    return { email, apiKey };
  };

  const setCredentials = (email: string, apiKey: string) => {
    if (!process.client) return;
    
    sessionStorage.setItem('freelo_email', email);
    sessionStorage.setItem('freelo_api_key', apiKey);
  };

  const clearCredentials = () => {
    if (!process.client) return;
    
    sessionStorage.removeItem('freelo_email');
    sessionStorage.removeItem('freelo_api_key');
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
    const credentials = getCredentials();
    
    if (!credentials) {
      throw new Error('Freelo credentials not found. Please log in.');
    }

    // Použít server-side proxy místo přímého volání (řeší CORS problém)
    const proxyUrl = `/api/freelo${endpoint}`;
    
    const response = await fetch(proxyUrl, {
      ...options,
      method: options.method || 'GET',
      headers: {
        'Authorization': getAuthHeader(credentials),
        'X-Freelo-Email': credentials.email,
        'X-Freelo-Api-Key': credentials.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (response.status === 401) {
        clearCredentials();
        throw new Error('Neplatné přihlašovací údaje. Zkontrolujte email a API klíč.');
      }
      if (response.status === 429) {
        throw new Error('Překročen limit požadavků. Počkejte 60 sekund.');
      }
      throw new Error(errorData.error || `Freelo API error: ${response.status}`);
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

