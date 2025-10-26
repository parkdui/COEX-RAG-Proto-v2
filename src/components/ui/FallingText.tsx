'use client';

import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

export interface FallingTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  duration?: number;
  speed?: number;
  trigger?: 'auto' | 'scroll';
  onComplete?: () => void;
}

const FallingText: React.FC<FallingTextProps> = ({
  text,
  className = '',
  style,
  delay = 30,
  duration = 0.6,
  speed = 1,
  trigger = 'auto',
  onComplete
}) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (trigger === 'auto') {
      setIsReady(true);
    }
  }, [trigger]);

  useGSAP(
    () => {
      if (!ref.current || !text || (trigger === 'auto' && !isReady)) return;

      const el = ref.current as HTMLElement & {
        _rbsplitInstance?: GSAPSplitText;
      };

      if (el._rbsplitInstance) {
        try {
          el._rbsplitInstance.revert();
        } catch (_) {}
        el._rbsplitInstance = undefined;
      }

      const splitInstance = new GSAPSplitText(el, {
        type: 'words,chars',
        reduceWhiteSpace: true,
      });

      const chars = splitInstance.chars;
      const words = splitInstance.words;

      // Split into lines for falling effect
      const lines = splitInstance.lines;

      gsap.fromTo(
        chars,
        { 
          opacity: 0, 
          y: -20,
          rotationX: 90
        },
        {
          opacity: 1,
          y: 0,
          rotationX: 0,
          duration,
          delay,
          stagger: delay / 1000 / chars.length,
          ease: 'power4.out',
          scrollTrigger: trigger === 'scroll' ? {
            trigger: el,
            start: 'top 80%',
            once: true,
          } : undefined,
          onComplete: () => {
            if (onComplete) {
              setTimeout(onComplete, 100);
            }
          },
          force3D: true,
        }
      );

      el._rbsplitInstance = splitInstance;

      return () => {
        if (trigger === 'scroll') {
          ScrollTrigger.getAll().forEach(st => {
            if (st.trigger === el) st.kill();
          });
        }
        try {
          splitInstance.revert();
        } catch (_) {}
        el._rbsplitInstance = undefined;
      };
    },
    {
      dependencies: [text, delay, duration, speed, trigger, isReady, onComplete],
      scope: ref
    }
  );

  return (
    <p ref={ref} className={className} style={style}>
      {text}
    </p>
  );
};

export default FallingText;

