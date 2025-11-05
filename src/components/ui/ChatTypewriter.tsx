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
  const onCompleteRef = useRef(onComplete);
  const textRef = useRef(text);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  // 콜백 함수를 최신으로 유지
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

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

  return (
    <span className={className} style={style}>
      {displayedText}
      {!isComplete && <span className="inline-block">●</span>}
    </span>
  );
}

