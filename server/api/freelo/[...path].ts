import { defineEventHandler, getQuery, readBody, readRawBody, getMethod } from 'h3';
import axios from 'axios';

const FREELO_API_BASE = 'https://api2.freelo.io/v1';

/**
 * Proxy endpoint pro Freelo API
 * Řeší CORS problém - volá Freelo API na serveru, kde není CORS omezení
 */
export default defineEventHandler(async (event) => {
  // Logovat všechny requesty hned na začátku
  // DŮLEŽITÉ: getMethod může vrátit GET i pro POST requesty kvůli chybě při čtení body
  // Proto zkontrolujeme i event.node.req.method
  const methodFromGetMethod = getMethod(event);
  const methodFromReq = event.node.req.method || methodFromGetMethod;
  const method = methodFromReq; // Použít metodu z requestu, ne z getMethod (může být chybná)
  const path = event.context.params?.path || '';
  
  // Zkontrolovat, jestli se request vůbec dostane na server
  console.log('[Freelo Proxy] ===== INCOMING REQUEST (CATCH-ALL) =====');
  console.log('[Freelo Proxy] Method (getMethod):', methodFromGetMethod);
  console.log('[Freelo Proxy] Method (req.method):', methodFromReq);
  console.log('[Freelo Proxy] Method (using):', method);
  console.log('[Freelo Proxy] Path:', path);
  console.log('[Freelo Proxy] URL:', event.node.req.url);
  console.log('[Freelo Proxy] Event path:', event.path);
  console.log('[Freelo Proxy] Event context params:', event.context.params);
  console.log('[Freelo Proxy] Request headers:', {
    'content-type': event.node.req.headers['content-type'],
    'content-length': event.node.req.headers['content-length'],
    'x-freelo-email': event.node.req.headers['x-freelo-email'] ? '***' : undefined,
    'x-freelo-api-key': event.node.req.headers['x-freelo-api-key'] ? '***' : undefined,
  });

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
      hasBody: method !== 'GET' && method !== 'HEAD',
      // Zkontrolovat, jestli body už není v event (když ho $fetch předá)
      hasBodyInEvent: !!(event as any).body || !!(event as any).node?.req?.body
    });
    
    // Získání credentials z headers nebo body
    let email: string | undefined;
    let apiKey: string | undefined;
    
    // Debug: logovat všechny dostupné headers
    console.log('[Freelo Proxy] All request headers:', Object.keys(event.node.req.headers));
    console.log('[Freelo Proxy] Looking for credentials in headers...');
    
    // Nejdřív zkusit custom headers (nejspolehlivější)
    email = event.node.req.headers['x-freelo-email'] as string;
    apiKey = event.node.req.headers['x-freelo-api-key'] as string;
    
    // Odstranit mezery na začátku a konci (trim)
    if (email) email = email.trim();
    if (apiKey) apiKey = apiKey.trim();
    
    console.log('[Freelo Proxy] Custom headers:', {
      'x-freelo-email': email ? `${email.substring(0, 3)}***` : 'NOT FOUND',
      'x-freelo-api-key': apiKey ? '***' : 'NOT FOUND',
      'email-length': email?.length || 0,
      'apiKey-length': apiKey?.length || 0
    });
    
    // Pak zkusit Authorization header (Basic Auth)
    if (!email || !apiKey) {
      const authHeader = event.node.req.headers.authorization;
      console.log('[Freelo Proxy] Authorization header:', authHeader ? 'PRESENT (Basic ***)' : 'NOT FOUND');
      
      if (authHeader && authHeader.startsWith('Basic ')) {
        const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString('utf-8');
        [email, apiKey] = credentials.split(':');
        // Trim také pro credentials z Basic Auth
        if (email) email = email.trim();
        if (apiKey) apiKey = apiKey.trim();
        console.log('[Freelo Proxy] Extracted from Basic Auth:', {
          email: email ? `${email.substring(0, 3)}***` : 'NOT FOUND',
          apiKey: apiKey ? '***' : 'NOT FOUND',
          'email-length': email?.length || 0,
          'apiKey-length': apiKey?.length || 0
        });
      }
    }
    
    // Načíst body pouze jednou (pro POST/PUT/PATCH requesty)
    // Problém: readBody/readRawBody selhávají kvůli chybě "globalThis.process.getBuiltinModule is not a function"
    // Řešení: použít přímo stream z requestu jako fallback
    let requestBody: any = undefined;
    
    if (method !== 'GET' && method !== 'HEAD') {
      console.log('[Freelo Proxy] ===== READING BODY =====');
      console.log('[Freelo Proxy] Method:', method);
      console.log('[Freelo Proxy] Content-Type:', event.node.req.headers['content-type']);
      console.log('[Freelo Proxy] Content-Length:', event.node.req.headers['content-length']);
      console.log('[Freelo Proxy] Request readable:', event.node.req.readable);
      console.log('[Freelo Proxy] Request readableEnded:', event.node.req.readableEnded);
      
      // Zkusit nejdřív readBody (pro $fetch requesty už může být body zpracované)
      let bodyReadSuccessfully = false;
      
      try {
        console.log('[Freelo Proxy] Attempting readBody first (for $fetch compatibility)...');
        requestBody = await readBody(event);
        console.log('[Freelo Proxy] ✅ Successfully read body from readBody');
        console.log('[Freelo Proxy] readBody result type:', typeof requestBody);
        console.log('[Freelo Proxy] readBody result keys:', requestBody && typeof requestBody === 'object' ? Object.keys(requestBody) : 'N/A');
        bodyReadSuccessfully = true;
      } catch (readBodyError: any) {
        console.warn('[Freelo Proxy] ⚠️ readBody failed:', readBodyError.message);
        console.warn('[Freelo Proxy] readBody error type:', readBodyError.name);
        
        // Pokud readBody selže kvůli srvx chybě, zkusit readRawBody
        try {
          console.log('[Freelo Proxy] Attempting readRawBody...');
          const rawBody = await readRawBody(event, 'utf8');
          console.log('[Freelo Proxy] readRawBody completed, length:', rawBody?.length || 0);
          
          if (rawBody && rawBody.trim()) {
            console.log('[Freelo Proxy] Raw body preview:', rawBody.substring(0, 200));
            try {
              requestBody = JSON.parse(rawBody);
              console.log('[Freelo Proxy] ✅ Successfully read and parsed body from readRawBody');
              console.log('[Freelo Proxy] Parsed body keys:', Object.keys(requestBody || {}));
              bodyReadSuccessfully = true;
            } catch (parseError: any) {
              console.error('[Freelo Proxy] ❌ Failed to parse body as JSON:', parseError.message);
              event.node.res.statusCode = 400;
              return {
                error: 'Invalid JSON in request body',
                details: process.env.NODE_ENV === 'development' ? {
                  parseError: parseError.message,
                  bodyPreview: rawBody.substring(0, 200)
                } : undefined
              };
            }
          } else {
            console.warn('[Freelo Proxy] ⚠️ Empty body received from readRawBody');
            requestBody = {};
            bodyReadSuccessfully = true; // Empty body is OK
          }
        } catch (readRawBodyError: any) {
          console.warn('[Freelo Proxy] ⚠️ readRawBody also failed:', readRawBodyError.message);
          
          // Pokud obě metody selžou kvůli srvx chybě, zkusit načíst body přímo ze streamu
          // Toto je workaround pro chybu "globalThis.process.getBuiltinModule is not a function"
          try {
            console.log('[Freelo Proxy] Attempting to read body directly from stream (workaround for srvx error)...');
            
            // Načíst body přímo ze streamu
            const chunks: Buffer[] = [];
            const req = event.node.req;
            
            // Zkontrolovat, jestli stream ještě není spotřebovaný
            if (req.readableEnded) {
              console.error('[Freelo Proxy] ❌ Request stream already ended, cannot read body');
              throw new Error('Request stream already consumed');
            }
            
            // Načíst všechny chunky
            for await (const chunk of req) {
              chunks.push(Buffer.from(chunk));
            }
            
            if (chunks.length > 0) {
              const bodyBuffer = Buffer.concat(chunks);
              const bodyString = bodyBuffer.toString('utf-8');
              
              if (bodyString && bodyString.trim()) {
                console.log('[Freelo Proxy] Stream body length:', bodyString.length);
                console.log('[Freelo Proxy] Stream body preview:', bodyString.substring(0, 200));
                
                try {
                  requestBody = JSON.parse(bodyString);
                  console.log('[Freelo Proxy] ✅ Successfully read and parsed body from stream');
                  console.log('[Freelo Proxy] Parsed body keys:', Object.keys(requestBody || {}));
                  bodyReadSuccessfully = true;
                } catch (parseError: any) {
                  console.error('[Freelo Proxy] ❌ Failed to parse stream body as JSON:', parseError.message);
                  event.node.res.statusCode = 400;
                  return {
                    error: 'Invalid JSON in request body',
                    details: process.env.NODE_ENV === 'development' ? {
                      parseError: parseError.message,
                      bodyPreview: bodyString.substring(0, 200)
                    } : undefined
                  };
                }
              } else {
                console.warn('[Freelo Proxy] ⚠️ Empty body from stream');
                requestBody = {};
                bodyReadSuccessfully = true; // Empty body is OK
              }
            } else {
              console.warn('[Freelo Proxy] ⚠️ No chunks in stream');
              requestBody = {};
              bodyReadSuccessfully = true; // Empty body is OK
            }
          } catch (streamError: any) {
            console.error('[Freelo Proxy] ❌ All methods failed to read body!');
            console.error('[Freelo Proxy] Stream error:', streamError.message);
            
            // Pokud všechny metody selžou, vrátit chybu
            event.node.res.statusCode = 500;
            return {
              error: 'Failed to read request body. This is a known Nuxt dev server issue with srvx adapter.',
              details: process.env.NODE_ENV === 'development' ? {
                readBodyError: readBodyError.message,
                readRawBodyError: readRawBodyError.message,
                streamError: streamError.message,
                suggestion: 'This is a known issue with Nuxt dev server. Try: 1) Restart dev server, 2) Update Nuxt to latest version, 3) Use production build'
              } : undefined
            };
          }
        }
      }
      
      if (!bodyReadSuccessfully) {
        console.error('[Freelo Proxy] ❌ Body was not read successfully');
        event.node.res.statusCode = 500;
        return {
          error: 'Failed to read request body',
          details: process.env.NODE_ENV === 'development' ? {
            suggestion: 'Check server logs for more details'
          } : undefined
        };
      }
      
      console.log('[Freelo Proxy] Body read successfully:', {
        type: typeof requestBody,
        isObject: typeof requestBody === 'object',
        isArray: Array.isArray(requestBody),
        keys: requestBody && typeof requestBody === 'object' ? Object.keys(requestBody) : [],
        preview: typeof requestBody === 'string' 
          ? requestBody.substring(0, 200) 
          : requestBody !== undefined 
            ? (JSON.stringify(requestBody) || '').substring(0, 200)
            : '(no body)'
      });
      
      // Zkusit získat credentials z body, pokud nejsou v headers
      if (!email || !apiKey) {
        email = requestBody?.email || email;
        apiKey = requestBody?.apiKey || apiKey;
      }
    }
    
    // Validace: ujistit se, že email a apiKey nejsou prázdné po trim
    if (!email || !apiKey || !email.trim() || !apiKey.trim()) {
      console.error('[Freelo Proxy] ❌ Missing or empty credentials!');
      console.error('[Freelo Proxy] Email:', email ? `${email.substring(0, 3)}*** (length: ${email.length})` : 'NOT FOUND');
      console.error('[Freelo Proxy] API Key:', apiKey ? `*** (length: ${apiKey.length})` : 'NOT FOUND');
      console.error('[Freelo Proxy] All headers keys:', Object.keys(event.node.req.headers));
      console.error('[Freelo Proxy] Authorization header:', event.node.req.headers.authorization ? 'PRESENT' : 'NOT FOUND');
      event.node.res.statusCode = 401;
      return {
        error: 'Missing or empty credentials. Please provide email and API key.',
      };
    }
    
    // Ujistit se, že jsou credentials otrimované
    email = email.trim();
    apiKey = apiKey.trim();
    
    console.log('[Freelo Proxy] ✅ Credentials found:', {
      email: `${email.substring(0, 3)}***`,
      emailLength: email.length,
      apiKeyLength: apiKey.length
    });

    // Sestavení URL s query parametry
    const queryString = new URLSearchParams(query as Record<string, string>).toString();
    const url = `${FREELO_API_BASE}/${path}${queryString ? `?${queryString}` : ''}`;
    
    // Vytvoření Basic Auth headeru
    // Ujistit se, že email a apiKey nemají mezery
    const cleanEmail = email.trim();
    const cleanApiKey = apiKey.trim();
    const credentialsString = `${cleanEmail}:${cleanApiKey}`;
    const authHeaderValue = `Basic ${Buffer.from(credentialsString).toString('base64')}`;
    
    // Debug: logovat informace o credentials (bez zobrazení citlivých dat)
    console.log('[Freelo Proxy] Preparing Freelo API request:', {
      email: `${cleanEmail.substring(0, 3)}***`,
      emailLength: cleanEmail.length,
      apiKeyLength: cleanApiKey.length,
      credentialsStringLength: credentialsString.length,
      authHeaderLength: authHeaderValue.length,
      url: `${FREELO_API_BASE}/${path}${queryString ? `?${queryString}` : ''}`,
      // Debug: zkontrolovat, jestli credentials neobsahují neobvyklé znaky
      emailHasSpaces: cleanEmail.includes(' '),
      apiKeyHasSpaces: cleanApiKey.includes(' '),
      emailHasNewlines: cleanEmail.includes('\n') || cleanEmail.includes('\r'),
      apiKeyHasNewlines: cleanApiKey.includes('\n') || cleanApiKey.includes('\r')
    });
    
    // User-Agent header je povinný podle dokumentace
    const userAgent = 'Scrum Board (server-proxy)';
    
    // Připravit body pro Freelo API (objekt bez credentials)
    let freeloRequestBody: any = undefined;
    
    if (requestBody) {
      // Odstranit credentials z body před odesláním do Freelo API
      if (typeof requestBody === 'object' && (requestBody.email || requestBody.apiKey)) {
        const { email: _, apiKey: __, ...rest } = requestBody;
        freeloRequestBody = rest;
      } else {
        freeloRequestBody = requestBody;
      }
    }
    
    // Speciální handling pro update task
    // Podle Freelo API dokumentace: POST /task/{task_id} s body bez wrapperu "task"
    const isUpdateTask = method === 'POST' && path.match(/^task\/\d+$/);
    
    // Pro update task: pokud body má wrapper "task", odstranit ho
    // (pro kompatibilitu, ale správný formát je bez wrapperu)
    if (isUpdateTask && freeloRequestBody && typeof freeloRequestBody === 'object' && freeloRequestBody.task) {
      console.log('[Freelo Proxy] Update task: removing "task" wrapper from body');
      freeloRequestBody = freeloRequestBody.task;
    }
    
    // Debug logging (pouze v development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Freelo Proxy] Request:', {
        method,
        url,
        path,
        isUpdateTask,
        hasBody: !!freeloRequestBody,
        bodyPreview: freeloRequestBody ? (JSON.stringify(freeloRequestBody) || '').substring(0, 200) : undefined,
        bodyKeys: freeloRequestBody && typeof freeloRequestBody === 'object' ? Object.keys(freeloRequestBody) : [],
      });
    }
    
    // Volání Freelo API na serveru (bez CORS problému)
    // Použít axios místo fetch (vyřeší problém s srvx)
    try {
      const axiosConfig: any = {
        method: method as any,
        url,
        headers: {
          'User-Agent': `${userAgent} (${cleanEmail})`,
          'Authorization': authHeaderValue,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true, // Nevyhodit chybu pro non-2xx status kódy
      };
      
      // Debug: logovat, co se posílá na Freelo API (bez citlivých dat)
      console.log('[Freelo Proxy] Sending request to Freelo API:', {
        method,
        url,
        headers: {
          'User-Agent': `${userAgent} (${cleanEmail.substring(0, 3)}***)`,
          'Authorization': 'Basic ***',
          'Content-Type': 'application/json',
        },
        hasBody: !!freeloRequestBody
      });
      
      if (freeloRequestBody) {
        axiosConfig.data = freeloRequestBody;
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
          isUpdateTask,
          requestBody: process.env.NODE_ENV === 'development' ? freeloRequestBody : undefined,
          responseData: response.data,
          // Debug: zkontrolovat, jestli credentials nejsou prázdné nebo neplatné
          credentialsInfo: {
            emailLength: cleanEmail.length,
            apiKeyLength: cleanApiKey.length,
            emailPreview: `${cleanEmail.substring(0, 3)}***`,
            // Zkontrolovat, jestli credentials neobsahují neobvyklé znaky
            emailHasSpecialChars: /[^\w@.-]/.test(cleanEmail),
            apiKeyHasSpecialChars: /[^\w-]/.test(cleanApiKey)
          }
        });
        
        return {
          error: response.data?.error || response.data?.message || `Freelo API error: ${response.status} ${response.statusText}`,
          status: response.status,
          details: process.env.NODE_ENV === 'development' ? { 
            ...response.data, 
            requestBody: freeloRequestBody,
            url,
            method,
            isUpdateTask
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
    console.error('[Freelo Proxy] ===== UNHANDLED ERROR =====');
    console.error('[Freelo Proxy] Error:', error);
    console.error('[Freelo Proxy] Error type:', typeof error);
    console.error('[Freelo Proxy] Error name:', error.name);
    console.error('[Freelo Proxy] Error message:', error.message);
    console.error('[Freelo Proxy] Error stack:', error.stack);
    console.error('[Freelo Proxy] Error details:', {
      method: getMethod(event),
      path: event.context.params?.path || '',
      url: event.node.req.url,
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack ? error.stack.substring(0, 1000) : undefined,
      errorCause: error.cause,
    });
    
    // Ujistit se, že status code je nastaven
    if (!event.node.res.headersSent) {
      event.node.res.statusCode = 500;
      event.node.res.setHeader('Content-Type', 'application/json');
    }
    
    return {
      error: error.message || 'Internal server error',
      status: 500,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        name: error.name,
        stack: error.stack ? error.stack.substring(0, 1000) : undefined,
        path: event.context.params?.path || '',
        method: getMethod(event),
      } : undefined,
    };
  }
});

