'use client';

import { useEffect, useRef, useState } from 'react';

interface TextPressureProps {
  text?: string;
  className?: string;
  style?: React.CSSProperties;
  duration?: number;
  trigger?: 'auto' | 'scroll';
  onComplete?: () => void;
  loop?: boolean; // 반복 애니메이션 여부
}

const TextPressure: React.FC<TextPressureProps> = ({
  text = 'Text',
  className = '',
  style,
  duration = 0.6,
  trigger = 'auto',
  onComplete,
  loop = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [startLoop, setStartLoop] = useState(false);

  useEffect(() => {
    if (trigger === 'auto') {
      setTimeout(() => setMounted(true), 50);
    } else if (trigger === 'scroll') {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setMounted(true);
          }
        },
        { threshold: 0.1 }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => {
        if (containerRef.current) {
          observer.unobserve(containerRef.current);
        }
      };
    }
  }, [trigger]);

  const chars = text.split('');
  const totalTime = duration + (chars.length - 1) * 0.08;
  const initialAnimationCompletedRef = useRef(false);

  // 초기 진입 애니메이션 완료 후 반복 애니메이션 시작
  useEffect(() => {
    if (mounted && loop && !initialAnimationCompletedRef.current) {
      const timer = setTimeout(() => {
        initialAnimationCompletedRef.current = true;
        setStartLoop(true);
        // 첫 번째 애니메이션 완료 후 onComplete 호출
        if (onComplete) {
          onComplete();
        }
      }, totalTime * 1000);
      return () => clearTimeout(timer);
    } else if (mounted && loop && initialAnimationCompletedRef.current) {
      // 이미 초기 애니메이션이 완료된 상태에서 loop가 활성화되면 즉시 반복 시작
      setStartLoop(true);
    }
  }, [mounted, loop, totalTime, onComplete]);

  // loop가 false일 때 onComplete 호출
  useEffect(() => {
    if (mounted && onComplete && !loop) {
      const timer = setTimeout(() => {
        onComplete();
      }, totalTime * 1000);
      return () => clearTimeout(timer);
    }
  }, [mounted, onComplete, totalTime, loop]);

  // 반복 애니메이션을 위한 스타일 계산
  const getAnimationStyle = (index: number) => {
    const baseDelay = index * 0.08;
    const animationDuration = duration;
    
    if (loop && startLoop) {
      // 반복 애니메이션: CSS 애니메이션 사용
      // font-weight가 700 -> 300 -> 700으로 반복되며, scale도 함께 변화
      return {
        opacity: 1,
        fontWeight: 700,
        transform: 'translateY(0)',
        animation: `textPressureLoop ${animationDuration}s cubic-bezier(0.34, 1.56, 0.64, 1) ${baseDelay}s infinite`,
      };
    } else {
      // 원래 동작: 한 번만 실행 (초기 진입 애니메이션 포함)
      // loop가 활성화된 경우 초기 애니메이션도 700으로 끝나도록
      const targetWeight = loop ? 700 : 700;
      return {
        opacity: mounted ? 1 : 0,
        fontWeight: mounted ? targetWeight : 500,
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        transition: `opacity 0.3s ${index * 0.02}s, font-weight ${duration}s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.08}s, transform ${duration}s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.08}s`
      };
    }
  };

  return (
    <div ref={containerRef} style={style}>
      <div className={className} style={{ fontFamily: 'Pretendard Variable' }}>
        {chars.map((char, index) => (
          <span
            key={index}
            className="inline-block"
            style={getAnimationStyle(index)}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TextPressure;
