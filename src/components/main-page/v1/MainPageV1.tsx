'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatBubble } from '@/components/ChatBubble';
import { Message } from '@/types';
import { createAssistantMessage, createErrorMessage, createUserMessage } from '@/lib/messageUtils';
import { createWavBlob, getAudioConstraints, checkMicrophonePermission, handleMicrophoneError, checkBrowserSupport } from '@/lib/audioUtils';
import { requestTTS, AudioManager } from '@/lib/ttsUtils';
import { Button, Input, Textarea, Card, CardHeader, CardContent, CardFooter, Badge, LoadingSpinner, SplitWords } from '@/components/ui';
import AnimatedLogo from '@/components/ui/AnimatedLogo';
import TextPressure from '@/components/ui/TextPressure';
import ChatTypewriter from '@/components/ui/ChatTypewriter';

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
      
      // 큰 글씨로 표시되는 상단 영역(firstSentence)만 TTS 재생
      let textToPlay = '';
      
      // 첫 번째 문장 추출 함수 (ChatBubble.tsx와 동일한 로직)
      const getFirstSentence = (text: string) => {
        const match = text.match(/[^.!?]*(?:[.!?]|$)/);
        return match ? match[0].trim() : text.split(/[.!?]/)[0].trim();
      };
      
      if (message.segments && message.segments.length > 0) {
        // 세그먼트가 있으면 첫 번째 세그먼트의 첫 번째 문장만 재생
        textToPlay = getFirstSentence(message.segments[0].text);
      } else {
        // 세그먼트가 없으면 전체 내용의 첫 번째 문장만 재생
        textToPlay = getFirstSentence(message.content);
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

interface MainPageV1Props {
  showBlob?: boolean;
}

export default function MainPageV1({ showBlob = true }: MainPageV1Props = { showBlob: true }) {
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
  const [keywordToTurnMap, setKeywordToTurnMap] = useState<Map<string, number>>(new Map());
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedKeywordTurn, setSelectedKeywordTurn] = useState<number | null>(null);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [isKeywordsAnimatingOut, setIsKeywordsAnimatingOut] = useState(false);
  const [showFifthAnswerWarning, setShowFifthAnswerWarning] = useState(false);

  // 랜덤으로 3개 선택
  const getRandomRecommendations = useCallback(() => {
    const shuffled = [...recommendationMessages].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  // 사용자 메시지 요약 함수
  const summarizeUserMessage = useCallback((text: string) => {
    // 패턴 기반 요약
    const patterns = [
      { pattern: /가족.*?놀/i, replacement: '가족과 놀거리 추천' },
      { pattern: /친구.*?먹/i, replacement: '친구와 먹거리 추천' },
      { pattern: /데이트.*?좋/i, replacement: '데이트하기 좋은 곳' },
      { pattern: /컨퍼런스.*?쉬/i, replacement: '컨퍼런스 중 쉬기 좋은 곳' },
      { pattern: /홀로.*?방문/i, replacement: '홀로 방문하기 좋은 곳' },
      { pattern: /조용.*?작업/i, replacement: '조용히 작업할 카페' },
      { pattern: /핫플레이스/i, replacement: '핫플레이스 추천' },
      { pattern: /문화.*?체험/i, replacement: '문화 체험 장소' },
      { pattern: /쇼핑.*?좋/i, replacement: '쇼핑하기 좋은 곳' },
    ];
    
    // 패턴 매칭
    for (const { pattern, replacement } of patterns) {
      if (pattern.test(text)) {
        return replacement;
      }
    }
    
    // 패턴에 매칭되지 않으면 키워드 기반 요약
    const keywords = ['가족', '친구', '혼자', '데이트', '컨퍼런스', '식당', '카페', '쇼핑'];
    const foundKeyword = keywords.find(kw => text.includes(kw));
    
    if (foundKeyword) {
      return `${foundKeyword} 관련 추천`;
    }
    
    // 아무것도 매칭되지 않으면 원본 반환 (최대 20자)
    return text.length > 20 ? text.substring(0, 20) + '...' : text;
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
  }, [chatState.messages, isConversationEnded, chatState.isLoading]);

  // 5번째 답변 완료 시 안내 메시지 표시
  useEffect(() => {
    const assistantMessages = chatState.messages.filter(msg => msg.role === 'assistant');
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

  // 정보 요구 질문인지 확인하는 함수
  const isInfoRequestQuestion = useCallback((question: string) => {
    const infoRequestPatterns = [
      /추천|알려|정보|위치|어디|어떤|어때|어떠|있어|찾아|보여|가르쳐|안내|소개|추천해|알려줘|알려줄|가르쳐줘/i,
      /카페|식당|레스토랑|맛집|음식|장소|공간|장소|이벤트|전시|체험|활동|프로그램/i,
      /어디서|어디에|어디로|어디가|어디서|어디에|어디로|어디가/i,
    ];
    
    return infoRequestPatterns.some(pattern => pattern.test(question));
  }, []);

  // 정보성 키워드 추출 함수 (각 turn별로 추출)
  const extractInfoKeywords = useCallback(() => {
    const keywords: Array<{ keyword: string; turnIndex: number }> = [];
    const keywordMap = new Map<string, number>();
    
    // 대화를 turn별로 그룹화 (사용자 질문 + AI 답변)
    const turns: Array<{ userMessage: Message; assistantMessage: Message; turnIndex: number }> = [];
    
    for (let i = 0; i < chatState.messages.length; i++) {
      if (chatState.messages[i].role === 'user') {
        const userMessage = chatState.messages[i];
        const assistantMessage = chatState.messages[i + 1];
        
        if (assistantMessage && assistantMessage.role === 'assistant') {
          // 정보 요구 질문인지 확인
          if (isInfoRequestQuestion(userMessage.content)) {
            turns.push({
              userMessage,
              assistantMessage,
              turnIndex: Math.floor(turns.length) + 1 // 1-based turn index
            });
          }
        }
      }
    }
    
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
    
    // 각 turn에서 키워드 추출
    turns.forEach(({ assistantMessage, turnIndex }) => {
      const messageContent = assistantMessage.content;
      const foundKeywords: Set<string> = new Set();
      
      // 알려진 키워드 찾기
      knownKeywords.forEach(keyword => {
        if (messageContent.includes(keyword) || 
            messageContent.includes(keyword.replace(/\s/g, '')) ||
            keyword.split(' ').every(word => messageContent.includes(word))) {
          foundKeywords.add(keyword);
        }
      });
      
      // 추천 문구 패턴 찾기
      const recommendationPatterns = [
        /([가-힣\s]+(?:추천|정보|위치|어때요|어때|어떠실까요|있어요))/g,
        /([가-힣\s]+(?:카페|식당|레스토랑|공간|장소|아트|전시|이벤트))/g,
      ];
      
      recommendationPatterns.forEach(pattern => {
        const matches = messageContent.matchAll(pattern);
        for (const match of matches) {
          const keyword = match[1]?.trim();
          // 불완전한 키워드 필터링
          if (keyword && 
              keyword.length >= 3 && 
              keyword.length <= 20 && 
              !keyword.includes('제가') && 
              !keyword.includes('이솔') &&
              !keyword.startsWith('를') &&
              !keyword.startsWith('은') &&
              !keyword.startsWith('는') &&
              !keyword.startsWith('이') &&
              !keyword.startsWith('가') &&
              !keyword.startsWith('의') &&
              !keyword.startsWith('와') &&
              !keyword.startsWith('과') &&
              !keyword.endsWith('라는') &&
              !keyword.endsWith('라는 카페') &&
              !keyword.endsWith('를 추천')) {
            foundKeywords.add(keyword);
          }
        }
      });
      
      // 각 키워드를 turn에 매핑 (같은 키워드가 여러 turn에 있으면 첫 번째만 저장)
      foundKeywords.forEach(keyword => {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, turnIndex);
          keywords.push({ keyword, turnIndex });
        }
      });
    });
    
    // 불완전한 키워드 제거
    const filteredKeywords = keywords.filter(({ keyword }) => {
      const trimmed = keyword.trim();
      
      if (!trimmed || trimmed.length < 2) return false;
      
      const startsWithParticle = /^(를|은|는|이|가|의|와|과|로|으로|에게|에게서|에서|까지|부터|보다|처럼|같이|만|도|조차|마저|까지|까지도|뿐|따라|통해|위해|대해|관해|대한|위한|관한)\s/.test(trimmed);
      if (startsWithParticle) return false;
      
      const endsWithParticle = /\s?(라는|라는\s+카페|를\s+추천|는|은|이|가|를|을|의|와|과|로|으로|에서|까지|부터|보다)$/.test(trimmed);
      if (endsWithParticle) return false;
      
      const invalidPatterns = [
        '를 추천',
        '라는 카페',
        '라는',
        '를',
        '을',
        '은',
        '는',
        '이',
        '가'
      ];
      
      if (invalidPatterns.includes(trimmed) || invalidPatterns.some(pattern => trimmed.includes(pattern + ' '))) {
        return false;
      }
      
      const startsWithNoun = /^[가-힣]+/.test(trimmed);
      if (!startsWithNoun) return false;
      
      return true;
    });
    
    // 키워드를 길이 순으로 정렬 (짧은 것부터)
    filteredKeywords.sort((a, b) => a.keyword.length - b.keyword.length);
    
    // 최대 6개까지만 반환
    const limitedKeywords = filteredKeywords.slice(0, 6);
    
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
  const handleNextToSummary = useCallback(() => {
    const { keywords, keywordMap } = extractInfoKeywords();
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
      {/* Blurry Blob 배경은 AppFlow에서 관리 (키워드 요약 화면에서는 숨김) */}
      {showBlob && !showSummary && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          {/* BlobBackground는 AppFlow에서 렌더링됨 */}
        </div>
      )}
      
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
      <main className="relative flex-1 flex flex-col min-h-0 pb-32 pt-32">
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
                    <ChatTypewriter
                      text="안녕하세요! 이솔이에요"
                      speed={50}
                      delay={0}
                    />
                  </div>
                  <div className="flex justify-center mt-2">
                    <ChatTypewriter
                      text="코엑스 안내를 도와드릴게요"
                      speed={50}
                      delay={800}
                    />
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
                            fontSize: '45pt',
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
                            fontSize: '45pt',
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
                            fontSize: '45pt',
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
                                onPlayTTS={ttsState.playTTS}
                                isPlayingTTS={ttsState.isPlayingTTS}
                                isGlobalLoading={false}
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
                              // 따라서 반지름 합보다 충분히 큰 거리 확보 (10% 여유 추가)
                              const minDistance = ((ellipseSizePercent / 2) + (existingSizePercent / 2)) * 1.1;
                              
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
                ) : chatState.isLoading ? (
                  // 로딩 중: 요약된 사용자 메시지 표시
                  <div className="flex flex-col min-h-full">
                    {/* 중간에 요약된 사용자 메시지와 '이솔이 생각 중입니다...' 표시 */}
                    <div className="flex-1 flex flex-col items-center justify-center" style={{ minHeight: '40vh' }}>
                      {chatState.messages
                        .filter(msg => msg.role === 'user')
                        .slice(-1)
                        .map((message) => (
                          <div
                            key={`summarized-${message.role}-${message.timestamp || Date.now()}`}
                            style={{
                              color: '#666D6F',
                              textAlign: 'center',
                              fontFamily: 'Pretendard Variable',
                              fontSize: '22px',
                              fontStyle: 'normal',
                              fontWeight: 700,
                              lineHeight: '132%',
                              letterSpacing: '-0.88px',
                              marginBottom: '24px',
                              padding: '0 24px',
                            }}
                          >
                            {summarizeUserMessage(message.content)}
                          </div>
                        ))}
                      <div className="flex items-center gap-3" style={{ color: '#000' }}>
                        <LoadingSpinner size="sm" />
                        <span className="text-base">이솔이 생각 중입니다...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // 로딩 완료: AI 답변만 표시 (사용자 메시지 숨김)
                  <div className="space-y-4">
                    {chatState.messages
                      .filter(msg => msg.role === 'assistant')
                      .slice(-1)
                      .map((message, index) => (
                        <ChatBubble 
                          key={`${message.role}-${index}`}
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
        ) : (
          // 일반 입력창
          <form onSubmit={handleSubmit} className="w-full">
          <div 
            className="flex items-center"
            style={{
              borderRadius: '22px',
              background: 'rgba(217, 217, 217, 0.60)',
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
