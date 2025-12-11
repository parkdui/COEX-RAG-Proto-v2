# Vercel 배포 체크리스트

## ✅ 사전 준비사항

### 1. 코드 최적화 완료
- [x] maxTokens 설정 최적화 (70 tokens)
- [x] system_prompt.txt 수정 (30자 이내)
- [x] 환경 변수 검증 추가
- [x] 에러 핸들링 개선
- [x] API 라우트 최적화

### 2. 필수 환경 변수 설정

Vercel 대시보드 → Settings → Environment Variables에서 다음 변수들을 설정하세요:

#### 필수 환경 변수
```
HYPERCLOVAX_API_KEY=your_hyperclovax_api_key_here
CLOVA_API_KEY=your_clova_api_key_here
GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email_here
GOOGLE_PRIVATE_KEY=your_private_key_here
```

**주의**: `GOOGLE_PRIVATE_KEY`는 전체 키를 한 줄로 입력하되, `\n`을 실제 개행 문자로 변환해야 합니다.

#### Vercel KV 설정 (접속 제어용)
```
KV_REST_API_URL=your_vercel_kv_rest_api_url_here
KV_REST_API_TOKEN=your_vercel_kv_rest_api_token_here
```

**설정 방법**:
1. Vercel 대시보드 → Storage → Create Database → KV 선택
2. 생성 후 자동으로 환경 변수가 추가됩니다
3. 또는 Storage 페이지에서 REST API 정보를 복사하여 수동 설정

#### 선택적 환경 변수
```
HYPERCLOVAX_API_BASE=https://clovastudio.apigw.ntruss.com
HYPERCLOVAX_EMBED_MODEL=clir-emb-dolphin
CLOVA_API_BASE=https://clovastudio.apigw.ntruss.com
CLOVA_MODEL=HCX-005
APP_ID=testapp
TOP_K=2
LOG_TOKENS=0
```

## 🚀 배포 단계

### 1단계: 프로젝트 연결
1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. "New Project" 클릭
3. GitHub 저장소 연결 또는 코드 업로드

### 2단계: 환경 변수 설정
1. 프로젝트 설정 → Environment Variables
2. 위의 필수 환경 변수들을 모두 추가
3. Production, Preview, Development 환경에 적용할지 선택

### 3단계: 빌드 설정 확인
- Build Command: `npm run build` (자동 설정됨)
- Output Directory: `.next` (자동 설정됨)
- Install Command: `npm install` (자동 설정됨)

### 4단계: 배포 실행
1. "Deploy" 버튼 클릭
2. 빌드 로그 확인
3. 배포 완료 대기 (약 2-3분)

## 📋 배포 후 필수 작업

### 1. 벡터 데이터 생성
배포가 완료되면 **반드시** 벡터 데이터를 생성해야 합니다:

```bash
curl -X POST https://your-app.vercel.app/api/pre-processing-for-embedding
```

또는 브라우저에서:
```
https://your-app.vercel.app/api/pre-processing-for-embedding
```

**중요**: 이 작업은 Google Sheets에서 데이터를 가져와 임베딩을 생성하므로 시간이 걸릴 수 있습니다 (5-10분).

### 2. 헬스 체크
배포가 정상적으로 되었는지 확인:

```bash
curl https://your-app.vercel.app/api/health
```

예상 응답:
```json
{
  "ok": true,
  "appId": "testapp",
  "embedBase": "https://clovastudio.apigw.ntruss.com/testapp",
  "chatBase": "https://clovastudio.apigw.ntruss.com/testapp",
  "embedModel": "clir-emb-dolphin",
  "topK": 2
}
```

### 3. 애플리케이션 테스트
메인 페이지 접속:
```
https://your-app.vercel.app
```

## 🔍 문제 해결

### 빌드 실패 시
1. **환경 변수 확인**: 모든 필수 환경 변수가 설정되었는지 확인
2. **빌드 로그 확인**: Vercel 대시보드 → Deployments → 빌드 로그 확인
3. **로컬 빌드 테스트**: `npm run build` 실행하여 로컬에서 빌드 오류 확인

### API 오류 시
1. **환경 변수 확인**: API 키가 올바르게 설정되었는지 확인
2. **벡터 데이터 확인**: `/api/pre-processing-for-embedding`이 실행되었는지 확인
3. **에러 로그 확인**: Vercel 대시보드 → Functions → 로그 확인

### 벡터 데이터 생성 실패 시
1. **Google Sheets 권한 확인**: 서비스 계정이 Google Sheets에 접근 권한이 있는지 확인
2. **환경 변수 확인**: `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` 확인
3. **타임아웃**: Vercel의 기본 타임아웃은 10초이지만, `vercel.json`에서 300초로 설정되어 있습니다.

## 📊 성능 최적화

### 현재 최적화 사항
- ✅ maxTokens: 70 (30자 내외 응답)
- ✅ TOP_K: 2 (RAG 컨텍스트 최소화)
- ✅ Context 텍스트 길이 제한: 200자
- ✅ History 최적화: 최근 2턴만 유지
- ✅ API 타임아웃: 300초

### 모니터링
- Vercel 대시보드에서 함수 실행 시간 및 에러율 확인
- `LOG_TOKENS=1`로 설정하면 토큰 사용량 로깅 가능

## 🔐 보안 체크리스트

- [x] 환경 변수는 Vercel 대시보드에서만 관리
- [x] `.env` 파일은 Git에 커밋하지 않음
- [x] API 키는 절대 코드에 하드코딩하지 않음
- [x] Vercel KV는 접속 제어에만 사용

## 📝 참고사항

1. **파일 시스템**: Vercel은 읽기 전용 파일 시스템을 사용합니다. `data/vectors.json`은 빌드 시 생성되거나 API를 통해 생성해야 합니다.

2. **서버리스 함수**: 각 API 라우트는 서버리스 함수로 실행되며, 콜드 스타트가 발생할 수 있습니다.

3. **타임아웃**: `vercel.json`에서 API 함수의 최대 실행 시간을 300초로 설정했습니다.

4. **환경 변수 업데이트**: 환경 변수를 변경한 후에는 반드시 재배포해야 합니다.

## ✅ 배포 완료 체크리스트

- [ ] 모든 필수 환경 변수 설정 완료
- [ ] 빌드 성공
- [ ] 벡터 데이터 생성 완료
- [ ] 헬스 체크 통과
- [ ] 메인 페이지 접속 확인
- [ ] 채팅 기능 테스트 완료
- [ ] 에러 로그 확인 (에러 없음)

---

**배포 준비 완료!** 🎉

이제 Vercel에서 테스트할 수 있습니다.





