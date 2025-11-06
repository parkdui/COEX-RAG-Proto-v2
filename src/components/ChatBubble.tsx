/**
 * ChatBubble 컴포넌트
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChatBubbleProps } from '@/types';
import { getSegmentStyleClass, getSegmentIcon } from '@/lib/textSplitter';
import { SplitWords, TypingEffect, SplitText, Typewriter } from '@/components/ui';
import ChatTypewriter from '@/components/ui/ChatTypewriter';

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

/**
 * 텍스트를 작은따옴표, 큰따옴표, '**' 파싱 결과로 렌더링하는 컴포넌트
 */
const QuotedTextRenderer: React.FC<{ text: string }> = ({ text }) => {
  const parts = parseQuotedText(text);

  return (
    <>
      {parts.map((part, index) => {
        if (part.isQuoted) {
          return (
            <span
              key={index}
              className="inline-block px-2 py-1 mx-1 relative"
              style={{
                fontWeight: 600, // Semibold
                borderRadius: '25px',
                background: 'linear-gradient(1deg, rgba(255, 255, 255, 0.10) 40.15%, rgba(229, 255, 249, 0.40) 99.12%)',
                whiteSpace: 'nowrap' as const, // 줄바꿈 시 통째로 다음 줄로
              }}
            >
              {/* 보더 그라데이션을 위한 wrapper */}
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
                {part.text}
              </span>
            </span>
          );
        }
        return <span key={index}>{part.text}</span>;
      })}
    </>
  );
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
    wordBreak: 'normal' as const,
    overflowWrap: 'break-word' as const,
  };

  // 첫 번째 말풍선 스타일
  const firstBubbleStyle = {
    color: '#4E5363',
    textAlign: 'center' as const,
    textShadow: '0 0 7.9px rgba(0, 0, 0, 0.16)',
    fontFamily: 'Pretendard Variable',
    fontSize: '22px',
    fontStyle: 'normal' as const,
    fontWeight: 600,
    lineHeight: '132%',
    letterSpacing: '-0.88px',
    wordBreak: 'normal' as const,
    overflowWrap: 'break-word' as const,
  };

  const isFirst = segmentIndex === 0;

  // 첫 번째 문장 추출 (. ! ? 등으로 구분)
  const getFirstSentence = (text: string) => {
    const match = text.match(/[^.!?]*(?:[.!?]|$)/);
    return match ? match[0].trim() : text.split(/[.!?]/)[0].trim();
  };

  const getRestOfText = (text: string) => {
    const match = text.match(/[^.!?]*(?:[.!?]|$)/);
    if (match && match[0].trim().length < text.length) {
      return text.substring(match[0].trim().length).trim();
    }
    return '';
  };

  const firstSentence = isFirst ? getFirstSentence(segment.text) : '';
  const restOfText = isFirst ? getRestOfText(segment.text) : segment.text;

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
}> = ({ message, onPlayTTS, isPlayingTTS }) => {
  const [showHighlight, setShowHighlight] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);
  const [dotColor, setDotColor] = useState({ r: 0, g: 0, b: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  const colorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 첫 번째 세그먼트의 첫 번째 문장 추출
  const getFirstSentence = (text: string) => {
    const match = text.match(/[^.!?]*(?:[.!?]|$)/);
    return match ? match[0].trim() : text.split(/[.!?]/)[0].trim();
  };
  
  const firstSegmentText = message.segments?.[0]?.text || message.content || '';
  const firstSentence = getFirstSentence(firstSegmentText);
  
  // 첫 번째 세그먼트에서 첫 번째 문장을 제외한 나머지
  const getRestOfFirstSegment = (text: string, firstSentence: string) => {
    const index = text.indexOf(firstSentence);
    if (index !== -1) {
      return text.substring(index + firstSentence.length).trim();
    }
    return '';
  };
  
  const restOfFirstSegment = getRestOfFirstSegment(firstSegmentText, firstSentence);
  
  // 나머지 세그먼트들
  const remainingSegments = message.segments?.slice(1) || [];
  const remainingText = remainingSegments.map((seg: any) => seg.text).join('\n\n');
  
  // 전체 텍스트 구성: 첫 번째 문장 + 첫 번째 세그먼트 나머지 + 나머지 세그먼트들
  const fullText = firstSentence + (restOfFirstSegment ? '\n\n' + restOfFirstSegment : '') + (remainingText ? '\n\n' + remainingText : '');
  
  // Dot 색상이 실시간으로 변하는 애니메이션
  useEffect(() => {
    const generateRandomColor = () => {
      return {
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256),
      };
    };

    setDotColor(generateRandomColor());

    colorIntervalRef.current = setInterval(() => {
      setDotColor(generateRandomColor());
    }, 200);

    return () => {
      if (colorIntervalRef.current) {
        clearInterval(colorIntervalRef.current);
        colorIntervalRef.current = null;
      }
    };
  }, []);

  // 하이라이트 애니메이션 트리거
  useEffect(() => {
    setShowHighlight(true);
    const timer = setTimeout(() => setShowHighlight(false), 2000);
    return () => clearTimeout(timer);
  }, [message.segments]);
  
  // 컨테이너 높이 추적 및 실시간 확장 효과
  useEffect(() => {
    if (contentRef.current) {
      // 즉시 높이 계산
      const updateHeight = () => {
        if (contentRef.current) {
          const scrollHeight = contentRef.current.scrollHeight;
          // 패딩을 고려한 높이 계산 (20px * 2 = 40px)
          const newHeight = scrollHeight + 40;
          setContainerHeight(newHeight);
        }
      };
      
      // 초기 높이 설정
      updateHeight();
      
      // ResizeObserver로 높이 변화 감지
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newHeight = entry.contentRect.height + 40;
          if (newHeight > 0) {
            setContainerHeight(newHeight);
          }
        }
      });
      
      resizeObserver.observe(contentRef.current);
      
      // 주기적으로 높이 확인 (Typewriter로 인한 동적 변화 대응)
      const intervalId = setInterval(updateHeight, 100);
      
      return () => {
        resizeObserver.disconnect();
        clearInterval(intervalId);
      };
    }
  }, [message.segments, fullText]);
  
  const textStyle = {
    color: '#000',
    fontFamily: 'Pretendard Variable',
    fontSize: '16px',
    fontStyle: 'normal' as const,
    fontWeight: 400,
    lineHeight: '140%',
    letterSpacing: '-0.64px',
    textAlign: 'center' as const,
    wordBreak: 'normal' as const,
    overflowWrap: 'break-word' as const,
  };

  const firstBubbleStyle = {
    color: '#4E5363',
    textAlign: 'center' as const,
    textShadow: '0 0 7.9px rgba(0, 0, 0, 0.16)',
    fontFamily: 'Pretendard Variable',
    fontSize: '22px',
    fontStyle: 'normal' as const,
    fontWeight: 600,
    lineHeight: '132%',
    letterSpacing: '-0.88px',
    wordBreak: 'normal' as const,
    overflowWrap: 'break-word' as const,
  };
  
  return (
    <div className="flex justify-center mb-4">
      <div 
        style={{
          width: '90%',
          borderRadius: '32px',
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
          transition: containerHeight > 0 ? 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          height: containerHeight > 0 ? `${containerHeight}px` : 'auto',
          minHeight: containerHeight > 0 ? `${containerHeight}px` : 'auto',
        }}
      >
        {/* Border stroke 애니메이션 */}
        {showHighlight && (
          <div 
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              borderRadius: '32px',
              padding: '2px',
              background: 'linear-gradient(45deg, transparent 25%, rgba(255, 255, 255, 0.8) 50%, transparent 75%, transparent 100%)',
              backgroundSize: '400% 400%',
              animation: 'gradient-rotate 2s linear',
              pointerEvents: 'none',
              zIndex: 1,
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
            }}
          />
        )}
        <div ref={contentRef} style={{ position: 'relative', zIndex: 2 }}>
          <ChatTypewriter
            text={fullText}
            speed={50}
            delay={500}
            onComplete={() => {
              // 완료 후 높이 재계산
              if (contentRef.current) {
                setContainerHeight(contentRef.current.scrollHeight + 40);
              }
            }}
            render={(displayedText, isComplete) => {
              // 첫 번째 문장 부분과 나머지 부분으로 분리
              const firstSentenceLength = firstSentence.length;
              const displayedFirstSentence = displayedText.substring(0, firstSentenceLength);
              const displayedRest = displayedText.substring(firstSentenceLength);
              
              // displayedRest에서 앞의 '\n\n' 제거
              const cleanedRest = displayedRest.replace(/^\n\n/, '');
              
              // ●를 표시할 위치 결정 (마지막 텍스트가 있는 곳)
              const showCursor = !isComplete;
              
              // 텍스트 크기에 따라 dot 사이즈 계산
              const getDotSize = (fontSize: string | number | undefined) => {
                if (!fontSize) return '19.2px';
                const size = typeof fontSize === 'string' ? parseFloat(fontSize) : fontSize;
                if (typeof fontSize === 'string' && fontSize.includes('px')) {
                  return `${size * 1.2}px`;
                }
                if (typeof fontSize === 'string' && fontSize.includes('pt')) {
                  return `${size * 1.2}pt`;
                }
                if (typeof fontSize === 'string' && fontSize.includes('em')) {
                  return `${size * 1.2}em`;
                }
                if (typeof size === 'number') {
                  return `${size * 1.2}px`;
                }
                return '19.2px';
              };
              
              const firstDotSize = getDotSize(firstBubbleStyle.fontSize);
              const textDotSize = getDotSize(textStyle.fontSize);
              
              return (
                <div className="flex flex-col gap-2">
                  {displayedFirstSentence && (
                    <div className="whitespace-pre-wrap mb-3 flex justify-center" style={firstBubbleStyle}>
                      <QuotedTextRenderer text={displayedFirstSentence} />
                      {showCursor && displayedRest.length === 0 && (
                        <span 
                          className="inline-block"
                          style={{
                            fontSize: firstDotSize,
                            lineHeight: 1,
                            verticalAlign: 'middle',
                            marginLeft: '2px',
                            color: `rgb(${dotColor.r}, ${dotColor.g}, ${dotColor.b})`,
                            transition: 'color 0.2s ease',
                          }}
                        >
                          ●
                        </span>
                      )}
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
                            color: `rgb(${dotColor.r}, ${dotColor.g}, ${dotColor.b})`,
                            transition: 'color 0.2s ease',
                          }}
                        >
                          ●
                        </span>
                      )}
                    </div>
                  )}
                  {!displayedFirstSentence && !cleanedRest && showCursor && (
                    <span 
                      className="inline-block"
                      style={{
                        fontSize: textDotSize,
                        lineHeight: 1,
                        verticalAlign: 'middle',
                        marginLeft: '2px',
                        color: `rgb(${dotColor.r}, ${dotColor.g}, ${dotColor.b})`,
                        transition: 'color 0.2s ease',
                      }}
                    >
                      ●
                    </span>
                  )}
                </div>
              );
            }}
          />
          
          {message.tokens && <TokenInfo tokens={message.tokens} />}
          {message.hits && message.hits.length > 0 && <HitInfo hits={message.hits} />}
        </div>
      </div>
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
}> = ({ message, isThinking, onPlayTTS, isPlayingTTS, isGlobalLoading = false }) => {
  // 사용자 메시지는 처음에 표시되다가 AI 답변이 시작되면 fade-out
  const [isUserMessageVisible, setIsUserMessageVisible] = useState(true);
  const [hasAssistantMessageStarted, setHasAssistantMessageStarted] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);
  const [dotColor, setDotColor] = useState({ r: 0, g: 0, b: 0 });
  const colorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const textStyle = {
    color: '#000',
    fontFamily: 'Pretendard Variable',
    fontSize: '16px',
    fontStyle: 'normal' as const,
    fontWeight: 400,
    lineHeight: '140%',
    letterSpacing: '-0.64px',
    textAlign: 'center' as const,
    wordBreak: 'normal' as const,
    overflowWrap: 'break-word' as const,
  };

  // 사용자 메시지는 계속 표시되어야 함 (AI 답변과 함께 표시)
  // fade-out 제거: 사용자 메시지는 AI 답변과 함께 유지

  // Dot 색상이 실시간으로 변하는 애니메이션
  useEffect(() => {
    if (message.role === 'assistant' && !isThinking) {
      const generateRandomColor = () => {
        return {
          r: Math.floor(Math.random() * 256),
          g: Math.floor(Math.random() * 256),
          b: Math.floor(Math.random() * 256),
        };
      };

      setDotColor(generateRandomColor());

      colorIntervalRef.current = setInterval(() => {
        setDotColor(generateRandomColor());
      }, 200);

      return () => {
        if (colorIntervalRef.current) {
          clearInterval(colorIntervalRef.current);
          colorIntervalRef.current = null;
        }
      };
    }
  }, [message.role, isThinking]);

  // AI 메시지가 시작되면 상태 업데이트 (전역 상태 관리를 위해)
  useEffect(() => {
    if (message.role === 'assistant' && !isThinking && message.content) {
      setHasAssistantMessageStarted(true);
    }
  }, [message.role, isThinking, message.content]);

  // AI 메시지 등장 시 하이라이트 애니메이션 트리거
  useEffect(() => {
    if (message.role === 'assistant' && !isThinking && message.content) {
      setShowHighlight(true);
      const timer = setTimeout(() => setShowHighlight(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [message.role, isThinking, message.content]);

  // 컨테이너 높이 추적 및 실시간 확장 효과
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (contentRef.current && message.role === 'assistant') {
      // 즉시 높이 계산
      const updateHeight = () => {
        if (contentRef.current) {
          const scrollHeight = contentRef.current.scrollHeight;
          // 패딩을 고려한 높이 계산 (20px * 2 = 40px)
          const newHeight = scrollHeight + 40;
          setContainerHeight(newHeight);
        }
      };
      
      // 초기 높이 설정
      updateHeight();
      
      // ResizeObserver로 높이 변화 감지
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newHeight = entry.contentRect.height + 40;
          if (newHeight > 0) {
            setContainerHeight(newHeight);
          }
        }
      });
      
      resizeObserver.observe(contentRef.current);
      
      // 주기적으로 높이 확인 (Typewriter로 인한 동적 변화 대응)
      const intervalId = setInterval(updateHeight, 100);
      
      return () => {
        resizeObserver.disconnect();
        clearInterval(intervalId);
      };
    }
  }, [message.content, message.role]);

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-center'} mb-4`}>
      {message.role === 'assistant' ? (
        // AI 메시지: 글래스모피즘 효과
        <div 
          style={{
            width: '90%',
            borderRadius: '32px',
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
            padding: '20px',
            position: 'relative',
            overflow: 'visible',
            height: containerHeight > 0 ? `${containerHeight}px` : 'auto',
            minHeight: containerHeight > 0 ? `${containerHeight}px` : 'auto',
            transition: containerHeight > 0 ? 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        >
          {/* Border stroke 애니메이션 */}
          {showHighlight && (
            <div 
              style={{
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                borderRadius: '32px',
                padding: '2px',
                background: 'linear-gradient(45deg, transparent 25%, rgba(255, 255, 255, 0.8) 50%, transparent 75%, transparent 100%)',
                backgroundSize: '400% 400%',
                animation: 'gradient-rotate 2s linear',
                pointerEvents: 'none',
                zIndex: 1,
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
              }}
            />
          )}
          <div ref={contentRef} className="whitespace-pre-wrap" style={{ position: 'relative', zIndex: 2, wordBreak: 'normal', overflowWrap: 'break-word' }}>
            {!isThinking ? (
              // AI 메시지: ChatTypewriter 효과 적용
              <div style={textStyle}>
                <ChatTypewriter
                  text={message.content}
                  speed={50}
                  delay={500}
                  onComplete={() => {
                    // 완료 후 높이 재계산
                    if (contentRef.current) {
                      setContainerHeight(contentRef.current.scrollHeight + 40);
                    }
                  }}
                  render={(displayedText, isComplete) => {
                    // 텍스트 크기에 따라 dot 사이즈 계산
                    const getDotSize = (fontSize: string | number | undefined) => {
                      if (!fontSize) return '19.2px';
                      const size = typeof fontSize === 'string' ? parseFloat(fontSize) : fontSize;
                      if (typeof fontSize === 'string' && fontSize.includes('px')) {
                        return `${size * 1.2}px`;
                      }
                      if (typeof fontSize === 'string' && fontSize.includes('pt')) {
                        return `${size * 1.2}pt`;
                      }
                      if (typeof fontSize === 'string' && fontSize.includes('em')) {
                        return `${size * 1.2}em`;
                      }
                      if (typeof size === 'number') {
                        return `${size * 1.2}px`;
                      }
                      return '19.2px';
                    };
                    
                    const dotSize = getDotSize(textStyle.fontSize);
                    
                    return (
                      <>
                        <QuotedTextRenderer text={displayedText} />
                        {!isComplete && (
                          <span 
                            className="inline-block"
                            style={{
                              fontSize: dotSize,
                              lineHeight: 1,
                              verticalAlign: 'middle',
                              marginLeft: '2px',
                              color: `rgb(${dotColor.r}, ${dotColor.g}, ${dotColor.b})`,
                              transition: 'color 0.2s ease',
                            }}
                          >
                            ●
                          </span>
                        )}
                      </>
                    );
                  }}
                />
              </div>
            ) : (
              <>
                <span style={textStyle}>{message.content}</span>
                <span className="inline-block ml-2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
              </>
            )}
          </div>
          {message.tokens && <TokenInfo tokens={message.tokens} />}
          {message.hits && message.hits.length > 0 && <HitInfo hits={message.hits} />}
        </div>
      ) : (
        // 사용자 메시지: SplitText 애니메이션 + fade-out
        <div className="max-w-[86%] px-4 py-3"
          style={{
            opacity: isUserMessageVisible ? 1 : 0,
            transition: 'opacity 0.5s ease-out',
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
  isGlobalLoading = false
}) => {
  // AI 메시지이고 segments가 있으면 분할된 말풍선들을 렌더링
  if (message.role === 'assistant' && message.segments && message.segments.length > 1) {
    return (
      <SegmentedMessage
        message={message}
        onPlayTTS={onPlayTTS}
        isPlayingTTS={isPlayingTTS}
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
    />
  );
};
