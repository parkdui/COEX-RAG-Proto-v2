/**
 * TTS 관련 유틸리티 함수들
 */

import { TTSRequest } from '@/types';

/**
 * TTS API 요청을 보내는 함수
 */
interface RequestTTSOptions {
  signal?: AbortSignal;
}

export async function requestTTS(text: string, options: RequestTTSOptions = {}): Promise<Blob> {
  // Siren TTS API 사용 (기존 CLOVA Voice 대체)
  const request = {
    text,
    speaker: 'xsori', // Siren TTS 기본 화자
    speed: -1,        // 1.11배 빠르게 (기존 CLOVA의 '-1'과 유사한 효과)
    volume: 0,        // 보통 크기
    alpha: 0,         // 기본 음색
    format: 'mp3'     // 오디오 포맷
  };

  const startTime = Date.now();
  console.log('[TTS] Request started:', { textLength: text.length, text: text.substring(0, 50) + '...' });

  try {
    const response = await fetch('/api/tts-siren', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: options.signal,
    });

    const elapsedTime = Date.now() - startTime;
    console.log('[TTS] Response received:', { status: response.status, elapsedTime: `${elapsedTime}ms` });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] API error:', { status: response.status, errorText });
      throw new Error(`TTS API failed: ${response.status} ${errorText}`);
    }

    const blob = await response.blob();
    const totalTime = Date.now() - startTime;
    console.log('[TTS] Blob received:', { blobSize: blob.size, totalTime: `${totalTime}ms` });

    return blob;
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error('[TTS] Request failed:', { error, elapsedTime: `${elapsedTime}ms` });
    throw error;
  }
}

/**
 * 오디오 재생을 관리하는 클래스
 */
interface AudioEventHandlers {
  onEnded?: () => void;
  onError?: (error: unknown) => void;
}

export class AudioManager {
  private audioRef: React.RefObject<HTMLAudioElement | null>;
  private isPlaying: boolean = false;

  constructor(audioRef: React.RefObject<HTMLAudioElement | null>) {
    this.audioRef = audioRef;
  }

  async playAudio(audioBlob: Blob, handlers?: AudioEventHandlers): Promise<void> {
    const audioUrl = URL.createObjectURL(audioBlob);

    // 기존 오디오 정리
    if (this.audioRef.current) {
      this.audioRef.current.pause();
      URL.revokeObjectURL(this.audioRef.current.src);
    }

    // 새 오디오 엘리먼트 생성
    const audio = new Audio(audioUrl);
    this.audioRef.current = audio;

    // iPhone Safari 최적화: 오디오 속성 설정
    audio.preload = 'auto';
    // iOS에서 인라인 재생 허용 (setAttribute 사용)
    audio.setAttribute('playsinline', 'true');
    (audio as any).playsInline = true; // iOS 호환성을 위한 추가 설정

    // 오디오 이벤트 리스너
    audio.onended = () => {
      this.isPlaying = false;
      URL.revokeObjectURL(audioUrl);
      handlers?.onEnded?.();
    };

    audio.onerror = (event) => {
      this.isPlaying = false;
      URL.revokeObjectURL(audioUrl);
      handlers?.onError?.(event);
      console.error('TTS audio playback failed:', event);
    };

    // 오디오 재생 전 0.3초 대기
    await new Promise(resolve => setTimeout(resolve, 300));

    // 오디오 재생 (iPhone Safari 최적화)
    try {
      // iOS Safari에서 오디오 컨텍스트 활성화 시도
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioContext = new AudioContextClass();
          if (audioContext.state === 'suspended') {
            try {
              await audioContext.resume();
            } catch (e) {
              console.warn('AudioContext resume failed:', e);
            }
          }
        }
      }

      // 오디오 재생 시도
      const playPromise = audio.play();
      
      // Promise가 반환되면 await, 그렇지 않으면 바로 처리
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      this.isPlaying = true;
    } catch (error) {
      this.isPlaying = false;
      const errorObj = error as Error & { name?: string };
      
      // iPhone Safari에서 자동 재생이 차단된 경우 조용히 처리
      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'NotSupportedError') {
        console.warn('TTS audio playback blocked by browser policy (likely iOS Safari):', errorObj.name);
        // 에러를 throw하지 않고 조용히 처리 (사용자 경험 개선)
        URL.revokeObjectURL(audioUrl);
        handlers?.onError?.(error);
        return;
      }
      
      URL.revokeObjectURL(audioUrl);
      handlers?.onError?.(error);
      throw error;
    }
  }

  stopAudio(): void {
    if (this.audioRef.current) {
      this.audioRef.current.pause();
      this.audioRef.current.currentTime = 0;
      URL.revokeObjectURL(this.audioRef.current.src);
    }
    this.isPlaying = false;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
