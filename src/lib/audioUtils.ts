/**
 * 오디오 관련 유틸리티 함수들
 */

import { AudioConstraints } from '@/types';

/**
 * WAV 형식으로 오디오 데이터를 생성하는 함수
 */
export function createWavBlob(audioBuffer: Float32Array, sampleRate: number): Blob {
  const length = audioBuffer.length;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  
  // WAV 헤더 작성
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);
  
  // 오디오 데이터 작성
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, audioBuffer[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * 모바일 브라우저 호환성을 위한 오디오 설정
 */
export function getAudioConstraints(): AudioConstraints {
  return {
    audio: {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      latency: 0.01
    }
  };
}

/**
 * 브라우저 호환성 체크
 */
export function checkBrowserSupport(): boolean {
  // HTTPS 체크
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    alert('음성 녹음 기능은 HTTPS 환경에서만 사용할 수 있습니다. 현재 HTTP 환경입니다.');
    return false;
  }

  // getUserMedia 지원 체크
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('이 브라우저는 음성 녹음을 지원하지 않습니다. 최신 브라우저를 사용해주세요.');
    return false;
  }

  // Web Audio API 지원 체크
  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    alert('이 브라우저는 Web Audio API를 지원하지 않습니다. 최신 브라우저를 사용해주세요.');
    return false;
  }

  return true;
}

/**
 * 마이크 권한 확인 및 요청
 */
export async function checkMicrophonePermission(): Promise<boolean> {
  try {
    if (!checkBrowserSupport()) {
      return false;
    }

    // 권한 상태 확인
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permission.state === 'denied') {
        alert('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
        return false;
      }
    }
    
    // 실제 마이크 접근 테스트
    const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
    
    // 즉시 스트림 종료 (권한 확인만을 위해)
    stream.getTracks().forEach(track => track.stop());
    
    return true;
  } catch (error) {
    console.error('마이크 권한 확인 오류:', error);
    handleMicrophoneError(error);
    return false;
  }
}

/**
 * 마이크 오류 처리
 */
export function handleMicrophoneError(error: any): void {
  let errorMessage = '마이크 접근 권한이 필요합니다.';
  
  if (error instanceof Error) {
    switch (error.name) {
      case 'NotAllowedError':
        errorMessage = '마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.';
        break;
      case 'NotFoundError':
        errorMessage = '마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.';
        break;
      case 'NotSupportedError':
        errorMessage = '이 브라우저는 음성 녹음을 지원하지 않습니다.';
        break;
      case 'NotReadableError':
        errorMessage = '마이크가 다른 애플리케이션에서 사용 중입니다. 다른 앱을 종료하고 다시 시도해주세요.';
        break;
      case 'OverconstrainedError':
        errorMessage = '마이크 설정이 지원되지 않습니다. 다른 마이크를 사용해주세요.';
        break;
    }
  }
  
  alert(errorMessage);
}



