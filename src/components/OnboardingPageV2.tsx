'use client';

import { useState, useEffect } from 'react';
import { SplitText } from '@/components/ui';
import ThinkingBlob from '@/components/ui/ThinkingBlob';
import Logo from '@/components/ui/Logo';

interface OnboardingPageV2Props {
  onComplete: (selectedOption: string) => void;
}

const BUTTON_OPTIONS = [
  '연인과 둘이',
  '친구랑 같이',
  '가족과 함께',
  '혼자서 자유롭게',
];

export default function OnboardingPageV2({ onComplete }: OnboardingPageV2Props) {
  const [showButtons, setShowButtons] = useState(false);
  const [buttonOpacity, setButtonOpacity] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showThinkingBlob, setShowThinkingBlob] = useState(false);
  const [textAnimationComplete, setTextAnimationComplete] = useState(false);

  // 컴포넌트 마운트 시 버튼 fade-in 시작
  useEffect(() => {
    // 약간의 지연 후 버튼 표시 및 fade-in 시작
    const timer = setTimeout(() => {
      setShowButtons(true);
      // fade-in 시작
      setTimeout(() => {
        setButtonOpacity(1);
      }, 50);
    }, 300); // 0.3초 후 버튼 표시 시작

    return () => clearTimeout(timer);
  }, []);

  // 버튼 선택 시 처리
  const handleButtonClick = (option: string) => {
    setSelectedOption(option);
    setShowThinkingBlob(true);
  };

  // 텍스트 애니메이션 완료 시간 계산
  // SplitText의 duration(0.8초) + stagger(0.05초) * 단어 수
  // 대략 1.5초 정도로 설정 (여유있게)
  useEffect(() => {
    if (selectedOption) {
      const timer = setTimeout(() => {
        setTextAnimationComplete(true);
      }, 1500); // 텍스트 애니메이션이 완료되는 시간

      return () => clearTimeout(timer);
    } else {
      setTextAnimationComplete(false);
    }
  }, [selectedOption]);

  // 텍스트 애니메이션 완료 후 3초 대기, 그 다음 MainPage로 전환
  useEffect(() => {
    if (textAnimationComplete && selectedOption) {
      // 텍스트가 모두 표시된 후 3초 대기
      const timer = setTimeout(() => {
        setShowThinkingBlob(false);
        onComplete(selectedOption);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [textAnimationComplete, selectedOption, onComplete]);

  return (
    <div className="h-screen flex flex-col safe-area-inset overscroll-none relative overflow-hidden bg-transparent" style={{ position: 'relative' }}>
      {/* ThinkingBlob - 선택 후에만 표시 */}
      {showThinkingBlob && (
        <ThinkingBlob isActive={true} />
      )}

      {/* 상단 COEX Logo */}
      <Logo />

      {/* LandingPageV2와 동일한 레이아웃 구조 */}
      <div 
        className="relative flex-1 flex flex-col justify-start px-6 transition-all duration-[3000ms] ease-in-out overflow-hidden"
        style={{
          zIndex: 60,
          paddingTop: '20px',
          paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px) + 60px)',
        }}
      >
        {/* 타이틀 영역 컨테이너 (LandingPageV2와 동일한 구조) */}
        <div 
          className="text-left"
          style={{
            position: 'relative',
            minHeight: 'auto',
          }}
        >
          {!selectedOption ? (
            <div 
              className="text-left"
              style={{
                position: 'relative',
                opacity: 1,
                color: 'black',
                fontSize: '24px',
                fontFamily: 'Pretendard Variable',
                fontWeight: 400,
                textTransform: 'capitalize',
                lineHeight: '140%',
                wordWrap: 'break-word',
                letterSpacing: '-0.96px',
              }}
            >
              <div style={{ marginBottom: '4px' }}>
                안녕하세요, 이솔입니다.<br />오늘 누구와 코엑스에 방문하셨나요?
              </div>
            </div>
          ) : (
            <div 
              className="text-left"
              style={{
                position: 'relative',
                opacity: 1,
                transition: 'opacity 0.5s ease-in-out',
                color: 'black',
                fontSize: '24px',
                fontFamily: 'Pretendard Variable',
                fontWeight: 400,
                textTransform: 'capitalize',
                lineHeight: '140%',
                wordWrap: 'break-word',
                letterSpacing: '-0.96px',
                whiteSpace: 'pre-line',
              }}
            >
              <SplitText 
                text={`${selectedOption} 방문하셨군요.\n맞춤형 안내를 생성할게요.`} 
                delay={0} 
                duration={0.8} 
                stagger={0.05} 
                animation="fadeIn" 
              />
            </div>
          )}
        </div>

        {/* 버튼 영역 (텍스트 아래에 배치) */}
        {showButtons && !selectedOption && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxWidth: 'min(500px, 92vw)',
              width: '100%',
              opacity: buttonOpacity,
              transition: 'opacity 0.8s ease-in-out',
              padding: '32px 0 40px 0',
              overflow: 'visible',
              marginTop: '0',
            }}
          >
            {/* 첫 번째 줄: '연인과 둘이' */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                key={BUTTON_OPTIONS[0]}
                onClick={() => handleButtonClick(BUTTON_OPTIONS[0])}
                className="touch-manipulation active:scale-95"
                style={{
                  display: 'inline-flex',
                  padding: '14px 26px',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  gap: '10px',
                  borderRadius: '30px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.42) 45%, rgba(255, 255, 255, 0.18) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                  boxShadow: '0 18px 36px rgba(36, 82, 94, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.88)',
                  backdropFilter: 'blur(22px) saturate(1.55)',
                  WebkitBackdropFilter: 'blur(22px) saturate(1.55)',
                  color: '#000',
                  fontSize: '18px',
                  letterSpacing: '-0.9px',
                  fontFamily: 'Pretendard Variable',
                  fontWeight: 300,
                  lineHeight: '130%',
                  cursor: 'pointer',
                  transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 24px 46px rgba(36, 82, 94, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.92)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.52) 48%, rgba(255, 255, 255, 0.26) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 18px 36px rgba(36, 82, 94, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.88)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.42) 45%, rgba(255, 255, 255, 0.18) 100%)';
                }}
              >
                {BUTTON_OPTIONS[0]}
              </button>
            </div>

            {/* 두 번째 줄: '친구랑 같이', '가족과 함께' */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', width: '100%' }}>
              {[BUTTON_OPTIONS[1], BUTTON_OPTIONS[2]].map((option, index) => (
                <button
                  key={option}
                  onClick={() => handleButtonClick(option)}
                  className="touch-manipulation active:scale-95"
                  style={{
                    display: 'inline-flex',
                    padding: '14px 20px',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    borderRadius: '30px',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.42) 45%, rgba(255, 255, 255, 0.18) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.45)',
                    boxShadow: '0 18px 36px rgba(36, 82, 94, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.88)',
                    backdropFilter: 'blur(22px) saturate(1.55)',
                    WebkitBackdropFilter: 'blur(22px) saturate(1.55)',
                    color: '#000',
                    fontSize: '18px',
                    letterSpacing: '-0.9px',
                    fontFamily: 'Pretendard Variable',
                    fontWeight: 300,
                    lineHeight: '130%',
                    cursor: 'pointer',
                    transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
                    textAlign: 'center',
                    flex: '1 1 0',
                    minWidth: 0,
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 24px 46px rgba(36, 82, 94, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.92)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.52) 48%, rgba(255, 255, 255, 0.26) 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 18px 36px rgba(36, 82, 94, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.88)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.42) 45%, rgba(255, 255, 255, 0.18) 100%)';
                  }}
                >
                  {option}
                </button>
              ))}
            </div>

            {/* 세 번째 줄: '혼자서 자유롭게' */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                key={BUTTON_OPTIONS[3]}
                onClick={() => handleButtonClick(BUTTON_OPTIONS[3])}
                className="touch-manipulation active:scale-95"
                style={{
                  display: 'inline-flex',
                  padding: '14px 26px',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  gap: '10px',
                  borderRadius: '30px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.42) 45%, rgba(255, 255, 255, 0.18) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                  boxShadow: '0 18px 36px rgba(36, 82, 94, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.88)',
                  backdropFilter: 'blur(22px) saturate(1.55)',
                  WebkitBackdropFilter: 'blur(22px) saturate(1.55)',
                  color: '#000',
                  fontSize: '18px',
                  letterSpacing: '-0.9px',
                  fontFamily: 'Pretendard Variable',
                  fontWeight: 300,
                  lineHeight: '130%',
                  cursor: 'pointer',
                  transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 24px 46px rgba(36, 82, 94, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.92)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.52) 48%, rgba(255, 255, 255, 0.26) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 18px 36px rgba(36, 82, 94, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.88)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.42) 45%, rgba(255, 255, 255, 0.18) 100%)';
                }}
              >
                {BUTTON_OPTIONS[3]}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
