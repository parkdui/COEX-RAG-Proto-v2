# Vercel KV 설정 가이드

이 가이드는 Vercel KV를 프로젝트에 설정하는 방법을 단계별로 설명합니다.

## 📋 목차
1. [Vercel KV란?](#vercel-kv란)
2. [설정 방법](#설정-방법)
3. [환경 변수 확인](#환경-변수-확인)
4. [로컬 개발 환경 설정](#로컬-개발-환경-설정)
5. [테스트 방법](#테스트-방법)
6. [문제 해결](#문제-해결)

---

## Vercel KV란?

Vercel KV는 Vercel에서 제공하는 Redis 호환 키-값 저장소입니다. 서버리스 환경에서 세션 관리, 캐싱, 접속 제어 등에 사용됩니다.

**주요 특징:**
- Redis와 호환되는 API
- 서버리스 환경에 최적화
- 자동 스케일링
- 무료 플랜 제공 (제한적)

---

## 설정 방법

### 방법 1: Vercel 대시보드에서 설정 (권장)

#### 1단계: Vercel 프로젝트 접속
1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. 설정할 프로젝트 선택

#### 2단계: Storage 추가
1. 프로젝트 페이지에서 **"Storage"** 탭 클릭
   - 또는 프로젝트 설정 → **"Storage"** 메뉴 선택
2. **"Create Database"** 또는 **"Add Storage"** 버튼 클릭

#### 3단계: Redis 선택
1. 제공되는 스토리지 옵션 중 **"Redis"** 선택
   - ⚠️ **참고**: Vercel 대시보드에서 "KV" 옵션이 보이지 않으면 "Redis"를 선택하세요
   - Vercel의 "Redis"는 실제로 Vercel KV (Upstash Redis 기반)입니다
2. 데이터베이스 이름 입력 (예: `coex-kv` 또는 기본값 사용)
3. 리전 선택 (가장 가까운 리전 권장)
4. **"Create"** 버튼 클릭

#### 4단계: 환경 변수 자동 설정 확인
KV를 생성하면 다음 환경 변수가 **자동으로 추가**됩니다:
- `KV_URL`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

> 💡 **참고**: 환경 변수는 프로덕션, 프리뷰, 개발 환경에 자동으로 적용됩니다.

---

### 방법 2: Integrations 사용

#### 1단계: Integrations 메뉴 접속
1. 프로젝트 페이지에서 **"Settings"** 탭 클릭
2. 왼쪽 메뉴에서 **"Integrations"** 선택

#### 2단계: Vercel KV 추가
1. **"Browse Integrations"** 클릭
2. 검색창에 "KV", "Redis" 또는 "Vercel KV" 입력
3. **"Vercel KV"** 또는 **"Redis"** 선택
4. **"Add Integration"** 클릭
5. 기존 Redis/KV 데이터베이스 선택 또는 새로 생성

---

## 환경 변수 확인

### 대시보드에서 확인
1. 프로젝트 → **"Settings"** → **"Environment Variables"**
2. 다음 변수들이 있는지 확인:
   ```
   KV_URL
   KV_REST_API_URL
   KV_REST_API_TOKEN
   KV_REST_API_READ_ONLY_TOKEN
   ```

### 환경 변수가 없는 경우
만약 자동으로 추가되지 않았다면:
1. **"Storage"** 탭에서 생성한 Redis 데이터베이스 클릭
2. **"Settings"** 또는 **"API"** 탭에서 URL과 토큰 확인
3. 수동으로 환경 변수 추가:
   - **"Settings"** → **"Environment Variables"**
   - 다음 변수들을 추가:
     - `KV_URL` (또는 `UPSTASH_REDIS_REST_URL`)
     - `KV_REST_API_URL` (또는 `UPSTASH_REDIS_REST_URL`)
     - `KV_REST_API_TOKEN` (또는 `UPSTASH_REDIS_REST_TOKEN`)
     - `KV_REST_API_READ_ONLY_TOKEN` (선택사항)
   - **"Save"** 클릭

> 💡 **참고**: Redis를 생성했을 때 환경 변수 이름이 `UPSTASH_REDIS_*`로 시작할 수 있습니다. 이 경우 `@vercel/kv` 패키지가 자동으로 인식하므로 걱정하지 마세요.

---

## 로컬 개발 환경 설정

로컬에서 개발할 때도 KV를 사용하려면 `.env.local` 파일에 환경 변수를 추가해야 합니다.

### 1단계: .env.local 파일 생성
프로젝트 루트 디렉토리에 `.env.local` 파일이 없다면 생성:

```bash
touch .env.local
```

### 2단계: 환경 변수 복사
Vercel 대시보드에서 환경 변수를 복사하여 `.env.local`에 추가:

```env
# Vercel KV 설정
KV_URL=your_kv_url_here
KV_REST_API_URL=your_kv_rest_api_url_here
KV_REST_API_TOKEN=your_kv_rest_api_token_here
KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token_here
```

### 3단계: 실제 값 입력
Vercel 대시보드에서:
1. 프로젝트 → **"Storage"** → 생성한 KV 데이터베이스 클릭
2. **"Settings"** 또는 **"API"** 탭에서 URL과 토큰 복사
3. `.env.local` 파일에 붙여넣기

> ⚠️ **중요**: `.env.local` 파일은 `.gitignore`에 포함되어 있어야 합니다. 절대 Git에 커밋하지 마세요!

---

## 테스트 방법

### 1. 간단한 테스트 API 생성
`src/app/api/test-kv/route.ts` 파일 생성:

```typescript
import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 테스트: 값 저장
    await kv.set('test-key', 'test-value');
    
    // 테스트: 값 가져오기
    const value = await kv.get('test-key');
    
    return NextResponse.json({
      success: true,
      value,
      message: 'KV 연결 성공!'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### 2. 테스트 실행
브라우저에서 다음 URL 접속:
```
http://localhost:3000/api/test-kv
```

**성공 시:**
```json
{
  "success": true,
  "value": "test-value",
  "message": "KV 연결 성공!"
}
```

**실패 시:**
- 환경 변수가 제대로 설정되지 않았을 수 있습니다
- 에러 메시지를 확인하고 문제 해결 섹션 참고

### 3. 테스트 후 정리
테스트가 완료되면 테스트 API 파일 삭제:
```bash
rm src/app/api/test-kv/route.ts
```

---

## 문제 해결

### 문제 1: "KV client is not configured" 에러

**원인**: 환경 변수가 설정되지 않음

**해결 방법**:
1. Vercel 대시보드에서 환경 변수 확인
2. 로컬 개발 시 `.env.local` 파일 확인
3. 개발 서버 재시작: `npm run dev`

### 문제 2: "Invalid token" 에러

**원인**: 잘못된 토큰 또는 권한 문제

**해결 방법**:
1. Vercel 대시보드에서 토큰 재생성
2. 환경 변수 업데이트
3. 배포 재시도

### 문제 3: 로컬에서만 작동하지 않음

**원인**: `.env.local` 파일이 없거나 잘못 설정됨

**해결 방법**:
1. `.env.local` 파일 존재 확인
2. 환경 변수 형식 확인 (따옴표 없이)
3. 개발 서버 재시작

### 문제 4: 배포 후 작동하지 않음

**원인**: 환경 변수가 프로덕션 환경에 적용되지 않음

**해결 방법**:
1. Vercel 대시보드 → Settings → Environment Variables
2. 각 환경 변수의 적용 환경 확인 (Production, Preview, Development)
3. 필요시 수동으로 추가
4. 재배포

---

## 추가 리소스

- [Vercel KV 공식 문서](https://vercel.com/docs/storage/vercel-kv)
- [@vercel/kv 패키지 문서](https://github.com/vercel/storage/tree/main/packages/kv)
- [Vercel 대시보드](https://vercel.com/dashboard)

---

## 다음 단계

KV 설정이 완료되면:
1. ✅ 접속 제어 기능이 자동으로 작동합니다
2. ✅ `/api/enter` 엔드포인트가 KV를 사용합니다
3. ✅ 일일 접속량과 동시 접속량이 정확하게 카운트됩니다

문제가 있으면 위의 "문제 해결" 섹션을 참고하거나 Vercel 지원팀에 문의하세요.

