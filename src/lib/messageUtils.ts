/**
 * AI 응답 처리 유틸리티 함수들
 */

import { Message, QuestionCategory } from '@/types';
import { splitTextIntoSegments } from '@/lib/textSplitter';

/**
 * AI 응답 데이터를 Message 객체로 변환하는 함수
 */
export function createAssistantMessage(data: {
  answer?: string;
  tokens?: any;
  hits?: any[];
  defaultAnswer?: string;
  thumbnailUrl?: string; // 직접 thumbnailUrl을 전달할 수 있도록 추가
  siteUrl?: string; // 직접 siteUrl을 전달할 수 있도록 추가
  linkText?: string; // 사이트 링크 버튼에 표시될 텍스트
  questionCategory?: QuestionCategory; // 질문 카테고리
}): Message {
  const answerText = data.answer || data.defaultAnswer || '(응답 없음)';
  const segments = splitTextIntoSegments(answerText);
  const extractThumbnail = (hit: any): string | undefined => {
    if (!hit) return undefined;
    const meta = hit.meta || {};
    const candidates = [
      meta.thumbnail,
      meta.Thumbnail,
      meta['썸네일'],
      meta['썸네일URL'],
      meta['썸네일 Url'],
      meta['이미지'],
      meta['Image'],
      meta['Image URL'],
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    return undefined;
  };
  const extractSite = (hit: any): string | undefined => {
    if (!hit) return undefined;
    const meta = hit.meta || {};
    const candidates = [
      meta.site,
      meta.Site,
      meta['관련 사이트'],
      meta['관련사이트'],
      meta['사이트'],
      meta['Site URL'],
      meta['O'], // O column 직접 확인
      meta['O column'],
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    return undefined;
  };

  const primaryHit = (data.hits || [])[0];
  // 직접 전달된 thumbnailUrl이 있으면 우선 사용, 없으면 hits에서 추출
  const thumbnailUrl = data.thumbnailUrl || extractThumbnail(primaryHit);
  // 직접 전달된 siteUrl이 있으면 우선 사용, 없으면 hits에서 추출
  let siteUrl = data.siteUrl || extractSite(primaryHit);

  // siteUrl이 hits에서 추출된 경우에만 제목 매칭 검증 수행
  // 직접 전달된 siteUrl은 검증하지 않음 (fixedQAData 등에서 전달된 경우)
  if (siteUrl && !data.siteUrl) {
    const meta = (primaryHit && primaryHit.meta) || {};
    const titleCandidates = [
      meta.title,
      meta['행사명'],
      meta.subtitle,
      meta['행사명(서브타이틀)'],
    ]
      .filter((value) => typeof value === 'string')
      .map((value) => String(value));

    const normalizedAnswer = answerText.toLowerCase();

    const hasTitleMatch = titleCandidates.some((title) => {
      const words = title
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length >= 2);
      return words.some((word) => normalizedAnswer.includes(word));
    });

    if (!hasTitleMatch) {
      siteUrl = undefined;
    }
  }
  
  return {
    role: 'assistant',
    content: answerText,
    timestamp: new Date(),
    tokens: data.tokens,
    hits: data.hits,
    segments: segments.length > 1 ? segments : undefined,
    thumbnailUrl,
    siteUrl,
    linkText: data.linkText, // linkText 전달
    questionCategory: data.questionCategory, // 질문 카테고리 전달
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
