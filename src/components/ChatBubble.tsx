/**
 * ChatBubble 컴포넌트
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChatBubbleProps } from '@/types';
import { getSegmentStyleClass, getSegmentIcon } from '@/lib/textSplitter';
import { SplitWords, TypingEffect, SplitText, Typewriter, ChatTypewriterV1, ChatTypewriterV2, ChatTypewriterV3 } from '@/components/ui';
import AnimatedOutlineStroke from '@/components/ui/AnimatedOutlineStroke';
import { getCategoryImage } from '@/lib/categoryImages';

type TypewriterVariant = 'v1' | 'v2' | 'v3';
type GlassStyleVariant = 'v1' | 'v2';

const typewriterComponents: Record<TypewriterVariant, React.ComponentType<any>> = {
  v1: ChatTypewriterV1,
  v2: ChatTypewriterV2,
  v3: ChatTypewriterV3,
};

// Prism colors from p5.js sketch (HSB format: [H, S, B])
const PRISM_COLORS = [
  [0, 100, 100],   // Red
  [45, 100, 100],  // Yellow
  [120, 100, 100], // Green
  [200, 100, 100], // Cyan
  [260, 100, 100], // Purple
];

// Convert HSB to RGB (H: 0-360, S: 0-100, B: 0-100)
// This matches p5.js colorMode(HSB, 360, 100, 100)
const hsbToRgb = (h: number, s: number, b: number): { r: number; g: number; b: number } => {
  // Normalize values: H is already 0-360, S and B are 0-100
  const hNorm = h / 360;
  const sNorm = s / 100;
  const bNorm = b / 100;

  let r = 0, g = 0, bl = 0;

  if (sNorm === 0) {
    // No saturation - grayscale
    r = g = bl = bNorm;
  } else {
    const i = Math.floor(hNorm * 6);
    const f = hNorm * 6 - i;
    const p = bNorm * (1 - sNorm);
    const q = bNorm * (1 - f * sNorm);
    const t = bNorm * (1 - (1 - f) * sNorm);

    switch (i % 6) {
      case 0: r = bNorm; g = t; bl = p; break;
      case 1: r = q; g = bNorm; bl = p; break;
      case 2: r = p; g = bNorm; bl = t; break;
      case 3: r = p; g = q; bl = bNorm; break;
      case 4: r = t; g = p; bl = bNorm; break;
      case 5: r = bNorm; g = p; bl = q; break;
    }
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(bl * 255),
  };
};

// Apply screen mode-like effect to make colors brighter and more prism-like
// This simulates screen blend mode: brighter, more luminous colors (like Photoshop screen mode)
const applyScreenEffect = (r: number, g: number, b: number, intensity: number = 0.4): { r: number; g: number; b: number } => {
  // Screen blend mode simulation: blend with white to create brighter, more luminous colors
  // intensity: 0 = original color, 1 = pure white (0.35-0.45 works well for prism effect)
  // Uses linear interpolation toward white: result = color + (255 - color) * intensity
  // This creates the bright, luminous effect similar to screen blend mode
  const screenR = r + (255 - r) * intensity;
  const screenG = g + (255 - g) * intensity;
  const screenB = b + (255 - b) * intensity;
  
  return {
    r: Math.round(Math.min(255, Math.max(0, screenR))),
    g: Math.round(Math.min(255, Math.max(0, screenG))),
    b: Math.round(Math.min(255, Math.max(0, screenB))),
  };
};

// Get random color from prism colors with screen mode effect
const getRandomPrismColor = (): { r: number; g: number; b: number } => {
  const randomIndex = Math.floor(Math.random() * PRISM_COLORS.length);
  const [h, s, b] = PRISM_COLORS[randomIndex];
  const rgb = hsbToRgb(h, s, b);
  // Apply screen effect to make colors brighter and more prism-like
  return applyScreenEffect(rgb.r, rgb.g, rgb.b, 0.4);
};

// Get dynamic dot color based on typewriter variant
const getDotColor = (typewriterVariant: TypewriterVariant): string => {
  if (typewriterVariant === 'v1') {
    // Use prism colors for v1 - generate random color on each call
    const { r, g, b } = getRandomPrismColor();
    return `rgb(${r}, ${g}, ${b})`;
  }
  return '#000'; // Default black for other variants
};

const assistantGlassWrapperStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 'min(360px, 92vw)',
  margin: '0 auto 0px auto', // 하단 margin 제거
  pointerEvents: 'none',
  position: 'relative',
  zIndex: 10,
  paddingBottom: '4px', // 하단 padding 축소
};

// Version 1: Original glass style
const assistantGlassContentStyleV1: React.CSSProperties = {
  display: 'grid',
  gap: 'clamp(18px, 3.6vw, 26px)',
  padding: 'clamp(22px, 5.2vw, 30px)',
  borderRadius: '28px',
  background: 'rgba(255, 255, 255, 0.025)',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  boxShadow:
    '0 12px 20px rgba(22, 42, 58, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.88), inset 0 -5px 14px rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(42px) saturate(2.35) contrast(1.08)',
  WebkitBackdropFilter: 'blur(42px) saturate(2.35) contrast(1.08)',
  textAlign: 'center',
  color: '#0f2420',
  position: 'relative',
  overflow: 'hidden',
  pointerEvents: 'auto',
};

// Version 2: Glass modal style (from ver8/1.js glass-content)
const assistantGlassContentStyleV2: React.CSSProperties = {
  display: 'grid',
  gap: 'clamp(18px, 3.8vw, 26px)',
  padding: 'clamp(26px, 5.6vw, 34px) clamp(20px, 5vw, 28px) clamp(24px, 5.6vw, 34px)',
  borderRadius: 'clamp(32px, 10vw, 48px)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.00) 16.666%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.38) 66%, rgba(255,255,255,0.70) 100%)',
  border: '0.5px solid rgba(255,255,255,0.20)',
  boxShadow:
    '0 8px 12px rgba(22, 42, 58, 0.10), inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 -12px 36px rgba(255,255,255,0.05)',
  backdropFilter: 'blur(40px) saturate(0.9) brightness(1.04) contrast(0.96)',
  WebkitBackdropFilter: 'blur(40px) saturate(0.9) brightness(1.04) contrast(0.96)',
  filter: 'saturate(0.92)',
  textAlign: 'center',
  color: '#1f2640',
  position: 'relative',
  overflow: 'hidden',
  pointerEvents: 'auto',
};

// Helper function to get glass style based on variant
const getAssistantGlassContentStyle = (variant: GlassStyleVariant = 'v2'): React.CSSProperties => {
  return variant === 'v1' ? assistantGlassContentStyleV1 : assistantGlassContentStyleV2;
};

const assistantPrimaryTextStyle: React.CSSProperties = {
  color: '#215F74',
  fontFamily: 'Pretendard Variable',
  fontSize: '16px',
  fontStyle: 'normal',
  fontWeight: 400,
  lineHeight: '140%',
  letterSpacing: '-0.64px',
  textAlign: 'center',
  wordBreak: 'keep-all',
  overflowWrap: 'break-word',
  width: '86%',
  marginLeft: 'auto',
  marginRight: 'auto',
} as const;

const assistantHeadlineTextStyle: React.CSSProperties = {
  color: '#004861',
  textAlign: 'center',
  fontFamily: 'Pretendard Variable',
  fontSize: '18px',
  fontStyle: 'normal',
  fontWeight: 600,
  lineHeight: '130%',
  letterSpacing: '-0.72px',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  whiteSpace: 'pre-wrap',
  maxWidth: '100%',
} as const;

const assistantHeadlineTextStyleV2: React.CSSProperties = {
  color: '#000',
  textAlign: 'center',
  fontFamily: 'Pretendard Variable',
  fontSize: '18px',
  fontStyle: 'normal',
  fontWeight: 400,
  lineHeight: '130%',
  letterSpacing: '-0.72px',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  whiteSpace: 'pre-wrap',
  maxWidth: '100%',
} as const;

const quotedSpanStyle: React.CSSProperties = {
  fontWeight: 600,
  borderRadius: '5px',
  background: 'rgba(255, 255, 255, 0.6)',
  border: 'none',
  whiteSpace: 'nowrap',
  verticalAlign: 'baseline',
  lineHeight: '1.4',
  display: 'inline-flex',
  alignItems: 'center',
  marginLeft: 0,
  marginRight: '0.3rem',
  position: 'relative',
} as const;

const quotedSpanBackdropStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: '5px',
  padding: '1px',
  background: 'linear-gradient(45deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 1) 100%)',
  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
  WebkitMaskComposite: 'xor',
  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
  maskComposite: 'exclude',
  pointerEvents: 'none',
  zIndex: 1,
} as const;

const quotedSpanContentStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 2,
  fontSize: 'calc(1em - 1px)', // 부모 크기에서 1px 줄임
  color: '#004861',
  fontWeight: 600,
  letterSpacing: '-0.36px',
} as const;

const KEYWORD_MATCH_REGEX = /''(.*?)''|'([^']+)'|""(.*?)""|\*\*(.*?)\*\*/;

const siteLinkWrapperStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '8px 16px',
  alignItems: 'center',
  gap: '6px',
  borderRadius: '24px',
  background: 'linear-gradient(131deg, rgba(255, 255, 255, 0.25) 13.16%, rgba(230, 210, 255, 0.55) 50%, rgba(223, 223, 255, 0.65) 71.01%)',
  border: '1px solid #D2D2FC',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 9.1px 0 rgba(166, 166, 166, 0.2)',
  textDecoration: 'none',
  backdropFilter: 'blur(16px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
} as const;

