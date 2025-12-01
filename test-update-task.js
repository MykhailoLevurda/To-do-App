/**
 * Test script pro testování update task
 * Spusťte tento script v konzoli prohlížeče na stránce s aplikací
 * 
 * Použití:
 * 1. Otevřete konzoli prohlížeče (F12)
 * 2. Zkopírujte a vložte tento script
 * 3. Upravte taskId, email, apiKey a updates podle potřeby
 * 4. Spusťte: testUpdateTask()
 */

async function testUpdateTask() {
  const taskId = 337272; // Změňte na ID vašeho úkolu
  const email = 'vas@email.com'; // Změňte na váš email
  const apiKey = 'vas-api-klic'; // Změňte na váš API klíč
  
  const updates = {
    name: 'Test Update ' + new Date().toISOString(),
    due_date: '2025-12-16T00:00:00.000Z',
    priority_enum: 'm'
  };
  
  console.log('🧪 Testing update task...');
  console.log('Task ID:', taskId);
  console.log('Updates:', updates);
  
  try {
    // Test 1: Přes test endpoint
    console.log('\n📝 Test 1: Přes test endpoint /api/freelo/test-update-task');
    const testResponse = await fetch('/api/freelo/test-update-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        updates,
        email,
        apiKey
      })
    });
    
    const testResult = await testResponse.json();
    console.log('Test endpoint response:', testResult);
    
    if (testResult.success) {
      console.log('✅ Test endpoint úspěšný! Formát:', testResult.format);
    } else {
      console.error('❌ Test endpoint selhal:', testResult);
    }
    
    // Test 2: Přes normální proxy
    console.log('\n📝 Test 2: Přes normální proxy /api/freelo/task/{id}');
    
    const credentialsString = `${email}:${apiKey}`;
    const authHeader = `Basic ${btoa(credentialsString)}`;
    
    const proxyResponse = await fetch(`/api/freelo/task/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Freelo-Email': email,
        'X-Freelo-Api-Key': apiKey,
      },
      body: JSON.stringify({
        task: updates
      })
    });
    
    const proxyResult = await proxyResponse.json();
    console.log('Proxy response status:', proxyResponse.status);
    console.log('Proxy response:', proxyResult);
    
    if (proxyResponse.ok) {
      console.log('✅ Proxy úspěšný!');
    } else {
      console.error('❌ Proxy selhal:', proxyResult);
    }
    
    return {
      testEndpoint: testResult,
      proxy: {
        status: proxyResponse.status,
        result: proxyResult
      }
    };
  } catch (error) {
    console.error('❌ Chyba při testování:', error);
    return { error: error.message };
  }
}

// Spustit test
// testUpdateTask();

