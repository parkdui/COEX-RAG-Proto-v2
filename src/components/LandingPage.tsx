'use client';

import { useState, useEffect } from 'react';
import TextPressure from './ui/TextPressure';
import Typewriter from './ui/Typewriter';
import BlobBackground from './ui/BlobBackground';
import GradientText from './ui/GradientText';

interface LandingPageProps {
  onStart: () => void; // 이제 blob 애니메이션 시작을 트리거
  showBlob?: boolean;
}

// 'Sori'의 'r'이 등장했을 때를 감지하는 컴포넌트
function SoriIndexTracker({ onReachR }: { onReachR: () => void }) {
  useEffect(() => {
    // 'Sori'가 등장하면 약간의 지연 후 'r' 타이밍 계산
    // "Sori"는 4글자: S(0), o(1), r(2), i(3)
    // 'r'은 인덱스 2이므로, 전체 텍스트의 약 50% 지점
    // 약 200ms 후 두 번째 줄 시작
    const timer = setTimeout(() => {
      onReachR();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [onReachR]);
  
  return null;
}

// Gradient 애니메이션 완료를 감지하는 컴포넌트
function GradientAnimationTimer({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    // Gradient 애니메이션 1회 재생 (2.5초)
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return null;
}

// Coex Guide의 'i'가 나타났을 때를 감지하는 컴포넌트
function CoexGuideIndexTracker({ onReachIndex }: { onReachIndex: () => void }) {
  useEffect(() => {
    // TextPressure 애니메이션: duration 2.5s + (문자 수 - 1) * 0.08s
    // "Coex Guide"는 10글자이므로: 2.5 + 9 * 0.08 = 3.22s
    // 'i'는 인덱스 7이므로: 7 * 0.08 = 0.56s 지연
    // TextPressure는 0.05s delay 후 시작하므로 총: 0.05 + 0.56 = 0.61s
    const timer = setTimeout(() => {
      onReachIndex();
    }, 610);
    
    return () => clearTimeout(timer);
  }, [onReachIndex]);
  
  return null;
}

// 'Guide'의 'G'가 등장했을 때를 감지하는 컴포넌트
function GuideIndexTracker({ onReachG }: { onReachG: () => void }) {
  useEffect(() => {
    // TextPressure 애니메이션: duration 2.5s + (문자 수 - 1) * 0.08s
    // "Coex Guide"는 10글자이므로: 2.5 + 9 * 0.08 = 3.22s
    // 'G'는 인덱스 5이므로: 5 * 0.08 = 0.40s 지연
    // TextPressure는 0.05s delay 후 시작하므로 총: 0.05 + 0.40 = 0.45s
    const timer = setTimeout(() => {
      onReachG();
    }, 450);
    
    return () => clearTimeout(timer);
  }, [onReachG]);
  
  return null;
}

export default function LandingPage({ onStart, showBlob = true }: LandingPageProps) {
  const [showCounter, setShowCounter] = useState(false);
  const [showSori, setShowSori] = useState(false);
  const [showSecondLine, setShowSecondLine] = useState(false);
  const [moveToBottom, setMoveToBottom] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [soriGradientComplete, setSoriGradientComplete] = useState(false);

  const handleStartClick = () => {
    // 페이드아웃 시작
    setIsTransitioning(true);
    // blob 애니메이션 시작
    onStart();
  };

  return (
    <div 
      className={`min-h-screen flex flex-col safe-area-inset overscroll-contain relative transition-opacity duration-500 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Blurry Blob 배경 - 2개의 gradient blob (V4/IN1 스타일) */}
      {showBlob && <BlobBackground />}

      {/* 메인 콘텐츠 - 상단에 배치 */}
      <div 
        className="relative z-10 flex-1 flex flex-col justify-start px-6 pb-32 transition-all duration-[5000ms] ease-in-out"
        style={{
          paddingTop: moveToBottom ? '20px' : '80px',
          transform: moveToBottom ? 'translateY(calc(100vh - 300px))' : 'translateY(0)',
        }}
      >
        <div className="text-left">
          {/* Welcome To */}
          <div className="text-gray-800 mb-[12px]" style={{ fontFamily: 'Pretendard Variable', fontWeight: 400, lineHeight: '90%', letterSpacing: '-0.44px', fontSize: '22px' }}>
            <Typewriter
              text="Welcome To"
              speed={80}
              delay={0}
              onIndexReach={(index) => {
                // "Welcome"은 7글자이므로 index가 7에 도달하면 Sori 시작
                if (index === 7 && !showSori) {
                  setShowSori(true);
                }
              }}
              onComplete={() => {
                // "Welcome To" 완료 후 카운터 표시를 위한 콜백
              }}
            />
          </div>
          
          {/* Sori Coex Guide 타이틀 - 2줄로 분리 */}
          <div className="mb-[16px]">
            {/* 첫 번째 줄: Sori */}
            {showSori && (
              <div style={{ fontFamily: 'Pretendard Variable', fontWeight: 700, lineHeight: '90%', letterSpacing: '-1.8px', fontSize: '45pt' }}>
                {!soriGradientComplete ? (
                  <GradientText
                    colors={['#000000', '#ffffff', '#000000']}
                    animationSpeed={2.5}
                    className="sori-gradient-once"
                  >
                    <span style={{ fontWeight: 700 }}>Sori</span>
                  </GradientText>
                ) : (
                  <span style={{ color: '#000000', fontWeight: 700 }}>Sori</span>
                )}
                {/* 'Sori'의 'r'이 등장했을 때 두 번째 줄 시작 */}
                {showSori && !showSecondLine && (
                  <SoriIndexTracker
                    onReachR={() => {
                      setShowSecondLine(true);
                    }}
                  />
                )}
                {/* Gradient 애니메이션 완료 후 black으로 고정 */}
                {showSori && !soriGradientComplete && (
                  <GradientAnimationTimer
                    onComplete={() => {
                      setSoriGradientComplete(true);
                    }}
                  />
                )}
              </div>
            )}
            
            {/* 두 번째 줄: Coex Guide */}
            {showSecondLine && (
              <div>
                <TextPressure
                  text="Coex Guide"
                  trigger="auto"
                  duration={2.5}
                  loop={false}
                  style={{ 
                    fontFamily: 'Pretendard Variable', 
                    fontWeight: 700, 
                    lineHeight: '90%', 
                    letterSpacing: '-1.8px', 
                    fontSize: '45pt',
                    color: '#1f2937'
                  }}
                  onComplete={() => {
                    // 두 번째 줄의 초기 애니메이션이 끝나면 카운터 표시
                    setShowCounter(true);
                  }}
                />
              </div>
            )}
            
            {/* 'Guide'의 'G'가 등장했을 때 카운터 시작 */}
            {showSecondLine && !showCounter && (
              <GuideIndexTracker
                onReachG={() => {
                  setShowCounter(true);
                }}
              />
            )}
            
            {/* Coex Guide의 'i'가 나타났을 때 하단으로 이동 */}
            {showSecondLine && !moveToBottom && (
              <CoexGuideIndexTracker
                onReachIndex={() => {
                  setMoveToBottom(true);
                }}
              />
            )}
          </div>
          
          {/* 대화 카운터 */}
          {showCounter ? (
            <div className="text-gray-800" style={{ fontFamily: 'Pretendard Variable', fontWeight: 400, lineHeight: '90%', letterSpacing: '-0.72px', fontSize: '18px' }}>
              <Typewriter
                text="오늘 538번째로 대화하는 중이에요"
                speed={50}
                delay={200}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* 시작하기 버튼 - 화면 하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-6 pb-8 pt-4 bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm safe-bottom">
        <button
          onClick={handleStartClick}
          disabled={isTransitioning}
          className="w-full touch-manipulation active:scale-95 flex justify-center items-center disabled:opacity-50"
          style={{
            height: '56px',
            padding: '15px 85px',
            borderRadius: '68px',
            background: 'rgba(255, 255, 255, 0.21)',
            color: '#000',
            textAlign: 'center',
            fontFamily: 'Pretendard Variable',
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: '110%',
            letterSpacing: '-0.64px',
          }}
        >
          시작하기
        </button>
      </div>
    </div>
  );
}
