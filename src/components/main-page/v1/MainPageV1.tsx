'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatBubble } from '@/components/ChatBubble';
import { Message } from '@/types';
import { createAssistantMessage, createErrorMessage, createUserMessage } from '@/lib/messageUtils';
import { createWavBlob, getAudioConstraints, checkMicrophonePermission, handleMicrophoneError, checkBrowserSupport } from '@/lib/audioUtils';
import { requestTTS, AudioManager } from '@/lib/ttsUtils';
import { Button, Input, Textarea, Card, CardHeader, CardContent, CardFooter, Badge, LoadingSpinner, SplitWords } from '@/components/ui';
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
      
      // 첫 번째 말풍선 텍스트만 TTS 재생
      let textToPlay = '';
      
      if (message.segments && message.segments.length > 0) {
        // 세그먼트가 있으면 첫 번째 세그먼트만 재생
        textToPlay = message.segments[0].text;
      } else {
        // 세그먼트가 없으면 전체 내용 재생
        textToPlay = message.content;
      }
      
      // TTS를 즉시 재생 (텍스트 애니메이션 시작 전)
      playTTS(textToPlay);
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
  const [questionCount, setQuestionCount] = useState(0);
  const [isConversationEnded, setIsConversationEnded] = useState(false);
  const [showEndMessage, setShowEndMessage] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);

  // 랜덤으로 3개 선택
  const getRandomRecommendations = useCallback(() => {
    const shuffled = [...recommendationMessages].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  const [randomRecommendations, setRandomRecommendations] = useState(getRandomRecommendations);

  // 스크롤을 맨 아래로 이동
  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scroll({
        top: chatRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages, scrollToBottom]);

  // AI 답변 애니메이션 중 자동 스크롤
  useEffect(() => {
    if (!chatState.isLoading) return;

    const intervalId = setInterval(() => {
      scrollToBottom();
    }, 500);

    return () => clearInterval(intervalId);
  }, [chatState.isLoading, scrollToBottom]);

  // 질문 카운트 추적
  useEffect(() => {
    const userMessages = chatState.messages.filter(msg => msg.role === 'user');
    setQuestionCount(Math.min(userMessages.length, 5));
  }, [chatState.messages]);

  // AI 답변 카운트 추적 및 6번째 답변 감지
  useEffect(() => {
    const assistantMessages = chatState.messages.filter(msg => msg.role === 'assistant');
    // 6번째 답변이 완료되고 로딩이 끝났을 때만 종료 상태로 전환
    // 사용자가 마지막 답변을 충분히 볼 수 있도록 충분한 delay
    if (assistantMessages.length >= 6 && !isConversationEnded && !chatState.isLoading) {
      // 마지막 답변을 볼 수 있도록 충분한 시간 (3초) 후 종료 상태로 전환
      const timer = setTimeout(() => {
        setIsConversationEnded(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [chatState.messages, isConversationEnded, chatState.isLoading]);

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
    if (!chatState.inputValue.trim() || chatState.isLoading || isConversationEnded) return;

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
        "안녕하세요! 이솔이에요. 오늘 어떤 무드로 코엑스를 즐기고 싶으신가요?",
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

  // 정보성 키워드 추출 함수
  const extractInfoKeywords = useCallback(() => {
    const assistantMessages = chatState.messages
      .filter(msg => msg.role === 'assistant')
      .map(msg => msg.content);
    
    const keywords: Set<string> = new Set();
    
    // 알려진 장소 및 추천 키워드 패턴
    const knownKeywords = [
      '카페 추천',
      '레스토랑 추천',
      '식당 추천',
      '컨퍼런스 위치',
      '별마당 도서관',
      '별마당 도서관 정보',
      'SM 타운',
      'SM 타운 정보',
      '코엑스 아쿠아리움',
      '아쿠아리움',
      'VR 게임존',
      'VR 체험',
      '디지털 체험 공간',
      '필립 콜버트',
      '필립 콜버트 아트',
      '아트 프로젝트',
      '서울 일러스트페어',
      '일러스트페어',
      'ALAND',
      '알랜드',
      '사이드쇼',
      'kpop 구경거리',
      'kpop 관련',
      'k스타일 쇼핑',
      '미디어 월',
      '메가박스',
      '문화 체험',
      '액티비티',
      '감각적 체험',
      '실내 체험',
      '가족과의 놀거리',
      '가족 놀거리 추천',
      '데이트하기 좋은',
      '홀로 방문하기 좋은',
      '친구와 함께',
      '쇼핑하기 좋은',
      '조용한 카페',
      '작업하기 좋은',
      '핫플레이스',
      '트렌디한 음식점',
    ];
    
    // 메시지 내용에서 키워드 찾기
    assistantMessages.forEach(message => {
      knownKeywords.forEach(keyword => {
        if (message.includes(keyword) || 
            message.includes(keyword.replace(/\s/g, '')) ||
            keyword.split(' ').every(word => message.includes(word))) {
          keywords.add(keyword);
        }
      });
    });
    
    // 메시지에서 추천 문구 패턴 찾기
    const recommendationPatterns = [
      /([가-힣\s]+(?:추천|정보|위치|어때요|어때|어떠실까요|있어요))/g,
      /([가-힣\s]+(?:카페|식당|레스토랑|공간|장소|아트|전시|이벤트))/g,
    ];
    
    assistantMessages.forEach(message => {
      recommendationPatterns.forEach(pattern => {
        const matches = message.matchAll(pattern);
        for (const match of matches) {
          const keyword = match[1]?.trim();
          if (keyword && keyword.length >= 3 && keyword.length <= 20 && !keyword.includes('제가') && !keyword.includes('이솔')) {
            keywords.add(keyword);
          }
        }
      });
    });
    
    // 최대 6개까지만 반환 (중복 제거 및 정렬)
    const uniqueKeywords = Array.from(keywords);
    
    // 키워드를 길이 순으로 정렬 (짧은 것부터)
    uniqueKeywords.sort((a, b) => a.length - b.length);
    
    return uniqueKeywords.slice(0, 6);
  }, [chatState.messages]);

  // 대화 요약 보러가기 버튼 클릭 핸들러 (종료 메시지 화면으로 이동)
  const handleShowSummary = useCallback(() => {
    setShowEndMessage(true);
  }, []);

  // 종료 메시지 화면에서 Next 버튼 클릭 핸들러 (키워드 요약 화면으로 이동)
  const handleNextToSummary = useCallback(() => {
    const keywords = extractInfoKeywords();
    setExtractedKeywords(keywords);
    setShowSummary(true);
  }, [extractInfoKeywords]);

  // 추천 버튼 클릭 핸들러
  const handleRecommendationClick = useCallback(async (recommendation: string) => {
    if (chatState.isLoading || isConversationEnded) return;
    
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
      {/* Blurry Blob 배경 */}
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0, backgroundColor: '#EEF6F0' }}>
        <div
          style={{
            position: 'absolute',
            width: '697px',
            height: '697px',
            flexShrink: 0,
            borderRadius: '697px',
            opacity: 0.85,
            background: 'radial-gradient(68.28% 68.28% at 42.04% 40.53%, #C6FFB0 0%, #50ECCA 38.04%, #D6FCFF 75.51%, #E8C9FF 91.03%, #FFFDBD 100%)',
            filter: 'blur(20px)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
      
      {/* 로고 - 상단에 고정 */}
      <div className="fixed top-0 left-0 right-0 z-30 flex justify-center pt-4">
        <AnimatedLogo />
      </div>

      {/* 점 5개 - 로고 아래 고정 */}
      <div className="fixed top-20 left-0 right-0 z-30 mb-8" style={{ display: 'none' }}>
        <div className="flex flex-col items-center">
          <div className="relative flex justify-between items-center" style={{ width: '70%' }}>
            {questionCount > 1 && [0, 1, 2, 3, 4].map((index) => {
              if (index >= questionCount - 1) return null;
              
              // 점의 위치는 justify-between으로 배치되므로 각 점의 위치는
              // index 0: 0%, index 1: 25%, index 2: 50%, index 3: 75%, index 4: 100%
              const startPosition = (index / 4) * 100;
              const endPosition = ((index + 1) / 4) * 100;
              const lineWidth = endPosition - startPosition;
              
              return (
                <div
                  key={`gradient-${index}`}
                  style={{
                    position: 'absolute',
                    left: `${startPosition}%`,
                    top: '50%',
                    width: `${lineWidth}%`,
                    height: '10px',
                    transform: 'translateY(-50%)',
                    background: 'linear-gradient(to right, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0))',
                    zIndex: 0,
                    borderRadius: '5px'
                  }}
                />
              );
            })}
            
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className="rounded-full flex-shrink-0"
                style={{
                  width: '10px',
                  height: '10px',
                  backgroundColor: index < questionCount ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.5)',
                  position: 'relative',
                  zIndex: 1
                }}
              />
            ))}
          </div>
          
          {/* 마지막 질문 기회 안내 문구 */}
          {questionCount === 4 && (
            <div 
              className="mt-4 text-center"
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontFamily: 'Pretendard Variable',
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '140%',
                letterSpacing: '-0.56px'
              }}
            >
              이제 이솔에게 질문할 기회가 한 번 남았습니다
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <main className="relative flex-1 flex flex-col min-h-0 pb-32 pt-8">
        <div className="flex-1 overflow-hidden">
          <div ref={chatRef} className="h-full overflow-y-auto p-6 space-y-4 overscroll-contain">
            {chatState.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                {/* AI 환영 메시지 */}
                <div 
                  style={{ 
                    color: '#4E5363', 
                    textAlign: 'center', 
                    fontFamily: 'Pretendard Variable', 
                    fontSize: '22px', 
                    fontStyle: 'normal', 
                    fontWeight: 600, 
                    lineHeight: '110%', 
                    letterSpacing: '-0.88px' 
                  }}
                  className="p-6 w-full"
                >
                  <div className="flex justify-center">
                    <SplitWords
                      text="안녕하세요! 이솔이에요"
                      delay={0}
                      duration={1.2}
                      stagger={0.05}
                      animation="fadeIn"
                    />
                  </div>
                  <div className="flex justify-center mt-2">
                    <SplitWords
                      text="코엑스 안내를 도와드릴게요"
                      delay={800}
                      duration={1.2}
                      stagger={0.05}
                      animation="fadeIn"
                    />
                  </div>
                </div>
              </div>
            )}
            {chatState.messages.length > 0 && (
              <>
                {showSummary ? (
                  // 키워드 요약 화면
                  <div className="flex flex-col items-center justify-center min-h-full py-12 px-6">
                    <div className="flex flex-wrap gap-6 justify-center items-center" style={{ maxWidth: '90%' }}>
                      {extractedKeywords.map((keyword, index) => {
                        // 각 키워드마다 다양한 크기와 위치를 위한 스타일 변형
                        const sizes = ['small', 'medium', 'large'];
                        const size = sizes[index % sizes.length];
                        const sizeConfig = {
                          small: { padding: '10px 20px', fontSize: '15px' },
                          medium: { padding: '12px 24px', fontSize: '16px' },
                          large: { padding: '14px 28px', fontSize: '17px' },
                        };
                        const config = sizeConfig[size as keyof typeof sizeConfig];
                        
                        return (
                          <div
                            key={index}
                            className="relative"
                            style={{
                              padding: config.padding,
                              borderRadius: '999px',
                              background: `radial-gradient(ellipse at 50% 50%, 
                                rgba(255, 255, 255, 0.95) 0%, 
                                rgba(230, 240, 255, 0.85) 30%,
                                rgba(220, 235, 255, 0.75) 60%,
                                rgba(200, 225, 255, 0.6) 100%)`,
                              backdropFilter: 'blur(20px)',
                              WebkitBackdropFilter: 'blur(20px)',
                              boxShadow: `
                                0 8px 32px rgba(0, 0, 0, 0.08),
                                0 2px 8px rgba(0, 0, 0, 0.04),
                                inset 0 1px 0 rgba(255, 255, 255, 0.9)
                              `,
                              border: '1px solid rgba(255, 255, 255, 0.6)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            {/* 빛나는 효과 */}
                            <div
                              style={{
                                position: 'absolute',
                                top: '-50%',
                                left: '-50%',
                                width: '200%',
                                height: '200%',
                                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                                pointerEvents: 'none',
                              }}
                            />
                            <span
                              style={{
                                fontFamily: 'Pretendard Variable',
                                fontSize: config.fontSize,
                                fontWeight: 500,
                                color: '#1f2937',
                                textAlign: 'center',
                                lineHeight: '1.4',
                                position: 'relative',
                                zIndex: 1,
                                letterSpacing: '-0.3px',
                              }}
                            >
                              {keyword}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : showEndMessage ? (
                  // 종료 메시지 화면
                  <div className="flex flex-col items-center justify-center min-h-full py-12">
                    <div
                      style={{
                        fontFamily: 'Pretendard Variable',
                        fontSize: '22px',
                        fontWeight: 600,
                        color: '#4E5363',
                        textAlign: 'center',
                        lineHeight: '140%',
                        letterSpacing: '-0.88px',
                        marginBottom: '40px',
                        padding: '0 24px',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      <SplitWords
                        text="오늘의 대화가 모두 끝났어요\n제가 안내한 내용을 정리해드릴게요"
                        delay={0}
                        duration={1.2}
                        stagger={0.05}
                        animation="fadeIn"
                      />
                    </div>
                    
                    {/* Next 버튼 - LandingPage 스타일 참고 */}
                    <div className="fixed bottom-0 left-0 right-0 z-20 px-6 pb-8 pt-4 bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm safe-bottom">
                      <button
                        onClick={handleNextToSummary}
                        className="w-full touch-manipulation active:scale-95 flex justify-center items-center"
                        style={{
                          height: '56px',
                          padding: '15px 85px',
                          borderRadius: '68px',
                          background: 'rgba(255, 255, 255, 0.21)',
                          color: '#000',
                          textAlign: 'center',
                          fontFamily: 'Pretendard Variable',
                          fontSize: '16px',
                          fontWeight: 700,
                          lineHeight: '110%',
                          letterSpacing: '-0.64px',
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : chatState.isLoading ? (
                  // 로딩 중: 사용자 메시지만 표시하고, '이솔이 생각 중입니다...'는 중간에
                  <div className="flex flex-col min-h-full">
                    {/* 중간에 '이솔이 생각 중입니다...' 표시 */}
                    <div className="flex-1 flex items-center justify-center" style={{ minHeight: '40vh' }}>
                      <div className="flex items-center gap-3" style={{ color: '#000' }}>
                        <LoadingSpinner size="sm" />
                        <span className="text-base">이솔이 생각 중입니다...</span>
                      </div>
                    </div>
                    {/* 하단에 사용자 메시지 표시 */}
                    <div className="space-y-4 pb-4 mt-auto">
                      {chatState.messages
                        .filter(msg => msg.role === 'user')
                        .slice(-1)
                        .map((message) => (
                          <ChatBubble 
                            key={`${message.role}-${message.timestamp || Date.now()}`}
                            message={message} 
                            onPlayTTS={ttsState.playTTS}
                            isPlayingTTS={ttsState.isPlayingTTS}
                            isGlobalLoading={chatState.isLoading}
                          />
                        ))}
                    </div>
                  </div>
                ) : (
                  // 로딩 완료: 최근 사용자 메시지와 AI 답변만 표시
                  <div className="space-y-4">
                    {chatState.messages.slice(-2).map((message, index) => (
                      <ChatBubble 
                        key={`${message.role}-${chatState.messages.length - 2 + index}`}
                        message={message} 
                        onPlayTTS={ttsState.playTTS}
                        isPlayingTTS={ttsState.isPlayingTTS}
                        isGlobalLoading={chatState.isLoading}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* 하단 추천 버튼들 */}
      {!isConversationEnded && !showSummary && !showEndMessage && (
      <div className="fixed bottom-20 left-0 right-0 z-20">
        <div 
          className="overflow-x-auto px-6 hide-scrollbar" 
          style={{ 
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', width: 'max-content' }}>
            {randomRecommendations.map((message, index) => (
              <button
                key={index}
                onClick={() => handleRecommendationClick(message)}
                disabled={chatState.isLoading}
                className="px-4 py-2 transition-opacity duration-200 touch-manipulation active:scale-95 disabled:opacity-50 whitespace-nowrap"
                style={{
                  fontFamily: 'Pretendard Variable',
                  fontSize: '15px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '130%',
                  letterSpacing: '-0.6px',
                  background: 'transparent',
                  border: 'none',
                  color: '#717171',
                }}
              >
                {message}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* 하단 고정 입력창 또는 대화 요약 보러가기 버튼 */}
      {!showSummary && !showEndMessage && (
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 safe-bottom">
        {isConversationEnded ? (
          // 6번째 답변 후: 대화 요약 보러가기 버튼
          <div className="px-6 pb-8 pt-4 bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm safe-bottom">
            <button
              onClick={handleShowSummary}
              className="w-full touch-manipulation active:scale-95 flex justify-center items-center"
              style={{
                height: '56px',
                padding: '15px 85px',
                borderRadius: '68px',
                background: 'rgba(255, 255, 255, 0.21)',
                color: '#000',
                textAlign: 'center',
                fontFamily: 'Pretendard Variable',
                fontSize: '16px',
                fontWeight: 700,
                lineHeight: '110%',
                letterSpacing: '-0.64px',
              }}
            >
              대화 요약 보러가기
            </button>
          </div>
        ) : (
          // 일반 입력창
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
        )}
      </div>
      )}
    </div>
  );
}
