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

// 질문 카테고리 타입
export type QuestionCategory = 
  | '음식점'
  | '카페'
  | '옷가게'
  | '엑티비티'
  | '휴식'
  | '관람'
  | '컨퍼런스'
  | '행사/이벤트'
  | '전시'
  | '편의 시설'
  | null;

// CLOVA Chat Completions 호출
async function callClovaChat(messages: any[], opts: any = {}) {
  const url = `${CLOVA_BASE}/v3/chat-completions/${CLOVA_MODEL}`;
  
  const wrappedMessages = messages.map((m) => ({
    role: m.role,
    content: [{ type: "text", text: m.content }],
  }));

  const body = {
    messages: wrappedMessages,
    temperature: opts.temperature ?? 0.2,
    topP: opts.topP ?? 0.8,
    topK: opts.topK ?? 0,
    maxTokens: opts.maxTokens ?? 50,
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
    const { question } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: "question is required and must be a string" },
        { status: 400 }
      );
    }

    // 질문 분류를 위한 프롬프트
    const systemPrompt = `당신은 사용자의 질문을 다음 10가지 카테고리 중 하나로 분류하는 전문가입니다.

카테고리 목록:
1. 음식점: 식사, 맛집, 음식과 관련된 정보를 물어보았을 경우
2. 카페: 음료, 쉴 공간, 대화할 공간 등의 정보를 물어보았을 경우
3. 옷가게: 쇼핑 관련 인풋
4. 엑티비티: 놀거리(활발한 엑티비티) 예: 코엑스 입구 LED 스크린, 포토스팟, 아쿠아리움 등
5. 휴식: 안정을 얻을 수 있는 공간이나 활동을 원할 경우의 추천 (카페와 구분 필요, 예: 별마당 도서관)
6. 관람: 영화나 예술 관련 볼거리 예: 코엑스 메가박스
7. 컨퍼런스: 관련 컨퍼런스 추천
8. 행사/이벤트: 관련 행사/이벤트 추천
9. 전시: 관련 전시 추천
10. 편의 시설: 편의점, 화장실, 출구 등의 정보 관련 경우

위 카테고리 중 하나만 정확히 출력하세요. 다른 설명은 포함하지 마세요.`;

    const userPrompt = `질문: "${question}"

위 질문을 10가지 카테고리 중 하나로 분류하세요:`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const response = await callClovaChat(messages, {
      temperature: 0.2,
      maxTokens: 50,
    });

    // 응답에서 카테고리 추출 (줄바꿈, 공백 정리)
    const category = response.content.trim().split('\n')[0].trim();
    
    // 유효한 카테고리인지 확인
    const validCategories: QuestionCategory[] = [
      '음식점',
      '카페',
      '옷가게',
      '엑티비티',
      '휴식',
      '관람',
      '컨퍼런스',
      '행사/이벤트',
      '전시',
      '편의 시설'
    ];
    
    const matchedCategory = validCategories.find(cat => category.includes(cat));
    
    return NextResponse.json({ 
      category: matchedCategory || null,
      rawResponse: category 
    });
  } catch (error: any) {
    console.error("질문 분류 실패:", error);
    return NextResponse.json(
      { error: error.message || "질문 분류에 실패했습니다.", category: null },
      { status: 500 }
    );
  }
}
