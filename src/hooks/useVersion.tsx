'use client';

import React from 'react';
import { Version, VersionConfig, getActiveVersion, setActiveVersion, getAvailableVersions } from '@/config/version';

interface VersionContextType {
  currentVersion: Version;
  setCurrentVersion: (version: Version) => void;
  availableVersions: VersionConfig[];
}

const VersionContext = React.createContext<VersionContextType | undefined>(undefined);

export function VersionProvider({ children }: { children: React.ReactNode }) {
  const [currentVersion, setCurrentVersionState] = React.useState<Version>(() => {
    if (typeof window !== 'undefined') {
      return getActiveVersion();
    }
    return 'v2';
  });

  const setCurrentVersion = React.useCallback((version: Version) => {
    setCurrentVersionState(version);
    setActiveVersion(version);
  }, []);

  const availableVersions = React.useMemo(() => getAvailableVersions(), []);

  const value = React.useMemo(() => ({
    currentVersion,
    setCurrentVersion,
    availableVersions
  }), [currentVersion, setCurrentVersion, availableVersions]);

  return (
    <VersionContext.Provider value={value}>
      {children}
    </VersionContext.Provider>
  );
}

export function useVersion() {
  const context = React.useContext(VersionContext);
  if (context === undefined) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
}

