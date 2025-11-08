'use client';

import { useEffect, useState, useRef } from 'react';

interface CountingNumberProps {
  target: number;
  duration?: number; // 애니메이션 지속 시간 (ms)
  startDelay?: number; // 시작 지연 시간 (ms)
  className?: string;
  style?: React.CSSProperties;
  onComplete?: () => void;
}

export default function CountingNumber({
  target,
  duration = 1500,
  startDelay = 0,
  className = '',
  style,
  onComplete,
}: CountingNumberProps) {
  const [current, setCurrent] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // 초기화
    setCurrent(0);
    setIsComplete(false);
    startTimeRef.current = null;

    if (target === 0) {
      setIsComplete(true);
      onCompleteRef.current?.();
      return;
    }

    const startAnimation = () => {
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const nextValue = Math.floor(easeOut * target);

        setCurrent(nextValue);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setCurrent(target);
          setIsComplete(true);
          onCompleteRef.current?.();
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (startDelay > 0) {
      const delayTimeout = setTimeout(startAnimation, startDelay);
      return () => {
        clearTimeout(delayTimeout);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      startAnimation();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [target, duration, startDelay]);

  return (
    <span className={className} style={style}>
      {current.toLocaleString()}
    </span>
  );
}

