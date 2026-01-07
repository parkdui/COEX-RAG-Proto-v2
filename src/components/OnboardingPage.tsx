'use client';

import { useState, useEffect } from 'react';
import { SplitText } from '@/components/ui';
import ThinkingBlob from '@/components/ui/ThinkingBlob';
import Logo from '@/components/ui/Logo';

interface OnboardingPageProps {
  onComplete: (selectedOption: string) => void;
}

const BUTTON_OPTIONS = [
  '연인과 둘이',
  '친구랑 같이',
  '가족과 함께',
  '혼자서 자유롭게',
];

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [currentStep, setCurrentStep] = useState<'greeting' | 'question' | 'selected'>('greeting');
  const [showButtons, setShowButtons] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showThinkingBlob, setShowThinkingBlob] = useState(false);
  const [greetingOpacity, setGreetingOpacity] = useState(1);
  const [questionOpacity, setQuestionOpacity] = useState(0);
  const [textAnimationComplete, setTextAnimationComplete] = useState(false);
  const [greetingAnimationComplete, setGreetingAnimationComplete] = useState(false);

  // Step 1: '안녕하세요! 저는 이솔이라고 합니다.' 등장
  // SplitText 애니메이션 완료 감지 (duration 1.2초 + stagger 0.05초 * 단어 수)
  // 대략 1.5-2초 정도로 설정
  useEffect(() => {
    const timer = setTimeout(() => {
      setGreetingAnimationComplete(true);
    }, 2000); // 텍스트 애니메이션이 완료되는 시간 (여유있게 2초)

    return () => clearTimeout(timer);
  }, []);

  // Step 2: 텍스트 애니메이션 완료 후 2초 대기, 그 다음 fade-out 시작
  useEffect(() => {
    if (greetingAnimationComplete) {
      // 2초 대기 후 fade-out 시작
      const fadeOutTimer = setTimeout(() => {
        setGreetingOpacity(0);
      }, 2000);

      // fade-out 완료 후 (0.5초) 'question' 단계로 전환하고 fade-in 시작
      const switchTimer = setTimeout(() => {
        setCurrentStep('question');
        setQuestionOpacity(1);
      }, 2500); // fade-out 0.5초 후 전환

      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(switchTimer);
      };
    }
  }, [greetingAnimationComplete]);

  // Step 2: 'question' 단계에서 0.2초 후 버튼 표시
  useEffect(() => {
    if (currentStep === 'question') {
      const timer = setTimeout(() => {
        setShowButtons(true);
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Step 3: 버튼 선택 시 처리
  const handleButtonClick = (option: string) => {
    setSelectedOption(option);
    setCurrentStep('selected');
    setShowThinkingBlob(true);
  };

  // Step 4: 텍스트 애니메이션 완료 후 3초 대기, 그 다음 MainPage로 전환
  useEffect(() => {
    if (currentStep === 'selected' && textAnimationComplete && selectedOption) {
      // 텍스트가 모두 표시된 후 3초 대기
      const timer = setTimeout(() => {
        setShowThinkingBlob(false);
        onComplete(selectedOption);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentStep, textAnimationComplete, selectedOption, onComplete]);

  // 텍스트 애니메이션 완료 시간 계산
  // SplitText의 duration(0.8초) + stagger(0.05초) * 단어 수
  // 대략 1.5초 정도로 설정 (여유있게)
  useEffect(() => {
    if (currentStep === 'selected' && selectedOption) {
      const timer = setTimeout(() => {
        setTextAnimationComplete(true);
      }, 1500); // 텍스트 애니메이션이 완료되는 시간

      return () => clearTimeout(timer);
    } else {
      setTextAnimationComplete(false);
    }
  }, [currentStep, selectedOption]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'transparent' }}>
      {/* ThinkingBlob - 선택 후에만 표시 */}
      {showThinkingBlob && (
        <ThinkingBlob isActive={true} />
      )}

      {/* 상단 COEX Logo */}
      <Logo />

      <div className="flex flex-col items-center justify-center px-6" style={{ zIndex: 10, position: 'relative', paddingTop: '50%', width: '100%', maxWidth: '100vw' }}>
        {/* Step 1 & 2: 텍스트 영역 */}
        <div 
          className="text-center mb-8"
          style={{
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: 'min(500px, 90vw)',
            position: 'relative',
          }}
        >
          {currentStep === 'greeting' && (
            <div
              style={{
                color: '#000',
                fontSize: '18px',
                letterSpacing: '-0.9px', // -5%
                fontFamily: 'Pretendard Variable',
                fontWeight: 400,
                opacity: greetingOpacity,
                transition: 'opacity 0.5s ease-in-out',
                position: 'absolute',
                width: '100%',
                padding: '0 20px',
              }}
            >
              <SplitText 
                text="안녕하세요! 저는 이솔이라고 합니다." 
                delay={0} 
                duration={1.2} 
                stagger={0.05} 
                animation="fadeIn" 
              />
            </div>
          )}

          {currentStep === 'question' && (
            <div
              style={{
                color: '#000',
                fontSize: '18px',
                letterSpacing: '-0.9px', // -5%
                fontFamily: 'Pretendard Variable',
                fontWeight: 400,
                opacity: questionOpacity,
                transition: 'opacity 0.5s ease-in-out',
                position: 'absolute',
                width: '100%',
                padding: '0 20px',
              }}
            >
              <SplitText 
                text="오늘 누구와 코엑스를 방문하셨나요?" 
                delay={0} 
                duration={0.8} 
                stagger={0.05} 
                animation="fadeIn" 
              />
            </div>
          )}

          {currentStep === 'selected' && selectedOption && (
            <div
              style={{
                color: '#000',
                fontSize: '18px',
                letterSpacing: '-0.9px', // -5%
                fontFamily: 'Pretendard Variable',
                fontWeight: 400,
                opacity: 1,
                transition: 'opacity 0.5s ease-in-out',
                whiteSpace: 'pre-line',
                width: '100%',
                padding: '0 20px',
              }}
            >
              <SplitText 
                text={`오늘 ${selectedOption} 코엑스를 방문하셨군요.\n맞춤형 안내를 생성할게요.`} 
                delay={0} 
                duration={0.8} 
                stagger={0.05} 
                animation="fadeIn" 
              />
            </div>
          )}
        </div>

        {/* Step 3: 버튼 영역 */}
        {currentStep === 'question' && showButtons && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxWidth: 'min(500px, 92vw)', // 400px -> 500px로 확대
              width: '100%',
              opacity: showButtons ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out',
              padding: '0 20px 40px 20px', // 하단 padding으로 shadow 공간 확보
              overflow: 'visible', // shadow가 잘리지 않도록
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
                  fontSize: '18px', // 18pt
                  letterSpacing: '-0.9px', // -5%
                  fontFamily: 'Pretendard Variable',
                  fontWeight: 300, // light
                  lineHeight: '130%',
                  cursor: 'pointer',
                  transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
                  textAlign: 'left',
                  animation: 'fadeInUp 0.5s ease-out 0s both',
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
                    padding: '14px 20px', // 좌우 패딩을 26px -> 20px로 축소
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center', // flex-start -> center로 변경하여 중앙 정렬
                    gap: '10px',
                    borderRadius: '30px',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.42) 45%, rgba(255, 255, 255, 0.18) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.45)',
                    boxShadow: '0 18px 36px rgba(36, 82, 94, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.88)',
                    backdropFilter: 'blur(22px) saturate(1.55)',
                    WebkitBackdropFilter: 'blur(22px) saturate(1.55)',
                    color: '#000',
                    fontSize: '18px', // 18pt
                    letterSpacing: '-0.9px', // -5%
                    fontFamily: 'Pretendard Variable',
                    fontWeight: 300, // light
                    lineHeight: '130%',
                    cursor: 'pointer',
                    transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
                    textAlign: 'center', // left -> center로 변경
                    flex: '1 1 0',
                    minWidth: 0, // flex 아이템이 축소될 수 있도록
                    whiteSpace: 'nowrap', // 줄바꿈 방지
                    animation: `fadeInUp 0.5s ease-out ${(index + 1) * 0.1}s both`,
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
                  fontSize: '18px', // 18pt
                  letterSpacing: '-0.9px', // -5%
                  fontFamily: 'Pretendard Variable',
                  fontWeight: 300, // light
                  lineHeight: '130%',
                  cursor: 'pointer',
                  transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
                  textAlign: 'left',
                  animation: 'fadeInUp 0.5s ease-out 0.3s both',
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

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

