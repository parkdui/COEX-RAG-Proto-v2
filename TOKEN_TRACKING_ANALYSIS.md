# 토큰 사용량 추적 현황 분석

## 📊 각 API 엔드포인트별 토큰 추적 현황

### ✅ 토큰 추적 및 저장 중인 API

#### 1. `/api/chat` (메인 채팅 API)
- **토큰 추적**: ✅ 완전 구현
- **추적 항목**:
  - `TOKENS.embed_input`: Embedding API input tokens
  - `TOKENS.embed_calls`: Embedding API 호출 횟수
  - `TOKENS.chat_input`: Chat API input tokens
  - `TOKENS.chat_output`: Chat API output tokens
  - `TOKENS.chat_total`: Chat API total tokens
  - `TOKENS.chat_calls`: Chat API 호출 횟수
  - `TOKENS.classification_input`: Classification input tokens (현재 사용 안 함)
  - `TOKENS.classification_output`: Classification output tokens (현재 사용 안 함)
  - `TOKENS.classification_total`: Classification total tokens (현재 사용 안 함)
  - `TOKENS.tts_rewrite_input`: TTS rewrite input tokens
  - `TOKENS.tts_rewrite_output`: TTS rewrite output tokens
  - `TOKENS.tts_rewrite_total`: TTS rewrite total tokens
  - `TOKENS.tts_rewrite_calls`: TTS rewrite 호출 횟수

- **저장 위치**: Google Sheets P 컬럼 (Token 합계)
- **저장 로직**:
  ```typescript
  const currentTokenTotal = 
    TOKENS.classification_total + 
    TOKENS.embed_input + 
    TOKENS.chat_total +
    TOKENS.tts_rewrite_total;
  
  const newTokenTotal = existingTokenTotal + currentTokenTotal;
  await updateTokenTotal(sessionId, newTokenTotal, savedRowIndex);
  ```

#### 2. `/api/tts-rewrite` (TTS 재작성 API)
- **토큰 추적**: ✅ 구현됨
- **추적 항목**:
  - `ttsInput`: promptTokens
  - `ttsOutput`: completionTokens
  - `ttsTotal`: totalTokens

- **저장 위치**: Google Sheets P 컬럼 (Token 합계)
- **저장 로직**:
  ```typescript
  const existingTokenTotal = await getTokenTotal(sessionId, rowIndex);
  const newTokenTotal = existingTokenTotal + ttsTotal;
  await updateTokenTotal(sessionId, newTokenTotal, rowIndex);
  ```

---

### ❌ 토큰 추적이 없는 API

#### 3. `/api/extract-keywords` (키워드 추출 API)
- **토큰 추적**: ❌ 없음
- **API 사용**: CLOVA Chat API (maxTokens: 50)
- **호출 시점**: 대화 종료 후, 정보 요구 질문-답변 쌍마다
- **문제점**: 이 API의 토큰 사용량이 세션 총 토큰에 포함되지 않음

#### 4. `/api/summarize-question` (질문 요약 API)
- **토큰 추적**: ❌ 없음
- **API 사용**: CLOVA Chat API (maxTokens: 50)
- **호출 시점**: 사용자 메시지 입력 후 (10자 초과 시)
- **문제점**: 이 API의 토큰 사용량이 세션 총 토큰에 포함되지 않음

#### 5. `/api/generate-thinking-text` (사고 텍스트 생성 API)
- **토큰 추적**: ✅ 구현됨 (2025-01-XX 추가)
- **API 사용**: CLOVA Chat API (maxTokens: 100)
- **호출 시점**: 사용자 입력 시
- **추적 항목**:
  - `thinkingInput`: promptTokens
  - `thinkingOutput`: completionTokens
  - `thinkingTotal`: totalTokens
- **저장 위치**: Google Sheets P 컬럼 (Token 합계)
- **저장 로직**:
  ```typescript
  const existingTokenTotal = await getTokenTotal(sessionId, rowIndex);
  const newTokenTotal = existingTokenTotal + thinkingTotal;
  await updateTokenTotal(sessionId, newTokenTotal, rowIndex);
  ```

---

## 🔍 세션별 총 토큰 계산 로직

### 현재 구현 상태

