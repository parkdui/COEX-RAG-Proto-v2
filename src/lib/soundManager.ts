/**
 * SFX 사운드 매니저
 * 각 페이지의 scene마다 사운드 이펙트를 재생하기 위한 매니저
 */

// 사운드 파일 경로 상수
export const SOUND_PATHS = {
  FIRST_APPEARANCE: '/SFX/1-1.wav',
  FIRST_APPEARANCE_WITH_TEXT_CHANGE: '/SFX/1-2.wav',
  TEXT_CHANGE: '/SFX/2-1.wav',
  MENU_SELECTION: '/SFX/2-2.wav',
  CLICK_1: '/SFX/3-1.wav',
  SCREEN_TRANSITION: '/SFX/3-2.wav',
  CLICK_2: '/SFX/3-3.wav',
  THINKING_LONG: '/SFX/4-1.wav',
  THINKING_SHORT: '/SFX/4-2.wav',
  MODAL_APPEARANCE: '/SFX/5.wav',
} as const;

export type SoundKey = keyof typeof SOUND_PATHS;

// 사운드 재생 옵션
export interface SoundPlayOptions {
  volume?: number; // 0.0 ~ 1.0
  loop?: boolean;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

// 사운드 인스턴스 정보
interface SoundInstance {
  audio: HTMLAudioElement;
  key: SoundKey;
  isPlaying: boolean;
}

/**
 * 사운드 매니저 클래스
 * 여러 사운드를 동시에 재생할 수 있으며, 각 사운드를 개별적으로 관리합니다.
 */
export class SoundManager {
  private sounds: Map<SoundKey, HTMLAudioElement> = new Map();
  private activeInstances: Map<number, SoundInstance> = new Map();
  private instanceIdCounter: number = 0;
  private globalVolume: number = 1.0;
  private isMuted: boolean = false;
  private preloadedSounds: Set<SoundKey> = new Set();

  /**
   * 사운드 파일을 미리 로드합니다 (비동기, 논블로킹).
   * @param keys 로드할 사운드 키 배열 (없으면 모든 사운드 로드)
   */
  async preloadSounds(keys?: SoundKey[]): Promise<void> {
    const soundsToLoad = keys || (Object.keys(SOUND_PATHS) as SoundKey[]);
    
    // 이미 로드된 사운드 필터링
    const soundsToLoadFiltered = soundsToLoad.filter(key => !this.preloadedSounds.has(key));
    
    if (soundsToLoadFiltered.length === 0) {
      return; // 모두 이미 로드됨
    }

    // 논블로킹 방식으로 로드 (Promise.all 대신 개별 처리)
    soundsToLoadFiltered.forEach((key) => {
      // 비동기로 로드하되 await하지 않음 (논블로킹)
      this.loadSoundAsync(key).catch(() => {
        // 실패해도 조용히 처리 (나중에 재생 시 다시 시도)
      });
    });
  }

