export const isInfoRequestQuestion = (question: string): boolean => {
  const infoRequestPatterns = [
    /추천|알려|정보|위치|어디|어떤|어때|어떠|있어|찾아|보여|가르쳐|안내|소개|추천해|알려줘|알려줄|가르쳐줘/i,
    /카페|식당|레스토랑|맛집|음식|장소|공간|장소|이벤트|전시|체험|활동|프로그램/i,
    /어디서|어디에|어디로|어디가|어디서|어디에|어디로|어디가/i,
  ];
  
  return infoRequestPatterns.some(pattern => pattern.test(question));
};

export const getFallbackSummary = (text: string): string => {
  const patterns = [
    { pattern: /문화.*?경험.*?곳|문화.*?경험.*?장소/i, replacement: '문화적인 경험 장소 추천' },
    { pattern: /가족.*?놀/i, replacement: '가족과 놀거리 추천' },
    { pattern: /친구.*?먹/i, replacement: '친구와 먹거리 추천' },
    { pattern: /데이트.*?좋/i, replacement: '데이트하기 좋은 곳' },
    { pattern: /컨퍼런스.*?쉬/i, replacement: '컨퍼런스 중 쉬기 좋은 곳' },
    { pattern: /홀로.*?방문/i, replacement: '홀로 방문하기 좋은 곳' },
    { pattern: /조용.*?작업/i, replacement: '조용히 작업할 카페' },
    { pattern: /핫플레이스/i, replacement: '핫플레이스 추천' },
    { pattern: /문화.*?체험/i, replacement: '문화 체험 장소' },
    { pattern: /쇼핑.*?좋/i, replacement: '쇼핑하기 좋은 곳' },
    { pattern: /추천.*?해|추천.*?해줘/i, replacement: '장소 추천' },
  ];
  
  for (const { pattern, replacement } of patterns) {
    if (pattern.test(text)) {
      return replacement.length > 20 ? replacement.substring(0, 20) : replacement;
    }
  }
  
  const keywords = ['문화', '경험', '가족', '친구', '혼자', '데이트', '컨퍼런스', '식당', '카페', '쇼핑', '장소', '곳'];
  const foundKeywords = keywords.filter(kw => text.includes(kw));
  
  if (foundKeywords.length > 0) {
    const summary = foundKeywords.slice(0, 3).join(' ') + ' 추천';
    return summary.length > 20 ? summary.substring(0, 20) : summary;
  }
  
  return text.length > 20 ? text.substring(0, 20) : text;
};

