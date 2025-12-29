'use client';

import React from 'react';
import { Message } from '@/types';
import { ChatBubble } from '@/components/ChatBubble';
import { SplitWords } from '@/components/ui';
import TextPressure from '@/components/ui/TextPressure';
import { isInfoRequestQuestion } from '../utils/questionUtils';

interface EndMessageScreenProps {
  onNextToSummary: () => void;
}

export const EndMessageScreen: React.FC<EndMessageScreenProps> = ({ onNextToSummary }) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center">
      <div
        style={{
          fontFamily: 'Pretendard Variable',
          fontSize: '22px',
          fontWeight: 400,
          color: '#000',
          textAlign: 'center',
          lineHeight: '140%',
          letterSpacing: '-0.88px',
          marginBottom: '40px',
          padding: '0 24px',
          whiteSpace: 'pre-line',
        }}
      >
        <div>
          <SplitWords
            text="오늘의 대화가 모두 끝났어요."
            delay={0}
            duration={1.2}
            stagger={0.05}
            animation="fadeIn"
          />
        </div>
        <div>
          <SplitWords
            text="제가 안내한 내용을 정리해드릴게요."
            delay={0}
            duration={1.2}
            stagger={0.05}
            animation="fadeIn"
          />
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm safe-bottom">
        <div className="px-6 pb-8 pt-4">
          <button
            onClick={onNextToSummary}
            className="w-full touch-manipulation active:scale-95 flex justify-center items-center"
            style={{
              height: '56px',
              padding: '15px 85px',
              borderRadius: '68px',
              background: 'rgba(135, 254, 200, 0.75)',
              boxShadow: '0 0 50px 0 #EEE inset',
              color: '#000',
              textAlign: 'center',
              fontFamily: 'Pretendard Variable',
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: '110%',
              letterSpacing: '-0.64px',
            }}
          >
            대화 요약 보러가기
          </button>
        </div>
      </div>
    </div>
  );
};

export const FinalMessageScreen: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 flex flex-col justify-end pb-20 px-6"
      style={{
        background: '#D0ECE6',
        zIndex: 10,
      }}
    >
      <div className="text-left">
        <TextPressure
          text="COEX에서"
          trigger="auto"
          duration={1.2}
          style={{
            color: '#000',
            fontFamily: 'Pretendard Variable',
            fontSize: '32pt',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: '130%',
            letterSpacing: '-1.8px',
            display: 'block',
            marginBottom: '0',
          }}
        />
        <TextPressure
          text="즐거운 시간"
          trigger="auto"
          duration={1.2}
          style={{
            color: '#000',
            fontFamily: 'Pretendard Variable',
            fontSize: '32pt',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: '130%',
            letterSpacing: '-1.8px',
            display: 'block',
            marginBottom: '0',
          }}
        />
        <TextPressure
          text="보내세요!"
          trigger="auto"
          duration={1.2}
          style={{
            color: '#000',
            fontFamily: 'Pretendard Variable',
            fontSize: '32pt',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: '130%',
            letterSpacing: '-1.8px',
            display: 'block',
            marginBottom: '0',
          }}
        />
      </div>
    </div>
  );
};

interface KeywordDetailScreenProps {
  selectedKeyword: string;
  selectedKeywordTurn: number;
  messages: Message[];
  onBackToKeywords: () => void;
  onPlayTTS: (text: string) => void;
  isPlayingTTS: boolean;
  typewriterVariant: 'v1' | 'v2' | 'v3';
}

export const KeywordDetailScreen: React.FC<KeywordDetailScreenProps> = ({
  selectedKeyword: _selectedKeyword,
  selectedKeywordTurn,
  messages,
  onBackToKeywords,
  onPlayTTS,
  isPlayingTTS,
  typewriterVariant,
}) => {
  let currentTurn = 0;
  let targetAssistantMessage: Message | null = null;
  
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user') {
      const assistantMessage = messages[i + 1];
      if (assistantMessage && assistantMessage.role === 'assistant') {
        if (isInfoRequestQuestion(messages[i].content)) {
          currentTurn++;
          if (currentTurn === selectedKeywordTurn) {
            targetAssistantMessage = assistantMessage;
            break;
          }
        }
      }
    }
  }

  return (
    <div 
      className="fixed inset-0"
      style={{
        background: '#D0ECE6',
        zIndex: 10,
      }}
    >
      <div 
        className="absolute inset-0"
        style={{
          paddingTop: '15vh',
          paddingBottom: '20vh',
          paddingLeft: '20px',
          paddingRight: '20px',
          overflowY: 'auto',
        }}
      >
        <div className="mb-4">
          <button
            onClick={onBackToKeywords}
            className="touch-manipulation active:scale-95"
            style={{
              fontFamily: 'Pretendard Variable',
              fontSize: '16px',
              fontWeight: 500,
              color: '#4E5363',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '20px',
              border: 'none',
            }}
          >
            ← 뒤로가기
          </button>
        </div>
        
        {targetAssistantMessage ? (
          <ChatBubble 
            message={targetAssistantMessage}
            onPlayTTS={onPlayTTS}
            isPlayingTTS={isPlayingTTS}
            isGlobalLoading={false}
            typewriterVariant={typewriterVariant}
          />
        ) : null}
      </div>
    </div>
  );
};

