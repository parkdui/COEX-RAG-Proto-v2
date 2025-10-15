import { NextRequest, NextResponse } from 'next/server';
import { getEnv, cosineSim, removeEmojiLikeExpressions } from '@/lib/utils';
import fs from 'fs';
import path from 'path';

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

    const activeSystemPrompt =
      (body?.systemPrompt && body.systemPrompt.trim()) ||
      defaultSystemPrompt;

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
        content: `질문: ${question}\n\n[참고 가능한 이벤트]\n${context}\n\n위 정보만 사용해 사용자 질문에 답하세요.`,
      },
    ];

    // 디버깅 로그: 히스토리와 메시지 구조 확인
    console.log("=== CHAT API DEBUG ===");
    console.log("Question:", question);
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

    // 구글 스프레드시트에 로그 저장 (비동기, 에러 무시)
    try {
      // 대화 히스토리를 올바른 형식으로 변환
      const conversation = [];
      
      // 이전 대화 히스토리 추가 (사용자 메시지와 AI 응답 쌍)
      for (let i = 0; i < (body?.history || []).length; i += 2) {
        const userMsg = body.history[i];
        const aiMsg = body.history[i + 1];
        if (userMsg && aiMsg) {
          conversation.push({
            userMessage: userMsg.content || userMsg,
            aiMessage: aiMsg.content || aiMsg
          });
        }
      }
      
      // 현재 대화 추가
      conversation.push({
        userMessage: question,
        aiMessage: cleanedAnswer
      });

      const logData = {
        timestamp: new Date().toISOString(),
        systemPrompt: activeSystemPrompt,
        conversation: conversation
      };

      // 비동기로 로그 저장 (응답을 블록하지 않음)
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/log-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData),
      }).catch(error => {
        console.error('Failed to log chat to Google Sheets:', error);
      });
    } catch (error) {
      console.error('Error preparing chat log:', error);
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
