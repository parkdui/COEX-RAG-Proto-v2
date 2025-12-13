'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatBubble } from '@/components/ChatBubble';
import { Message } from '@/types';
import { createAssistantMessage, createErrorMessage, createUserMessage } from '@/lib/messageUtils';
import { createWavBlob, getAudioConstraints, checkMicrophonePermission, handleMicrophoneError, checkBrowserSupport } from '@/lib/audioUtils';
import { Button, Input, Textarea, Card, CardHeader, CardContent, CardFooter, Badge, SplitWords, ChatTypewriterV1, ChatTypewriterV2, ChatTypewriterV3, SplitText } from '@/components/ui';
import AnimatedLogo from '@/components/ui/AnimatedLogo';
import TextPressure from '@/components/ui/TextPressure';
import LetterColorAnimation from '@/components/ui/LetterColorAnimation';
import useCoexTTS from '@/hooks/useCoexTTS';

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
  const [rowIndex, setRowIndex] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
    setChatHistory(prev => [...prev, message]);
  }, []);

  const addErrorMessage = useCallback((error: string) => {
    const errorMessage = createErrorMessage(error);
    addMessage(errorMessage);
  }, [addMessage]);

  return useMemo(() => ({
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
    addErrorMessage,
    rowIndex,
    setRowIndex,
    sessionId,
    setSessionId
  }), [
    messages,
    chatHistory,
    inputValue,
    systemPrompt,
    isLoading,
    isGoButtonDisabled,
    addMessage,
    addErrorMessage,
    rowIndex,
    sessionId
  ]);
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
 * API 요청 함수들
 */
const apiRequests = {
  async sendChatRequest(question: string, systemPrompt: string, history: Message[], rowIndex?: number | null, sessionId?: string | null) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question, 
        systemPrompt, 
        history,
        rowIndex: rowIndex || undefined,
        sessionId: sessionId || undefined
      }),
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

type TypewriterVariant = 'v1' | 'v2' | 'v3';

const typewriterComponentMap: Record<TypewriterVariant, React.ComponentType<any>> = {
  v1: ChatTypewriterV1,
  v2: ChatTypewriterV2,
  v3: ChatTypewriterV3,
};

const typewriterOptions: Array<{ label: string; value: TypewriterVariant }> = [
  { label: 'V1', value: 'v1' },
  { label: 'V2', value: 'v2' },
  { label: 'V3', value: 'v3' },
];

interface MainPageV1Props {
  showBlob?: boolean;
}

