/**
 * SoundManager를 React에서 사용하기 위한 훅
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { SoundManager, getSoundManager, SoundKey, SoundPlayOptions } from '@/lib/soundManager';

// Re-export for convenience
export type { SoundKey, SoundPlayOptions } from '@/lib/soundManager';
export { SOUND_PATHS } from '@/lib/soundManager';

export interface UseSoundManagerReturn {
  playSound: (key: SoundKey, options?: SoundPlayOptions) => Promise<number | null>;
  stopSound: (instanceId: number) => void;
  stopAllSounds: (key: SoundKey) => void;
  stopAll: () => void;
  setGlobalVolume: (volume: number) => void;
  getGlobalVolume: () => number;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  isPlaying: (key: SoundKey) => boolean;
  preloadSounds: (keys?: SoundKey[]) => Promise<void>;
}

/**
 * SoundManager를 사용하기 위한 React 훅
 * 
 * @param preloadKeys 컴포넌트 마운트 시 미리 로드할 사운드 키 배열
 * @param autoCleanup 컴포넌트 언마운트 시 모든 사운드 중지 여부 (기본: true)
 * @returns SoundManager 메서드들
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { playSound, stopAll } = useSoundManager(['CLICK_1', 'TEXT_CHANGE']);
 *   
 *   const handleClick = () => {
 *     playSound('CLICK_1');
 *   };
 *   
 *   return <button onClick={handleClick}>Click</button>;
 * }
 * ```
 */
export function useSoundManager(
  preloadKeys?: SoundKey[],
  autoCleanup: boolean = true
): UseSoundManagerReturn {
  const soundManagerRef = useRef<SoundManager | null>(null);
  const preloadKeysRef = useRef<SoundKey[] | undefined>(preloadKeys);
  const preloadDoneRef = useRef(false);

  // SoundManager 초기화 (한 번만)
  useEffect(() => {
    soundManagerRef.current = getSoundManager();
    
    // 사전 로드 (한 번만, 논블로킹)
    if (!preloadDoneRef.current && preloadKeysRef.current && preloadKeysRef.current.length > 0) {
      preloadDoneRef.current = true;
      // 논블로킹으로 사전 로드 (await하지 않음)
      soundManagerRef.current.preloadSounds(preloadKeysRef.current).catch(() => {
        // 조용히 실패 처리
      });
    }

    return () => {
      if (autoCleanup && soundManagerRef.current) {
        soundManagerRef.current.stopAll();
      }
    };
  }, [autoCleanup]); // preloadKeys를 의존성에서 제거하여 불필요한 재실행 방지

  const playSound = useCallback(
    async (key: SoundKey, options?: SoundPlayOptions): Promise<number | null> => {
      // SoundManager가 초기화되지 않았으면 초기화
      if (!soundManagerRef.current) {
        soundManagerRef.current = getSoundManager();
      }
      return soundManagerRef.current.playSound(key, options);
    },
    []
  );

  const stopSound = useCallback((instanceId: number) => {
    soundManagerRef.current?.stopSound(instanceId);
  }, []);

  const stopAllSounds = useCallback((key: SoundKey) => {
    soundManagerRef.current?.stopAllSounds(key);
  }, []);

  const stopAll = useCallback(() => {
    soundManagerRef.current?.stopAll();
  }, []);

  const setGlobalVolume = useCallback((volume: number) => {
    soundManagerRef.current?.setGlobalVolume(volume);
  }, []);

  const getGlobalVolume = useCallback((): number => {
    return soundManagerRef.current?.getGlobalVolume() ?? 1.0;
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    soundManagerRef.current?.setMuted(muted);
  }, []);

  const isMuted = useCallback((): boolean => {
    return soundManagerRef.current?.isMutedState() ?? false;
  }, []);

  const isPlaying = useCallback((key: SoundKey): boolean => {
    return soundManagerRef.current?.isPlaying(key) ?? false;
  }, []);

  const preloadSounds = useCallback(async (keys?: SoundKey[]) => {
    if (!soundManagerRef.current) return;
    await soundManagerRef.current.preloadSounds(keys);
  }, []);

  return {
    playSound,
    stopSound,
    stopAllSounds,
    stopAll,
    setGlobalVolume,
    getGlobalVolume,
    setMuted,
    isMuted,
    isPlaying,
    preloadSounds,
  };
}
