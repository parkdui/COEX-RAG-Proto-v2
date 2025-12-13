import { NextRequest, NextResponse } from 'next/server';
import { getEnv, cosineSim, removeEmojiLikeExpressions } from '@/lib/utils';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

// ENV 로드
const APP_ID = getEnv("APP_ID", "testapp");
const TOP_K = parseInt(getEnv("TOP_K", "1"), 10); // 기본값 2 → 1로 변경 (토큰 절감 극대화)

// 1) Embedding/Segmentation BASE
let HLX_BASE = getEnv(
  "HYPERCLOVAX_API_BASE",
  "https://clovastudio.apigw.ntruss.com"
);
const HLX_KEY = getEnv("HYPERCLOVAX_API_KEY");
const EMB_MODEL = getEnv("HYPERCLOVAX_EMBED_MODEL", "clir-emb-dolphin");

// stream 도메인이면 apigw로 교체
if (/clovastudio\.stream\.ntruss\.com/.test(HLX_BASE)) {
  HLX_BASE = HLX_BASE.replace(
    "clovastudio.stream.ntruss.com",
    "clovastudio.apigw.ntruss.com"
  );
}
// /testapp|/serviceapp 경로 없으면 붙이기
if (!/\/(testapp|serviceapp)(\/|$)/.test(HLX_BASE)) {
  HLX_BASE = HLX_BASE.replace(/\/$/, "") + "/" + APP_ID;
}

// 2) Chat BASE - extract-keywords와 정확히 동일한 방식
let CLOVA_BASE = getEnv(
  "CLOVA_API_BASE",
  "https://clovastudio.apigw.ntruss.com"
);

// /testapp|/serviceapp 경로 없으면 붙이기 (extract-keywords와 동일)
if (!/\/(testapp|serviceapp)(\/|$)/.test(CLOVA_BASE)) {
  CLOVA_BASE = CLOVA_BASE.replace(/\/$/, "") + "/" + APP_ID;
}
const CLOVA_KEY = getEnv("CLOVA_API_KEY");
const CLOVA_MODEL = getEnv("CLOVA_MODEL", "HCX-005");

// 파일 경로
const VECTORS_JSON = path.join(process.cwd(), "data", "vectors.json");
const systemPromptPath = path.join(process.cwd(), "public", "LLM", "system_prompt.txt");

// ==== Token counters ====
const TOKENS = {
  embed_input: 0,
  embed_calls: 0,
  chat_input: 0,
  chat_output: 0,
  chat_total: 0,
  chat_calls: 0,
  classification_input: 0,
  classification_output: 0,
  classification_total: 0,
  classification_calls: 0,
};

