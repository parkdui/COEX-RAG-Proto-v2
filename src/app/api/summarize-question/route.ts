import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/utils';

// ENV 로드
const APP_ID = getEnv("APP_ID", "testapp");

// CLOVA BASE 설정
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

/**
 * CLOVA Chat Completions API를 사용하여 질문을 20자 이내로 요약
 */
async function summarizeWithClova(question: string): Promise<string> {
  const url = `${CLOVA_BASE}/v3/chat-completions/${CLOVA_MODEL}`;
  
  const systemPrompt = `사용자의 질문을 핵심 키워드와 동작만 남겨서 20자 이내의 간단한 구절로 요약해주세요. 
예시:
- 입력: "문화적인 경험을 할 수 있는 곳을 추천해줘"
- 출력: "문화적인 경험 장소 추천"

- 입력: "친구와 함께 갈 수 있는 맛집을 찾고 있어"
- 출력: "친구와 맛집 추천"

요약 시:
1. 핵심 키워드만 추출
2. 불필요한 조사나 문장 부호 제거
3. 동작(추천, 찾기 등)은 간결하게 표현
4. 반드시 20자 이내
5. 말줄임표(...) 사용 금지
6. 질문의 의미를 정확히 전달

요약만 출력하고 설명은 하지 마세요.`;

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: `다음 질문을 20자 이내로 요약해주세요:\n${question}`,
    },
  ];

  const wrappedMessages = messages.map((m) => ({
    role: m.role,
    content: [{ type: "text", text: m.content }],
  }));

  const body = {
    messages: wrappedMessages,
    temperature: 0.3,
    topP: 0.8,
    topK: 0,
    maxTokens: 50, // 요약이므로 짧게
    repeatPenalty: 1.1,
    stop: [],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOVA_KEY}`,
      "Content-Type": "application/json; charset=utf-8",
      "X-NCP-CLOVASTUDIO-REQUEST-ID": `summarize-${Date.now()}-${Math.random()}`,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`CLOVA summarize failed ${res.status}: ${errorText}`);
  }

  const json = await res.json();
  const summary = json?.result?.message?.content?.[0]?.text || 
                  json?.choices?.[0]?.message?.content || 
                  "";

  // 응답에서 불필요한 공백 제거 및 20자 제한 확인
  let cleanedSummary = summary.trim();
  
  // 말줄임표 제거
  cleanedSummary = cleanedSummary.replace(/\.{2,}/g, '').trim();
  
  // 20자 초과 시 20자로 자르기 (단어 단위로는 하지 않음)
  if (cleanedSummary.length > 20) {
    cleanedSummary = cleanedSummary.substring(0, 20);
    // 마지막이 한글 조각일 수 있으므로, 마지막 글자가 완전한 한글인지 확인
    // 하지만 20자 제한이므로 그냥 자르기
  }

  return cleanedSummary || question.substring(0, 20); // 실패 시 원본의 20자
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = (body?.question || "").trim();

    if (!question) {
      return NextResponse.json(
        { error: "question required" },
        { status: 400 }
      );
    }

    // 10자 이하 짧은 질문은 API 호출하지 않고 원본 반환
    if (question.length <= 10) {
      return NextResponse.json({ summary: question });
    }

    if (!CLOVA_KEY) {
      // CLOVA API 키가 없으면 간단한 요약 로직 사용 (fallback)
      const keywords = ['가족', '친구', '혼자', '데이트', '컨퍼런스', '식당', '카페', '쇼핑', '문화', '체험', '추천', '장소', '곳'];
      const foundKeywords = keywords.filter(kw => question.includes(kw));
      
      if (foundKeywords.length > 0) {
        const summary = foundKeywords.slice(0, 3).join(' ') + ' 추천';
        return NextResponse.json({ 
          summary: summary.length > 20 ? summary.substring(0, 20) : summary 
        });
      }
      
      // 키워드가 없으면 원본 반환 (20자 제한)
      return NextResponse.json({ 
        summary: question.length > 20 ? question.substring(0, 20) : question 
      });
    }

    const summary = await summarizeWithClova(question);
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("Summarize question error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to summarize question" },
      { status: 500 }
    );
  }
}

