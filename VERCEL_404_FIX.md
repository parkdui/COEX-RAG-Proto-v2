# 🔧 Vercel 404 에러 해결 가이드

## 문제 상황
CLOVA Chat API 호출 시 404 NotFoundException 에러 발생

## 원인 분석
CLOVA API URL 구성 문제로 인한 404 에러입니다. 가능한 원인:
1. `CLOVA_API_BASE` 환경 변수가 잘못 설정됨
2. `APP_ID` 환경 변수가 설정되지 않음
3. URL 구성 시 슬래시 처리 문제

## 해결 방법

### 1. Vercel 환경 변수 확인 및 수정

Vercel 대시보드 → Settings → Environment Variables에서 다음을 확인하세요:

#### 올바른 환경 변수 설정:

**CLOVA_API_BASE** (선택사항, 기본값 사용 가능):
```
https://clovastudio.apigw.ntruss.com
```
또는 이미 `/testapp` 또는 `/serviceapp`이 포함된 경우:
```
https://clovastudio.apigw.ntruss.com/testapp
```

**APP_ID** (선택사항, 기본값: testapp):
```
testapp
```
또는 실제 사용하는 앱 ID:
```
serviceapp
```

**CLOVA_MODEL** (선택사항, 기본값: HCX-005):
```
HCX-005
```

**CLOVA_API_KEY** (필수):
```
your_clova_api_key_here
```

### 2. Health API로 확인

배포 후 다음 URL로 접속하여 실제 구성된 URL을 확인하세요:

```
https://your-app.vercel.app/api/health
```

응답 예시:
```json
{
  "ok": true,
  "appId": "testapp",
  "embedBase": "https://clovastudio.apigw.ntruss.com/testapp",
  "chatBase": "https://clovastudio.apigw.ntruss.com/testapp",
  "chatApiUrl": "https://clovastudio.apigw.ntruss.com/testapp/v3/chat-completions/HCX-005",
  "embedModel": "clir-emb-dolphin",
  "topK": 2,
  "env": {
    "clovaApiBase": "https://clovastudio.apigw.ntruss.com",
    "appId": "testapp",
    "clovaModel": "HCX-005"
  }
}
```

### 3. Vercel 로그 확인

Vercel 대시보드 → Deployments → Functions → 로그에서 다음을 확인하세요:

- `🔗 [CLOVA] API URL:` - 실제 호출되는 URL
- `❌ [CLOVA] API Error` - 에러 상세 정보

### 4. 환경 변수 수정 후 재배포

환경 변수를 수정한 후:
1. Vercel 대시보드에서 "Redeploy" 클릭
2. 또는 코드를 다시 푸시하면 자동 재배포됩니다

## 개선 사항

### 1. URL 구성 로직 개선
- 슬래시 처리 개선
- 중복 경로 방지
- 더 명확한 URL 구성

### 2. 디버깅 로그 추가
- 실제 호출되는 URL 로깅
- 에러 발생 시 상세 정보 출력
- 개발 환경에서 자동 로깅

### 3. Health API 개선
- 실제 사용될 API URL 표시
- 환경 변수 값 확인 가능

## 체크리스트

- [ ] `CLOVA_API_BASE` 환경 변수 확인 (또는 제거하여 기본값 사용)
- [ ] `APP_ID` 환경 변수 확인 (또는 제거하여 기본값 사용)
- [ ] `CLOVA_API_KEY` 환경 변수 확인 (필수)
- [ ] `/api/health` 엔드포인트로 URL 확인
- [ ] Vercel 로그에서 실제 호출 URL 확인
- [ ] 재배포 후 테스트

## 예상되는 올바른 URL 형식

```
https://clovastudio.apigw.ntruss.com/testapp/v3/chat-completions/HCX-005
```

또는

```
https://clovastudio.apigw.ntruss.com/serviceapp/v3/chat-completions/HCX-005
```

## 추가 도움말

문제가 계속되면:
1. Vercel 로그에서 실제 호출되는 URL 확인
2. `/api/health` 응답에서 `chatApiUrl` 확인
3. CLOVA Studio 대시보드에서 실제 API 엔드포인트 확인

