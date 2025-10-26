import { NextRequest, NextResponse } from 'next/server';
import { getEnv, cosineSim, removeEmojiLikeExpressions } from '@/lib/utils';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

// ENV 로드
const APP_ID = getEnv("APP_ID", "testapp");
const TOP_K = parseInt(getEnv("TOP_K", "3"), 10);

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

// 2) Chat BASE
let CLOVA_BASE = getEnv(
  "CLOVA_API_BASE",
  "https://clovastudio.apigw.ntruss.com"
);

// /testapp|/serviceapp 경로 없으면 붙이기 (CLOVA_BASE에도 동일하게 적용)
if (!/\/(testapp|serviceapp)(\/|$)/.test(CLOVA_BASE)) {
  CLOVA_BASE = CLOVA_BASE.replace(/\/$/, "") + "/" + APP_ID;
}
const CLOVA_KEY = getEnv("CLOVA_API_KEY");
const CLOVA_MODEL = getEnv("CLOVA_MODEL", "HCX-005");

// 디버깅용 로그
console.log("CLOVA API Debug:");
console.log("CLOVA_BASE:", CLOVA_BASE);
console.log("CLOVA_KEY:", CLOVA_KEY ? "SET" : "NOT SET");
console.log("CLOVA_MODEL:", CLOVA_MODEL);

// 파일 경로
  const VECTORS_JSON = path.join(process.cwd(), "public", "vectors.json");
const systemPromptPath = path.join(process.cwd(), "public", "LLM", "system_prompt.txt");

// ==== Token counters ====
const TOKENS = {
  embed_input: 0,
  embed_calls: 0,
  chat_input: 0,
  chat_output: 0,
  chat_total: 0,
  chat_calls: 0,
};

// ====== HyperCLOVAX Embedding API ======
async function embedText(text: string) {
  if (!text || !text.trim()) throw new Error("empty text for embedding");

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
    body: JSON.stringify({ text }),
  });

  // 4xx면 v2
  if (!res.ok && res.status >= 400 && res.status < 500) {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ texts: [text] }),
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

// ====== CLOVA Chat Completions v3 (non-stream) ======
async function callClovaChat(messages: any[], opts: any = {}) {
  const url = `${CLOVA_BASE}/v3/chat-completions/${CLOVA_MODEL}`;
  
  console.log("CLOVA API Call Debug:");
  console.log("URL:", url);
  console.log("CLOVA_BASE:", CLOVA_BASE);
  console.log("CLOVA_MODEL:", CLOVA_MODEL);

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

  console.log("📝 [CLOVA Chat Request Body]:", JSON.stringify(body, null, 2));

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
  if (!res.ok)
    throw new Error(
      `CLOVA chat failed ${res.status}: ${await res.text().catch(() => "")}`
    );
  const json = await res.json();

  // chat token usage logging
  const chatUsage =
    json?.result?.usage ||
    json?.usage ||
    {};

  const chatIn = Number(chatUsage.promptTokens ?? 0);
  const chatOut = Number(chatUsage.completionTokens ?? 0);
  const chatTotal = Number(chatUsage.totalTokens ?? chatIn + chatOut);

  TOKENS.chat_input += chatIn;
  TOKENS.chat_output += chatOut;
  TOKENS.chat_total += chatTotal;
  TOKENS.chat_calls += 1;

  if (process.env.LOG_TOKENS === "1") {
    console.log(
      `💬 [CHAT] in=${chatIn} out=${chatOut} total=${chatTotal} ` +
        `(acc_total=${TOKENS.chat_total}, calls=${TOKENS.chat_calls})`
    );
  }

  // 응답 형태 호환 처리
  return {
    content:
      json?.result?.message?.content?.[0]?.text ||
      json?.result?.message?.content ||
      "",
    tokens: {
      input: chatIn,
      output: chatOut,
      total: chatTotal,
    },
  };
}

