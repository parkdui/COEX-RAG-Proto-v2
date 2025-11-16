import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// 환경 변수 로드
const LOG_GOOGLE_SHEET_ID = process.env.LOG_GOOGLE_SHEET_ID;
const LOG_GOOGLE_SHEET_NAME = process.env.LOG_GOOGLE_SHEET_NAME || "Sheet2";
const LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL =
  process.env.LOG_GOOGLE_SHEET_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let LOG_GOOGLE_PRIVATE_KEY =
  process.env.LOG_GOOGLE_SHEET_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;

if (LOG_GOOGLE_PRIVATE_KEY) {
  LOG_GOOGLE_PRIVATE_KEY = LOG_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  LOG_GOOGLE_PRIVATE_KEY = LOG_GOOGLE_PRIVATE_KEY.replace(/^"(.*)"$/, '$1');
  LOG_GOOGLE_PRIVATE_KEY = LOG_GOOGLE_PRIVATE_KEY.replace(/\n$/, '');
}

async function getTodayConversationCount(): Promise<number> {
  if (!LOG_GOOGLE_SHEET_ID || !LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL || !LOG_GOOGLE_PRIVATE_KEY) {
    console.warn("Google Sheets API credentials are not set, returning default count");
    return 538; // 기본값 (fallback)
  }

  try {
    const auth = new google.auth.JWT({
      email: LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: LOG_GOOGLE_PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 모든 데이터 가져오기 (A열: 세션 ID, B열: 타임스탬프, D열: 첫 번째 사용자 메시지)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!A:D`, // 세션 ID, 타임스탬프, 시스템 프롬프트, 첫 번째 사용자 메시지
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

    // 타임스탬프가 오늘 날짜인 row 수 세기
    // 진행 중인 대화도 포함 (D column에 사용자 메시지가 있는 row)
    // 같은 세션 ID를 가진 row가 여러 개 있을 수 있으므로, row 수를 직접 세기
    let count = 0;

    // 첫 번째 행은 헤더이므로 제외하고 시작
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const sessionId = row[0];
      const timestamp = row[1];
      const firstUserMessage = row[3]; // D column (첫 번째 사용자 메시지)

      if (!sessionId || !timestamp) continue;

      // 타임스탬프에서 날짜 부분 추출
      // 형식: "YYYY-MM-DD HH:MM:SS (KST)" 또는 "YYYY-MM-DD HH:MM:SS"
      const timestampStr = timestamp.toString().trim();
      // 공백이나 괄호 전까지의 날짜 부분 추출
      const timestampDateStr = timestampStr.split(' ')[0];
      
      // 오늘 날짜와 비교
      if (timestampDateStr === todayStr) {
        // D column에 사용자 메시지가 있으면 진행 중인 대화로 간주
        // 진행 중인 대화도 카운트에 포함
        if (firstUserMessage && firstUserMessage.toString().trim() !== "") {
          count++;
        }
      }
    }

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

