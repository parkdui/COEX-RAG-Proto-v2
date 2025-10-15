import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/utils';

export async function GET() {
  const APP_ID = getEnv("APP_ID", "testapp");
  
  // CLOVA API 설정
  let CLOVA_BASE = getEnv(
    "CLOVA_API_BASE",
    "https://clovastudio.apigw.ntruss.com"
  );

  // /testapp|/serviceapp 경로 없으면 붙이기
  if (!/\/(testapp|serviceapp)(\/|$)/.test(CLOVA_BASE)) {
    CLOVA_BASE = CLOVA_BASE.replace(/\/$/, "") + "/" + APP_ID;
  }
  
  const CLOVA_KEY = getEnv("CLOVA_API_KEY");
  const CLOVA_MODEL = getEnv("CLOVA_MODEL", "HCX-005");
  const url = `${CLOVA_BASE}/v3/chat-completions/${CLOVA_MODEL}`;

  return NextResponse.json({
    APP_ID,
    CLOVA_BASE,
    CLOVA_KEY: CLOVA_KEY ? "SET" : "NOT SET",
    CLOVA_MODEL,
    url,
    environment: process.env.NODE_ENV,
    vercel: process.env.VERCEL
  });
}
