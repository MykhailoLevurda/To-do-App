import { defineEventHandler, readBody } from 'h3';

/**
 * Testovací endpoint pro POST requesty
 * POST /api/freelo/test-post
 */
export default defineEventHandler(async (event) => {
  console.log('[Freelo Proxy] ===== TEST POST ENDPOINT CALLED =====');
  console.log('[Freelo Proxy] Event URL:', event.node.req.url);
  console.log('[Freelo Proxy] Event method:', event.node.req.method);
  
  try {
    const body = await readBody(event);
    console.log('[Freelo Proxy] Test POST body:', body);
    
    return {
      success: true,
      message: 'Test POST endpoint works!',
      receivedBody: body
    };
  } catch (error: any) {
    console.error('[Freelo Proxy] Test POST error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});


