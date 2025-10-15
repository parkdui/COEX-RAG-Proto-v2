import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// 환경 변수 직접 로드
const LOG_GOOGLE_SHEET_ID = process.env.LOG_GOOGLE_SHEET_ID;
const LOG_GOOGLE_SHEET_NAME = process.env.LOG_GOOGLE_SHEET_NAME || "Sheet1";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// 로그 시트 범위 (로그 전용 시트 사용)
const LOG_SHEET_RANGE = `${LOG_GOOGLE_SHEET_NAME}!A:Z`;

interface ChatLog {
  timestamp: string;
  systemPrompt: string;
  conversation: Array<{
    userMessage: string;
    aiMessage: string;
  }>;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
}

async function logToGoogleSheet(logData: ChatLog) {
  if (!LOG_GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
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
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!A1:Z1`,
    });

    if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
      // 헤더 추가 (A열: 타임스탬프, B열: 시스템 프롬프트, C열부터: 대화)
      const headers = ["일시", "시스템 프롬프트"];
      // C열부터 사용자 메시지와 AI 응답을 번갈아가며 헤더 생성
      for (let i = 0; i < 10; i++) { // 최대 10턴의 대화 (20열)
        headers.push(`사용자 메시지 ${i + 1}`);
        headers.push(`AI 메시지 ${i + 1}`);
      }
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: LOG_GOOGLE_SHEET_ID,
        range: `${LOG_GOOGLE_SHEET_NAME}!A1:Z1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [headers]
        }
      });
    }
  } catch (error) {
    console.log("Header check failed, will try to add headers");
  }

  // 데이터 추가 - 올바른 형식으로 변환
  const rowData = [
    logData.timestamp,
    logData.systemPrompt.substring(0, 1000) // 구글 시트 셀 제한 고려
  ];

  // 대화 내용을 C열부터 번갈아가며 배치
  logData.conversation.forEach((conv, index) => {
    rowData.push(conv.userMessage.substring(0, 1000));
    rowData.push(conv.aiMessage.substring(0, 1000));
  });

  // 토큰 정보를 마지막에 추가 (필요한 경우)
  if (logData.tokens) {
    rowData.push(`토큰: ${logData.tokens.input}/${logData.tokens.output}/${logData.tokens.total}`);
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: LOG_GOOGLE_SHEET_ID,
    range: LOG_SHEET_RANGE,
    valueInputOption: "RAW",
    requestBody: {
      values: [rowData]
    }
  });

  console.log("Chat log saved to Google Sheets");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { timestamp, systemPrompt, conversation, tokens } = body;

    if (!timestamp || !systemPrompt || !conversation || !Array.isArray(conversation)) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: timestamp, systemPrompt, conversation" },
        { status: 400 }
      );
    }

    const logData: ChatLog = {
      timestamp,
      systemPrompt,
      conversation,
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