const siteLinkTextStyle: React.CSSProperties = {
  color: 'rgba(112, 60, 161, 0.70)',
  textAlign: 'center',
  fontFamily: 'Pretendard Variable',
  fontSize: '13px',
  fontStyle: 'normal',
  fontWeight: 500,
  lineHeight: '140%',
  letterSpacing: '-0.6px',
} as const;

const siteLinkIconStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  filter: 'none',
  opacity: 0.7,
} as const;

const AssistantGlassStyles = () => (
  <style jsx global>{`
    .assistant-glass-content::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 55%, rgba(255,255,255,0.0) 100%);
      mix-blend-mode: screen;
      opacity: 0.06;
      pointer-events: none;
    }
    .assistant-glass-content::after {
      content: '';
      position: absolute;
      inset: -28%;
      background:
        radial-gradient(circle at 18% 14%, rgba(255,255,255,0.08), transparent 60%),
        radial-gradient(circle at 86% 78%, rgba(118,212,255,0.035), transparent 70%),
        rgba(255,255,255,0.010);
      opacity: 0.07;
      filter: blur(50px) saturate(1.0);
      pointer-events: none;
    }
    .assistant-glass-highlight {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 2px;
      background: linear-gradient(45deg, transparent 25%, rgba(255, 255, 255, 0.6) 50%, transparent 75%, transparent 100%);
      background-size: 400% 400%;
      animation: gradient-rotate 2s linear;
      pointer-events: none;
      z-index: 1;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      -webkit-mask-composite: xor;
    }
    .assistant-glass-body {
      position: relative;
      z-index: 4;
    }
    @keyframes gradient-rotate {
      0% {
        background-position: 0% 50%;
      }
      100% {
        background-position: 200% 50%;
      }
    }
    .site-link-button:focus {
      outline: none;
    }
    /* Width expansion animation for loading div */
    @keyframes expandWidth {
      0% {
        width: 120px;
      }
      100% {
        width: 92vw;
        max-width: 360px;
      }
    }
  `}</style>
);

const computeDotSize = (fontSize?: string | number) => {
  if (!fontSize) return '19.2px';

  if (typeof fontSize === 'number') {
    return `${fontSize * 1.2}px`;
  }

  if (typeof fontSize === 'string') {
    const sizeValue = parseFloat(fontSize);
    if (Number.isNaN(sizeValue)) {
      return '19.2px';
    }

    if (fontSize.includes('px')) {
      return `${sizeValue * 1.2}px`;
    }

    if (fontSize.includes('pt')) {
      return `${sizeValue * 1.2}pt`;
    }

    if (fontSize.includes('em')) {
      return `${sizeValue * 1.2}em`;
    }
  }

  return '19.2px';
};

const trimLeadingWhitespace = (value: string) => value.replace(/^\s+/, '');

/**
 * 마침표만 있는 줄을 제거하는 함수
 */
const removeDotOnlyLines = (text: string): string => {
  if (!text) return text;
  return text
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      // 마침표만 있는 줄 제거 (공백과 마침표만 있는 경우)
      return trimmed !== '.' && trimmed !== '。';
    })
    .join('\n');
};

/**
 * 작은따옴표(''), 큰따옴표(""), '**'로 감싸진 텍스트를 파싱하는 함수
 */
const parseQuotedText = (text: string): Array<{ text: string; isQuoted: boolean }> => {
  if (!text) return [{ text: '', isQuoted: false }];
  
  const parts: Array<{ text: string; isQuoted: boolean }> = [];
  let lastIndex = 0;
  
  // 모든 마커 패턴: 작은따옴표 쌍(''), 단일 작은따옴표('), 큰따옴표(""), '**'
  // 작은따옴표 쌍을 먼저 찾고, 그 다음 단일 작은따옴표를 찾음
  // 단일 작은따옴표: 작은따옴표로 시작하고 끝나는 텍스트 (한글/영문 포함)
  const patterns = [
    { regex: /''(.*?)''/g, name: 'double-single' }, // 작은따옴표 쌍 먼저 체크
    { regex: /'(.*?)'/g, name: 'single' }, // 단일 작은따옴표
    { regex: /""(.*?)""/g, name: 'double' },
    { regex: /\*\*(.*?)\*\*/g, name: 'bold' },
    { regex: /\*(.*?)\*/g, name: 'bold' }
  ];
  
  const allMatches: Array<{ start: number; end: number; text: string; type: string }> = [];
  
  // 모든 패턴에서 매칭 찾기
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      // 단일 작은따옴표의 경우, 작은따옴표 쌍과 겹치지 않도록 체크
      if (pattern.name === 'single') {
        // 작은따옴표 쌍('')과 겹치는지 확인
        const beforeChar = text[match.index - 1];
        const afterEndChar = text[match.index + match[0].length];
        if (beforeChar === "'" || afterEndChar === "'") {
          // 작은따옴표 쌍의 일부이므로 건너뜀
          continue;
        }
      }
      
      allMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        type: pattern.name
      });
    }
  }
  
  // 시작 위치 순으로 정렬
  allMatches.sort((a, b) => a.start - b.start);
  
  // 겹치지 않는 매칭만 선택
  const validMatches: Array<{ start: number; end: number; text: string; type: string }> = [];
  for (const match of allMatches) {
    if (validMatches.length === 0 || match.start >= validMatches[validMatches.length - 1].end) {
      validMatches.push(match);
    }
  }
  
  
  // 텍스트 파싱
  for (const match of validMatches) {
    // 매칭 이전 텍스트
    if (match.start > lastIndex) {
      const beforeText = text.substring(lastIndex, match.start);
      if (beforeText) {
        parts.push({ text: beforeText, isQuoted: false });
      }
    }
    
    // 매칭된 텍스트
    if (match.text) {
      parts.push({ text: match.text, isQuoted: true });
    }
    
    lastIndex = match.end;
  }
  
  // 남은 텍스트
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push({ text: remainingText, isQuoted: false });
    }
  }
  
  // 매칭이 없으면 전체 텍스트 반환
  if (parts.length === 0) {
    parts.push({ text, isQuoted: false });
  }
  
  return parts;
};

const FIRST_SENTENCE_REGEX = /[^.!?]*(?:[.!?]|$)/;
const SENTENCE_REGEX = /[^.!?]+[.!?]?/g;

const extractFirstSentence = (text: string) => {
  if (!text) return '';
  const match = text.match(FIRST_SENTENCE_REGEX);
  return match ? match[0].trim() : text.split(/[.!?]/)[0].trim();
};

const getRemainingText = (text: string, firstSentence: string) => {
  if (!text) return '';
  if (!firstSentence) return text;
  const index = text.indexOf(firstSentence);
  if (index === -1) return text;
  const rest = text.substring(index + firstSentence.length);
  return rest.trimStart();
};

const getHighlightedTextParts = (text: string): { highlightedText: string; remainderText: string } => {
  if (!text) {
    return { highlightedText: '', remainderText: '' };
  }

  const sentenceRegex = new RegExp(SENTENCE_REGEX.source, SENTENCE_REGEX.flags);
  const matches = Array.from(text.matchAll(sentenceRegex)).filter(
    (match) => (match[0] ?? '').trim().length > 0
  );

  if (matches.length === 0) {
    return { highlightedText: text.trim(), remainderText: '' };
  }

  const firstMatch = matches[0];
  const firstMatchIndex = firstMatch.index ?? 0;
  let highlightEndIndex = firstMatchIndex + firstMatch[0].length;
  const firstTrimmedLength = firstMatch[0].trim().length;

  if (firstTrimmedLength <= 6 && matches.length > 1) {
    const secondMatch = matches[1];
    const secondMatchIndex = secondMatch.index ?? 0;
    highlightEndIndex = secondMatchIndex + secondMatch[0].length;
  }

  const highlightedText = text.slice(0, highlightEndIndex).trim();
  let remainderText = text.slice(highlightEndIndex).trimStart();

  // remainderText에서 마침표만 있거나 공백+마침표만 있는 경우 제거
  // 예: "." 또는 ". " 또는 " ." 같은 경우
  remainderText = remainderText.replace(/^\s*[.!?]\s*$/, '').trim();

  if (!highlightedText) {
    return { highlightedText: text.trim(), remainderText: '' };
  }

  return { highlightedText, remainderText };
};

const removeLastSentence = (text: string) => {
  if (!text) return '';
  const matches = text.match(SENTENCE_REGEX);
  if (!matches || matches.length <= 1) {
    return '';
  }
  
  // 마지막 문장을 제거
  const result = matches.slice(0, -1).join(' ').trim();
  
  // 마지막 문장 제거 후 끝에 마침표만 남은 경우 제거
  // 예: "텍스트입니다. ." -> "텍스트입니다" (빈 마침표 제거)
  // 또는 "텍스트입니다. . " -> "텍스트입니다" (공백과 마침표만 남은 경우)
  const cleanedResult = result.replace(/\s*[.!?]\s*$/, '').trim();
  
  return cleanedResult;
};

/**
 * 개선된 텍스트 줄바꿈 로직
 * 1. 기본 줄 길이 유지 (기존 로직 존중) - estimatedCharsPerLine = 20 유지
 * 2. 단어 단위 줄바꿈 적용 (단어가 잘리지 않도록 공백 단위로만 줄바꿈)
 * 3. 외줄 단어 방지 (마지막 줄에 단어 1개만 남는 경우 방지)
 * 4. 문맥 우선 순위 (마침표, 쉼표 등에서 우선 줄바꿈)
 * 키워드가 있는 경우 키워드는 반드시 한 줄에 유지
 */
