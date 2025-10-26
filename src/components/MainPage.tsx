'use client';

import React from 'react';
import { VersionProvider, useVersion } from '@/hooks/useVersion';
import { VersionSwitcher } from '@/components/VersionSwitcher';
import MainPageV1 from '@/components/main-page/v1/MainPageV1';
import MainPageV2 from '@/components/main-page/v2/MainPageV2';
import MainPageV3 from '@/components/main-page/v3/MainPageV3';

function MainPageContent() {
  const { currentVersion, setCurrentVersion, availableVersions } = useVersion();

  const renderVersion = () => {
    switch (currentVersion) {
      case 'v1':
        return <MainPageV1 />;
      case 'v2':
        return <MainPageV2 />;
      case 'v3':
        return <MainPageV3 />;
      default:
        return <MainPageV2 />;
    }
  };

  return (
    <div className="relative">
      {/* Version Switcher */}
      <div className="fixed top-4 right-4 z-50">
        <VersionSwitcher
          currentVersion={currentVersion}
          availableVersions={availableVersions}
          onVersionChange={setCurrentVersion}
        />
      </div>

      {/* Main Content */}
      {renderVersion()}
    </div>
  );
}

export default function MainPage() {
  return (
    <VersionProvider>
      <MainPageContent />
    </VersionProvider>
  );
}

