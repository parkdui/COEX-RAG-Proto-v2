import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ? "SET" : "NOT SET",
    GOOGLE_SHEET_RANGE: process.env.GOOGLE_SHEET_RANGE ? "SET" : "NOT SET", 
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "SET" : "NOT SET",
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? "SET" : "NOT SET",
    HYPERCLOVAX_API_KEY: process.env.HYPERCLOVAX_API_KEY ? "SET" : "NOT SET",
    CLOVA_API_KEY: process.env.CLOVA_API_KEY ? "SET" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV || "NOT SET",
    VERCEL: process.env.VERCEL || "NOT SET",
  };
  
  // 실제 값들도 로그로 출력 (보안상 일부만)
  console.log("Environment variables debug:");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("VERCEL:", process.env.VERCEL);
  console.log("GOOGLE_SHEET_ID length:", process.env.GOOGLE_SHEET_ID?.length || 0);
  console.log("GOOGLE_PRIVATE_KEY length:", process.env.GOOGLE_PRIVATE_KEY?.length || 0);
  
  return NextResponse.json(envVars);
}
