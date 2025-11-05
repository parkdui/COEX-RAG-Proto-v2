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

    const logoHeight = 20; // 각 로고 div의 높이 (간격 최소화)
    const containerHeight = 20; // 외부 컨테이너 높이 (로고 하나 높이와 동일)
    const holdDuration = 3000; // 중앙에 도착했을 때 3초 대기
    const moveDuration = 2000; // 로고가 올라가는 시간 (2초)
    const cycleHeight = logoHeight * 2; // SORI → COEX (2개 로고 높이)
    
    // 컨테이너와 로고 div 높이가 동일하므로 offset 없음
    const verticalOffset = 0;
    
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
      
      // 1단계: SORI 중앙에 3초 대기 (0-3000ms)
      if (cycleProgress < holdDuration) {
        translateY = verticalOffset;
      } 
      // 2단계: SORI 올라가고 COEX 올라옴 (3000-5000ms)
      else if (cycleProgress >= holdDuration && cycleProgress <= holdDuration + moveDuration) {
        const moveProgress = Math.min((cycleProgress - holdDuration) / moveDuration, 1);
        const easedProgress = easeInOutCubic(moveProgress);
        // 0에서 -20px로 이동 (SORI 올라가고 COEX 나타남)
        translateY = verticalOffset - easedProgress * logoHeight;
      } 
      // 3단계: COEX 중앙에 3초 대기 (5000-8000ms)
      else if (cycleProgress > holdDuration + moveDuration && cycleProgress < holdDuration * 2 + moveDuration) {
        // 정확히 -20px 위치에서 고정 (COEX 대기)
        translateY = verticalOffset - logoHeight;
      } 
      // 4단계: COEX 올라가고 SORI 올라옴 (8000-10000ms)
      else {
        const moveProgress = (cycleProgress - (holdDuration * 2 + moveDuration)) / moveDuration;
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
        height: '20px', // 로고 하나 높이와 동일 (한 번에 하나만 보이도록)
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
          rowGap: 0, // 행 간격 제거
          columnGap: 0, // 열 간격 제거
          position: 'absolute',
          top: 0,
          left: '15px',
          right: '15px',
          width: 'calc(100% - 30px)', // 패딩 고려
          margin: '0',
          padding: '0',
          lineHeight: '0'
        }}
      >
        {/* SORI 로고 (초기 중앙 위치) */}
        <div
          style={{
            width: '100%',
            height: '20px', // 정확히 40px로 고정 (간격 제거)
            display: 'flex',
            alignItems: 'flex-start', // 상단 정렬 (마진 제거)
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden', // 이미지가 div 밖으로 나가지 않도록
            padding: '0', // 간격 제거
            margin: '0', // 마진 제거
            lineHeight: '0', // 텍스트 간격 제거
            border: 'none',
            outline: 'none',
            alignContent: 'flex-start' // 추가 정렬
          }}
        >
          <img 
            src="/SORI.svg" 
            alt="SORI Logo"
            style={{
              maxWidth: '100%',
              maxHeight: '20px', // 최대 높이 제한 (비율 유지 - 사용자가 좋아하는 크기)
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              margin: '0',
              padding: '0',
              lineHeight: '0',
              verticalAlign: 'top',
              border: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              alignSelf: 'flex-start', // 이미지 상단 정렬
              marginTop: '0', // 상단 마진 명시적 제거
              marginBottom: '0' // 하단 마진 명시적 제거
            }}
          />
        </div>
        
        {/* COEX 로고 */}
        <div
          style={{
            width: '100%',
            height: '20px', // 정확히 40px로 고정 (간격 제거)
            display: 'flex',
            alignItems: 'flex-start', // 상단 정렬 (마진 제거)
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden', // 이미지가 div 밖으로 나가지 않도록
            padding: '0', // 간격 제거
            margin: '0', // 마진 제거
            lineHeight: '0', // 텍스트 간격 제거
            border: 'none',
            outline: 'none',
            alignContent: 'flex-start' // 추가 정렬
          }}
        >
          <img 
            src="/Coex CI_White 2.svg" 
            alt="COEX Logo"
            style={{
              maxWidth: '100%',
              maxHeight: '40px', // 최대 높이 제한 (비율 유지 - 사용자가 좋아하는 크기)
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              margin: '0',
              padding: '0',
              lineHeight: '0',
              verticalAlign: 'top',
              border: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              alignSelf: 'flex-start', // 이미지 상단 정렬
              marginTop: '0', // 상단 마진 명시적 제거
              marginBottom: '0' // 하단 마진 명시적 제거
            }}
          />
        </div>
        
        {/* SORI 로고 복제 (무한 반복용) */}
        <div
          style={{
            width: '100%',
            height: '20px', // 정확히 40px로 고정 (간격 제거)
            display: 'flex',
            alignItems: 'flex-start', // 상단 정렬 (마진 제거)
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden', // 이미지가 div 밖으로 나가지 않도록
            padding: '0', // 간격 제거
            margin: '0', // 마진 제거
            lineHeight: '0', // 텍스트 간격 제거
            border: 'none',
            outline: 'none',
            alignContent: 'flex-start' // 추가 정렬
          }}
        >
          <img 
            src="/SORI.svg" 
            alt="SORI Logo"
            style={{
              maxWidth: '100%',
              maxHeight: '20px', // 최대 높이 제한 (비율 유지 - 사용자가 좋아하는 크기)
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              margin: '0',
              padding: '0',
              lineHeight: '0',
              verticalAlign: 'top',
              border: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              alignSelf: 'flex-start', // 이미지 상단 정렬
              marginTop: '0', // 상단 마진 명시적 제거
              marginBottom: '0' // 하단 마진 명시적 제거
            }}
          />
        </div>
        
        {/* COEX 로고 복제 (무한 반복용) */}
        <div
          style={{
            width: '100%',
            height: '20px', // 정확히 40px로 고정 (간격 제거)
            display: 'flex',
            alignItems: 'flex-start', // 상단 정렬 (마진 제거)
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden', // 이미지가 div 밖으로 나가지 않도록
            padding: '0', // 간격 제거
            margin: '0', // 마진 제거
            lineHeight: '0', // 텍스트 간격 제거
            border: 'none',
            outline: 'none',
            alignContent: 'flex-start' // 추가 정렬
          }}
        >
          <img 
            src="/Coex CI_White 2.svg" 
            alt="COEX Logo"
            style={{
              maxWidth: '100%',
              maxHeight: '20px', // 최대 높이 제한 (비율 유지 - 사용자가 좋아하는 크기)
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              margin: '0',
              padding: '0',
              lineHeight: '0',
              verticalAlign: 'top',
              border: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              alignSelf: 'flex-start', // 이미지 상단 정렬
              marginTop: '0', // 상단 마진 명시적 제거
              marginBottom: '0' // 하단 마진 명시적 제거
            }}
          />
        </div>
        
        {/* SORI 로고 복제 2 (무한 반복을 위한 마지막 - 첫 번째와 같은 위치) */}
        <div
          style={{
            width: '100%',
            height: '20px', // 정확히 40px로 고정 (간격 제거)
            display: 'flex',
            alignItems: 'flex-start', // 상단 정렬 (마진 제거)
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden', // 이미지가 div 밖으로 나가지 않도록
            padding: '0', // 간격 제거
            margin: '0', // 마진 제거
            lineHeight: '0', // 텍스트 간격 제거
            border: 'none',
            outline: 'none',
            alignContent: 'flex-start' // 추가 정렬
          }}
        >
          <img 
            src="/SORI.svg" 
            alt="SORI Logo"
            style={{
              maxWidth: '100%',
              maxHeight: '20px', // 최대 높이 제한 (비율 유지 - 사용자가 좋아하는 크기)
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              margin: '0',
              padding: '0',
              lineHeight: '0',
              verticalAlign: 'top',
              border: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              alignSelf: 'flex-start', // 이미지 상단 정렬
              marginTop: '0', // 상단 마진 명시적 제거
              marginBottom: '0' // 하단 마진 명시적 제거
            }}
          />
        </div>
      </div>
    </div>
  );
}

