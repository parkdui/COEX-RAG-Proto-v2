# REST API 정보 찾는 방법

## 방법 1: Storage 페이지에서 직접 확인 (가장 확실한 방법)

1. **Vercel 대시보드** 접속
2. 프로젝트 선택
3. **Storage** 탭 클릭
4. **coex-redis** (또는 생성한 Redis 이름) 클릭
5. 다음 중 하나의 탭 확인:
   - **"API"** 탭
   - **"Settings"** 탭
   - **"Details"** 탭
6. 다음 정보 찾기:
   - **REST API URL** (예: `https://xxx.upstash.io`)
   - **REST API Token** (긴 문자열)

## 방법 2: Environment Variables에서 다른 이름으로 있을 수 있음

다음 이름들로 검색해보세요:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `KV_URL`
- `REDIS_REST_URL`
- `REDIS_REST_TOKEN`

## 방법 3: Storage 페이지에서 "Connect" 또는 "View Details" 버튼 확인

Storage 페이지에서 Redis를 클릭하면:
- "Connect" 버튼
- "View Details" 버튼
- "API" 링크
- "Settings" 링크

이런 버튼들을 클릭하면 REST API 정보가 표시될 수 있습니다.

## 방법 4: Vercel CLI 사용 (선택사항)

터미널에서:
```bash
vercel env pull .env.local
```

이 명령어는 Vercel의 모든 환경 변수를 `.env.local`로 가져옵니다.






