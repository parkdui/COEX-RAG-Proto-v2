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
}

export interface ChatBubbleProps {
  message: Message;
  isThinking?: boolean;
  onPlayTTS?: (text: string) => void;
  isPlayingTTS?: boolean;
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
  format: string;
}


