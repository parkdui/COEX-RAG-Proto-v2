'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import TextPressure from './ui/TextPressure';
import Typewriter from './ui/Typewriter';
import BlobBackgroundV2 from './ui/BlobBackgroundV2';
import LetterColorAnimation from './ui/LetterColorAnimation';
import VerticalCarouselText from './ui/VerticalCarouselText';

interface LandingPageProps {
  onStart: () => void; // 이제 blob 애니메이션 시작을 트리거
  showBlob?: boolean;
}

const TITLE_VARIANT: 'v1' | 'v2' = 'v2';

// 'Sori'의 'r'이 등장했을 때를 감지하는 컴포넌트
function SoriIndexTracker({ onReachR }: { onReachR: () => void }) {
  useEffect(() => {
    // TextPressure 애니메이션: duration 2.5s + (문자 수 - 1) * 0.08s
    // "Sori"는 4글자이므로: 2.5 + 3 * 0.08 = 2.74s
    // 'r'은 인덱스 2이므로: 2 * 0.08 = 0.16s 지연
    // TextPressure는 0.05s delay 후 시작하므로 총: 0.05 + 0.16 = 0.21s
    const timer = setTimeout(() => {
      onReachR();
    }, 210);
    
    return () => clearTimeout(timer);
  }, [onReachR]);
  
  return null;
}


