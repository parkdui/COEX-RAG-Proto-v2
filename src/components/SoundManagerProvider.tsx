/**
 * SoundManager를 앱 전체에서 사용하기 위한 Provider 컴포넌트
 * 앱 시작 시 자주 사용되는 사운드들을 미리 로드합니다.
 */

'use client';

import { useEffect, ReactNode } from 'react';
import { useSoundManager } from '@/hooks/useSoundManager';
import type { SoundKey } from '@/lib/soundManager';

interface SoundManagerProviderProps {
  children: ReactNode;
  /**
   * 앱 시작 시 미리 로드할 사운드 키 배열
   * 없으면 자주 사용되는 사운드들을 기본으로 로드합니다.
   */
  preloadKeys?: SoundKey[];
}

/**
 * SoundManager Provider 컴포넌트
 * 
 * 앱의 루트 레벨에서 사용하여 사운드를 미리 로드하고,
 * 자식 컴포넌트들이 useSoundManager 훅을 통해 사운드를 사용할 수 있도록 합니다.
 * 
 * @example
 * ```tsx
 * // app/layout.tsx 또는 AppFlow.tsx
 * <SoundManagerProvider preloadKeys={['CLICK_1', 'TEXT_CHANGE', 'SCREEN_TRANSITION']}>
 *   <AppFlow />
 * </SoundManagerProvider>
 * ```
 */
export default function SoundManagerProvider({
  children,
  preloadKeys,
}: SoundManagerProviderProps) {
  // 최소한의 사운드만 사전 로드 (가장 자주 사용되는 것만)
  const minimalPreloadKeys: SoundKey[] = preloadKeys || [
    'CLICK_1',
    'CLICK_2',
  ];

  useSoundManager(minimalPreloadKeys, false); // autoCleanup: false (Provider 레벨에서는 정리하지 않음)

  return <>{children}</>;
}
