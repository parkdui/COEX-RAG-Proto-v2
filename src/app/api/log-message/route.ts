import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/utils';
import { google } from 'googleapis';

// Google Sheets 인증 및 클라이언트 생성 헬퍼 함수
async function getGoogleSheetsClient() {
  const LOG_GOOGLE_SHEET_ID = getEnv("LOG_GOOGLE_SHEET_ID");
  const LOG_GOOGLE_SHEET_NAME = getEnv("LOG_GOOGLE_SHEET_NAME", "Sheet2");
  const LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL =
    getEnv("LOG_GOOGLE_SHEET_ACCOUNT_EMAIL") || getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  let LOG_GOOGLE_PRIVATE_KEY =
    getEnv("LOG_GOOGLE_SHEET_PRIVATE_KEY") || getEnv("GOOGLE_PRIVATE_KEY");

  if (!LOG_GOOGLE_SHEET_ID || !LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL || !LOG_GOOGLE_PRIVATE_KEY) {
    return null;
  }

  // 개인 키 형식 처리
  if (LOG_GOOGLE_PRIVATE_KEY) {
    LOG_GOOGLE_PRIVATE_KEY = LOG_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    LOG_GOOGLE_PRIVATE_KEY = LOG_GOOGLE_PRIVATE_KEY.replace(/^"(.*)"$/, '$1');
    LOG_GOOGLE_PRIVATE_KEY = LOG_GOOGLE_PRIVATE_KEY.replace(/\n$/, '');
  }

  try {
    const auth = new google.auth.JWT({
      email: LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: LOG_GOOGLE_PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    return { sheets, LOG_GOOGLE_SHEET_ID, LOG_GOOGLE_SHEET_NAME };
  } catch (error) {
    console.error("[log-message] Failed to create Google Sheets client:", error);
    return null;
  }
}

// chat/route.ts의 findOrCreateSessionRow 함수와 동일한 로직 사용
async function findOrCreateSessionRow(sessionId: string, timestamp: string, systemPrompt: string, messageNumber: number, providedRowIndex?: number | null): Promise<number> {
  const client = await getGoogleSheetsClient();
  if (!client) {
    throw new Error("Google Sheets client not available");
  }
  const { sheets, LOG_GOOGLE_SHEET_ID, LOG_GOOGLE_SHEET_NAME } = client;

  if (messageNumber === 1) {
    // 새 row 생성
    const newRow = [
      sessionId,
      timestamp,
      systemPrompt.substring(0, 1000),
    ];
    for (let i = 0; i < 13; i++) {
      newRow.push("");
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!A:P`,
      valueInputOption: "RAW",
      requestBody: {
        values: [newRow]
      },
    });

    const updatedData = await sheets.spreadsheets.values.get({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!A:A`,
    });

    return (updatedData.data.values?.length || 1);
  } else {
    // 기존 row 찾기
    if (providedRowIndex && providedRowIndex > 0) {
      return providedRowIndex;
    }

    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!A:D`,
    });

    if (existingData.data.values) {
      for (let i = existingData.data.values.length - 1; i >= 1; i--) {
        const row = existingData.data.values[i];
        if (row && row[3] && row[3].trim() !== "") {
          if (row[0] === sessionId) {
            return i + 1;
          }
        }
      }
    }

    throw new Error("Row not found");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, messageNumber, userMessage, aiMessage, timestamp, systemPrompt, rowIndex } = body;

    if (!sessionId || !messageNumber || !userMessage || !aiMessage) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, messageNumber, userMessage, aiMessage" },
        { status: 400 }
      );
    }

    const client = await getGoogleSheetsClient();
    if (!client) {
      return NextResponse.json(
        { error: "Google Sheets client not available" },
        { status: 500 }
      );
    }

    const { sheets, LOG_GOOGLE_SHEET_ID, LOG_GOOGLE_SHEET_NAME } = client;

    // rowIndex 찾기 또는 생성
    let actualRowIndex: number;
    try {
      actualRowIndex = await findOrCreateSessionRow(
        sessionId,
        timestamp || new Date().toISOString(),
        systemPrompt || '',
        messageNumber,
        rowIndex
      );
    } catch (error) {
      console.error("[log-message] Failed to find or create session row:", error);
      return NextResponse.json(
        { error: "Failed to find or create session row" },
        { status: 500 }
      );
    }

    // 사용자 메시지 저장 (D column부터)
    const userColumnIndex = 3 + (messageNumber - 1) * 2; // D=3, F=5, H=7, J=9, L=11, N=13
    const userColumnLetter = String.fromCharCode(65 + userColumnIndex);

    await sheets.spreadsheets.values.update({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!${userColumnLetter}${actualRowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[userMessage.substring(0, 1000)]]
      },
    });

    // AI 메시지 저장 (E column부터)
    const aiColumnIndex = 4 + (messageNumber - 1) * 2; // E=4, G=6, I=8, K=10, M=12, O=14
    const aiColumnLetter = String.fromCharCode(65 + aiColumnIndex);

    await sheets.spreadsheets.values.update({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!${aiColumnLetter}${actualRowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[aiMessage.substring(0, 1000)]]
      },
    });

    return NextResponse.json({
      ok: true,
      rowIndex: actualRowIndex,
      message: "Messages logged successfully"
    });
  } catch (error) {
    console.error("[log-message] Error logging messages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}



