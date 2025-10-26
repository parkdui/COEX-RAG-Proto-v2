'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatBubble } from '@/components/ChatBubble';
import { Message } from '@/types';
import { createAssistantMessage, createErrorMessage, createUserMessage } from '@/lib/messageUtils';
import { createWavBlob, getAudioConstraints, checkMicrophonePermission, handleMicrophoneError, checkBrowserSupport } from '@/lib/audioUtils';
import { requestTTS, AudioManager } from '@/lib/ttsUtils';
import { Button, Input, Textarea, Card, CardHeader, CardContent, CardFooter, Badge, LoadingSpinner } from '@/components/ui';
import AnimatedLogo from '@/components/ui/AnimatedLogo';

/**
 * 커스텀 훅: 채팅 상태 관리
 */
const useChatState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoButtonDisabled, setIsGoButtonDisabled] = useState(false);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
    setChatHistory(prev => [...prev, message]);
  }, []);

  const addErrorMessage = useCallback((error: string) => {
    const errorMessage = createErrorMessage(error);
    addMessage(errorMessage);
  }, [addMessage]);

  return {
    messages,
    chatHistory,
    inputValue,
    setInputValue,
    systemPrompt,
    setSystemPrompt,
    isLoading,
    setIsLoading,
    isGoButtonDisabled,
    setIsGoButtonDisabled,
    addMessage,
    addErrorMessage
  };
};

/**
 * 커스텀 훅: 음성 녹음 상태 관리
 */
const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  return {
    isRecording,
    setIsRecording,
    isProcessingVoice,
    setIsProcessingVoice,
    isRequestingPermission,
    setIsRequestingPermission
  };
};

/**
 * 커스텀 훅: TTS 상태 관리
 */
const useTTS = () => {
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [autoPlayTTS] = useState(true); // 자동 재생 활성화
  const lastTTSTriggerRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioManager = useMemo(() => new AudioManager(audioRef), []);

  const playTTS = useCallback(async (text: string) => {
    if (audioManager.getIsPlaying()) {
      audioManager.stopAudio();
      setIsPlayingTTS(false);
      return;
    }

    try {
      setIsPlayingTTS(true);
      const audioBlob = await requestTTS(text);
      await audioManager.playAudio(audioBlob);
    } catch (error) {
      console.error('TTS error:', error);
      setIsPlayingTTS(false);
      alert('음성 재생에 실패했습니다. 다시 시도해주세요.');
    }
  }, [audioManager]);

  const handleAutoTTS = useCallback((message: Message, messageIndex: number) => {
    if (autoPlayTTS && message.role === 'assistant' && message.content) {
      // 이미 처리한 메시지면 무시
      const messageId = `${messageIndex}-${message.content.substring(0, 20)}`;
      if (lastTTSTriggerRef.current === messageId) {
        return;
      }
      
      lastTTSTriggerRef.current = messageId;
      
      // 텍스트 애니메이션이 완료된 후 첫 번째 말풍선 텍스트만 TTS 재생
      let textToPlay = '';
      
      if (message.segments && message.segments.length > 0) {
        // 세그먼트가 있으면 첫 번째 세그먼트만 재생
        textToPlay = message.segments[0].text;
      } else {
        // 세그먼트가 없으면 전체 내용 재생
        textToPlay = message.content;
      }
      
      const wordCount = textToPlay.split(' ').length;
      const animationDelay = (1.2 + wordCount * 0.05) * 1000;
      
      setTimeout(() => {
        playTTS(textToPlay);
      }, animationDelay);
    }
  }, [autoPlayTTS, playTTS]);

  return {
    isPlayingTTS,
    setIsPlayingTTS,
    playTTS,
    handleAutoTTS
  };
};

/**
 * API 요청 함수들
 */
const apiRequests = {
  async sendChatRequest(question: string, systemPrompt: string, history: Message[]) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, systemPrompt, history }),
    });
    return response.json();
  },

  async sendSTTRequest(audioBlob: Blob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    
    const response = await fetch('/api/stt', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  }
};