// ====== HyperCLOVAX Embedding API ======
async function embedText(text: string) {
  if (!text || !text.trim()) throw new Error("empty text for embedding");
  
  // Embedding API input 토큰 절감: 질문 길이 제한 (50자로 제한)
  const truncatedText = text.length > 50 ? text.substring(0, 50) : text;
  
  if (process.env.LOG_TOKENS === "1") {
    console.log(`📦 [EMBEDDING] 텍스트: "${truncatedText.substring(0, 30)}..." (${truncatedText.length}자, 약 ${Math.round(truncatedText.length * 1.4)} tokens)`);
  }
  
  if (!HLX_KEY) {
    throw new Error("HYPERCLOVAX_API_KEY environment variable is not set");
  }

  const url = `${HLX_BASE}/v1/api-tools/embedding/${EMB_MODEL}`;
  const headers = {
    Authorization: `Bearer ${HLX_KEY}`,
    "Content-Type": "application/json",
    "X-NCP-CLOVASTUDIO-REQUEST-ID": `emb-${Date.now()}-${Math.random()}`,
  };

  // v1
  let res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ text: truncatedText }),
  });

  // 4xx면 v2
  if (!res.ok && res.status >= 400 && res.status < 500) {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ texts: [truncatedText] }),
    });
  }

  const raw = await res.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Embedding invalid JSON: ${raw.slice(0, 300)}`);
  }

  const codeRaw = json?.status?.code ?? json?.code;
  const isOk = codeRaw === 20000 || codeRaw === "20000" || codeRaw == null;
  if (!isOk) {
    const msg = json?.status?.message || json?.message || "(no message)";
    throw new Error(`Embedding API status=${codeRaw} message=${msg}`);
  }

  // embedding token usage logging
  const embUsage = json?.result?.usage ?? json?.usage ?? {};
  const embInput =
    Number(
      json?.result?.inputTokens ??
        json?.inputTokens ??
        embUsage.inputTokens ??
        0
    ) || 0;

  TOKENS.embed_input += embInput;
  TOKENS.embed_calls += 1;

  if (process.env.LOG_TOKENS === "1") {
    console.log(
      `📦 [EMB] inputTokens=${embInput} (acc=${TOKENS.embed_input}, calls=${TOKENS.embed_calls})`
    );
  }

  const emb = extractEmbedding(json);
  if (!emb) {
    throw new Error("Embedding response missing vector");
  }
  return emb;
}

function extractEmbedding(json: any) {
  const cands = [
    json?.result?.embedding,
    json?.embedding,
    json?.result?.embeddings?.[0],
    json?.embeddings?.[0],
    json?.result?.embeddings?.[0]?.values,
    json?.result?.embeddings?.[0]?.vector,
    json?.embeddings?.[0]?.values,
    json?.embeddings?.[0]?.vector,
  ];
  for (const c of cands) {
    if (!c) continue;
    if (Array.isArray(c) && typeof c[0] === "number") return c;
    if (Array.isArray(c?.values) && typeof c.values[0] === "number")
      return c.values;
    if (Array.isArray(c?.vector) && typeof c.vector[0] === "number")
      return c.vector;
  }
  return null;
}

// ====== 정보 요구 질문 판별 함수 ======
async function isInfoRequestQuestion(question: string): Promise<boolean> {
  // 키워드 기반 판별만 사용 (Classification API 호출 완전 제거)
  const infoKeywords = [
    '추천', '알려', '어디', '어떤', '정보', '위치', '일정', 
    '식당', '카페', '이벤트', '전시', '행사', '장소', '곳',
    '보여', '가르쳐', '안내', '소개', '찾아', '보고'
  ];
  const hasInfoKeyword = infoKeywords.some(keyword => question.includes(keyword));
  
  // 키워드 기반 판별만 사용 (토큰 절감)
  if (process.env.LOG_TOKENS === "1") {
    console.log(
      `🔍 [CLASSIFY] question="${question.substring(0, 30)}..." isInfoRequest=${hasInfoKeyword} (키워드 기반)`
    );
  }
  
  return hasInfoKeyword;
}

// ====== CLOVA Chat Completions v3 (non-stream) ======
async function callClovaChat(messages: any[], opts: any = {}) {
  // extract-keywords와 정확히 동일: URL 구성만 하고 바로 사용
  const url = `${CLOVA_BASE}/v3/chat-completions/${CLOVA_MODEL}`;
  
  // 디버깅: URL 로깅
  console.log(`🔗 [CLOVA] API URL: ${url}`);
  console.log(`🔗 [CLOVA] CLOVA_BASE: ${CLOVA_BASE}, MODEL: ${CLOVA_MODEL}, APP_ID: ${APP_ID}`);

  // 메시지 포맷 변환
  const wrappedMessages = messages.map((m) => ({
    role: m.role,
    content: [{ type: "text", text: m.content }],
  }));

  const body = {
    messages: wrappedMessages,
    temperature: opts.temperature ?? 0.3,
    topP: opts.topP ?? 0.8,
    topK: opts.topK ?? 0,
    maxTokens: opts.maxTokens ?? 700,
    repeatPenalty: opts.repeatPenalty ?? 1.1,
    stop: [],
  };

  // extract-keywords와 동일한 fetch 호출
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOVA_KEY}`,
      "Content-Type": "application/json; charset=utf-8",
      "X-NCP-CLOVASTUDIO-REQUEST-ID": `req-${Date.now()}`,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error(`❌ [CLOVA] API Error ${res.status}: ${errorText}`);
    console.error(`❌ [CLOVA] Request URL: ${url}`);
    console.error(`❌ [CLOVA] CLOVA_BASE: ${CLOVA_BASE}`);
    console.error(`❌ [CLOVA] CLOVA_MODEL: ${CLOVA_MODEL}`);
    throw new Error(
      `CLOVA chat failed ${res.status}: ${errorText}`
    );
  }
  const json = await res.json();

  // chat token usage logging
  const chatUsage =
    json?.result?.usage ||
    json?.usage ||
    {};

  const chatIn = Number(chatUsage.promptTokens ?? 0);
  const chatOut = Number(chatUsage.completionTokens ?? 0);
  const chatTotal = Number(chatUsage.totalTokens ?? chatIn + chatOut);

  // 응답 내용 추출
  let responseContent =
    json?.result?.message?.content?.[0]?.text ||
    json?.result?.message?.content ||
    "";
  
  // 응답이 비어있거나 너무 짧을 때 기본 메시지 제공
  if (!responseContent || responseContent.trim().length < 5) {
    responseContent = '안녕하세요! 코엑스에서 무엇을 도와드릴까요?';
    console.warn(`[WARNING] CLOVA API 응답이 비어있거나 너무 짧습니다. 기본 메시지 사용: "${responseContent}"`);
  }

  // classification 호출인지 확인 (메시지가 2개이고 system + user 구조이며, 짧은 프롬프트인 경우)
  const isClassificationCall = 
    messages.length === 2 &&
    messages[0]?.role === "system" &&
    messages[1]?.role === "user" &&
    (messages[1]?.content?.includes("코엑스 이벤트/장소/식당 정보를 요구") || 
     messages[0]?.content === "YES 또는 NO만 답변.");

  if (isClassificationCall) {
    TOKENS.classification_input += chatIn;
    TOKENS.classification_output += chatOut;
    TOKENS.classification_total += chatTotal;
    TOKENS.classification_calls += 1;

    if (process.env.LOG_TOKENS === "1" || process.env.LOG_API_INPUT === "1") {
      console.log(
        `🔍 [CLASSIFY] in=${chatIn} out=${chatOut} total=${chatTotal} ` +
          `(acc_total=${TOKENS.classification_total}, calls=${TOKENS.classification_calls})`
      );
    }
  } else {
    TOKENS.chat_input += chatIn;
    TOKENS.chat_output += chatOut;
    TOKENS.chat_total += chatTotal;
    TOKENS.chat_calls += 1;

    // 상세 로깅: API 응답 후 실제 토큰 사용량 출력
    if (process.env.LOG_TOKENS === "1" || process.env.LOG_API_INPUT === "1") {
      console.log("\n" + "=".repeat(80));
      console.log("📥 [API RESPONSE] CLOVA Chat API 응답");
      console.log("=".repeat(80));
      console.log(`💬 [CHAT] input=${chatIn} output=${chatOut} total=${chatTotal}`);
      console.log(`💬 [CHAT] 누적: input=${TOKENS.chat_input} output=${TOKENS.chat_output} total=${TOKENS.chat_total} (calls=${TOKENS.chat_calls})`);
      console.log(`📝 [RESPONSE] ${responseContent.substring(0, 100)}${responseContent.length > 100 ? '...' : ''}`);
      console.log("=".repeat(80) + "\n");
    }
  }

  // 응답 형태 호환 처리
  return {
    content: responseContent,
    tokens: {
      input: chatIn,
      output: chatOut,
      total: chatTotal,
    },
  };
}

