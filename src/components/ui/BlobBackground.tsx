'use client';

import { useEffect, useRef, useState } from 'react';

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
  const arrivalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

  const clearTimers = () => {
    if (arrivalTimerRef.current) {
      clearTimeout(arrivalTimerRef.current);
      arrivalTimerRef.current = null;
    }
    if (callbackTimerRef.current) {
      clearTimeout(callbackTimerRef.current);
      callbackTimerRef.current = null;
    }
  };

  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    if (!isAnimating || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    setMoved(true);
    setArrived(false);

    arrivalTimerRef.current = setTimeout(() => {
      setArrived(true);
      callbackTimerRef.current = setTimeout(() => {
        try {
          onAnimationCompleteRef.current?.();
        } catch {
          // swallow callback errors
        }
      }, 200);
    }, 2000);

    return () => {
      clearTimers();
    };
  }, [isAnimating]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const containerClassName = [
    'coex-blob-container',
    'wave-orbit',
    moved ? 'moved' : '',
    arrived ? 'arrived' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className={containerClassName} aria-hidden>
        <div className="coex-ambient">
          <div className="coex-bg-grad" />
        </div>

        <div className="coex-t2-stage" aria-hidden>
          <div className="coex-t2-blob top">
            <div className="coex-t2-flow f1" />
            <div className="coex-t2-ripple r1" />
            <div className="coex-t2-ripple r2" />
            <div className="coex-t2-wave w1" />
            <div className="coex-t2-wave w2" />
            <div className="coex-t2-swirl s1" />
            <div className="coex-t2-caustic">
              <svg
                className="coex-t2-caustic-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                <defs>
                  <filter id="coexT2CausticTop">
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency="0.012 0.018"
                      numOctaves="3"
                      seed="2"
                      result="noise"
                    >
                      <animate
                        attributeName="baseFrequency"
                        values="0.012 0.018;0.017 0.020;0.010 0.015;0.012 0.018"
                        dur="8.4s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="seed"
                        values="2;3;4;2"
                        dur="12s"
                        repeatCount="indefinite"
                      />
                    </feTurbulence>
                    <feGaussianBlur in="noise" stdDeviation="0.45" result="blur" />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
                      result="cm"
                    />
                  </filter>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" filter="url(#coexT2CausticTop)" />
              </svg>
            </div>
            <div className="coex-t2-bloom b1" />
            <div className="coex-t2-bloom b2" />
            <div className="coex-t2-trail t1" />
            <div className="coex-t2-trail t2" />
            <div className="coex-t2-core" />
            <div className="coex-t2-ring" />
          </div>

          <div className="coex-t2-blob bottom">
            <div className="coex-t2-flow f1" />
            <div className="coex-t2-ripple r1" />
            <div className="coex-t2-ripple r2" />
            <div className="coex-t2-wave w1" />
            <div className="coex-t2-wave w2" />
            <div className="coex-t2-swirl s1" />
            <div className="coex-t2-caustic">
              <svg
                className="coex-t2-caustic-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                <defs>
                  <filter id="coexT2CausticBottom">
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency="0.011 0.016"
                      numOctaves="3"
                      seed="5"
                      result="noise"
                    >
                      <animate
                        attributeName="baseFrequency"
                        values="0.011 0.016;0.016 0.019;0.009 0.014;0.011 0.016"
                        dur="8.4s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="seed"
                        values="5;6;7;5"
                        dur="12s"
                        repeatCount="indefinite"
                      />
                    </feTurbulence>
                    <feGaussianBlur in="noise" stdDeviation="0.45" result="blur" />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
                      result="cm"
                    />
                  </filter>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" filter="url(#coexT2CausticBottom)" />
              </svg>
            </div>
            <div className="coex-t2-bloom b1" />
            <div className="coex-t2-bloom b2" />
            <div className="coex-t2-trail t1" />
            <div className="coex-t2-trail t2" />
            <div className="coex-t2-core" />
            <div className="coex-t2-ring" />
          </div>
        </div>

        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
          <defs>
            <filter id="coexT2Displace">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.008 0.012"
                numOctaves="2"
                seed="3"
                result="noise"
              >
                <animate
                  attributeName="baseFrequency"
                  values="0.008 0.012;0.012 0.016;0.006 0.010;0.008 0.012"
                  dur="6s"
                  repeatCount="indefinite"
                />
                <animate attributeName="seed" values="3;4;5;3" dur="10s" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G">
                <animate attributeName="scale" values="10;18;8;14" dur="4.8s" repeatCount="indefinite" />
              </feDisplacementMap>
            </filter>
          </defs>
        </svg>
      </div>

      <style jsx>{`
        .coex-blob-container {
          position: fixed;
          inset: 0;
          z-index: 0;
          width: 100%;
          height: 100vh;
          background: #ffffff;
          overflow: hidden;
          pointer-events: none;
          isolation: isolate;
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

        @media (max-width: 768px) {
          .coex-blob-container {
            --t2-size: 62svh;
            --gap: 5px;
          }
        }

        @media (max-width: 480px) {
          .coex-blob-container {
            --t2-size: 62svh;
            --gap: 4px;
          }
        }

        .coex-ambient {
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
        }

        .coex-bg-grad {
          position: absolute;
          inset: 0;
          opacity: 0;
          background: linear-gradient(
            to top,
            rgba(235, 201, 255, 0.22) 0%,
            rgba(244, 250, 248, 0.52) 55%,
            rgba(230, 255, 241, 0.7) 100%
          );
          transform-origin: bottom center;
          transform: translateY(25%) scaleY(0.65);
          transition: opacity 380ms ease-out;
          will-change: transform, opacity;
          backface-visibility: hidden;
        }

        .coex-blob-container.arrived .coex-bg-grad {
          opacity: 1;
          animation: bgSurge 900ms cubic-bezier(0.2, 0.9, 0.1, 1) both;
        }

        .coex-t2-stage {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          pointer-events: none;
          z-index: 5;
        }

        .coex-t2-blob {
          position: absolute;
          left: 50%;
          width: var(--t2-size);
          height: var(--t2-size);
          transform: translate(-50%, -50%) scale(1.25);
          border-radius: 50%;
          isolation: isolate;
          transition: top 1.6s cubic-bezier(0.4, 0, 1, 1), transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: top, transform;
          backface-visibility: hidden;
          transform: translateZ(0) translate(-50%, -50%) scale(1.25);
        }

        .coex-t2-trail {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
          background: radial-gradient(
            72% 72% at 48% 90%,
            rgba(184, 255, 241, 0.35) 0%,
            rgba(165, 243, 221, 0.24) 30%,
            rgba(100, 255, 175, 0.18) 60%,
            rgba(0, 0, 0, 0) 100%
          );
          filter: blur(26px) saturate(1.02);
          opacity: 0;
          z-index: 0;
          will-change: transform, opacity, filter;
        }

        .coex-blob-container.moved .coex-t2-blob .coex-t2-trail.t1 {
          animation: t2TrailFade 0.8s ease-out 0.18s 1 forwards;
        }

        .coex-blob-container.moved .coex-t2-blob .coex-t2-trail.t2 {
          animation: t2TrailFade 0.95s ease-out 0.26s 1 forwards;
        }

        .coex-t2-blob.top {
          top: calc(var(--meet-y) - var(--offset));
          transform: translate(-50%, -50%) scale(var(--s-top));
        }

        .coex-t2-blob.bottom {
          top: calc(var(--meet-y) + var(--offset));
          transform: translate(-50%, -50%) scale(var(--s-bottom));
        }

        .coex-blob-container.moved .coex-t2-blob.top {
          top: calc(-24% - 400px);
          transform: translate(-50%, -50%) scale(1.2);
        }

        .coex-blob-container.moved .coex-t2-blob.bottom {
          top: calc(44% - 400px);
          transform: translate(-50%, -50%) scale(1.3);
        }

        .coex-blob-container.arrived .coex-t2-blob.top {
          animation: t2PopSpringTop 900ms cubic-bezier(0.2, 0.8, 0.1, 1) both, t2BlobBreatheTop 6.8s ease-in-out 1900ms infinite,
            orbitHotspot 3.8s ease-in-out 2200ms infinite;
        }

        .coex-blob-container.arrived .coex-t2-blob.bottom {
          animation: t2PopSpringBottom 900ms cubic-bezier(0.2, 0.8, 0.1, 1) both, t2BlobBreatheBottom 6.8s ease-in-out 1900ms infinite,
            orbitHotspot 3.8s ease-in-out 2200ms infinite;
        }

        @property --t2-blur {
          syntax: '<length>';
          inherits: true;
          initial-value: 2px;
        }

        @property --t2-sat {
          syntax: '<number>';
          inherits: true;
          initial-value: 1;
        }

        @property --t2-bri {
          syntax: '<number>';
          inherits: true;
          initial-value: 1;
        }

        @property --t2-hue {
          syntax: '<angle>';
          inherits: true;
          initial-value: 0deg;
        }

        @property --gX {
          syntax: '<percentage>';
          inherits: true;
          initial-value: 29%;
        }

        @property --gY {
          syntax: '<percentage>';
          inherits: true;
          initial-value: 28%;
        }

        .coex-t2-blob::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(75% 75% at var(--gX) var(--gY), #c6ffb0 0%, #b4fde5 55%, #ccf2ff 81%, #eeefff 100%);
          filter: blur(var(--t2-blur)) hue-rotate(var(--t2-hue)) saturate(var(--t2-sat)) brightness(var(--t2-bri));
          animation: none;
        }

        .coex-blob-container.wave-noise .coex-t2-blob::before {
          filter: url(#coexT2Displace) blur(var(--t2-blur)) hue-rotate(var(--t2-hue)) saturate(var(--t2-sat)) brightness(var(--t2-bri));
        }

        .coex-blob-container:not(.moved) .coex-t2-blob::before {
          --t2-sat: 1.35;
          --t2-bri: 0.98;
        }

        .coex-t2-blob.top::before {
          --t2-blur: 18px;
        }

        .coex-blob-container:not(.moved) .coex-t2-blob.bottom::before {
          --t2-blur: 0px;
          filter: none;
        }

        .coex-blob-container:not(.moved) .coex-t2-blob.bottom {
          animation: orbitHotspot 6.8s ease-in-out infinite;
        }

        .coex-blob-container:not(.moved) .coex-t2-blob.bottom .coex-t2-core {
          animation: t2Breathe 3.4s ease-in-out infinite;
        }

        .coex-blob-container.moved .coex-t2-blob.top::before {
          animation: t2BlurRiseTop 1200ms ease-out 0ms 1 forwards;
        }

        .coex-blob-container.moved .coex-t2-blob.bottom::before {
          animation: t2BlurRiseBottom 1200ms ease-out 0ms 1 forwards;
        }

        .coex-blob-container.arrived .coex-t2-blob::before {
          animation: t2BlurSettle 220ms ease-out 0s 1 forwards;
        }

        .coex-blob-container.arrived .coex-t2-blob::before {
          --t2-blur: 0px;
          filter: none;
        }

        .coex-blob-container.moved .coex-t2-blob::before {
          --t2-blur: 10px;
          transition: filter 420ms ease-out, transform 420ms ease-out;
          transform: rotate(0deg);
          animation: none;
          opacity: 1;
        }

        .coex-t2-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
          background: radial-gradient(
            circle at 72% 78%,
            rgba(235, 201, 255, 0) 0 74%,
            rgba(179, 225, 255, 0.28) 82%,
            rgba(235, 201, 255, 0.55) 90%,
            rgba(255, 189, 228, 0.8) 100%
          );
          mix-blend-mode: screen;
          filter: saturate(1.3) blur(34px) drop-shadow(0 28px 44px rgba(186, 136, 255, 0.58));
        }

        .coex-blob-container.arrived .coex-t2-ring {
          filter: saturate(1.1) blur(12px);
        }

        .coex-blob-container.arrived .coex-t2-flow {
          animation: flowX 1.4s linear infinite, flowFlourish 2.6s ease-out 1100ms 1 both;
        }

        .coex-blob-container.arrived .coex-t2-bloom {
          animation: bloomPulseWide 2.4s ease-out 1200ms 2 both;
          opacity: 0.4;
        }

        .coex-blob-container.arrived .coex-t2-wave.w1 {
          opacity: 0.45;
          animation: ringTravel 1.6s ease-out 1100ms 1 both;
        }

        .coex-blob-container.arrived .coex-t2-wave.w2 {
          opacity: 0.3;
          animation: ringTravel 1.8s ease-out 1500ms 1 both;
        }

        .coex-blob-container.wave-orbit.arrived .coex-t2-blob {
          animation-duration: 2.4s;
        }

        .coex-t2-caustic {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
          mix-blend-mode: soft-light;
          opacity: 0;
          z-index: 1;
          animation: causticDrift 8s linear infinite;
          filter: saturate(1.18);
        }

        .coex-t2-caustic-svg {
          width: 100%;
          height: 100%;
          display: block;
          clip-path: circle(50% at 50% 50%);
        }

        .coex-blob-container.wave-noise .coex-t2-caustic {
          opacity: 0.5;
        }

        .coex-blob-container.moved .coex-t2-caustic {
          display: none;
          animation: none;
        }

        .coex-blob-container.moved .coex-t2-ring {
          opacity: 0;
          filter: none;
        }

        .coex-blob-container.moved .coex-t2-bloom,
        .coex-blob-container.moved .coex-t2-wave,
        .coex-blob-container.moved .coex-t2-swirl,
        .coex-blob-container.moved .coex-t2-ripple {
          opacity: 0;
          animation: none;
        }

        .coex-blob-container.wave-noise .coex-t2-flow,
        .coex-blob-container.wave-noise .coex-t2-ripple,
        .coex-blob-container.wave-noise .coex-t2-wave,
        .coex-blob-container.wave-noise .coex-t2-swirl {
          opacity: 0;
          animation: none;
        }

        @keyframes causticDrift {
          0% {
            transform: translate(0%, 0%) scale(1);
          }
          50% {
            transform: translate(-1.2%, 0.8%) scale(1.02);
          }
          100% {
            transform: translate(0%, 0%) scale(1);
          }
        }

        .coex-t2-glint {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
          z-index: 2;
        }

        .coex-t2-glint::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          width: 16%;
          height: 16%;
          border-radius: 50%;
          transform-origin: -150% -150%;
          transform: translate(-50%, -50%) rotate(0deg);
          background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.4) 35%, rgba(255, 255, 255, 0) 70%);
          filter: blur(10px) saturate(1.2);
          mix-blend-mode: soft-light;
          opacity: 0.22;
          animation: glintOrbit 3s linear infinite;
        }

        .coex-blob-container.moved .coex-t2-glint::before {
          animation-duration: 2.2s;
        }

        .coex-blob-container.arrived .coex-t2-glint {
          opacity: 0;
        }

        @keyframes glintOrbit {
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        .coex-blob-container.moved .coex-t2-glint::before {
          animation: none;
        }

        .coex-t2-core {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
          background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.16) 0%, rgba(235, 201, 255, 0.12) 30%, rgba(255, 189, 228, 0.08) 48%, rgba(0, 0, 0, 0) 70%);
          mix-blend-mode: screen;
          filter: saturate(1.06) blur(18px);
          opacity: 0.14;
          transform: scale(0.99);
        }

        .coex-blob-container.moved .coex-t2-core {
          animation: t2CorePulseStrong 1.8s ease-in-out infinite;
        }

        .coex-blob-container.arrived .coex-t2-core {
          animation: t2Breathe 3.2s ease-in-out infinite;
        }

        .coex-t2-blob,
        .coex-t2-blob::before,
        .coex-t2-flow,
        .coex-t2-core {
          will-change: transform, opacity, filter;
          backface-visibility: hidden;
        }

        .coex-t2-flow {
          position: absolute;
          inset: -6%;
          border-radius: 50%;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            rgba(199, 125, 255, 0.18) 0%,
            rgba(235, 201, 255, 0.26) 20%,
            rgba(255, 189, 228, 0.18) 40%,
            rgba(235, 201, 255, 0.1) 60%,
            rgba(199, 125, 255, 0) 80%
          );
          mix-blend-mode: screen;
          filter: blur(32px) saturate(1.2);
          background-size: 300% 100%;
          background-position: 0% 50%;
          animation: flowX 2.2s linear infinite;
          opacity: 0.38;
          z-index: 1;
        }

        .coex-t2-flow.f1 {
          animation-duration: 2s;
          opacity: 0.32;
        }

        .coex-blob-container.moved .coex-t2-flow {
          animation: flowX 1.2s linear infinite;
          opacity: 0.55;
          filter: blur(36px) saturate(1.35) brightness(1.06);
        }

        .coex-blob-container.arrived .coex-t2-flow {
          animation: flowX 1.4s linear infinite;
          opacity: 0.48;
          filter: blur(34px) saturate(1.28) brightness(1.05);
        }

        .coex-blob-container.moved .coex-t2-flow {
          animation: flowX 1.35s linear infinite;
          opacity: 0.28;
          filter: blur(22px) saturate(1.08) brightness(1.02);
        }

        @keyframes flowX {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }

        @keyframes flowFlourish {
          0% {
            opacity: 0.48;
            filter: blur(34px) saturate(1.28) brightness(1.05);
          }
          50% {
            opacity: 0.75;
            filter: blur(40px) saturate(1.55) brightness(1.1);
          }
          100% {
            opacity: 0.5;
            filter: blur(32px) saturate(1.35) brightness(1.06);
          }
        }

        .coex-blob-container.wave-orbit .coex-t2-blob {
        }

        .coex-blob-container.wave-orbit:not(.arrived) .coex-t2-blob {
        }

        @keyframes orbitHotspot {
          0% {
            --gX: 26%;
            --gY: 28%;
          }
          25% {
            --gX: 74%;
            --gY: 34%;
          }
          50% {
            --gX: 52%;
            --gY: 70%;
          }
          75% {
            --gX: 30%;
            --gY: 46%;
          }
          100% {
            --gX: 26%;
            --gY: 28%;
          }
        }

        .coex-t2-wave {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
          background: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0) 0 58%, rgba(255, 255, 255, 0.45) 60%, rgba(0, 0, 0, 0) 62%);
          opacity: 0;
          transform: scale(0.5);
          filter: blur(18px) saturate(1.15);
          z-index: 1;
        }

        .coex-blob-container.wave-ring .coex-t2-wave.w1 {
          animation: ringTravel 1.6s linear infinite;
        }

        .coex-blob-container.wave-ring .coex-t2-wave.w2 {
          animation: ringTravel 1.6s linear 0.8s infinite;
        }

        @keyframes ringTravel {
          0% {
            opacity: 0.28;
            transform: scale(0.5);
            filter: blur(18px) saturate(1.15);
          }
          70% {
            opacity: 0.12;
            transform: scale(1.5);
            filter: blur(24px) saturate(1.18);
          }
          100% {
            opacity: 0;
            transform: scale(1.85);
            filter: blur(28px) saturate(1.1);
          }
        }

        .coex-blob-container:not(.moved) .coex-t2-wave.w1 {
          opacity: 0.2;
          animation: ringTravel 2.8s ease-out infinite;
        }

        .coex-blob-container:not(.moved) .coex-t2-wave.w2 {
          opacity: 0.14;
          animation: ringTravel 2.8s ease-out 1.4s infinite;
        }

        .coex-t2-swirl {
          position: absolute;
          inset: -4%;
          border-radius: 50%;
          pointer-events: none;
          background: conic-gradient(from 0deg at 50% 50%, rgba(186, 136, 255, 0.22), rgba(235, 201, 255, 0.1), rgba(160, 255, 220, 0.18), rgba(186, 136, 255, 0.22));
          -webkit-mask-image: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 1) 0 70%, rgba(0, 0, 0, 0) 84%);
          mask-image: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 1) 0 70%, rgba(0, 0, 0, 0) 84%);
          opacity: 0;
          z-index: 1;
          transform: rotate(0deg);
        }

        .coex-blob-container.wave-swirl .coex-t2-swirl {
          opacity: 0.35;
          animation: swirlSpin 6.8s linear infinite;
        }

        .coex-t2-swirl {
          opacity: 0;
          animation: none !important;
        }

        .coex-blob-container:not(.moved) .coex-t2-blob::before {
          animation: idleSpin 8s ease-in-out infinite alternate, t2OpacityPulse 4.2s ease-in-out infinite;
          opacity: 0.5;
        }

        @keyframes idleSpin {
          0% {
            transform: rotate(1deg);
          }
          100% {
            transform: rotate(3deg);
          }
        }

        @keyframes t2OpacityPulse {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }

        .coex-blob-container.wave-hue .coex-t2-blob {
          animation: waveHue 1.15s ease-in-out infinite;
        }

        @keyframes waveHue {
          0%,
          100% {
            --t2-hue: 0deg;
            --t2-sat: 1.08;
          }
          50% {
            --t2-hue: 18deg;
            --t2-sat: 1.38;
          }
        }

        @keyframes t2BlurRise {
          0% {
            --t2-blur: 2px;
          }
          100% {
            --t2-blur: 18px;
          }
        }

        @keyframes t2BlurRiseTop {
          0% {
            --t2-blur: 30px;
          }
          100% {
            --t2-blur: 18px;
          }
        }

        @keyframes t2BlurRiseBottom {
          0% {
            --t2-blur: 0px;
          }
          100% {
            --t2-blur: 14px;
          }
        }

        @keyframes t2ColorReturn {
          0% {
            --t2-sat: 1.42;
            --t2-bri: 0.96;
          }
          100% {
            --t2-sat: 1.1;
            --t2-bri: 1.04;
          }
        }

        @keyframes t2BlurSettle {
          0% {
            --t2-blur: 18px;
          }
          100% {
            --t2-blur: 8px;
          }
        }

        @keyframes t2CorePulseStrong {
          0%,
          100% {
            opacity: 0.16;
            transform: scale(0.985);
            filter: saturate(1.12) blur(16px);
          }
          50% {
            opacity: 0.32;
            transform: scale(1.06);
            filter: saturate(1.35) blur(24px);
          }
        }

        @keyframes t2Breathe {
          0%,
          100% {
            opacity: 0.16;
            transform: scale(0.99);
            filter: saturate(1.1) blur(16px);
          }
          50% {
            opacity: 0.26;
            transform: scale(1.015);
            filter: saturate(1.18) blur(19px);
          }
        }

        .coex-t2-ripple {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
          background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.14) 12%, rgba(255, 255, 255, 0) 52%);
          mix-blend-mode: screen;
          filter: saturate(1.18) blur(16px);
          opacity: 0.18;
          transform: scale(0.78);
          animation: ripplePulse 1.8s linear infinite;
          will-change: transform, opacity, filter;
          z-index: 1;
        }

        .coex-t2-ripple.r2 {
          animation-delay: 0.8s;
        }

        @keyframes ripplePulse {
          0% {
            transform: scale(0.78);
            opacity: 0.3;
            filter: saturate(1.3) brightness(1) blur(20px);
          }
          60% {
            transform: scale(1.45);
            opacity: 0.16;
            filter: saturate(1.35) brightness(1.08) blur(24px);
          }
          100% {
            transform: scale(1.85);
            opacity: 0;
            filter: saturate(1.2) brightness(1.04) blur(28px);
          }
        }

        .coex-t2-bloom {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
          background: radial-gradient(50% 50% at var(--gX) var(--gY), rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.22) 16%, rgba(255, 255, 255, 0) 56%);
          filter: blur(10px) saturate(1.18) brightness(1.05);
          opacity: 0;
          transform: scale(0.35);
          animation: bloomPulse 1.6s ease-out infinite;
          will-change: transform, opacity, filter;
          z-index: 1;
        }

        .coex-t2-bloom.b2 {
          animation-delay: 0.8s;
        }

        .coex-blob-container.moved .coex-t2-bloom {
          animation: none;
          opacity: 0;
        }

        .coex-blob-container.arrived .coex-t2-bloom {
          animation: none;
          opacity: 0;
        }

        @keyframes bloomPulse {
          0% {
            opacity: 0.34;
            transform: scale(0.35);
            filter: blur(10px) saturate(1.18) brightness(1.06);
          }
          55% {
            opacity: 0.18;
            transform: scale(1.1);
            filter: blur(20px) saturate(1.26) brightness(1.1);
          }
          100% {
            opacity: 0;
            transform: scale(1.55);
            filter: blur(28px) saturate(1.12) brightness(1.05);
          }
        }

        @keyframes bloomPulseWide {
          0%,
          100% {
            opacity: 0.14;
            transform: scale(0.8);
            filter: blur(16px) saturate(1.2) brightness(1.06);
          }
          50% {
            opacity: 0.26;
            transform: scale(1.2);
            filter: blur(26px) saturate(1.3) brightness(1.1);
          }
        }

        @keyframes t2PopSpringTop {
          0% {
            transform: translate(-50%, -50%) scale(1.28);
          }
          70% {
            transform: translate(-50%, -50%) scale(2.06);
          }
          100% {
            transform: translate(-50%, -50%) scale(1.98);
          }
        }

        @keyframes t2PopSpringBottom {
          0% {
            transform: translate(-50%, -50%) scale(1.38);
          }
          70% {
            transform: translate(-50%, -50%) scale(2.28);
          }
          100% {
            transform: translate(-50%, -50%) scale(2.2);
          }
        }

        @keyframes t2BlobBreatheTop {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1.98);
          }
          50% {
            transform: translate(-50%, -50%) scale(2.04);
          }
        }

        @keyframes t2BlobBreatheBottom {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(2.2);
          }
          50% {
            transform: translate(-50%, -50%) scale(2.28);
          }
        }

        @keyframes t2TrailFade {
          0% {
            opacity: 0.16;
            filter: blur(20px) saturate(1.02);
            transform: translateY(8px) scale(1.01);
          }
          100% {
            opacity: 0;
            filter: blur(30px) saturate(1);
            transform: translateY(20px) scale(1.05);
          }
        }

        @keyframes bgSurge {
          0% {
            transform: translateY(25%) scaleY(0.65);
            opacity: 0;
          }
          60% {
            opacity: 0.85;
          }
          100% {
            transform: translateY(0) scaleY(1.05);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
