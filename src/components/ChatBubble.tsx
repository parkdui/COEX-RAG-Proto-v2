/**
 * ChatBubble 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { ChatBubbleProps } from '@/types';
import { getSegmentStyleClass, getSegmentIcon } from '@/lib/textSplitter';
import { SplitWords, TypingEffect, SplitText, Typewriter, ChatTypewriterV1, ChatTypewriterV2, ChatTypewriterV3 } from '@/components/ui';

type TypewriterVariant = 'v1' | 'v2' | 'v3';

const typewriterComponents: Record<TypewriterVariant, React.ComponentType<any>> = {
  v1: ChatTypewriterV1,
  v2: ChatTypewriterV2,
  v3: ChatTypewriterV3,
};

const AssistantGlassStyles = () => (
  <style jsx>{`
    .glass-overlay {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(16px, 6vw, 48px);
      pointer-events: none;
      position: relative;
      z-index: 3;
    }
    .glass-overlay--visible {
      pointer-events: auto;
    }
    .glass-modal {
      width: min(360px, 82vw);
      pointer-events: none;
      display: grid;
      place-items: center;
    }
    .glass-content {
      position: relative;
      display: grid;
      gap: clamp(18px, 3.6vw, 26px);
      padding: clamp(22px, 5.2vw, 30px);
      border-radius: 28px;
      background: linear-gradient(180deg, rgba(255, 161, 235, 0.2) -8.33%, rgba(255, 255, 255, 0.52) 94.9%);
      border: 1px solid rgba(255, 255, 255, 0.75);
      box-shadow:
        0 32px 60px rgba(22, 42, 58, 0.42),
        inset 0 1px 0 rgba(255, 255, 255, 0.88),
        inset 0 -18px 32px rgba(255, 255, 255, 0.22);
      backdrop-filter: blur(48px) saturate(2.5) contrast(1.08);
      -webkit-backdrop-filter: blur(48px) saturate(2.5) contrast(1.08);
      text-align: center;
      color: #0f2420;
      overflow: hidden;
      pointer-events: auto;
    }
    .glass-content::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.45) 55%, rgba(255, 255, 255, 0.12) 100%);
      mix-blend-mode: screen;
      opacity: 0.75;
      pointer-events: none;
    }
    .glass-content::after {
      content: '';
      position: absolute;
      inset: -30%;
      background:
        radial-gradient(circle at 18% 14%, rgba(255, 255, 255, 0.24), transparent 60%),
        radial-gradient(circle at 86% 78%, rgba(118, 212, 255, 0.18), transparent 70%),
        rgba(255, 255, 255, 0.018);
      opacity: 0.32;
      filter: blur(70px) saturate(1.6);
      pointer-events: none;
    }
    .glass-highlight {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 2px;
      background: linear-gradient(45deg, transparent 25%, rgba(255, 255, 255, 0.6) 50%, transparent 75%, transparent 100%);
      background-size: 400% 400%;
      animation: gradient-rotate 2.2s linear;
      pointer-events: none;
      z-index: 1;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      -webkit-mask-composite: xor;
    }
    .glass-body {
      position: relative;
      z-index: 2;
      color: #0f2420;
      text-align: center;
    }
    @keyframes gradient-rotate {
      0% {
        background-position: 0% 50%;
      }
      100% {
        background-position: 200% 50%;
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
    { regex: /\*\*(.*?)\*\*/g, name: 'bold' }
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
  const remainderText = text.slice(highlightEndIndex).trimStart();

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
  return matches.slice(0, -1).join(' ').trim();
};

/**
 * 텍스트를 작은따옴표, 큰따옴표, '**' 파싱 결과로 렌더링하는 컴포넌트
 */
