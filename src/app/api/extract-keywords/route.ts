import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/utils';

// ENV 로드
const APP_ID = getEnv("APP_ID", "testapp");

// CLOVA API 설정
let CLOVA_BASE = getEnv(
  "CLOVA_API_BASE",
  "https://clovastudio.apigw.ntruss.com"
);

// /testapp|/serviceapp 경로 없으면 붙이기
if (!/\/(testapp|serviceapp)(\/|$)/.test(CLOVA_BASE)) {
  CLOVA_BASE = CLOVA_BASE.replace(/\/$/, "") + "/" + APP_ID;
}
const CLOVA_KEY = getEnv("CLOVA_API_KEY");
const CLOVA_MODEL = getEnv("CLOVA_MODEL", "HCX-005");

// CLOVA Chat Completions 호출
async function callClovaChat(messages: any[], opts: any = {}) {
  const url = `${CLOVA_BASE}/v3/chat-completions/${CLOVA_MODEL}`;
  
  const wrappedMessages = messages.map((m) => ({
    role: m.role,
    content: [{ type: "text", text: m.content }],
  }));

  const body = {
    messages: wrappedMessages,
    temperature: opts.temperature ?? 0.3,
    topP: opts.topP ?? 0.8,
    topK: opts.topK ?? 0,
    maxTokens: opts.maxTokens ?? 100,
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
    throw new Error(
      `CLOVA chat failed ${res.status}: ${await res.text().catch(() => "")}`
    );
  }

  const json = await res.json();
  
  return {
    content:
      json?.result?.message?.content?.[0]?.text ||
      json?.result?.message?.content ||
      "",
  };
}

export async function POST(request: NextRequest) {
  try {
    const { question, answer } = await request.json();

    if (!question || !answer) {
      return NextResponse.json(
        { error: "question and answer are required" },
        { status: 400 }
      );
    }

    // 키워드 추출을 위한 프롬프트
    const systemPrompt = `당신은 대화에서 핵심 키워드를 추출하는 전문가입니다. 
사용자의 질문과 AI의 답변을 분석하여, 이 대화의 핵심을 나타내는 키워드를 최대 2단어로 추출하세요.
키워드는 공백으로 구분된 최대 2단어여야 하며, 명사나 명사구 형태로 추출하세요.
예시: "카페 추천", "별마당 도서관", "VR 체험", "데이트 장소" 등
키워드만 출력하고, 다른 설명은 포함하지 마세요.`;

    const userPrompt = `질문: ${question}\n답변: ${answer}\n\n위 대화에서 핵심 키워드를 최대 2단어로 추출하세요:`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const response = await callClovaChat(messages, {
      temperature: 0.3,
      maxTokens: 50,
    });

    // 응답에서 키워드 추출 (줄바꿈, 공백 정리)
    const keyword = response.content.trim().split('\n')[0].trim();

    return NextResponse.json({ keyword });
  } catch (error: any) {
    console.error("키워드 추출 실패:", error);
    return NextResponse.json(
      { error: error.message || "키워드 추출에 실패했습니다." },
      { status: 500 }
    );
  }
}








