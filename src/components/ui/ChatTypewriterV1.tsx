'use client';

import { useEffect, useState, useRef } from 'react';

interface ChatTypewriterV1Props {
  text: string;
  speed?: number; // base speed in ms per character
  delay?: number; // ms before starting
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
  render?: (displayedText: string, isComplete: boolean, currentCursorChar?: string) => React.ReactNode;
  // Variable speed parameters
  speedVariation?: number; // percentage variation (0-1), e.g., 0.3 means ±30%
  minSpeed?: number; // minimum speed in ms
  maxSpeed?: number; // maximum speed in ms
}

/**
 * Version 1: Variable speed typewriter effect
 * Text appears with dynamic speed variation for each character
 */
export default function ChatTypewriterV1({
  text,
  speed = 50,
  delay = 0,
  onComplete,
  className = '',
  style,
  render,
  speedVariation = 0.3, // ±30% variation by default
  minSpeed = 20,
  maxSpeed = 100,
}: ChatTypewriterV1Props) {
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
    } else {
      if (colorIntervalRef.current) {
        clearInterval(colorIntervalRef.current);
        colorIntervalRef.current = null;
      }
    }
  }, [isComplete]);

  // Variable speed 계산 함수
  const getVariableSpeed = (): number => {
    // 랜덤한 variation 생성 (-speedVariation ~ +speedVariation)
    const variation = (Math.random() * 2 - 1) * speedVariation;
    const variableSpeed = speed * (1 + variation);
    
    // min/max 범위 내로 제한
    return Math.max(minSpeed, Math.min(maxSpeed, variableSpeed));
  };

  useEffect(() => {
    if (text.length === 0) return;
    
    if (textRef.current !== text) {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      textRef.current = text;
      setDisplayedText('');
      setIsComplete(false);
      isRunningRef.current = false;
    }
    
    if (isRunningRef.current) return;
    
    isRunningRef.current = true;

    let timeoutId: NodeJS.Timeout;
    let currentIndex = 0;

    const startTyping = () => {
      const typeNextChar = () => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
          // Variable speed 적용
          const nextSpeed = getVariableSpeed();
          timeoutId = setTimeout(typeNextChar, nextSpeed);
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
  }, [text, speed, delay, speedVariation, minSpeed, maxSpeed]);

  if (render) {
    return <>{render(displayedText, isComplete, undefined)}</>;
  }

  const dotColorString = `rgb(${dotColor.r}, ${dotColor.g}, ${dotColor.b})`;

  const getDotSize = () => {
    if (style?.fontSize) {
      const fontSize = style.fontSize;
      
      if (typeof fontSize === 'number') {
        return fontSize * 1.2;
      }
      if (typeof fontSize === 'string' && fontSize.includes('px')) {
        const numValue = parseFloat(fontSize);
        return `${numValue * 1.2}px`;
      }
      if (typeof fontSize === 'string' && fontSize.includes('pt')) {
        const numValue = parseFloat(fontSize);
        return `${numValue * 1.2}pt`;
      }
      if (typeof fontSize === 'string' && fontSize.includes('em')) {
        const numValue = parseFloat(fontSize);
        return `${numValue * 1.2}em`;
      }
    }
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

