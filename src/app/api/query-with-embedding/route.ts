import { NextRequest, NextResponse } from 'next/server';
import { getEnv, cosineSim, removeEmojiLikeExpressions } from '@/lib/utils';
import fs from 'fs';
import path from 'path';

// ENV 로드
const APP_ID = getEnv("APP_ID", "testapp");
const TOP_K = parseInt(getEnv("TOP_K", "2"), 10); // 기본값 3 → 2로 변경 (토큰 절감)

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
};

// ====== HyperCLOVAX Embedding API ======
async function embedText(text: string) {
  if (!text || !text.trim()) throw new Error("empty text for embedding");
  
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
  if (!CLOVA_KEY) {
    throw new Error("CLOVA_API_KEY environment variable is not set");
  }
  
  // URL 구성: CLOVA_BASE가 이미 /testapp 또는 /serviceapp을 포함하는지 확인
  let apiUrl = CLOVA_BASE;
  if (!apiUrl.endsWith('/')) {
    apiUrl += '/';
  }
  // 이미 v3 경로가 포함되어 있지 않으면 추가
  if (!apiUrl.includes('/v3/')) {
    apiUrl += 'v3/chat-completions/';
  }
  apiUrl += CLOVA_MODEL;
  
  const url = apiUrl;

  // 디버깅: URL 로깅 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development' || process.env.LOG_TOKENS === "1") {
    console.log(`🔗 [CLOVA] API URL: ${url}`);
    console.log(`🔗 [CLOVA] BASE: ${CLOVA_BASE}, MODEL: ${CLOVA_MODEL}, APP_ID: ${APP_ID}`);
  }

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
  if (process.env.LOG_TOKENS === "1") {
    console.log(
      `🧮 [TOKENS${tag ? " " + tag : ""}] ` +
        `EMB in=${TOKENS.embed_input} (calls=${TOKENS.embed_calls}) | ` +
        `CHAT in=${TOKENS.chat_input} out=${TOKENS.chat_output} total=${TOKENS.chat_total} ` +
        `(calls=${TOKENS.chat_calls})`
    );
  }
}

export async function POST(request: NextRequest) {
  // 각 요청마다 TOKENS 초기화 (동시성 문제 방지)
  TOKENS.embed_input = 0;
  TOKENS.embed_calls = 0;
  TOKENS.chat_input = 0;
  TOKENS.chat_output = 0;
  TOKENS.chat_total = 0;
  TOKENS.chat_calls = 0;
  
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

    let vectors: any[];
    try {
      const vectorsData = fs.readFileSync(VECTORS_JSON, "utf8");
      vectors = JSON.parse(vectorsData);
      if (!Array.isArray(vectors) || vectors.length === 0) {
        return NextResponse.json({
          error: "vectors.json is empty. Re-run /api/pre-processing-for-embedding.",
        }, { status: 400 });
      }
    } catch (e) {
      console.error("Failed to read vectors.json:", e);
      return NextResponse.json({
        error: "Failed to read vectors.json. Please ensure the file exists and is valid JSON.",
      }, { status: 500 });
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

    // RAG Context 압축: 텍스트 길이 제한 (200자) + TOP_K 감소 (3→2)
    const MAX_CONTEXT_TEXT_LENGTH = 200; // 각 이벤트 텍스트 최대 길이
    const context = slimHits
      .map((h, i) => {
        const m = h.meta || {};
        // 텍스트 길이 제한 (200자)
        const text = h.text && h.text.length > MAX_CONTEXT_TEXT_LENGTH
          ? h.text.substring(0, MAX_CONTEXT_TEXT_LENGTH) + '...'
          : h.text || '';
        
        return (
          `[${i + 1}] ${m.title || ""} | ${m.date || ""} | ${m.venue || ""}` +
          `${m.region ? " | 지역:" + m.region : ""}` +
          `${m.industry ? " | 산업군:" + m.industry : ""}\n` +
          text
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
        content: `질문: ${question}\n\n[참고 가능한 이벤트]\n${context}\n\n위 정보만 사용해 사용자 질문에 답하세요. 반드시 30자 이내로만 답하세요.`,
      },
    ];

    const result = await callClovaChat(messages, {
      temperature: 0.3,
      maxTokens: 70, // 30자 내외 답변 (30자 × 1.5 tokens + 여유 25 tokens)
    });

    const cleanedAnswer = removeEmojiLikeExpressions(result.content);

    logTokenSummary("after query");

    return NextResponse.json({
      answer: cleanedAnswer,
      hits: slimHits,
      tokens: result.tokens,
    });
  } catch (e) {
    console.error("[query-with-embedding] Error:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? String(e) : undefined
    }, { status: 500 });
  }
}
