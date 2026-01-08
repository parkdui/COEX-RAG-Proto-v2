'use client';

import { useState, useEffect, useRef } from 'react';
import LandingPage from './LandingPage';
import LandingPageV2 from './LandingPageV2';
import OnboardingPage from './OnboardingPage';
import MainPage from './MainPage';
import BlobBackground from './ui/BlobBackground';

type PageType = 'landing' | 'onboarding' | 'main' | 'blocked';

interface EnterResponse {
  allowed: boolean;
  reason?: 'DAILY_LIMIT' | 'CONCURRENCY_LIMIT' | 'ONCE_PER_DAY' | 'SERVER_ERROR';
  message?: string;
  total?: number;
  concurrentUsers?: number;
}

export default function AppFlow() {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [blobAnimating, setBlobAnimating] = useState(false);
  const [showBlobBackground] = useState(true);
  const [accessStatus, setAccessStatus] = useState<EnterResponse | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [selectedOnboardingOption, setSelectedOnboardingOption] = useState<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const leaveHandlerRef = useRef<(() => void) | null>(null);

  const handleNext = () => {
    setIsTransitioning(true);
    setCurrentPage('onboarding');
    // OnboardingPage가 마운트된 후 fade-in 애니메이션 시작
    setTimeout(() => {
      setIsTransitioning(false);
    }, 50);
  };

  const handleOnboardingComplete = (selectedOption: string) => {
    setSelectedOnboardingOption(selectedOption);
    setIsTransitioning(true);
    setCurrentPage('main');
    // MainPage가 마운트된 후 fade-in 애니메이션 시작
    setTimeout(() => {
      setIsTransitioning(false);
    }, 50);
  };

  const handleBlobAnimationStart = () => {
    setBlobAnimating(true);
  };

  const handleBlobAnimationComplete = () => {
    // blob 애니메이션이 완료되면 페이지 전환
    handleNext();
  };

  // 페이지 진입 시 접속 체크
  useEffect(() => {
    let isMounted = true;
    let safetyTimeout: NodeJS.Timeout | null = null;

    const checkAccess = async () => {
      try {
        if (!isMounted) return;
        setIsCheckingAccess(true);
        
        // 타임아웃 설정 (3초로 단축 - 더 빠른 fallback)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 3000);
        });
        
        const fetchPromise = fetch('/api/enter', {
          method: 'GET',
          cache: 'no-store',
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!isMounted) return;
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: EnterResponse = await response.json();
        
        if (!isMounted) return;
        
        setAccessStatus(data);
        
        if (!data.allowed) {
          setCurrentPage('blocked');
          setIsCheckingAccess(false);
          return;
        }
        
        setIsCheckingAccess(false);
        setCurrentPage('landing');
      } catch (error) {
        console.error('[AppFlow] 접속 체크 실패:', error);
        
        if (!isMounted) return;
        
        // 에러 발생 시 기본적으로 LandingPage를 보여줌
        // (접속 제어 기능이 작동하지 않아도 서비스는 이용 가능)
        setAccessStatus({
          allowed: true, // 기본적으로 허용
          reason: undefined,
          message: undefined
        });
        setIsCheckingAccess(false);
        setCurrentPage('landing');
      }
    };

    // 안전장치: 5초 후에도 로딩 중이면 강제로 LandingPage 표시
    safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setIsCheckingAccess(false);
        setCurrentPage('landing');
        setAccessStatus({
          allowed: true,
          reason: undefined,
          message: undefined
        });
      }
    }, 5000);

    checkAccess();

    return () => {
      isMounted = false;
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
    };
  }, []);

  // MainPage로 전환 시 heartbeat 시작
  useEffect(() => {
    if (currentPage === 'main') {
      // 쿠키에서 session_id 확인하는 헬퍼 함수
      const getCookie = (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
      };

      // 즉시 한 번 heartbeat 전송
      const sendHeartbeat = async () => {
        try {
          // session_id 쿠키가 있는지 확인
          const sessionId = getCookie('session_id');
          if (!sessionId) {
            // 쿠키가 없으면 조용히 실패 (에러 로그 없음)
            return;
          }

          const response = await fetch('/api/heartbeat', { method: 'POST' });
          
          // 400 에러는 session_id가 없는 경우이므로 조용히 처리
          if (!response.ok && response.status === 400) {
            // 조용히 실패 (에러 로그 없음)
            return;
          }
          
          if (!response.ok) {
            console.warn('Heartbeat failed with status:', response.status);
          }
        } catch (error) {
          // 네트워크 에러 등만 로그 출력
          console.error('Heartbeat network error:', error);
        }
      };
      
      // 약간의 지연 후 heartbeat 전송 (쿠키 설정 시간 확보)
      setTimeout(() => {
        sendHeartbeat();
      }, 500);

      // 30초마다 heartbeat 전송
      heartbeatIntervalRef.current = setInterval(() => {
        sendHeartbeat();
      }, 30000);

      // 페이지 언로드 시 세션 정리
      const handleBeforeUnload = async () => {
        try {
          await fetch('/api/leave', { method: 'POST' });
        } catch (error) {
          console.error('Leave failed:', error);
        }
      };

      // visibilitychange 이벤트로 탭 전환 감지
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          sendHeartbeat();
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      leaveHandlerRef.current = () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (leaveHandlerRef.current) {
        leaveHandlerRef.current();
        leaveHandlerRef.current = null;
      }
    };
  }, [currentPage]);

  const renderCurrentPage = () => {
    if (isCheckingAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-transparent relative" style={{ zIndex: 10 }}>
          <div className="text-center">
            <div className="text-gray-800 mb-4" style={{ fontFamily: 'Pretendard Variable', fontSize: '16px', fontWeight: 500 }}>
              접속 확인 중...
            </div>
            <div className="text-gray-600 text-sm" style={{ fontFamily: 'Pretendard Variable' }}>
              잠시만 기다려주세요
            </div>
          </div>
        </div>
      );
    }

    try {
      switch (currentPage) {
      case 'blocked':
        return (
          <div className="fixed inset-0 flex items-center justify-center px-6" style={{ zIndex: 10 }}>
            <div className="text-center max-w-md">
              {accessStatus?.reason === 'ONCE_PER_DAY' ? (
                <>
                  {/* 제목 문구 */}
                  <div 
                    style={{ 
                      color: '#000',
                      textAlign: 'center',
                      fontFamily: 'Pretendard Variable',
                      fontSize: '20px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '130%',
                      letterSpacing: '-0.432px',
                      whiteSpace: 'pre-line',
                      marginBottom: '16px'
                    }}
                  >
                    아쉽지만 오늘의 대화는 여기까지예요.{'\n'}다음에 또 이야기해요!
                  </div>
                  {/* 본문 문구 */}
                  <div 
                    style={{ 
                      color: '#000',
                      textAlign: 'center',
                      fontFamily: 'Pretendard Variable',
                      fontSize: '16px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '130%',
                      letterSpacing: '-0.432px'
                    }}
                  >
                    하루에 한 번만 대화할 수 있어요.
                  </div>
                </>
              ) : (
                <>
                  <div className="text-gray-800 mb-4" style={{ fontFamily: 'Pretendard Variable', fontSize: '20px', fontWeight: 600 }}>
                    {accessStatus?.message || '접속이 제한되었습니다.'}
                  </div>
                  {accessStatus?.reason === 'DAILY_LIMIT' && (
                    <div className="text-gray-600 text-sm" style={{ fontFamily: 'Pretendard Variable' }}>
                      오늘의 이용 인원이 모두 찼습니다. 내일 다시 이용해 주세요.
                    </div>
                  )}
                  {accessStatus?.reason === 'CONCURRENCY_LIMIT' && (
                    <div className="text-gray-600 text-sm" style={{ fontFamily: 'Pretendard Variable' }}>
                      현재 접속이 많습니다. 잠시 후 다시 시도해 주세요.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      case 'landing':
        return (
          <div className="relative" style={{ zIndex: 10 }}>
            <LandingPageV2 
              onStart={handleNext} 
              showBlob={false} 
            />
          </div>
        );
      case 'onboarding':
        return (
          <div 
            className="transition-opacity duration-500 relative"
            style={{ 
              zIndex: 10,
              opacity: isTransitioning ? 0 : 1,
              animation: isTransitioning ? 'none' : 'fadeIn 0.6s ease-in-out'
            }}
          >
            <OnboardingPage onComplete={handleOnboardingComplete} />
          </div>
        );
      case 'main':
        return (
          <div 
            className="transition-opacity duration-500 relative"
            style={{ 
              zIndex: 10,
              opacity: isTransitioning ? 0 : 1,
              animation: isTransitioning ? 'none' : 'fadeIn 0.6s ease-in-out'
            }}
          >
            <MainPage showBlob={true} selectedOnboardingOption={selectedOnboardingOption} />
          </div>
        );
      default:
        return (
          <div className="relative" style={{ zIndex: 10 }}>
            <LandingPageV2 
              onStart={handleNext} 
              showBlob={false} 
            />
          </div>
        );
      }
    } catch (error) {
      console.error('Error rendering page:', error);
      return (
        <div className="min-h-screen flex items-center justify-center bg-transparent relative" style={{ zIndex: 10 }}>
          <div className="text-center">
            <div className="text-gray-800 mb-4" style={{ fontFamily: 'Pretendard Variable', fontSize: '16px', fontWeight: 500 }}>
              페이지를 불러오는 중 오류가 발생했습니다.
            </div>
            <div className="text-gray-600 text-sm" style={{ fontFamily: 'Pretendard Variable' }}>
              브라우저 콘솔을 확인해주세요.
            </div>
            <button
              onClick={() => {
                setCurrentPage('landing');
                setIsCheckingAccess(false);
              }}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              style={{ fontFamily: 'Pretendard Variable' }}
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen relative" style={{ background: 'transparent' }}>
      {/* MainPage에서는 BlobBackground를 렌더링하지 않음 (MainPage 내부에서 자체 blob 사용) */}
      {showBlobBackground && currentPage !== 'main' && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 0, 
            pointerEvents: 'none',
            isolation: 'isolate'
          }}
        >
          <BlobBackground
            isAnimating={blobAnimating}
            onAnimationComplete={handleBlobAnimationComplete}
          />
        </div>
      )}
      <div 
        className="relative" 
        style={{ 
          minHeight: '100vh', 
          width: '100%', 
          zIndex: 10, 
          position: 'relative',
          isolation: 'isolate'
        }}
      >
        {renderCurrentPage()}
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

