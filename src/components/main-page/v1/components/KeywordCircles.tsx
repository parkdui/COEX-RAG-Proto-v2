'use client';

import React from 'react';

interface KeywordCirclesProps {
  keywords: string[];
  onKeywordClick: (keyword: string) => void;
  circleAnimationOffsets: number[];
  isKeywordsAnimatingOut: boolean;
}

export const KeywordCircles: React.FC<KeywordCirclesProps> = ({
  keywords,
  onKeywordClick,
  circleAnimationOffsets,
  isKeywordsAnimatingOut,
}) => {
  const getZigZagPosition = (idx: number) => {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    
    const startTop = 20;
    const startLeft = 35;
    const rightLeft = 65;
    const verticalSpacing = 20;
    
    const isEvenRow = row % 2 === 0;
    const leftPercent = isEvenRow 
      ? (col === 0 ? startLeft : rightLeft)
      : (col === 0 ? rightLeft : startLeft);
    
    const isRightColumn = isEvenRow 
      ? col === 1 
      : col === 0;
    const rightColumnOffset = isRightColumn ? 9 : 0;
    
    // 고정 offset 적용 (퍼센트 단위)
    // left column: -2%, right column: +2%
    const fixedOffset = isRightColumn ? 2 : -2;
    
    return {
      topPercent: startTop + (row * verticalSpacing) + rightColumnOffset,
      leftPercent: leftPercent + fixedOffset,
    };
  };

  return (
    <>
      {keywords.map((keyword, index) => {
        const displayKeyword = keyword.includes(',') 
          ? keyword.split(',')[0].trim() 
          : keyword;
        
        const estimatedWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
        const widthScale = estimatedWidth < 400 
          ? Math.max(0.7, estimatedWidth / 400) 
          : 1;
        
        const baseSize = 120;
        const ellipseSize = baseSize * 1.2 * widthScale;
        const padding = Math.max(8, ellipseSize * 0.25);
        
        const { topPercent, leftPercent } = getZigZagPosition(index);
        const animationOffset = circleAnimationOffsets[index] || 0;
        
        return (
          <div
            key={index}
            className="absolute cursor-pointer"
            onClick={() => onKeywordClick(keyword)}
            style={{
              top: `${topPercent}vh`,
              left: `${leftPercent}%`,
              width: `${ellipseSize}px`,
              height: `${ellipseSize}px`,
              borderRadius: '297px',
              opacity: isKeywordsAnimatingOut ? 0 : 0.65,
              background: 'radial-gradient(50% 50% at 50% 50%, #DEE6FF 43.75%, #FFF 65.87%, rgba(255, 255, 255, 0.61) 100%)',
              boxShadow: '0 -14px 20px 0 #FFEFFC, 0 20px 20px 0 #CBD7F3, 0 4px 100px 0 #CFE9FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              transform: isKeywordsAnimatingOut 
                ? `translate(-50%, calc(-50% - ${topPercent + 50}vh))` 
                : `translate(-50%, calc(-50% + ${animationOffset}px))`,
              transition: isKeywordsAnimatingOut 
                ? `transform 0.8s ease-out ${index * 0.1}s, opacity 0.8s ease-out ${index * 0.1}s` 
                : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isKeywordsAnimatingOut) {
                e.currentTarget.style.transform = `translate(-50%, calc(-50% + ${animationOffset}px)) scale(1.05)`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isKeywordsAnimatingOut) {
                e.currentTarget.style.transform = `translate(-50%, calc(-50% + ${animationOffset}px)) scale(1)`;
              }
            }}
          >
            <span
              style={{
                fontFamily: 'Pretendard Variable',
                fontSize: '15px',
                fontWeight: 500,
                letterSpacing: '-0.36px',
                color: '#000',
                textAlign: 'center',
                lineHeight: '1.4',
                padding: `${padding}px`,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {displayKeyword}
            </span>
          </div>
        );
      })}
    </>
  );
};

