import { defineEventHandler, readBody, getRouterParam } from 'h3';
import { fetch } from 'undici';

const FREELO_API_BASE = 'https://api2.freelo.io/v1';

/**
 * Explicitní endpoint pro odstranění labelu z úkolu
 * POST /api/freelo/task-labels/remove-from-task/:id
 */
export default defineEventHandler(async (event) => {
  try {
    const taskId = getRouterParam(event, 'id');
    const method = 'POST';
    
    console.log('[Freelo Proxy] POST /task-labels/remove-from-task/:id - Task ID:', taskId);
    
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
    const url = `${FREELO_API_BASE}/task-labels/remove-from-task/${taskId}`;
    
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
    // Použít globální fetch (funguje v Node.js prostředí)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': `${userAgent} (${email})`,
        'Authorization': authHeaderValue,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Načíst response data
    let data: any = {};
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    
    try {
      if (isJson) {
        const text = await response.text();
        if (text) {
          data = JSON.parse(text);
        }
      } else {
        const text = await response.text();
        data = { raw: text.substring(0, 500) };
      }
    } catch (parseError: any) {
      console.warn('[Freelo Proxy] Could not parse response:', parseError);
      data = { error: 'Could not parse response' };
    }
    
    // Předat status kód
    event.node.res.statusCode = response.status;
    
    if (!response.ok) {
      console.error('[Freelo Proxy] Freelo API error:', {
        status: response.status,
        statusText: response.statusText,
        url,
        method,
        responseData: data
      });
      
      return {
        error: data.error || data.message || `Freelo API error: ${response.status} ${response.statusText}`,
        status: response.status,
        details: process.env.NODE_ENV === 'development' ? data : undefined,
      };
    }

    return data;
  } catch (error: any) {
    console.error('[Freelo Proxy] Error:', error);
    event.node.res.statusCode = 500;
    return {
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }
});

