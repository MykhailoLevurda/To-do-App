import { defineEventHandler, readRawBody, getMethod } from 'h3';
import axios from 'axios';

const FREELO_API_BASE = 'https://api2.freelo.io/v1';

/**
 * Testovací endpoint pro update task
 * POST /api/freelo/test-update-task
 * Body: { taskId: 337272, updates: { name: "Test", due_date: "2025-12-16T00:00:00.000Z", priority_enum: "m" } }
 */
export default defineEventHandler(async (event) => {
  console.log('[Test Update Task] ===== TEST UPDATE TASK ENDPOINT CALLED =====');
  console.log('[Test Update Task] Event URL:', event.node.req.url);
  console.log('[Test Update Task] Event method:', event.node.req.method);
  
  const method = getMethod(event);
  console.log('[Test Update Task] Method from getMethod:', method);
  
  try {
    // Načíst body
    let body: any = {};
    
    try {
      const rawBody = await readRawBody(event, 'utf8');
      console.log('[Test Update Task] Raw body received:', rawBody);
      if (rawBody && rawBody.trim()) {
        body = JSON.parse(rawBody);
        console.log('[Test Update Task] Parsed body:', body);
      }
    } catch (readError: any) {
      console.error('[Test Update Task] Error reading body:', readError.message);
      return {
        success: false,
        error: 'Failed to read body: ' + readError.message,
        stack: readError.stack
      };
    }
    
    const { taskId, updates, email, apiKey } = body;
    
    if (!taskId) {
      return {
        success: false,
        error: 'taskId is required'
      };
    }
    
    if (!email || !apiKey) {
      return {
        success: false,
        error: 'email and apiKey are required in body'
      };
    }
    
    // Zkusit oba formáty body pro Freelo API
    const format1 = { task: updates }; // S wrapperem
    const format2 = updates; // Bez wrapperu
    
    console.log('[Test Update Task] Testing format 1 (with wrapper):', JSON.stringify(format1));
    console.log('[Test Update Task] Testing format 2 (without wrapper):', JSON.stringify(format2));
    
    // Test 1: S wrapperem { task: { ... } }
    try {
      console.log('[Test Update Task] ===== TEST 1: With wrapper =====');
      const credentialsString = `${email}:${apiKey}`;
      const authHeaderValue = `Basic ${Buffer.from(credentialsString).toString('base64')}`;
      
      const response1 = await axios({
        method: 'POST',
        url: `${FREELO_API_BASE}/task/${taskId}`,
        headers: {
          'User-Agent': 'Scrum Board Test (test@example.com)',
          'Authorization': authHeaderValue,
          'Content-Type': 'application/json',
        },
        data: format1,
        validateStatus: () => true
      });
      
      console.log('[Test Update Task] Format 1 response status:', response1.status);
      console.log('[Test Update Task] Format 1 response data:', JSON.stringify(response1.data).substring(0, 500));
      
      if (response1.status === 200) {
        return {
          success: true,
          format: 'with wrapper',
          status: response1.status,
          data: response1.data
        };
      }
    } catch (error1: any) {
      console.error('[Test Update Task] Format 1 error:', error1.message);
      console.error('[Test Update Task] Format 1 error response:', error1.response?.data);
    }
    
    // Test 2: Bez wrapperu { ... }
    try {
      console.log('[Test Update Task] ===== TEST 2: Without wrapper =====');
      const credentialsString = `${email}:${apiKey}`;
      const authHeaderValue = `Basic ${Buffer.from(credentialsString).toString('base64')}`;
      
      const response2 = await axios({
        method: 'POST',
        url: `${FREELO_API_BASE}/task/${taskId}`,
        headers: {
          'User-Agent': 'Scrum Board Test (test@example.com)',
          'Authorization': authHeaderValue,
          'Content-Type': 'application/json',
        },
        data: format2,
        validateStatus: () => true
      });
      
      console.log('[Test Update Task] Format 2 response status:', response2.status);
      console.log('[Test Update Task] Format 2 response data:', JSON.stringify(response2.data).substring(0, 500));
      
      if (response2.status === 200) {
        return {
          success: true,
          format: 'without wrapper',
          status: response2.status,
          data: response2.data
        };
      }
      
      return {
        success: false,
        format1Status: response1?.status,
        format1Error: response1?.data,
        format2Status: response2.status,
        format2Error: response2.data,
        message: 'Both formats failed'
      };
    } catch (error2: any) {
      console.error('[Test Update Task] Format 2 error:', error2.message);
      console.error('[Test Update Task] Format 2 error response:', error2.response?.data);
      
      return {
        success: false,
        error: 'Both formats failed',
        format1Error: error1?.message,
        format2Error: error2.message,
        format2Response: error2.response?.data
      };
    }
  } catch (error: any) {
    console.error('[Test Update Task] Unexpected error:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
});