// 추천 메시지 리스트
const recommendationMessages = [
  "친구와 함께 먹기 좋은 식당을 추천해줘",
  "컨퍼런스를 관람하며 쉬기 좋은 곳을 추천해줘",
  "KPOP 관련 구경거리를 추천해줘",
  "데이트하기 좋은 행사 추천해줘",
  "홀로 방문하기 좋은 곳 추천해줘",
  "쇼핑하기 좋은 곳을 찾고 있어",
  "조용히 작업할 수 있는 카페를 찾고 있어",
  "즐길 거리가 많은 핫플레이스를 알려줘",
  "문화적인 경험을 할 수 있는 곳을 추천해줘",
  "트렌디한 음식점을 찾고 있어"
];

export default function MainPageV1() {
  const chatRef = useRef<HTMLDivElement>(null);
  const chatState = useChatState();
  const voiceState = useVoiceRecording();
  const ttsState = useTTS();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 랜덤으로 3개 선택
  const getRandomRecommendations = useCallback(() => {
    const shuffled = [...recommendationMessages].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  const [randomRecommendations, setRandomRecommendations] = useState(getRandomRecommendations);

  // 스크롤을 맨 아래로 이동
  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages, scrollToBottom]);

  // 마지막 AI 메시지에 대해 TTS 자동 재생
  useEffect(() => {
    if (chatState.messages.length > 0) {
      const lastMessage = chatState.messages[chatState.messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content) {
        const messageIndex = chatState.messages.length - 1;
        ttsState.handleAutoTTS(lastMessage, messageIndex);
      }
    }
  }, [chatState.messages, ttsState.handleAutoTTS]);

  // 시스템 프롬프트 로드
  useEffect(() => {
    fetch('/LLM/system_prompt.txt')
      .then(response => response.text())
      .then(text => chatState.setSystemPrompt(text))
      .catch(error => console.error('시스템 프롬프트 로드 실패:', error));
  }, [chatState]);

  // 오디오 처리 및 STT
  const processAudio = useCallback(async (audioBlob: Blob) => {
    voiceState.setIsProcessingVoice(true);
    
    try {
      const result = await apiRequests.sendSTTRequest(audioBlob);

      if (result.success && result.text) {
        chatState.setInputValue(result.text);
        
        const userMessage = createUserMessage(result.text);
        chatState.addMessage(userMessage);

        // AI 응답 요청
        chatState.setIsLoading(true);
        try {
          const historyToSend = chatState.chatHistory.slice(-10);
          const chatData = await apiRequests.sendChatRequest(result.text, chatState.systemPrompt, historyToSend);
          
          if (chatData.error) {
            chatState.addErrorMessage(chatData.error);
          } else {
            const assistantMessage = createAssistantMessage({
              answer: chatData.answer,
              tokens: chatData.tokens,
              hits: chatData.hits,
              defaultAnswer: '(응답 없음)'
            });
            chatState.addMessage(assistantMessage);
          }
        } catch (error) {
          console.error('AI 응답 요청 실패:', error);
          chatState.addErrorMessage('서버와의 통신에 실패했습니다.');
        } finally {
          chatState.setIsLoading(false);
        }
      } else {
        if (result.details && result.details.includes('STT007')) {
          alert('음성이 너무 짧습니다. 최소 1초 이상 말씀해주세요.');
        } else {
          alert('음성 인식에 실패했습니다. 다시 시도해주세요.');
        }
      }
    } catch (error) {
      console.error('STT 처리 오류:', error);
      alert('음성 처리 중 오류가 발생했습니다.');
    } finally {
      voiceState.setIsProcessingVoice(false);
    }
  }, [chatState, voiceState, ttsState]);

  // 음성 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      if (!checkBrowserSupport()) return;

      const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({
        sampleRate: 16000,
        latencyHint: 'interactive'
      });
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      const audioData: Float32Array[] = [];
      
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        audioData.push(new Float32Array(inputData));
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      const stopRecording = () => {
        processor.disconnect();
        source.disconnect();
        audioContext.close();
        stream.getTracks().forEach(track => track.stop());
        
        const totalLength = audioData.reduce((sum, chunk) => sum + chunk.length, 0);
        const combinedAudio = new Float32Array(totalLength);
        let offset = 0;
        
        for (const chunk of audioData) {
          combinedAudio.set(chunk, offset);
          offset += chunk.length;
        }
        
        const wavBlob = createWavBlob(combinedAudio, 16000);
        processAudio(wavBlob);
        voiceState.setIsRecording(false);
      };
      
      (window as any).stopRecording = stopRecording;
      voiceState.setIsRecording(true);
      
    } catch (error) {
      console.error('마이크 접근 오류:', error);
      handleMicrophoneError(error);
    }
  }, [voiceState, processAudio]);

  // 음성 녹음 중지
  const stopRecording = useCallback(() => {
    if (voiceState.isRecording && (window as any).stopRecording) {
      (window as any).stopRecording();
    }
  }, [voiceState.isRecording]);

  // 마이크 버튼 클릭 핸들러
  const handleMicClick = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (voiceState.isRecording) {
      stopRecording();
    } else {
      const hasPermission = await checkMicrophonePermission();
      if (hasPermission) {
        startRecording();
      }
    }
  }, [voiceState.isRecording, stopRecording, startRecording]);

  // 터치 이벤트 핸들러
  const handleTouchStart = useCallback(async (e: React.TouchEvent) => {
    e.preventDefault();
    if (!voiceState.isRecording) {
      const hasPermission = await checkMicrophonePermission();
      if (hasPermission) {
        startRecording();
      }
    }
  }, [voiceState.isRecording, startRecording]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (voiceState.isRecording) {
      stopRecording();
    }
  }, [voiceState.isRecording, stopRecording]);

  // 메시지 전송
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatState.inputValue.trim() || chatState.isLoading) return;

    const userMessage = createUserMessage(chatState.inputValue);
    chatState.addMessage(userMessage);
    chatState.setInputValue('');
    chatState.setIsLoading(true);

    try {
      const historyToSend = chatState.chatHistory.slice(-10);
      const data = await apiRequests.sendChatRequest(chatState.inputValue, chatState.systemPrompt, historyToSend);
      
      if (data.error) {
        chatState.addErrorMessage(data.error);
      } else {
        const assistantMessage = createAssistantMessage({
          answer: data.answer,
          tokens: data.tokens,
          hits: data.hits,
          defaultAnswer: '(응답 없음)'
        });
        chatState.addMessage(assistantMessage);
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      chatState.addErrorMessage('서버와의 통신에 실패했습니다.');
    } finally {
      chatState.setIsLoading(false);
    }
  }, [chatState]);

  // 대화 시작
  const handleGoButton = useCallback(async () => {
    chatState.setIsGoButtonDisabled(true);
    chatState.setIsLoading(true);

    try {
      const data = await apiRequests.sendChatRequest(
        "안녕하세요! 전 이솔이라고 해요~ 오늘 어떤 무드로 코엑스를 즐기고 싶으신가요?",
        chatState.systemPrompt,
        []
      );
      
      if (data.error) {
        chatState.addErrorMessage(data.error);
      } else {
        const assistantMessage = createAssistantMessage({
          answer: data.answer,
          tokens: data.tokens,
          hits: data.hits,
          defaultAnswer: '안녕하세요! COEX 이벤트 안내 AI입니다. 무엇을 도와드릴까요?'
        });
        chatState.addMessage(assistantMessage);
      }
    } catch (error) {
      console.error('대화 시작 실패:', error);
      chatState.addErrorMessage('서버와의 통신에 실패했습니다.');
    } finally {
      chatState.setIsLoading(false);
      chatState.setIsGoButtonDisabled(false);
    }
  }, [chatState, ttsState]);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.nativeEvent as any).isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  // 추천 버튼 클릭 핸들러
  const handleRecommendationClick = useCallback(async (recommendation: string) => {
    if (chatState.isLoading) return;
    
    const userMessage = createUserMessage(recommendation);
    chatState.addMessage(userMessage);
    chatState.setIsLoading(true);

    try {
      const historyToSend = chatState.chatHistory.slice(-10);
      const data = await apiRequests.sendChatRequest(recommendation, chatState.systemPrompt, historyToSend);
      
      if (data.error) {
        chatState.addErrorMessage(data.error);
      } else {
        const assistantMessage = createAssistantMessage({
          answer: data.answer,
          tokens: data.tokens,
          hits: data.hits,
          defaultAnswer: '(응답 없음)'
        });
        chatState.addMessage(assistantMessage);
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      chatState.addErrorMessage('서버와의 통신에 실패했습니다.');
    } finally {
      chatState.setIsLoading(false);
    }
  }, [chatState]);

  return (
    <div className="min-h-screen flex flex-col safe-area-inset overscroll-contain relative">
      {/* Gradient 배경 */}
      <div className="fixed inset-0 animate-gradient"></div>
      
      {/* 로고 - 상단에 고정 */}
      <div className="fixed top-0 left-0 right-0 z-30 flex justify-center pt-4 pb-4">
        <AnimatedLogo />
      </div>
      
      {/* Main Content */}
      <main className="relative flex-1 flex flex-col min-h-0 pb-32 pt-24">
        <div className="flex-1 overflow-hidden">
          <div ref={chatRef} className="h-full overflow-y-auto p-6 space-y-4 overscroll-contain">
            {chatState.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                {/* AI 환영 메시지 */}
                <div 
                  style={{ 
                    color: '#FFF', 
                    textAlign: 'center', 
                    fontFamily: 'Pretendard Variable', 
                    fontSize: '22px', 
                    fontStyle: 'normal', 
                    fontWeight: 600, 
                    lineHeight: '132%', 
                    letterSpacing: '-0.88px' 
                  }}
                  className="p-6"
                >
                  <div>안녕하세요! 전 이솔이라고 해요~</div>
                  <div>오늘 어떤 무드로 코엑스를 즐기고 싶으신가요?</div>
                </div>
                
                {/* 진행 표시기 */}
                <div className="flex gap-2 mb-8">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                  <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                  <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                  <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                </div>
              </div>
            )}
            {chatState.messages.map((message, index) => (
              <ChatBubble 
                key={index} 
                message={message} 
                onPlayTTS={ttsState.playTTS}
                isPlayingTTS={ttsState.isPlayingTTS}
              />
            ))}
            {chatState.isLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <LoadingSpinner size="sm" />
                  <span className="text-base">이솔이 생각 중입니다...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 하단 추천 버튼들 */}
      <div className="fixed bottom-20 left-0 right-0 z-20 px-6">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {randomRecommendations.map((message, index) => (
            <button
              key={index}
              onClick={() => handleRecommendationClick(message)}
              disabled={chatState.isLoading}
              className="w-full p-2 transition-opacity duration-200 touch-manipulation active:scale-95 disabled:opacity-50"
              style={{
                textAlign: 'center',
                fontFamily: 'Pretendard Variable',
                fontSize: '15px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '130%',
                letterSpacing: '-0.6px',
                background: 'linear-gradient(0deg, #FFF 23.15%, rgba(255, 255, 255, 0.12) 125%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {message}
            </button>
          ))}
        </div>
      </div>

      {/* 하단 고정 입력창 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 safe-bottom">
        <form onSubmit={handleSubmit} className="w-full">
          <div 
            className="flex items-center shadow-lg"
            style={{
              borderRadius: '22px',
              background: 'linear-gradient(90deg, rgba(211, 178, 226, 0.41) 0%, rgba(255, 255, 255, 0.55) 76.44%, rgba(223, 199, 234, 0.32) 100%)',
            }}
          >
            <input
              type="text"
              value={chatState.inputValue}
              onChange={(e) => chatState.setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지 보내기..."
              disabled={chatState.isLoading || voiceState.isProcessingVoice}
              style={{
                color: '#FFF',
                fontFamily: 'Pretendard Variable',
                fontSize: '15px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '150%',
              }}
              className="flex-1 px-4 py-3 bg-transparent placeholder-white/70 focus:outline-none"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <button
              type="button"
              onClick={handleMicClick}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              disabled={chatState.isLoading || voiceState.isProcessingVoice || voiceState.isRequestingPermission}
              className="px-4 py-3 touch-manipulation disabled:opacity-50"
              title={voiceState.isRecording ? '녹음 중지' : voiceState.isRequestingPermission ? '권한 요청 중...' : '음성 입력'}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {voiceState.isRecording ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V7z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          {voiceState.isRequestingPermission && (
            <div className="mt-3 text-center">
              <div className="inline-block bg-white/30 backdrop-blur-md rounded-lg px-3 py-1 text-sm text-gray-700">
                🔐 마이크 권한 요청 중...
              </div>
            </div>
          )}
          {voiceState.isRecording && (
            <div className="mt-3 text-center">
              <div className="inline-block bg-white/30 backdrop-blur-md rounded-lg px-3 py-1 text-sm text-gray-700">
                🎤 녹음 중... 1초 이상 말씀해주세요
              </div>
            </div>
          )}
          {voiceState.isProcessingVoice && (
            <div className="mt-3 text-center">
              <div className="inline-block bg-white/30 backdrop-blur-md rounded-lg px-3 py-1 text-sm text-gray-700">
                🔄 음성을 텍스트로 변환 중...
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
