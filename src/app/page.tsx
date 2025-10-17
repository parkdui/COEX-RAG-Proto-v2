'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatBubble } from '@/components/ChatBubble';
import { Message } from '@/types';
import { createAssistantMessage, createErrorMessage, createUserMessage } from '@/lib/messageUtils';
import { createWavBlob, getAudioConstraints, checkMicrophonePermission, handleMicrophoneError, checkBrowserSupport } from '@/lib/audioUtils';
import { requestTTS, AudioManager } from '@/lib/ttsUtils';
import { Button, Input, Textarea, Card, CardHeader, CardContent, CardFooter, Badge, LoadingSpinner, SplitText, SplitWords } from '@/components/ui';

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
  const [autoPlayTTS, setAutoPlayTTS] = useState(false);
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

  const handleAutoTTS = useCallback((message: Message) => {
    if (autoPlayTTS && message.role === 'assistant' && message.content) {
      setTimeout(() => {
        if (message.segments && message.segments.length > 0) {
          playTTS(message.segments[0].text);
        } else {
          playTTS(message.content);
        }
      }, 500);
    }
  }, [autoPlayTTS, playTTS]);

  return {
    isPlayingTTS,
    setIsPlayingTTS,
    autoPlayTTS,
    setAutoPlayTTS,
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

export default function Home() {
  const chatRef = useRef<HTMLDivElement>(null);
  const chatState = useChatState();
  const voiceState = useVoiceRecording();
  const ttsState = useTTS();

  // 스크롤을 맨 아래로 이동
  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages, scrollToBottom]);

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
            ttsState.handleAutoTTS(assistantMessage);
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
        ttsState.handleAutoTTS(assistantMessage);
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      chatState.addErrorMessage('서버와의 통신에 실패했습니다.');
    } finally {
      chatState.setIsLoading(false);
    }
  }, [chatState, ttsState]);

  // 대화 시작
  const handleGoButton = useCallback(async () => {
    chatState.setIsGoButtonDisabled(true);
    chatState.setIsLoading(true);

    try {
      const data = await apiRequests.sendChatRequest(
        "안녕하세요! COEX 이벤트 안내 AI입니다. 무엇을 도와드릴까요?",
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
        ttsState.handleAutoTTS(assistantMessage);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-800/80 backdrop-blur-md border-b border-gray-700/50 px-4 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <SplitText
              text="COEX 이벤트 안내"
              className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              delay={0.2}
              duration={1.2}
              stagger={0.1}
              animation="slideUp"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={ttsState.autoPlayTTS ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => ttsState.setAutoPlayTTS(!ttsState.autoPlayTTS)}
              className="flex items-center gap-2"
            >
              {ttsState.autoPlayTTS ? '🔊' : '🔇'}
              <span className="hidden sm:inline">
                {ttsState.autoPlayTTS ? '자동재생' : '수동재생'}
              </span>
            </Button>
            <Badge variant="success" size="sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                온라인
              </div>
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full min-h-0 gap-4 p-4">
        {/* Sidebar */}
        <aside className="hidden lg:block w-80">
          <Card className="h-full">
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">System Prompt</h3>
              <p className="text-sm text-gray-400">AI의 행동을 정의하는 프롬프트를 설정하세요</p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={chatState.systemPrompt}
                onChange={(e) => chatState.setSystemPrompt(e.target.value)}
                disabled={chatState.isGoButtonDisabled}
                rows={8}
                placeholder="System Prompt를 입력하세요"
                className="min-h-[200px]"
              />
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleGoButton}
                disabled={chatState.isGoButtonDisabled}
                isLoading={chatState.isGoButtonDisabled}
                className="w-full"
                size="lg"
              >
                {chatState.isGoButtonDisabled ? '대화 중...' : '대화 시작'}
              </Button>
            </CardFooter>
          </Card>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="flex-1 overflow-hidden p-0">
              <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
                {chatState.messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
                      <span className="text-2xl">🤖</span>
                    </div>
                    <SplitText
                      text="COEX 이벤트 안내 AI"
                      className="text-xl font-semibold text-gray-300 mb-2"
                      delay={0.5}
                      duration={1.0}
                      stagger={0.1}
                      animation="slideUp"
                    />
                    <SplitWords
                      text="안녕하세요! COEX에서 열리는 다양한 이벤트에 대해 궁금한 것이 있으시면 언제든지 물어보세요."
                      className="text-gray-400 mb-6 max-w-md"
                      delay={1.2}
                      duration={0.8}
                      stagger={0.08}
                      animation="fadeIn"
                    />
                    <Button
                      onClick={handleGoButton}
                      disabled={chatState.isGoButtonDisabled}
                      isLoading={chatState.isGoButtonDisabled}
                      size="lg"
                      className="px-8"
                    >
                      대화 시작하기
                    </Button>
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
                    <div className="flex items-center gap-3 text-gray-400">
                      <LoadingSpinner size="sm" />
                      <span>AI가 답변을 생성하고 있습니다...</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="border-t border-gray-700/50 bg-gray-800/50">
              <form onSubmit={handleSubmit} className="w-full">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={chatState.inputValue}
                    onChange={(e) => chatState.setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="메시지를 입력하세요..."
                    disabled={chatState.isLoading || voiceState.isProcessingVoice}
                    className="flex-1"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  <Button
                    type="button"
                    variant={voiceState.isRecording ? 'danger' : 'secondary'}
                    size="md"
                    onClick={handleMicClick}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    disabled={chatState.isLoading || voiceState.isProcessingVoice || voiceState.isRequestingPermission}
                    isLoading={voiceState.isProcessingVoice || voiceState.isRequestingPermission}
                    className="px-4"
                    title={voiceState.isRecording ? '녹음 중지' : voiceState.isRequestingPermission ? '권한 요청 중...' : '음성 입력'}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {voiceState.isRecording ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V7z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                    )}
                  </Button>
                  <Button
                    type="submit"
                    disabled={chatState.isLoading || !chatState.inputValue.trim() || voiceState.isProcessingVoice}
                    size="md"
                    className="px-6"
                  >
                    보내기
                  </Button>
                </div>
                {voiceState.isRequestingPermission && (
                  <div className="mt-3 text-center">
                    <Badge variant="warning" size="sm">
                      🔐 마이크 권한 요청 중... 브라우저에서 권한을 허용해주세요
                    </Badge>
                  </div>
                )}
                {voiceState.isRecording && (
                  <div className="mt-3 text-center">
                    <Badge variant="error" size="sm">
                      🎤 녹음 중... 최소 1초 이상 말씀해주세요
                    </Badge>
                  </div>
                )}
                {voiceState.isProcessingVoice && (
                  <div className="mt-3 text-center">
                    <Badge variant="info" size="sm">
                      🔄 음성을 텍스트로 변환 중...
                    </Badge>
                  </div>
                )}
              </form>
            </CardFooter>
          </Card>
        </main>
      </div>
    </div>
  );
}
