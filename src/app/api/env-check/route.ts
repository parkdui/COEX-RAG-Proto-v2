import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ? "SET" : "NOT SET",
    GOOGLE_SHEET_RANGE: process.env.GOOGLE_SHEET_RANGE ? "SET" : "NOT SET", 
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "SET" : "NOT SET",
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? "SET" : "NOT SET",
    HYPERCLOVAX_API_KEY: process.env.HYPERCLOVAX_API_KEY ? "SET" : "NOT SET",
    CLOVA_API_KEY: process.env.CLOVA_API_KEY ? "SET" : "NOT SET",
  };
  
  return NextResponse.json(envVars);
}
