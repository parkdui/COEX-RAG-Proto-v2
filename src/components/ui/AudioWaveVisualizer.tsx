'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AudioWaveVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
}

export default function AudioWaveVisualizer({ stream, isActive }: AudioWaveVisualizerProps) {
  const [heights, setHeights] = useState<number[]>([8, 8, 8, 8]);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setHeights([8, 8, 8, 8]);
      setAnimationProgress(0);
      animationStartTimeRef.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // isActive가 true가 되면 애니메이션 시작
    animationStartTimeRef.current = Date.now();
    startTimeRef.current = Date.now();
    setAnimationProgress(0);

    const animate = () => {
      if (!isActive) {
        return;
      }

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      
      // 각 stroke가 차례대로 늘어났다 줄어드는 애니메이션
      // 각각 다른 위상(phase)을 가짐
      const newHeights = [0, 1, 2, 3].map((index) => {
        const phase = index * 0.3; // 각 stroke마다 0.3초씩 차이
        const cycle = (elapsed + phase) % 1.2; // 1.2초 주기
        const normalizedCycle = cycle / 1.2; // 0-1로 정규화
        
        // 0-0.5: 늘어남, 0.5-1: 줄어듦
        let height;
        if (normalizedCycle < 0.5) {
          // 0 -> 1 (늘어남)
          height = normalizedCycle * 2;
        } else {
          // 1 -> 0 (줄어듦)
          height = 1 - (normalizedCycle - 0.5) * 2;
        }
        
        // 최소 8px, 최대 40px
        return 8 + height * 32;
      });
      
      setHeights(newHeights);
      
      // 위치 이동 애니메이션 진행도 업데이트
      if (animationStartTimeRef.current) {
        const animationElapsed = (Date.now() - animationStartTimeRef.current) / 1000;
        const moveDuration = 0.6; // 이동 애니메이션 0.6초
        const progress = Math.min(animationElapsed / moveDuration, 1);
        setAnimationProgress(progress);
      }
      
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isActive]);

  if (!isActive) {
    return null;
  }

  // Fade-in 애니메이션: 0.3초
  const fadeInDuration = 0.3;
  const fadeInElapsed = animationStartTimeRef.current 
    ? Math.min((Date.now() - animationStartTimeRef.current) / 1000, fadeInDuration) 
    : 0;
  const opacity = Math.min(fadeInElapsed / fadeInDuration, 1);
  
  // 이동 애니메이션: bottom 96px -> '이솔이 듣고 있어요' 텍스트 아래 2rem 위치
  // easing 함수: ease-out
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  const easedProgress = easeOut(animationProgress);
  
  // 초기 위치: bottom 96px (120px에서 20% 위로 올림)
  // 최종 위치: '이솔이 듣고 있어요' 텍스트 아래 32px
  // '이솔이 듣고 있어요' 텍스트는 marginTop: 20vh, 텍스트 높이 약 23px
  // 텍스트 bottom = 20vh + 23px
  // sound wave top = 텍스트 bottom + 32px = 20vh + 23px + 32px = 20vh + 55px
  const initialBottom = 96; // px
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const textTopVh = 20; // '이솔이 듣고 있어요' 텍스트의 marginTop: 20vh
  const textTopPx = (textTopVh / 100) * screenHeight; // 20vh를 px로 변환
  const textHeight = 23; // 텍스트 높이 (fontSize 18px * lineHeight 130%)
  const gapPx = 32; // 32px 간격 (텍스트와 sound wave 사이)
  const finalTopPx = textTopPx + textHeight + gapPx; // 최종 위치: 20vh + 23px + 32px
  const translateY = easedProgress * (-(screenHeight - initialBottom - finalTopPx)); // px 단위

  return (
    <div
      className="fixed left-1/2 z-50 pointer-events-none"
      style={{
        bottom: animationProgress >= 1 ? 'auto' : `${initialBottom}px`,
        top: animationProgress >= 1 ? `${finalTopPx}px` : 'auto',
        transform: `translateX(-50%) translateY(${animationProgress < 1 ? `${translateY}px` : '0'})`,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '12px 16px',
        background: 'transparent',
        borderRadius: '24px',
        opacity: opacity,
        transition: animationProgress >= 1 ? 'opacity 0.3s ease-in-out' : 'none',
      }}
    >
      {heights.map((height, index) => (
        <div
          key={index}
          style={{
            width: '4px',
            height: `${height}px`,
            background: '#4E5363', // dark gray, no gradient
            borderRadius: '2px',
            transition: 'none', // 애니메이션은 requestAnimationFrame으로 처리
            minHeight: '8px',
          }}
        />
      ))}
    </div>
  );
}

