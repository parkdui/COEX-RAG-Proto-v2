/**
 * 답변에서 아주 소량의 키워드만 추출하는 함수 (정규식 기반, AI API 호출 없이)
 * 토큰 절감을 위해 최대 3-5개의 키워드만 추출하고, 총 길이를 15자 이내로 제한
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
 * @returns 추출된 키워드들 (최대 5개, 총 15자 이내)
 */
export function extractKeywords(text: string): string {
  if (!text || text.trim().length === 0) {
    return '';
  }

  const keywords = new Set<string>();
  let totalLength = 0;
  const maxKeywords = 5;
  const maxTotalLength = 15; // 총 길이 제한 (토큰 절감)

  // 1. 장소명 추출
  for (const pattern of PLACE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        if (match.length <= 6 && totalLength + match.length <= maxTotalLength && keywords.size < maxKeywords) {
          keywords.add(match);
          totalLength += match.length;
        }
      }
    }
  }

  // 2. 주요 키워드 추출 (장소명이 부족한 경우)
  if (keywords.size < maxKeywords) {
    for (const pattern of KEYWORD_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (match.length <= 4 && totalLength + match.length <= maxTotalLength && keywords.size < maxKeywords) {
            keywords.add(match);
            totalLength += match.length;
          }
        }
      }
    }
  }

  // 키워드를 쉼표로 구분하여 반환 (최대 15자)
  const result = Array.from(keywords).slice(0, maxKeywords).join(',');
  return result.length > maxTotalLength ? result.substring(0, maxTotalLength) : result;
}
