'use client';

import MainPageV1 from '@/components/main-page/v1/MainPageV1';

interface MainPageProps {
  showBlob?: boolean;
}

export default function MainPage({ showBlob = true }: MainPageProps) {
  return <MainPageV1 showBlob={showBlob} />;
}



