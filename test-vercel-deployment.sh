#!/bin/bash

# Vercel 배포 테스트 스크립트
# 사용법: ./test-vercel-deployment.sh <your-vercel-url>

if [ -z "$1" ]; then
    echo "❌ 사용법: ./test-vercel-deployment.sh <your-vercel-url>"
    echo "예시: ./test-vercel-deployment.sh https://coex-rag-proto-v2.vercel.app"
    exit 1
fi

BASE_URL=$1
echo "🚀 Vercel 배포 테스트 시작: $BASE_URL"
echo ""

# 1. 헬스 체크
echo "1️⃣ 헬스 체크..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")
if [ $? -eq 0 ]; then
    echo "✅ 헬스 체크 성공"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo "❌ 헬스 체크 실패"
fi
echo ""

# 2. 벡터 데이터 확인
echo "2️⃣ 벡터 데이터 확인..."
VECTORS_EXIST=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/query-with-embedding" -X POST -H "Content-Type: application/json" -d '{"question":"테스트"}')
if [ "$VECTORS_EXIST" = "400" ]; then
    echo "⚠️  벡터 데이터가 없습니다. /api/pre-processing-for-embedding을 실행해야 합니다."
else
    echo "✅ 벡터 데이터 확인됨"
fi
echo ""

# 3. 간단한 쿼리 테스트
echo "3️⃣ 쿼리 테스트..."
QUERY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/query-with-embedding" \
    -H "Content-Type: application/json" \
    -d '{"question":"코엑스 이벤트 추천해줘"}')

if [ $? -eq 0 ]; then
    echo "✅ 쿼리 테스트 성공"
    echo "$QUERY_RESPONSE" | jq '.answer' 2>/dev/null || echo "$QUERY_RESPONSE"
else
    echo "❌ 쿼리 테스트 실패"
fi
echo ""

# 4. 채팅 API 테스트
echo "4️⃣ 채팅 API 테스트..."
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"question":"안녕하세요"}')

if [ $? -eq 0 ]; then
    echo "✅ 채팅 API 테스트 성공"
    echo "$CHAT_RESPONSE" | jq '.answer' 2>/dev/null || echo "$CHAT_RESPONSE"
else
    echo "❌ 채팅 API 테스트 실패"
fi
echo ""

echo "🎉 테스트 완료!"
echo ""
echo "📝 다음 단계:"
echo "1. 벡터 데이터가 없다면: curl -X POST $BASE_URL/api/pre-processing-for-embedding"
echo "2. 메인 페이지 접속: $BASE_URL"
echo "3. Vercel 대시보드에서 로그 확인: https://vercel.com/dashboard"

