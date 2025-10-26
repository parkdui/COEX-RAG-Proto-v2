'use client';

import React from 'react';
import { Version, VersionConfig } from '@/config/version';
import { Button } from '@/components/ui';

interface VersionSwitcherProps {
  currentVersion: Version;
  availableVersions: VersionConfig[];
  onVersionChange: (version: Version) => void;
  className?: string;
}

export function VersionSwitcher({ 
  currentVersion, 
  availableVersions, 
  onVersionChange, 
  className = '' 
}: VersionSwitcherProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const currentVersionConfig = availableVersions.find(v => v.id === currentVersion);

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-400 hover:text-white"
      >
        <span className="text-xs font-medium">
          {currentVersionConfig?.name || currentVersion}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-72 lg:w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-1">UI 버전 선택</h3>
              <p className="text-xs text-gray-400">원하는 버전을 선택하세요</p>
            </div>
            
            <div className="p-2">
              {availableVersions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => {
                    onVersionChange(version.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    version.id === currentVersion
                      ? 'bg-blue-600/20 border border-blue-500/30'
                      : 'hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">
                      {version.name}
                    </span>
                    {version.id === currentVersion && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    {version.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {version.features.slice(0, 3).map((feature, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                    {version.features.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                        +{version.features.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="p-3 border-t border-gray-700 bg-gray-900/50">
              <p className="text-xs text-gray-500">
                버전 변경 시 페이지가 새로고침됩니다.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
