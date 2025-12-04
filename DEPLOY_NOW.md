# 🚀 Vercel 배포 가이드

## 현재 상태
✅ 코드 최적화 완료
✅ 빌드 성공 확인
✅ GitHub에 푸시 완료

## 배포 방법

### 방법 1: Vercel CLI로 배포 (권장)

터미널에서 다음 명령어를 실행하세요:

```bash
# 1. Vercel 로그인
vercel login

# 2. 프로덕션 배포
vercel --prod
```

### 방법 2: Vercel 대시보드에서 배포

1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. 프로젝트가 이미 연결되어 있다면 자동으로 배포가 시작됩니다
3. 새 프로젝트라면:
   - "New Project" 클릭
   - GitHub 저장소 선택: `parkdui/COEX-RAG-Proto-v2`
   - "Import" 클릭

## 배포 후 필수 작업

### 1. 환경 변수 설정 확인
Vercel 대시보드 → Settings → Environment Variables에서 다음 변수들이 설정되어 있는지 확인:

**필수 환경 변수:**
- `HYPERCLOVAX_API_KEY`
- `CLOVA_API_KEY`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `KV_REST_API_URL` (접속 제어 사용 시)
- `KV_REST_API_TOKEN` (접속 제어 사용 시)

### 2. 벡터 데이터 생성
배포가 완료되면 **반드시** 벡터 데이터를 생성해야 합니다:

```bash
curl -X POST https://your-app.vercel.app/api/pre-processing-for-embedding
```

또는 브라우저에서:
```
https://your-app.vercel.app/api/pre-processing-for-embedding
```

**중요**: 이 작업은 5-10분 정도 걸릴 수 있습니다.

### 3. 헬스 체크
```bash
curl https://your-app.vercel.app/api/health
```

### 4. 애플리케이션 테스트
```
https://your-app.vercel.app
```

## 배포 URL 확인
배포가 완료되면 Vercel 대시보드에서 배포 URL을 확인할 수 있습니다.
일반적으로: `https://coex-rag-proto-v2.vercel.app` 또는 커스텀 도메인

