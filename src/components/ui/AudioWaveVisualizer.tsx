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
  const animationStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setHeights([8, 8, 8, 8]);
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

  return (
    <div
      className="relative z-50 pointer-events-none"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '12px 16px',
        background: 'transparent',
        borderRadius: '24px',
        opacity: opacity,
        transition: 'opacity 0.3s ease-in-out',
        height: '64px', // 고정 높이: 최대 bar 높이(40px) + 상하 padding(24px)
        minHeight: '64px', // 최소 높이도 동일하게 설정
        boxSizing: 'border-box', // padding 포함한 높이 계산
      }}
    >
      {heights.map((height, index) => (
        <div
          key={index}
          style={{
            width: '4px',
            height: `${height}px`,
            background: '#155e75', // '이솔이 듣고 있어요' 텍스트와 동일한 색상 (text-cyan-800)
            borderRadius: '2px',
            transition: 'none', // 애니메이션은 requestAnimationFrame으로 처리
            minHeight: '8px',
          }}
        />
      ))}
    </div>
  );
}

