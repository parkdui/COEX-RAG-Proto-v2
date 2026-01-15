import React from 'react';

const GradualBlurSimple = ({ 
  height = '4rem', 
  bgColor = 'transparent' // 블러에 톤을 넣고 싶을 때 사용 (예: linear-gradient)
}) => {
  const step = 8; // 블러 단계 (높을수록 정교함)

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: height,
      pointerEvents: 'none',
      zIndex: 1000,
    }}>
      {Array.from({ length: step }, (_, i) => i).map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            // 점진적으로 블러와 투명도 조절
            backdropFilter: `blur(${Math.pow(2, i)}px)`,
            WebkitBackdropFilter: `blur(${Math.pow(2, i)}px)`,
            maskImage: `linear-gradient(to bottom, black ${
              (i * 100) / step
            }%, transparent ${(i + 1) * 100 / step}%)`,
            WebkitMaskImage: `linear-gradient(to bottom, black ${
              (i * 100) / step
            }%, transparent ${(i + 1) * 100 / step}%)`,
            // background는 제거하여 보라색이 보이지 않도록 함 (backdropFilter만 사용)
            background: 'none',
          }}
        />
      ))}
    </div>
  );
};

export default GradualBlurSimple;
