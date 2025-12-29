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

// Google Sheets 함수 import
import { getTokenTotal, updateTokenTotal } from '../chat/route';

/**
 * TTS용 텍스트 재작성 API
 * 기존 텍스트를 비슷한 내용이지만 자연스러운 다른 표현으로 재작성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const originalText = body?.text || '';
    const sessionId = body?.sessionId || null;
    const rowIndex = body?.rowIndex || null;

    if (!originalText || originalText.trim().length === 0) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      );
    }

    // CLOVA Chat API를 사용하여 텍스트 재작성
    const url = `${CLOVA_BASE}/v3/chat-completions/${CLOVA_MODEL}`;
    
    const systemPrompt = `당신은 자연스러운 대화체로 텍스트를 재작성하는 전문가입니다.
주어진 텍스트의 의미와 내용을 유지하면서, 조금 다른 표현으로 바꿔주세요.
- 원본의 핵심 내용과 의미, 존댓말은 그대로 유지
- 문장 구조를 자연스럽게 조정
- 불필요한 수식어는 제거하고 간결하게
- 한 문장으로 답변하세요.`;

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `다음 텍스트를 자연스럽게 재작성해주세요:\n\n${originalText}`
      }
    ];

    const wrappedMessages = messages.map((m) => ({
      role: m.role,
      content: [{ type: "text", text: m.content }],
    }));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOVA_KEY}`,
        "Content-Type": "application/json; charset=utf-8",
        "X-NCP-CLOVASTUDIO-REQUEST-ID": `req-${Date.now()}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: wrappedMessages,
        temperature: 0.7,
        topP: 0.8,
        topK: 0,
        maxTokens: 200,
        repeatPenalty: 1.1,
        stop: [],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CLOVA API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to rewrite text', details: errorText },
        { status: response.status }
      );
    }

    const json = await response.json();
    
    // 토큰 사용량 추출
    const usage = json?.result?.usage || json?.usage || {};
    const ttsInput = Number(usage.promptTokens ?? 0);
    const ttsOutput = Number(usage.completionTokens ?? 0);
    const ttsTotal = Number(usage.totalTokens ?? ttsInput + ttsOutput);
    
    // 응답 내용 추출
    const rewrittenText =
      json?.result?.message?.content?.[0]?.text ||
      json?.result?.message?.content ||
      originalText; // 실패 시 원본 반환

    // Google Sheets에 토큰 저장 (sessionId와 rowIndex가 있는 경우)
    if (sessionId && rowIndex && ttsTotal > 0) {
      try {
        const existingTokenTotal = await getTokenTotal(sessionId, rowIndex);
        const newTokenTotal = existingTokenTotal + ttsTotal;
        await updateTokenTotal(sessionId, newTokenTotal, rowIndex);
        console.log(`[TTS Rewrite] Token saved: ${ttsTotal} tokens (total: ${newTokenTotal}) for session ${sessionId}`);
      } catch (error) {
        console.error('[TTS Rewrite] Failed to save token to Google Sheets:', error);
        // 에러가 발생해도 메인 응답은 반환
      }
    }

    return NextResponse.json({
      success: true,
      originalText,
      rewrittenText: rewrittenText.trim(),
      tokens: {
        input: ttsInput,
        output: ttsOutput,
        total: ttsTotal,
      },
    });

  } catch (error) {
    console.error('TTS rewrite error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

