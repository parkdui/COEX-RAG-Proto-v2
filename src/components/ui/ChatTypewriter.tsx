'use client';

import { useEffect, useState, useRef } from 'react';

interface ChatTypewriterProps {
  text: string;
  speed?: number; // ms per character
  delay?: number; // ms before starting
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
  render?: (displayedText: string, isComplete: boolean) => React.ReactNode; // 커스텀 렌더링 함수 (isComplete 포함)
}

export default function ChatTypewriter({
  text,
  speed = 50,
  delay = 0,
  onComplete,
  className = '',
  style,
  render,
}: ChatTypewriterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [dotColor, setDotColor] = useState({ r: 0, g: 0, b: 0 });
  const onCompleteRef = useRef(onComplete);
  const textRef = useRef(text);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const colorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 콜백 함수를 최신으로 유지
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Dot 색상이 실시간으로 변하는 애니메이션
  useEffect(() => {
    if (!isComplete) {
      // 랜덤 RGB 색상 생성 함수
      const generateRandomColor = () => {
        return {
          r: Math.floor(Math.random() * 256),
          g: Math.floor(Math.random() * 256),
          b: Math.floor(Math.random() * 256),
        };
      };

      // 초기 색상 설정
      setDotColor(generateRandomColor());

      // 주기적으로 색상 변경 (200ms마다)
      colorIntervalRef.current = setInterval(() => {
        setDotColor(generateRandomColor());
      }, 200);

      return () => {
        if (colorIntervalRef.current) {
          clearInterval(colorIntervalRef.current);
          colorIntervalRef.current = null;
        }
      };
    } else {
      // 타이핑이 완료되면 색상 애니메이션 중지
      if (colorIntervalRef.current) {
        clearInterval(colorIntervalRef.current);
        colorIntervalRef.current = null;
      }
    }
  }, [isComplete]);

  useEffect(() => {
    if (text.length === 0) return;
    
    // text가 변경된 경우에만 재시작
    if (textRef.current !== text) {
      // 이전 타임아웃 정리
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      textRef.current = text;
      setDisplayedText('');
      setIsComplete(false);
      isRunningRef.current = false;
    }
    
    // 이미 실행 중이면 재시작하지 않음
    if (isRunningRef.current) return;
    
    isRunningRef.current = true;

    let timeoutId: NodeJS.Timeout;
    let currentIndex = 0;

    const startTyping = () => {
      const typeNextChar = () => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
          timeoutId = setTimeout(typeNextChar, speed);
          timeoutIdRef.current = timeoutId;
        } else {
          setIsComplete(true);
          timeoutIdRef.current = null;
          isRunningRef.current = false;
          onCompleteRef.current?.();
        }
      };

      typeNextChar();
    };

    if (delay > 0) {
      timeoutId = setTimeout(startTyping, delay);
      timeoutIdRef.current = timeoutId;
    } else {
      startTyping();
    }

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      isRunningRef.current = false;
    };
  }, [text, speed, delay]);

  if (render) {
    return <>{render(displayedText, isComplete)}</>;
  }

  const dotColorString = `rgb(${dotColor.r}, ${dotColor.g}, ${dotColor.b})`;

  // 텍스트 크기에 따라 dot 사이즈 계산
  const getDotSize = () => {
    // style prop에서 fontSize 추출
    if (style?.fontSize) {
      const fontSize = style.fontSize;
      
      // fontSize의 1.2배로 dot 크기 설정 (예: 16px -> 19.2px)
      if (typeof fontSize === 'number') {
        return fontSize * 1.2;
      }
      // 'px' 단위인 경우
      if (typeof fontSize === 'string' && fontSize.includes('px')) {
        const numValue = parseFloat(fontSize);
        return `${numValue * 1.2}px`;
      }
      // 'pt' 단위인 경우
      if (typeof fontSize === 'string' && fontSize.includes('pt')) {
        const numValue = parseFloat(fontSize);
        return `${numValue * 1.2}pt`;
      }
      // 'em' 단위인 경우
      if (typeof fontSize === 'string' && fontSize.includes('em')) {
        const numValue = parseFloat(fontSize);
        return `${numValue * 1.2}em`;
      }
    }
    // 기본값: 16px의 1.2배 = 19.2px
    return '19.2px';
  };

  const dotSize = getDotSize();

  return (
    <span className={className} style={style}>
      {displayedText}
      {!isComplete && (
        <span 
          className="inline-block"
          style={{
            color: dotColorString,
            fontSize: dotSize,
            transition: 'color 0.2s ease',
            lineHeight: 1,
            verticalAlign: 'middle',
            marginLeft: '2px',
          }}
        >
          ●
        </span>
      )}
    </span>
  );
}

