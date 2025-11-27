import { defineEventHandler, getQuery, readBody, getMethod } from 'h3';

const FREELO_API_BASE = 'https://api2.freelo.io/v1';

/**
 * Proxy endpoint pro Freelo API
 * Řeší CORS problém - volá Freelo API na serveru, kde není CORS omezení
 */
export default defineEventHandler(async (event) => {
  try {
    const method = getMethod(event);
    const path = event.context.params?.path || '';
    const query = getQuery(event);
    
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
    
    // Nakonec zkusit z body (pro POST requesty)
    if (!email || !apiKey) {
      const body = method !== 'GET' ? await readBody(event).catch(() => ({})) : {};
      email = body.email || email;
      apiKey = body.apiKey || apiKey;
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
    
    // Volání Freelo API na serveru (bez CORS problému)
    const response = await fetch(url, {
      method,
      headers: {
        'User-Agent': `${userAgent} (${email})`,
        'Authorization': authHeaderValue,
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(await readBody(event).catch(() => ({}))) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    
    // Předání status kódu a dat
    event.node.res.statusCode = response.status;
    
    if (!response.ok) {
      return {
        error: data.error || `Freelo API error: ${response.status}`,
        status: response.status,
      };
    }

    return data;
  } catch (error: any) {
    console.error('[Freelo Proxy] Error:', error);
    event.node.res.statusCode = 500;
    return {
      error: error.message || 'Internal server error',
    };
  }
});

