'use client';

interface LetterColorAnimationProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  duration?: number; // 전체 애니메이션 지속 시간 (초)
}

/**
 * 각 글자마다 다른 색상 애니메이션을 적용하는 컴포넌트
 * 모든 글자의 애니메이션은 동일: #000 → #fff → #000 (그 후 #000이 3초 더 지속)
 * 초기 시작 색상만 다름: S(#000), o(#333), r(#666), i(#000)
 * 6초 간격으로 반복, 자연스러운 그라데이션 효과
 */
export default function LetterColorAnimation({
  text,
  className = '',
  style,
  duration = 6, // #000 유지 시간을 포함하여 6초로 변경
}: LetterColorAnimationProps) {
  const chars = text.split('');

  const getLetterStyle = (index: number): React.CSSProperties => {
    // S: 0, o: 1, r: 2, i: 3 패턴을 반복
    // 순차적으로 애니메이션되도록 각 글자에 0.1초 간격으로 delay 추가
    const sequentialDelay = index * 0.1; // 각 글자마다 0.1초씩 지연 (S: 0s, o: 0.1s, r: 0.2s, i: 0.3s)
    
    // 초기 색상 설정 (4글자 패턴 반복)
    const initialColors = ['#000000', '#333333', '#666666', '#000000'];
    const animationNames = ['soriLetterColorS', 'soriLetterColorO', 'soriLetterColorR', 'soriLetterColorI'];
    
    // 인덱스를 4로 나눈 나머지로 패턴 반복
    const patternIndex = index % 4;
    
    // 각 글자는 초기 색상에서 시작하지만, 모두 #000 → #fff → #000 패턴을 따름
    return {
      display: 'inline-block',
      color: initialColors[patternIndex],
      animation: `${animationNames[patternIndex]} ${duration}s ease-in-out ${sequentialDelay}s infinite`,
    };
  };

  return (
    <div className={className} style={style}>
      {chars.map((char, index) => (
        <span key={`${char}-${index}`} style={getLetterStyle(index)}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </div>
  );
}