#### ✅ 구현된 부분
1. **Google Sheets 저장 구조**:
   - P 컬럼에 "Token 합계" 저장
   - 각 요청마다 기존 총합에 현재 요청 토큰을 누적

2. **저장되는 토큰**:
   - `/api/chat`에서 사용된 토큰:
     - Embedding tokens
     - Chat tokens
     - Classification tokens (현재 미사용)
     - TTS rewrite tokens (같은 요청 내에서)
   - `/api/tts-rewrite`에서 사용된 토큰:
     - TTS rewrite tokens

#### ❌ 누락된 부분
다음 API들의 토큰은 **세션 총 토큰에 포함되지 않음**:
1. `/api/extract-keywords` - 키워드 추출 (대화 종료 후 호출)
2. `/api/summarize-question` - 질문 요약 (각 질문마다 호출)

### 예상 누락 토큰량 (6턴 기준)
- **질문 요약**: 약 200 tokens × 6 = **1,200 tokens**
- **키워드 추출**: 약 250 tokens × 3쌍 = **750 tokens**
- **총 누락**: 약 **1,950 tokens**

> **업데이트**: `/api/generate-thinking-text`의 토큰 추적이 추가되었습니다 (2025-01-XX).

---

## 📝 개선 제안

### 1. 각 API에 토큰 추적 추가
각 API에서 토큰 사용량을 추출하고 Google Sheets에 저장하도록 수정:

```typescript
// 예시: /api/extract-keywords/route.ts
const json = await res.json();
const usage = json?.result?.usage || json?.usage || {};
const tokens = {
  input: Number(usage.promptTokens ?? 0),
  output: Number(usage.completionTokens ?? 0),
  total: Number(usage.totalTokens ?? usage.promptTokens + usage.completionTokens ?? 0)
};

// Google Sheets에 저장
if (sessionId && rowIndex) {
  const existingTokenTotal = await getTokenTotal(sessionId, rowIndex);
  const newTokenTotal = existingTokenTotal + tokens.total;
  await updateTokenTotal(sessionId, newTokenTotal, rowIndex);
}
```

### 2. 통합 토큰 추적 유틸리티 함수 생성
모든 API에서 공통으로 사용할 수 있는 토큰 추적 함수 생성:

```typescript
// lib/tokenTracking.ts
export async function trackAndSaveTokens(
  sessionId: string,
  rowIndex: number | null,
  tokens: { input: number; output: number; total: number },
  apiName: string
) {
  if (!sessionId || !rowIndex) return;
  
  try {
    const existingTokenTotal = await getTokenTotal(sessionId, rowIndex);
    const newTokenTotal = existingTokenTotal + tokens.total;
    await updateTokenTotal(sessionId, newTokenTotal, rowIndex);
    console.log(`[${apiName}] Token saved: ${tokens.total} tokens (total: ${newTokenTotal})`);
  } catch (error) {
    console.error(`[${apiName}] Failed to save token:`, error);
  }
}
```

### 3. 세션별 총 토큰 조회 API 추가
Google Sheets에서 세션별 총 토큰을 조회할 수 있는 API 엔드포인트 추가:

```typescript
// /api/get-session-tokens/route.ts
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  const rowIndex = request.nextUrl.searchParams.get('rowIndex');
  
  if (!sessionId || !rowIndex) {
    return NextResponse.json({ error: 'sessionId and rowIndex required' }, { status: 400 });
  }
  
  const totalTokens = await getTokenTotal(sessionId, parseInt(rowIndex));
  return NextResponse.json({ sessionId, totalTokens });
}
```

---

## 📊 현재 상태 요약

| API | 토큰 추적 | Google Sheets 저장 | 세션 총합 포함 |
|-----|----------|-------------------|---------------|
| `/api/chat` | ✅ | ✅ | ✅ |
| `/api/tts-rewrite` | ✅ | ✅ | ✅ |
| `/api/generate-thinking-text` | ✅ | ✅ | ✅ |
| `/api/extract-keywords` | ❌ | ❌ | ❌ |
| `/api/summarize-question` | ❌ | ❌ | ❌ |

**결론**: 현재 세션별 총 토큰은 `/api/chat`, `/api/tts-rewrite`, `/api/generate-thinking-text`의 토큰이 포함됩니다. `/api/extract-keywords`와 `/api/summarize-question`의 토큰은 아직 누락되어 있습니다.
