'use client';

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import Typewriter from './ui/Typewriter';
import VerticalCarouselText from './ui/VerticalCarouselText';
import { SplitText } from './ui';
import { useSoundManager } from '@/hooks/useSoundManager';
import { getSoundManager } from '@/lib/soundManager';

// 무거운 컴포넌트들을 동적 import로 지연 로드
const BlobBackgroundV2 = lazy(() => import('./ui/BlobBackgroundV2'));
const ThinkingBlob = lazy(() => import('./ui/ThinkingBlob'));

interface LandingPageV2Props {
  onComplete: (selectedOption: string) => void;
  showBlob?: boolean;
}

const BUTTON_OPTIONS = [
  '연인과 둘이',
  '친구랑 같이',
  '가족과 함께',
  '혼자서 자유롭게',
];

export default function LandingPageV2({ onComplete, showBlob = true }: LandingPageV2Props) {
  const [showSori, setShowSori] = useState(false);
  const [moveToBottom, setMoveToBottom] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [showBlobBackground, setShowBlobBackground] = useState(false);
  const [blobAnimating, setBlobAnimating] = useState(false);
  const [videoOpacity, setVideoOpacity] = useState(1);
  const [titleOpacity, setTitleOpacity] = useState(1);
  const [showNewText, setShowNewText] = useState(false);
  const [newTextOpacity, setNewTextOpacity] = useState(0);
  const [showButtons, setShowButtons] = useState(false);
  const [buttonOpacity, setButtonOpacity] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showThinkingBlob, setShowThinkingBlob] = useState(false);
  const [textAnimationComplete, setTextAnimationComplete] = useState(false);
  const [questionTextOpacity, setQuestionTextOpacity] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  // 사전 로드 제거: 필요할 때만 로드 (지연 로드)
  const { playSound } = useSoundManager();

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

  // 새 텍스트가 나타나면 1초 뒤에 버튼 fade-in 시작
  useEffect(() => {
    if (newTextOpacity === 1) {
      const buttonTimer = window.setTimeout(() => {
        setShowButtons(true);
        // fade-in 시작
        setTimeout(() => {
          setButtonOpacity(1);
        }, 50);
      }, 1000); // 1초 후 버튼 표시

      return () => {
        window.clearTimeout(buttonTimer);
      };
    }
  }, [newTextOpacity]);

  // 버튼 옵션과 mp3 파일 매핑
  const getMp3FileForOption = (option: string): string | null => {
    const mapping: Record<string, string> = {
      '가족과 함께': '1-1.mp3',
      '연인과 둘이': '2-1.mp3',
      '친구랑 같이': '3-1.mp3',
      '혼자서 자유롭게': '4-1.mp3',
    };
    return mapping[option] || null;
  };

  // mp3 파일 재생 함수
  const playMp3File = useCallback((filename: string) => {
    const audio = new Audio(`/pre-recordings/${filename}`);
    audio.volume = 1.0;
    audio.play().catch((error) => {
      console.error('MP3 재생 실패:', error);
    });
    return audio;
  }, []);

  // 버튼 선택 시 처리
  const handleButtonClick = useCallback((option: string) => {
    // 3. 버튼 클릭 시 클릭 사운드 재생
    playSound('CLICK_1', {
      onError: () => {
        // 재생 실패해도 조용히 처리
      },
    }).catch(() => {
      // 재생 실패해도 조용히 처리
    });
    
    setSelectedOption(option);
    setShowThinkingBlob(true);
    // 기존 텍스트 fade-out
    setQuestionTextOpacity(0);
    
    // 선택된 옵션에 해당하는 mp3 파일 재생 (0.8초 지연)
    const mp3File = getMp3FileForOption(option);
    if (mp3File) {
      setTimeout(() => {
        playMp3File(mp3File);
      }, 800);
    }
  }, [playSound, playMp3File]);

  // 텍스트 애니메이션 완료 시간 계산
  useEffect(() => {
    if (selectedOption) {
      const timer = setTimeout(() => {
        setTextAnimationComplete(true);
      }, 1500); // SplitText 애니메이션 완료 시간

      return () => clearTimeout(timer);
    } else {
      setTextAnimationComplete(false);
    }
  }, [selectedOption]);

  // 텍스트 애니메이션 완료 후 최소 5초 대기 (mp3가 5초 이하일 수 있으므로), 그 다음 MainPage로 전환
  useEffect(() => {
    if (textAnimationComplete && selectedOption) {
      // 텍스트가 나타난 시점부터 최소 5초가 지나야 함
      // SplitText 애니메이션이 1.5초 후 완료되므로, 추가로 3.5초 대기하여 총 5초 보장
      const timer = setTimeout(() => {
        setShowThinkingBlob(false);
        setIsTransitioning(true);
        onComplete(selectedOption);
      }, 3500); // 3초에서 3.5초로 증가하여 최소 5초 보장 (1.5초 애니메이션 + 3.5초 대기 = 5초)

      return () => clearTimeout(timer);
    }
  }, [textAnimationComplete, selectedOption, onComplete]);

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
      {/* ThinkingBlob - 선택 후에만 표시 */}
      {showThinkingBlob && (
        <Suspense fallback={null}>
          <ThinkingBlob isActive={true} />
        </Suspense>
      )}
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
          <source src="/260120_opening_v3.mp4" type="video/mp4" />
        </video>
      )}
      
      {showBlob && showBlobBackground && (
        <Suspense fallback={null}>
          <BlobBackgroundV2 />
        </Suspense>
      )}

      <div 
        className="relative flex-1 flex flex-col justify-start px-6 transition-all duration-[3000ms] ease-in-out"
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
              <div className="landing-title-v2" style={{ fontFamily: 'Pretendard Variable', fontWeight: 400, lineHeight: '90%', letterSpacing: '-1.8px', fontSize: '40.5pt', marginBottom: '16px' }}>
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
                      fontWeight: 400, 
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
                      fontWeight: 400, 
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
                      fontWeight: 400, 
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
          {showNewText && !selectedOption && (
            <div 
              className="text-left"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                opacity: newTextOpacity * questionTextOpacity,
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

          {/* 선택 후 텍스트 (${buttonText} 방문하셨군요. 맞춤형 안내를 생성할게요.) */}
          {selectedOption && (
            <div 
              className="text-left"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                opacity: 1,
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

          {/* 버튼 영역 (텍스트보다 30px 위에 배치) */}
          {showButtons && !selectedOption && (
            <div
              style={{
                position: 'absolute',
                top: '-240%', // 텍스트보다 위에 배치
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxWidth: 'min(500px, 92vw)',
                width: '100%',
                opacity: buttonOpacity,
                transition: 'opacity 0.8s ease-in-out',
                zIndex: 70,
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
                  width: 'calc((100% - 12px) / 2)', // '친구랑 같이' 버튼과 동일한 너비
                  minWidth: 0,
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
                    width: 'calc((100% - 12px) / 2)', // 두 번째 줄 버튼 너비
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
                  width: 'calc((100% - 12px) / 2)', // '친구랑 같이' 버튼과 동일한 너비
                  minWidth: 0,
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

