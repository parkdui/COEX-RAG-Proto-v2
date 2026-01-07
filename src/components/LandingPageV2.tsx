'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Typewriter from './ui/Typewriter';
import BlobBackgroundV2 from './ui/BlobBackgroundV2';
import VerticalCarouselText from './ui/VerticalCarouselText';

interface LandingPageV2Props {
  onStart: () => void;
  showBlob?: boolean;
}

export default function LandingPageV2({ onStart, showBlob = true }: LandingPageV2Props) {
  const [showSori, setShowSori] = useState(false);
  const [moveToBottom, setMoveToBottom] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [showBlobBackground, setShowBlobBackground] = useState(false);
  const [videoOpacity, setVideoOpacity] = useState(1);
  const [titleOpacity, setTitleOpacity] = useState(1);
  const [showNewText, setShowNewText] = useState(false);
  const [newTextOpacity, setNewTextOpacity] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // v2: 'Sori at COEX' 애니메이션 후 이동 처리
  useEffect(() => {
    if (!showSori) {
      return;
    }

    // 'Sori at COEX'는 12글자, stagger 180ms
    // 텍스트가 충분히 표시된 후 (약 1.5초) 하단으로 이동
    const moveTimer = window.setTimeout(() => {
      setMoveToBottom(true);
    }, 1500);

    return () => {
      window.clearTimeout(moveTimer);
    };
  }, [showSori]);

  // moveToBottom이 true가 된 후 1초 뒤에 title fade-out 시작
  useEffect(() => {
    if (!moveToBottom) {
      return;
    }

    const fadeOutTimer = window.setTimeout(() => {
      setTitleOpacity(0);
    }, 2000);

    return () => {
      window.clearTimeout(fadeOutTimer);
    };
  }, [moveToBottom]);

  // title fade-out 완료 후 (0.5초 transition) 새 텍스트 표시 및 fade-in
  useEffect(() => {
    if (titleOpacity === 0) {
      const showNewTextTimer = window.setTimeout(() => {
        setShowNewText(true);
        // fade-in 시작
        setTimeout(() => {
          setNewTextOpacity(1);
        }, 50);
      }, 500); // fade-out transition 완료 대기

      return () => {
        window.clearTimeout(showNewTextTimer);
      };
    }
  }, [titleOpacity]);

  // 새 텍스트가 나타나고 4.5초 뒤에 OnboardingPage로 전환
  useEffect(() => {
    if (newTextOpacity === 1) {
      const transitionTimer = window.setTimeout(() => {
        setIsTransitioning(true);
        onStart();
      }, 4500);

      return () => {
        window.clearTimeout(transitionTimer);
      };
    }
  }, [newTextOpacity, onStart]);

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
          paddingTop: moveToBottom ? '20px' : 'clamp(120px, 20vh, 180px)',
          paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px) + 60px)',
          transform: moveToBottom ? 'translateY(calc(100vh - 260px - env(safe-area-inset-bottom, 0px) - 60px))' : 'translateY(0)',
        }}
      >
        {/* 타이틀 영역 컨테이너 (기존 타이틀과 새 텍스트가 같은 위치에 나타남) */}
        <div 
          className="text-left"
          style={{
            position: 'relative',
            minHeight: showSori ? 'auto' : '60px',
          }}
        >
          {/* 기존 타이틀 텍스트 (Welcome To, Sori at COEX) */}
          <div 
            style={{
              opacity: titleOpacity,
              transition: 'opacity 0.5s ease-in-out',
            }}
          >
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
            
            {showSori && (
              <div className="landing-title-v2" style={{ fontFamily: 'Pretendard Variable', fontWeight: 600, lineHeight: '90%', letterSpacing: '-1.8px', fontSize: '40.5pt', marginBottom: '16px' }}>
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
          </div>

          {/* 새 텍스트 (안녕하세요, 이솔입니다. / 오늘 누구와 코엑스에 방문하셨나요?) - 기존 타이틀과 같은 위치 */}
          {showNewText && (
            <div 
              className="text-left"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                opacity: newTextOpacity,
                transition: 'opacity 0.5s ease-in-out',
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
          )}
        </div>
      </div>

      <style jsx>{`
        /* 320px 이하 디바이스에서 제목 텍스트 크기 조정 */
        @media (max-width: 320px) {
          .landing-title-v2 {
            font-size: 28pt !important;
          }
          .landing-title-v2 :global(.vertical-carousel-v2) {
            font-size: 28pt !important;
          }
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

