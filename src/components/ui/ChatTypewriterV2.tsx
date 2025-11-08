'use client';

import { useEffect, useState, useRef } from 'react';

interface ChatTypewriterV2Props {
  text: string;
  speed?: number; // base speed in ms per character
  delay?: number; // ms before starting
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
  render?: (displayedText: string, isComplete: boolean, currentCursorChar?: string) => React.ReactNode;
  // Variable speed parameters
  speedVariation?: number;
  minSpeed?: number;
  maxSpeed?: number;
  // Character change interval
  characterChangeInterval?: number; // ms between character changes
}

/**
 * Version 2: Random character cursor with variable speed
 * Cursor character changes randomly from a pool of symbols, color is fixed to black
 */
export default function ChatTypewriterV2({
  text,
  speed = 50,
  delay = 0,
  onComplete,
  className = '',
  style,
  render,
  speedVariation = 0.3,
  minSpeed = 20,
  maxSpeed = 100,
  characterChangeInterval = 200,
}: ChatTypewriterV2Props) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [currentCursorChar, setCurrentCursorChar] = useState('●');
  const onCompleteRef = useRef(onComplete);
  const textRef = useRef(text);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const characterIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 다양한 cursor character 풀 (이미지에 있는 character들)
  const cursorCharacters = [
    '●', // large solid circle
    '○', // outline circle
    '◯', // thin outline circle
    '◉', // circle with dot
    '◎', // circle with dot (thick)
    '◆', // solid diamond
    '◇', // outline diamond
    '◈', // diamond with center
    '★', // solid star
    '☆', // outline star
    '✦', // sparkle
    '✧', // sparkle outline
    '✓', // checkmark
    '✗', // x mark
    '■', // solid square
    '□', // outline square
    '▪', // small solid square
    '▫', // small outline square
    '→', // right arrow
    '←', // left arrow
    '↑', // up arrow
    '↓', // down arrow
    '↔', // double arrow
    '•', // bullet
    '◦', // white bullet
    '◊', // lozenge
    '◐', // circle left half
    '◑', // circle right half
    '◒', // circle lower half
    '◓', // circle upper half
  ];

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Cursor character가 실시간으로 랜덤하게 변경
  useEffect(() => {
    if (!isComplete) {
      // 초기 character 설정
      setCurrentCursorChar(cursorCharacters[Math.floor(Math.random() * cursorCharacters.length)]);

      // 주기적으로 character 변경
      characterIntervalRef.current = setInterval(() => {
        const randomChar = cursorCharacters[Math.floor(Math.random() * cursorCharacters.length)];
        setCurrentCursorChar(randomChar);
      }, characterChangeInterval);

      return () => {
        if (characterIntervalRef.current) {
          clearInterval(characterIntervalRef.current);
          characterIntervalRef.current = null;
        }
      };
    } else {
      if (characterIntervalRef.current) {
        clearInterval(characterIntervalRef.current);
        characterIntervalRef.current = null;
      }
    }
  }, [isComplete, characterChangeInterval]);

  // Variable speed 계산 함수
  const getVariableSpeed = (): number => {
    const variation = (Math.random() * 2 - 1) * speedVariation;
    const variableSpeed = speed * (1 + variation);
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
    return <>{render(displayedText, isComplete, currentCursorChar)}</>;
  }

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
            color: '#000', // Black color fixed
            fontSize: dotSize,
            lineHeight: 1,
            verticalAlign: 'middle',
            marginLeft: '2px',
            transition: 'none', // No color transition since it's fixed to black
          }}
        >
          {currentCursorChar}
        </span>
      )}
    </span>
  );
}