const QuotedTextRenderer: React.FC<{ text: string; enableKeywordLineBreak?: boolean }> = ({ text, enableKeywordLineBreak = false }) => {
  const parts = parseQuotedText(text);

  const renderQuotedSpan = (partText: string, spanKey: React.Key) => (
    <span
      key={spanKey}
      className="px-2 py-1 relative"
      style={{
        fontWeight: 600,
        borderRadius: '25px',
        background: 'linear-gradient(1deg, rgba(255, 255, 255, 0.10) 40.15%, rgba(229, 255, 249, 0.40) 99.12%)',
        whiteSpace: 'nowrap',
        verticalAlign: 'baseline',
        lineHeight: '1.4',
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 0,
        marginRight: '0.3rem',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '25px',
          padding: '1px',
          background: 'linear-gradient(45deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 1) 100%)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <span style={{ position: 'relative', zIndex: 0 }}>
        {partText}
      </span>
    </span>
  );

  const renderSegmentNodes = (segments: Array<{ text: string; isQuoted: boolean }>, keyPrefix: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];

    segments.forEach((segment, index) => {
      const nodeKey = `${keyPrefix}-${index}`;
      if (segment.isQuoted) {
        nodes.push(renderQuotedSpan(segment.text, `${nodeKey}-quoted`));
      } else if (segment.text) {
        const lines = segment.text.split('\n');
        lines.forEach((line, lineIdx) => {
          nodes.push(
            <React.Fragment key={`${nodeKey}-text-${lineIdx}`}>
              {line}
            </React.Fragment>
          );
          if (lineIdx < lines.length - 1) {
            nodes.push(<br key={`${nodeKey}-br-${lineIdx}`} />);
          }
        });
      }
    });

    return nodes;
  };

  if (enableKeywordLineBreak) {
    const KEYWORD_MATCH_REGEX = /''(.*?)''|'([^']+)'|""(.*?)""|\*\*(.*?)\*\*/;
    const keywordMatch = KEYWORD_MATCH_REGEX.exec(text);

    if (!keywordMatch || keywordMatch.index === undefined) {
      return <>{renderSegmentNodes(parts, 'default')}</>;
    }

    const fullMatch = keywordMatch[0];
    const keywordText = keywordMatch[1] ?? keywordMatch[2] ?? keywordMatch[3] ?? keywordMatch[4] ?? '';

    if (!keywordText) {
      return <>{renderSegmentNodes(parts, 'default')}</>;
    }

    const beforeText = text.slice(0, keywordMatch.index);
    const afterText = text.slice(keywordMatch.index + fullMatch.length);

    const beforeSegments = renderSegmentNodes(parseQuotedText(beforeText), 'before');
    const afterSegments = renderSegmentNodes(parseQuotedText(afterText), 'after');
    const hasBeforeContent = beforeText.trim().length > 0;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: hasBeforeContent ? '0.35rem' : 0,
          width: '100%',
        }}
      >
        {hasBeforeContent && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            {beforeSegments}
          </div>
        )}
        <div style={{ width: '100%', textAlign: 'center' }}>
          {renderQuotedSpan(keywordText, 'keyword-main')}
          {afterSegments}
        </div>
      </div>
    );
  }

  return <>{renderSegmentNodes(parts, 'default')}</>;
};

/**
 * TTS 버튼 컴포넌트
 */
const TTSButton: React.FC<{
  text: string;
  onPlayTTS: (text: string) => void;
  isPlayingTTS: boolean;
  title?: string;
}> = ({ text, onPlayTTS, isPlayingTTS, title = '음성으로 듣기' }) => (
  <div className="mt-2 flex items-center gap-2">
    <button
      onClick={() => onPlayTTS(text)}
      disabled={isPlayingTTS}
      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
        isPlayingTTS 
          ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
      title={isPlayingTTS ? '음성 재생 중...' : title}
    >
      {isPlayingTTS ? (
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          재생 중...
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.794L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.794a1 1 0 011.617.794zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
          🔊 듣기
        </span>
      )}
    </button>
  </div>
);

/**
 * 토큰 정보 컴포넌트 (사용하지 않음)
 */
const TokenInfo: React.FC<{ tokens: any }> = ({ tokens }) => null;

/**
 * 히트 정보 컴포넌트 (사용하지 않음)
 */
const HitInfo: React.FC<{ hits: any[] }> = ({ hits }) => null;

