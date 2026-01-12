/**
 * 타입 정의 파일
 */

export interface TokenInfo {
  input: number;
  output: number;
  total: number;
}

export interface HitInfo {
  id: string;
  meta: Record<string, unknown>;
  text: string;
  score: number;
}

export interface TextSegment {
  text: string;
  type: 'greeting' | 'event_info' | 'general' | 'closing';
  index: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  tokens?: TokenInfo;
  hits?: HitInfo[];
  segments?: TextSegment[];
  thumbnailUrl?: string;
  siteUrl?: string;
  linkText?: string; // 사이트 링크 버튼에 표시될 텍스트
}

export interface ChatBubbleProps {
  message: Message;
  isThinking?: boolean;
  onPlayTTS?: (text: string) => void;
  isPlayingTTS?: boolean;
  isGlobalLoading?: boolean;
  typewriterVariant?: 'v1' | 'v2' | 'v3';
  glassStyleVariant?: 'v1' | 'v2';
  isRecording?: boolean;
  isFirstAnswer?: boolean; // 첫 번째 답변인지 여부
  onFeedback?: (feedback: 'negative' | 'positive') => void; // 피드백 콜백
}

export interface AudioConstraints {
  audio: {
    sampleRate: number;
    channelCount: number;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
    latency: number;
  };
}

export interface TTSRequest {
  text: string;
  speaker: string;
  speed: string;
  pitch: string;
  volume: string;
  alpha?: string;
  format: string;
}