function logTokenSummary(tag = "") {
  console.log(
    `🧮 [TOKENS${tag ? " " + tag : ""}] ` +
      `EMB in=${TOKENS.embed_input} (calls=${TOKENS.embed_calls}) | ` +
      `CHAT in=${TOKENS.chat_input} out=${TOKENS.chat_output} total=${TOKENS.chat_total} ` +
      `(calls=${TOKENS.chat_calls})`
  );
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


async function saveSessionBasedChatLog(logData: SessionChatLog) {
  console.log('=== saveSessionBasedChatLog called ===');
  console.log('Session ID:', logData.sessionId);
  
  // 환경 변수 로드
  const LOG_GOOGLE_SHEET_ID = process.env.LOG_GOOGLE_SHEET_ID;
  const LOG_GOOGLE_SHEET_NAME = process.env.LOG_GOOGLE_SHEET_NAME || "Sheet2";
  const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
  
  console.log("Session Log Environment variables check:");
  console.log("LOG_GOOGLE_SHEET_ID:", LOG_GOOGLE_SHEET_ID ? "SET" : "NOT SET");
  console.log("LOG_GOOGLE_SHEET_NAME:", LOG_GOOGLE_SHEET_NAME);
  console.log("GOOGLE_SERVICE_ACCOUNT_EMAIL:", GOOGLE_SERVICE_ACCOUNT_EMAIL ? "SET" : "NOT SET");
  console.log("GOOGLE_PRIVATE_KEY:", GOOGLE_PRIVATE_KEY ? "SET" : "NOT SET");
  
  if (!LOG_GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error("Google Sheets API credentials are not set");
  }

  // 개인 키 형식 처리
  if (GOOGLE_PRIVATE_KEY) {
    GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.replace(/^"(.*)"$/, '$1');
    GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.replace(/\n$/, '');
  }

  // Google Auth 설정
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
      // 헤더 추가 (세션 ID 포함)
      const headers = ["세션 ID", "일시", "시스템 프롬프트"];
      for (let i = 0; i < 10; i++) {
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

  // 기존 세션 로그가 있는지 확인
  try {
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId: LOG_GOOGLE_SHEET_ID,
      range: `${LOG_GOOGLE_SHEET_NAME}!A:A`,
    });

    let existingRowIndex = -1;
    if (existingData.data.values) {
      for (let i = 0; i < existingData.data.values.length; i++) {
        if (existingData.data.values[i][0] === logData.sessionId) {
          existingRowIndex = i + 1; // 1-based index
          break;
        }
      }
    }

    if (existingRowIndex > 0) {
      // 기존 세션 업데이트 - 기존 대화에 새로운 대화 추가
      console.log(`Updating existing session at row ${existingRowIndex}`);
      
      // 기존 데이터 가져오기
      const existingRowData = await sheets.spreadsheets.values.get({
        spreadsheetId: LOG_GOOGLE_SHEET_ID,
        range: `${LOG_GOOGLE_SHEET_NAME}!A${existingRowIndex}:Z${existingRowIndex}`,
      });

      const existingConversations = [];
      if (existingRowData.data.values && existingRowData.data.values[0]) {
        const existingRow = existingRowData.data.values[0];
        // D열부터 기존 대화 데이터 추출
        for (let i = 3; i < existingRow.length; i += 2) {
          if (existingRow[i] && existingRow[i + 1]) {
            existingConversations.push({
              userMessage: existingRow[i],
              aiMessage: existingRow[i + 1]
            });
          }
        }
      }

      // 새로운 대화만 추가 (이미 저장된 대화는 제외)
      const newConversations = logData.conversation.slice(existingConversations.length);
      
      // 업데이트할 데이터 준비
      const updateData = [
        logData.sessionId,
        logData.timestamp,
        logData.systemPrompt.substring(0, 1000)
      ];

      // 기존 대화 + 새로운 대화
      [...existingConversations, ...newConversations].forEach((conv) => {
        updateData.push(conv.userMessage.substring(0, 1000));
        updateData.push(conv.aiMessage.substring(0, 1000));
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: LOG_GOOGLE_SHEET_ID,
        range: `${LOG_GOOGLE_SHEET_NAME}!A${existingRowIndex}:Z${existingRowIndex}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [updateData]
        }
      });
    } else {
      // 새로운 세션 추가
      console.log("Adding new session");
      const rowData = [
        logData.sessionId,
        logData.timestamp,
        logData.systemPrompt.substring(0, 1000)
      ];

      // 대화 내용을 D열부터 번갈아가며 배치
      logData.conversation.forEach((conv) => {
        rowData.push(conv.userMessage.substring(0, 1000));
        rowData.push(conv.aiMessage.substring(0, 1000));
      });

      await sheets.spreadsheets.values.append({
        spreadsheetId: LOG_GOOGLE_SHEET_ID,
        range: `${LOG_GOOGLE_SHEET_NAME}!A:Z`,
        valueInputOption: "RAW",
        requestBody: {
          values: [rowData]
        }
      });
    }

    console.log("Session-based chat log saved to Google Sheets successfully");
  } catch (error) {
    console.error("Error saving session-based chat log:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = (body?.question || "").trim();
    if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });
    
    if (!fs.existsSync(VECTORS_JSON)) {
      return NextResponse.json({
        error: "vectors.json not found. Run /api/pre-processing-for-embedding first.",
      }, { status: 400 });
    }

    // systemPrompt 처리
    let defaultSystemPrompt = "";
    try {
      defaultSystemPrompt = fs.readFileSync(systemPromptPath, "utf8");
    } catch (e) {
      console.warn("Could not read system prompt file:", e);
    }

    // 현재 날짜 정보 추가
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()];
    const currentDateInfo = `\n\n[현재 날짜 정보]\n현재 날짜는 ${year}년 ${month}월 ${day}일(${weekday}요일)이다. 지나간 날짜의 이벤트는 추천하지 않아야 한다.\n`;

    const activeSystemPrompt =
      ((body?.systemPrompt && body.systemPrompt.trim()) || defaultSystemPrompt) + currentDateInfo;

    const vectors = JSON.parse(fs.readFileSync(VECTORS_JSON, "utf8"));
    if (!Array.isArray(vectors) || vectors.length === 0) {
      return NextResponse.json({
        error: "vectors.json is empty. Re-run /api/pre-processing-for-embedding.",
      }, { status: 400 });
    }

    const qEmb = await embedText(question);

    const scored = vectors
      .map((v: any) => ({ v, score: cosineSim(qEmb, v.embedding) }))
      .sort((a, b) => b.score - a.score);

    const ranked = scored.slice(0, TOP_K);
    const slimHits = ranked.map(({ v, score }) => ({
      id: v.id,
      meta: v.meta,
      text: v.text,
      score: Number(score.toFixed(4)),
    }));

    const context = slimHits
      .map((h, i) => {
        const m = h.meta || {};
        return (
          `[${i + 1}] ${m.title || ""} | ${m.date || ""} | ${m.venue || ""}` +
          `${m.region ? " | 지역:" + m.region : ""}` +
          `${m.industry ? " | 산업군:" + m.industry : ""}\n` +
          h.text
        );
      })
      .join("\n\n");

    const messages = [
      {
        role: "system",
        content: activeSystemPrompt,
      },
      ...(body?.history || []), // 이전 대화 맥락
      {
        role: "user",
        content: `질문: ${question}\n\n[참고 가능한 이벤트]\n${context}\n\n위 정보만 사용해 사용자 질문에 답하세요. 만약 [참고 가능한 이벤트]에 대한 정보를 묻지 않고 있다면, 대화 맥락과 system prompt에 따라 '질문'에 답하세요.`,
      },
    ];

    // 디버깅 로그: 히스토리와 메시지 구조 확인
    console.log("=== CHAT API DEBUG ===");
    console.log("Question:", question);
    console.log("System Prompt Length:", activeSystemPrompt.length);
    console.log("System Prompt Preview:", activeSystemPrompt.substring(0, 200) + "...");
    console.log("History length:", body?.history?.length || 0);
    console.log("History content:", JSON.stringify(body?.history || [], null, 2));
    console.log("Total messages:", messages.length);
    console.log("Messages structure:", messages.map((m, i) => ({
      index: i,
      role: m.role,
      contentLength: m.content?.length || 0,
      contentPreview: m.content?.substring(0, 100) + (m.content?.length > 100 ? "..." : "")
    })));
    console.log("=====================");

    const result = await callClovaChat(messages, {
      temperature: 0.3,
      maxTokens: 700,
    });

    const cleanedAnswer = removeEmojiLikeExpressions(result.content);

    // 구글 스프레드시트에 세션 기반 로그 저장 (비동기, 에러 무시)
    try {
      console.log('=== SESSION-BASED LOGGING DEBUG ===');
      
              // 세션 ID 생성 (브라우저 세션 기반 - 새로고침 전까지 동일)
              const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
              const userAgent = request.headers.get('user-agent') || 'unknown';
              const sessionString = `${clientIP}-${userAgent}`;
              // 타임스탬프를 제거하고 IP+UserAgent 기반으로만 세션 ID 생성
              const sessionId = `session-${Math.abs(sessionString.split('').reduce((a, b) => a + b.charCodeAt(0), 0))}`;
      
      console.log('Session ID:', sessionId);
      console.log('History received:', JSON.stringify(body?.history || [], null, 2));
      console.log('History length:', (body?.history || []).length);
      
      // 전체 대화 히스토리를 올바른 형식으로 변환
      const conversation = [];
      
      // 이전 대화 히스토리 추가 (사용자 메시지와 AI 응답 쌍)
      const history = body?.history || [];
      for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        
        if (msg && msg.role === 'user') {
          // 사용자 메시지 찾기
          const userMsg = msg;
          const aiMsg = history[i + 1]; // 다음 메시지가 assistant인지 확인
          
          if (aiMsg && aiMsg.role === 'assistant') {
            conversation.push({
              userMessage: userMsg.content,
              aiMessage: aiMsg.content
            });
          }
        }
      }
      
      // 현재 대화 추가
      conversation.push({
        userMessage: question,
        aiMessage: cleanedAnswer
      });

      console.log('Final conversation for logging:', JSON.stringify(conversation, null, 2));

      // 한국 시간으로 timestamp 생성 (YYYY-MM-DD HH:MM:SS 형식)
      const now = new Date();
      const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
      const timestamp = koreanTime.toISOString().replace('T', ' ').substring(0, 19) + ' (KST)';
      
      const logData = {
        sessionId: sessionId,
        timestamp: timestamp,
        systemPrompt: activeSystemPrompt,
        conversation: conversation
      };
      
      console.log('Log data prepared:', JSON.stringify(logData, null, 2));
      console.log('========================');

      // Google Sheets에 세션 기반 로그 저장
      try {
        await saveSessionBasedChatLog(logData);
        console.log('✅ Session-based chat log saved successfully to Google Sheets');
      } catch (error) {
        console.error('❌ Failed to save session-based chat log:', error);
        // 실패 시 콘솔에도 출력
        console.log('=== CHAT LOG (Fallback Console Output) ===');
        console.log('Session ID:', logData.sessionId);
        console.log('Timestamp:', logData.timestamp);
        console.log('Conversation Count:', logData.conversation.length);
        logData.conversation.forEach((conv, index) => {
          console.log(`  ${index + 1}. User: ${conv.userMessage.substring(0, 100)}${conv.userMessage.length > 100 ? '...' : ''}`);
          console.log(`     AI: ${conv.aiMessage.substring(0, 100)}${conv.aiMessage.length > 100 ? '...' : ''}`);
        });
        console.log('==========================================');
      }
    } catch (error) {
      console.error('Error preparing session-based chat log:', error);
    }

    logTokenSummary("after query");

    return NextResponse.json({
      answer: cleanedAnswer,
      hits: slimHits,
      tokens: result.tokens,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
