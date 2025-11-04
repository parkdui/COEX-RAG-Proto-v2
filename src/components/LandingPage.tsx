'use client';

import React, { useState } from 'react';
import GSAPSplitText from './ui/GSAPSplitText';
import TextPressure from './ui/TextPressure';
import Typewriter from './ui/Typewriter';

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [showCounter, setShowCounter] = useState(false);
  const [showSecondLine, setShowSecondLine] = useState(false);
  const [showSori, setShowSori] = useState(false);

  return (
    <div className="min-h-screen flex flex-col safe-area-inset overscroll-contain relative">
      {/* Blurry Blob 배경 */}
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0, backgroundColor: '#EEF6F0' }}>
        <div
          style={{
            position: 'absolute',
            width: '697px',
            height: '697px',
            flexShrink: 0,
            borderRadius: '697px',
            opacity: 0.85,
            background: 'radial-gradient(68.28% 68.28% at 42.04% 40.53%, #C6FFB0 0%, #50ECCA 38.04%, #D6FCFF 75.51%, #E8C9FF 91.03%, #FFFDBD 100%)',
            filter: 'blur(20px)',
            top: '35%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* 메인 콘텐츠 - 상단에 배치 */}
      <div className="relative z-10 flex-1 flex flex-col justify-start pt-20 px-6 pb-32">
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
              <div>
                <TextPressure
                  text="Sori"
                  trigger="auto"
                  duration={1.2}
                  style={{ 
                    fontFamily: 'Pretendard Variable', 
                    fontWeight: 700, 
                    lineHeight: '90%', 
                    letterSpacing: '-1.8px', 
                    fontSize: '45pt',
                    color: '#1f2937'
                  }}
                  onComplete={() => {
                    // 'Sori'의 마지막 문자 'i'의 애니메이션이 끝나면 두 번째 줄 시작
                    setShowSecondLine(true);
                  }}
                />
              </div>
            )}
            
            {/* 두 번째 줄: Coex Guide */}
            {showSecondLine && (
              <div>
                <TextPressure
                  text="Coex Guide"
                  trigger="auto"
                  duration={1.2}
                  style={{ 
                    fontFamily: 'Pretendard Variable', 
                    fontWeight: 700, 
                    lineHeight: '90%', 
                    letterSpacing: '-1.8px', 
                    fontSize: '45pt',
                    color: '#1f2937'
                  }}
                  onComplete={() => {
                    setShowCounter(true);
                  }}
                />
              </div>
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
          onClick={onStart}
          className="w-full touch-manipulation active:scale-95 flex justify-center items-center"
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
