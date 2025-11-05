'use client';

import { useEffect, useState, useRef } from 'react';

interface BlobBackgroundProps {
  isAnimating?: boolean;
  onAnimationComplete?: () => void;
  className?: string;
}

export default function BlobBackground({ 
  isAnimating = false, 
  onAnimationComplete,
  className = '' 
}: BlobBackgroundProps) {
  const [moved, setMoved] = useState(false);
  const [arrived, setArrived] = useState(false);
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  const callbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

  // onAnimationComplete ref를 최신 값으로 업데이트
  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    // 애니메이션이 시작되지 않았고, isAnimating이 true일 때만 실행
    if (isAnimating && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setMoved(true);
      
      // 애니메이션 완료 후 콜백 호출 (원본과 동일하게 2초)
      mainTimerRef.current = setTimeout(() => {
        setArrived(true);
        // 콜백을 안정적으로 호출하기 위해 약간의 지연
        callbackTimerRef.current = setTimeout(() => {
          if (onAnimationCompleteRef.current) {
            try {
              onAnimationCompleteRef.current();
            } catch (error) {
              // 콜백 실행 중 에러는 조용히 처리
            }
          }
        }, 100);
      }, 2000);
      
      return () => {
        if (mainTimerRef.current) {
          clearTimeout(mainTimerRef.current);
          mainTimerRef.current = null;
        }
        if (callbackTimerRef.current) {
          clearTimeout(callbackTimerRef.current);
          callbackTimerRef.current = null;
        }
      };
    }
  }, [isAnimating]);

  return (
    <>
      <div 
        className={`blob-container ${moved ? 'moved' : ''} ${arrived ? 'arrived' : ''} wave-orbit ${className}`}
        style={{ 
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundColor: '#EEF6F0',
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      >
        {/* T2 스타일 블롭 2개 (위/아래) - 최적화: 불필요한 레이어 제거 */}
        <div className="t2-stage">
          <div className="t2-blob top">
            <div className="t2-flow f1" />
            <div className="t2-core" />
            <div className="t2-ring" />
          </div>
          <div className="t2-blob bottom">
            <div className="t2-flow f1" />
            <div className="t2-core" />
            <div className="t2-ring" />
          </div>
        </div>
      </div>


      <style jsx>{`
        .blob-container {
          --t2-size: 62svh;
          --meet-y: 38%;
          --s-top: 1.28;
          --s-bottom: 1.38;
          --gap: 6px;
          --blob-w: var(--t2-size);
          --r-top: calc(var(--blob-w) * var(--s-top) / 2);
          --r-bottom: calc(var(--blob-w) * var(--s-bottom) / 2);
          --offset: calc((var(--r-top) + var(--r-bottom) + var(--gap)) / 2);
        }

        /* T2 blobs */
        .t2-stage {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          pointer-events: none;
          z-index: 5;
          transform: translateZ(0);
          will-change: contents;
        }
        .t2-blob {
          position: absolute;
          left: 50%;
          width: var(--t2-size);
          height: var(--t2-size);
          transform: translate(-50%, -50%) translateZ(0) scale(1.25);
          border-radius: 50%;
          isolation: isolate;
          transition: top 1.6s cubic-bezier(0.4, 0, 1, 1), transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
          backface-visibility: hidden;
          perspective: 1000px;
        }

        .t2-blob.top { 
          top: calc(var(--meet-y) - var(--offset)); 
          transform: translate(-50%, -50%) translateZ(0) scale(var(--s-top)); 
        }
        .t2-blob.bottom { 
          top: calc(var(--meet-y) + var(--offset)); 
          transform: translate(-50%, -50%) translateZ(0) scale(var(--s-bottom)); 
        }

        .blob-container.moved .t2-blob.top { 
          top: calc(-24% - 400px); 
          transform: translate(-50%, -50%) translateZ(0) scale(1.2); 
        }
        .blob-container.moved .t2-blob.bottom { 
          top: calc(44% - 400px); 
          transform: translate(-50%, -50%) translateZ(0) scale(1.3); 
        }

        .blob-container.arrived .t2-blob.top { animation: t2PopSpringTop 520ms cubic-bezier(0.2, 0.9, 0.1, 1) both; }
        .blob-container.arrived .t2-blob.bottom { animation: t2PopSpringBottom 520ms cubic-bezier(0.2, 0.9, 0.1, 1) both; }

        /* anim variables - 최적화: 필요한 변수만 선언 */
        @property --t2-blur { syntax: '<length>'; inherits: true; initial-value: 2px; }
        @property --gX { syntax: '<percentage>'; inherits: true; initial-value: 29%; }
        @property --gY { syntax: '<percentage>'; inherits: true; initial-value: 28%; }

        .t2-blob::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(75% 75% at var(--gX) var(--gY), #C6FFB0 0%, #B4FDE5 55%, #CCF2FF 81%, #EEEFFF 100%);
          filter: blur(var(--t2-blur));
          animation: none;
          transform: translateZ(0);
        }
        /* landing blur for top blob */
        .t2-blob.top::before { --t2-blur: 30px; }
        .blob-container.moved .t2-blob::before { animation: t2BlurRise 1100ms cubic-bezier(0.4, 0, 1, 1) 0s 1 forwards; }
        .blob-container.moved .t2-blob.top::before { animation: t2BlurRiseTop 1100ms cubic-bezier(0.4, 0, 1, 1) 0s 1 forwards; }
        .blob-container.arrived .t2-blob::before { animation: t2BlurSettle 220ms ease-out 0s 1 forwards; }

        .t2-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
          background:
            radial-gradient(circle at 72% 78%,
              rgba(235, 201, 255, 0) 0 74%,
              rgba(179, 225, 255, 0.28) 82%,
              rgba(235, 201, 255, 0.55) 90%,
              rgba(255, 189, 228, 0.8) 100%
            );
          filter: blur(50px);
        }

        .t2-core { 
          position: absolute; 
          inset: 0; 
          border-radius: 50%; 
          pointer-events: none; 
          background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.16) 0%, rgba(235,201,255,0.12) 30%, rgba(255,189,228,0.08) 48%, rgba(0,0,0,0) 70%); 
          filter: blur(18px); 
          opacity: 0.14; 
          transform: scale(0.99); 
        }
        .blob-container.moved .t2-core, .blob-container.arrived .t2-core { 
          animation: t2CorePulse 2s ease-in-out infinite; 
        }
        @keyframes t2CorePulse {
          0%, 100% { opacity: 0.14; transform: scale(0.99); }
          50% { opacity: 0.20; transform: scale(1.02); }
        }

        /* directional flow overlay - 최적화: 필터 단순화 */
        .t2-flow {
          position: absolute;
          inset: -6%;
          border-radius: 50%;
          pointer-events: none;
          background: linear-gradient(90deg,
            rgba(199,125,255,0.18) 0%,
            rgba(235,201,255,0.26) 20%,
            rgba(255,189,228,0.18) 40%,
            rgba(235,201,255,0.10) 60%,
            rgba(199,125,255,0.00) 80%
          );
          filter: blur(32px);
          background-size: 300% 100%;
          background-position: 0% 50%;
          animation: flowX 2.2s linear infinite;
          opacity: 0.38;
          z-index: 1;
        }
        .t2-flow.f1 { animation-duration: 2.0s; opacity: 0.32; }
        .blob-container.moved .t2-flow { animation: flowX 1.2s linear infinite; opacity: 0.55; filter: blur(36px); }
        .blob-container.arrived .t2-flow { animation: flowX 1.4s linear infinite; opacity: 0.48; filter: blur(34px); }

        @keyframes flowX {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        /* wave mode 1: orbit hotspot (animate gradient origin) - 최적화: 애니메이션 속도 증가 */
        .blob-container.wave-orbit .t2-blob { animation: orbitHotspot 5s ease-in-out infinite; }
        @keyframes orbitHotspot {
          0%   { --gX: 26%; --gY: 28%; }
          25%  { --gX: 74%; --gY: 34%; }
          50%  { --gX: 52%; --gY: 70%; }
          75%  { --gX: 30%; --gY: 46%; }
          100% { --gX: 26%; --gY: 28%; }
        }


        /* transitions */
        @keyframes t2BlurRise { 0% { --t2-blur: 2px; } 100% { --t2-blur: 18px; } }
        @keyframes t2BlurRiseTop { 0% { --t2-blur: 30px; } 100% { --t2-blur: 18px; } }
        /* after pop: strong blur */
        @keyframes t2BlurSettle { 0% { --t2-blur: 18px; } 100% { --t2-blur: 40px; } }

        @keyframes t2PopSpringTop {
          0% { transform: translate(-50%, -50%) translateZ(0) scale(1.28); }
          62% { transform: translate(-50%, -50%) translateZ(0) scale(2.06); }
          84% { transform: translate(-50%, -50%) translateZ(0) scale(1.92); }
          100% { transform: translate(-50%, -50%) translateZ(0) scale(1.98); }
        }
        @keyframes t2PopSpringBottom {
          0% { transform: translate(-50%, -50%) translateZ(0) scale(1.38); }
          62% { transform: translate(-50%, -50%) translateZ(0) scale(2.28); }
          84% { transform: translate(-50%, -50%) translateZ(0) scale(2.14); }
          100% { transform: translate(-50%, -50%) translateZ(0) scale(2.20); }
        }

      `}</style>
    </>
  );
}
