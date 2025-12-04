import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/utils';

// ENV 로드 & 자동 보정
const APP_ID = getEnv("APP_ID", "testapp");
const TOP_K = parseInt(getEnv("TOP_K", "3"), 10);

// 1) Embedding/Segmentation BASE
let HLX_BASE = getEnv(
  "HYPERCLOVAX_API_BASE",
  "https://clovastudio.apigw.ntruss.com"
);
const EMB_MODEL = getEnv("HYPERCLOVAX_EMBED_MODEL", "clir-emb-dolphin");

// stream 도메인이면 apigw로 교체
if (/clovastudio\.stream\.ntruss\.com/.test(HLX_BASE)) {
  HLX_BASE = HLX_BASE.replace(
    "clovastudio.stream.ntruss.com",
    "clovastudio.apigw.ntruss.com"
  );
}
// /testapp|/serviceapp 경로 없으면 붙이기
if (!/\/(testapp|serviceapp)(\/|$)/.test(HLX_BASE)) {
  HLX_BASE = HLX_BASE.replace(/\/$/, "") + "/" + APP_ID;
}

// 2) Chat BASE
let CLOVA_BASE = getEnv(
  "CLOVA_API_BASE",
  "https://clovastudio.apigw.ntruss.com"
);

// /testapp|/serviceapp 경로 없으면 붙이기 (CLOVA_BASE에도 동일하게 적용)
if (!/\/(testapp|serviceapp)(\/|$)/.test(CLOVA_BASE)) {
  CLOVA_BASE = CLOVA_BASE.replace(/\/$/, "") + "/" + APP_ID;
}

export async function GET() {
  // 실제 사용될 CLOVA API URL 구성
  let clovaApiUrl = CLOVA_BASE;
  if (!clovaApiUrl.endsWith('/')) {
    clovaApiUrl += '/';
  }
  if (!clovaApiUrl.includes('/v3/')) {
    clovaApiUrl += 'v3/chat-completions/HCX-005';
  } else {
    clovaApiUrl += 'HCX-005';
  }
  
  return NextResponse.json({
    ok: true,
    appId: APP_ID,
    embedBase: HLX_BASE,
    chatBase: CLOVA_BASE,
    chatApiUrl: clovaApiUrl, // 실제 호출될 URL
    embedModel: EMB_MODEL,
    topK: TOP_K,
    env: {
      clovaApiBase: process.env.CLOVA_API_BASE || "not set",
      appId: process.env.APP_ID || "not set",
      clovaModel: process.env.CLOVA_MODEL || "not set",
    }
  });
}
