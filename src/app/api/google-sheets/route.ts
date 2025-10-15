import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getEnv } from '@/lib/utils';

// 환경 변수 직접 로드 (Vercel 호환성 개선)
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEET_RANGE = process.env.GOOGLE_SHEET_RANGE || "Sheet1!A:Z";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// 디버깅용 로그
console.log("Environment variables check:");
console.log("GOOGLE_SHEET_ID:", GOOGLE_SHEET_ID ? "SET" : "NOT SET");
console.log("GOOGLE_SHEET_RANGE:", GOOGLE_SHEET_RANGE ? "SET" : "NOT SET");
console.log("GOOGLE_SERVICE_ACCOUNT_EMAIL:", GOOGLE_SERVICE_ACCOUNT_EMAIL ? "SET" : "NOT SET");
console.log("GOOGLE_PRIVATE_KEY:", GOOGLE_PRIVATE_KEY ? "SET" : "NOT SET");

// Google Sheets 데이터 로더 함수
async function loadDataFromGoogleSheet() {
  if (
    !GOOGLE_SHEET_ID ||
    !GOOGLE_SHEET_RANGE ||
    !GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !GOOGLE_PRIVATE_KEY
  ) {
    throw new Error("Google Sheets API credentials are not set in .env file.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: GOOGLE_SHEET_RANGE,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    console.log("No data found in Google Sheet.");
    return [];
  }

  // 첫 번째 행을 헤더(key)로 사용
  const headers = rows[0].map((h) => String(h || "").trim());
  // 나머지 행들을 { header: value } 형태의 객체 배열로 변환
  const data = rows.slice(1).map((row) => {
    const rowData: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      rowData[header] = row[index];
    });
    return rowData;
  });

  console.log(`[Google Sheets] Loaded ${data.length} rows.`);
  return data;
}

export async function GET() {
  try {
    const data = await loadDataFromGoogleSheet();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('Error loading Google Sheets data:', error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