const SiteLink: React.FC<{ url: string }> = ({ url }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: 'inline-flex',
      padding: '8px 20px',
      alignItems: 'center',
      gap: '10px',
      borderRadius: '99px',
      background: '#FFF',
      textDecoration: 'none',
    }}
  >
    <span
      style={{
        color: '#000',
        textAlign: 'center',
        fontFamily: 'Pretendard Variable',
        fontSize: '15px',
        fontStyle: 'normal',
        fontWeight: 500,
        lineHeight: '150%',
        letterSpacing: '-0.36px',
      }}
    >
      행사 홈페이지 바로가기
    </span>
    <img
      src="/link-external-01.svg"
      alt=""
      style={{
        width: '22px',
        height: '22px',
      }}
    />
  </a>
);

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
    color: '#4E5363',
    textAlign: 'center' as const,
    textShadow: '0 0 7.9px rgba(0, 0, 0, 0.16)',
    fontFamily: 'Pretendard Variable',
    fontSize: '20px',
    fontStyle: 'normal' as const,
    fontWeight: 600,
    lineHeight: '132%',
    letterSpacing: '-0.88px',
    wordBreak: 'normal' as const,
    overflowWrap: 'break-word' as const,
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
            <div className="whitespace-pre-wrap mb-3 flex justify-center" style={firstBubbleStyle}>
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
const SegmentedMessage: React.FC<{
  message: any;
  onPlayTTS?: (text: string) => void;
  isPlayingTTS: boolean;
  typewriterVariant: TypewriterVariant;
}> = ({ message, onPlayTTS, isPlayingTTS, typewriterVariant }) => {
  const [showHighlight, setShowHighlight] = useState(false);
  const [isSiteVisible, setIsSiteVisible] = useState(false);

  const firstSegmentText = message.segments?.[0]?.text || message.content || '';
  const {
    highlightedText: firstSegmentHighlight,
    remainderText: restOfFirstSegment,
  } = getHighlightedTextParts(firstSegmentText);
  
  // 나머지 세그먼트들
  const remainingSegments = message.segments?.slice(1) || [];
  const remainingText = remainingSegments.map((seg: any) => seg.text).join('\n\n');
  const imageUrl = typeof message.thumbnailUrl === 'string' ? message.thumbnailUrl.trim() : '';
  const shouldShowImage = imageUrl.length > 0;
  const siteUrl = typeof message.siteUrl === 'string' ? message.siteUrl.trim() : '';
  const shouldShowSite = siteUrl.length > 0;

  useEffect(() => {
    setIsSiteVisible(false);
  }, [message]);
  
  // 전체 텍스트 구성: 첫 번째 문장 + 첫 번째 세그먼트 나머지 + 나머지 세그먼트들
  const fullText =
    firstSegmentHighlight +
    (restOfFirstSegment ? '\n\n' + restOfFirstSegment : '') +
    (remainingText ? '\n\n' + remainingText : '');
  const textWithoutLastSentence = removeLastSentence(fullText);
  const displayText = textWithoutLastSentence || '';
  
  // 하이라이트 애니메이션 트리거
  useEffect(() => {
    setShowHighlight(true);
    const timer = setTimeout(() => setShowHighlight(false), 2000);
    return () => clearTimeout(timer);
  }, [message.segments]);
  
  const textStyle = {
    color: '#000',
    fontFamily: 'Pretendard Variable',
    fontSize: '16px',
    fontStyle: 'normal' as const,
    fontWeight: 400,
    lineHeight: '140%',
    letterSpacing: '-0.64px',
    textAlign: 'center' as const,
    wordBreak: 'keep-all' as const,
    overflowWrap: 'break-word' as const,
    width: '86%',
    marginLeft: 'auto',
    marginRight: 'auto',
  };

  const firstBubbleStyle = {
    color: '#4E5363',
    textAlign: 'center' as const,
    textShadow: '0 0 7.9px rgba(0, 0, 0, 0.16)',
    fontFamily: 'Pretendard Variable',
    fontSize: '20px',
    fontStyle: 'normal' as const,
    fontWeight: 600,
    lineHeight: '132%',
    letterSpacing: '-0.88px',
    wordBreak: 'normal' as const,
    overflowWrap: 'break-word' as const,
  };
  
  return (
    <div className="flex justify-center mb-4">
      <div className="glass-overlay">
            <div className="glass-modal">
              <div className="glass-content">
                {showHighlight && <div className="glass-highlight" />}
                <div className="glass-body">
          {(() => {
            const TypewriterComponent = typewriterComponents[typewriterVariant];
            const typewriterProps: Record<string, any> = {
              text: displayText,
              speed: 50,
              delay: 500,
              speedVariation: 0.3,
              minSpeed: 20,
              maxSpeed: 100,
            };

            if (typewriterVariant === 'v2') {
              typewriterProps.characterChangeInterval = 200;
            }

            return (
              <TypewriterComponent
                {...typewriterProps}
                onComplete={() => {
                  if (shouldShowSite) {
                    setIsSiteVisible(true);
                  }
                }}
                render={(displayedText: string, isComplete: boolean, currentCursorChar?: string) => {
                  const cursorChar = currentCursorChar ?? '●';
                  const targetHighlightLength = Math.min(firstSegmentHighlight.length, displayText.length);
                  const displayedHighlight = displayedText.substring(0, targetHighlightLength);
                  const displayedRest = displayedText.substring(targetHighlightLength);
                  const cleanedRest = trimLeadingWhitespace(displayedRest);
                  const showCursor = !isComplete;
                  const firstDotSize = computeDotSize(firstBubbleStyle.fontSize);
                  const textDotSize = computeDotSize(textStyle.fontSize);
                  const imageShouldRender =
                    shouldShowImage &&
                    displayedHighlight &&
                    displayedHighlight.length === targetHighlightLength;

                        return (
                          <div>
                            {displayedHighlight && (
                              <div className="flex justify-center mb-3">
                                <div className="whitespace-pre-wrap flex justify-center" style={firstBubbleStyle}>
                                  <QuotedTextRenderer text={displayedHighlight} enableKeywordLineBreak />
                                  {showCursor && displayedRest.length === 0 && (
                                    <span
                                      className="inline-block"
                                      style={{
                                        fontSize: firstDotSize,
                                        lineHeight: 1,
                                        verticalAlign: 'middle',
                                        marginLeft: '2px',
                                        color: '#000',
                                        transition: 'none',
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
                                  className="mb-3 flex justify-center"
                                  style={{
                                    width: '100%',
                                    maxWidth: '100%',
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
                                      transform: imageShouldRender ? 'scaleY(1)' : 'scaleY(0)',
                                      transformOrigin: 'top',
                                      opacity: imageShouldRender ? 1 : 0,
                                      transition: 'transform 0.6s ease-in-out, opacity 0.6s ease-in-out',
                                    }}
                                  >
                                    <img
                                      src={imageUrl}
                                      alt="이벤트 썸네일"
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                              {cleanedRest && (
                                <div className="whitespace-pre-wrap" style={textStyle}>
                                  <QuotedTextRenderer text={cleanedRest} />
                                  {showCursor && (
                                    <span
                                      className="inline-block"
                                      style={{
                                        fontSize: textDotSize,
                                        lineHeight: 1,
                                        verticalAlign: 'middle',
                                        marginLeft: '2px',
                                        color: '#000',
                                        transition: 'none',
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
                                    color: '#000',
                                    transition: 'none',
                                  }}
                                >
                                  {cursorChar}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                }}
              />
            );
          })()}

            <div
              className="mt-4 flex justify-center"
              style={{
                opacity: shouldShowSite && isSiteVisible ? 1 : 0,
                transform: shouldShowSite && isSiteVisible ? 'translateY(0)' : 'translateY(12px)',
                transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                pointerEvents: shouldShowSite && isSiteVisible ? 'auto' : 'none',
              }}
            >
              {shouldShowSite && <SiteLink url={siteUrl} />}
            </div>

            {message.tokens && <TokenInfo tokens={message.tokens} />}
            {message.hits && message.hits.length > 0 && <HitInfo hits={message.hits} />}
          </div>
          </div>
      </div>
      </div>
      <AssistantGlassStyles />
    </div>
  );
};

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
const SingleMessage: React.FC<{
  message: any;
  isThinking: boolean;
  onPlayTTS?: (text: string) => void;
  isPlayingTTS: boolean;
  isGlobalLoading?: boolean;
  typewriterVariant: TypewriterVariant;
}> = ({ message, isThinking, onPlayTTS, isPlayingTTS, isGlobalLoading = false, typewriterVariant }) => {
  const [showHighlight, setShowHighlight] = useState(false);
  const [isSiteVisible, setIsSiteVisible] = useState(false);
  
  const textStyle = {
    color: '#000',
    fontFamily: 'Pretendard Variable',
    fontSize: '16px',
    fontStyle: 'normal' as const,
    fontWeight: 400,
    lineHeight: '140%',
    letterSpacing: '-0.64px',
    textAlign: 'center' as const,
    wordBreak: 'keep-all' as const,
    overflowWrap: 'break-word' as const,
    width: '86%',
    marginLeft: 'auto',
    marginRight: 'auto',
  };

  const firstBubbleStyle = {
    color: '#4E5363',
    textAlign: 'center' as const,
    textShadow: '0 0 7.9px rgba(0, 0, 0, 0.16)',
    fontFamily: 'Pretendard Variable',
    fontSize: '20px',
    fontStyle: 'normal' as const,
    fontWeight: 600,
    lineHeight: '132%',
    letterSpacing: '-0.88px',
    wordBreak: 'normal' as const,
    overflowWrap: 'break-word' as const,
  };

  const contentWithoutLastSentence = message.role === 'assistant'
    ? removeLastSentence(message.content || '')
    : message.content || '';
  const assistantHighlight = message.role === 'assistant'
    ? getHighlightedTextParts(contentWithoutLastSentence).highlightedText
    : '';
  const imageUrl = typeof message.thumbnailUrl === 'string' ? message.thumbnailUrl.trim() : '';
  const shouldShowImage = imageUrl.length > 0;
  const siteUrl = typeof message.siteUrl === 'string' ? message.siteUrl.trim() : '';
  const shouldShowSite = siteUrl.length > 0;

  // AI 메시지 등장 시 하이라이트 애니메이션 트리거
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

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-center'} mb-4`}>
      {message.role === 'assistant' ? (
        <>
          <div className="glass-overlay glass-overlay--visible">
            <div className="glass-modal">
              <div className="glass-content">
                {showHighlight && <div className="glass-highlight" />}
                <div className="whitespace-pre-wrap glass-body" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}>
            {!isThinking ? (
              <div style={textStyle}>
                {(() => {
                  const TypewriterComponent = typewriterComponents[typewriterVariant];
                  const assistantText = message.role === 'assistant' ? contentWithoutLastSentence : (message.content || '');
                  const typewriterProps: Record<string, any> = {
                    text: assistantText,
                    speed: 50,
                    delay: 500,
                    speedVariation: 0.3,
                    minSpeed: 20,
                    maxSpeed: 100,
                  };

                  if (typewriterVariant === 'v2') {
                    typewriterProps.characterChangeInterval = 200;
                  }

                  return (
                    <TypewriterComponent
                      {...typewriterProps}
                      onComplete={() => {
                        if (shouldShowSite) {
                          setIsSiteVisible(true);
                        }
                      }}
                      render={(displayedText: string, isComplete: boolean, currentCursorChar?: string) => {
                        const cursorChar = currentCursorChar ?? '●';
                        const targetHighlightLength = Math.min(assistantHighlight.length, assistantText.length);
                        const displayedHighlight = displayedText.substring(0, targetHighlightLength);
                        const displayedRest = displayedText.substring(targetHighlightLength);
                        const cleanedRest = trimLeadingWhitespace(displayedRest);
                        const showCursor = !isComplete;
                        const firstDotSize = computeDotSize(firstBubbleStyle.fontSize);
                        const textDotSize = computeDotSize(textStyle.fontSize);
                        const imageShouldRender =
                          shouldShowImage &&
                          displayedHighlight &&
                          displayedHighlight.length === targetHighlightLength;

                        return (
                          <div>
                            {displayedHighlight && (
                              <div className="flex justify-center mb-3">
                                <div className="whitespace-pre-wrap flex justify-center" style={firstBubbleStyle}>
                                  <QuotedTextRenderer text={displayedHighlight} enableKeywordLineBreak />
                                  {showCursor && displayedRest.length === 0 && (
                                    <span
                                      className="inline-block"
                                      style={{
                                        fontSize: firstDotSize,
                                        lineHeight: 1,
                                        verticalAlign: 'middle',
                                        marginLeft: '2px',
                                        color: '#000',
                                        transition: 'none',
                                      }}
                                    >
                                      {cursorChar}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="flex flex-col gap-2">
                              {imageShouldRender && (
                                <div
                                  className="mb-3 flex justify-center"
                                  style={{
                                    width: '100%',
                                    maxWidth: '100%',
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
                                      transform: imageShouldRender ? 'scaleY(1)' : 'scaleY(0)',
                                      transformOrigin: 'top',
                                      opacity: imageShouldRender ? 1 : 0,
                                      transition: 'transform 0.6s ease-in-out, opacity 0.6s ease-in-out',
                                    }}
                                  >
                                    <img
                                      src={imageUrl}
                                      alt="이벤트 썸네일"
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                              {cleanedRest && (
                                <div className="whitespace-pre-wrap" style={textStyle}>
                                  <QuotedTextRenderer text={cleanedRest} />
                                  {showCursor && (
                                    <span
                                      className="inline-block"
                                      style={{
                                        fontSize: textDotSize,
                                        lineHeight: 1,
                                        verticalAlign: 'middle',
                                        marginLeft: '2px',
                                        color: '#000',
                                        transition: 'none',
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
                                    color: '#000',
                                    transition: 'none',
                                  }}
                                >
                                  {cursorChar}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }}
                    />
                  );
                })()}
              </div>
            ) : (
              <>
                <span style={textStyle}>{message.content}</span>
                <span className="inline-block ml-2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
              </>
            )}
                </div>
                <div
                  className="mt-4 flex justify-center"
                  style={{
                    opacity: shouldShowSite && isSiteVisible ? 1 : 0,
                    transform: shouldShowSite && isSiteVisible ? 'translateY(0)' : 'translateY(12px)',
                    transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                    pointerEvents: shouldShowSite && isSiteVisible ? 'auto' : 'none',
                  }}
                >
                  {shouldShowSite && <SiteLink url={siteUrl} />}
                </div>
                {message.tokens && <TokenInfo tokens={message.tokens} />}
                {message.hits && message.hits.length > 0 && <HitInfo hits={message.hits} />}
              </div>
            </div>
          </div>
          <AssistantGlassStyles />
        </>
      ) : (
        // 사용자 메시지: SplitText 애니메이션 + fade-out
        <div className="max-w-[86%] px-4 py-3"
          style={{
            opacity: 1,
          }}
        >
          <div className="whitespace-pre-wrap" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}>
            <div style={textStyle}>
              <SplitText
                text={message.content}
                delay={0}
                duration={0.8}
                stagger={0.03}
                animation="fadeIn"
              />
            </div>
          </div>
          {message.tokens && <TokenInfo tokens={message.tokens} />}
          {message.hits && message.hits.length > 0 && <HitInfo hits={message.hits} />}
        </div>
      )}
    </div>
  );
};

/**
 * 메인 ChatBubble 컴포넌트
 */
export const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  message, 
  isThinking = false, 
  onPlayTTS, 
  isPlayingTTS = false,
  isGlobalLoading = false,
  typewriterVariant = 'v2'
}) => {
  // AI 메시지이고 segments가 있으면 분할된 말풍선들을 렌더링
  if (message.role === 'assistant' && message.segments && message.segments.length > 1) {
    return (
      <SegmentedMessage
        message={message}
        onPlayTTS={onPlayTTS}
        isPlayingTTS={isPlayingTTS}
        typewriterVariant={typewriterVariant}
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
    />
  );
};
