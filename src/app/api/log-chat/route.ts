import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// 환경 변수 직접 로드
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// 로그 시트 범위 (새로운 시트 사용)
const LOG_SHEET_RANGE = "ChatLog!A:E";

interface ChatLog {
  timestamp: string;
  systemPrompt: string;
  userQuestion: string;
  aiAnswer: string;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
}

async function logToGoogleSheet(logData: ChatLog) {
  if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error("Google Sheets API credentials are not set");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // 헤더가 있는지 확인하고 없으면 추가
  try {
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "ChatLog!A1:E1",
    });

    if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
      // 헤더 추가
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: "ChatLog!A1:E1",
        valueInputOption: "RAW",
        requestBody: {
          values: [["Timestamp", "System Prompt", "User Question", "AI Answer", "Token Usage"]]
        }
      });
    }
  } catch (error) {
    console.log("Header check failed, assuming sheet doesn't exist, will create headers");
  }

  // 데이터 추가
  const values = [
    [
      logData.timestamp,
      logData.systemPrompt.substring(0, 1000), // 구글 시트 셀 제한 고려
      logData.userQuestion.substring(0, 1000),
      logData.aiAnswer.substring(0, 1000),
      logData.tokens ? `${logData.tokens.input}/${logData.tokens.output}/${logData.tokens.total}` : "N/A"
    ]
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: LOG_SHEET_RANGE,
    valueInputOption: "RAW",
    requestBody: {
      values: values
    }
  });

  console.log("Chat log saved to Google Sheets");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { timestamp, systemPrompt, userQuestion, aiAnswer, tokens } = body;

    if (!timestamp || !systemPrompt || !userQuestion || !aiAnswer) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const logData: ChatLog = {
      timestamp,
      systemPrompt,
      userQuestion,
      aiAnswer,
      tokens
    };

    await logToGoogleSheet(logData);

    return NextResponse.json({ ok: true, message: "Chat logged successfully" });
  } catch (error) {
    console.error('Error logging chat to Google Sheets:', error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