export default function MainPageV1({ showBlob = true }: MainPageV1Props = { showBlob: true }) {
  const chatRef = useRef<HTMLDivElement>(null);
  const chatState = useChatState();
  const voiceState = useVoiceRecording();
  const { isPlayingTTS, playFull, prepareAuto } = useCoexTTS();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isConversationEnded, setIsConversationEnded] = useState(false);
  const [showEndMessage, setShowEndMessage] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);
  const [keywordToTurnMap, setKeywordToTurnMap] = useState<Map<string, number>>(new Map());
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedKeywordTurn, setSelectedKeywordTurn] = useState<number | null>(null);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [isKeywordsAnimatingOut, setIsKeywordsAnimatingOut] = useState(false);
  const [showFifthAnswerWarning, setShowFifthAnswerWarning] = useState(false);
  const [typewriterVariant, setTypewriterVariant] = useState<TypewriterVariant>('v1');
  const [showRecommendationChips, setShowRecommendationChips] = useState(false);

  const GreetingTypewriter = typewriterComponentMap[typewriterVariant];

  const createTypewriterProps = useCallback(
    (text: string, delay = 0) => {
      const baseProps: Record<string, any> = {
        text,
        speed: 50,
        delay,
        speedVariation: 0.3,
        minSpeed: 20,
        maxSpeed: 100,
      };

      if (typewriterVariant === 'v2') {
        baseProps.characterChangeInterval = 200;
      }

      return baseProps;
    },
    [typewriterVariant]
  );

  // 랜덤으로 3개 선택
  const getRandomRecommendations = useCallback(() => {
    const shuffled = [...recommendationMessages].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  // 사용자 메시지 요약 상태
  const [userMessageSummaries, setUserMessageSummaries] = useState<Record<string, string>>({});

  // Fallback 요약 함수 (CLOVA API 실패 시 사용)
  const getFallbackSummary = useCallback((text: string): string => {
    // 패턴 기반 요약
    const patterns = [
      { pattern: /문화.*?경험.*?곳|문화.*?경험.*?장소/i, replacement: '문화적인 경험 장소 추천' },
      { pattern: /가족.*?놀/i, replacement: '가족과 놀거리 추천' },
      { pattern: /친구.*?먹/i, replacement: '친구와 먹거리 추천' },
      { pattern: /데이트.*?좋/i, replacement: '데이트하기 좋은 곳' },
      { pattern: /컨퍼런스.*?쉬/i, replacement: '컨퍼런스 중 쉬기 좋은 곳' },
      { pattern: /홀로.*?방문/i, replacement: '홀로 방문하기 좋은 곳' },
      { pattern: /조용.*?작업/i, replacement: '조용히 작업할 카페' },
      { pattern: /핫플레이스/i, replacement: '핫플레이스 추천' },
      { pattern: /문화.*?체험/i, replacement: '문화 체험 장소' },
      { pattern: /쇼핑.*?좋/i, replacement: '쇼핑하기 좋은 곳' },
      { pattern: /추천.*?해|추천.*?해줘/i, replacement: '장소 추천' },
    ];
    
    // 패턴 매칭
    for (const { pattern, replacement } of patterns) {
      if (pattern.test(text)) {
        return replacement.length > 20 ? replacement.substring(0, 20) : replacement;
      }
    }
    
    // 패턴에 매칭되지 않으면 키워드 기반 요약
    const keywords = ['문화', '경험', '가족', '친구', '혼자', '데이트', '컨퍼런스', '식당', '카페', '쇼핑', '장소', '곳'];
    const foundKeywords = keywords.filter(kw => text.includes(kw));
    
    if (foundKeywords.length > 0) {
      const summary = foundKeywords.slice(0, 3).join(' ') + ' 추천';
      return summary.length > 20 ? summary.substring(0, 20) : summary;
    }
    
    // 아무것도 매칭되지 않으면 원본 반환 (최대 20자, 말줄임표 없이)
    return text.length > 20 ? text.substring(0, 20) : text;
  }, []);

  // 사용자 메시지 요약 함수 (CLOVA AI API 사용)
  const summarizeUserMessage = useCallback(async (text: string, messageId?: string) => {
    if (!text || !text.trim()) return text;

    // 캐시된 요약이 있으면 반환
    const cacheKey = messageId || text;
    if (userMessageSummaries[cacheKey]) {
      return userMessageSummaries[cacheKey];
    }

    try {
      const response = await fetch('/api/summarize-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });

      if (response.ok) {
        const data = await response.json();
        const summary = data.summary || text.substring(0, 20);
        
        // 캐시에 저장
        if (cacheKey) {
          setUserMessageSummaries(prev => ({
            ...prev,
            [cacheKey]: summary,
          }));
        }
        
        return summary;
      } else {
        // API 실패 시 fallback: 간단한 키워드 기반 요약
        return getFallbackSummary(text);
      }
    } catch (error) {
      console.error('Summarize question error:', error);
      // 에러 시 fallback 사용
      return getFallbackSummary(text);
    }
  }, [userMessageSummaries, getFallbackSummary]);

  const randomRecommendations = useMemo(() => getRandomRecommendations(), [getRandomRecommendations]);

  const assistantMessages = useMemo(
    () => chatState.messages.filter((message) => message.role === 'assistant'),
    [chatState.messages]
  );

  const userMessages = useMemo(
    () => chatState.messages.filter((message) => message.role === 'user'),
    [chatState.messages]
  );

  const pushAssistantMessage = useCallback(
    async (response: { answer?: string; tokens?: any; hits?: any[]; defaultAnswer?: string }) => {
      const answerText = response.answer || response.defaultAnswer || '(응답 없음)';
      const playbackStarter = await prepareAuto(answerText);

      const assistantMessage = createAssistantMessage({
        answer: answerText,
        tokens: response.tokens,
        hits: response.hits,
        defaultAnswer: response.defaultAnswer,
      });

      chatState.addMessage(assistantMessage);

      if (playbackStarter) {
        playbackStarter().catch((error) => {
          console.error('Failed to start prepared TTS playback:', error);
        });
      }
    },
    [chatState.addMessage, prepareAuto],
  );

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

  // AI 답변 완료 시 추천 chips 애니메이션 트리거
  useEffect(() => {
    if (!chatState.isLoading && assistantMessages.length > 0) {
      // AI 답변이 완료되면 추천 chips fade-in 애니메이션 시작
      setShowRecommendationChips(false);
      const timer = setTimeout(() => {
        setShowRecommendationChips(true);
      }, 100); // 약간의 딜레이 후 애니메이션 시작
      return () => clearTimeout(timer);
    }
  }, [chatState.isLoading, assistantMessages.length]);

  // AI 답변 카운트 추적 및 6번째 답변 감지
  useEffect(() => {
    const assistantCount = assistantMessages.length;

    // 6번째 답변이 완료되고 로딩이 끝났을 때만 종료 상태로 전환
    if (assistantCount >= 6 && !isConversationEnded && !chatState.isLoading) {
      // 마지막 답변을 볼 수 있도록 약간의 시간 (1초) 후 종료 상태로 전환
      const timer = setTimeout(() => {
        setIsConversationEnded(true);
        setShowFifthAnswerWarning(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [assistantMessages, isConversationEnded, chatState.isLoading]);

  // 5번째 답변 완료 시 안내 메시지 표시
  useEffect(() => {
    const assistantCount = assistantMessages.length;

    // 5번째 답변 완료 시 안내 메시지 표시 (6번째 이전에만)
    if (assistantCount === 5 && !chatState.isLoading && !isConversationEnded && assistantCount < 6) {
      setShowFifthAnswerWarning(true);
      // 5초 후 메시지 숨김
      const timer = setTimeout(() => {
        setShowFifthAnswerWarning(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
    
    // 6번째 답변이 되면 경고 메시지 숨김
    if (assistantCount >= 6) {
      setShowFifthAnswerWarning(false);
    }
  }, [assistantMessages, isConversationEnded, chatState.isLoading]);

  // 시스템 프롬프트 로드
  useEffect(() => {
    let isMounted = true;

    fetch('/LLM/system_prompt.txt')
      .then(response => response.text())
      .then(text => {
        if (isMounted) {
          chatState.setSystemPrompt(text);
        }
      })
      .catch(error => console.error('시스템 프롬프트 로드 실패:', error));

    return () => {
      isMounted = false;
    };
  }, [chatState.setSystemPrompt]);

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
          const historyToSend = chatState.chatHistory.slice(-4); // 최근 2턴 (토큰 절감 + 맥락 유지)
          const chatData = await apiRequests.sendChatRequest(result.text, chatState.systemPrompt, historyToSend, chatState.rowIndex, chatState.sessionId);

          if (chatData.error) {
            chatState.addErrorMessage(chatData.error);
          } else {
            // rowIndex와 sessionId 저장 (다음 요청에 사용)
            if (chatData.rowIndex) {
              chatState.setRowIndex(chatData.rowIndex);
            }
            if (chatData.sessionId) {
              chatState.setSessionId(chatData.sessionId);
            }
            
            await pushAssistantMessage({
              answer: chatData.answer,
              tokens: chatData.tokens,
              hits: chatData.hits,
              defaultAnswer: '(응답 없음)',
            });
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
  }, [
    chatState.addErrorMessage,
    chatState.addMessage,
    chatState.chatHistory,
    chatState.setInputValue,
    chatState.setIsLoading,
    chatState.systemPrompt,
    voiceState.setIsProcessingVoice,
    pushAssistantMessage
  ]);

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
  }, [processAudio, voiceState.setIsRecording]);

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
      const historyToSend = chatState.chatHistory.slice(-2); // 최근 1턴만 (토큰 절감)
      const data = await apiRequests.sendChatRequest(chatState.inputValue, chatState.systemPrompt, historyToSend, chatState.rowIndex, chatState.sessionId);

      if (data.error) {
        chatState.addErrorMessage(data.error);
      } else {
        // rowIndex와 sessionId 저장 (다음 요청에 사용)
        if (data.rowIndex) {
          chatState.setRowIndex(data.rowIndex);
        }
        if (data.sessionId) {
          chatState.setSessionId(data.sessionId);
        }
        
        await pushAssistantMessage({
          answer: data.answer,
          tokens: data.tokens,
          hits: data.hits,
          defaultAnswer: '(응답 없음)',
        });
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      chatState.addErrorMessage('서버와의 통신에 실패했습니다.');
    } finally {
      chatState.setIsLoading(false);
    }
  }, [
    chatState.addErrorMessage,
    chatState.addMessage,
    chatState.chatHistory,
    chatState.inputValue,
    chatState.isLoading,
    chatState.setInputValue,
    chatState.setIsLoading,
    chatState.systemPrompt,
    isConversationEnded,
    pushAssistantMessage
  ]);

  // 대화 시작
  const handleGoButton = useCallback(async () => {
    chatState.setIsGoButtonDisabled(true);
    chatState.setIsLoading(true);

    try {
      const data = await apiRequests.sendChatRequest(
        "안녕하세요! 이솔이에요. 오늘 어떤 무드로 코엑스를 즐기고 싶으신가요?",
        chatState.systemPrompt,
        [],
        chatState.rowIndex,
        chatState.sessionId
      );

      if (data.error) {
        chatState.addErrorMessage(data.error);
      } else {
        // rowIndex와 sessionId 저장 (다음 요청에 사용)
        if (data.rowIndex) {
          chatState.setRowIndex(data.rowIndex);
        }
        if (data.sessionId) {
          chatState.setSessionId(data.sessionId);
        }
        
        await pushAssistantMessage({
          answer: data.answer,
          tokens: data.tokens,
          hits: data.hits,
          defaultAnswer: '안녕하세요! COEX 이벤트 안내 AI입니다. 무엇을 도와드릴까요?',
        });
      }
    } catch (error) {
      console.error('대화 시작 실패:', error);
      chatState.addErrorMessage('서버와의 통신에 실패했습니다.');
    } finally {
      chatState.setIsLoading(false);
      chatState.setIsGoButtonDisabled(false);
    }
  }, [
    chatState.addErrorMessage,
    chatState.addMessage,
    chatState.setIsGoButtonDisabled,
    chatState.setIsLoading,
    chatState.systemPrompt,
    pushAssistantMessage
  ]);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.nativeEvent as any).isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  // 정보 요구 질문인지 확인하는 함수
  const isInfoRequestQuestion = useCallback((question: string) => {
    const infoRequestPatterns = [
      /추천|알려|정보|위치|어디|어떤|어때|어떠|있어|찾아|보여|가르쳐|안내|소개|추천해|알려줘|알려줄|가르쳐줘/i,
      /카페|식당|레스토랑|맛집|음식|장소|공간|장소|이벤트|전시|체험|활동|프로그램/i,
      /어디서|어디에|어디로|어디가|어디서|어디에|어디로|어디가/i,
    ];
    
    return infoRequestPatterns.some(pattern => pattern.test(question));
  }, []);

  // 정보성 키워드 추출 함수 (각 turn별로 추출) - CLOVA AI API 사용
  const extractInfoKeywords = useCallback(async () => {
    const keywords: Array<{ keyword: string; turnIndex: number }> = [];
    const keywordMap = new Map<string, number>();
    const allTurns: Array<{ userMessage: Message; assistantMessage: Message; turnIndex: number; isInfoRequest: boolean }> = [];
    
    // 모든 대화를 turn별로 그룹화 (사용자 질문 + AI 답변)
    let turnIndex = 1;
    for (let i = 0; i < chatState.messages.length; i++) {
      if (chatState.messages[i].role === 'user') {
        const userMessage = chatState.messages[i];
        const assistantMessage = chatState.messages[i + 1];
        
        if (assistantMessage && assistantMessage.role === 'assistant') {
          const isInfoRequest = isInfoRequestQuestion(userMessage.content);
          allTurns.push({
            userMessage,
            assistantMessage,
            turnIndex: turnIndex++,
            isInfoRequest
          });
        }
      }
    }
    
    // 각 turn에 대해 CLOVA AI API를 호출하여 키워드 추출
    // 정보 요구 질문을 우선적으로 처리
    const infoRequestTurns = allTurns.filter(t => t.isInfoRequest);
    const otherTurns = allTurns.filter(t => !t.isInfoRequest);
    const processedTurns = [...infoRequestTurns, ...otherTurns];
    
    for (const { userMessage, assistantMessage, turnIndex } of processedTurns) {
      try {
        const response = await fetch('/api/extract-keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: userMessage.content,
            answer: assistantMessage.content,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          const keyword = data.keyword?.trim();
          
          if (keyword && keyword.length > 0) {
            // 같은 키워드가 여러 turn에 있으면 첫 번째만 저장
            if (!keywordMap.has(keyword)) {
              keywordMap.set(keyword, turnIndex);
              keywords.push({ keyword, turnIndex });
            }
          }
        } else {
          console.error('키워드 추출 API 실패:', await response.text());
        }
      } catch (error) {
        console.error('키워드 추출 오류:', error);
      }
    }
    
    // 모든 키워드가 비어있으면, 첫 번째 turn의 키워드를 강제로 생성
    if (keywords.length === 0 && allTurns.length > 0) {
      const firstTurn = allTurns[0];
      try {
        const response = await fetch('/api/extract-keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: firstTurn.userMessage.content,
            answer: firstTurn.assistantMessage.content,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          let keyword = data.keyword?.trim();
          
          // 키워드가 여전히 비어있으면 기본 키워드 생성
          if (!keyword || keyword.length === 0) {
            keyword = '대화 요약';
          }
          
          keywordMap.set(keyword, firstTurn.turnIndex);
          keywords.push({ keyword, turnIndex: firstTurn.turnIndex });
        }
      } catch (error) {
        console.error('키워드 추출 오류:', error);
        // API 실패 시에도 기본 키워드 생성
        const defaultKeyword = '대화 요약';
        keywordMap.set(defaultKeyword, firstTurn.turnIndex);
        keywords.push({ keyword: defaultKeyword, turnIndex: firstTurn.turnIndex });
      }
    }
    
    // 키워드를 길이 순으로 정렬 (짧은 것부터)
    keywords.sort((a, b) => a.keyword.length - b.keyword.length);
    
    // 최대 6개까지만 반환
    const limitedKeywords = keywords.slice(0, 6);
    
    // 키워드 배열과 맵을 반환
    return {
      keywords: limitedKeywords.map(k => k.keyword),
      keywordMap: new Map(limitedKeywords.map(k => [k.keyword, k.turnIndex]))
    };
  }, [chatState.messages, isInfoRequestQuestion]);

  // 대화 요약 보러가기 버튼 클릭 핸들러 (종료 메시지 화면으로 이동)
  const handleShowSummary = useCallback(() => {
    setShowEndMessage(true);
  }, []);

  // 종료 메시지 화면에서 Next 버튼 클릭 핸들러 (키워드 요약 화면으로 이동)
  const handleNextToSummary = useCallback(async () => {
    const { keywords, keywordMap } = await extractInfoKeywords();
    setExtractedKeywords(keywords);
    setKeywordToTurnMap(keywordMap);
    setShowSummary(true);
  }, [extractInfoKeywords]);

  // 키워드 클릭 핸들러 (해당 turn의 AI 답변 보여주기)
  const handleKeywordClick = useCallback((keyword: string) => {
    const turnIndex = keywordToTurnMap.get(keyword);
    if (turnIndex !== undefined) {
      setSelectedKeyword(keyword);
      setSelectedKeywordTurn(turnIndex);
    }
  }, [keywordToTurnMap]);

  // 키워드 답변 화면에서 뒤로가기 핸들러
  const handleBackToKeywords = useCallback(() => {
    setSelectedKeyword(null);
    setSelectedKeywordTurn(null);
  }, []);

  // End 버튼 클릭 핸들러 (키워드 애니메이션 후 최종 메시지 표시)
  const handleEndButton = useCallback(() => {
    setIsKeywordsAnimatingOut(true);
    // 애니메이션 완료 후 최종 메시지 표시
    setTimeout(() => {
      setShowFinalMessage(true);
    }, 800); // ease 애니메이션 시간에 맞춤
  }, []);

  // 추천 버튼 클릭 핸들러
  const handleRecommendationClick = useCallback(async (recommendation: string) => {
    if (chatState.isLoading || isConversationEnded) return;
    
    const userMessage = createUserMessage(recommendation);
    chatState.addMessage(userMessage);
    chatState.setIsLoading(true);

    try {
      const historyToSend = chatState.chatHistory.slice(-2); // 최근 1턴만 (토큰 절감)
      const data = await apiRequests.sendChatRequest(recommendation, chatState.systemPrompt, historyToSend, chatState.rowIndex, chatState.sessionId);

      if (data.error) {
        chatState.addErrorMessage(data.error);
      } else {
        // rowIndex와 sessionId 저장 (다음 요청에 사용)
        if (data.rowIndex) {
          chatState.setRowIndex(data.rowIndex);
        }
        if (data.sessionId) {
          chatState.setSessionId(data.sessionId);
        }
        
        await pushAssistantMessage({
          answer: data.answer,
          tokens: data.tokens,
          hits: data.hits,
          defaultAnswer: '(응답 없음)',
        });
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      chatState.addErrorMessage('서버와의 통신에 실패했습니다.');
    } finally {
      chatState.setIsLoading(false);
    }
  }, [chatState, isConversationEnded, pushAssistantMessage]);

  // 중요한 단어 목록
  const importantKeywords = [
    '핫플레이스',
    '쉬기 좋은 곳',
    '카페',
    '식당',
    '데이트',
    '문화적인 경험',
    '경험',
    '장소',
    '행사',
    '이벤트',
    '쇼핑',
    '음식점',
    '구경거리',
    '레스토랑',
    '맛집',
    '전시',
    '체험',
    '활동',
    '프로그램',
  ];

  // 텍스트에서 중요한 단어에 LetterColorAnimation 적용하는 함수
  const renderTextWithAnimation = useCallback((text: string) => {
    const parts: Array<{ text: string; isImportant: boolean }> = [];
    let lastIndex = 0;

    // 모든 중요한 단어의 위치 찾기
    const matches: Array<{ start: number; end: number; keyword: string }> = [];
    
    for (const keyword of importantKeywords) {
      let searchIndex = 0;
      while (true) {
        const index = text.indexOf(keyword, searchIndex);
        if (index === -1) break;
        matches.push({ start: index, end: index + keyword.length, keyword });
        searchIndex = index + 1;
      }
    }

    // 겹치는 부분 처리 (긴 키워드 우선)
    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.end - a.end; // 같은 시작 위치면 긴 것 우선
    });

    const nonOverlappingMatches: Array<{ start: number; end: number; keyword: string }> = [];
    for (const match of matches) {
      const overlaps = nonOverlappingMatches.some(
        existing => !(match.end <= existing.start || match.start >= existing.end)
      );
      if (!overlaps) {
        nonOverlappingMatches.push(match);
      }
    }

    // 정렬
    nonOverlappingMatches.sort((a, b) => a.start - b.start);

    // 텍스트 분할
    for (const match of nonOverlappingMatches) {
      if (match.start > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.start), isImportant: false });
      }
      parts.push({ text: text.substring(match.start, match.end), isImportant: true });
      lastIndex = match.end;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), isImportant: false });
    }

    // parts가 비어있으면 원본 텍스트 반환
    if (parts.length === 0) {
      parts.push({ text, isImportant: false });
    }

    return parts.map((part, index) => {
      if (part.isImportant) {
        return (
          <LetterColorAnimation
            key={index}
            text={part.text}
            duration={6}
            style={{
              display: 'inline-block',
            }}
          />
        );
      }
      return <span key={index}>{part.text}</span>;
    });
  }, [importantKeywords]);

  // 추천 chips 렌더링 함수
  const renderRecommendationChips = useCallback((additionalMarginTop?: number, compact?: boolean, shouldAnimate?: boolean) => {
    if (isConversationEnded) return null;
    
    return (
      <div
        className="recommendation-scroll"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '8px',
          marginTop: additionalMarginTop ? `${additionalMarginTop}px` : (compact ? '0' : '24px'),
          paddingTop: compact ? '0' : '24px',
          paddingBottom: compact ? '0' : '4px',
          width: '100%',
          opacity: shouldAnimate ? (showRecommendationChips ? 1 : 0) : 1,
          transition: shouldAnimate ? 'opacity 0.5s ease-in' : 'none',
        }}
      >
        {randomRecommendations.map((message, index) => {
          return (
            <button
              key={index}
              onClick={() => handleRecommendationClick(message)}
              disabled={chatState.isLoading}
              className="touch-manipulation active:scale-95 disabled:opacity-50 rounded-3xl outline outline-1 outline-offset-[-1px] outline-white"
              style={{
                display: 'inline-flex',
                padding: '8px 16px',
                justifyContent: 'center',
                alignItems: 'center',
                flex: '0 0 auto',
                cursor: 'pointer',
                background: 'linear-gradient(180deg,rgb(251, 255, 254) 0%, #F4E9F0 63.94%, #FFF 100%)',
              }}
              type="button"
            >
              <span
                style={{
                  fontFamily: 'Pretendard Variable',
                  fontSize: '14px',
                  fontStyle: 'normal' as const,
                  fontWeight: 600,
                  lineHeight: '190%',
                  letterSpacing: '-0.48px',
                  color: '#757575',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {renderTextWithAnimation(message)}
              </span>
            </button>
          );
        })}
      </div>
    );
  }, [isConversationEnded, randomRecommendations, handleRecommendationClick, chatState.isLoading, showRecommendationChips, renderTextWithAnimation]);

  return (
    <div className="min-h-screen flex flex-col safe-area-inset overscroll-contain relative" style={{ background: 'transparent' }}>
      {/* Blurry Blob 배경은 AppFlow에서 관리 (키워드 요약 화면에서는 숨김) */}
      {showBlob && !showSummary && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          {/* BlobBackground는 AppFw에서 렌더링됨 */}
        </div>
      )}
      
      {/* 로고 - 상단에 고정 (AnimatedLogo 자체가 fixed로 설정됨) */}
      <AnimatedLogo />

      {/* 5번째 답변 후 안내 메시지 */}
      {showFifthAnswerWarning && !showEndMessage && !showSummary && (
        <div className="fixed top-24 left-0 right-0 z-30 flex justify-center">
          <div
            style={{
              fontFamily: 'Pretendard Variable',
              fontSize: '16px',
              fontWeight: 500,
              color: '#4E5363',
              textAlign: 'center',
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            이제 앞으로 한 번 더 질문할 수 있습니다
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col min-h-0 pb-32 pt-20" style={{ background: 'transparent' }}>
        <div className="flex-1 overflow-hidden">
          <div ref={chatRef} className="h-full overflow-y-auto px-6 pb-4 space-y-4 overscroll-contain">
            {chatState.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-full text-center">
                {/* AI 환영 메시지 */}
                <div 
                  style={{ 
                    color: '#000', 
                    textAlign: 'center', 
                    fontFamily: 'Pretendard Variable', 
                    fontSize: '22px', 
                    fontStyle: 'normal', 
                    fontWeight: 500, 
                    lineHeight: '110%', 
                    letterSpacing: '-0.88px' 
                  }}
                  className="p-6 w-full"
                >
                  <div className="flex justify-center">
                    <SplitText text="안녕하세요! 이솔이에요" delay={0} duration={1.2} stagger={0.05} animation="fadeIn" />
                  </div>
                  <div className="flex justify-center mt-2">
                    <SplitText text="코엑스 안내를 도와드릴게요" delay={1.2} duration={1.2} stagger={0.05} animation="fadeIn" />
                  </div>
                </div>
              </div>
            )}
            {chatState.messages.length > 0 && (
              <>
                {showSummary ? (
                  showFinalMessage ? (
                    // 최종 메시지 화면
                    <div 
                      className="fixed inset-0 flex flex-col justify-start pt-20 px-6"
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
                            color: '#1f2937',
                            fontFamily: 'Pretendard Variable',
                            fontSize: '40pt',
                            fontStyle: 'normal',
                            fontWeight: 700,
                            lineHeight: '90%',
                            letterSpacing: '-1.8px',
                            display: 'block',
                            marginBottom: '0.2em',
                          }}
                        />
                        <TextPressure
                          text="즐거운 시간"
                          trigger="auto"
                          duration={1.2}
                          style={{
                            color: '#1f2937',
                            fontFamily: 'Pretendard Variable',
                            fontSize: '40pt',
                            fontStyle: 'normal',
                            fontWeight: 700,
                            lineHeight: '90%',
                            letterSpacing: '-1.8px',
                            display: 'block',
                            marginBottom: '0.2em',
                          }}
                        />
                        <TextPressure
                          text="보내세요!"
                          trigger="auto"
                          duration={1.2}
                          style={{
                            color: '#1f2937',
                            fontFamily: 'Pretendard Variable',
                            fontSize: '40pt',
                            fontStyle: 'normal',
                            fontWeight: 700,
                            lineHeight: '90%',
                            letterSpacing: '-1.8px',
                            display: 'block',
                          }}
                        />
                      </div>
                    </div>
                  ) : selectedKeyword && selectedKeywordTurn !== null ? (
                    // 키워드 클릭 시 해당 turn의 AI 답변 보여주기
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
                        {/* 뒤로가기 버튼 */}
                        <div className="mb-4">
                          <button
                            onClick={handleBackToKeywords}
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
                        
                        {/* AI 답변 표시 */}
                        {(() => {
                          // turnIndex에 해당하는 AI 답변 찾기
                          let currentTurn = 0;
                          let targetAssistantMessage: Message | null = null;
                          
                          for (let i = 0; i < chatState.messages.length; i++) {
                            if (chatState.messages[i].role === 'user') {
                              const assistantMessage = chatState.messages[i + 1];
                              if (assistantMessage && assistantMessage.role === 'assistant') {
                                if (isInfoRequestQuestion(chatState.messages[i].content)) {
                                  currentTurn++;
                                  if (currentTurn === selectedKeywordTurn) {
                                    targetAssistantMessage = assistantMessage;
                                    break;
                                  }
                                }
                              }
                            }
                          }
                          
                          if (targetAssistantMessage) {
                            return (
                              <ChatBubble 
                                message={targetAssistantMessage}
                                onPlayTTS={playFull}
                                isPlayingTTS={isPlayingTTS}
                                isGlobalLoading={false}
                                typewriterVariant={typewriterVariant}
                              />
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  ) : (
                    // 키워드 요약 화면
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
                          paddingTop: '15vh', // 로고 영역 고려
                          paddingBottom: '20vh', // End 버튼 영역 고려
                          paddingLeft: '20px',
                          paddingRight: '20px',
                          transition: isKeywordsAnimatingOut ? 'transform 0.8s ease-out, opacity 0.8s ease-out' : 'none',
                          transform: isKeywordsAnimatingOut ? 'translateY(-100vh)' : 'translateY(0)',
                          opacity: isKeywordsAnimatingOut ? 0 : 1,
                        }}
                      >
                        {extractedKeywords.map((keyword, index) => {
                        // 키워드 길이에 비례하여 ellipse 크기 결정 (1.2배 증가)
                        const keywordLength = keyword.length;
                        const baseSize = 120; // 기본 크기 (100 * 1.2)
                        const sizeMultiplier = Math.max(0.7, Math.min(1.8, keywordLength / 6)); // 6글자를 기준으로 크기 조절
                        const ellipseSize = baseSize * sizeMultiplier * 1.2; // 1.2배 증가
                        const padding = Math.max(8, ellipseSize * 0.25);
                        
                        // 겹치지 않는 위치 계산 (height 20%~80% 영역, width 10%~90% 영역)
                        // 키워드 텍스트가 겹치지 않도록 배치 (ellipse는 5% 겹쳐도 됨)
                        const getPosition = (idx: number, keywordLen: number, ellipseSize: number) => {
                          const minTop = 20;
                          const maxTop = 80;
                          // ellipse가 화면 밖으로 나가지 않도록 left 범위 설정
                          // ellipse의 반지름을 고려하여 minLeft와 maxLeft 설정
                          // 화면 너비를 100%로 가정하고, ellipse 반지름을 퍼센트로 추정
                          // 일반적인 모바일 화면 너비 375px 기준으로 ellipse 반지름 계산
                          const estimatedScreenWidth = 375; // 픽셀 단위 (모바일 기준)
                          const ellipseRadiusPercent = (ellipseSize / 2 / estimatedScreenWidth) * 100;
                          const minLeft = Math.max(10, 10 + ellipseRadiusPercent); // 왼쪽 경계 확보
                          const maxLeft = Math.min(90, 90 - ellipseRadiusPercent); // 오른쪽 경계 확보
                          
                          // 기존 키워드들의 위치 정보 (이미 배치된 키워드들)
                          // 기존 키워드들도 ellipse 반지름을 고려하여 계산
                          const existingPositions: Array<{top: number, left: number, size: number}> = [];
                          for (let i = 0; i < idx; i++) {
                            const existingKeywordLength = extractedKeywords[i].length;
                            const existingSize = baseSize * Math.max(0.7, Math.min(1.8, existingKeywordLength / 6)) * 1.2;
                            const existingEllipseRadiusPercent = (existingSize / 2 / estimatedScreenWidth) * 100;
                            const existingMinLeft = Math.max(10, 10 + existingEllipseRadiusPercent);
                            const existingMaxLeft = Math.min(90, 90 - existingEllipseRadiusPercent);
                            
                            // 그리드 기반 초기 위치 계산
                            const row = Math.floor(i / 3);
                            const col = i % 3;
                            const existingTop = minTop + (row * 18) + ((i % 2) * 5);
                            const existingGridLeft = 10 + (col * 40); // 10%, 50%, 90% (3열)
                            const existingLeft = Math.max(existingMinLeft, Math.min(existingMaxLeft, existingGridLeft));
                            existingPositions.push({
                              top: existingTop,
                              left: existingLeft,
                              size: existingSize
                            });
                          }
                          
                          // 그리드 기반 초기 위치 (3열 그리드)
                          const row = Math.floor(idx / 3);
                          const col = idx % 3;
                          let topPercent = minTop + (row * 18) + ((idx % 2) * 5);
                          // leftPercent를 10%~90% 범위 내에서 배치
                          // 3열 그리드로 배치하되, ellipse 반지름을 고려하여 경계 내에 위치
                          const gridLeftPercent = 10 + (col * 40); // 10%, 50%, 90% (3열)
                          let leftPercent = Math.max(minLeft, Math.min(maxLeft, gridLeftPercent));
                          
                          // 기존 키워드들과의 거리 체크 (텍스트가 겹치지 않도록)
                          // ellipse는 최대 3% 면적까지 겹칠 수 있지만, 텍스트가 겹치지 않도록 충분한 거리 확보
                          let attempts = 0;
                          const maxAttempts = 50;
                          
                          while (attempts < maxAttempts) {
                            let hasOverlap = false;
                            
                            // 기존 키워드들과의 거리 체크 (퍼센트 기반)
                            for (const existing of existingPositions) {
                              // 퍼센트 차이 계산
                              const topDiff = Math.abs(topPercent - existing.top);
                              const leftDiff = Math.abs(leftPercent - existing.left);
                              // 유클리드 거리 계산 (퍼센트 단위)
                              const distance = Math.sqrt(topDiff * topDiff + leftDiff * leftDiff);
                              
                              // 한 ellipse가 다른 ellipse 속 키워드 텍스트를 침범하지 않도록 엄격한 거리 확보
                              // ellipse 크기를 퍼센트로 변환 (화면 높이 800px 기준으로 추정)
                              const ellipseSizePercent = (ellipseSize / 800) * 100;
                              const existingSizePercent = (existing.size / 800) * 100;
                              // 두 ellipse의 반지름 합 (ellipse가 전혀 겹치지 않도록)
                              // 텍스트가 ellipse 내부에 있으므로, ellipse가 겹치면 텍스트도 겹칠 수 있음
                              // 따라서 반지름 합보다 충분히 큰 거리 확보 (20% 여유 추가로 더 확실하게)
                              const minDistance = ((ellipseSizePercent / 2) + (existingSizePercent / 2)) * 1.2;
                              
                              if (distance < minDistance) {
                                hasOverlap = true;
                                // 충분한 거리로 위치 조정 (방향 벡터 사용)
                                const angle = Math.atan2(topPercent - existing.top, leftPercent - existing.left);
                                // 최소 거리를 확보하기 위해 충분히 이동
                                const moveDistance = minDistance - distance + 2; // 2% 여유
                                topPercent += Math.sin(angle) * moveDistance;
                                leftPercent += Math.cos(angle) * moveDistance;
                                break;
                              }
                            }
                            
                            if (!hasOverlap) break;
                            attempts++;
                            
                            // 시도 횟수가 많아지면 랜덤 위치 재시도
                            if (attempts > 20) {
                              topPercent = minTop + Math.random() * (maxTop - minTop);
                              leftPercent = minLeft + Math.random() * (maxLeft - minLeft);
                            }
                          }
                          
                          // 최종 검증: 모든 기존 ellipse와의 거리를 다시 확인하고, 겹치면 강제로 이동
                          for (const existing of existingPositions) {
                            const topDiff = Math.abs(topPercent - existing.top);
                            const leftDiff = Math.abs(leftPercent - existing.left);
                            const distance = Math.sqrt(topDiff * topDiff + leftDiff * leftDiff);
                            const ellipseSizePercent = (ellipseSize / 800) * 100;
                            const existingSizePercent = (existing.size / 800) * 100;
                            const minDistance = ((ellipseSizePercent / 2) + (existingSizePercent / 2)) * 1.2;
                            
                            if (distance < minDistance) {
                              // 겹치면 강제로 충분한 거리만큼 이동
                              const angle = Math.atan2(topPercent - existing.top, leftPercent - existing.left);
                              const moveDistance = minDistance - distance + 3; // 3% 여유
                              topPercent += Math.sin(angle) * moveDistance;
                              leftPercent += Math.cos(angle) * moveDistance;
                            }
                          }
                          
                          // 경계 체크 및 ellipse가 화면 밖으로 나가지 않도록 추가 검증
                          topPercent = Math.max(minTop, Math.min(maxTop, topPercent));
                          
                          // leftPercent는 ellipse의 중심 위치이므로, ellipse의 반지름을 고려한 범위 체크
                          // ellipse가 화면 밖(0% 또는 100%)으로 나가지 않도록
                          const currentMinLeft = Math.max(10, 10 + ellipseRadiusPercent);
                          const currentMaxLeft = Math.min(90, 90 - ellipseRadiusPercent);
                          leftPercent = Math.max(currentMinLeft, Math.min(currentMaxLeft, leftPercent));
                          
                          return { topPercent, leftPercent };
                        };
                        
                        const { topPercent, leftPercent } = getPosition(index, keywordLength, ellipseSize);
                        
                        return (
                          <div
                            key={index}
                            className="absolute cursor-pointer"
                            onClick={() => handleKeywordClick(keyword)}
                            style={{
                              top: `${topPercent}%`,
                              left: `${leftPercent}%`,
                              width: `${ellipseSize}px`,
                              height: `${ellipseSize}px`,
                              borderRadius: '297px',
                              opacity: isKeywordsAnimatingOut ? 0 : 0.65,
                              background: 'radial-gradient(50% 50% at 50% 50%, #DEE6FF 43.75%, #FFF 65.87%, rgba(255, 255, 255, 0.61) 100%)',
                              boxShadow: '0 -14px 20px 0 #FFEFFC, 0 20px 20px 0 #CBD7F3, 0 4px 100px 0 #CFE9FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'absolute',
                              transform: isKeywordsAnimatingOut 
                                ? `translate(-50%, calc(-50% - ${topPercent + 50}vh))` 
                                : 'translate(-50%, -50%)',
                              transition: isKeywordsAnimatingOut 
                                ? `transform 0.8s ease-out ${index * 0.1}s, opacity 0.8s ease-out ${index * 0.1}s` 
                                : 'transform 0.2s ease-out',
                            }}
                            onMouseEnter={(e) => {
                              if (!isKeywordsAnimatingOut) {
                                e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isKeywordsAnimatingOut) {
                                e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                              }
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'Pretendard Variable',
                                fontSize: `${Math.max(14, Math.min(18, ellipseSize / 8))}px`,
                                fontWeight: 500,
                                color: '#1f2937',
                                textAlign: 'center',
                                lineHeight: '1.4',
                                padding: `${padding}px`,
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none',
                              }}
                            >
                              {keyword}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* End 버튼 - 하단 고정 (키워드 화면에서만 표시) */}
                    {!selectedKeyword && !showFinalMessage && (
                      <div className="fixed bottom-0 left-0 right-0 z-20 px-6 pb-8 pt-4 bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm safe-bottom">
                        <button
                          onClick={handleEndButton}
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
                            fontWeight: 700,
                            lineHeight: '110%',
                            letterSpacing: '-0.64px',
                          }}
                        >
                          End
                        </button>
                      </div>
                    )}
                  </div>
                  )
                ) : showEndMessage ? (
                  // 종료 메시지 화면
                  <div className="fixed inset-0 flex flex-col items-center justify-center">
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
                        text="오늘의 대화가 모두 끝났어요. 제가 안내한 내용을 정리해드릴게요"
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
                ) : (
                  <div className="relative">
                    {/* 로딩 중 또는 AI 답변이 있을 때 ChatBubble 렌더링 */}
                    {(chatState.isLoading || voiceState.isProcessingVoice || chatState.messages.filter(msg => msg.role === 'assistant').length > 0) && (
                      <div 
                        className="space-y-4"
                        style={{
                          opacity: 1,
                          transition: 'opacity 0.5s ease-in-out',
                          animation: !chatState.isLoading && !voiceState.isProcessingVoice && chatState.messages.filter(msg => msg.role === 'assistant').length > 0 ? 'fadeIn 0.5s ease-in-out' : 'none',
                        }}
                      >
                        {(chatState.isLoading || voiceState.isProcessingVoice) ? (
                          <ChatBubble 
                            key="thinking-bubble"
                            message={{ role: 'assistant', content: '' }} 
                            isThinking={true}
                            onPlayTTS={playFull}
                            isPlayingTTS={isPlayingTTS}
                            isGlobalLoading={chatState.isLoading || voiceState.isProcessingVoice}
                            typewriterVariant={typewriterVariant}
                            isRecording={voiceState.isRecording}
                          />
                        ) : (
                          <>
                            {chatState.messages
                              .filter(msg => msg.role === 'assistant')
                              .slice(-1)
                              .map((message, index) => (
                                <ChatBubble 
                                  key={`${message.role}-${index}`}
                                  message={message} 
                                  isThinking={false}
                                  onPlayTTS={playFull}
                                  isPlayingTTS={isPlayingTTS}
                                  isGlobalLoading={chatState.isLoading}
                                  typewriterVariant={typewriterVariant}
                                />
                              ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* 하단 고정 입력창 또는 대화 요약 보러가기 버튼 */}
      {!showSummary && !showEndMessage && (
      <>
        {/* AI 답변 컨테이너와 추천 chips 사이의 gradient 구분선 */}
        {!isConversationEnded && (chatState.messages.length === 0 || assistantMessages.length > 0) && (
          <div 
            className="fixed left-0 right-0 z-20"
            style={{
              width: '100%',
              bottom: '0', // 입력창 높이(56px) + padding bottom(16px) + chips marginBottom(16px) + 18px (추천 chips 상단에서 18px 위)
              height: '288px', // h-72 (18rem = 288px)
              background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 30%, rgba(255,255,255,0.95) 60%, rgb(255,255,255) 100%)',
              pointerEvents: 'none',
            }}
          />
        )}
        {isConversationEnded ? (
          // 6번째 답변 후: 대화 요약 보러가기 버튼
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm safe-bottom">
            <div className="px-6 pb-8 pt-4">
              <button
                onClick={handleShowSummary}
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
                  fontWeight: 700,
                  lineHeight: '110%',
                  letterSpacing: '-0.64px',
                }}
              >
                대화 요약 보러가기
              </button>
            </div>
          </div>
        ) : (
          <div className="fixed bottom-0 left-0 right-0 z-30 p-4 safe-bottom">
            {/* 일반 입력창 */}
            <form onSubmit={handleSubmit} className="w-full">
          {/* 추천 텍스트 chips - 입력창 바로 위에 고정 (환영 메시지 또는 AI 답변 후) */}
          {(chatState.messages.length === 0 || assistantMessages.length > 0) && (
            <div style={{ marginBottom: '16px' }}>
              {renderRecommendationChips(0, true, assistantMessages.length > 0)}
            </div>
          )}
          <div 
            className="flex items-center"
            style={{
              borderRadius: '22px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.18) 100%)',
              border: '1px solid rgba(255,255,255,0.65)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.78), 0 16px 34px rgba(60,34,88,0.16)',
              backdropFilter: 'blur(28px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
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
                color: '#878181',
                fontFamily: 'Pretendard Variable',
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '150%',
                caretColor: '#FFF',
              }}
              className="flex-1 px-4 py-3 bg-transparent focus:outline-none placeholder-[#878181]"
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
                <img src="/pause.svg" alt="녹음 중지" className="w-5 h-5" />
              ) : (
                <svg className="w-5 h-5 text-[#878181]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
            </form>
          </div>
        )}
      </>
      )}
    </div>
  );
}
