'use client';

import { useEffect, useState, useRef } from 'react';

interface ChatTypewriterV3Props {
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
  // Pendulum animation parameters
  pendulumAmplitude?: number; // amplitude in pixels (default: 4px)
  pendulumSpeed?: number; // animation speed multiplier (default: 1.0)
}

/**
 * Version 3: Black circle cursor with pendulum motion (sin wave) and variable speed
 * Cursor moves up and down using sin() function for pendulum-like motion
 */
export default function ChatTypewriterV3({
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
  pendulumAmplitude = 4,
  pendulumSpeed = 1.0,
}: ChatTypewriterV3Props) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [cursorYOffset, setCursorYOffset] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const textRef = useRef(text);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Pendulum motion animation using sin() function
  useEffect(() => {
    if (!isComplete) {
      startTimeRef.current = Date.now();

      const animate = () => {
        if (isComplete) return;

        const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds
        // sin wave for pendulum motion: y = amplitude * sin(frequency * time)
        // frequency controls the speed of oscillation
        const frequency = 2 * Math.PI * pendulumSpeed; // 2π * speed gives full cycle per second at speed=1
        const yOffset = pendulumAmplitude * Math.sin(frequency * elapsed);
        setCursorYOffset(yOffset);

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    } else {
      // Reset to center when complete
      setCursorYOffset(0);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isComplete, pendulumAmplitude, pendulumSpeed]);

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
    return <>{render(displayedText, isComplete, undefined)}</>;
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
            color: '#000', // Black color
            fontSize: dotSize,
            lineHeight: 1,
            verticalAlign: 'middle',
            marginLeft: '2px',
            transform: `translateY(${cursorYOffset}px)`,
            transition: 'none', // No transition for smooth animation
          }}
        >
          ●
        </span>
      )}
    </span>
  );
}

