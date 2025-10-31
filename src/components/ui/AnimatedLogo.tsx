'use client';

import React, { useEffect, useRef } from 'react';

interface AnimatedLogoProps {
  className?: string;
}

export default function AnimatedLogo({ className = '' }: AnimatedLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const logoHeight = 47; // 각 로고 div의 높이
    const containerHeight = 53; // 외부 컨테이너 높이 (여유 포함)
    const holdDuration = 3000; // 중앙에 도착했을 때 3초 대기
    const moveDuration = 2000; // 로고가 올라가는 시간 (2초)
    const cycleHeight = logoHeight * 2; // SORI → COEX (2개 로고 높이)
    
    // 컨테이너와 로고 div 높이 차이를 고려한 offset
    // 컨테이너(53px) - 로고 div(47px) = 6px 여유
    // 이 여유를 위아래로 3px씩 분배하여 로고를 중앙에 배치
    const verticalOffset = (containerHeight - logoHeight) / 2; // 3px
    
    // 역동적인 easing 함수
    const easeInOutCubic = (t: number): number => {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    let startTime: number | null = null;
    let animationFrameId: number;
    let currentPosition = verticalOffset;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      
      const elapsed = (currentTime - startTime) / 1000; // 초 단위
      
      // 전체 사이클: hold(3초) → move(2초) → hold(3초) → move(2초) = 10초
      const totalCycleDuration = (holdDuration * 2 + moveDuration * 2) / 1000;
      const cycleProgress = (elapsed % totalCycleDuration) * 1000;
      
      let translateY: number;
      
      if (cycleProgress < holdDuration) {
        // 1단계: SORI 중앙에 3초 대기
        translateY = verticalOffset;
      } else if (cycleProgress < holdDuration + moveDuration) {
        // 2단계: SORI 올라가고 COEX 올라옴
        const moveProgress = (cycleProgress - holdDuration) / moveDuration;
        const easedProgress = easeInOutCubic(moveProgress);
        translateY = verticalOffset - easedProgress * logoHeight;
      } else if (cycleProgress < holdDuration * 2 + moveDuration) {
        // 3단계: COEX 중앙에 3초 대기
        translateY = verticalOffset - logoHeight;
      } else {
        // 4단계: COEX 올라가고 SORI 올라옴
        const moveProgress = (cycleProgress - holdDuration * 2 - moveDuration) / moveDuration;
        const easedProgress = easeInOutCubic(moveProgress);
        translateY = verticalOffset - logoHeight - easedProgress * logoHeight;
      }
      
      currentPosition = translateY;
      
      if (container) {
        container.style.transform = `translateY(${translateY}px)`;
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    // 초기 위치 설정
    container.style.transform = `translateY(${currentPosition}px)`;
    
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div 
      className={className}
      style={{
        width: '402px',
        height: '53px', // 약간 여유를 둠 (로고가 잘리지 않도록)
        padding: '0 15px',
        background: 'rgba(0, 0, 0, 0.00)',
        flexShrink: 0,
        overflow: 'hidden', // 마스크 역할
        position: 'relative',
        boxSizing: 'border-box' // 패딩 포함 크기 계산
      }}
    >
      {/* 가상의 캔버스: 무한 반복을 위한 로고 배치 */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          transition: 'none', // 애니메이션은 requestAnimationFrame으로 제어
          willChange: 'transform',
          gap: 0, // gap 제거 (로고가 붙어있도록)
          position: 'absolute',
          top: 0,
          left: '15px',
          right: '15px',
          width: 'calc(100% - 30px)' // 패딩 고려
        }}
      >
        {/* SORI 로고 (초기 중앙 위치) */}
        <div
          style={{
            width: '100%',
            height: '47px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden', // 이미지가 div 밖으로 나가지 않도록
            padding: '3px 0' // 상하 여유 공간 추가
          }}
        >
          <img 
            src="/SORI.png" 
            alt="SORI Logo"
            style={{
              maxWidth: '100%',
              maxHeight: '41px', // 패딩 고려하여 높이 제한
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
        
        {/* COEX 로고 */}
        <div
          style={{
            width: '100%',
            height: '47px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden', // 이미지가 div 밖으로 나가지 않도록
            padding: '3px 0' // 상하 여유 공간 추가
          }}
        >
          <img 
            src="/Coex CI_White 2.png" 
            alt="COEX Logo"
            style={{
              maxWidth: '100%',
              maxHeight: '41px', // 패딩 고려하여 높이 제한
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
        
        {/* SORI 로고 복제 (무한 반복용) */}
        <div
          style={{
            width: '100%',
            height: '47px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden', // 이미지가 div 밖으로 나가지 않도록
            padding: '3px 0' // 상하 여유 공간 추가
          }}
        >
          <img 
            src="/SORI.png" 
            alt="SORI Logo"
            style={{
              maxWidth: '100%',
              maxHeight: '41px', // 패딩 고려하여 높이 제한
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
        
        {/* COEX 로고 복제 (무한 반복용) */}
        <div
          style={{
            width: '100%',
            height: '47px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden', // 이미지가 div 밖으로 나가지 않도록
            padding: '3px 0' // 상하 여유 공간 추가
          }}
        >
          <img 
            src="/Coex CI_White 2.png" 
            alt="COEX Logo"
            style={{
              maxWidth: '100%',
              maxHeight: '41px', // 패딩 고려하여 높이 제한
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
      </div>
    </div>
  );
}

