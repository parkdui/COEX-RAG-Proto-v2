# COEX RAG Next.js 프로토타입

COEX 이벤트 안내를 위한 RAG (Retrieval-Augmented Generation) 시스템을 Next.js와 React로 구현한 프로토타입입니다.

## 주요 기능

- **RAG 시스템**: Google Sheets 데이터를 임베딩하여 시맨틱 검색 수행
- **실시간 채팅**: Socket.io를 통한 실시간 대화 기능
- **AI 응답**: HyperCLOVAX HCX-005 모델을 사용한 자연어 응답
- **현대적 UI**: React와 Tailwind CSS를 사용한 반응형 인터페이스

## 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Socket.io
- **AI/ML**: HyperCLOVAX Embedding API, CLOVA Chat Completions API
- **데이터**: Google Sheets API
- **실시간 통신**: Socket.io

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`env.example` 파일을 참고하여 `.env.local` 파일을 생성하고 필요한 API 키들을 설정하세요:

```bash
cp env.example .env.local
```

필요한 환경 변수:
- `HYPERCLOVAX_API_KEY`: HyperCLOVAX API 키
- `CLOVA_API_KEY`: CLOVA API 키
- `GOOGLE_SHEET_ID`: Google Sheets ID
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Google 서비스 계정 이메일
- `GOOGLE_PRIVATE_KEY`: Google 서비스 계정 개인 키

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하세요.

### 4. 프로덕션 빌드

```bash
npm run build
npm start
```

## API 엔드포인트

- `GET /api/health`: 서버 상태 확인
- `GET /api/google-sheets`: Google Sheets 데이터 로드
- `POST /api/pre-processing-for-embedding`: 데이터 임베딩 전처리
- `POST /api/query-with-embedding`: RAG 쿼리 처리

## 프로젝트 구조

```
src/
├── app/
│   ├── api/                 # API 라우트
│   │   ├── health/
│   │   ├── google-sheets/
│   │   ├── pre-processing-for-embedding/
│   │   └── query-with-embedding/
│   ├── globals.css         # 전역 스타일
│   ├── layout.tsx          # 루트 레이아웃
│   └── page.tsx            # 메인 페이지
├── lib/
│   ├── socket.ts           # Socket.io 설정
│   └── utils.ts            # 유틸리티 함수
data/                       # 데이터 파일
public/
├── LLM/
│   └── system_prompt.txt   # 시스템 프롬프트
server.js                   # 커스텀 서버 (Socket.io 포함)
```

## 주요 컴포넌트

### ChatBubble
채팅 메시지를 표시하는 컴포넌트로, 사용자와 AI의 메시지를 구분하여 표시합니다.

### 메인 페이지
- 시스템 프롬프트 편집
- 실시간 채팅 인터페이스
- Socket.io 연결 상태 표시

## 개발 가이드

### 새로운 API 라우트 추가
`src/app/api/` 디렉토리에 새로운 폴더를 생성하고 `route.ts` 파일을 추가하세요.

### Socket.io 이벤트 추가
`server.js` 파일에서 새로운 Socket.io 이벤트 핸들러를 추가할 수 있습니다.

### 스타일 수정
Tailwind CSS 클래스를 사용하여 스타일을 수정할 수 있습니다.

## 배포

### Vercel 배포
1. GitHub에 코드 푸시
2. Vercel에서 프로젝트 연결
3. 환경 변수 설정
4. 배포 완료

### 기타 플랫폼
Socket.io를 사용하므로 서버 사이드 렌더링이 필요한 플랫폼에서 배포하세요.

## 라이선스

ISC