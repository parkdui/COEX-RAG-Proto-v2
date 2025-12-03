# 환경 변수 설정 가이드

## ⚠️ 중요: Vercel의 지시사항 vs 우리 프로젝트

Vercel에서 제공하는 지시사항은 **`node-redis`** 패키지를 사용하는 방법입니다.
하지만 우리 프로젝트는 **`@vercel/kv`** 패키지를 사용하므로 **다른 환경 변수**가 필요합니다.

---

## @vercel/kv에 필요한 환경 변수

### Vercel 대시보드에서 확인하는 방법

1. **프로젝트 선택** → **Settings** → **Environment Variables**
2. 다음 변수들을 찾아보세요:

#### 방법 1: KV_* 형식 (권장)
```
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=your-token-here
```

#### 방법 2: UPSTASH_REDIS_* 형식
```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

#### 방법 3: Storage 페이지에서 직접 확인
1. **Storage** 탭 → **coex-redis** 클릭
2. **API** 또는 **Settings** 탭 확인
3. **REST API URL**과 **REST API Token** 복사

---

## .env.local 파일 설정

`.env.local` 파일을 열고 다음을 추가하세요:

```env
# @vercel/kv를 위한 REST API 설정
KV_REST_API_URL=복사한_REST_API_URL
KV_REST_API_TOKEN=복사한_REST_API_TOKEN
```

또는 UPSTASH 형식이라면:
```env
UPSTASH_REDIS_REST_URL=복사한_URL
UPSTASH_REDIS_REST_TOKEN=복사한_TOKEN
```

---

## ⚠️ REDIS_URL은 사용하지 않습니다

`REDIS_URL="redis://..."` 형식은 `@vercel/kv`에서 사용하지 않습니다.
`@vercel/kv`는 REST API를 사용하므로 **REST API URL과 Token**이 필요합니다.

---

## 테스트 방법

환경 변수를 설정한 후:

1. 개발 서버 재시작:
   ```bash
   npm run dev
   ```

2. 테스트 API 호출:
   ```
   http://localhost:3000/api/test-kv
   ```

3. 성공 응답 예시:
   ```json
   {
     "success": true,
     "value": "test-value",
     "message": "KV 연결 성공!"
   }
   ```

---

## 문제 해결

### "Missing required environment variables" 에러
- `.env.local` 파일에 `KV_REST_API_URL`과 `KV_REST_API_TOKEN`이 있는지 확인
- 개발 서버를 재시작했는지 확인

### 환경 변수를 찾을 수 없을 때
1. Vercel 대시보드 → Storage → coex-redis → API 탭 확인
2. 또는 Vercel 지원팀에 문의


