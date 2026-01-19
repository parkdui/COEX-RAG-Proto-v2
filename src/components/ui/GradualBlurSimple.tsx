import React from 'react';

interface GradualBlurSimpleProps {
  height?: string;
  bgColor?: string;
  opacity?: number;
}

const GradualBlurSimple = ({ 
  height = '4rem', 
  bgColor = 'transparent', // 블러에 톤을 넣고 싶을 때 사용 (예: linear-gradient)
  opacity = 1 // opacity prop 추가
}: GradualBlurSimpleProps) => {
  const step = 16; // 블러 단계를 늘려서 더 부드러운 전환 (높을수록 정교함)

  return (
    <div style={{
      position: 'fixed', // fixed로 변경하여 모든 div 위에 올라오도록
      top: 0, // 최상단부터 시작
      left: 0,
      right: 0,
      width: '100%',
      height: height,
      pointerEvents: 'none',
      zIndex: 1000, // coex logo(1001)보다 낮게 설정
      opacity: opacity,
      transition: 'opacity 0.2s ease-out',
      // 디버깅: 배경색 추가하여 렌더링 확인
      // background: 'rgba(255, 0, 0, 0.1)', // 빨간색 반투명 배경 (주석 해제하여 테스트)
    }}>
      {Array.from({ length: step }, (_, i) => i).map((layerIndex: number) => {
        // 레퍼런스처럼 각 레이어가 순차적으로 배치
        // 상단에서 완전히 가리고, 하단으로 갈수록 투명하게
        const maskStart = (layerIndex * 100) / step;
        const maskEnd = ((layerIndex + 1) * 100) / step;
        
        // blur 값: 상단에서 강하게, 하단으로 갈수록 약하게
        // 레퍼런스는 하단에서 강하게 했지만, 우리는 상단에서 강하게 해야 함
        // 따라서 역순으로 적용: 상단 레이어(i=0)가 가장 강한 blur
        const progress = layerIndex / (step - 1); // 0 (상단) ~ 1 (하단)
        
        // 상단에서 50px, 하단에서 1px로 점진적 감소
        // easeInOutCubic을 사용하여 부드러운 곡선 생성
        const t = progress;
        const eased = t < 0.5 
          ? 4 * t * t * t 
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
        
        // 상단에서 강한 blur, 하단으로 갈수록 약한 blur
        const maxBlur = 50;
        const minBlur = 1;
        const blurValue = maxBlur - (eased * (maxBlur - minBlur));
        
        // mask: 상단에서 자연스럽게 시작하도록 조정
        // 첫 번째 레이어는 상단(0%)에서 완전히 가리기 시작하여 자연스럽게 연결
        const maskGradient = layerIndex === 0 
          ? `linear-gradient(to bottom, 
              black 0%, 
              black ${maskStart}%, 
              transparent ${maskEnd}%)`
          : `linear-gradient(to bottom, 
              black ${maskStart}%, 
              transparent ${maskEnd}%)`;
        
        return (
          <div
            key={`blur-layer-${layerIndex}`}
            style={{
              position: 'absolute',
              inset: 0,
              // 점진적으로 블러 조절 (상단에서 강하게, 하단에서 약하게)
              backdropFilter: `blur(${blurValue}px)`,
              WebkitBackdropFilter: `blur(${blurValue}px)`,
              // mask-image: 상단에서 자연스럽게 시작하도록 조정
              maskImage: maskGradient,
              WebkitMaskImage: maskGradient,
              background: bgColor,
            }}
          />
        );
      })}
    </div>
  );
};

export default GradualBlurSimple;
