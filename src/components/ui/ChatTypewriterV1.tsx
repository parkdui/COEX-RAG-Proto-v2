'use client';

import { useEffect, useState, useRef } from 'react';

interface ChatTypewriterV1Props {
  text: string;
  speed?: number; // base speed in ms per character
  delay?: number; // ms before starting
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
  render?: (displayedText: string, isComplete: boolean, currentCursorChar?: string, dotColor?: { r: number; g: number; b: number }) => React.ReactNode;
  // Variable speed parameters
  speedVariation?: number; // percentage variation (0-1), e.g., 0.3 means ±30%
  minSpeed?: number; // minimum speed in ms
  maxSpeed?: number; // maximum speed in ms
}

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

/**
 * Version 1: Variable speed typewriter effect
 * Text appears with dynamic speed variation for each character
 */
function ChatTypewriterV1({
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
  const [dotColor, setDotColor] = useState(() => getRandomPrismColor());
  const onCompleteRef = useRef(onComplete);
  const textRef = useRef(text);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const colorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 콜백 함수를 최신으로 유지
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Dot 색상이 실시간으로 변하는 애니메이션 - prismColors에서 랜덤하게 선택
  // text가 변경될 때마다 색상 애니메이션 재시작
  useEffect(() => {
    // 이전 interval 정리
    if (colorIntervalRef.current) {
      clearInterval(colorIntervalRef.current);
      colorIntervalRef.current = null;
    }

    if (!isComplete && text.length > 0) {
      // 초기 색상 설정
      setDotColor(getRandomPrismColor());

      // 200ms마다 prismColors에서 랜덤하게 색상 변경
      colorIntervalRef.current = setInterval(() => {
        setDotColor(getRandomPrismColor());
      }, 200);

      return () => {
        if (colorIntervalRef.current) {
          clearInterval(colorIntervalRef.current);
          colorIntervalRef.current = null;
        }
      };
    } else {
      // 타이핑이 완료되거나 text가 비어있으면 색상 애니메이션 중지
      if (colorIntervalRef.current) {
        clearInterval(colorIntervalRef.current);
        colorIntervalRef.current = null;
      }
    }
  }, [isComplete, text]);

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
    return <>{render(displayedText, isComplete, undefined, dotColor)}</>;
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
            transition: 'color 0.01s ease',
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

export default ChatTypewriterV1;
export { ChatTypewriterV1 };