const adjustHeadlineLineBreaks = (text: string, minLineLength: number = 20): string => {
  if (!text || text.length <= minLineLength) {
    return text;
  }

  // 키워드 위치 찾기 (''(.*?)''|'(.*?)'|""(.*?)""|\*\*(.*?)\*\*)
  const keywordMatches: Array<{ start: number; end: number; keyword: string }> = [];
  let match;
  const keywordRegex = new RegExp(KEYWORD_MATCH_REGEX.source, 'g');
  
  while ((match = keywordRegex.exec(text)) !== null) {
    const keywordText = match[1] ?? match[2] ?? match[3] ?? match[4] ?? '';
    if (keywordText && match.index !== undefined) {
      keywordMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        keyword: match[0],
      });
    }
  }

  // 텍스트를 단어 단위로 분할하되, 키워드와 문맥 구분자 정보도 함께 관리
  const words: Array<{ word: string; isKeyword: boolean; keywordIndex?: number; hasContextBreak?: boolean }> = [];
  let lastIndex = 0;
  
  keywordMatches.forEach((keywordMatch, idx) => {
    // 키워드 이전 텍스트를 단어로 분할 (문맥 구분자 고려)
    const beforeText = text.substring(lastIndex, keywordMatch.start).trim();
    if (beforeText) {
      // 문맥 구분자를 기준으로 단어 분할
      const segments = beforeText.split(/([.,!?。，！？]\s*)/);
      segments.forEach(segment => {
        if (segment.trim()) {
          segment.split(/\s+/).forEach(word => {
            if (word) {
              const hasBreak = /[.,!?。，！？]/.test(word);
              words.push({ word, isKeyword: false, hasContextBreak: hasBreak });
            }
          });
        }
      });
    }
    
    // 키워드 추가
    words.push({ word: keywordMatch.keyword, isKeyword: true, keywordIndex: idx });
    lastIndex = keywordMatch.end;
  });
  
  // 키워드 이후 텍스트를 단어로 분할 (문맥 구분자 고려)
  const afterText = text.substring(lastIndex).trim();
  if (afterText) {
    const segments = afterText.split(/([.,!?。，！？]\s*)/);
    segments.forEach(segment => {
      if (segment.trim()) {
        segment.split(/\s+/).forEach(word => {
          if (word) {
            const hasBreak = /[.,!?。，！？]/.test(word);
            words.push({ word, isKeyword: false, hasContextBreak: hasBreak });
          }
        });
      }
    });
  }

  if (words.length <= 1) {
    return text;
  }

  // 줄바꿈을 계산하기 위한 기준 (기존 로직 존중)
  // assistantHeadlineTextStyle의 fontSize는 18px, width는 86% (대략 280px)
  // 한글 기준으로 대략 18px 폰트에서 컨테이너 너비 약 280px = 약 15-16글자 정도
  const estimatedCharsPerLine = 20;
  const thresholdChars = 22; // 임계값 기준 정렬 (20~25자 중간값)
  
  const lines: string[] = [];
  let currentLine = '';
  let currentLineContainsKeyword = false;
  
  // 1단계: 초기 줄바꿈 계산 (단어 단위, 문맥 우선)
  for (let i = 0; i < words.length; i++) {
    const wordInfo = words[i];
    const word = wordInfo.word;
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    // 키워드인 경우: 반드시 한 줄에 유지
    if (wordInfo.isKeyword) {
      if (currentLine && testLine.length > estimatedCharsPerLine) {
        lines.push(currentLine);
        currentLine = word;
        currentLineContainsKeyword = true;
      } else {
        currentLine = testLine;
        currentLineContainsKeyword = true;
      }
    } else {
      // 문맥 구분자가 있는 경우: 임계값 근처에서 우선 줄바꿈 (문맥 우선 순위)
      if (wordInfo.hasContextBreak && currentLine) {
        const currentLength = currentLine.length;
        // 임계값 근처(±3자)에서 문맥 구분자가 있으면 줄바꿈
        if (currentLength >= thresholdChars - 3 && currentLength <= thresholdChars + 3) {
          lines.push(testLine);
          currentLine = '';
          currentLineContainsKeyword = false;
          continue;
        }
      }
      
      // 일반 단어인 경우: 단어 단위 줄바꿈 (단어가 잘리지 않도록)
      if (currentLineContainsKeyword) {
        // 키워드가 포함된 줄은 더 신중하게 처리
        if (testLine.length > estimatedCharsPerLine && currentLine) {
          lines.push(currentLine);
          currentLine = word;
          currentLineContainsKeyword = false;
        } else {
          currentLine = testLine;
        }
      } else {
        // 일반 줄바꿈 로직: 단어가 잘리지 않도록 공백 단위로만 줄바꿈
        if (testLine.length > estimatedCharsPerLine && currentLine) {
          lines.push(currentLine);
          currentLine = word;
          currentLineContainsKeyword = false;
        } else {
          currentLine = testLine;
        }
      }
    }
  }
  
  // 마지막 줄 추가
  if (currentLine) {
    lines.push(currentLine);
  }

  // 2단계: 외줄 단어 방지 (마지막 줄에 단어 1개만 남는 경우)
  if (lines.length > 1) {
    const lastLineWords = lines[lines.length - 1].split(/\s+/).filter(w => w.length > 0);
    const secondLastLineWords = lines[lines.length - 2].split(/\s+/).filter(w => w.length > 0);
    
    // 마지막 줄에 단어가 1개만 있고, 앞 줄에 단어가 2개 이상인 경우
    if (lastLineWords.length === 1 && secondLastLineWords.length >= 2) {
      const lastWord = lastLineWords[0];
      const isLastWordKeyword = keywordMatches.some(km => lastWord === km.keyword);
      
      // 키워드가 아닌 경우에만 앞 줄의 마지막 단어와 함께 아래로 내림
      if (!isLastWordKeyword) {
        const secondLastWord = secondLastLineWords.pop();
        if (secondLastWord) {
          lines[lines.length - 2] = secondLastLineWords.join(' ');
          lines[lines.length - 1] = `${secondLastWord} ${lastWord}`;
        }
      }
    }
  }

  // 3단계: 시각적 균형 보정 (너무 짧은 줄이 생기지 않도록)
  for (let i = lines.length - 1; i >= 0; i--) {
    const lineLength = lines[i].replace(/\s/g, '').length; // 공백 제외한 실제 글자 수
    
    // 너무 짧은 줄(최소 길이 미만)이 있고, 앞 줄이 있는 경우
    if (lineLength < minLineLength && i > 0) {
      const prevLineWords = lines[i - 1].split(/\s+/).filter(w => w.length > 0);
      const currentLineWords = lines[i].split(/\s+/).filter(w => w.length > 0);
      
      // 앞 줄의 마지막 단어가 키워드가 아닌지 확인
      const lastPrevWord = prevLineWords[prevLineWords.length - 1];
      const isLastPrevWordKeyword = keywordMatches.some(km => lastPrevWord === km.keyword);
      
      // 앞 줄에 단어가 2개 이상이고, 마지막 단어가 키워드가 아닌 경우
      if (prevLineWords.length > 1 && !isLastPrevWordKeyword) {
        const lastWord = prevLineWords.pop();
        if (lastWord) {
          lines[i - 1] = prevLineWords.join(' ');
          lines[i] = `${lastWord} ${currentLineWords.join(' ')}`.trim();
        }
      }
    }
  }

  // 줄바꿈 문자로 조인하여 반환
  // white-space: pre-wrap이 이를 유지하여 렌더링
  return lines.join('\n');
};

/**
 * 텍스트를 작은따옴표, 큰따옴표, '**' 파싱 결과로 렌더링하는 컴포넌트
 */
const QuotedTextRendererComponent: React.FC<{ text: string; enableKeywordLineBreak?: boolean }> = ({ text, enableKeywordLineBreak = false }) => {
  const parts = useMemo(() => parseQuotedText(text), [text]);

  const renderQuotedSpan = useCallback(
    (partText: string, spanKey: React.Key) => (
      <span key={spanKey} className="px-2 py-0.5 relative" style={quotedSpanStyle}>
        <span style={quotedSpanBackdropStyle} />
        <span style={quotedSpanContentStyle}>{partText}</span>
      </span>
    ),
    []
  );

  const renderSegmentNodes = useCallback(
    (segments: Array<{ text: string; isQuoted: boolean }>, keyPrefix: string): React.ReactNode[] => {
      const nodes: React.ReactNode[] = [];

      segments.forEach((segment, index) => {
        const nodeKey = `${keyPrefix}-${index}`;
        if (segment.isQuoted) {
          // 따옴표로 감싼 텍스트도 \n 처리
          const lines = segment.text.split('\n');
          lines.forEach((line, lineIdx) => {
            nodes.push(renderQuotedSpan(line, `${nodeKey}-quoted-${lineIdx}`));
            if (lineIdx < lines.length - 1) {
              nodes.push(<br key={`${nodeKey}-quoted-br-${lineIdx}`} />);
            }
          });
        } else if (segment.text) {
          const lines = segment.text.split('\n');
          lines.forEach((line, lineIdx) => {
            nodes.push(<React.Fragment key={`${nodeKey}-text-${lineIdx}`}>{line}</React.Fragment>);
            if (lineIdx < lines.length - 1) {
              nodes.push(<br key={`${nodeKey}-br-${lineIdx}`} />);
            }
          });
        }
      });

      return nodes;
    },
    [renderQuotedSpan]
  );

  const keywordInfo = useMemo(() => {
    if (!enableKeywordLineBreak) {
      return null;
    }

    const keywordMatch = text.match(KEYWORD_MATCH_REGEX);
    if (!keywordMatch || keywordMatch.index === undefined) {
      return null;
    }

    const fullMatch = keywordMatch[0];
    const keywordText = keywordMatch[1] ?? keywordMatch[2] ?? keywordMatch[3] ?? keywordMatch[4] ?? '';
    if (!keywordText) {
      return null;
    }

    const beforeText = text.slice(0, keywordMatch.index);
    const afterText = text.slice(keywordMatch.index + fullMatch.length);
    const hasBeforeContent = beforeText.trim().length > 0;

    return {
      beforeSegments: renderSegmentNodes(parseQuotedText(beforeText), 'before'),
      afterSegments: renderSegmentNodes(parseQuotedText(afterText), 'after'),
      hasBeforeContent,
      keywordText,
    };
  }, [enableKeywordLineBreak, text, renderSegmentNodes]);

  if (keywordInfo) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: keywordInfo.hasBeforeContent ? '0.1rem' : 0,
          width: '100%',
        }}
      >
        {keywordInfo.hasBeforeContent && <div style={{ width: '100%', textAlign: 'center' }}>{keywordInfo.beforeSegments}</div>}
        <div style={{ width: '100%', textAlign: 'center' }}>
          {renderQuotedSpan(keywordInfo.keywordText, 'keyword-main')}
          {keywordInfo.afterSegments}
        </div>
      </div>
    );
  }

  return <>{renderSegmentNodes(parts, 'default')}</>;
};

