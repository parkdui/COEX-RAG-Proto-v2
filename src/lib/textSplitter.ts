/**
 * AI 답변 텍스트를 여러 개의 말풍선으로 분할하는 유틸리티 함수들
 */

export interface TextSegment {
  text: string;
  type: 'greeting' | 'event_info' | 'general' | 'closing';
  index: number;
}

/**
 * 텍스트를 여러 세그먼트로 분할하는 함수
 * @param text 분할할 텍스트
 * @returns 분할된 텍스트 세그먼트 배열
 */
export function splitTextIntoSegments(text: string): TextSegment[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // 1. 특수 구분자로 먼저 분할 시도
  const specialDelimiters = ['|||', '---', '***', '///'];
  let segments: string[] = [];
  
  for (const delimiter of specialDelimiters) {
    if (text.includes(delimiter)) {
      segments = text.split(delimiter).map(s => s.trim()).filter(s => s.length > 0);
      break;
    }
  }

  // 2. 특수 구분자가 없으면 자동 분할 로직 사용
  if (segments.length === 0) {
    segments = autoSplitText(text);
  }

  // 3. 각 세그먼트의 타입 결정 및 객체 생성
  return segments.map((segment, index) => ({
    text: segment.trim(),
    type: determineSegmentType(segment, index, segments.length),
    index
  }));
}

/**
 * 텍스트를 자동으로 분할하는 함수
 * @param text 분할할 텍스트
 * @returns 분할된 텍스트 배열
 */
function autoSplitText(text: string): string[] {
  const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 0);
  
  if (sentences.length <= 1) {
    return [text];
  }

  const segments: string[] = [];
  let currentSegment = '';
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    
    // 문장이 너무 짧으면 다음 문장과 합치기
    if (sentence.length < 20 && i < sentences.length - 1) {
      currentSegment += (currentSegment ? '. ' : '') + sentence;
      continue;
    }
    
    // 현재 세그먼트에 문장 추가
    currentSegment += (currentSegment ? '. ' : '') + sentence;
    
    // 세그먼트가 적절한 길이가 되었거나 마지막 문장이면 분할
    if (currentSegment.length >= 50 || i === sentences.length - 1) {
      segments.push(currentSegment);
      currentSegment = '';
    }
  }
  
  // 남은 텍스트가 있으면 추가
  if (currentSegment.trim()) {
    segments.push(currentSegment);
  }
  
  return segments.length > 0 ? segments : [text];
}

/**
 * 세그먼트의 타입을 결정하는 함수
 * @param segment 텍스트 세그먼트
 * @param index 세그먼트 인덱스
 * @param totalSegments 전체 세그먼트 수
 * @returns 세그먼트 타입
 */
function determineSegmentType(segment: string, index: number, totalSegments: number): TextSegment['type'] {
  const lowerSegment = segment.toLowerCase();
  
  // 인사말 패턴
  const greetingPatterns = [
    '안녕하세요', '반가워요', '안녕', '반갑습니다', '좋은', '즐거운', '환영'
  ];
  
  // 이벤트 정보 패턴
  const eventInfoPatterns = [
    '이벤트', '전시', '박람회', '축제', '공연', '쇼', '컨퍼런스', '세미나',
    '월', '일', '년', '시간', '장소', '위치', '코엑스', 'coex',
    '부터', '까지', '기간', '예정', '진행', '개최'
  ];
  
  // 마무리 패턴
  const closingPatterns = [
    '감사합니다', '도움이 되었나요', '더 궁금한', '추가로', '마지막으로',
    '즐거운 시간', '좋은 하루', '안녕히', '다음에', '또 만나요'
  ];
  
  // 첫 번째 세그먼트이고 인사말 패턴이 있으면 인사말
  if (index === 0 && greetingPatterns.some(pattern => lowerSegment.includes(pattern))) {
    return 'greeting';
  }
  
  // 마지막 세그먼트이고 마무리 패턴이 있으면 마무리
  if (index === totalSegments - 1 && closingPatterns.some(pattern => lowerSegment.includes(pattern))) {
    return 'closing';
  }
  
  // 이벤트 정보 패턴이 있으면 이벤트 정보
  if (eventInfoPatterns.some(pattern => lowerSegment.includes(pattern))) {
    return 'event_info';
  }
  
  // 기본값은 일반
  return 'general';
}

/**
 * 세그먼트 타입에 따른 스타일 클래스 반환
 * @param type 세그먼트 타입
 * @returns CSS 클래스명
 */
export function getSegmentStyleClass(type: TextSegment['type']): string {
  switch (type) {
    case 'greeting':
      return 'border-l-4 border-blue-400 bg-blue-50 bg-opacity-10';
    case 'event_info':
      return 'border-l-4 border-green-400 bg-green-50 bg-opacity-10';
    case 'closing':
      return 'border-l-4 border-purple-400 bg-purple-50 bg-opacity-10';
    default:
      return '';
  }
}

/**
 * 세그먼트 타입에 따른 아이콘 반환
 * @param type 세그먼트 타입
 * @returns 아이콘 이모지
 */
export function getSegmentIcon(type: TextSegment['type']): string {
  switch (type) {
    case 'greeting':
      return '👋';
    case 'event_info':
      return '📅';
    case 'closing':
      return '👋';
    default:
      return '💬';
  }
}
