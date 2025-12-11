# Redis(KV)와 트래픽 제어 완벽 가이드

## 📚 목차
1. [Redis(KV)란 무엇인가?](#1-rediskv란-무엇인가)
2. [현재 프로젝트에서 Redis의 역할](#2-현재-프로젝트에서-redis의-역할)
3. [트래픽 제어 원리](#3-트래픽-제어-원리)
4. [트래픽 초과 시 사이트 차단 방법](#4-트래픽-초과-시-사이트-차단-방법)
5. [실제 동작 흐름](#5-실제-동작-흐름)
6. [설정 및 관리 방법](#6-설정-및-관리-방법)

---

## 1. Redis(KV)란 무엇인가?

### 🎯 간단한 비유
**Redis는 초고속 메모리 저장소**입니다. 

- **일반 데이터베이스**: 하드디스크에 저장 → 느림 (예: 책장에서 책 찾기)
- **Redis**: 메모리에 저장 → 매우 빠름 (예: 책상 위에서 바로 가져오기)

### 📝 기술적 설명
- **KV = Key-Value**: 키(이름)와 값(데이터)을 쌍으로 저장하는 방식
- **예시**: 
  - 키: `"daily:2025-01-15"` → 값: `"538"` (오늘 방문자 수)
  - 키: `"session:abc123"` → 값: `"1705123456789"` (마지막 활동 시간)

### 🚀 왜 사용하나요?
1. **매우 빠름**: 메모리에 저장되어 읽기/쓰기가 초고속
2. **실시간 데이터**: 현재 접속자 수, 일일 방문자 수 등을 실시간으로 추적
3. **서버리스 친화적**: Vercel 같은 서버리스 환경에서 여러 서버가 같은 데이터를 공유

---

## 2. 현재 프로젝트에서 Redis의 역할

현재 프로젝트에서 Redis는 **접속 제어 시스템**의 핵심입니다.

### 📊 저장하는 데이터

#### 1️⃣ 일일 방문자 수
```
키: "daily:2025-01-15"
값: 538
```
- **용도**: 오늘 몇 명이 방문했는지 카운트
- **사용 위치**: `/api/enter` - 일일 1000명 제한 체크

#### 2️⃣ 현재 접속 중인 세션 목록
```
키: "online_sessions"
값: ["session1", "session2", "session3", ...]
```
- **용도**: 지금 사이트를 사용 중인 사람들의 세션 ID 목록
- **사용 위치**: `/api/enter` - 동시 접속 100명 제한 체크

#### 3️⃣ 각 세션의 마지막 활동 시간
```
키: "session:abc123"
값: 1705123456789 (타임스탬프)
```
- **용도**: 각 사용자가 마지막으로 활동한 시간 기록
- **사용 위치**: `/api/heartbeat` - 30초마다 업데이트
- **자동 정리**: 5분 이상 활동 없으면 접속 목록에서 제거

---

## 3. 트래픽 제어 원리

### 🎬 전체 흐름도

```
사용자가 사이트 접속
    ↓
/api/enter 호출 (접속 요청)
    ↓
┌─────────────────────────────────────┐
│ Redis에서 데이터 확인                │
│ 1. 일일 방문자 수 확인               │
│ 2. 현재 접속자 수 확인               │
│ 3. 1일 1회 제한 확인 (쿠키)          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 제한 체크                            │
│ ✅ 통과 → 접속 허용                  │
│ ❌ 초과 → 접속 거부                  │
└─────────────────────────────────────┘
    ↓
접속 허용 시:
- Redis에 세션 추가
- 일일 카운트 증가
- 쿠키 발급
```

### 📋 3가지 제한 시스템

#### 1️⃣ 일일 총 접속량 제한 (1000명)
```typescript
// src/app/api/enter/route.ts
const DAILY_LIMIT = 1000;

// Redis에서 오늘 방문자 수 가져오기
total = await getDailyCount(today);

// 1000명 초과 시 차단
if (total > DAILY_LIMIT) {
  return { allowed: false, reason: 'DAILY_LIMIT' };
}
```

**동작 방식:**
- 오늘 처음 방문한 사람만 카운트
- 쿠키(`visited_date`)로 중복 방문 제외
- 1000명 도달 시 → 새 방문자 차단

#### 2️⃣ 동시 접속량 제한 (100명)
```typescript
// src/app/api/enter/route.ts
const CONCURRENT_LIMIT = 100;

// Redis에서 현재 접속 중인 사람 수 가져오기
concurrentUsers = await getConcurrentUsers();

// 100명 초과 시 차단
if (concurrentUsers >= CONCURRENT_LIMIT) {
  return { allowed: false, reason: 'CONCURRENCY_LIMIT' };
}
```

**동작 방식:**
- `/api/heartbeat`를 30초마다 호출하면 "접속 중"으로 간주
- 5분 이상 활동 없으면 자동으로 접속 목록에서 제거
- 100명 도달 시 → 새 접속 차단

#### 3️⃣ 1일 1회 제한 (쿠키 기반)
```typescript
// 쿠키로 오늘 이미 사용했는지 확인
const usedToday = cookieStore.get('used_today')?.value;
if (usedToday === today) {
  return { allowed: false, reason: 'ONCE_PER_DAY' };
}
```

**동작 방식:**
- 같은 브라우저에서 하루에 한 번만 사용 가능
- 쿠키 삭제 시 해제 (보안이 약함)

---

## 4. 트래픽 초과 시 사이트 차단 방법

### 🚫 현재 구현된 차단 방식

#### 방법 1: `/api/enter`에서 차단 (현재 사용 중)
```typescript
// src/app/api/enter/route.ts
if (total > DAILY_LIMIT) {
  return NextResponse.json({
    allowed: false,
    reason: 'DAILY_LIMIT',
    message: '오늘 이용 인원이 모두 찼습니다. 내일 다시 이용해 주세요.'
  });
}
```

**차단 위치:**
- 랜딩 페이지에서 "시작하기" 버튼 클릭 시
- `/api/enter` API가 `allowed: false` 반환
- 프론트엔드에서 차단 메시지 표시

#### 방법 2: 프론트엔드에서 버튼 비활성화
```typescript
// src/components/LandingPage.tsx
disabled={conversationCount !== null && conversationCount + 1 >= 1000}
```

**차단 위치:**
- 페이지 로드 시 일일 대화 수 확인
- 1000명 도달 시 버튼 자동 비활성화

### 🔧 더 강력한 차단 방법 (추가 구현 가능)

#### 방법 3: 미들웨어에서 전체 사이트 차단
```typescript
// src/middleware.ts (새로 생성)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Redis에서 일일 접속 수 확인
  const today = new Date().toISOString().slice(0, 10);
  const total = await getDailyCount(today);
  
  if (total >= 1000) {
    // 차단 페이지로 리다이렉트
    return NextResponse.redirect(new URL('/blocked', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

**장점:**
- 모든 페이지 접근 차단
- API 호출 전에 차단 (더 효율적)

#### 방법 4: 차단 전용 페이지 생성
```typescript
// src/app/blocked/page.tsx
export default function BlockedPage() {
  return (
    <div>
      <h1>접속이 제한되었습니다</h1>
      <p>오늘 이용 인원이 모두 찼습니다. 내일 다시 이용해 주세요.</p>
    </div>
  );
}
```

---

## 5. 실제 동작 흐름

### 📱 사용자 시나리오

#### 시나리오 1: 정상 접속 (538번째 방문자)
```
1. 사용자가 https://coex-rag-proto-v2.vercel.app 접속
2. 랜딩 페이지 로드
3. "시작하기" 버튼 클릭
4. /api/enter 호출
   ├─ Redis 확인: 일일 방문자 = 537
   ├─ Redis 확인: 현재 접속자 = 45
   ├─ 쿠키 확인: 오늘 사용 안 함
   └─ ✅ 모든 조건 통과
5. Redis 업데이트:
   ├─ daily:2025-01-15 → 538 (증가)
   └─ online_sessions에 세션 추가
6. 쿠키 발급 (session_id, visited_date, used_today)
7. 메인 페이지로 이동 ✅
```

#### 시나리오 2: 일일 제한 초과 (1001번째 방문자)
```
1. 사용자가 사이트 접속
2. 랜딩 페이지 로드
3. "시작하기" 버튼 클릭
4. /api/enter 호출
   ├─ Redis 확인: 일일 방문자 = 1000
   └─ ❌ DAILY_LIMIT 초과!
5. 응답: { allowed: false, reason: 'DAILY_LIMIT' }
6. 프론트엔드에서 차단 메시지 표시
7. 메인 페이지로 이동 불가 ❌
```

#### 시나리오 3: 동시 접속 제한 초과 (101번째 동시 접속자)
```
1. 사용자가 사이트 접속
2. 랜딩 페이지 로드
3. "시작하기" 버튼 클릭
4. /api/enter 호출
   ├─ Redis 확인: 현재 접속자 = 100
   └─ ❌ CONCURRENCY_LIMIT 초과!
5. 응답: { allowed: false, reason: 'CONCURRENCY_LIMIT' }
6. 프론트엔드에서 "현재 접속이 많습니다" 메시지 표시
7. 메인 페이지로 이동 불가 ❌
```

### ⏰ Heartbeat 시스템 (접속 유지)

```
사용자가 메인 페이지에 있는 동안:
1. 30초마다 /api/heartbeat 자동 호출
2. Redis 업데이트:
   ├─ session:abc123 → 현재 시간 (타임스탬프)
   └─ online_sessions에 세션 유지
3. 5분 이상 heartbeat 없으면:
   └─ 자동으로 online_sessions에서 제거 (접속 종료로 간주)
```

---

## 6. 설정 및 관리 방법

### 🔧 제한 값 변경하기

#### 1. 일일 접속 제한 변경
```typescript
// src/app/api/enter/route.ts
const DAILY_LIMIT = 1000; // ← 이 값을 변경
```

#### 2. 동시 접속 제한 변경
```typescript
// src/app/api/enter/route.ts
const CONCURRENT_LIMIT = 100; // ← 이 값을 변경
```

#### 3. Heartbeat 주기 변경
```typescript
// 프론트엔드에서 heartbeat 호출 주기 변경
// (현재는 30초마다 호출)
```

### 📊 현재 상태 확인하기

#### Vercel 대시보드에서 확인
1. Vercel 대시보드 → 프로젝트 선택
2. **Storage** 탭 → Redis 데이터베이스 클릭
3. 데이터 확인:
   - `daily:2025-01-15` → 오늘 방문자 수
   - `online_sessions` → 현재 접속 중인 세션 목록

#### API로 확인
```bash
# 일일 대화 수 확인
curl https://coex-rag-proto-v2.vercel.app/api/daily-conversation-count

# Health check (Redis 연결 상태 포함)
curl https://coex-rag-proto-v2.vercel.app/api/health
```

### 🛠️ Redis 데이터 수동 관리

#### 특정 날짜의 방문자 수 초기화
```typescript
// 임시 API 엔드포인트 생성
// src/app/api/admin/reset-daily-count/route.ts
export async function POST(request: NextRequest) {
  const { date } = await request.json();
  const client = await getRedisClient();
  await client.del(`daily:${date}`);
  return NextResponse.json({ success: true });
}
```

#### 모든 접속 세션 초기화
```typescript
// src/app/api/admin/clear-sessions/route.ts
export async function POST() {
  const client = await getRedisClient();
  await client.del('online_sessions');
  return NextResponse.json({ success: true });
}
```

---

## 💡 요약

### Redis의 역할
- ✅ **일일 방문자 수 추적**: 오늘 몇 명이 방문했는지 카운트
- ✅ **현재 접속자 수 추적**: 지금 몇 명이 사용 중인지 실시간 확인
- ✅ **세션 관리**: 각 사용자의 활동 시간 추적
- ✅ **접속 제어**: 제한 초과 시 새 접속 차단

### 트래픽 제어 방법
1. **일일 제한**: 1000명 초과 시 차단
2. **동시 접속 제한**: 100명 초과 시 차단
3. **1일 1회 제한**: 같은 사용자는 하루에 한 번만 사용

### 차단 위치
- `/api/enter`에서 차단 (현재 구현)
- 프론트엔드 버튼 비활성화 (현재 구현)
- 미들웨어에서 전체 사이트 차단 (추가 구현 가능)

---

## 🚨 주의사항

1. **Redis 연결 실패 시**: 현재는 기본적으로 접속을 허용하도록 설정되어 있습니다 (서비스 중단 방지)
2. **쿠키 기반 제한**: 보안이 약하므로, IP 기반 제한을 추가하는 것을 권장합니다
3. **Heartbeat 주기**: 너무 자주 호출하면 API 비용이 증가할 수 있습니다

---

이 가이드가 도움이 되셨나요? 추가 질문이 있으시면 언제든지 물어보세요! 🎉





