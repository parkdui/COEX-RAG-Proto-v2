'use client';

import { useEffect, useRef, useState } from 'react';

interface TextPressureProps {
  text?: string;
  className?: string;
  style?: React.CSSProperties;
  duration?: number;
  trigger?: 'auto' | 'scroll';
  onComplete?: () => void;
}

const TextPressure: React.FC<TextPressureProps> = ({
  text = 'Text',
  className = '',
  style,
  duration = 0.6,
  trigger = 'auto',
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    if (mounted && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, totalTime * 1000);
      return () => clearTimeout(timer);
    }
  }, [mounted, onComplete, totalTime]);

  return (
    <div ref={containerRef} style={style}>
      <div className={className} style={{ fontFamily: 'Pretendard Variable' }}>
        {chars.map((char, index) => (
          <span
            key={index}
            className="inline-block"
            style={{
              opacity: mounted ? 1 : 0,
              fontWeight: mounted ? 700 : 500,
              transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
              transition: `opacity 0.3s ${index * 0.02}s, font-weight ${duration}s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.08}s, transform ${duration}s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.08}s`
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TextPressure;
