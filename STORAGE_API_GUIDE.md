# Vercel Storage에서 REST API 정보 찾기

## 📍 정확한 위치

1. **Vercel 대시보드** → 프로젝트 선택
2. 상단 메뉴에서 **"Storage"** 클릭
3. **"coex-redis"** (또는 생성한 Redis 이름) **카드를 클릭**
   - ⚠️ 중요: 리스트에서 이름만 보는 게 아니라 **카드 자체를 클릭**해야 합니다
4. 열리는 페이지에서 다음 탭들을 확인:
   - **"API"** 탭
   - **"Settings"** 탭  
   - **"Overview"** 탭
   - **"Details"** 탭

## 🔍 찾아야 할 정보

다음과 같은 형식의 정보를 찾으세요:

### REST API URL
```
https://xxx-xxx-xxx.upstash.io
```
또는
```
https://redis-xxx-xxx.upstash.io
```

### REST API Token
```
AXxxxxx... (긴 문자열)
```

## 💡 화면에서 확인할 수 있는 섹션들

- **"REST API"** 섹션
- **"Connection Details"** 섹션
- **"API Endpoint"** 섹션
- **"Authentication"** 섹션
- **"Quick Start"** 섹션

## 🆘 여전히 찾을 수 없다면

1. **Storage 페이지 새로고침**
2. **다른 브라우저에서 시도**
3. **Vercel 지원팀에 문의**

또는 **배포된 환경에서 테스트**:
- Vercel에 배포하면 환경 변수가 자동으로 설정됩니다
- 배포된 URL에서 `/api/test-kv` 테스트


