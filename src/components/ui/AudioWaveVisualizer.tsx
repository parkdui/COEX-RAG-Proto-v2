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

  useEffect(() => {
    if (!isActive) {
      setHeights([8, 8, 8, 8]);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

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

  return (
    <div
      className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
      style={{
        bottom: '120px', // 입력창 위에 표시
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '24px',
      }}
    >
      {heights.map((height, index) => (
        <div
          key={index}
          style={{
            width: '4px',
            height: `${height}px`,
            background: 'linear-gradient(180deg, rgba(118, 212, 255, 0.8) 0%, rgba(77, 255, 138, 0.8) 100%)',
            borderRadius: '2px',
            transition: 'none', // 애니메이션은 requestAnimationFrame으로 처리
            minHeight: '8px',
          }}
        />
      ))}
    </div>
  );
}