const QuotedTextRenderer = React.memo(QuotedTextRendererComponent);
QuotedTextRenderer.displayName = 'QuotedTextRenderer';

/**
 * 토큰 정보 컴포넌트 (현재는 렌더링하지 않지만 타입 호환성을 위해 유지)
 */
const TokenInfo: React.FC<{ tokens: any }> = () => null;

/**
 * 히트 정보 컴포넌트 (현재는 렌더링하지 않지만 타입 호환성을 위해 유지)
 */
const HitInfo: React.FC<{ hits: any[] }> = () => null;

const SiteLinkComponent: React.FC<{ url: string; linkText?: string }> = ({ url, linkText }) => (
  <a href={url} target="_blank" rel="noopener noreferrer" className="site-link-button" style={siteLinkWrapperStyle}>
    <span style={siteLinkTextStyle}>{linkText || '바로가기'}</span>
    <img src="/link-external-01.svg" alt="" style={siteLinkIconStyle} />
  </a>
);

const SiteLink = React.memo(SiteLinkComponent);
SiteLink.displayName = 'SiteLink';

// 피드백 UI 컴포넌트
const FeedbackComponent: React.FC<{ 
  onFeedback: (feedback: 'negative' | 'positive') => void;
  isVisible: boolean;
  onContinueRecommendation?: () => void;
}> = ({ onFeedback, isVisible, onContinueRecommendation }) => {
  const [selectedFeedback, setSelectedFeedback] = useState<'negative' | 'positive' | null>(null);
  const [showFeedbackText, setShowFeedbackText] = useState(false);
  const [showContinueButton, setShowContinueButton] = useState(false);

  const handleFeedbackClick = (feedback: 'negative' | 'positive') => {
    if (selectedFeedback) return; // 이미 선택된 경우 무시
    setSelectedFeedback(feedback);
    
    // fade-out 애니메이션 후 피드백 텍스트 표시
    setTimeout(() => {
      setShowFeedbackText(true);
      onFeedback(feedback);
      
      // '잘 맞아요'를 클릭한 경우 추가 버튼 표시
      if (feedback === 'positive') {
        setTimeout(() => {
          setShowContinueButton(true);
        }, 400);
      }
    }, 400); // fade-out duration과 맞춤
  };

  const handleContinueRecommendation = () => {
    if (onContinueRecommendation) {
      onContinueRecommendation();
    }
  };

  if (!isVisible) return null;

  const feedbackMessages = {
    negative: '아, 아쉬우셨군요.\n다음부터는 이솔이 다른 주제를 답변해볼게요!',
    positive: '이 방향으로 이솔이 더 생각해볼게요!',
  };

  return (
    <div
      className="mt-4"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.4s ease-in-out',
      }}
    >
      {!showFeedbackText ? (
        // 초기 상태: '추천이 적절했나요?' 텍스트 + 버튼 2개
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            opacity: selectedFeedback === null ? 1 : 0,
            transition: 'opacity 0.4s ease-in-out',
          }}
        >
          {/* '추천이 적절했나요?' 텍스트 */}
          <div
            style={{
              color: 'rgba(112, 60, 161, 0.70)',
              fontFamily: 'Pretendard Variable',
              fontSize: '14px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '140%',
              letterSpacing: '-0.56px',
              whiteSpace: 'nowrap',
            }}
          >
            추천이 적절했나요?
          </div>

          {/* 버튼 2개 */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => handleFeedbackClick('negative')}
              disabled={selectedFeedback !== null}
              style={{
                borderRadius: '24px',
                border: '1px solid rgba(200, 180, 230, 0.5)',
                background: selectedFeedback === 'negative'
                  ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(230, 210, 255, 0.7) 50%, rgba(220, 200, 250, 0.6) 100%)'
                  : 'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(230, 210, 255, 0.6) 50%, rgba(220, 200, 250, 0.5) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 9.1px 0 rgba(166, 166, 166, 0.25)',
                backdropFilter: 'blur(16px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
                padding: '8px 16px',
                cursor: selectedFeedback !== null ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  fontFamily: 'Pretendard Variable',
                  fontSize: '13px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '140%',
                  letterSpacing: '-0.6px',
                  color: 'rgba(112, 60, 161, 0.70)',
                }}
              >
                조금 아쉬워요
              </span>
            </button>

            <button
              onClick={() => handleFeedbackClick('positive')}
              disabled={selectedFeedback !== null}
              style={{
                borderRadius: '24px',
                border: '1px solid rgba(200, 180, 230, 0.5)',
                background: selectedFeedback === 'positive'
                  ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(230, 210, 255, 0.7) 50%, rgba(220, 200, 250, 0.6) 100%)'
                  : 'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(230, 210, 255, 0.6) 50%, rgba(220, 200, 250, 0.5) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 9.1px 0 rgba(166, 166, 166, 0.25)',
                backdropFilter: 'blur(16px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
                padding: '8px 16px',
                cursor: selectedFeedback !== null ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  fontFamily: 'Pretendard Variable',
                  fontSize: '13px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '140%',
                  letterSpacing: '-0.6px',
                  color: 'rgba(112, 60, 161, 0.70)',
                }}
              >
                잘 맞아요
              </span>
            </button>
          </div>
        </div>
      ) : (
        // 피드백 선택 후: 피드백 메시지 텍스트
        <div
          style={{
            opacity: 0,
            animation: 'fadeIn 0.4s ease-in-out forwards',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                color: 'rgba(112, 60, 161, 0.70)',
                fontFamily: 'Pretendard Variable',
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '140%',
                letterSpacing: '-0.56px',
              }}
            >
              {selectedFeedback && feedbackMessages[selectedFeedback]}
            </div>
            
            {/* '잘 맞아요' 클릭 시 추가 버튼 표시 */}
            {showContinueButton && selectedFeedback === 'positive' && (
              <button
                onClick={handleContinueRecommendation}
                style={{
                  borderRadius: '24px',
                  border: '1px solid rgba(200, 180, 230, 0.5)',
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(230, 210, 255, 0.6) 50%, rgba(220, 200, 250, 0.5) 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 9.1px 0 rgba(166, 166, 166, 0.25)',
                  backdropFilter: 'blur(16px) saturate(1.4)',
                  WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Pretendard Variable',
                    fontSize: '13px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '140%',
                    letterSpacing: '-0.6px',
                    color: 'rgba(112, 60, 161, 0.70)',
                  }}
                >
                  계속 추천
                </span>
              </button>
            )}
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

const Feedback = React.memo(FeedbackComponent);
Feedback.displayName = 'Feedback';

/**
 * 분할된 메시지 세그먼트 컴포넌트
 */
const MessageSegment: React.FC<{
  segment: any;
  onPlayTTS?: (text: string) => void;
  isPlayingTTS: boolean;
  segmentIndex?: number;
}> = ({ segment, onPlayTTS, isPlayingTTS, segmentIndex = 0 }) => {
  const textStyle = {
    color: '#000',
    fontFamily: 'Pretendard Variable',
    fontSize: '16px',
    fontStyle: 'normal' as const,
    fontWeight: 400,
    lineHeight: '140%',
    letterSpacing: '-0.64px',
    wordBreak: 'keep-all' as const,
    overflowWrap: 'break-word' as const,
    width: '86%',
    marginLeft: 'auto',
    marginRight: 'auto',
  };

  // 첫 번째 말풍선 스타일
  const firstBubbleStyle = {
    color: '#000',
    textAlign: 'center' as const,
    fontFamily: 'Pretendard Variable',
    fontSize: '18px',
    fontStyle: 'normal' as const,
    fontWeight: 600,
    lineHeight: '130%',
    letterSpacing: '-0.72px',
    wordBreak: 'break-word' as const,
    overflowWrap: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const,
    maxWidth: '100%',
    width: '100%',
  };

  const isFirst = segmentIndex === 0;

  const segmentText: string = segment?.text ?? '';
  const { highlightedText: firstHighlightedText, remainderText: firstSegmentRemainder } = isFirst
    ? getHighlightedTextParts(segmentText)
    : { highlightedText: '', remainderText: segmentText };

  const firstSentence = isFirst ? firstHighlightedText : '';
  const restOfText = isFirst ? firstSegmentRemainder : segmentText;

  // 각 세그먼트마다 이전 세그먼트 애니메이션이 완료될 때까지 delay 추가
  const calculateDelay = (index: number, text: string) => {
    if (index === 0) {
      // 첫 번째 세그먼트: TTS 요청 및 재생 시작 시간을 기다림 (약 500ms)
      return 500;
    }
    // 이전 세그먼트들이 모두 나타나는 시간 계산
    const wordsPerBubble = 10; // 평균 단어 수
    const timePerBubble = 1.2 + (wordsPerBubble * 0.05) + 0.2; // duration + stagger + 여유
    return index * timePerBubble * 1000; // ms로 변환
  };

  const segmentDelay = calculateDelay(segmentIndex, segment.text);

  // Typewriter 속도 계산 (평균적으로 1글자당 50ms)
  const typewriterSpeed = 50;

  return (
    <div className={isFirst ? "flex justify-center" : "flex justify-start"}>
      <div className={isFirst ? "w-full" : "w-full"}>
        {isFirst ? (
          <>
            <div className="whitespace-pre-wrap flex justify-center" style={{ ...firstBubbleStyle, marginBottom: '0.7rem' }}>
              <Typewriter
                text={firstSentence}
                speed={typewriterSpeed}
                delay={segmentDelay}
              />
            </div>
            {restOfText && (
              <div className="whitespace-pre-wrap" style={textStyle}>
                <Typewriter
                  text={restOfText}
                  speed={typewriterSpeed}
                delay={segmentDelay + (firstSentence.length * typewriterSpeed)}
                />
              </div>
            )}
          </>
        ) : (
          <div className="whitespace-pre-wrap break-words" style={textStyle}>
            <Typewriter
              text={segment.text}
              speed={typewriterSpeed}
              delay={segmentDelay}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 분할된 메시지 컴포넌트 - 전체 텍스트를 한 번에 Typewriter로 처리
 */
const SegmentedMessageComponent: React.FC<{
  message: any;
  onPlayTTS?: (text: string) => void;
  isPlayingTTS: boolean;
  typewriterVariant: TypewriterVariant;
  glassStyleVariant?: GlassStyleVariant;
  isFirstAnswer?: boolean;
  onFeedback?: (feedback: 'negative' | 'positive') => void;
  onContinueRecommendation?: () => void;
}> = ({ message, onPlayTTS: _onPlayTTS, isPlayingTTS: _isPlayingTTS, typewriterVariant, glassStyleVariant = 'v2', isFirstAnswer = false, onFeedback, onContinueRecommendation }) => {
  const [showHighlight, setShowHighlight] = useState(false);
  const [isSiteVisible, setIsSiteVisible] = useState(false);

  const segments = message.segments ?? [];

  const { firstSegmentHighlight, displayText } = useMemo(() => {
    const firstSegmentText = segments[0]?.text || message.content || '';
    const { highlightedText, remainderText } = getHighlightedTextParts(firstSegmentText);
    const remainingText = segments.slice(1).map((seg: any) => seg.text).join('\n\n');
    const fullText =
      highlightedText +
      (remainderText ? `\n\n${remainderText}` : '') +
      (remainingText ? `\n\n${remainingText}` : '');
    
    // 전체 텍스트 사용 (5번째 답변에 질문이 포함될 수 있으므로)
    const displayText = fullText.trim();

    return {
      firstSegmentHighlight: highlightedText,
      displayText: displayText || '',
    };
  }, [segments, message.content]);

  const { imageUrl, shouldShowImage } = useMemo(() => {
    const url = typeof message.thumbnailUrl === 'string' ? message.thumbnailUrl.trim() : '';
    const hasThumbnail = url.length > 0;
    const hasCategory = message.questionCategory !== null && message.questionCategory !== undefined;
    
    // thumbnailUrl이 있으면 우선 사용, 없으면 카테고리 이미지 사용
    const categoryImageUrl = getCategoryImage(message.questionCategory);
    const finalImageUrl = hasThumbnail ? url : (categoryImageUrl || '');
    
    const result = { 
      imageUrl: finalImageUrl, 
      shouldShowImage: hasThumbnail || hasCategory 
    };
    console.log('[ChatBubble] 이미지 표시 조건:', {
      hasThumbnail,
      hasCategory,
      questionCategory: message.questionCategory,
      categoryImageUrl,
      finalImageUrl: result.imageUrl,
      shouldShowImage: result.shouldShowImage
    });
    return result;
  }, [message.thumbnailUrl, message.questionCategory]);

  const { siteUrl, shouldShowSite } = useMemo(() => {
    const url = typeof message.siteUrl === 'string' ? message.siteUrl.trim() : '';
    return { siteUrl: url, shouldShowSite: url.length > 0 };
  }, [message.siteUrl]);

  const linkText = useMemo(() => {
    return typeof message.linkText === 'string' ? message.linkText.trim() : undefined;
  }, [message.linkText]);

  useEffect(() => {
    setIsSiteVisible(false);
  }, [message]);

  useEffect(() => {
    setShowHighlight(true);
    const timer = setTimeout(() => setShowHighlight(false), 2000);
    return () => clearTimeout(timer);
  }, [segments]);

  const typewriterProps = useMemo(() => {
    const baseProps: Record<string, any> = {
      text: displayText,
      speed: 50,
      delay: 500,
      speedVariation: 0.3,
      minSpeed: 20,
      maxSpeed: 100,
    };

    if (typewriterVariant === 'v2') {
      baseProps.characterChangeInterval = 200;
    }

    return baseProps;
  }, [displayText, typewriterVariant]);

  const renderTypewriter = useCallback(
    (displayedText: string, isComplete: boolean, currentCursorChar?: string, dotColor?: { r: number; g: number; b: number }) => {
      const cursorChar = currentCursorChar ?? '●';
      const targetHighlightLength = Math.min(firstSegmentHighlight.length, displayText.length);
      let displayedHighlight = displayedText.substring(0, targetHighlightLength);
      const displayedRest = displayedText.substring(targetHighlightLength);
      const cleanedRest = removeDotOnlyLines(trimLeadingWhitespace(displayedRest));
      const showCursor = !isComplete;
      const firstDotSize = computeDotSize(assistantHeadlineTextStyle.fontSize);
      const textDotSize = computeDotSize(assistantPrimaryTextStyle.fontSize);
      // 카테고리가 있으면 항상 표시, 없으면 타입라이터 애니메이션 완료 후 표시
      const hasCategory = message.questionCategory !== null && message.questionCategory !== undefined;
      const imageShouldRender = shouldShowImage && (
        hasCategory || (displayedHighlight && displayedHighlight.length === targetHighlightLength)
      );

      // 헤드라인 텍스트에 15글자 미만 줄 방지 로직 적용 (키워드는 한 줄에 유지)
      if (displayedHighlight) {
        displayedHighlight = adjustHeadlineLineBreaks(displayedHighlight, 15);
      }

      // Get dot color - use provided dotColor for v1, otherwise default to black
      const dotColorString = typewriterVariant === 'v1' && dotColor
        ? `rgb(${dotColor.r}, ${dotColor.g}, ${dotColor.b})`
        : '#000';

      return (
        <div>
          {displayedHighlight && (
            <div className="flex justify-center" style={{ width: '100%', marginBottom: '0.7rem' }}>
              <div className="whitespace-pre-wrap flex justify-center" style={{ ...assistantHeadlineTextStyleV2, width: '100%' }}>
                <QuotedTextRenderer text={displayedHighlight} enableKeywordLineBreak />
                {showCursor && displayedRest.length === 0 && (
                  <span
                    className="inline-block"
                    style={{
                      fontSize: firstDotSize,
                      lineHeight: 1,
                      verticalAlign: 'middle',
                      marginLeft: '2px',
                      color: dotColorString,
                      transition: typewriterVariant === 'v1' ? 'color 0.2s ease' : 'none',
                    }}
                  >
                    {cursorChar}
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {shouldShowImage && (
              <div 
                className="flex justify-center" 
                style={{ 
                  width: '100%', 
                  maxWidth: '100%',
                  marginTop: '14px',
                  marginBottom: '0',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    minHeight: 'min(70vh, 500px)', // iPhone 최적화: 60vh -> 70vh, 400px -> 500px
                    maxHeight: '80vh', // iPhone 최적화: 70vh -> 80vh
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#f3f4f6',
                    // 카테고리가 있으면 바로 표시, 없으면 애니메이션 적용
                    transform: imageShouldRender ? 'scaleY(1)' : 'scaleY(0)',
                    transformOrigin: 'top',
                    opacity: imageShouldRender ? 1 : 0,
                    transition: hasCategory ? 'none' : 'transform 0.6s ease-in-out, opacity 0.6s ease-in-out',
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="이벤트 썸네일"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    // 카테고리별 더미 이미지 (정보 요구 질문에 대한 답변 Container용)
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        minHeight: 'min(70vh, 500px)', // iPhone 최적화: 60vh -> 70vh, 400px -> 500px
                        maxHeight: '80vh', // iPhone 최적화: 70vh -> 80vh
                        background: 'linear-gradient(135deg, #e0e7ff 0%, #f3f4f6 50%, #e0e7ff 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        padding: '24px',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* 배경 패턴 */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          opacity: 0.1,
                          backgroundImage: 'radial-gradient(circle at 2px 2px, #6366f1 1px, transparent 0)',
                          backgroundSize: '24px 24px',
                        }}
                      />
                      {/* 카테고리 아이콘 영역 */}
                      <div
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px',
                          color: '#ffffff',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        📍
                      </div>
                      {/* 카테고리 텍스트 */}
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          color: '#4b5563',
                          fontFamily: 'Pretendard Variable',
                          textAlign: 'center',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        {message.questionCategory ? (
                          <>
                            <div style={{ marginBottom: '4px' }}>카테고리</div>
                            <div style={{ color: '#6366f1', fontSize: '20px' }}>{message.questionCategory}</div>
                          </>
                        ) : (
                          <div>이미지 준비 중</div>
                        )}
                      </div>
                    </div>
                  )}
                  {shouldShowSite && imageUrl && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        opacity: isSiteVisible ? 1 : 0,
                        transform: isSiteVisible ? 'translateY(0)' : 'translateY(12px)',
                        transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                        pointerEvents: isSiteVisible ? 'auto' : 'none',
                        zIndex: 10,
                      }}
                    >
                      <SiteLink url={siteUrl} linkText={linkText} />
                    </div>
                  )}
                </div>
              </div>
            )}
            {cleanedRest && (
              <div className="whitespace-pre-wrap" style={assistantPrimaryTextStyle}>
                <QuotedTextRenderer text={cleanedRest} />
                {showCursor && (
                  <span
                    className="inline-block"
                    style={{
                      fontSize: textDotSize,
                      lineHeight: 1,
                      verticalAlign: 'middle',
                      marginLeft: '2px',
                      color: dotColorString,
                      transition: typewriterVariant === 'v1' ? 'color 0.2s ease' : 'none',
                    }}
                  >
                    {cursorChar}
                  </span>
                )}
              </div>
            )}
            {!displayedHighlight && !cleanedRest && showCursor && (
              <span
                className="inline-block"
                style={{
                  fontSize: textDotSize,
                  lineHeight: 1,
                  verticalAlign: 'middle',
                  marginLeft: '2px',
                  color: dotColorString,
                  transition: typewriterVariant === 'v1' ? 'color 0.2s ease' : 'none',
                }}
              >
                {cursorChar}
              </span>
            )}
          </div>
        </div>
      );
    },
    [displayText, firstSegmentHighlight, imageUrl, shouldShowImage, typewriterVariant, siteUrl, shouldShowSite, isSiteVisible, linkText, message.questionCategory]
  );

  const TypewriterComponent = typewriterComponents[typewriterVariant];

  return (
    <div className="flex justify-center mb-0">
      <div className="assistant-glass-wrapper" style={assistantGlassWrapperStyle}>
          <div className="assistant-glass-content" style={getAssistantGlassContentStyle(glassStyleVariant)}>
          {showHighlight && <div className="assistant-glass-highlight" />}
          {glassStyleVariant === 'v1' && <div className="assistant-glass-bottom-gradient" />}
          <div className="assistant-glass-body">
            {typewriterVariant === 'v1' ? (
              <>
                <div>
                  {(() => {
                    const restText = removeDotOnlyLines(trimLeadingWhitespace(displayText.substring(firstSegmentHighlight.length)));
                    
                    // 헤드라인 텍스트의 단어 수 계산 (delay 계산용)
                    const headlineWords = firstSegmentHighlight ? firstSegmentHighlight.trim().split(/\s+/).filter(w => w.length > 0) : [];
                    const headlineDelay = 0.5; // 초
                    const headlineDuration = 1.2; // 초
                    const staggerTime = 0.05; // 초
                    // 헤드라인 애니메이션이 완료되는 시간 = delay + (단어 수 * stagger) + duration
                    const headlineCompleteTime = headlineDelay + (headlineWords.length * staggerTime) + headlineDuration;
                    
                    return (
                      <>
                        {firstSegmentHighlight && (
                          <div className="flex justify-center" style={{ width: '100%', marginBottom: '0.7rem' }}>
                            <div className="whitespace-pre-wrap flex justify-center" style={{ ...assistantHeadlineTextStyleV2, width: '100%' }}>
                              <SplitText text={firstSegmentHighlight} delay={headlineDelay} duration={headlineDuration} stagger={staggerTime} animation="fadeIn" />
                            </div>
                          </div>
                        )}
                        {restText && (
                          <div className="whitespace-pre-wrap" style={assistantPrimaryTextStyle}>
                            <SplitText text={restText} delay={firstSegmentHighlight ? headlineCompleteTime : 0.5} duration={1.2} stagger={0.05} animation="fadeIn" />
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div className="flex flex-col gap-2">
                    {shouldShowImage && (
                      <div 
                        className="flex justify-center" 
                        style={{ 
                          width: '100%', 
                          maxWidth: '100%',
                          marginTop: '14px',
                          marginBottom: '0',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            aspectRatio: '1 / 1',
                            borderRadius: '24px',
                            overflow: 'hidden',
                            position: 'relative',
                            background: '#f3f4f6',
                          }}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt="이벤트 썸네일"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            // 카테고리별 더미 이미지 (siteUrl 없음)
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                background: '#f3f4f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#9ca3af',
                                fontSize: '14px',
                                fontFamily: 'Pretendard Variable',
                              }}
                            >
                              {message.questionCategory || '이미지'}
                            </div>
                          )}
                          {shouldShowSite && imageUrl && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                opacity: 1,
                                pointerEvents: 'auto',
                                zIndex: 10,
                              }}
                            >
                              <SiteLink url={siteUrl} linkText={linkText} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 첫 번째 답변에만 피드백 UI 표시 */}
                {isFirstAnswer && (
                  <Feedback 
                    onFeedback={(feedback) => {
                      console.log('Feedback received:', feedback);
                      // TODO: 피드백 처리 로직 추가
                    }}
                    isVisible={true}
                    onContinueRecommendation={onContinueRecommendation}
                  />
                )}

                {message.tokens && <TokenInfo tokens={message.tokens} />}
                {message.hits && message.hits.length > 0 && <HitInfo hits={message.hits} />}
              </>
            ) : (
              <>
                <TypewriterComponent
                  {...typewriterProps}
                  onComplete={() => {
                    if (shouldShowSite) {
                      setIsSiteVisible(true);
                    }
                  }}
                  render={renderTypewriter}
                />

                {/* 첫 번째 답변에만 피드백 UI 표시 */}
                {isFirstAnswer && (
                  <Feedback 
                    onFeedback={(feedback) => {
                      if (onFeedback) {
                        onFeedback(feedback);
                      }
                    }}
                    isVisible={shouldShowSite && isSiteVisible}
                    onContinueRecommendation={onContinueRecommendation}
                  />
                )}

                {message.tokens && <TokenInfo tokens={message.tokens} />}
                {message.hits && message.hits.length > 0 && <HitInfo hits={message.hits} />}
              </>
            )}
          </div>
        </div>
      </div>
      <AssistantGlassStyles />
    </div>
  );
};

const SegmentedMessage = React.memo(SegmentedMessageComponent);
SegmentedMessage.displayName = 'SegmentedMessage';

/**
 * 텍스트를 줄 단위로 분할하는 컴포넌트 (Line by Line Split)
 */
const SplitLines: React.FC<{
  text: string;
  delay?: number;
  duration?: number;
  stagger?: number;
  animation?: 'fadeIn' | 'slideUp';
}> = ({ text, delay = 0, duration = 0.8, stagger = 0.1, animation = 'fadeIn' }) => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  return (
    <>
      {lines.map((line, index) => (
        <div key={index} style={{ marginBottom: index < lines.length - 1 ? '0.5em' : 0 }}>
          <SplitWords
            text={line}
            delay={delay + (index * stagger * 1000)}
            duration={duration}
            stagger={0.05}
            animation={animation}
          />
        </div>
      ))}
    </>
  );
};

/**
 * 텍스트 줄 수 계산 (줄바꿈 기준)
 */
const getLineCount = (text: string): number => {
  if (!text) return 0;
  // 줄바꿈으로 나누고, 빈 줄 제외
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  return lines.length;
};

/**
 * 단일 메시지 컴포넌트
 */
const SingleMessageComponent: React.FC<{
  message: any;
  isThinking: boolean;
  onPlayTTS?: (text: string) => void;
  isPlayingTTS: boolean;
  isGlobalLoading?: boolean;
  typewriterVariant: TypewriterVariant;
  glassStyleVariant?: GlassStyleVariant;
  isRecording?: boolean;
  thinkingText?: string; // 커스텀 thinking 텍스트
  isFirstAnswer?: boolean;
  onFeedback?: (feedback: 'negative' | 'positive') => void;
  onContinueRecommendation?: () => void;
}> = ({
  message,
  isThinking,
  onPlayTTS: _onPlayTTS,
  isPlayingTTS: _isPlayingTTS,
  isGlobalLoading: _isGlobalLoading = false,
  thinkingText,
  typewriterVariant,
  glassStyleVariant = 'v2',
  isRecording = false,
  isFirstAnswer = false,
  onFeedback,
  onContinueRecommendation,
}) => {
  const [showHighlight, setShowHighlight] = useState(false);
  const [isSiteVisible, setIsSiteVisible] = useState(false);
  const [loadingWidth, setLoadingWidth] = useState<string>('120px');

  const { assistantText, assistantHighlight } = useMemo(() => {
    if (message.role !== 'assistant') {
      const content = message.content || '';
      return {
        assistantText: content || '',
        assistantHighlight: '',
      };
    }

    // 전체 텍스트 사용 (5번째 답변에 질문이 포함될 수 있으므로)
    const fullText = message.content || '';
    
    // 전체 텍스트 사용
    const displayText = fullText.trim();

    // 응답이 비어있거나 너무 짧을 때 기본 메시지 제공
    const finalText = !displayText || displayText.length < 5
      ? '안녕하세요! 코엑스에서 무엇을 도와드릴까요?'
      : displayText;

    const highlight = getHighlightedTextParts(finalText).highlightedText;
    return {
      assistantText: finalText,
      assistantHighlight: highlight,
    };
  }, [message.content, message.role]);

  const { imageUrl, shouldShowImage } = useMemo(() => {
    const url = typeof message.thumbnailUrl === 'string' ? message.thumbnailUrl.trim() : '';
    const hasThumbnail = url.length > 0;
    const hasCategory = message.questionCategory !== null && message.questionCategory !== undefined;
    
    // thumbnailUrl이 있으면 우선 사용, 없으면 카테고리 이미지 사용
    const categoryImageUrl = getCategoryImage(message.questionCategory);
    const finalImageUrl = hasThumbnail ? url : (categoryImageUrl || '');
    
    const result = { 
      imageUrl: finalImageUrl, 
      shouldShowImage: hasThumbnail || hasCategory 
    };
    console.log('[ChatBubble] 이미지 표시 조건:', {
      hasThumbnail,
      hasCategory,
      questionCategory: message.questionCategory,
      categoryImageUrl,
      finalImageUrl: result.imageUrl,
      shouldShowImage: result.shouldShowImage
    });
    return result;
  }, [message.thumbnailUrl, message.questionCategory]);

  const { siteUrl, shouldShowSite } = useMemo(() => {
    const url = typeof message.siteUrl === 'string' ? message.siteUrl.trim() : '';
    return { siteUrl: url, shouldShowSite: url.length > 0 };
  }, [message.siteUrl]);

  const linkText = useMemo(() => {
    return typeof message.linkText === 'string' ? message.linkText.trim() : undefined;
  }, [message.linkText]);

  useEffect(() => {
    if (message.role === 'assistant' && !isThinking && message.content) {
      setShowHighlight(true);
      const timer = setTimeout(() => setShowHighlight(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [message.role, isThinking, message.content]);

  useEffect(() => {
    setIsSiteVisible(false);
  }, [message, isThinking]);

  // 로딩 div width 확장 애니메이션
  // '생각 중이에요' 상태에서는 텍스트를 감쌀 수 있도록 auto width, AI 답변의 첫 글자가 보여질 때 확장
  useEffect(() => {
    if (isThinking) {
      // '생각 중이에요' 상태에서는 텍스트를 감쌀 수 있도록 auto width
      setLoadingWidth('auto');
    } else if (message.content && message.content.length > 0) {
      // isThinking이 false가 되고 content가 있는 순간 = AI 답변의 첫 글자가 보여지는 순간
      // 이때 width 확장 애니메이션 실행
      setLoadingWidth('min(360px, 92vw)');
    } else {
      // content가 없는 경우 기본 크기
      setLoadingWidth('min(360px, 92vw)');
    }
  }, [isThinking, message.content]);

  const typewriterProps = useMemo(() => {
    const baseProps: Record<string, any> = {
      text: assistantText,
      speed: 50,
      delay: 500,
      speedVariation: 0.3,
      minSpeed: 20,
      maxSpeed: 100,
    };

    if (typewriterVariant === 'v2') {
      baseProps.characterChangeInterval = 200;
    }

    return baseProps;
  }, [assistantText, typewriterVariant]);

  const renderTypewriter = useCallback(
    (displayedText: string, isComplete: boolean, currentCursorChar?: string, dotColor?: { r: number; g: number; b: number }) => {
      const cursorChar = currentCursorChar ?? '●';
      const targetHighlightLength = Math.min(assistantHighlight.length, assistantText.length);
      let displayedHighlight = displayedText.substring(0, targetHighlightLength);
      const displayedRest = displayedText.substring(targetHighlightLength);
      const cleanedRest = removeDotOnlyLines(trimLeadingWhitespace(displayedRest));
      const showCursor = !isComplete;
      const firstDotSize = computeDotSize(assistantHeadlineTextStyle.fontSize);
      const textDotSize = computeDotSize(assistantPrimaryTextStyle.fontSize);
      // 카테고리가 있으면 항상 표시, 없으면 타입라이터 애니메이션 완료 후 표시
      const hasCategory = message.questionCategory !== null && message.questionCategory !== undefined;
      const imageShouldRender = shouldShowImage && (
        hasCategory || (displayedHighlight && displayedHighlight.length === targetHighlightLength)
      );

      // 헤드라인 텍스트에 15글자 미만 줄 방지 로직 적용 (키워드는 한 줄에 유지)
      if (displayedHighlight) {
        displayedHighlight = adjustHeadlineLineBreaks(displayedHighlight, 15);
      }

      // Get dot color - use provided dotColor for v1, otherwise default to black
      const dotColorString = typewriterVariant === 'v1' && dotColor
        ? `rgb(${dotColor.r}, ${dotColor.g}, ${dotColor.b})`
        : '#000';

      return (
        <div>
          {displayedHighlight && (
            <div className="flex justify-center" style={{ width: '100%', marginBottom: '0.7rem' }}>
              <div className="whitespace-pre-wrap flex justify-center" style={{ ...assistantHeadlineTextStyleV2, width: '100%' }}>
                <QuotedTextRenderer text={displayedHighlight} enableKeywordLineBreak />
                {showCursor && displayedRest.length === 0 && (
                  <span
                    className="inline-block"
                    style={{
                      fontSize: firstDotSize,
                      lineHeight: 1,
                      verticalAlign: 'middle',
                      marginLeft: '2px',
                      color: dotColorString,
                      transition: typewriterVariant === 'v1' ? 'color 0.2s ease' : 'none',
                    }}
                  >
                    {cursorChar}
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {shouldShowImage && (
              <div 
                className="flex justify-center" 
                style={{ 
                  width: '100%', 
                  maxWidth: '100%',
                  marginTop: '14px',
                  marginBottom: '0',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    minHeight: 'min(70vh, 500px)', // iPhone 최적화: 60vh -> 70vh, 400px -> 500px
                    maxHeight: '80vh', // iPhone 최적화: 70vh -> 80vh
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#f3f4f6',
                    // 카테고리가 있으면 바로 표시, 없으면 애니메이션 적용
                    transform: imageShouldRender ? 'scaleY(1)' : 'scaleY(0)',
                    transformOrigin: 'top',
                    opacity: imageShouldRender ? 1 : 0,
                    transition: hasCategory ? 'none' : 'transform 0.6s ease-in-out',
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="이벤트 썸네일"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    // 카테고리별 더미 이미지 (정보 요구 질문에 대한 답변 Container용)
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        minHeight: 'min(70vh, 500px)', // iPhone 최적화: 60vh -> 70vh, 400px -> 500px
                        maxHeight: '80vh', // iPhone 최적화: 70vh -> 80vh
                        background: 'linear-gradient(135deg, #e0e7ff 0%, #f3f4f6 50%, #e0e7ff 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        padding: '24px',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* 배경 패턴 */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          opacity: 0.1,
                          backgroundImage: 'radial-gradient(circle at 2px 2px, #6366f1 1px, transparent 0)',
                          backgroundSize: '24px 24px',
                        }}
                      />
                      {/* 카테고리 아이콘 영역 */}
                      <div
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px',
                          color: '#ffffff',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        📍
                      </div>
                      {/* 카테고리 텍스트 */}
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          color: '#4b5563',
                          fontFamily: 'Pretendard Variable',
                          textAlign: 'center',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        {message.questionCategory ? (
                          <>
                            <div style={{ marginBottom: '4px' }}>카테고리</div>
                            <div style={{ color: '#6366f1', fontSize: '20px' }}>{message.questionCategory}</div>
                          </>
                        ) : (
                          <div>이미지 준비 중</div>
                        )}
                      </div>
                    </div>
                  )}
                  {shouldShowSite && imageUrl && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        opacity: isSiteVisible ? 1 : 0,
                        transform: isSiteVisible ? 'translateY(0)' : 'translateY(12px)',
                        transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                        pointerEvents: isSiteVisible ? 'auto' : 'none',
                        zIndex: 10,
                      }}
                    >
                      <SiteLink url={siteUrl} linkText={linkText} />
                    </div>
                  )}
                </div>
              </div>
            )}
            {cleanedRest && (
              <div className="whitespace-pre-wrap" style={assistantPrimaryTextStyle}>
                <QuotedTextRenderer text={cleanedRest} />
                {showCursor && (
                  <span
                    className="inline-block"
                    style={{
                      fontSize: textDotSize,
                      lineHeight: 1,
                      verticalAlign: 'middle',
                      marginLeft: '2px',
                      color: dotColorString,
                      transition: typewriterVariant === 'v1' ? 'color 0.2s ease' : 'none',
                    }}
                  >
                    {cursorChar}
                  </span>
                )}
              </div>
            )}
            {!displayedHighlight && !cleanedRest && showCursor && (
              <span
                className="inline-block"
                style={{
                  fontSize: textDotSize,
                  lineHeight: 1,
                  verticalAlign: 'middle',
                  marginLeft: '2px',
                  color: dotColorString,
                  transition: typewriterVariant === 'v1' ? 'color 0.2s ease' : 'none',
                }}
              >
                {cursorChar}
              </span>
            )}
          </div>
        </div>
      );
    },
    [assistantHighlight, assistantText, imageUrl, shouldShowImage, typewriterVariant, siteUrl, shouldShowSite, isSiteVisible, linkText, message.questionCategory]
  );

  const TypewriterComponent = typewriterComponents[typewriterVariant];

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-center'} ${isRecording ? 'mb-6' : 'mb-4'}`}>
      {message.role === 'assistant' ? (
        <>
          <div 
            className="assistant-glass-wrapper" 
            style={{
              ...assistantGlassWrapperStyle,
              ...((isThinking || isRecording) ? {
                width: 'auto',
                minWidth: '120px',
                marginTop: '0', // marginTop 제거 (상위 컨테이너에서 위치 조정)
                // auto width에서는 transition 제거 (텍스트를 감쌀 수 있도록)
              } : (!isThinking && message.content && message.content.length > 0 ? {
                width: loadingWidth,
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              } : {})),
            }}
          >
          {(isThinking || isRecording) ? (
            <span
              className={`text-center font-semibold font-['Pretendard_Variable'] ${isThinking && !isRecording ? '' : 'text-cyan-800'}`}
              style={{
                fontFamily: 'Pretendard Variable',
                fontSize: '18px',
                fontWeight: 600,
                lineHeight: '130%',
                whiteSpace: 'normal',
                textAlign: 'center',
                display: 'block',
                width: '100%',
                wordBreak: 'keep-all',
                overflowWrap: 'break-word',
                maxHeight: 'calc(1.3em * 2)', // 최대 2줄 (lineHeight 130%)
                overflow: 'hidden',
              }}
            >
              {(() => {
                const text = isRecording ? '이솔이 듣고 있어요' : (thinkingText || '생각 중이에요');
                
                if (isRecording || !isThinking) {
                  // 녹음 중이거나 thinking이 아닐 때는 기존 로직 유지
                  if (text.length <= 10) {
                    return text;
                  }
                  
                  // 10자 초과 시 단어 기준으로 줄바꿈 (최대 2줄)
                  const words = text.split(/\s+/).filter(w => w.length > 0);
                  if (words.length === 0) return text;
                  
                  // 단어가 1개면 그대로 반환
                  if (words.length === 1) return text;
                  
                  // 단어를 적절히 2줄로 나누기 (절반 지점 기준)
                  const midPoint = Math.ceil(words.length / 2);
                  const line1 = words.slice(0, midPoint).join(' ');
                  const line2 = words.slice(midPoint).join(' ');
                  
                  // 최대 2줄까지만 표시
                  return `${line1}\n${line2}`;
                }
                
                // thinking일 때: 각 줄마다 순차적으로 그라디언트 애니메이션 적용
                let lines: string[];
                if (text.length <= 10) {
                  lines = [text];
                } else {
                  // 10자 초과 시 단어 기준으로 줄바꿈 (최대 2줄)
                  const words = text.split(/\s+/).filter(w => w.length > 0);
                  if (words.length === 0) {
                    lines = [text];
                  } else if (words.length === 1) {
                    lines = [text];
                  } else {
                    // 단어를 적절히 2줄로 나누기 (절반 지점 기준)
                    const midPoint = Math.ceil(words.length / 2);
                    const line1 = words.slice(0, midPoint).join(' ');
                    const line2 = words.slice(midPoint).join(' ');
                    lines = [line1, line2];
                  }
                }
                
                // 각 줄을 별도의 span으로 렌더링하고 순차적으로 애니메이션 delay 적용
                return lines.map((line, index) => (
                  <span
                    key={index}
                    className="thinking-gradient-animation-line"
                    style={{
                      display: 'block',
                      animationDelay: `${index * 0.8}s`, // 각 줄마다 0.8초씩 지연
                    }}
                  >
                    {line}
                  </span>
                ));
              })()}
            </span>
          ) : (
            <>
          <AnimatedOutlineStroke borderRadius={getAssistantGlassContentStyle(glassStyleVariant).borderRadius as string}>
          <div 
            className={`assistant-glass-content ${isThinking ? 'animate-radial-gradient' : ''}`}
            style={{
              ...getAssistantGlassContentStyle(glassStyleVariant),
              ...(isThinking ? {
                padding: '7px 16px',
                transition: 'padding 0.5s ease-in-out, background 0.5s ease-in-out',
              } : {}),
            }}
          >
          {showHighlight && !isThinking && <div className="assistant-glass-highlight" />}
          {glassStyleVariant === 'v1' && !isThinking && <div className="assistant-glass-bottom-gradient" />}
          <div className="assistant-glass-body">
                {typewriterVariant === 'v1' ? (
                  <>
                    <div>
                      {(() => {
                        const restText = removeDotOnlyLines(trimLeadingWhitespace(assistantText.substring(assistantHighlight.length)));
                        
                        // 헤드라인 텍스트의 단어 수 계산 (delay 계산용)
                        const headlineWords = assistantHighlight ? assistantHighlight.trim().split(/\s+/).filter(w => w.length > 0) : [];
                        const headlineDelay = 0.5; // 초
                        const headlineDuration = 1.2; // 초
                        const staggerTime = 0.05; // 초
                        // 헤드라인 애니메이션이 완료되는 시간 = delay + (단어 수 * stagger) + duration
                        const headlineCompleteTime = headlineDelay + (headlineWords.length * staggerTime) + headlineDuration;
                        
                        return (
                          <>
                            {assistantHighlight && (
                              <div className="flex justify-center" style={{ width: '100%', marginBottom: '0.7rem' }}>
                                <div className="whitespace-pre-wrap flex justify-center" style={{ ...assistantHeadlineTextStyleV2, width: '100%' }}>
                                  <SplitText text={assistantHighlight} delay={headlineDelay} duration={headlineDuration} stagger={staggerTime} animation="fadeIn" />
                                </div>
                              </div>
                            )}
                            {restText && (
                              <div className="whitespace-pre-wrap" style={assistantPrimaryTextStyle}>
                                <SplitText text={restText} delay={assistantHighlight ? headlineCompleteTime : 0.5} duration={1.2} stagger={0.05} animation="fadeIn" />
                              </div>
                            )}
                          </>
                        );
                      })()}
                  <div className="flex flex-col gap-2">
                    {shouldShowImage && (
                      <div 
                        className="flex justify-center" 
                        style={{ 
                          width: '100%', 
                          maxWidth: '100%',
                          marginTop: '14px',
                          marginBottom: '0',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            aspectRatio: '1 / 1',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            position: 'relative',
                            background: '#f3f4f6',
                          }}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt="이벤트 썸네일"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            // 카테고리별 더미 이미지 (siteUrl 없음)
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                background: '#f3f4f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#9ca3af',
                                fontSize: '14px',
                                fontFamily: 'Pretendard Variable',
                              }}
                            >
                              {message.questionCategory || '이미지'}
                            </div>
                          )}
                          {shouldShowSite && imageUrl && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                opacity: 1,
                                pointerEvents: 'auto',
                                zIndex: 10,
                              }}
                            >
                              <SiteLink url={siteUrl} linkText={linkText} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                      </div>
                    </div>

                    {/* 첫 번째 답변에만 피드백 UI 표시 */}
                    {isFirstAnswer && (
                      <Feedback 
                        onFeedback={(feedback) => {
                          console.log('Feedback received:', feedback);
                          // TODO: 피드백 처리 로직 추가
                        }}
                        isVisible={true}
                        onContinueRecommendation={onContinueRecommendation}
                      />
                    )}

                    {message.tokens && <TokenInfo tokens={message.tokens} />}
                    {message.hits && message.hits.length > 0 && <HitInfo hits={message.hits} />}
                  </>
                ) : (
                  <>
                    <TypewriterComponent
                      {...typewriterProps}
                      onComplete={() => {
                        if (shouldShowSite) {
                          setIsSiteVisible(true);
                        }
                      }}
                      render={renderTypewriter}
                    />

                    {/* 첫 번째 답변에만 피드백 UI 표시 */}
                    {isFirstAnswer && (
                      <Feedback 
                        onFeedback={(feedback) => {
                          if (onFeedback) {
                            onFeedback(feedback);
                          }
                        }}
                        isVisible={shouldShowSite && isSiteVisible}
                        onContinueRecommendation={onContinueRecommendation}
                      />
                    )}

                    {message.tokens && <TokenInfo tokens={message.tokens} />}
                    {message.hits && message.hits.length > 0 && <HitInfo hits={message.hits} />}
                  </>
                )}
              </div>
            </div>
          </AnimatedOutlineStroke>
          </>
          )}
          </div>
          <AssistantGlassStyles />
        </>
      ) : (
        <div className="max-w-[86%] px-4 py-3" style={{ opacity: 1 }}>
          <div className="whitespace-pre-wrap" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}>
            <div style={assistantPrimaryTextStyle}>
              <SplitText text={message.content} delay={0} duration={0.8} stagger={0.03} animation="fadeIn" />
            </div>
          </div>
          {message.tokens && <TokenInfo tokens={message.tokens} />}
          {message.hits && message.hits.length > 0 && <HitInfo hits={message.hits} />}
        </div>
      )}
    </div>
  );
};

const SingleMessage = React.memo(SingleMessageComponent);
SingleMessage.displayName = 'SingleMessage';

/**
 * 메인 ChatBubble 컴포넌트
 */
export const ChatBubble: React.FC<ChatBubbleProps & { thinkingText?: string }> = ({ 
  message, 
  isThinking = false, 
  onPlayTTS, 
  isPlayingTTS = false,
  isGlobalLoading = false,
  typewriterVariant = 'v1',
  glassStyleVariant = 'v2',
  isRecording = false,
  thinkingText,
  isFirstAnswer = false,
  onFeedback,
  onContinueRecommendation
}) => {
  // AI 메시지이고 segments가 있으면 분할된 말풍선들을 렌더링
  if (message.role === 'assistant' && message.segments && message.segments.length > 1) {
    return (
      <SegmentedMessage
        message={message}
        onPlayTTS={onPlayTTS}
        isPlayingTTS={isPlayingTTS}
        typewriterVariant={typewriterVariant}
        glassStyleVariant={glassStyleVariant}
        isFirstAnswer={isFirstAnswer}
        onFeedback={onFeedback}
        onContinueRecommendation={onContinueRecommendation}
      />
    );
  }

  // 기존 단일 말풍선 렌더링 (사용자 메시지 또는 분할되지 않은 AI 메시지)
  return (
    <SingleMessage
      message={message}
      isThinking={isThinking}
      onPlayTTS={onPlayTTS}
      isPlayingTTS={isPlayingTTS}
      isGlobalLoading={isGlobalLoading}
      typewriterVariant={typewriterVariant}
      glassStyleVariant={glassStyleVariant}
      isRecording={isRecording}
      thinkingText={thinkingText}
      isFirstAnswer={isFirstAnswer}
      onFeedback={onFeedback}
      onContinueRecommendation={onContinueRecommendation}
    />
  );
};
