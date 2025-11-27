// Logovat při načtení modulu (pro debugging)
console.log('[Freelo Proxy] ✅ Module loaded: task-labels/add-to-task/[id].post.ts');

import { defineEventHandler, readBody, getRouterParam } from 'h3';
import axios from 'axios';

const FREELO_API_BASE = 'https://api2.freelo.io/v1';

/**
 * Explicitní endpoint pro přidání labelu k úkolu
 * POST /api/freelo/task-labels/add-to-task/:id
 */
export default defineEventHandler(async (event) => {
  // Logovat hned na začátku - ještě před jakýmkoliv kódem
  console.log('[Freelo Proxy] ===== POST /task-labels/add-to-task/:id HANDLER CALLED =====');
  console.log('[Freelo Proxy] Event URL:', event.node.req.url);
  console.log('[Freelo Proxy] Event method:', event.node.req.method);
  console.log('[Freelo Proxy] Full event path:', event.path);
  console.log('[Freelo Proxy] Event context params:', event.context.params);
  
  try {
    const taskId = getRouterParam(event, 'id');
    const method = 'POST';
    
    console.log('[Freelo Proxy] POST /task-labels/add-to-task/:id - Task ID:', taskId);
    
    // Získání credentials z headers
    let email: string | undefined;
    let apiKey: string | undefined;
    
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
    
    if (!email || !apiKey) {
      event.node.res.statusCode = 401;
      return {
        error: 'Missing credentials. Please provide email and API key.',
      };
    }
    
    // Načíst body
    let requestBody: any = undefined;
    try {
      console.log('[Freelo Proxy] Reading body...');
      requestBody = await readBody(event);
      console.log('[Freelo Proxy] Body read:', requestBody);
    } catch (error: any) {
      console.error('[Freelo Proxy] Error reading body:', error);
      event.node.res.statusCode = 400;
      return {
        error: 'Could not read request body: ' + error.message,
      };
    }
    
    // Sestavení URL
    const url = `${FREELO_API_BASE}/task-labels/add-to-task/${taskId}`;
    
    // Vytvoření Basic Auth headeru
    const credentialsString = `${email}:${apiKey}`;
    const authHeaderValue = `Basic ${Buffer.from(credentialsString).toString('base64')}`;
    
    // User-Agent header je povinný podle dokumentace
    const userAgent = 'Scrum Board (server-proxy)';
    
    // Připravit body pro Freelo API
    const freeloRequestBody = JSON.stringify(requestBody);
    
    console.log('[Freelo Proxy] Calling Freelo API:', {
      url,
      method,
      body: requestBody
    });
    
    // Volání Freelo API na serveru (bez CORS problému)
    // Použít axios místo fetch (vyřeší problém s srvx)
    console.log('[Freelo Proxy] Making request to Freelo API:', {
      url,
      method: 'POST',
      headers: {
        'User-Agent': `${userAgent} (${email})`,
        'Authorization': 'Basic ***',
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });
    
    try {
      const response = await axios.post(url, requestBody, {
        headers: {
          'User-Agent': `${userAgent} (${email})`,
          'Authorization': authHeaderValue,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true, // Nevyhodit chybu pro non-2xx status kódy
      });

      console.log('[Freelo Proxy] Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      // Předat status kód
      event.node.res.statusCode = response.status;
      
      if (response.status >= 400) {
        console.error('[Freelo Proxy] Freelo API error (FULL DETAILS):', {
          status: response.status,
          statusText: response.statusText,
          url,
          method,
          requestBody: requestBody,
          responseData: response.data,
          responseHeaders: response.headers,
        });
        
        return {
          error: response.data?.error || response.data?.message || `Freelo API error: ${response.status} ${response.statusText}`,
          status: response.status,
          details: process.env.NODE_ENV === 'development' ? {
            ...response.data,
            headers: response.headers,
          } : undefined,
        };
      }

      console.log('[Freelo Proxy] Success! Response:', response.data);
      return response.data;
    } catch (axiosError: any) {
      console.error('[Freelo Proxy] Axios error:', {
        message: axiosError.message,
        code: axiosError.code,
        response: axiosError.response ? {
          status: axiosError.response.status,
          data: axiosError.response.data,
        } : undefined,
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
    event.node.res.statusCode = 500;
    return {
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }
});

