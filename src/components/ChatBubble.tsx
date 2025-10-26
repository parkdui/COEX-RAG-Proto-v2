/**
 * ChatBubble 컴포넌트
 */

import React from 'react';
import { ChatBubbleProps } from '@/types';
import { getSegmentStyleClass, getSegmentIcon } from '@/lib/textSplitter';
import { SplitWords, TypingEffect } from '@/components/ui';

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
 * 토큰 정보 컴포넌트 (사용하지 않음)
 */
const TokenInfo: React.FC<{ tokens: any }> = ({ tokens }) => null;

/**
 * 히트 정보 컴포넌트 (사용하지 않음)
 */
const HitInfo: React.FC<{ hits: any[] }> = ({ hits }) => null;

/**
 * 분할된 메시지 세그먼트 컴포넌트
 */
const MessageSegment: React.FC<{
  segment: any;
  onPlayTTS?: (text: string) => void;
  isPlayingTTS: boolean;
  segmentIndex?: number;
}> = ({ segment, onPlayTTS, isPlayingTTS, segmentIndex = 0 }) => {
  const textStyle = {
    color: '#000',
    fontFamily: 'Pretendard Variable',
    fontSize: '16px',
    fontStyle: 'normal' as const,
    fontWeight: 400,
    lineHeight: '140%',
    letterSpacing: '-0.64px',
  };

  // 첫 번째 말풍선 스타일
  const firstBubbleStyle = {
    color: '#FFF',
    textAlign: 'center' as const,
    textShadow: '0 0 7.9px rgba(0, 0, 0, 0.16)',
    fontFamily: 'Pretendard Variable',
    fontSize: '22px',
    fontStyle: 'normal' as const,
    fontWeight: 600,
    lineHeight: '132%',
    letterSpacing: '-0.88px',
  };

  const isFirst = segmentIndex === 0;

  // 첫 번째 문장 추출 (. ! ? 등으로 구분)
  const getFirstSentence = (text: string) => {
    const match = text.match(/[^.!?]*(?:[.!?]|$)/);
    return match ? match[0].trim() : text.split(/[.!?]/)[0].trim();
  };

  const getRestOfText = (text: string) => {
    const match = text.match(/[^.!?]*(?:[.!?]|$)/);
    if (match && match[0].trim().length < text.length) {
      return text.substring(match[0].trim().length).trim();
    }
    return '';
  };

  const firstSentence = isFirst ? getFirstSentence(segment.text) : '';
  const restOfText = isFirst ? getRestOfText(segment.text) : segment.text;

  // 각 세그먼트마다 이전 세그먼트 애니메이션이 완료될 때까지 delay 추가
  const calculateDelay = (index: number, text: string) => {
    if (index === 0) return 0;
    // 이전 세그먼트들이 모두 나타나는 시간 계산
    const wordsPerBubble = 10; // 평균 단어 수
    const timePerBubble = 1.2 + (wordsPerBubble * 0.05) + 0.2; // duration + stagger + 여유
    return index * timePerBubble * 1000; // ms로 변환
  };

  const segmentDelay = calculateDelay(segmentIndex, segment.text);

  return (
    <div className={isFirst ? "flex justify-center" : "flex justify-start"}>
      <div
        className={isFirst ? "max-w-[90%] px-4 py-3" : "max-w-[86%] px-4 py-3"}
        style={{
          borderRadius: '32px',
          background: isFirst
            ? 'transparent'
            : 'linear-gradient(180deg, rgba(229, 111, 223, 0.20) 0.48%, rgba(255, 161, 235, 0.20) 100%)',
        }}
      >
        {isFirst ? (
          <>
            <div className="whitespace-pre-wrap break-words mb-3" style={firstBubbleStyle}>
              <SplitWords
                text={firstSentence}
                delay={segmentDelay}
                duration={1.2}
                stagger={0.05}
                animation="fadeIn"
              />
            </div>
            {restOfText && (
              <div className="whitespace-pre-wrap break-words" style={textStyle}>
                <SplitWords
                  text={restOfText}
                  delay={segmentDelay + 500}
                  duration={1.2}
                  stagger={0.05}
                  animation="fadeIn"
                />
              </div>
            )}
          </>
        ) : (
          <div className="whitespace-pre-wrap break-words" style={textStyle}>
            <SplitWords
              text={segment.text}
              delay={segmentDelay}
              duration={1.2}
              stagger={0.05}
              animation="fadeIn"
            />
          </div>
        )}
      </div>
    </div>
  );
};

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
}> = ({ message, isThinking, onPlayTTS, isPlayingTTS }) => {
  const textStyle = {
    color: '#000',
    fontFamily: 'Pretendard Variable',
    fontSize: '16px',
    fontStyle: 'normal' as const,
    fontWeight: 400,
    lineHeight: '140%',
    letterSpacing: '-0.64px',
  };

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className="max-w-[86%] px-4 py-3"
        style={message.role === 'assistant' ? {
          borderRadius: '32px',
          background: 'linear-gradient(180deg, rgba(229, 111, 223, 0.20) 0.48%, rgba(255, 161, 235, 0.20) 100%)',
        } : { backgroundColor: 'transparent' }}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.role === 'user' ? (
            // 사용자 메시지: 일반 텍스트
            <span style={textStyle}>{message.content}</span>
          ) : message.role === 'assistant' && !isThinking ? (
            // AI 메시지: SplitWords 애니메이션 효과
            <div style={textStyle}>
              <SplitWords
                text={message.content}
                duration={1.2}
                stagger={0.05}
                animation="fadeIn"
              />
            </div>
          ) : (
            <>
              <span style={textStyle}>{message.content}</span>
              {isThinking && (
                <span className="inline-block ml-2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
              )}
            </>
          )}
        </div>
        
        
        {message.tokens && <TokenInfo tokens={message.tokens} />}
        {message.hits && message.hits.length > 0 && <HitInfo hits={message.hits} />}
      </div>
    </div>
  );
};

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
