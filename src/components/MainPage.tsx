'use client';

import MainPageV1 from '@/components/main-page/v1/MainPageV1';

interface MainPageProps {
  showBlob?: boolean;
  selectedOnboardingOption?: string | null;
}

export default function MainPage({ showBlob = true, selectedOnboardingOption = null }: MainPageProps) {
  return <MainPageV1 showBlob={showBlob} selectedOnboardingOption={selectedOnboardingOption} />;
}
