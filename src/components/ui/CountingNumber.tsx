'use client';

import { useEffect, useState, useRef } from 'react';

interface CountingNumberProps {
  target: number;
  duration?: number; // 애니메이션 지속 시간 (ms)
  startDelay?: number; // 시작 지연 시간 (ms)
  className?: string;
  style?: React.CSSProperties;
  onComplete?: () => void;
  shouldStart?: boolean;
}

export default function CountingNumber({
  target,
  duration = 1500,
  startDelay = 0,
  className = '',
  style,
  onComplete,
  shouldStart = true,
}: CountingNumberProps) {
  const [current, setCurrent] = useState<number>(target > 0 ? 1 : 0);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const initialValue = target > 0 ? 1 : 0;

    // 초기화
    setCurrent(initialValue);
    setIsComplete(false);
    startTimeRef.current = null;

    if (!shouldStart) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    if (target <= 1) {
      setCurrent(initialValue);
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
        const easedValue = 1 + easeOut * (target - 1);
        const nextValue = Math.min(target, Math.floor(easedValue));

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
  }, [target, duration, startDelay, shouldStart]);

  return (
    <span className={className} style={style}>
      {current.toLocaleString()}
    </span>
  );
}

