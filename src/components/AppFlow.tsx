'use client';

import { useState } from 'react';
import LandingPage from './LandingPage';
import OnboardingPage from './OnboardingPage';
import MainPage from './MainPage';
import BlobBackground from './ui/BlobBackground';

type PageType = 'landing' | 'onboarding' | 'main';

export default function AppFlow() {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [blobAnimating, setBlobAnimating] = useState(false);
  const [showBlobBackground] = useState(true);

  const handleStart = () => {
    setCurrentPage('onboarding');
  };

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

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onStart={handleStart} showBlob={false} />;
      case 'onboarding':
        return (
          <OnboardingPage 
            onNext={handleNext} 
            onBlobAnimationStart={handleBlobAnimationStart}
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
        return <LandingPage onStart={handleStart} showBlob={false} />;
    }
  };

  return (
    <div className="min-h-screen relative">
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

