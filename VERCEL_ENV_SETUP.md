# Vercel 환경 변수 설정 가이드

## 📍 KV 환경 변수 설정 방법

### 1단계: Vercel 대시보드 접속
1. 브라우저에서 [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. 로그인 (필요시)

### 2단계: 프로젝트 선택
1. 대시보드에서 **"coex-rag-nextjs"** (또는 프로젝트 이름) 클릭
2. 프로젝트 페이지로 이동

### 3단계: Settings 메뉴 접속
1. 프로젝트 페이지 상단 메뉴에서 **"Settings"** 탭 클릭
   - 또는 왼쪽 사이드바에서 **"Settings"** 클릭

### 4단계: Environment Variables 섹션 찾기
1. Settings 페이지에서 스크롤 다운
2. 왼쪽 사이드바 또는 메인 영역에서 **"Environment Variables"** 섹션 찾기
   - 또는 **"Environment"** 메뉴 클릭

### 5단계: REST API 정보 확인 (Storage 페이지에서)
환경 변수를 추가하기 전에, 먼저 REST API 정보를 확인해야 합니다:

#### 방법 A: Storage 페이지에서 확인
1. 프로젝트 페이지에서 **"Storage"** 탭 클릭
2. **"coex-redis"** (또는 생성한 Redis 이름) **카드를 클릭**
3. 열리는 페이지에서:
   - **"API"** 탭 클릭
   - 또는 **"Settings"** 탭 클릭
   - 또는 **"Overview"** 탭에서 REST API 정보 확인
4. 다음 정보 찾기:
   - **REST API URL** (예: `https://xxx-xxx-xxx.upstash.io`)
   - **REST API Token** (긴 문자열, `AX`로 시작하는 경우가 많음)

#### 방법 B: 이미 Environment Variables에 있을 수 있음
1. Settings → Environment Variables로 이동
2. 다음 이름들로 검색:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
3. 이미 있다면 추가할 필요 없음!

### 6단계: 환경 변수 추가
1. **"Environment Variables"** 섹션에서 **"Add New"** 또는 **"Add"** 버튼 클릭
2. 첫 번째 변수 추가:
   - **Key (이름)**: `KV_REST_API_URL`
   - **Value (값)**: Storage 페이지에서 복사한 REST API URL
   - **Environment**: 
     - ✅ **Production** 체크
     - ✅ **Preview** 체크 (선택사항)
     - ☐ **Development** 체크 안 해도 됨 (로컬에서만 필요)
   - **"Save"** 클릭

3. 두 번째 변수 추가:
   - **"Add New"** 또는 **"Add"** 버튼 다시 클릭
   - **Key (이름)**: `KV_REST_API_TOKEN`
   - **Value (값)**: Storage 페이지에서 복사한 REST API Token
   - **Environment**: 
     - ✅ **Production** 체크
     - ✅ **Preview** 체크 (선택사항)
   - **"Save"** 클릭

### 7단계: 재배포 (중요!)
환경 변수를 추가한 후 **반드시 재배포**해야 합니다:

1. 프로젝트 페이지로 돌아가기
2. **"Deployments"** 탭 클릭
3. 가장 최근 배포 옆의 **"..."** (점 3개) 메뉴 클릭
4. **"Redeploy"** 선택
5. 확인 대화상자에서 **"Redeploy"** 클릭
6. 배포 완료 대기 (1-2분)

또는:
- 코드를 다시 푸시하면 자동으로 재배포됩니다
- 또는 **"Deployments"** 탭에서 **"Redeploy"** 버튼 클릭

---

## 🔍 REST API 정보를 찾을 수 없는 경우

### 방법 1: Storage 페이지 새로고침
- Storage 페이지를 새로고침하고 다시 확인

### 방법 2: 다른 브라우저에서 시도
- 브라우저 캐시 문제일 수 있음

### 방법 3: Vercel 지원팀에 문의
- Storage 페이지에서 REST API 정보가 보이지 않으면 Vercel 지원팀에 문의

### 방법 4: 배포된 환경에서 자동 설정 확인
- Vercel에 배포하면 Storage와 연결된 환경 변수가 자동으로 설정될 수 있습니다
- Settings → Environment Variables에서 확인

---

## ✅ 확인 방법

환경 변수가 제대로 설정되었는지 확인:

1. Settings → Environment Variables
2. `KV_REST_API_URL`과 `KV_REST_API_TOKEN`이 있는지 확인
3. 배포된 URL에서 테스트:
   ```
   https://coex-rag-proto-v2.vercel.app/api/test-kv
   ```
4. 성공 응답이 오면 설정 완료!

---

## 📝 참고사항

- 환경 변수는 **대소문자를 구분**합니다
- 값에 따옴표(`"`)를 넣지 마세요
- 재배포 후에만 적용됩니다
- Production과 Preview 환경에 모두 추가하는 것을 권장합니다