// 'Coex'의 'C'가 나타났을 때를 감지하는 컴포넌트
function CoexIndexTracker({ onReachC }: { onReachC: () => void }) {
  useEffect(() => {
    // TextPressure 애니메이션: duration 2.5s + (문자 수 - 1) * 0.08s
    // "Coex Guide"는 10글자이므로: 2.5 + 9 * 0.08 = 3.22s
    // 'C'는 인덱스 0이므로: 0 * 0.08 = 0s 지연
    // TextPressure는 0.05s delay 후 시작하므로 총: 0.05 + 0 = 0.05s
    const timer = setTimeout(() => {
      onReachC();
    }, 50);
    
    return () => clearTimeout(timer);
  }, [onReachC]);
  
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
  const [showSori, setShowSori] = useState(false);
  const [showSecondLine, setShowSecondLine] = useState(false);
  const [moveToBottom, setMoveToBottom] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [conversationCount, setConversationCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [hasCountingStarted, setHasCountingStarted] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [showBlobBackground, setShowBlobBackground] = useState(false);
  const [videoOpacity, setVideoOpacity] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isTitleV1 = TITLE_VARIANT === 'v1';
  const secondLineText = 'Coex Guide';

  // 오늘의 대화 횟수 가져오기
  useEffect(() => {
    // 테스트용 코드 (주석 처리)
    // setConversationCount(2);
    // setIsLoadingCount(false);
    
    const fetchConversationCount = async () => {
      try {
        const response = await fetch('/api/daily-conversation-count');
        const data = await response.json();
        setConversationCount(typeof data.count === 'number' ? data.count : 0);
      } catch (error) {
        console.error('Failed to fetch conversation count:', error);
        setConversationCount(0);
      } finally {
        setIsLoadingCount(false);
      }
    };

    fetchConversationCount();
  }, []);

  // v1: 두 번째 줄이 나타난 후 이동 처리
  useEffect(() => {
    if (!showSecondLine || isTitleV1) {
      return;
    }

    const moveTimer = window.setTimeout(() => {
      setMoveToBottom(true);
      setHasCountingStarted(true);
    }, 50);

    return () => {
      window.clearTimeout(moveTimer);
    };
  }, [showSecondLine, isTitleV1]);

  // v2: 'Sori at COEX' 애니메이션 후 이동 처리
  useEffect(() => {
    if (isTitleV1 || !showSori) {
      return;
    }

    // 'Sori at COEX'는 12글자, stagger 180ms
    // 텍스트가 충분히 표시된 후 (약 1.5초) 하단으로 이동
    const moveTimer = window.setTimeout(() => {
      setMoveToBottom(true);
      setHasCountingStarted(true);
    }, 1500);

    return () => {
      window.clearTimeout(moveTimer);
    };
  }, [showSori, isTitleV1]);

  // 비디오 메타데이터 로드 핸들러 - 비디오 크기 정보가 로드되면 즉시 올바른 위치에 표시
  const handleVideoLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      // 비디오가 올바른 크기로 설정되도록 강제
      videoRef.current.style.width = '100%';
      videoRef.current.style.height = '100%';
      // blobBackground를 비디오 시작과 함께 표시 (비디오가 위에 있어서 보이지 않다가 페이드아웃되면서 드러남)
      setShowBlobBackground(true);
    }
  }, []);

  // 비디오 시간 업데이트 핸들러 - 3.5초부터 마지막까지 opacity 페이드아웃
  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      
      // duration이 유효한 경우에만 처리
      if (duration && !isNaN(duration)) {
        const fadeStartTime = 3.5;
        const fadeEndTime = duration;
        
        if (currentTime >= fadeStartTime) {
          // 3.5초부터 duration까지 선형적으로 페이드아웃
          const fadeDuration = fadeEndTime - fadeStartTime;
          const progress = Math.min((currentTime - fadeStartTime) / fadeDuration, 1);
          const opacity = 1 - progress;
          setVideoOpacity(opacity);
        } else {
          // 3.5초 이전에는 opacity 1 유지
          setVideoOpacity(1);
        }
      }
    }
  }, []);

  // 비디오 재생 완료 핸들러
  const handleVideoEnded = useCallback(() => {
    setShowVideo(false);
    setVideoOpacity(0);
  }, []);

  const handleStartClick = useCallback(() => {
    // 페이드아웃 시작
    setIsTransitioning(true);
    // blob 애니메이션 시작
    onStart();
  }, [onStart]);

  return (
    <div 
      className={`h-screen flex flex-col safe-area-inset overscroll-none relative transition-opacity duration-500 overflow-hidden bg-transparent ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ position: 'relative' }}
    >
      {/* 초기 비디오 재생 */}
      {showVideo && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover z-50"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            minWidth: '100%',
            minHeight: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            willChange: 'transform, opacity',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitTransform: 'translateZ(0)',
            WebkitBackfaceVisibility: 'hidden',
            opacity: videoOpacity,
            transition: 'opacity 0.1s linear',
          }}
          preload="auto"
          autoPlay
          muted
          playsInline
          onLoadedMetadata={handleVideoLoadedMetadata}
          onTimeUpdate={handleVideoTimeUpdate}
          onEnded={handleVideoEnded}
        >
          <source src="/251123_opening_v2.mp4" type="video/mp4" />
        </video>
      )}
      
      {/* Blurry Blob 배경 - 2개의 gradient blob (V4/IN1 스타일) */}
      {showBlob && showBlobBackground && <BlobBackgroundV2 />}

      {/* 메인 콘텐츠 - 상단에 배치 */}
      <div 
        className="relative z-[60] flex-1 flex flex-col justify-start px-6 transition-all duration-[3000ms] ease-in-out overflow-hidden"
        style={{
          paddingTop: moveToBottom ? '20px' : '120px',
          paddingBottom: '120px', // 버튼 공간 확보
          transform: moveToBottom ? 'translateY(calc(100vh - 240px))' : 'translateY(0)',
        }}
      >
        <div className="text-left">
          {/* Welcome To */}
          <div className="text-gray-800 mb-[12px]" style={{ fontFamily: 'Pretendard Variable', fontWeight: 600, lineHeight: '90%', letterSpacing: '-0.44px', fontSize: '22px' }}>
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
          
          {/* Sori Coex Guide 타이틀 - v1: 2줄, v2: 1줄 */}
          <div>
            {isTitleV1 ? (
              <>
                {/* Version 1: Sori Coex Guide (2줄) */}
                {/* 첫 번째 줄: Sori */}
                {showSori && (
                  <div style={{ fontFamily: 'Pretendard Variable', fontWeight: 700, lineHeight: '90%', letterSpacing: '-1.8px', fontSize: '45pt' }}>
                    <LetterColorAnimation
                      text="Sori"
                      duration={6}
                      style={{ 
                        fontFamily: 'Pretendard Variable', 
                        fontWeight: 700, 
                        lineHeight: '90%', 
                        letterSpacing: '-1.8px', 
                        fontSize: '45pt'
                      }}
                    />
                    {/* 'Sori'의 'r'이 등장했을 때 두 번째 줄 시작 */}
                    {showSori && !showSecondLine && (
                      <SoriIndexTracker
                        onReachR={() => {
                          setShowSecondLine(true);
                        }}
                      />
                    )}
                  </div>
                )}
                
                {/* 두 번째 줄: Coex Guide */}
                {showSecondLine && (
                  <div style={{ minHeight: '1.2em', overflow: 'visible', lineHeight: '1em', marginBottom: '16px' }}>
                    <TextPressure
                      text={secondLineText}
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
                        // 두 번째 줄의 초기 애니메이션이 끝나면 하단으로 이동
                        setHasCountingStarted(true);
                      }}
                    />
                  </div>
                )}
                
                {/* 'Coex'의 'C'가 나타났을 때 하단으로 이동 */}
                {showSecondLine && !moveToBottom && (
                  <CoexIndexTracker
                    onReachC={() => {
                      setMoveToBottom(true);
                    }}
                  />
                )}
              </>
            ) : (
              <>
                {/* Version 2: Sori at COEX (1줄) */}
                {showSori && (
                  <div style={{ fontFamily: 'Pretendard Variable', fontWeight: 600, lineHeight: '90%', letterSpacing: '-1.8px', fontSize: '40.5pt', marginBottom: '16px' }}>
                    <div className="v2-title-container" style={{ height: '0.9em', overflow: 'visible', lineHeight: '0.9em', display: 'inline-flex', alignItems: 'flex-end' }}>
                      {/* Sori - 색상 애니메이션 적용 */}
                      <VerticalCarouselText
                        text="Sori"
                        duration={4500}
                        stagger={180}
                        enableColorAnimation={true}
                        characterClassName="vertical-carousel-v2-char"
                        className="vertical-carousel-v2"
                        style={{ 
                          fontFamily: 'Pretendard Variable', 
                          fontWeight: 600, 
                          lineHeight: '90%', 
                          letterSpacing: '-1.8px', 
                          fontSize: '40.5pt'
                        }}
                      />
                      {/* at - 색상 애니메이션 없음, black 색상 */}
                      <VerticalCarouselText
                        text="at"
                        duration={4500}
                        stagger={180}
                        enableColorAnimation={false}
                        characterClassName="vertical-carousel-v2-char"
                        className="vertical-carousel-v2"
                        style={{ 
                          fontFamily: 'Pretendard Variable', 
                          fontWeight: 600, 
                          lineHeight: '90%', 
                          letterSpacing: '-1.8px', 
                          fontSize: '40.5pt',
                          color: '#000000'
                        }}
                      />
                      {/* COEX - 색상 애니메이션 없음, black 색상 */}
                      <VerticalCarouselText
                        text="COEX"
                        duration={4500}
                        stagger={180}
                        enableColorAnimation={false}
                        characterClassName="vertical-carousel-v2-char"
                        className="vertical-carousel-v2"
                        style={{ 
                          fontFamily: 'Pretendard Variable', 
                          fontWeight: 600, 
                          lineHeight: '90%', 
                          letterSpacing: '-1.8px', 
                          fontSize: '40.5pt',
                          color: '#000000'
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 시작하기 버튼 - 화면 하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] px-6 pb-8 pt-4 safe-bottom">
        <button
          onClick={handleStartClick}
          disabled={isTransitioning || (conversationCount !== null && conversationCount + 1 >= 1000)}
          className="landing-start-btn touch-manipulation active:scale-95 disabled:opacity-50"
          style={{
            color: '#000',
            textAlign: 'center',
            fontFamily: 'Pretendard Variable',
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: '110%',
            letterSpacing: '-0.64px'
          }}
        >
          시작하기
        </button>
      </div>
      <style jsx>{`
        .landing-start-btn {
          position: relative;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          width: min(420px, 100%);
          padding: 0 clamp(20px, 5vw, 38px);
          height: clamp(52px, 10vw, 60px);
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.45);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.42) 45%, rgba(255, 255, 255, 0.18) 100%);
          box-shadow:
            0 18px 36px rgba(36, 82, 94, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(22px) saturate(1.55);
          -webkit-backdrop-filter: blur(22px) saturate(1.55);
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            background 160ms ease;
        }
        @media (max-width: 480px) {
          .landing-start-btn {
            padding: 0 clamp(18px, 12vw, 32px);
          }
        }
        .landing-start-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          border: 1px solid rgba(255, 255, 255, 0.35);
          opacity: 0;
          transition: opacity 160ms ease;
          pointer-events: none;
        }
        .landing-start-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow:
            0 24px 46px rgba(36, 82, 94, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.92);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.52) 48%, rgba(255, 255, 255, 0.26) 100%);
        }
        .landing-start-btn:not(:disabled):hover::after {
          opacity: 0.4;
        }
        .landing-start-btn:disabled {
          cursor: not-allowed;
        }
        .vertical-carousel-second-line :global(.vertical-carousel-second-line-char:not(:last-child)) {
          margin-right: -1.8px;
        }
        .vertical-carousel-first-line :global(.vertical-carousel-first-line-char:not(:last-child)) {
          margin-right: -1.8px;
        }
        .vertical-carousel-v2 :global(.vertical-carousel-v2-char:not(:last-child)) {
          margin-right: -1.8px;
        }
        .v2-title-container :global(.vertical-carousel-v2:not(:last-child)) {
          margin-right: 0.2em;
        }
      `}</style>
    </div>
  );
}
