'use client';

import React, { useState } from 'react';
import LandingPage from './LandingPage';
import OnboardingPage from './OnboardingPage';
import MainPage from './MainPage';

type PageType = 'landing' | 'onboarding' | 'main';

export default function AppFlow() {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');

  const handleStart = () => {
    setCurrentPage('onboarding');
  };

  const handleNext = () => {
    setCurrentPage('main');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onStart={handleStart} />;
      case 'onboarding':
        return <OnboardingPage onNext={handleNext} />;
      case 'main':
        return <MainPage />;
      default:
        return <LandingPage onStart={handleStart} />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderCurrentPage()}
    </div>
  );
}