  /**
   * 개별 사운드를 비동기로 로드합니다.
   */
  private async loadSoundAsync(key: SoundKey): Promise<void> {
    if (this.preloadedSounds.has(key)) {
      return; // 이미 로드됨
    }

    try {
      const audio = new Audio(SOUND_PATHS[key]);
      audio.preload = 'auto';
      
      // 로드 완료 대기 (타임아웃 단축: 2초)
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timeout loading sound: ${key}`));
        }, 2000);

        const cleanup = () => {
          clearTimeout(timeoutId);
          audio.removeEventListener('canplaythrough', onCanPlay);
          audio.removeEventListener('error', onError);
        };

        const onCanPlay = () => {
          cleanup();
          resolve();
        };

        const onError = () => {
          cleanup();
          reject(new Error(`Failed to load sound: ${key}`));
        };

        audio.addEventListener('canplaythrough', onCanPlay, { once: true });
        audio.addEventListener('error', onError, { once: true });
      });

      this.sounds.set(key, audio);
      this.preloadedSounds.add(key);
    } catch (error) {
      // 실패해도 조용히 처리 (나중에 재생 시 다시 시도)
      console.warn(`[SoundManager] Failed to preload sound "${key}":`, error);
    }
  }

  /**
   * 사운드를 재생합니다 (지연 로드 지원).
   * @param key 사운드 키
   * @param options 재생 옵션
   * @returns 재생 인스턴스 ID (중지 시 사용)
   */
  async playSound(key: SoundKey, options: SoundPlayOptions = {}): Promise<number | null> {
    try {
      let audio = this.sounds.get(key);
      
      // 사운드가 로드되지 않았으면 즉시 로드 시도 (빠른 타임아웃)
      if (!audio) {
        try {
          const newAudio = new Audio(SOUND_PATHS[key]);
          newAudio.preload = 'auto';
          
          // 빠른 로드 시도 (1초 타임아웃)
          await Promise.race([
            new Promise<void>((resolve) => {
              if (newAudio.readyState >= 2) { // HAVE_CURRENT_DATA
                resolve();
                return;
              }
              const onCanPlay = () => {
                newAudio.removeEventListener('canplaythrough', onCanPlay);
                newAudio.removeEventListener('error', onError);
                resolve();
              };
              const onError = () => {
                newAudio.removeEventListener('canplaythrough', onCanPlay);
                newAudio.removeEventListener('error', onError);
                resolve(); // 에러가 나도 재생 시도
              };
              newAudio.addEventListener('canplaythrough', onCanPlay, { once: true });
              newAudio.addEventListener('error', onError, { once: true });
            }),
            new Promise<void>((resolve) => setTimeout(resolve, 1000)) // 1초 타임아웃
          ]);
          
          audio = newAudio;
          this.sounds.set(key, audio);
          this.preloadedSounds.add(key);
        } catch (loadError) {
          // 로드 실패해도 재생 시도 (브라우저가 자동으로 로드할 수 있음)
          audio = new Audio(SOUND_PATHS[key]);
          this.sounds.set(key, audio);
        }
      }

      // audio가 여전히 없으면 새로 생성 (안전장치)
      if (!audio) {
        audio = new Audio(SOUND_PATHS[key]);
        this.sounds.set(key, audio);
      }

      // 새 인스턴스 생성 (동일 사운드 동시 재생 가능)
      // cloneNode 대신 새 Audio 인스턴스 생성 (더 가벼움)
      const soundPath = SOUND_PATHS[key];
      
      // 절대 URL로 변환 (상대 경로 문제 해결)
      const absolutePath = soundPath.startsWith('http') 
        ? soundPath 
        : `${window.location.origin}${soundPath}`;
      
      // 간단하게 Audio 인스턴스 생성
      const audioInstance = new Audio(absolutePath);
      audioInstance.volume = this.isMuted ? 0 : (options.volume ?? this.globalVolume);
      audioInstance.loop = options.loop ?? false;
      
      const instanceId = ++this.instanceIdCounter;


      // 이벤트 핸들러
      const cleanup = () => {
        this.activeInstances.delete(instanceId);
        // 메모리 정리 (src를 빈 문자열로 설정하지 않음 - 이미 사용하지 않는 인스턴스이므로)
        try {
          audioInstance.pause();
          audioInstance.removeAttribute('src');
          audioInstance.load();
        } catch (e) {
          // 정리 중 에러는 무시
        }
      };

      audioInstance.onended = () => {
        cleanup();
        options.onEnded?.();
      };

      audioInstance.onerror = (event) => {
        // 에러 발생 시 조용히 처리 (콘솔 에러 제거)
        // 브라우저 자동 재생 정책이나 네트워크 문제로 실패할 수 있음
        cleanup();
      };

      // 인스턴스 저장
      this.activeInstances.set(instanceId, {
        audio: audioInstance,
        key,
        isPlaying: false,
      });

      // 재생 시도 - 간단하게
      try {
        // 사운드가 로드될 때까지 짧게 대기 (최대 500ms)
        if (audioInstance.readyState < 2) {
          await Promise.race([
            new Promise<void>((resolve) => {
              const onCanPlay = () => {
                audioInstance.removeEventListener('canplay', onCanPlay);
                audioInstance.removeEventListener('error', onError);
                resolve();
              };
              const onError = () => {
                audioInstance.removeEventListener('canplay', onCanPlay);
                audioInstance.removeEventListener('error', onError);
                resolve(); // 에러가 나도 재생 시도
              };
              audioInstance.addEventListener('canplay', onCanPlay, { once: true });
              audioInstance.addEventListener('error', onError, { once: true });
            }),
            new Promise<void>((resolve) => setTimeout(resolve, 500))
          ]);
        }
        
        // 재생 시도
        await audioInstance.play();
        
        // 재생 성공
        this.activeInstances.get(instanceId)!.isPlaying = true;
        return instanceId;
      } catch (playError) {
        // 재생 실패
        const error = playError as Error & { name?: string };
        if (error.name === 'NotAllowedError') {
          // 브라우저 자동 재생 정책으로 차단됨 - 인스턴스는 유지 (나중에 재시도 가능)
          this.activeInstances.get(instanceId)!.isPlaying = false;
          return instanceId;
        }
        // 다른 에러는 cleanup
        cleanup();
        return null;
      }
    } catch (error) {
      // 로드 실패 등 기타 에러도 조용히 처리
      // onError 콜백 호출 제거 - 에러 객체 생성이 콘솔에 표시될 수 있음
      return null;
    }
  }

  /**
   * 특정 사운드 인스턴스를 중지합니다.
   * @param instanceId playSound에서 반환된 인스턴스 ID
   */
  stopSound(instanceId: number): void {
    const instance = this.activeInstances.get(instanceId);
    if (instance) {
      instance.audio.pause();
      instance.audio.currentTime = 0;
      instance.isPlaying = false;
      // 메모리 정리
      instance.audio.src = '';
      instance.audio.load();
      this.activeInstances.delete(instanceId);
    }
  }

  /**
   * 특정 키의 모든 재생 중인 사운드를 중지합니다.
   * @param key 사운드 키
   */
  stopAllSounds(key: SoundKey): void {
    for (const [instanceId, instance] of this.activeInstances.entries()) {
      if (instance.key === key) {
        this.stopSound(instanceId);
      }
    }
  }

  /**
   * 모든 재생 중인 사운드를 중지합니다.
   */
  stopAll(): void {
    for (const instanceId of this.activeInstances.keys()) {
      this.stopSound(instanceId);
    }
  }

  /**
   * 전역 볼륨을 설정합니다 (0.0 ~ 1.0).
   * @param volume 볼륨 값
   */
  setGlobalVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1, volume));
    
    // 활성 인스턴스들의 볼륨 업데이트
    for (const instance of this.activeInstances.values()) {
      if (!this.isMuted) {
        instance.audio.volume = this.globalVolume;
      }
    }
  }

  /**
   * 전역 볼륨을 가져옵니다.
   */
  getGlobalVolume(): number {
    return this.globalVolume;
  }

  /**
   * 모든 사운드를 음소거/음소거 해제합니다.
   * @param muted 음소거 여부
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    
    // 활성 인스턴스들의 볼륨 업데이트
    for (const instance of this.activeInstances.values()) {
      instance.audio.volume = muted ? 0 : this.globalVolume;
    }
  }

  /**
   * 음소거 상태를 가져옵니다.
   */
  isMutedState(): boolean {
    return this.isMuted;
  }

  /**
   * 특정 사운드가 재생 중인지 확인합니다.
   * @param key 사운드 키
   */
  isPlaying(key: SoundKey): boolean {
    for (const instance of this.activeInstances.values()) {
      if (instance.key === key && instance.isPlaying) {
        return true;
      }
    }
    return false;
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.stopAll();
    this.sounds.clear();
    this.activeInstances.clear();
    this.preloadedSounds.clear();
  }
}

// 싱글톤 인스턴스 (전역에서 하나의 SoundManager 사용)
let globalSoundManager: SoundManager | null = null;

/**
 * 전역 SoundManager 인스턴스를 가져옵니다.
 */
export function getSoundManager(): SoundManager {
  if (!globalSoundManager) {
    globalSoundManager = new SoundManager();
  }
  return globalSoundManager;
}
