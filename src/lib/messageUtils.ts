/**
 * AI 응답 처리 유틸리티 함수들
 */

import { Message } from '@/types';
import { splitTextIntoSegments } from '@/lib/textSplitter';

/**
 * AI 응답 데이터를 Message 객체로 변환하는 함수
 */
export function createAssistantMessage(data: {
  answer?: string;
  tokens?: any;
  hits?: any[];
  defaultAnswer?: string;
}): Message {
  const answerText = data.answer || data.defaultAnswer || '(응답 없음)';
  const segments = splitTextIntoSegments(answerText);
  
  return {
    role: 'assistant',
    content: answerText,
    timestamp: new Date(),
    tokens: data.tokens,
    hits: data.hits,
    segments: segments.length > 1 ? segments : undefined
  };
}

/**
 * 에러 메시지를 생성하는 함수
 */
export function createErrorMessage(error: string): Message {
  return {
    role: 'assistant',
    content: '⚠️ ' + error,
    timestamp: new Date()
  };
}

/**
 * 사용자 메시지를 생성하는 함수
 */
export function createUserMessage(content: string): Message {
  return {
    role: 'user',
    content,
    timestamp: new Date()
  };
}
