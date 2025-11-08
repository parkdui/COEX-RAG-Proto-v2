import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// 환경 변수 직접 로드
const LOG_GOOGLE_SHEET_ID = process.env.LOG_GOOGLE_SHEET_ID;
const LOG_GOOGLE_SHEET_NAME = process.env.LOG_GOOGLE_SHEET_NAME || "Sheet2";
const LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL =
  process.env.LOG_GOOGLE_SHEET_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
// 개인 키 형식 처리 - 여러 방법 시도
let LOG_GOOGLE_PRIVATE_KEY =
  process.env.LOG_GOOGLE_SHEET_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
if (LOG_GOOGLE_PRIVATE_KEY) {
  console.log('Original private key (first 100 chars):', LOG_GOOGLE_PRIVATE_KEY.substring(0, 100));
  
  // 환경 변수에서 개행 문자 처리
  LOG_GOOGLE_PRIVATE_KEY = LOG_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  // 따옴표 제거 (환경 변수에서 자동으로 추가된 경우)
  LOG_GOOGLE_PRIVATE_KEY = LOG_GOOGLE_PRIVATE_KEY.replace(/^"(.*)"$/, '$1');
  // 끝의 불필요한 \n 제거
  LOG_GOOGLE_PRIVATE_KEY = LOG_GOOGLE_PRIVATE_KEY.replace(/\n$/, '');
  
  console.log('Processed private key (first 100 chars):', LOG_GOOGLE_PRIVATE_KEY.substring(0, 100));
  console.log('Private key ends with:', LOG_GOOGLE_PRIVATE_KEY.substring(LOG_GOOGLE_PRIVATE_KEY.length - 50));
}

// 디버깅용 로그
console.log("Log-chat Environment variables check:");
console.log("LOG_GOOGLE_SHEET_ID:", LOG_GOOGLE_SHEET_ID ? "SET" : "NOT SET");
console.log("LOG_GOOGLE_SHEET_NAME:", LOG_GOOGLE_SHEET_NAME);
console.log("LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL:", LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL ? "SET" : "NOT SET");
console.log("LOG_GOOGLE_PRIVATE_KEY:", LOG_GOOGLE_PRIVATE_KEY ? "SET" : "NOT SET");
console.log("LOG_GOOGLE_PRIVATE_KEY starts with:", LOG_GOOGLE_PRIVATE_KEY?.substring(0, 50) || "N/A");

// 로그 시트 범위 (로그 전용 시트 사용)
const LOG_SHEET_RANGE = `${LOG_GOOGLE_SHEET_NAME}!A:Z`;

interface ChatLog {
  timestamp: string;
  systemPrompt: string;
  conversation: Array<{
    userMessage: string;
    aiMessage: string;
  }>;
}

async function logToGoogleSheet(logData: ChatLog) {
  console.log('=== logToGoogleSheet called ===');
  console.log('LOG_GOOGLE_SHEET_ID:', LOG_GOOGLE_SHEET_ID ? 'SET' : 'NOT SET');
  console.log('LOG_GOOGLE_SHEET_NAME:', LOG_GOOGLE_SHEET_NAME);
  console.log('LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL:', LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'SET' : 'NOT SET');
  console.log('LOG_GOOGLE_PRIVATE_KEY:', LOG_GOOGLE_PRIVATE_KEY ? 'SET' : 'NOT SET');
  console.log('LOG_GOOGLE_PRIVATE_KEY length:', LOG_GOOGLE_PRIVATE_KEY?.length || 0);
  
  if (!LOG_GOOGLE_SHEET_ID || !LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL || !LOG_GOOGLE_PRIVATE_KEY) {
    throw new Error("Google Sheets API credentials are not set");
  }

  // 더 현대적인 인증 방식 사용
  const auth = new google.auth.JWT({
    email: LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: LOG_GOOGLE_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  // 인증 테스트
  try {
    await auth.authorize();
    console.log('Google Auth client created successfully');
  } catch (authError) {
    console.error('Google Auth client creation failed:', authError);
    const errorMessage = authError instanceof Error ? authError.message : String(authError);
    throw new Error(`Authentication failed: ${errorMessage}`);
  }

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
  } catch {
    console.log("Header check failed, will try to add headers");
  }

  // 데이터 추가 - 올바른 형식으로 변환
  const rowData = [
    logData.timestamp,
    logData.systemPrompt.substring(0, 1000) // 구글 시트 셀 제한 고려
  ];

  // 대화 내용을 C열부터 번갈아가며 배치
  logData.conversation.forEach((conv) => {
    rowData.push(conv.userMessage.substring(0, 1000));
    rowData.push(conv.aiMessage.substring(0, 1000));
  });

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
    console.log('=== LOG-CHAT API CALLED ===');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const body = await request.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));
    
    const { timestamp, systemPrompt, conversation } = body;

    if (!timestamp || !systemPrompt || !conversation || !Array.isArray(conversation)) {
      console.error('Missing required fields:', { timestamp: !!timestamp, systemPrompt: !!systemPrompt, conversation: !!conversation, isArray: Array.isArray(conversation) });
      return NextResponse.json(
        { ok: false, error: "Missing required fields: timestamp, systemPrompt, conversation" },
        { status: 400 }
      );
    }

    const logData: ChatLog = {
      timestamp,
      systemPrompt,
      conversation
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
