/**
 * ChatBubble 컴포넌트
 */

import React from 'react';
import { ChatBubbleProps } from '@/types';
import { getSegmentStyleClass, getSegmentIcon } from '@/lib/textSplitter';
import { SplitText, SplitWords, TypingEffect } from '@/components/ui';

/**
 * TTS 버튼 컴포넌트
 */
const TTSButton: React.FC<{
  text: string;
  onPlayTTS: (text: string) => void;
  isPlayingTTS: boolean;
  title?: string;
}> = ({ text, onPlayTTS, isPlayingTTS, title = '음성으로 듣기' }) => (
  <div className="mt-2 flex items-center gap-2">
    <button
      onClick={() => onPlayTTS(text)}
      disabled={isPlayingTTS}
      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
        isPlayingTTS 
          ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
      title={isPlayingTTS ? '음성 재생 중...' : title}
    >
      {isPlayingTTS ? (
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          재생 중...
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.794L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.794a1 1 0 011.617.794zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
          🔊 듣기
        </span>
      )}
    </button>
  </div>
);

/**
 * 토큰 정보 컴포넌트
 */
const TokenInfo: React.FC<{ tokens: any }> = ({ tokens }) => (
  <div className="mt-2 text-xs text-gray-400">
    📊 토큰 사용량: 입력 {tokens.input.toLocaleString()} / 
    출력 {tokens.output.toLocaleString()} / 
    총 {tokens.total.toLocaleString()}
  </div>
);

/**
 * 히트 정보 컴포넌트
 */
const HitInfo: React.FC<{ hits: any[] }> = ({ hits }) => (
  <details className="mt-2 text-xs text-gray-400">
    <summary className="cursor-pointer">참조한 이벤트 ({hits.length})</summary>
    <pre className="mt-2 p-2 bg-gray-900 rounded text-xs overflow-x-auto">
      {hits.map((hit, i) => 
        `[${i + 1}] ${hit.meta?.title || ''} | ${hit.meta?.date || ''} | ${hit.meta?.venue || ''}`
      ).join('\n')}
    </pre>
  </details>
);

/**
 * 분할된 메시지 세그먼트 컴포넌트
 */
const MessageSegment: React.FC<{
  segment: any;
  onPlayTTS?: (text: string) => void;
  isPlayingTTS: boolean;
  segmentIndex?: number;
}> = ({ segment, onPlayTTS, isPlayingTTS, segmentIndex = 0 }) => (
  <div className="flex justify-start">
    <div className={`max-w-[86%] rounded-2xl px-4 py-3 bg-gray-800 text-white border border-gray-600 ${getSegmentStyleClass(segment.type)}`}>
      <div className="flex items-start gap-2">
        <span className="text-sm opacity-70 mt-0.5">{getSegmentIcon(segment.type)}</span>
        <div className="flex-1">
          <div className="whitespace-pre-wrap break-words">
            <SplitWords
              text={segment.text}
              delay={segmentIndex * 0.3}
              duration={0.8}
              stagger={0.05}
              animation="slideUp"
            />
          </div>
          
          {onPlayTTS && segment.text && (
            <TTSButton
              text={segment.text}
              onPlayTTS={onPlayTTS}
              isPlayingTTS={isPlayingTTS}
              title="이 부분 음성으로 듣기"
            />
          )}
        </div>
      </div>
    </div>
  </div>
);

/**
 * 분할된 메시지 컴포넌트
 */
const SegmentedMessage: React.FC<{
  message: any;
  onPlayTTS?: (text: string) => void;
  isPlayingTTS: boolean;
}> = ({ message, onPlayTTS, isPlayingTTS }) => (
  <div className="flex flex-col gap-2 mb-4">
    {message.segments.map((segment: any, segmentIndex: number) => (
      <MessageSegment
        key={segmentIndex}
        segment={segment}
        onPlayTTS={onPlayTTS}
        isPlayingTTS={isPlayingTTS}
        segmentIndex={segmentIndex}
      />
    ))}
    
    {message.tokens && <TokenInfo tokens={message.tokens} />}
    {message.hits && message.hits.length > 0 && <HitInfo hits={message.hits} />}
  </div>
);

/**
 * 단일 메시지 컴포넌트
 */
const SingleMessage: React.FC<{
  message: any;
  isThinking: boolean;
  onPlayTTS?: (text: string) => void;
  isPlayingTTS: boolean;
}> = ({ message, isThinking, onPlayTTS, isPlayingTTS }) => (
  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`max-w-[86%] rounded-2xl px-4 py-3 ${
      message.role === 'user' 
        ? 'bg-gray-700 text-white' 
        : 'bg-gray-800 text-white border border-gray-600'
    }`}>
      <div className="whitespace-pre-wrap break-words">
        {message.role === 'assistant' && !isThinking ? (
          <TypingEffect
            text={message.content}
            speed={30}
            delay={0.2}
            showCursor={false}
          />
        ) : (
          <>
            {message.content}
            {isThinking && (
              <span className="inline-block ml-2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
            )}
          </>
        )}
      </div>
      
      {message.role === 'assistant' && onPlayTTS && message.content && (
        <TTSButton
          text={message.content}
          onPlayTTS={onPlayTTS}
          isPlayingTTS={isPlayingTTS}
        />
      )}
      
      {message.tokens && <TokenInfo tokens={message.tokens} />}
      {message.hits && message.hits.length > 0 && <HitInfo hits={message.hits} />}
    </div>
  </div>
);

/**
 * 메인 ChatBubble 컴포넌트
 */
export const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  message, 
  isThinking = false, 
  onPlayTTS, 
  isPlayingTTS = false 
}) => {
  // AI 메시지이고 segments가 있으면 분할된 말풍선들을 렌더링
  if (message.role === 'assistant' && message.segments && message.segments.length > 1) {
    return (
      <SegmentedMessage
        message={message}
        onPlayTTS={onPlayTTS}
        isPlayingTTS={isPlayingTTS}
      />
    );
  }

  // 기존 단일 말풍선 렌더링 (사용자 메시지 또는 분할되지 않은 AI 메시지)
  return (
    <SingleMessage
      message={message}
      isThinking={isThinking}
      onPlayTTS={onPlayTTS}
      isPlayingTTS={isPlayingTTS}
    />
  );
};
