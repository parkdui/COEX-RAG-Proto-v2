'use client';

import React, { useState, useEffect } from 'react';

interface AnimatedLogoProps {
  className?: string;
}

export default function AnimatedLogo({ className = '' }: AnimatedLogoProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // 페이드 아웃
      setIsVisible(false);
      
      // 0.5초 후 로고 교체 및 페이드 인
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % 2);
        setIsVisible(true);
      }, 500);
    }, 3000); // 3초 간격

    return () => clearInterval(interval);
  }, []);

  const logos = [
    '/Coex CI_White 2.png',
    '/SORI.png'
  ];

  return (
    <div 
      className={`flex flex-col justify-center items-center ${className}`}
      style={{
        width: '402px',
        height: '47px',
        padding: '3px 15px',
        gap: '10px',
        background: 'rgba(0, 0, 0, 0.00)',
        flexShrink: 0
      }}
    >
      <div
        className="transition-opacity duration-500"
        style={{
          opacity: isVisible ? 1 : 0
        }}
      >
        <img 
          src={logos[currentIndex]} 
          alt={`Logo ${currentIndex + 1}`}
          style={{
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </div>
    </div>
  );
}

