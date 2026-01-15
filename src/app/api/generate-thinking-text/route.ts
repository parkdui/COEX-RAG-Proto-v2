import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/utils';

// Google Sheets 함수 import
import { getTokenTotal, updateTokenTotal } from '../chat/route';

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
 * CLOVA Chat Completions API를 사용하여 사용자 입력에서 키워드를 추출하고
 * '~~를 찾고 있어요' 형식의 thinkingText 생성
 */
async function generateThinkingTextWithClova(userInput: string): Promise<{ text: string; tokens: { input: number; output: number; total: number } }> {
  const url = `${CLOVA_BASE}/v3/chat-completions/${CLOVA_MODEL}`;
  
  const systemPrompt = `사용자의 입력 텍스트에서 중요한 키워드를 추출하여 '~~를 찾고 있어요' 또는 '~~을 찾고 있어요' 형식의 자연스러운 문장을 생성해주세요.

규칙:
1. 사용자 입력에서 핵심 키워드(장소, 행동, 상황 등)를 추출
2. "~~를 찾고 있어요" 또는 "~~을 찾고 있어요" 형식으로 변환
3. 자연스럽고 읽기 쉬운 문장으로 구성
4. 불필요한 조사나 문장 부호는 제거
5. 핵심 의미만 전달하는 간결한 문장
6. 말줄임표(...) 사용 금지

예시:
- 입력: "나 친구랑 왔는데, 맛있는 식당 알려줘"
- 출력: "친구랑 맛있게 먹을 수 있는 식당을 찾고 있어요"

- 입력: "혼자 조용히 쉴 수 있는 곳 추천해줘"
- 출력: "혼자 조용히 쉴 수 있는 곳을 찾고 있어요"

- 입력: "카페 어디 있나요?"
- 출력: "카페를 찾고 있어요"

- 입력: "연인과 함께 갈 만한 데이트 코스 알려주세요"
- 출력: "연인과 함께 갈 만한 데이트 코스를 찾고 있어요"

생성된 문장만 출력하고 설명은 하지 마세요.`;

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: `다음 사용자 입력을 '~~를 찾고 있어요' 형식의 문장으로 변환해주세요:\n${userInput}`,
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
    maxTokens: 100,
    repeatPenalty: 1.1,
    stop: [],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOVA_KEY}`,
      "Content-Type": "application/json; charset=utf-8",
      "X-NCP-CLOVASTUDIO-REQUEST-ID": `thinking-text-${Date.now()}-${Math.random()}`,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`CLOVA thinking text generation failed ${res.status}: ${errorText}`);
  }

  const json = await res.json();
  console.log('[generateThinkingTextWithClova] CLOVA API 응답:', JSON.stringify(json, null, 2));
  
  // 토큰 사용량 추출
  const usage = json?.result?.usage || json?.usage || {};
  const thinkingInput = Number(usage.promptTokens ?? 0);
  const thinkingOutput = Number(usage.completionTokens ?? 0);
  const thinkingTotal = Number(usage.totalTokens ?? thinkingInput + thinkingOutput);
  
  // 다양한 응답 구조 지원
  let thinkingText = "";
  
  // HCX-005 모델 응답 구조 확인
  if (json?.result?.message?.content) {
    // 배열인 경우
    if (Array.isArray(json.result.message.content)) {
      thinkingText = json.result.message.content[0]?.text || json.result.message.content[0] || "";
    } else {
      // 문자열인 경우
      thinkingText = json.result.message.content || "";
    }
  } else if (json?.choices?.[0]?.message?.content) {
    // 다른 응답 구조
    if (Array.isArray(json.choices[0].message.content)) {
      thinkingText = json.choices[0].message.content[0]?.text || json.choices[0].message.content[0] || "";
    } else {
      thinkingText = json.choices[0].message.content || "";
    }
  } else if (json?.result?.message) {
    // 직접 메시지 객체
    thinkingText = json.result.message || "";
  }
  
  console.log('[generateThinkingTextWithClova] 추출된 thinkingText:', thinkingText);

  // 응답 정리
  let cleanedText = thinkingText.trim();
  
  // 말줄임표 제거
  cleanedText = cleanedText.replace(/\.{2,}/g, '').trim();
  
  // 따옴표 제거
  cleanedText = cleanedText.replace(/^["']|["']$/g, '').trim();
  
  // 줄바꿈 제거
  cleanedText = cleanedText.replace(/\n/g, ' ').trim();

  console.log('[generateThinkingTextWithClova] 정리된 thinkingText:', cleanedText);

  return {
    text: cleanedText || "알아보고 있어요", // 실패 시 기본값
    tokens: {
      input: thinkingInput,
      output: thinkingOutput,
      total: thinkingTotal,
    },
  };
}

export async function POST(request: NextRequest) {
  let userInput = "";
  let sessionId = null;
  let rowIndex = null;

  try {
    const body = await request.json();
    userInput = (body?.userInput || "").trim();
    sessionId = body?.sessionId || null;
    rowIndex = body?.rowIndex || null;

    console.log('[generate-thinking-text] 요청 받음:', { userInput, hasClovaKey: !!CLOVA_KEY });

    if (!userInput) {
      console.warn('[generate-thinking-text] userInput이 없음');
      return NextResponse.json(
        { error: "userInput required" },
        { status: 400 }
      );
    }

    if (!CLOVA_KEY) {
      // CLOVA API 키가 없으면 간단한 fallback 로직 사용
      console.log('[generate-thinking-text] CLOVA_KEY 없음, fallback 사용');
      const fallbackText = generateFallbackThinkingText(userInput);
      console.log('[generate-thinking-text] fallback 결과:', fallbackText);
      return NextResponse.json({ thinkingText: fallbackText });
    }

    console.log('[generate-thinking-text] CLOVA API 호출 시작');
    const result = await generateThinkingTextWithClova(userInput);
    const thinkingText = result.text;
    const tokens = result.tokens;
    console.log('[generate-thinking-text] CLOVA API 결과:', { thinkingText, tokens });

    // Google Sheets에 토큰 저장 (sessionId와 rowIndex가 있는 경우)
    if (sessionId && rowIndex && tokens.total > 0) {
      try {
        const existingTokenTotal = await getTokenTotal(sessionId, rowIndex);
        const newTokenTotal = existingTokenTotal + tokens.total;
        await updateTokenTotal(sessionId, newTokenTotal, rowIndex);
        console.log(`[Generate Thinking Text] Token saved: ${tokens.total} tokens (total: ${newTokenTotal}) for session ${sessionId}`);
      } catch (error) {
        console.error('[Generate Thinking Text] Failed to save token to Google Sheets:', error);
        // 에러가 발생해도 메인 응답은 반환
      }
    }

    return NextResponse.json({ 
      thinkingText,
      tokens: tokens.total > 0 ? tokens : undefined, // 토큰이 있을 때만 반환
    });
  } catch (error: any) {
    console.error("[generate-thinking-text] 에러 발생:", error);
    // 에러 발생 시에도 fallback 텍스트 반환
    if (userInput) {
      console.log('[generate-thinking-text] 에러 후 fallback 시도:', userInput);
      const fallbackText = generateFallbackThinkingText(userInput);
      console.log('[generate-thinking-text] 에러 후 fallback 결과:', fallbackText);
      return NextResponse.json({ thinkingText: fallbackText });
    } else {
      console.error("[generate-thinking-text] userInput도 없음, 기본값 반환");
      return NextResponse.json({ thinkingText: "알아보고 있어요" });
    }
  }
}

/**
 * CLOVA API가 없을 때 사용하는 간단한 fallback 함수
 */
function generateFallbackThinkingText(userInput: string): string {
  console.log('[generateFallbackThinkingText] 입력:', userInput);
  
  // 키워드 패턴 매칭
  const patterns = [
    { keywords: ['식당', '맛집', '레스토랑', '음식점', '식당을', '맛집을', '레스토랑을', '음식점을'], text: '식당을 찾고 있어요' },
    { keywords: ['카페', '커피', '카페를', '커피를'], text: '카페를 찾고 있어요' },
    { keywords: ['쇼핑', '쇼핑몰', '쇼핑을'], text: '쇼핑할 수 있는 곳을 찾고 있어요' },
    { keywords: ['영화', '영화관', '영화를', '영화관을'], text: '영화관을 찾고 있어요' },
    { keywords: ['휴식', '쉬', '휴게', '쉴'], text: '휴식할 수 있는 곳을 찾고 있어요' },
    { keywords: ['친구', '친구랑', '친구와'], text: '친구랑 함께 갈 수 있는 곳을 찾고 있어요' },
    { keywords: ['연인', '데이트', '데이트를'], text: '데이트할 수 있는 곳을 찾고 있어요' },
    { keywords: ['가족', '가족과', '가족과'], text: '가족과 함께 갈 수 있는 곳을 찾고 있어요' },
    { keywords: ['혼자', '혼자서'], text: '혼자 가기 좋은 곳을 찾고 있어요' },
    { keywords: ['구경', '관람', '구경할', '관람할'], text: '구경할 수 있는 곳을 찾고 있어요' },
  ];

  // 키워드 매칭 (대소문자 구분 없이)
  const lowerInput = userInput.toLowerCase();
  for (const pattern of patterns) {
    if (pattern.keywords.some(keyword => lowerInput.includes(keyword.toLowerCase()))) {
      console.log('[generateFallbackThinkingText] 매칭됨:', pattern.text);
      return pattern.text;
    }
  }

  // 매칭되지 않으면 기본값
  console.log('[generateFallbackThinkingText] 매칭 실패, 기본값 반환');
  return '알아보고 있어요';
}
