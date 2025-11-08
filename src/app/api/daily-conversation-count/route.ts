import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// 환경 변수 로드
const LOG_GOOGLE_SHEET_ID = process.env.LOG_GOOGLE_SHEET_ID;
const LOG_GOOGLE_SHEET_NAME = process.env.LOG_GOOGLE_SHEET_NAME || "Sheet2";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

if (GOOGLE_PRIVATE_KEY) {
  GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.replace(/^"(.*)"$/, '$1');
  GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.replace(/\n$/, '');
}

async function getTodayConversationCount(): Promise<number> {
  if (!LOG_GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.warn("Google Sheets API credentials are not set, returning default count");
    return 538; // 기본값 (fallback)
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 모든 데이터 가져오기 (B열은 타임스탬프, A열은 세션 ID)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!A:B`, // 세션 ID와 타임스탬프만 가져오기
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      // 헤더만 있거나 데이터가 없으면 0
      return 0;
    }

    // 오늘 날짜 생성 (YYYY-MM-DD 형식) - 한국 시간대 기준
    const now = new Date();
    // 한국 시간대 (Asia/Seoul)로 포맷
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const todayStr = formatter.format(now); // YYYY-MM-DD 형식

    // 타임스탬프가 오늘 날짜인 세션 수 세기
    const uniqueSessions = new Set<string>(); // 중복 세션 제거용

    // 첫 번째 행은 헤더이므로 제외하고 시작
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const sessionId = row[0];
      const timestamp = row[1];

      if (!sessionId || !timestamp) continue;

      // 타임스탬프에서 날짜 부분 추출
      // 형식: "YYYY-MM-DD HH:MM:SS (KST)" 또는 "YYYY-MM-DD HH:MM:SS"
      const timestampStr = timestamp.toString().trim();
      // 공백이나 괄호 전까지의 날짜 부분 추출
      const timestampDateStr = timestampStr.split(' ')[0];
      
      // 오늘 날짜와 비교
      if (timestampDateStr === todayStr) {
        uniqueSessions.add(sessionId.toString());
      }
    }

    const count = uniqueSessions.size;

    // 데이터가 없으면 0 반환 (새로운 하루의 첫 사용자일 수 있음)
    // 하지만 기본값을 538로 설정하여 기존 동작 유지
    return count;
  } catch (error) {
    console.error("Error getting today's conversation count:", error);
    // 에러 발생 시 기본값 반환
    return 538;
  }
}

export async function GET() {
  try {
    const count = await getTodayConversationCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error in daily-conversation-count API:', error);
    return NextResponse.json(
      { count: 538, error: String(error) }, // 에러 시에도 기본값 반환
      { status: 500 }
    );
  }
}

