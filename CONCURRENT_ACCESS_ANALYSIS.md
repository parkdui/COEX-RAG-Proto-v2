# 8명 동시 접속 분석 및 개선 방안

## 📊 현재 상황 분석

### ✅ 가능한 부분

#### 1. Google Sheets API 제한
- **프로젝트당**: 분당 300개 요청
- **사용자당**: 분당 60개 요청
- **8명 동시 접속 시**: 
  - 각 사용자당 대화 1회당 약 3번의 API 호출
    - 사용자 메시지 저장 (1회)
    - AI 메시지 저장 (1회)
    - 토큰 업데이트 (1회)
  - **총 24번의 API 호출** → 분당 300개 제한 내 ✅

#### 2. CLOVA API
- 각 요청이 독립적으로 처리됨
- 8명 동시 요청 가능 ✅

### ⚠️ 잠재적 문제점

#### 1. Race Condition (동시성 문제)
**문제 상황:**
```
사용자 A와 B가 동시에 첫 번째 질문을 보냄
→ 둘 다 findOrCreateSessionRow() 실행
→ 둘 다 "기존 row 없음" 확인
→ 둘 다 새로운 row 생성 시도
→ 결과: 데이터 중복 또는 덮어쓰기 가능
```

**현재 코드:**
```typescript
// src/app/api/chat/route.ts - findOrCreateSessionRow()
// 동시성 제어 없음 - 여러 사용자가 동시에 같은 작업 수행 가능
```

#### 2. Google Sheets API Rate Limit
**문제:**
- 8명이 동시에 질문하면 → 24번의 API 호출이 거의 동시에 발생
- Google Sheets API는 초당 요청 수 제한이 있음
- 429 에러 발생 가능

**현재 처리:**
- 에러를 catch만 하고 로깅만 함
- 재시도 로직이 있지만 완벽하지 않음

#### 3. 데이터 일관성
**문제:**
- 사용자 메시지 저장 후 AI 메시지 저장 사이에 시간차
- 이 사이에 다른 요청이 개입하면 row를 찾지 못할 수 있음

**현재 처리:**
- 재시도 로직 (최대 5회, 200ms 간격)
- 하지만 완벽하지 않음

---

## 🔍 실제 테스트 결과 예상

### 시나리오: 8명이 동시에 질문

#### ✅ 성공 가능성: **중간~높음**

**이유:**
1. Google Sheets API 제한 내 (24개 요청 < 300개/분)
2. 각 사용자가 다른 세션 ID를 가짐 (충돌 가능성 낮음)
3. 재시도 로직이 있음

**예상 동작:**
- 대부분의 경우 정상 작동 ✅
- 일부 경우 데이터 저장 실패 가능 (에러 로그만 남고 사용자는 정상 응답 받음)
- CLOVA API 응답은 정상적으로 받을 수 있음 ✅

#### ⚠️ 실패 가능성: **낮음**

**실패 시나리오:**
1. Google Sheets API 429 에러 → 재시도 후 실패 → 로그만 남고 사용자는 정상 응답
2. Race condition → 데이터 중복 저장 (기능에는 영향 없음)
3. Row 찾기 실패 → 재시도 후 실패 → 로그만 남고 사용자는 정상 응답

**중요:** 로그 저장 실패해도 **사용자는 정상적으로 답변을 받을 수 있음** ✅

---

## 🛠️ 개선 방안

### 1. Google Sheets 쓰기 최적화 (권장)

#### 현재 문제:
- 각 메시지마다 개별 API 호출
- 동시 요청 시 rate limit 초과 가능

#### 개선 방안:
```typescript
// 배치 쓰기 사용
// 여러 셀을 한 번에 업데이트
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: LOG_GOOGLE_SHEET_ID,
  requestBody: {
    valueInputOption: "RAW",
    data: [
      {
        range: `${LOG_GOOGLE_SHEET_NAME}!D${rowIndex}`,
        values: [[userMessage]]
      },
      {
        range: `${LOG_GOOGLE_SHEET_NAME}!E${rowIndex}`,
        values: [[aiMessage]]
      }
    ]
  }
});
```

**효과:**
- API 호출 수 감소 (3회 → 1회)
- Rate limit 여유 확보

### 2. 동시성 제어 개선 (권장)

#### 현재 문제:
- 여러 사용자가 동시에 row 생성 시도

#### 개선 방안:
```typescript
// Redis를 사용한 분산 락 (Distributed Lock)
async function findOrCreateSessionRowWithLock(sessionId: string, ...) {
  const lockKey = `lock:session:${sessionId}`;
  
  // 락 획득 시도
  const lockAcquired = await redis.set(lockKey, "1", "EX", 5, "NX");
  
  if (!lockAcquired) {
    // 락 획득 실패 → 잠시 대기 후 재시도
    await new Promise(resolve => setTimeout(resolve, 100));
    return findOrCreateSessionRowWithLock(sessionId, ...);
  }
  
  try {
    // row 찾기 또는 생성
    return await findOrCreateSessionRow(sessionId, ...);
  } finally {
    // 락 해제
    await redis.del(lockKey);
  }
}
```