function logTokenSummary(tag = "") {
  if (process.env.LOG_TOKENS === "1") {
    console.log(
      `🧮 [TOKENS${tag ? " " + tag : ""}] ` +
        `EMB in=${TOKENS.embed_input} (calls=${TOKENS.embed_calls}) | ` +
        `CLASSIFY in=${TOKENS.classification_input} out=${TOKENS.classification_output} total=${TOKENS.classification_total} (calls=${TOKENS.classification_calls}) | ` +
        `CHAT in=${TOKENS.chat_input} out=${TOKENS.chat_output} total=${TOKENS.chat_total} ` +
        `(calls=${TOKENS.chat_calls})`
    );
  }
}

// Google Sheets 로그 저장 함수
interface ChatLog {
  timestamp: string;
  systemPrompt: string;
  conversation: Array<{
    userMessage: string;
    aiMessage: string;
  }>;
}

interface SessionChatLog extends ChatLog {
  sessionId: string;
}


// Google Sheets 인증 및 클라이언트 생성 헬퍼 함수
async function getGoogleSheetsClient() {
  const LOG_GOOGLE_SHEET_ID = process.env.LOG_GOOGLE_SHEET_ID;
  const LOG_GOOGLE_SHEET_NAME = process.env.LOG_GOOGLE_SHEET_NAME || "Sheet2";
  const LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL =
    process.env.LOG_GOOGLE_SHEET_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let LOG_GOOGLE_PRIVATE_KEY =
    process.env.LOG_GOOGLE_SHEET_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  
  if (!LOG_GOOGLE_SHEET_ID || !LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL || !LOG_GOOGLE_PRIVATE_KEY) {
    // 환경 변수가 없으면 null 반환 (로깅 스킵)
    console.warn("[Google Sheets] Credentials not set, skipping logging");
    console.warn(`[Google Sheets] LOG_GOOGLE_SHEET_ID: ${LOG_GOOGLE_SHEET_ID ? 'set' : 'NOT SET'}`);
    console.warn(`[Google Sheets] LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL: ${LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'set' : 'NOT SET'}`);
    console.warn(`[Google Sheets] LOG_GOOGLE_PRIVATE_KEY: ${LOG_GOOGLE_PRIVATE_KEY ? 'set' : 'NOT SET'}`);
    return null;
  }

  // 개인 키 형식 처리
  if (LOG_GOOGLE_PRIVATE_KEY) {
    LOG_GOOGLE_PRIVATE_KEY = LOG_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    LOG_GOOGLE_PRIVATE_KEY = LOG_GOOGLE_PRIVATE_KEY.replace(/^"(.*)"$/, '$1');
    LOG_GOOGLE_PRIVATE_KEY = LOG_GOOGLE_PRIVATE_KEY.replace(/\n$/, '');
  }

  try {
    // Google Auth 설정
    const auth = new google.auth.JWT({
      email: LOG_GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: LOG_GOOGLE_PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    console.log("[Google Sheets] Client created successfully");
    return { sheets, LOG_GOOGLE_SHEET_ID, LOG_GOOGLE_SHEET_NAME };
  } catch (error) {
    console.error("[Google Sheets] Failed to create client:", error);
    console.error("[Google Sheets] Error details:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

// 헤더 확인 및 추가 함수
async function ensureHeaders() {
  try {
    const client = await getGoogleSheetsClient();
    if (!client) {
      return; // 클라이언트가 없으면 스킵
    }
    const { sheets, LOG_GOOGLE_SHEET_ID, LOG_GOOGLE_SHEET_NAME } = client;
    
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!A1:P1`,
    });

    if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
      // 헤더 추가 (세션 ID, 일시, 시스템 프롬프트, 대화 메시지들, Token 합계)
      const headers = ["세션 ID", "일시", "시스템 프롬프트"];
      for (let i = 0; i < 10; i++) {
        headers.push(`사용자 메시지 ${i + 1}`);
        headers.push(`AI 메시지 ${i + 1}`);
      }
      headers.push("Token 합계"); // P column
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: LOG_GOOGLE_SHEET_ID,
        range: `${LOG_GOOGLE_SHEET_NAME}!A1:P1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [headers]
        }
      });
    }
  } catch (error) {
    console.error("Error ensuring headers:", error);
  }
}

// 세션의 마지막 질문 번호 찾기 (Google Sheets에서 확인)
async function findLastMessageNumber(sessionId: string): Promise<number> {
  const client = await getGoogleSheetsClient();
  if (!client) {
    return 0; // 클라이언트가 없으면 0 반환
  }
  const { sheets, LOG_GOOGLE_SHEET_ID, LOG_GOOGLE_SHEET_NAME } = client;
  
  try {
    // A~N column까지 가져와서 마지막 질문 번호 확인
    // D, F, H, J, L, N 열에 질문이 저장됨
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!A:N`, // A~N column 확인
    });

    if (existingData.data.values) {
      // 가장 최근 row부터 검색 (뒤에서부터)
      for (let i = existingData.data.values.length - 1; i >= 1; i--) {
        const row = existingData.data.values[i];
        if (row && row[0] === sessionId) {
          // D(3), F(5), H(7), J(9), L(11), N(13) 열을 확인하여 마지막 질문 번호 찾기
          for (let msgNum = 6; msgNum >= 1; msgNum--) {
            const columnIndex = 3 + (msgNum - 1) * 2; // D=3, F=5, H=7, J=9, L=11, N=13
            if (row[columnIndex] && row[columnIndex].trim() !== "") {
              console.log(`[Google Sheets] Found last message number: ${msgNum} for sessionId: ${sessionId}`);
              return msgNum;
            }
          }
          // 질문이 없으면 0 반환
          return 0;
        }
      }
    }
    return 0; // 세션을 찾지 못했으면 0
  } catch (error) {
    console.error("[Google Sheets] Error finding last message number:", error);
    return 0;
  }
}

// 세션의 row index 찾기 또는 생성
async function findOrCreateSessionRow(sessionId: string, timestamp: string, systemPrompt: string, messageNumber: number): Promise<number> {
  const client = await getGoogleSheetsClient();
  if (!client) {
    throw new Error("Google Sheets client not available");
  }
  const { sheets, LOG_GOOGLE_SHEET_ID, LOG_GOOGLE_SHEET_NAME } = client;
  
  console.log(`[Google Sheets] Finding or creating session row: sessionId=${sessionId}, messageNumber=${messageNumber}`);
  
  // 헤더 확인
  await ensureHeaders();
  
  // 첫 번째 질문일 때는 기존 row가 이미 사용 중인지 확인
  if (messageNumber === 1) {
    // 기존 세션 로그가 있는지 확인
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!A:D`, // A~D column까지 가져와서 D column 확인
    });

    if (existingData.data.values) {
      // 헤더 행(1행) 제외하고 가장 최근 row부터 검색 (뒤에서부터)
      for (let i = existingData.data.values.length - 1; i >= 1; i--) {
        const row = existingData.data.values[i];
        if (row && row[0] === sessionId) {
          // D column (index 3)에 값이 있는지 확인
          // 값이 있으면 이미 사용 중인 row이므로 새로운 row 생성
          if (row[3] && row[3].trim() !== "") {
            // 기존 row가 사용 중이므로 새로운 row 생성
            console.log(`[Google Sheets] Session ${sessionId} already has a row with data at index ${i + 1}, creating new row`);
            break;
          } else {
            // D column이 비어있으면 기존 row 사용 (이론적으로는 발생하지 않아야 함)
            console.log(`[Google Sheets] Found empty row for session ${sessionId} at index ${i + 1}, reusing it`);
            return i + 1; // 1-based index
          }
        }
      }
    }
    
    // 기존 row가 없거나 모두 사용 중이면 새 row 생성
    const newRow = [
      sessionId,
      timestamp,
      systemPrompt.substring(0, 1000),
    ];
    // 나머지 컬럼은 빈 값으로 채움 (D부터 P까지)
    for (let i = 0; i < 13; i++) { // D~P까지 13개 컬럼 (사용자 메시지 6개 + AI 메시지 6개 + Token 합계 1개)
      newRow.push("");
    }
    
    console.log(`[Google Sheets] Creating new row for session: ${sessionId}`);
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!A:P`,
      valueInputOption: "RAW",
      requestBody: {
        values: [newRow]
      },
    });
    
    // 새로 추가된 row의 index 반환
    const updatedData = await sheets.spreadsheets.values.get({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!A:A`,
    });
    
    const rowIndex = (updatedData.data.values?.length || 1); // 1-based index
    console.log(`[Google Sheets] New row created at index: ${rowIndex}`);
    return rowIndex;
  } else {
    // 두 번째 질문 이후는 가장 최근에 생성된 row를 찾아서 사용
    // sessionId가 매번 달라질 수 있으므로, 가장 최근 row를 찾아서 사용
    // D column에 값이 있는 가장 최근 row = 첫 번째 질문이 저장된 row
    let existingRowIndex = -1;
    const maxRetries = 20; // 최대 20번 재시도 (4초 대기)
    const retryDelay = 200; // 200ms
    
    for (let retry = 0; retry < maxRetries; retry++) {
      // A~D column까지 가져와서 D column에 값이 있는 가장 최근 row 찾기
      const existingData = await sheets.spreadsheets.values.get({
        spreadsheetId: LOG_GOOGLE_SHEET_ID,
        range: `${LOG_GOOGLE_SHEET_NAME}!A:D`, // A~D column 확인
      });

      if (existingData.data.values) {
        // 헤더 행(1행) 제외하고 가장 최근 row부터 검색 (뒤에서부터)
        // sessionId와 관계없이 D column에 값이 있는 가장 최근 row를 찾음
        for (let i = existingData.data.values.length - 1; i >= 1; i--) {
          const row = existingData.data.values[i];
          if (row && row[3] && row[3].trim() !== "") {
            // D column (index 3)에 값이 있으면 첫 번째 질문이 저장된 row임
            // 가장 최근 row이므로 이 row를 사용
            existingRowIndex = i + 1; // 1-based index
            console.log(`[Google Sheets] ✅ Found most recent row with data at index: ${existingRowIndex} for messageNumber: ${messageNumber} (retry: ${retry + 1})`);
            console.log(`[Google Sheets] Row sessionId: ${row[0]}, Current sessionId: ${sessionId}`);
            break;
          }
        }
      }
      
      if (existingRowIndex > 0) {
        break; // row를 찾았으면 재시도 중단
      }
      
      // row를 찾지 못했으면 잠시 대기 후 재시도
      // 동기 처리 후에도 Google Sheets API 지연으로 인해 즉시 조회되지 않을 수 있음
      if (retry < maxRetries - 1) {
        console.log(`[Google Sheets] Row with data not found for messageNumber ${messageNumber}, retrying... (${retry + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    if (existingRowIndex > 0) {
      return existingRowIndex;
    } else {
      // 기존 row를 찾지 못한 경우 - 첫 번째 질문이 아직 저장되지 않았을 수 있음
      console.error(`[Google Sheets] ❌ CRITICAL: Row with data not found for messageNumber: ${messageNumber} after ${maxRetries} retries.`);
      console.error(`[Google Sheets] ❌ This should not happen. First question should have created a row.`);
      console.error(`[Google Sheets] ❌ SessionId: ${sessionId}, MessageNumber: ${messageNumber}`);
      throw new Error(`Session row not found for messageNumber: ${messageNumber}. First question may not have been saved.`);
    }
  }
}

// 실시간으로 사용자 메시지 저장 (D column부터 시작)
async function saveUserMessageRealtime(sessionId: string, messageNumber: number, userMessage: string, timestamp: string, systemPrompt: string) {
  try {
    const client = await getGoogleSheetsClient();
    if (!client) {
      console.warn("[Google Sheets] Client not available, skipping user message save");
      return;
    }
    const { sheets, LOG_GOOGLE_SHEET_ID, LOG_GOOGLE_SHEET_NAME } = client;
    
    console.log(`[Google Sheets] Saving user message: sessionId=${sessionId}, messageNumber=${messageNumber}`);
    
    // 세션 row 찾기 또는 생성 (messageNumber 전달)
    const rowIndex = await findOrCreateSessionRow(sessionId, timestamp, systemPrompt, messageNumber);
    
    console.log(`[Google Sheets] Row index: ${rowIndex}`);
    
    // D column부터 시작 (A=0, B=1, C=2, D=3)
    // 첫 번째 질문: D column (index 3), 두 번째 질문: F column (index 5), ...
    // 사용자 메시지1 = D (3), 사용자 메시지2 = F (5), 사용자 메시지3 = H (7), 사용자 메시지4 = J (9), 사용자 메시지5 = L (11), 사용자 메시지6 = N (13)
    const columnIndex = 3 + (messageNumber - 1) * 2; // D=3, F=5, H=7, J=9, L=11, N=13
    const columnLetter = String.fromCharCode(65 + columnIndex); // A=65
    
    console.log(`[Google Sheets] ====== SAVING USER MESSAGE ======`);
    console.log(`[Google Sheets] sessionId: ${sessionId}`);
    console.log(`[Google Sheets] messageNumber: ${messageNumber}`);
    console.log(`[Google Sheets] rowIndex: ${rowIndex}`);
    console.log(`[Google Sheets] Column calculation: 3 + (${messageNumber} - 1) * 2 = ${columnIndex} (${columnLetter})`);
    console.log(`[Google Sheets] Updating cell: ${LOG_GOOGLE_SHEET_NAME}!${columnLetter}${rowIndex}`);
    console.log(`[Google Sheets] =================================`);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!${columnLetter}${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[userMessage.substring(0, 1000)]]
      },
    });
    
    console.log(`[Google Sheets] User message saved successfully`);
  } catch (error) {
    console.error("[Google Sheets] Error saving user message in realtime:", error);
    console.error("[Google Sheets] Error details:", error instanceof Error ? error.stack : String(error));
  }
}

// 실시간으로 AI 메시지 저장 (E column부터 시작)
async function saveAIMessageRealtime(sessionId: string, messageNumber: number, aiMessage: string) {
  try {
    const client = await getGoogleSheetsClient();
    if (!client) {
      console.warn("[Google Sheets] Client not available, skipping AI message save");
      return;
    }
    const { sheets, LOG_GOOGLE_SHEET_ID, LOG_GOOGLE_SHEET_NAME } = client;
    
    console.log(`[Google Sheets] Saving AI message: sessionId=${sessionId}, messageNumber=${messageNumber}`);
    
    // 세션 row 찾기: sessionId로 가장 최근 row 찾기 (재시도 로직 포함)
    let rowIndex = -1;
    const maxRetries = 10; // 최대 10번 재시도 (2초 대기)
    const retryDelay = 200; // 200ms
    
    for (let retry = 0; retry < maxRetries; retry++) {
      // A column만 확인하여 빠르게 검색
      const existingData = await sheets.spreadsheets.values.get({
        spreadsheetId: LOG_GOOGLE_SHEET_ID,
        range: `${LOG_GOOGLE_SHEET_NAME}!A:A`,
      });

      if (existingData.data.values) {
        // 가장 최근에 생성된 row부터 검색 (뒤에서부터)
        for (let i = existingData.data.values.length - 1; i >= 1; i--) {
          const row = existingData.data.values[i];
          if (row && row[0] === sessionId) {
            rowIndex = i + 1; // 1-based index
            console.log(`[Google Sheets] Found session row at index: ${rowIndex} for AI message ${messageNumber} (retry: ${retry + 1})`);
            break;
          }
        }
      }
      
      if (rowIndex > 0) {
        break; // row를 찾았으면 재시도 중단
      }
      
      // row를 찾지 못했으면 잠시 대기 후 재시도 (사용자 메시지가 아직 저장 중일 수 있음)
      if (retry < maxRetries - 1) {
        console.log(`[Google Sheets] Session row not found for AI message ${messageNumber}, retrying... (${retry + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    if (rowIndex === -1) {
      console.error(`[Chat Log] ❌ Session ${sessionId} not found for AI message ${messageNumber} after ${maxRetries} retries`);
      return;
    }
    
    // E column부터 시작 (A=0, B=1, C=2, D=3, E=4)
    // 첫 번째 답변: E column (index 4), 두 번째 답변: G column (index 6), ...
    // AI 메시지1 = E (4), AI 메시지2 = G (6), AI 메시지3 = I (8), AI 메시지4 = K (10), AI 메시지5 = M (12), AI 메시지6 = O (14)
    const columnIndex = 4 + (messageNumber - 1) * 2; // E=4, G=6, I=8, K=10, M=12, O=14
    const columnLetter = String.fromCharCode(65 + columnIndex); // A=65
    
    console.log(`[Google Sheets] ====== SAVING AI MESSAGE ======`);
    console.log(`[Google Sheets] sessionId: ${sessionId}`);
    console.log(`[Google Sheets] messageNumber: ${messageNumber}`);
    console.log(`[Google Sheets] rowIndex: ${rowIndex}`);
    console.log(`[Google Sheets] Column calculation: 4 + (${messageNumber} - 1) * 2 = ${columnIndex} (${columnLetter})`);
    console.log(`[Google Sheets] Updating cell: ${LOG_GOOGLE_SHEET_NAME}!${columnLetter}${rowIndex}`);
    console.log(`[Google Sheets] ==============================`);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!${columnLetter}${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[aiMessage.substring(0, 1000)]]
      },
    });
    
    console.log(`[Google Sheets] AI message saved successfully`);
  } catch (error) {
    console.error("[Google Sheets] Error saving AI message in realtime:", error);
    console.error("[Google Sheets] Error details:", error instanceof Error ? error.stack : String(error));
  }
}

// 기존 Token 합계 가져오기 (P column)
async function getTokenTotal(sessionId: string): Promise<number> {
  try {
    const client = await getGoogleSheetsClient();
    if (!client) {
      return 0; // 클라이언트가 없으면 0 반환
    }
    const { sheets, LOG_GOOGLE_SHEET_ID, LOG_GOOGLE_SHEET_NAME } = client;
    
    // 세션 row 찾기 - 가장 최근 row부터 검색 (뒤에서부터)
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!A:D`, // D column까지 가져와서 사용자 메시지 확인
    });

    let rowIndex = -1;
    if (existingData.data.values) {
      // 가장 최근에 생성된 row부터 검색 (뒤에서부터)
      for (let i = existingData.data.values.length - 1; i >= 1; i--) {
        const row = existingData.data.values[i];
        if (row && row[0] === sessionId) {
          // D column (첫 번째 사용자 메시지)에 값이 있는지 확인
          // 값이 있으면 현재 진행 중인 대화 row
          if (row[3] && row[3].toString().trim() !== "") {
            rowIndex = i + 1; // 1-based index
            break;
          }
        }
      }
    }
    
    if (rowIndex === -1) {
      return 0; // 세션이 없으면 0 반환
    }
    
    // P column = index 15 (0-based)
    const tokenData = await sheets.spreadsheets.values.get({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!P${rowIndex}`,
    });
    
    if (tokenData.data.values && tokenData.data.values[0] && tokenData.data.values[0][0]) {
      return Number(tokenData.data.values[0][0]) || 0;
    }
    
    return 0;
  } catch (error) {
    console.error("Error getting token total:", error);
    return 0;
  }
}

