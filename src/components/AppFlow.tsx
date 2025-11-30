'use client';

import { useState, useEffect, useRef } from 'react';
import LandingPage from './LandingPage';
import MainPage from './MainPage';
import BlobBackground from './ui/BlobBackground';

type PageType = 'landing' | 'main' | 'blocked';

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
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const leaveHandlerRef = useRef<(() => void) | null>(null);

  const handleNext = () => {
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
    const checkAccess = async () => {
      try {
        setIsCheckingAccess(true);
        const response = await fetch('/api/enter');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: EnterResponse = await response.json();
        setAccessStatus(data);
        
        if (!data.allowed) {
          setCurrentPage('blocked');
          setIsCheckingAccess(false);
          return;
        }
        
        setIsCheckingAccess(false);
      } catch (error) {
        console.error('Failed to check access:', error);
        // KV 연결 실패 시에도 기본적으로 LandingPage를 보여줌
        // (접속 제어 기능이 작동하지 않아도 서비스는 이용 가능)
        setAccessStatus({
          allowed: true, // 기본적으로 허용
          reason: undefined,
          message: undefined
        });
        setIsCheckingAccess(false);
        // currentPage는 이미 'landing'으로 초기화되어 있음
      }
    };

    checkAccess();
  }, []);

  // MainPage로 전환 시 heartbeat 시작
  useEffect(() => {
    if (currentPage === 'main') {
      // 즉시 한 번 heartbeat 전송
      const sendHeartbeat = async () => {
        try {
          await fetch('/api/heartbeat', { method: 'POST' });
        } catch (error) {
          console.error('Heartbeat failed:', error);
        }
      };
      sendHeartbeat();

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
        if (document.hidden) {
          // 탭이 숨겨지면 heartbeat 중단 (선택사항)
        } else {
          // 탭이 다시 보이면 heartbeat 재개
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-800 mb-4" style={{ fontFamily: 'Pretendard Variable', fontSize: '16px' }}>
              접속 확인 중...
            </div>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'blocked':
        return (
          <div className="min-h-screen flex items-center justify-center px-6">
            <div className="text-center max-w-md">
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
              {accessStatus?.reason === 'ONCE_PER_DAY' && (
                <div className="text-gray-600 text-sm" style={{ fontFamily: 'Pretendard Variable' }}>
                  오늘은 이미 이용하셨습니다. 내일 다시 이용해 주세요.
                </div>
              )}
            </div>
          </div>
        );
      case 'landing':
        return (
          <LandingPage 
            onStart={handleBlobAnimationStart} 
            showBlob={false} 
          />
        );
      case 'main':
        return (
          <div 
            className="transition-opacity duration-500"
            style={{ 
              opacity: isTransitioning ? 0 : 1,
              animation: isTransitioning ? 'none' : 'fadeIn 0.6s ease-in-out'
            }}
          >
            <MainPage showBlob={false} />
          </div>
        );
      default:
        return (
          <LandingPage 
            onStart={handleBlobAnimationStart} 
            showBlob={false} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen relative" style={{ background: 'transparent' }}>
      {/* AppFlow 레벨에서 BlobBackground를 관리하여 상태 유지 */}
      {showBlobBackground && (
        <BlobBackground
          isAnimating={blobAnimating}
          onAnimationComplete={handleBlobAnimationComplete}
        />
      )}
      {renderCurrentPage()}
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

