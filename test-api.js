// 간단한 API 테스트 스크립트
// 사용법: BASE_URL=https://your-app.vercel.app node test-api.js
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testAPI(name, method, endpoint, body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const start = Date.now();
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const duration = Date.now() - start;
    let data;
    try {
      data = await response.json();
    } catch {
      data = { text: await response.text() };
    }
    
    console.log(`\n✅ ${name}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Response:`, JSON.stringify(data).substring(0, 150));
    
    return { success: response.ok, status: response.status, duration, data };
  } catch (error) {
    console.log(`\n❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Next.js 15.5.7 업데이트 후 기능 테스트\n');
  console.log(`테스트 대상: ${BASE_URL}\n`);
  
  // 1. Health Check
  await testAPI('Health Check', 'GET', '/api/health');
  
  // 2. Daily Conversation Count
  await testAPI('Daily Conversation Count', 'GET', '/api/daily-conversation-count');
  
  // 3. Enter API (세션 생성)
  await testAPI('Enter API (세션 생성)', 'POST', '/api/enter');
  
  // 4. Chat API (간단한 질문)
  await testAPI('Chat API (테스트 질문)', 'POST', '/api/chat', {
    question: '안녕하세요',
    history: []
  });
  
  console.log('\n✨ 테스트 완료!');
}

runTests().catch(console.error);