// Token 합계 업데이트 (P column)
async function updateTokenTotal(sessionId: string, tokenTotal: number) {
  try {
    const client = await getGoogleSheetsClient();
    if (!client) {
      console.warn("[Google Sheets] Client not available, skipping token total update");
      return;
    }
    const { sheets, LOG_GOOGLE_SHEET_ID, LOG_GOOGLE_SHEET_NAME } = client;
    
    console.log(`[Google Sheets] Updating token total: sessionId=${sessionId}, tokenTotal=${tokenTotal}`);
    
    // 세션 row 찾기 - 가장 최근 row부터 검색하고, D column에 사용자 메시지가 있는지 확인
    // 재시도 로직 추가 (사용자 메시지가 저장될 때까지 대기)
    let rowIndex = -1;
    const maxRetries = 5;
    const retryDelay = 200; // 200ms
    
    for (let retry = 0; retry < maxRetries; retry++) {
      const existingData = await sheets.spreadsheets.values.get({
        spreadsheetId: LOG_GOOGLE_SHEET_ID,
        range: `${LOG_GOOGLE_SHEET_NAME}!A:D`, // D column까지 가져와서 사용자 메시지 확인
      });

      if (existingData.data.values) {
        // 가장 최근에 생성된 row부터 검색 (뒤에서부터)
        for (let i = existingData.data.values.length - 1; i >= 1; i--) {
          const row = existingData.data.values[i];
          if (row && row[0] === sessionId) {
            // D column (첫 번째 사용자 메시지)에 값이 있는지 확인
            // 값이 있으면 현재 진행 중인 대화 row
            if (row[3] && row[3].toString().trim() !== "") {
              rowIndex = i + 1; // 1-based index
              break;
            }
          }
        }
      }
      
      if (rowIndex > 0) {
        break; // row를 찾았으면 재시도 중단
      }
      
      // row를 찾지 못했으면 잠시 대기 후 재시도
      if (retry < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    if (rowIndex === -1) {
      console.error(`[Chat Log] Session ${sessionId} not found for token update after ${maxRetries} retries`);
      return;
    }
    
    // P column = index 15 (0-based)
    console.log(`[Google Sheets] Updating token total cell: ${LOG_GOOGLE_SHEET_NAME}!P${rowIndex}`);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!P${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[tokenTotal]]
      },
    });
    
    console.log(`[Google Sheets] Token total updated successfully`);
  } catch (error) {
    console.error("[Google Sheets] Error updating token total:", error);
    console.error("[Google Sheets] Error details:", error instanceof Error ? error.stack : String(error));
  }
}

