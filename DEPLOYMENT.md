# COEX RAG Next.js 프로젝트

COEX 이벤트 정보를 제공하는 RAG(Retrieval-Augmented Generation) 시스템입니다.

## 🚀 Vercel 배포 가이드

### 1. Vercel 계정 생성 및 프로젝트 연결

1. [Vercel](https://vercel.com)에 가입하거나 로그인
2. "New Project" 클릭
3. GitHub 저장소 연결 또는 코드 업로드

### 2. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수들을 설정하세요:

#### 필수 환경 변수
```
HYPERCLOVAX_API_KEY=your_hyperclovax_api_key_here
CLOVA_API_KEY=your_clova_api_key_here
GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email_here
GOOGLE_PRIVATE_KEY=your_private_key_here

# Vercel KV 설정 (접속 제어용)
KV_URL=your_vercel_kv_url_here
KV_REST_API_URL=your_vercel_kv_rest_api_url_here
KV_REST_API_TOKEN=your_vercel_kv_rest_api_token_here
KV_REST_API_READ_ONLY_TOKEN=your_vercel_kv_rest_api_read_only_token_here
```

**Vercel KV 설정 방법:**
1. Vercel 대시보드에서 프로젝트 선택
2. Settings → Storage → Create Database → KV 선택
3. 생성 후 자동으로 환경 변수가 추가됩니다
4. 또는 수동으로 KV 대시보드에서 URL과 토큰을 복사하여 설정

#### 선택적 환경 변수
```
HYPERCLOVAX_API_BASE=https://clovastudio.apigw.ntruss.com
HYPERCLOVAX_EMBED_MODEL=clir-emb-dolphin
CLOVA_API_BASE=https://clovastudio.apigw.ntruss.com
CLOVA_MODEL=HCX-005
APP_ID=testapp
TOP_K=3
MAX_HISTORY=20
GOOGLE_SHEET_RANGE=Sheet1!A:Z
LOG_GOOGLE_SHEET_ID=your_log_sheet_id_here
LOG_GOOGLE_SHEET_NAME=Sheet1
LOG_GOOGLE_SHEET_ACCOUNT_EMAIL=your_log_service_account_email_here
LOG_GOOGLE_SHEET_PRIVATE_KEY=your_log_private_key_here
LOG_TOKENS=0
```

### 3. 배포 설정

1. **Build Command**: `npm run build` (자동 설정됨)
2. **Output Directory**: `.next` (자동 설정됨)
3. **Install Command**: `npm install` (자동 설정됨)

### 4. 배포 후 설정

배포가 완료되면 다음 단계를 수행하세요:

1. **벡터 데이터 생성**:
   ```
   POST https://your-app.vercel.app/api/pre-processing-for-embedding
   ```

2. **애플리케이션 테스트**:
   ```
   https://your-app.vercel.app
   ```

## 📁 프로젝트 구조

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts              # 채팅 API
│   │   │   ├── google-sheets/route.ts      # Google Sheets 연동
│   │   │   ├── pre-processing-for-embedding/route.ts  # 벡터 생성
│   │   │   └── query-with-embedding/route.ts  # 기존 쿼리 API
│   │   ├── page.tsx                        # 메인 페이지
│   │   └── layout.tsx                      # 레이아웃
│   └── lib/
│       └── utils.ts                        # 유틸리티 함수
├── public/
│   └── LLM/
│       └── system_prompt.txt              # 시스템 프롬프트
├── data/
│   └── event_lists.csv                    # 이벤트 데이터
├── vercel.json                            # Vercel 설정
└── package.json
```

## 🔧 로컬 개발

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp env.example .env.local
# .env.local 파일을 편집하여 실제 값 입력

# 개발 서버 실행
npm run dev
```

## 📝 주요 변경사항

### Socket.IO → HTTP API 전환
- 실시간 통신을 위한 Socket.IO를 제거하고 일반 HTTP API로 전환
- Vercel의 서버리스 환경에 최적화
- 채팅 히스토리는 클라이언트에서 관리

### API 엔드포인트
- `POST /api/chat` - 채팅 메시지 처리
- `GET /api/google-sheets` - Google Sheets 데이터 로드
- `POST /api/pre-processing-for-embedding` - 벡터 데이터 생성
- `POST /api/query-with-embedding` - 기존 쿼리 API
- `GET /api/enter` - 접속 체크 및 세션 발급 (일일/동시 접속량 제한)
- `POST /api/heartbeat` - 실시간 접속 유지 (30초마다 호출)
- `POST /api/leave` - 세션 종료 처리

## 🚨 주의사항

1. **Google Sheets API**: 서비스 계정 키가 필요합니다
2. **CLOVA API**: 네이버 클라우드 플랫폼 API 키가 필요합니다
3. **벡터 데이터**: 배포 후 반드시 `/api/pre-processing-for-embedding`을 호출하여 벡터 데이터를 생성해야 합니다
4. **환경 변수**: 모든 API 키는 Vercel 환경 변수로 안전하게 설정하세요
5. **Vercel KV**: 접속 제어 기능을 사용하려면 Vercel KV 데이터베이스를 생성하고 환경 변수를 설정해야 합니다

## 🔐 접속 제어 기능

이 프로젝트는 다음 접속 제어 기능을 제공합니다:

### 1. 일일 총 접속량 제한 (1000명)
- 오늘 처음 들어온 유저 수를 카운트
- 1000명 초과 시 접속 차단
- 쿠키 기반으로 중복 카운트 방지

### 2. 실시간 동시 접속량 제한 (100명)
- 현재 접속 중인 사용자 수를 실시간으로 측정
- 5분 이상 활동이 없으면 자동으로 제외
- 100명 초과 시 접속 차단

### 3. 1일 1회 제한
- 같은 사용자는 하루에 한 번만 이용 가능
- 쿠키 기반으로 제한 (브라우저/디바이스 변경 시 해제)

### 설정값 변경
`src/app/api/enter/route.ts` 파일에서 다음 값들을 수정할 수 있습니다:
- `DAILY_LIMIT`: 일일 접속 제한 (기본값: 1000)
- `CONCURRENT_LIMIT`: 동시 접속 제한 (기본값: 100)

## 🔗 유용한 링크

- [Vercel 문서](https://vercel.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [CLOVA Studio API](https://www.ncloud.com/product/aiService/clovaStudio)
