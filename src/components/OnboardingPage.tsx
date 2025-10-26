'use client';

import React from 'react';
import Iridescence from './ui/Iridescence';
import AnimatedLogo from './ui/AnimatedLogo';
import { SplitWords } from './ui/SplitText';

interface OnboardingPageProps {
  onNext: () => void;
}

export default function OnboardingPage({ onNext }: OnboardingPageProps) {
  return (
    <div className="min-h-screen flex flex-col safe-area-inset overscroll-contain">
      {/* Iridescence 배경 */}
      <div className="fixed inset-0">
        <Iridescence 
          color={[1, 0.9, 0.95]} 
          speed={0.8} 
          amplitude={0.15}
          mouseReact={false}
        />
      </div>

      {/* 상단 상태바 */}
      <div className="relative w-full h-1 bg-black"></div>
      
      {/* 로고 */}
      <div className="relative flex justify-center pt-8 pb-4">
        <AnimatedLogo />
      </div>

      {/* 메인 콘텐츠 - 상단에 배치 */}
      <div className="relative flex-1 flex flex-col items-center justify-start pt-12 px-6 pb-32">
        {/* 환영 메시지 */}
        <div className="space-y-3" style={{ color: '#000', textAlign: 'center', fontFamily: 'Pretendard Variable', fontSize: '24px', fontWeight: 400, lineHeight: '120%', letterSpacing: '-0.96px' }}>
          <div>
            <SplitWords
              text="Hi there! I'm"
              delay={0}
              duration={1.2}
              stagger={0.08}
              animation="fadeIn"
            />
            {' '}
            <span style={{ color: '#9747FF' }}>
              <SplitWords
                text="Sori"
                delay={800}
                duration={1.2}
                stagger={0.08}
                animation="fadeIn"
              />
            </span>
            {' '}
            <span style={{ whiteSpace: 'pre' }}>👋</span>
          </div>
          <div>
            <SplitWords
              text="I'm here to help"
              delay={500}
              duration={1.2}
              stagger={0.08}
              animation="fadeIn"
            />
          </div>
          <div>
            <SplitWords
              text="with guidance at COEX today"
              delay={1000}
              duration={1.2}
              stagger={0.08}
              animation="fadeIn"
            />
          </div>
        </div>
      </div>

      {/* Next 버튼 - 화면 하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-6 pb-8 pt-4 bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm safe-bottom">
        <button
          onClick={onNext}
          className="w-full touch-manipulation active:scale-95 flex justify-center items-center"
          style={{
            height: '56px',
            padding: '15px 85px',
            borderRadius: '68px',
            background: '#E987FE',
            boxShadow: '0 0 50px 0 #EEE inset',
            color: '#000',
            textAlign: 'center',
            fontFamily: 'Pretendard Variable',
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: '110%',
            letterSpacing: '-0.64px',
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
