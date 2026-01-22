/**
 * 답변에서 아주 소량의 키워드만 추출하는 함수 (정규식 기반, AI API 호출 없이)
 * Quality analysis를 위해 각 대화 턴마다 최대 2개의 키워드만 추출
 */

// 코엑스 관련 주요 장소명 패턴
const PLACE_PATTERNS = [
  /(메가박스|아쿠아리움|코엑스|아셈|컨벤션|전시|박물관|라이브러리|스타필드)/g,
  /([가-힣]+(관|극장|센터|홀|플라자|마트|카페|레스토랑|식당))/g,
];

// 주요 키워드 패턴 (장소명 제외)
const KEYWORD_PATTERNS = [
  /(함께|혼자|가족|친구|연인|커플|데이트|쇼핑|구경|전시|공연|영화|식사|맛집|카페)/g,
];

/**
 * 텍스트에서 키워드 추출
 * @param text 답변 텍스트
 * @returns 추출된 키워드들 (최대 2개, Quality analysis를 위해 제한)
 */
export function extractKeywords(text: string): string {
  if (!text || text.trim().length === 0) {
    return '';
  }

  const keywords = new Set<string>();
  const maxKeywords = 2; // Quality analysis를 위해 2개로 제한

  // 1. 장소명 추출
  for (const pattern of PLACE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        if (match.length <= 6 && keywords.size < maxKeywords) {
          keywords.add(match);
          if (keywords.size >= maxKeywords) break;
        }
      }
    }
    if (keywords.size >= maxKeywords) break;
  }

  // 2. 주요 키워드 추출 (장소명이 부족한 경우)
  if (keywords.size < maxKeywords) {
    for (const pattern of KEYWORD_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (match.length <= 4 && keywords.size < maxKeywords) {
            keywords.add(match);
            if (keywords.size >= maxKeywords) break;
          }
        }
      }
      if (keywords.size >= maxKeywords) break;
    }
  }

  // 키워드를 쉼표로 구분하여 반환 (최대 2개)
  return Array.from(keywords).slice(0, maxKeywords).join(',');
}
