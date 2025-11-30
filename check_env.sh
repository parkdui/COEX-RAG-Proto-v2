#!/bin/bash
echo "=== .env.local 파일 확인 ==="
if [ -f .env.local ]; then
    echo "✅ .env.local 파일이 존재합니다"
    echo ""
    echo "현재 설정된 KV 관련 환경 변수:"
    grep -E "KV_|UPSTASH|REDIS" .env.local 2>/dev/null || echo "KV 관련 환경 변수가 없습니다"
else
    echo "❌ .env.local 파일이 없습니다"
fi
