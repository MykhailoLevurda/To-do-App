import { defineEventHandler, getQuery, readBody, getMethod } from 'h3';
import axios from 'axios';

const FREELO_API_BASE = 'https://api2.freelo.io/v1';

/**
 * Proxy endpoint pro Freelo API
 * Řeší CORS problém - volá Freelo API na serveru, kde není CORS omezení
 */
export default defineEventHandler(async (event) => {
  // Logovat všechny requesty hned na začátku
  const method = getMethod(event);
  const path = event.context.params?.path || '';
  
  // Zkontrolovat, jestli se request vůbec dostane na server
  console.log('[Freelo Proxy] ===== INCOMING REQUEST (CATCH-ALL) =====');
  console.log('[Freelo Proxy] Method:', method);
  console.log('[Freelo Proxy] Path:', path);
  console.log('[Freelo Proxy] URL:', event.node.req.url);
  console.log('[Freelo Proxy] Event path:', event.path);
  console.log('[Freelo Proxy] Event context params:', event.context.params);

  // POZNÁMKA: Pokud vidíte tento log pro POST /task-labels/add-to-task/:id,
  // znamená to, že specifický endpoint se nevolá a request jde do catch-all.
  // To by nemělo nastat - specifické endpointy mají mít přednost.
  // Pokud se to stane, může to být problém s Nuxt routing.
  
  // Speciální handling pro POST requesty na task-labels/add-to-task/:id
  // Pokud se specifický endpoint nedostane do handleru (kvůli srvx chybě), zpracujeme to zde
  if (method === 'POST' && path.match(/^task-labels\/add-to-task\/(\d+)$/)) {
    const match = path.match(/^task-labels\/add-to-task\/(\d+)$/);
    const taskId = match ? match[1] : null;
    console.log('[Freelo Proxy] ⚠️ POST to task-labels/add-to-task handled by CATCH-ALL (specific endpoint not called due to srvx error)');
    console.log('[Freelo Proxy] Task ID:', taskId);
    console.log('[Freelo Proxy] Processing request in catch-all as fallback...');
    // Request bude zpracován normálně dále v kódu - catch-all proxy zpracuje POST stejně jako GET
  }
  
  // Speciální handling pro POST requesty na task-labels/remove-from-task/:id
  if (method === 'POST' && path.match(/^task-labels\/remove-from-task\/(\d+)$/)) {
    const match = path.match(/^task-labels\/remove-from-task\/(\d+)$/);
    const taskId = match ? match[1] : null;
    console.log('[Freelo Proxy] ⚠️ WARNING: POST to task-labels/remove-from-task handled by CATCH-ALL instead of specific endpoint!');
    console.log('[Freelo Proxy] Task ID:', taskId);
    // Pokračovat normálně
  }
  
  console.log('[Freelo Proxy] Headers:', {
    'content-type': event.node.req.headers['content-type'],
    'content-length': event.node.req.headers['content-length'],
    'x-freelo-email': event.node.req.headers['x-freelo-email'] ? '***' : undefined,
    'x-freelo-api-key': event.node.req.headers['x-freelo-api-key'] ? '***' : undefined,
  });
  
  // Debug: logovat všechny POST requesty
  if (method === 'POST') {
    console.log('[Freelo Proxy] 🔵 POST REQUEST DETECTED IN CATCH-ALL');
    console.log('[Freelo Proxy] Full path:', path);
    console.log('[Freelo Proxy] Event path:', event.path);
    console.log('[Freelo Proxy] Event context:', {
      params: event.context.params,
      nitro: event.context.nitro ? 'present' : 'missing'
    });
  }
  
  try {
    const query = getQuery(event);
    
    // Debug: logovat všechny requesty
    console.log('[Freelo Proxy] Incoming request:', {
      method,
      path,
      url: event.node.req.url,
      hasBody: method !== 'GET' && method !== 'HEAD'
    });
    
    // Získání credentials z headers nebo body
    let email: string | undefined;
    let apiKey: string | undefined;
    
    // Nejdřív zkusit custom headers (nejspolehlivější)
    email = event.node.req.headers['x-freelo-email'] as string;
    apiKey = event.node.req.headers['x-freelo-api-key'] as string;
    
    // Pak zkusit Authorization header (Basic Auth)
    if (!email || !apiKey) {
      const authHeader = event.node.req.headers.authorization;
      if (authHeader && authHeader.startsWith('Basic ')) {
        const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString('utf-8');
        [email, apiKey] = credentials.split(':');
      }
    }
    
    // Načíst body pouze jednou (pro POST/PUT/PATCH requesty)
    // Nuxt 3 readBody automaticky parsuje JSON, takže dostaneme objekt
    let requestBody: any = undefined;
    
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        console.log('[Freelo Proxy] Reading body for', method, 'request...');
        console.log('[Freelo Proxy] Content-Type:', event.node.req.headers['content-type']);
        console.log('[Freelo Proxy] Content-Length:', event.node.req.headers['content-length']);
        
        requestBody = await readBody(event);
        
        console.log('[Freelo Proxy] Body read successfully:', {
          type: typeof requestBody,
          isObject: typeof requestBody === 'object',
          isArray: Array.isArray(requestBody),
          keys: requestBody && typeof requestBody === 'object' ? Object.keys(requestBody) : [],
          preview: typeof requestBody === 'string' 
            ? requestBody.substring(0, 200) 
            : JSON.stringify(requestBody).substring(0, 200)
        });
        
        // Zkusit získat credentials z body, pokud nejsou v headers
        if (!email || !apiKey) {
          email = requestBody?.email || email;
          apiKey = requestBody?.apiKey || apiKey;
        }
      } catch (error: any) {
        console.error('[Freelo Proxy] Error reading body:', {
          error: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code
        });
        requestBody = {};
      }
    }
    
    if (!email || !apiKey) {
      event.node.res.statusCode = 401;
      return {
        error: 'Missing credentials. Please provide email and API key.',
      };
    }

    // Sestavení URL s query parametry
    const queryString = new URLSearchParams(query as Record<string, string>).toString();
    const url = `${FREELO_API_BASE}/${path}${queryString ? `?${queryString}` : ''}`;
    
    // Vytvoření Basic Auth headeru
    const credentialsString = `${email}:${apiKey}`;
    const authHeaderValue = `Basic ${Buffer.from(credentialsString).toString('base64')}`;
    
    // User-Agent header je povinný podle dokumentace
    const userAgent = 'Scrum Board (server-proxy)';
    
    // Připravit body pro Freelo API (stringifyovat objekt bez credentials)
    let freeloRequestBody: string | undefined = undefined;
    
    if (requestBody) {
      // Odstranit credentials z body před odesláním do Freelo API
      if (typeof requestBody === 'object' && (requestBody.email || requestBody.apiKey)) {
        const { email: _, apiKey: __, ...rest } = requestBody;
        freeloRequestBody = JSON.stringify(rest);
      } else {
        freeloRequestBody = JSON.stringify(requestBody);
      }
    }
    
    // Debug logging (pouze v development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Freelo Proxy] Request:', {
        method,
        url,
        path,
        hasBody: !!freeloRequestBody,
        bodyPreview: freeloRequestBody ? freeloRequestBody.substring(0, 200) : undefined,
        bodyLength: freeloRequestBody?.length || 0,
      });
    }
    
    // Volání Freelo API na serveru (bez CORS problému)
    // Použít axios místo fetch (vyřeší problém s srvx)
    try {
      const axiosConfig: any = {
        method: method as any,
        url,
        headers: {
          'User-Agent': `${userAgent} (${email})`,
          'Authorization': authHeaderValue,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true, // Nevyhodit chybu pro non-2xx status kódy
      };
      
      if (freeloRequestBody) {
        axiosConfig.data = JSON.parse(freeloRequestBody);
      }
      
      const response = await axios(axiosConfig);
      
      // Předat status kód
      event.node.res.statusCode = response.status;
      
      if (response.status >= 400) {
        console.error('[Freelo Proxy] Freelo API error:', {
          status: response.status,
          statusText: response.statusText,
          url,
          method,
          path,
          requestBody: process.env.NODE_ENV === 'development' ? (freeloRequestBody ? JSON.parse(freeloRequestBody) : undefined) : undefined,
          responseData: response.data
        });
        
        return {
          error: response.data?.error || response.data?.message || `Freelo API error: ${response.status} ${response.statusText}`,
          status: response.status,
          details: process.env.NODE_ENV === 'development' ? { 
            ...response.data, 
            requestBody: freeloRequestBody ? JSON.parse(freeloRequestBody) : undefined,
            url,
            method
          } : undefined,
        };
      }

      return response.data;
    } catch (axiosError: any) {
      console.error('[Freelo Proxy] Axios error:', {
        message: axiosError.message,
        code: axiosError.code,
        url,
        method,
        path,
      });
      
      event.node.res.statusCode = axiosError.response?.status || 500;
      return {
        error: axiosError.response?.data?.error || axiosError.response?.data?.message || axiosError.message || 'Network error',
        status: axiosError.response?.status || 500,
        details: process.env.NODE_ENV === 'development' ? {
          message: axiosError.message,
          code: axiosError.code,
          response: axiosError.response?.data,
        } : undefined,
      };
    }
  } catch (error: any) {
    console.error('[Freelo Proxy] Error:', error);
    console.error('[Freelo Proxy] Error details:', {
      method: getMethod(event),
      path: event.context.params?.path || '',
      url: event.node.req.url,
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
    });
    event.node.res.statusCode = 500;
    return {
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : undefined,
    };
  }
});