**효과:**
- Race condition 방지
- 데이터 일관성 보장

### 3. 지수 백오프 재시도 (권장)

#### 현재 문제:
- 고정된 재시도 간격 (200ms)

#### 개선 방안:
```typescript
async function saveWithRetry(fn: () => Promise<void>, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await fn();
      return; // 성공
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      // 지수 백오프: 200ms, 400ms, 800ms, 1600ms
      const delay = 200 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

**효과:**
- Rate limit 초과 시 더 효과적인 재시도
- 서버 부하 감소

### 4. 비동기 큐 사용 (선택사항)

#### 현재 문제:
- 동기적으로 Google Sheets에 저장 → 응답 지연

#### 개선 방안:
```typescript
// 큐에 저장 작업 추가
await messageQueue.add({
  sessionId,
  messageNumber,
  userMessage,
  aiMessage
});

// 별도 워커가 큐에서 처리
// 사용자는 즉시 응답 받음
```

**효과:**
- 사용자 응답 시간 단축
- Google Sheets API 부하 분산

---

## 📈 예상 성능

### 현재 구현 (8명 동시 접속)

| 항목 | 예상 결과 |
|------|----------|
| **CLOVA API 응답** | ✅ 정상 (100%) |
| **Google Sheets 저장** | ⚠️ 대부분 성공 (90-95%) |
| **사용자 경험** | ✅ 정상 (로그 실패해도 답변은 받음) |
| **데이터 일관성** | ⚠️ 일부 중복 가능 (기능 영향 없음) |

### 개선 후 (8명 동시 접속)

| 항목 | 예상 결과 |
|------|----------|
| **CLOVA API 응답** | ✅ 정상 (100%) |
| **Google Sheets 저장** | ✅ 정상 (99%+) |
| **사용자 경험** | ✅ 정상 |
| **데이터 일관성** | ✅ 완벽 |

---

## 🎯 결론

### 현재 상태로도 가능한가?

**✅ 네, 가능합니다!**

**이유:**
1. **사용자 답변**: CLOVA API는 정상 작동 → 사용자는 답변을 받을 수 있음
2. **로그 저장**: 일부 실패해도 기능에는 영향 없음
3. **API 제한**: 8명 동시 접속 시 제한 내

**단, 다음을 고려하세요:**
- 로그 저장 실패는 조용히 발생 (에러 로그만 남음)
- 일부 데이터 중복 가능성 있음
- 8명 이상 동시 접속 시 문제 발생 가능

### 권장 사항

**단기 (즉시 적용 가능):**
1. ✅ 현재 상태로 사용 (8명은 문제 없음)
2. ✅ 모니터링 강화 (에러 로그 확인)

**중기 (개선 권장):**
1. 배치 쓰기 구현
2. 지수 백오프 재시도 추가

**장기 (선택사항):**
1. Redis 분산 락 추가
2. 비동기 큐 도입

---

## 🧪 테스트 방법

### 실제 테스트 스크립트

```javascript
// test-concurrent.js
const BASE_URL = 'https://coex-rag-proto-v2.vercel.app';

async function testUser(userId) {
  console.log(`User ${userId} 시작`);
  
  // 1. Enter API
  const enterRes = await fetch(`${BASE_URL}/api/enter`, { method: 'GET' });
  const enterData = await enterRes.json();
  console.log(`User ${userId} - Enter:`, enterData.allowed);
  
  // 2. Chat API
  const chatRes = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: `테스트 질문 ${userId}`,
      history: []
    })
  });
  const chatData = await chatRes.json();
  console.log(`User ${userId} - Chat:`, chatData.answer ? '성공' : '실패');
  
  return { userId, success: !!chatData.answer };
}

// 8명 동시 테스트
const promises = Array.from({ length: 8 }, (_, i) => testUser(i + 1));
const results = await Promise.all(promises);

console.log('\n=== 결과 ===');
results.forEach(r => {
  console.log(`User ${r.userId}: ${r.success ? '✅' : '❌'}`);
});
```

실행:
```bash
node test-concurrent.js
```

---

## 💡 요약

**8명 동시 접속 시:**
- ✅ **사용자 답변**: 정상 작동 (100%)
- ⚠️ **로그 저장**: 대부분 성공 (90-95%)
- ✅ **기능**: 정상 작동
- ⚠️ **데이터 일관성**: 일부 중복 가능 (기능 영향 없음)

**결론: 현재 상태로도 8명 동시 접속은 가능합니다!** 🎉