// 사용하지 않는 함수 제거됨 (실시간 로깅 방식으로 대체)

export async function POST(request: NextRequest) {
  // 각 요청마다 TOKENS 초기화
  TOKENS.embed_input = 0;
  TOKENS.embed_calls = 0;
  TOKENS.chat_input = 0;
  TOKENS.chat_output = 0;
  TOKENS.chat_total = 0;
  TOKENS.chat_calls = 0;
  TOKENS.classification_input = 0;
  TOKENS.classification_output = 0;
  TOKENS.classification_total = 0;
  TOKENS.classification_calls = 0;
  
  try {
    console.log("[chat] Request received");
    
    // 환경 변수 확인
    if (!CLOVA_KEY) {
      throw new Error("CLOVA_API_KEY environment variable is not set");
    }
    if (!HLX_KEY) {
      console.warn("[chat] HYPERCLOVAX_API_KEY is not set (embedding will fail)");
    }
    
    const body = await request.json();
    console.log("[chat] Request body parsed");
    const question = (body?.question || "").trim();
    if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

    // vectors.json은 정보 요구 질문일 때만 필요하므로, 나중에 필요할 때 로드
    let vectors: any[] = [];
    if (fs.existsSync(VECTORS_JSON)) {
      try {
        vectors = JSON.parse(fs.readFileSync(VECTORS_JSON, "utf8"));
        if (!Array.isArray(vectors)) {
          vectors = [];
        }
      } catch (e) {
        console.warn("Failed to load vectors.json:", e);
        vectors = [];
      }
    }

    // 세션 ID 생성: 클라이언트에서 전달받거나, 고유한 ID 생성
    // body에서 sessionId를 받으면 사용하고, 없으면 고유한 ID 생성 (타임스탬프 + 랜덤 포함)
    let sessionId = body?.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
      // 고유한 세션 ID 생성 (타임스탬프 + 랜덤 문자열)
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const sessionString = `${timestamp}-${random}-${clientIP}-${userAgent}`;
      // 더 안전한 해시 생성
      const hash = sessionString.split('').reduce((a, b) => {
        const char = b.charCodeAt(0);
        return ((a << 5) - a) + char;
      }, 0);
      sessionId = `session-${Math.abs(hash)}-${timestamp}`;
    }
    
    console.log(`[Chat] Session ID: ${sessionId}`);
    
    // 한국 시간으로 timestamp 생성 (YYYY-MM-DD HH:MM:SS 형식)
    const now = new Date();
    const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    const timestamp = koreanTime.toISOString().replace('T', ' ').substring(0, 19) + ' (KST)';
    
    // 질문 번호 계산: Google Sheets에서 마지막 질문 번호를 확인하여 정확한 번호 사용
    // 이 방법이 가장 정확함 (history가 없어도, 전달되지 않아도 정확한 번호 사용)
    const lastMessageNumber = await findLastMessageNumber(sessionId);
    const messageNumber = lastMessageNumber + 1; // 다음 질문 번호
    
    // 디버깅: messageNumber 확인
    console.log(`[Chat] ====== MESSAGE NUMBER CALCULATION ======`);
    console.log(`[Chat] SessionId: ${sessionId}`);
    console.log(`[Chat] Last message number from Google Sheets: ${lastMessageNumber}`);
    console.log(`[Chat] Current message number: ${messageNumber}`);
    console.log(`[Chat] Body messageNumber: ${body?.messageNumber}`);
    console.log(`[Chat] History length: ${body?.history?.length || 0}`);
    console.log(`[Chat] ========================================`);
    
    // System Prompt 읽기 및 날짜 정보 추가
    let defaultSystemPrompt = "";
    try {
      if (fs.existsSync(systemPromptPath)) {
        defaultSystemPrompt = fs.readFileSync(systemPromptPath, "utf8");
      } else {
        console.warn(`[System Prompt] File not found: ${systemPromptPath}`);
      }
    } catch (e) {
      console.error("[System Prompt] Error reading file:", e);
      console.error(`[System Prompt] Path: ${systemPromptPath}`);
      console.error(`[System Prompt] CWD: ${process.cwd()}`);
    }
    
    // 현재 날짜 정보 추가 (한국 시간 기준)
    const currentDate = new Date(koreanTime);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateString = `${year}년 ${month}월 ${day}일`;
    
    // System Prompt에 날짜 정보 추가
    const activeSystemPrompt = defaultSystemPrompt 
      ? `${defaultSystemPrompt}\n\n[현재 날짜]\n오늘은 ${dateString}입니다. 모든 이벤트, 행사, 전시 등의 일정은 이 날짜를 기준으로 판단하세요.`
      : `너는 '이솔(SORI)'이라는 이름의 젊은 여성 AI 마스코트다. 코엑스를 방문한 사람과 자연스럽게 대화하며 즐거움, 영감, 새로운 시선을 선사하는 동행자다.\n\n[현재 날짜]\n오늘은 ${dateString}입니다. 모든 이벤트, 행사, 전시 등의 일정은 이 날짜를 기준으로 판단하세요.`;
    
    // 실시간 로깅: 질문 입력 시 즉시 저장 (동기적으로 처리하여 row 찾기 문제 방지)
    // 시스템 프롬프트의 첫 100자만 로그에 저장 (토큰 절감을 위해)
    const systemPromptForLog = activeSystemPrompt.substring(0, 100) + (activeSystemPrompt.length > 100 ? '...' : '');
    try {
      await saveUserMessageRealtime(sessionId, messageNumber, question, timestamp, systemPromptForLog);
      console.log(`[Chat Log] User message ${messageNumber} saved successfully`);
    } catch (error) {
      console.error('[Chat Log] Failed to save user message in realtime:', error);
      // 에러가 발생해도 메인 플로우는 계속 진행
    }

    console.log("[chat] System prompt loaded, length:", activeSystemPrompt.length);

    // 정보 요구 질문인지 판별
    const isInfoRequest = await isInfoRequestQuestion(question);
    console.log("[chat] Question classification:", isInfoRequest ? "정보 요구" : "일반 대화");

    let context = "";
    let slimHits: any[] = [];

    // 정보 요구 질문인 경우에만 임베딩 및 RAG 검색 수행
    if (isInfoRequest) {
      // vectors.json이 없거나 비어있으면 에러 반환
      if (!fs.existsSync(VECTORS_JSON) || vectors.length === 0) {
        return NextResponse.json({
          error: "vectors.json not found or empty. Run /api/pre-processing-for-embedding first.",
        }, { status: 400 });
      }

      const qEmb = await embedText(question);

      const scored = vectors
        .map((v: any) => ({ v, score: cosineSim(qEmb, v.embedding) }))
        .sort((a, b) => b.score - a.score);

      // TOP_K를 환경변수에서 읽거나 기본값 1 사용 (토큰 절감 극대화)
      const OPTIMIZED_TOP_K = TOP_K; // 환경변수 TOP_K 사용 (기본값 1)
      const ranked = scored.slice(0, OPTIMIZED_TOP_K);
      slimHits = ranked.map(({ v, score }) => ({
        id: v.id,
        meta: v.meta,
        text: v.text,
        score: Number(score.toFixed(4)),
      }));

      // RAG Context 극대 압축: 텍스트 10자로 제한, 제목만 (최대 5자)
      const MAX_CONTEXT_TEXT_LENGTH = 10; // 각 이벤트 텍스트 최대 길이 (15→10로 축소)
      const MAX_TITLE_LENGTH = 5; // 제목 최대 길이
      context = slimHits
        .map((h) => {
          const m = h.meta || {};
          // 제목 길이 제한 (5자)
          const title = (m.title || "").length > MAX_TITLE_LENGTH
            ? (m.title || "").substring(0, MAX_TITLE_LENGTH)
            : (m.title || "");
          // 텍스트 길이 제한 (10자)
          const text = h.text && h.text.length > MAX_CONTEXT_TEXT_LENGTH
            ? h.text.substring(0, MAX_CONTEXT_TEXT_LENGTH)
            : h.text || '';
          
          // 메타 정보 최소화 (제목+텍스트, 구분자 제거)
          return `${title}${text}`;
        })
        .join("|");
    }

    // 메시지 구성 (정보 요구 질문 여부에 따라 다르게 구성) - 극대 간소화
    // 질문 길이 제한 (30자로 제한하여 input 토큰 절감)
    const truncatedQuestion = question.length > 30 ? question.substring(0, 30) : question;
    
    // System Prompt가 없으므로 User Message에 최소한의 지시 포함
    const userMessageContent = isInfoRequest
      ? context 
        ? `${truncatedQuestion}[${context}]` // 접두사 제거, 최소 형식
        : `${truncatedQuestion}` // context가 비어있으면 질문만
      : `${truncatedQuestion}`; // 비정보 질문도 질문만

    // History 최적화: 토큰 절감을 위해 히스토리 완전 제거
    // System Prompt가 첫 메시지에만 전송되므로, 이후 메시지에서는 히스토리 없이도 충분
    const optimizedHistory: any[] = [];
    
    // 히스토리는 완전히 제거하여 토큰 절감 (대화 품질은 System Prompt로 유지)

    // System Prompt 포함: 날짜 정보와 함께 전송
    const messages = [
      ...(activeSystemPrompt ? [{
        role: "system",
        content: activeSystemPrompt,
      }] : []), // System Prompt가 있으면 포함
      ...optimizedHistory, // 히스토리 완전 제거
      {
        role: "user",
        content: userMessageContent,
      },
    ];


    // 메시지 처리
    console.log("[chat] Calling CLOVA Chat API, messages count:", messages.length);
    console.log("[chat] Messages:", JSON.stringify(messages, null, 2));
    
    let result;
    try {
      result = await callClovaChat(messages, {
        temperature: 0.3,
        maxTokens: 80, // 최소 한 문장 이상 생성되도록 증가 (40→80)
      });
      console.log("[chat] CLOVA Chat API response received");
    } catch (clovaError) {
      console.error("[chat] ❌ CLOVA Chat API call failed:", clovaError);
      console.error("[chat] ❌ Error details:", clovaError instanceof Error ? clovaError.message : String(clovaError));
      console.error("[chat] ❌ Error stack:", clovaError instanceof Error ? clovaError.stack : "N/A");
      throw clovaError; // 에러를 다시 throw하여 상위 catch 블록에서 처리
    }

    let cleanedAnswer = removeEmojiLikeExpressions(result.content || '').trim();

    // 응답이 비어있거나 너무 짧을 때 기본 메시지 제공
    if (!cleanedAnswer || cleanedAnswer.length < 5) {
      cleanedAnswer = '안녕하세요! 코엑스에서 무엇을 도와드릴까요?';
      console.warn(`[WARNING] AI 응답이 비어있거나 너무 짧습니다. 기본 메시지 사용: "${cleanedAnswer}"`);
    }

    // 실시간 로깅: AI 답변 수신 시 즉시 저장 (동기적으로 처리하여 row 찾기 문제 방지)
    try {
      await saveAIMessageRealtime(sessionId, messageNumber, cleanedAnswer);
      console.log(`[Chat Log] AI message ${messageNumber} saved successfully`);
    } catch (error) {
      console.error('[Chat Log] Failed to save AI message in realtime:', error);
      // 에러가 발생해도 메인 플로우는 계속 진행
    }

    // Token 합계 업데이트 (비동기, 에러 무시)
    (async () => {
      try {
        const existingTokenTotal = await getTokenTotal(sessionId);
        // classification, embedding, chat 모두 포함
        const currentTokenTotal = 
          TOKENS.classification_total + 
          TOKENS.embed_input + 
          TOKENS.chat_total;
        const newTokenTotal = existingTokenTotal + currentTokenTotal;
        await updateTokenTotal(sessionId, newTokenTotal);
      } catch (error) {
        console.error('[Chat Log] Failed to update token total:', error);
      }
    })();

    logTokenSummary("after query");

    // 최종 토큰 사용량 요약 로그
    if (process.env.LOG_TOKENS === "1" || process.env.LOG_API_INPUT === "1") {
      const totalTokens = TOKENS.classification_total + TOKENS.embed_input + TOKENS.chat_total;
      console.log("\n" + "=".repeat(80));
      console.log("📊 [TOKEN SUMMARY] 이번 요청 토큰 사용량");
      console.log("=".repeat(80));
      console.log(`🔍 Classification: ${TOKENS.classification_total} tokens (${TOKENS.classification_calls} calls)`);
      console.log(`📦 Embedding: ${TOKENS.embed_input} tokens (${TOKENS.embed_calls} calls)`);
      console.log(`💬 Chat: ${TOKENS.chat_total} tokens (${TOKENS.chat_calls} calls)`);
      console.log(`📊 총합: ${totalTokens} tokens`);
      console.log("=".repeat(80) + "\n");
    }

    return NextResponse.json({
      answer: cleanedAnswer,
      hits: slimHits,
      tokens: result.tokens,
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    const errorStack = e instanceof Error ? e.stack : undefined;
    const errorName = e instanceof Error ? e.name : 'Unknown';
    
    // 상세 에러 로깅 (항상 출력)
    console.error("=".repeat(80));
    console.error("[chat] ❌ ERROR OCCURRED");
    console.error("=".repeat(80));
    console.error("[chat] Error Name:", errorName);
    console.error("[chat] Error Message:", errorMessage);
    if (errorStack) {
      console.error("[chat] Error Stack:", errorStack);
    }
    console.error("[chat] Error Object:", e);
    console.error("=".repeat(80));
    
    // 클라이언트에 에러 반환 (프로덕션에서도 메시지 표시)
    return NextResponse.json({ 
      error: errorMessage,
      errorName: errorName,
      details: errorStack || String(e)
    }, { status: 500 });
  }
}
