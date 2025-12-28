import React, { useEffect, useRef, useState, useMemo } from 'react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  stagger?: number;
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale' | 'typing';
}

// 색상 정의
const LIGHT_BLUE = '#7dd3fc'; // 라이트 블루
const DARK_NAVY = '#000'; // ver2: 검은색

export const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 0,
  duration = 0.6,
  stagger = 0.05,
  animation = 'fadeIn'
}) => {
  const [wordStates, setWordStates] = useState<Array<{ visible: boolean; color: typeof LIGHT_BLUE | typeof DARK_NAVY }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // 텍스트를 단어와 줄바꿈으로 분할 (줄바꿈 유지)
  const words = useMemo(() => {
    // 줄바꿈을 기준으로 먼저 분리
    const parts: Array<{ text: string; isLineBreak: boolean }> = [];
    const lines = text.split('\n');
    
    lines.forEach((line, lineIndex) => {
      // 각 줄의 단어 분리
      const lineWords = line.trim().split(/\s+/).filter((word: string) => word.length > 0);
      lineWords.forEach(word => {
        parts.push({ text: word, isLineBreak: false });
      });
      
      // 줄바꿈 추가 (마지막 줄이 아닌 경우)
      if (lineIndex < lines.length - 1) {
        parts.push({ text: '\n', isLineBreak: true });
      }
    });
    
    return parts;
  }, [text]);
  
  // 애니메이션할 단어만 필터링 (줄바꿈 제외)
  const animatableWords = useMemo(() => {
    return words.filter(w => !w.isLineBreak);
  }, [words]);

  // 단어별 상태 초기화 및 애니메이션 시작
  useEffect(() => {
    // 단어가 없으면 종료
    if (animatableWords.length === 0) {
      setWordStates([]);
      return;
    }
    
    // wordStates 초기화 (애니메이션할 단어만)
    const initialStates: Array<{ visible: boolean; color: typeof LIGHT_BLUE | typeof DARK_NAVY }> = 
      animatableWords.map(() => ({ visible: false, color: LIGHT_BLUE }));
    setWordStates(initialStates);

    // delay 후 시작 (delay는 초 단위, 밀리초로 변환)
    const baseDelay = delay * 1000;
    const timers: NodeJS.Timeout[] = [];

    // 애니메이션할 단어만 순회 (animatableWords 사용)
    animatableWords.forEach((wordInfo, animatableIndex) => {
      const wordDelay = baseDelay + (animatableIndex * stagger * 1000);
      // 단어 나타남 (라이트 블루)
      const showTimer = setTimeout(() => {
        setWordStates(prev => {
          if (prev.length !== animatableWords.length) {
            return prev;
          }
          const newStates = [...prev];
          if (newStates[animatableIndex]) {
            newStates[animatableIndex] = { visible: true, color: LIGHT_BLUE };
          }
          return newStates;
        });
        
        // 라이트 블루에서 다크 네이비로 전환 (300ms 후)
        const colorChangeTimer = setTimeout(() => {
          setWordStates(prev => {
            if (prev.length !== animatableWords.length) return prev;
            const newStates = [...prev];
            if (newStates[animatableIndex]) {
              newStates[animatableIndex] = { visible: true, color: DARK_NAVY };
            }
            return newStates;
          });
        }, 300);

        timers.push(colorChangeTimer);
      }, wordDelay);

      timers.push(showTimer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [text, words, animatableWords, delay, duration, stagger]);

  return (
    <div ref={containerRef} className={className}>
      {/* 단어별로 나타남 (라이트 블루 → 다크 네이비) */}
      {/* 디버깅: words가 비어있어도 원본 텍스트 표시 */}
      {words.length === 0 ? (
        <span style={{ color: DARK_NAVY }}>{text}</span>
      ) : (
        <div>
          {(() => {
            let animatableIndex = 0;
            return words.map((wordInfo, index) => {
              // 줄바꿈인 경우
              if (wordInfo.isLineBreak) {
                return <br key={`br-${index}`} />;
              }
              
              const currentIndex = animatableIndex;
              
              // animatableIndex 증가 (단어인 경우만)
              animatableIndex++;
              
              const wordState = wordStates[currentIndex];
              
              // wordStates가 초기화되지 않았으면 일단 보이게
              // 초기화되었으면 wordState.visible에 따라 제어
              const isVisible = wordStates.length === 0 ? true : (wordState?.visible ?? false);
              const color = wordStates.length === 0 ? DARK_NAVY : (wordState?.color ?? DARK_NAVY);
              
              return (
                <span
                  key={`word-${index}`}
                  style={{
                    display: 'inline-block',
                    marginRight: '0.25em',
                    opacity: isVisible ? 1 : 0,
                    color: color,
                    transition: 'opacity 0.3s ease-out, color 0.3s ease-in-out',
                  }}
                >
                  {wordInfo.text}
                </span>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
};

interface SplitWordsProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  stagger?: number;
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale';
}

export const SplitWords: React.FC<SplitWordsProps> = ({
  text,
  className = '',
  delay = 0,
  duration = 0.6,
  stagger = 0.1,
  animation = 'fadeIn'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // GradientText를 동적으로 import
  const GradientText = React.lazy(() => import('./GradientText').then(m => ({ default: m.default })));

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const getAnimationClass = () => {
    const baseClasses = 'inline-block mr-1';
    const animationClasses = {
      fadeIn: isVisible ? 'opacity-100' : 'opacity-0',
      slideUp: isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
      slideDown: isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
      slideLeft: isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0',
      slideRight: isVisible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0',
      scale: isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
    };

    return `${baseClasses} transition-all duration-${Math.round(duration * 1000)} ease-out ${animationClasses[animation]}`;
  };

  const getAnimationStyle = (index: number) => {
    const transitionDelay = isVisible ? `${index * stagger}s` : '0s';
    return {
      transitionDelay,
      transitionDuration: `${duration}s`
    };
  };

  // ** 또는 작은 따옴표로 감싸진 부분을 찾아서 분할
  const parseText = (text: string): Array<{ text: string; isGradient: boolean }> => {
    const parts: Array<{ text: string; isGradient: boolean }> = [];
    let remaining = text;

    while (remaining.length > 0) {
      // ** 또는 작은 따옴표 중 먼저 나오는 것 찾기
      const doubleStarIndex = remaining.indexOf('**');
      const singleQuotePairIndex = remaining.indexOf("''");
      const singleQuoteIndex = remaining.indexOf("'");
      
      // 컬리 따옴표: U+2018 (시작), U+2019 (종료)
      const curlyQuoteStartIndex = remaining.indexOf('\u2018');
      const curlyQuoteEndIndex = remaining.indexOf('\u2019');
      
      let gradientStart = -1;
      let gradientMarker = '';
      let gradientEnd = -1;
      let markerLength = 2;
      
      // 여러 마커 중 가장 앞에 있는 것 선택
      const indices = [
        { index: doubleStarIndex, marker: '**', length: 2 },
        { index: singleQuotePairIndex, marker: "''", length: 2 },
      ].filter(item => item.index !== -1);
      
      // 단일 따옴표 (컬리 따옴표 먼저 확인 후 추가)
      if (curlyQuoteStartIndex !== -1) {
        indices.push({ index: curlyQuoteStartIndex, marker: 'curly', length: 1 });
      } else if (singleQuoteIndex !== -1) {
        // 일반 작은 따옴표 (하나)
        indices.push({ index: singleQuoteIndex, marker: "'", length: 1 });
      }
      
      if (indices.length > 0) {
        indices.sort((a, b) => a.index - b.index);
        const first = indices[0];
        gradientStart = first.index;
        gradientMarker = first.marker;
        markerLength = first.length;
        
        // 마커에 따라 종료 위치 찾기
        if (gradientMarker === 'curly') {
          gradientEnd = remaining.indexOf('\u2019', gradientStart + 1);
        } else if (gradientMarker === "'") {
          gradientEnd = remaining.indexOf("'", gradientStart + 1);
        } else {
          gradientEnd = remaining.indexOf(gradientMarker, gradientStart + markerLength);
        }
      }

      if (gradientStart === -1 || gradientEnd === -1) {
        // 남은 텍스트 모두 추가
        const words = remaining.trim().split(' ');
        words.forEach(word => {
          if (word) parts.push({ text: word, isGradient: false });
        });
        break;
      }

      // 마커 이전의 텍스트 추가
      const beforeGradient = remaining.substring(0, gradientStart).trim();
      if (beforeGradient) {
        beforeGradient.split(' ').forEach(word => {
          if (word) parts.push({ text: word, isGradient: false });
        });
      }

      // 마커로 감싸진 텍스트 추가
      const gradientText = remaining.substring(gradientStart + markerLength, gradientEnd);
      parts.push({ text: gradientText, isGradient: true });

      // 종료 마커 길이 계산
      const endMarkerLength = (gradientMarker === 'curly' || gradientMarker === "'") ? 1 : markerLength;
      remaining = remaining.substring(gradientEnd + endMarkerLength);
    }

    return parts;
  };

  const parsedText = parseText(text);

  return (
    <div ref={containerRef} className={className}>
      <React.Suspense fallback={<div className="inline">{text}</div>}>
        {parsedText.map((item, index) => (
          <span
            key={index}
            className={getAnimationClass()}
            style={getAnimationStyle(index)}
          >
            {item.isGradient ? (
              <GradientText
                colors={['#ffaa40', '#9c40ff', '#ffaa40']}
                animationSpeed={8}
                className="inline"
              >
                {item.text}
              </GradientText>
            ) : (
              item.text
            )}
          </span>
        ))}
      </React.Suspense>
    </div>
  );
};

interface TypingEffectProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  showCursor?: boolean;
}

export const TypingEffect: React.FC<TypingEffectProps> = ({
  text,
  className = '',
  speed = 50,
  delay = 0,
  showCursor = true
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setIsTyping(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!isTyping) return;

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed, isTyping]);

  return (
    <div className={className}>
      <span>{displayedText}</span>
      {showCursor && isTyping && (
        <span className="animate-pulse">|</span>
      )}
    </div>
  );
};
