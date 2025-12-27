'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import TextPressure from './ui/TextPressure';
import Typewriter from './ui/Typewriter';
import BlobBackgroundV2 from './ui/BlobBackgroundV2';
import LetterColorAnimation from './ui/LetterColorAnimation';
import VerticalCarouselText from './ui/VerticalCarouselText';

interface LandingPageProps {
  onStart: () => void;
  showBlob?: boolean;
}

const TITLE_VARIANT: 'v1' | 'v2' = 'v2';

function SoriIndexTracker({ onReachR }: { onReachR: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onReachR();
    }, 210);
    
    return () => clearTimeout(timer);
  }, [onReachR]);
  
  return null;
}

function CoexIndexTracker({ onReachC }: { onReachC: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onReachC();
    }, 50);
    
    return () => clearTimeout(timer);
  }, [onReachC]);
  
  return null;
}

function GuideIndexTracker({ onReachG }: { onReachG: () => void }) {
  useEffect(() => {
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

  useEffect(() => {
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

  const handleVideoLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.style.width = '100%';
      videoRef.current.style.height = '100%';
      setShowBlobBackground(true);
    }
  }, []);

  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      
      if (duration && !isNaN(duration)) {
        const fadeStartTime = 3.5;
        const fadeEndTime = duration;
        
        if (currentTime >= fadeStartTime) {
          const fadeDuration = fadeEndTime - fadeStartTime;
          const progress = Math.min((currentTime - fadeStartTime) / fadeDuration, 1);
          const opacity = 1 - progress;
          setVideoOpacity(opacity);
        } else {
          setVideoOpacity(1);
        }
      }
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    setShowVideo(false);
    setVideoOpacity(0);
  }, []);

  const handleStartClick = useCallback(() => {
    setIsTransitioning(true);
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
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            zIndex: 50,
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
      
      {showBlob && showBlobBackground && <BlobBackgroundV2 />}

      <div 
        className="relative flex-1 flex flex-col justify-start px-6 transition-all duration-[3000ms] ease-in-out overflow-hidden"
        style={{
          zIndex: 60,
          paddingTop: moveToBottom ? '20px' : '120px',
          paddingBottom: '120px', // 버튼 공간 확보
          transform: moveToBottom ? 'translateY(calc(100vh - 240px))' : 'translateY(0)',
        }}
      >
        <div className="text-left">
          <div className="text-gray-800 mb-[12px]" style={{ fontFamily: 'Pretendard Variable', fontWeight: 600, lineHeight: '90%', letterSpacing: '-0.44px', fontSize: '22px' }}>
            <Typewriter
              text="Welcome To"
              speed={80}
              delay={0}
              onIndexReach={(index) => {
                if (index === 7 && !showSori) {
                  setShowSori(true);
                }
              }}
              onComplete={() => {}}
            />
          </div>
          
          <div>
            {isTitleV1 ? (
              <>
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
                    {showSori && !showSecondLine && (
                      <SoriIndexTracker
                        onReachR={() => {
                          setShowSecondLine(true);
                        }}
                      />
                    )}
                  </div>
                )}
                
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
                        setHasCountingStarted(true);
                      }}
                    />
                  </div>
                )}
                
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
                {showSori && (
                  <div style={{ fontFamily: 'Pretendard Variable', fontWeight: 600, lineHeight: '90%', letterSpacing: '-1.8px', fontSize: '40.5pt', marginBottom: '16px' }}>
                    <div className="v2-title-container" style={{ height: '0.9em', overflow: 'visible', lineHeight: '0.9em', display: 'inline-flex', alignItems: 'flex-end' }}>
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

      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 safe-bottom" style={{ zIndex: 60 }}>
        <button
          onClick={handleStartClick}
          disabled={isTransitioning || (conversationCount !== null && conversationCount + 1 >= 100)}
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
