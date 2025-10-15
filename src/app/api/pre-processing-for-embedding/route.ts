import { NextResponse } from 'next/server';
import { getEnv, mapRow } from '@/lib/utils';
import fs from 'fs';
import path from 'path';

// ENV 로드
const APP_ID = getEnv("APP_ID", "testapp");
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

// 파일 경로
const VECTORS_JSON = path.join(process.cwd(), "data", "vectors.json");

// ==== Token counters ====
const TOKENS = {
  embed_input: 0,
  embed_calls: 0,
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

// ====== (옵션) 세그멘테이션 ======
async function segmentText(text: string) {
  const url = `${HLX_BASE}/v1/api-tools/segmentation`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HLX_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      alpha: -100, // 자동 분할
      segCnt: -1, // 제한 없음
      postProcess: true,
      postProcessMaxSize: 1000,
      postProcessMinSize: 300,
    }),
  });
  if (!res.ok)
    throw new Error(
      `Segmentation failed ${res.status}: ${await res.text().catch(() => "")}`
    );
  const json = await res.json();
  return Array.isArray(json?.segments) ? json.segments : [text];
}

async function buildVectors() {
  console.log("Fetching data from Google Sheets...");
  
  // Google Sheets에서 데이터 가져오기
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/google-sheets`);
  const result = await response.json();
  
  if (!result.ok) {
    throw new Error(result.error || 'Failed to load data from Google Sheets');
  }
  
  const rows = result.data;
  const out: Array<{
    id: string;
    meta: Record<string, unknown>;
    text: string;
    embedding: number[];
  }> = [];
  
  console.log(`Starting to build vectors for ${rows.length} rows...`);

  for (let i = 0; i < rows.length; i++) {
    try {
      const m = mapRow(rows[i]);
      if (!m.baseText || m.baseText.length < 2) continue;
      const segments =
        m.baseText.length > 2000 ? await segmentText(m.baseText) : [m.baseText];
      for (const seg of segments) {
        if (!seg || !seg.trim()) continue;
        const embedding = await embedText(seg);
        out.push({ id: `${i}-${out.length}`, meta: m, text: seg, embedding });
      }
      // API 속도 제한을 피하기 위한 짧은 대기
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      console.error(`[row ${i}]`, e);
    }
  }

  if (!out.length)
    throw new Error("No embeddings produced from Google Sheet data.");
  
  const tmp = VECTORS_JSON + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(out, null, 2), "utf8");
  fs.renameSync(tmp, VECTORS_JSON);

  console.log(`Successfully built ${out.length} vectors.`);
  return out.length;
}

function logTokenSummary(tag = "") {
  console.log(
    `🧮 [TOKENS${tag ? " " + tag : ""}] ` +
      `EMB in=${TOKENS.embed_input} (calls=${TOKENS.embed_calls})`
  );
}

export async function POST() {
  try {
    const count = await buildVectors();
    logTokenSummary("after build");
    return NextResponse.json({ ok: true, count, file: "data/vectors.json" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
