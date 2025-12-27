'use client';

import React from 'react';

interface AnimatedOutlineStrokeProps {
  children: React.ReactNode;
  className?: string;
  borderRadius?: string;
}

/**
 * AI 답변 div에 outline stroke gradient animation을 적용하는 래퍼 컴포넌트
 * GitHub components/ver10/1.js의 modal-logic.js에서 사용된 애니메이션을 적용
 */
export default function AnimatedOutlineStroke({ children, className = '', borderRadius = 'clamp(32px, 10vw, 48px)' }: AnimatedOutlineStrokeProps) {
  return (
    <div className={`animated-outline-stroke-wrapper ${className}`} style={{ borderRadius }}>
      {children}
      <style jsx>{`
        .animated-outline-stroke-wrapper {
          position: relative;
        }

        /* v10/1: hologram-like living stroke (subtle iridescent shimmer inside the stroke) */
        .animated-outline-stroke-wrapper::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          padding: 1.5px; /* stroke thickness */
          opacity: 0.82;

          /* iridescent layers: blob-cyan base + lilac + pink, all gently moving */
          background:
            conic-gradient(from 0deg at 50% 50%,
              /* palette: blue + green + purple (green dominant) */
              rgba(43, 217, 255, 0.78) 0deg,     /* cyan */
              rgba(0, 120, 255, 0.66) 40deg,     /* blue */
              rgba(77, 255, 138, 0.90) 95deg,    /* green (dominant) */
              rgba(77, 255, 138, 0.92) 165deg,   /* green (dominant) */
              rgba(186, 152, 255, 0.74) 240deg,  /* purple */
              rgba(77, 255, 138, 0.88) 305deg,   /* green (return) */
              rgba(43, 217, 255, 0.78) 360deg),
            linear-gradient(90deg,
              rgba(255, 255, 255, 0.00) 0%,
              rgba(255, 255, 255, 0.40) 18%,
              rgba(255, 255, 255, 0.00) 36%,
              rgba(255, 255, 255, 0.34) 54%,
              rgba(255, 255, 255, 0.00) 72%,
              rgba(255, 255, 255, 0.30) 90%,
              rgba(255, 255, 255, 0.00) 100%);
          background-size: 260% 260%, 220% 220%;
          background-position: 0% 35%, 110% 50%;
          filter:
            hue-rotate(0deg)
            saturate(1.65)
            contrast(1.06)
            brightness(1.10)
            blur(0.6px)
            drop-shadow(0 0 34px rgba(77, 255, 138, 0.18));
          mix-blend-mode: screen;

          /* show only the stroke ring */
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;

          animation: v10StrokeHolo 12.5s linear infinite;
          will-change: background-position, filter, opacity;
        }

        .animated-outline-stroke-wrapper::after {
          /* subtle constant glow to anchor the stroke even when sweep is away */
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          padding: 1.5px;
          opacity: 0.62;
          background: linear-gradient(135deg,
            rgba(118, 212, 255, 0.12) 0%,
            rgba(118, 212, 255, 0.00) 55%,
            rgba(118, 212, 255, 0.12) 100%);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          filter: blur(1.0px) drop-shadow(0 0 40px rgba(77, 255, 138, 0.16));
          mix-blend-mode: screen;
          animation: v10StrokeGlow 7.8s ease-in-out infinite;
          will-change: opacity, filter;
        }

        @keyframes v10StrokeHolo {
          0% {
            background-position: 0% 35%, 110% 50%;
            filter: hue-rotate(0deg) saturate(1.65) contrast(1.06) brightness(1.08) blur(0.7px) drop-shadow(0 0 34px rgba(77, 255, 138, 0.14));
            opacity: 0.78;
          }
          50% {
            background-position: 110% 60%, -10% 45%;
            filter: hue-rotate(34deg) saturate(1.85) contrast(1.08) brightness(1.12) blur(0.7px) drop-shadow(0 0 36px rgba(77, 255, 138, 0.18));
            opacity: 1;
          }
          100% {
            background-position: 0% 35%, 110% 50%;
            filter: hue-rotate(68deg) saturate(1.70) contrast(1.06) brightness(1.10) blur(0.7px) drop-shadow(0 0 34px rgba(186, 152, 255, 0.14));
            opacity: 0.80;
          }
        }

        @keyframes v10StrokeGlow {
          0%, 100% { 
            opacity: 0.62; 
            filter: blur(1.0px) drop-shadow(0 0 14px rgba(118, 212, 255, 0.18)); 
          }
          50% { 
            opacity: 0.82; 
            filter: blur(1.0px) drop-shadow(0 0 20px rgba(118, 212, 255, 0.26)); 
          }
        }
      `}</style>
    </div>
  );
}

