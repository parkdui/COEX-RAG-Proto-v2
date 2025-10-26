'use client';

import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

export interface TextPressureProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  duration?: number;
  trigger?: 'auto' | 'scroll';
  onComplete?: () => void;
}

const TextPressure: React.FC<TextPressureProps> = ({
  text,
  className = '',
  style,
  duration = 0.6,
  trigger = 'auto',
  onComplete,
}) => {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      if (!ref.current || !text) return;

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
        type: 'words',
        reduceWhiteSpace: true,
      });

      const words = splitInstance.words;

      gsap.fromTo(
        words,
        { 
          opacity: 0,
          scale: 0,
        },
        {
          opacity: 1,
          scale: 1,
          duration,
          stagger: 0.05,
          ease: 'back.out(1.5)',
          scrollTrigger: trigger === 'scroll' ? {
            trigger: el,
            start: 'top 80%',
            once: true,
          } : undefined,
          force3D: true,
        }
      );

      // 전체 애니메이션이 완료된 후에만 onComplete 호출
      if (onComplete && words.length > 0) {
        const lastIndex = words.length - 1;
        const lastWordDelay = lastIndex * 0.05;
        const lastWordDuration = duration;
        
        setTimeout(() => {
          onComplete();
        }, (lastWordDelay + lastWordDuration) * 1000);
      }

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
      dependencies: [text, duration, trigger, onComplete],
      scope: ref
    }
  );

  return (
    <p ref={ref} className={className} style={style}>
      {text}
    </p>
  );
};

export default TextPressure;

