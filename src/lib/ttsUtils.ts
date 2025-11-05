/**
 * TTS 관련 유틸리티 함수들
 */

import { TTSRequest } from '@/types';

/**
 * TTS API 요청을 보내는 함수
 */
export async function requestTTS(text: string): Promise<Blob> {
  const request: TTSRequest = {
    text,
    speaker: 'vyuna',
    speed: '-1', // 기본 속도(0)보다 1.2배 빠르게 (약 20% 증가)
    pitch: '3',
    volume: '0',
    alpha: '1',
    format: 'mp3'
  };

  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`TTS API failed: ${response.status}`);
  }

  return response.blob();
}

/**
 * 오디오 재생을 관리하는 클래스
 */
export class AudioManager {
  private audioRef: React.RefObject<HTMLAudioElement | null>;
  private isPlaying: boolean = false;

  constructor(audioRef: React.RefObject<HTMLAudioElement | null>) {
    this.audioRef = audioRef;
  }

  async playAudio(audioBlob: Blob): Promise<void> {
    const audioUrl = URL.createObjectURL(audioBlob);

    // 기존 오디오 정리
    if (this.audioRef.current) {
      this.audioRef.current.pause();
      URL.revokeObjectURL(this.audioRef.current.src);
    }

    // 새 오디오 엘리먼트 생성
    const audio = new Audio(audioUrl);
    this.audioRef.current = audio;

    // 오디오 이벤트 리스너
    audio.onended = () => {
      this.isPlaying = false;
      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = () => {
      this.isPlaying = false;
      URL.revokeObjectURL(audioUrl);
      console.error('TTS audio playback failed');
    };

    // 오디오 재생
    await audio.play();
    this.isPlaying = true;
  }

  stopAudio(): void {
    if (this.audioRef.current) {
      this.audioRef.current.pause();
      this.audioRef.current.currentTime = 0;
    }
    this.isPlaying = false;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
