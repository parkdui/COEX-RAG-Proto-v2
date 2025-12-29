'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatBubble } from '@/components/ChatBubble';
import { Message } from '@/types';
import { createAssistantMessage, createUserMessage } from '@/lib/messageUtils';
import { createWavBlob, getAudioConstraints, checkMicrophonePermission, handleMicrophoneError, checkBrowserSupport } from '@/lib/audioUtils';
import { ChatTypewriterV1, ChatTypewriterV2, ChatTypewriterV3, SplitText } from '@/components/ui';
import AnimatedLogo from '@/components/ui/AnimatedLogo';
import ThinkingBlob from '@/components/ui/ThinkingBlob';
import AudioWaveVisualizer from '@/components/ui/AudioWaveVisualizer';
import { CanvasBackground } from '@/components/ui/BlobBackgroundV2Canvas';
import useCoexTTS from '@/hooks/useCoexTTS';
import { useChatState } from './hooks/useChatState';
import { useVoiceRecording } from './hooks/useVoiceRecording';
import { apiRequests } from './utils/apiRequests';
import { fixedQAData } from './constants/fixedQAData';
import { RecommendationChips } from './components/RecommendationChips';
import { KeywordCircles } from './components/KeywordCircles';
import { EndMessageScreen, FinalMessageScreen, KeywordDetailScreen } from './components/EndScreens';
import { isInfoRequestQuestion, getFallbackSummary } from './utils/questionUtils';

type TypewriterVariant = 'v1' | 'v2' | 'v3';

const typewriterComponentMap: Record<TypewriterVariant, React.ComponentType<any>> = {
  v1: ChatTypewriterV1,
  v2: ChatTypewriterV2,
  v3: ChatTypewriterV3,
};

interface MainPageV1Props {
  showBlob?: boolean;
}

export default function MainPageV1({ showBlob = true }: MainPageV1Props = { showBlob: true }) {
  const chatRef = useRef<HTMLDivElement>(null);
  const chatState = useChatState();
  const voiceState = useVoiceRecording();
  const { isPlayingTTS, playFull, prepareAuto } = useCoexTTS();
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
  const [circleAnimationOffsets, setCircleAnimationOffsets] = useState<number[]>([]);

  const GreetingTypewriter = typewriterComponentMap[typewriterVariant];
  
  // Circle 진자 운동 애니메이션
  useEffect(() => {
    if (!showSummary || extractedKeywords.length === 0 || isKeywordsAnimatingOut) {
      setCircleAnimationOffsets([]);
      return;
    }
    
    let animationFrameId: number;
    const startTime = Date.now();
    
    const animate = () => {
      const offsets = extractedKeywords.map((_, index) => {
        const speed = 0.5 + (index * 0.15); // 0.5 ~ 1.25
        const phase = index * 0.5; // 위상 차이
        const maxOffset = 4 + (index % 3) * 1.5; // 4px ~ 8px (최대 8px)
        const elapsed = (Date.now() - startTime) / 1000;
        return Math.sin(elapsed * speed + phase) * maxOffset;
      });
      setCircleAnimationOffsets(offsets);
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [showSummary, extractedKeywords.length, isKeywordsAnimatingOut]);

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

  const getRandomRecommendations = useCallback(() => {
    // fixedQAData의 question들을 사용
    const questions = fixedQAData.map(qa => qa.question);
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  // 사용자 메시지 요약 상태
  const [userMessageSummaries, setUserMessageSummaries] = useState<Record<string, string>>({});


  const summarizeUserMessage = useCallback(async (text: string, messageId?: string) => {
    if (!text || !text.trim()) return text;
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
        
        if (cacheKey) {
          setUserMessageSummaries(prev => ({
            ...prev,
            [cacheKey]: summary,
          }));
        }
        
        return summary;
      } else {
        return getFallbackSummary(text);
      }
    } catch (error) {
      console.error('Summarize question error:', error);
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
    async (response: { answer?: string; tokens?: any; hits?: any[]; defaultAnswer?: string; thumbnailUrl?: string }) => {
      const answerText = response.answer || response.defaultAnswer || '(응답 없음)';
      // TTS 재작성 시 토큰 추적을 위해 sessionId와 rowIndex 전달
      const playbackStarter = await prepareAuto(
        answerText,
        chatState.sessionId,
        chatState.rowIndex
      );

      const assistantMessage = createAssistantMessage({
        answer: answerText,
        tokens: response.tokens,
        hits: response.hits,
        defaultAnswer: response.defaultAnswer,
        thumbnailUrl: response.thumbnailUrl, // 이미지 경로 전달
      });

      chatState.addMessage(assistantMessage);

      if (playbackStarter) {
        playbackStarter().catch((error) => {
          console.error('Failed to start prepared TTS playback:', error);
        });
      }
    },
    [chatState.addMessage, chatState.sessionId, chatState.rowIndex, prepareAuto],
  );

  // 스크롤을 맨 아래로 이동
  const scrollToCenter = useCallback(() => {
    if (chatRef.current) {
      const container = chatRef.current;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      // center로 스크롤
      container.scrollTop = (scrollHeight - clientHeight) / 2;
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scroll({
        top: chatRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    // 메시지가 추가될 때 center로 스크롤
    if (chatState.messages.length > 0) {
      setTimeout(() => {
        scrollToCenter();
      }, 100);
    }
  }, [chatState.messages, scrollToCenter]);

  useEffect(() => {
    if (!chatState.isLoading) return;

    const intervalId = setInterval(() => {
      scrollToCenter();
    }, 500);

    return () => clearInterval(intervalId);
  }, [chatState.isLoading, scrollToCenter]);

  // AI 답변이 처음 나타날 때 중앙으로 스크롤
  useEffect(() => {
    const hasAssistantMessage = chatState.messages.some(msg => msg.role === 'assistant');
    if (hasAssistantMessage && chatRef.current) {
      // AI 답변이 나타날 때 중앙으로 스크롤
      setTimeout(() => {
        scrollToCenter();
      }, 150);
    }
  }, [chatState.messages.filter(msg => msg.role === 'assistant').length, scrollToCenter]);

  // 초기 로드 시 center로 스크롤
  useEffect(() => {
    if (chatRef.current && chatState.messages.length > 0) {
      setTimeout(() => {
        scrollToCenter();
      }, 300);
    }
  }, []);

  // AI 답변이 완료되면 input value 비우기
  useEffect(() => {
    if (!chatState.isLoading && !voiceState.isProcessingVoice && chatState.inputValue.trim()) {
      // AI 답변이 완료되면 input을 비워서 placeholder가 보이도록 함
      chatState.setInputValue('');
    }
  }, [chatState.isLoading, voiceState.isProcessingVoice, chatState.setInputValue]);

  useEffect(() => {
    if (!chatState.isLoading && assistantMessages.length > 0) {
      setShowRecommendationChips(false);
      const timer = setTimeout(() => {
        setShowRecommendationChips(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chatState.isLoading, assistantMessages.length]);

  useEffect(() => {
    const assistantCount = assistantMessages.length;

    if (assistantCount >= 6 && !isConversationEnded && !chatState.isLoading) {
      const timer = setTimeout(() => {
        setIsConversationEnded(true);
        setShowFifthAnswerWarning(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [assistantMessages, isConversationEnded, chatState.isLoading]);

  useEffect(() => {
    const assistantCount = assistantMessages.length;

    if (assistantCount === 5 && !chatState.isLoading && !isConversationEnded && assistantCount < 6) {
      setShowFifthAnswerWarning(true);
      const timer = setTimeout(() => {
        setShowFifthAnswerWarning(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
    
    if (assistantCount >= 6) {
      setShowFifthAnswerWarning(false);
    }
  }, [assistantMessages, isConversationEnded, chatState.isLoading]);

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

  const processAudio = useCallback(async (audioBlob: Blob) => {
    voiceState.setIsProcessingVoice(true);
    
    try {
      const result = await apiRequests.sendSTTRequest(audioBlob);

      if (result.success && result.text) {
        chatState.setInputValue(result.text);
        
        const userMessage = createUserMessage(result.text);
        chatState.addMessage(userMessage);

        chatState.setIsLoading(true);
        try {
          const historyToSend = chatState.chatHistory.slice(-4); // 최근 2턴 (토큰 절감 + 맥락 유지)
          const nextMessageNumber = chatState.messageNumber + 1;
          const chatData = await apiRequests.sendChatRequest(result.text, chatState.systemPrompt, historyToSend, chatState.rowIndex, chatState.sessionId, nextMessageNumber);

          if (chatData.error) {
            chatState.addErrorMessage(chatData.error);
          } else {
            if (chatData.rowIndex) {
              chatState.setRowIndex(chatData.rowIndex);
            }
            if (chatData.sessionId) {
              chatState.setSessionId(chatData.sessionId);
            }
            chatState.setMessageNumber(nextMessageNumber);
            
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
      
      // AudioWaveVisualizer를 위한 stream 저장
      voiceState.setAudioStream(stream);
      
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
      
      // 자동 중지 로직을 위한 변수들
      let silenceStartTime: number | null = null;
      const SILENCE_THRESHOLD = 0.01; // 음성 레벨 임계값
      const SILENCE_DURATION = 2000; // 2초 동안 조용하면 자동 중지
      let lastSoundTime = Date.now();
      const recordingStartTime = Date.now();
      
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        audioData.push(new Float32Array(inputData));
        
        // 음성 레벨 계산
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
        }
        const average = sum / inputData.length;
        const level = average;
        
        // 음성이 감지되면
        if (level > SILENCE_THRESHOLD) {
          lastSoundTime = Date.now();
          silenceStartTime = null;
        } else {
          // 조용한 상태
          const now = Date.now();
          if (silenceStartTime === null) {
            silenceStartTime = now;
          } else {
            // 조용한 시간이 임계값을 넘으면 자동 중지
            const silenceDuration = now - silenceStartTime;
            const recordingDuration = now - recordingStartTime;
            
            // 최소 1초 이상 녹음되었고, 2초 이상 조용하면 자동 중지
            if (silenceDuration >= SILENCE_DURATION && recordingDuration >= 1000 && (window as any).stopRecording) {
              (window as any).stopRecording();
            }
          }
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      const stopRecording = () => {
        processor.disconnect();
        source.disconnect();
        audioContext.close();
        stream.getTracks().forEach(track => track.stop());
        
        // stream 정리
        voiceState.setAudioStream(null);
        
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
  }, [processAudio, voiceState.setIsRecording, voiceState.setAudioStream]);

  const stopRecording = useCallback(() => {
    if (voiceState.isRecording && (window as any).stopRecording) {
      (window as any).stopRecording();
    }
  }, [voiceState.isRecording]);

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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatState.inputValue.trim() || chatState.isLoading || isConversationEnded) return;

    const question = chatState.inputValue.trim(); // inputValue를 변수에 저장 (setInputValue 전에)
    const userMessage = createUserMessage(question);
    chatState.addMessage(userMessage);
    chatState.setInputValue('');
    chatState.setIsLoading(true);

    try {
      const historyToSend = chatState.chatHistory.slice(-2); // 최근 1턴만 (토큰 절감)
      const nextMessageNumber = chatState.messageNumber + 1;
      const data = await apiRequests.sendChatRequest(question, chatState.systemPrompt, historyToSend, chatState.rowIndex, chatState.sessionId, nextMessageNumber);

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
        // messageNumber 업데이트
        chatState.setMessageNumber(nextMessageNumber);
        
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

  const handleGoButton = useCallback(async () => {
    chatState.setIsGoButtonDisabled(true);
    chatState.setIsLoading(true);

    try {
      const nextMessageNumber = 1; // 첫 번째 메시지
      const data = await apiRequests.sendChatRequest(
        "안녕하세요! 이솔이에요. 오늘 어떤 무드로 코엑스를 즐기고 싶으신가요?",
        chatState.systemPrompt,
        [],
        chatState.rowIndex,
        chatState.sessionId,
        nextMessageNumber
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
        // messageNumber 업데이트
        chatState.setMessageNumber(nextMessageNumber);
        
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.nativeEvent as any).isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);


  const extractInfoKeywords = useCallback(async () => {
    const keywords: Array<{ keyword: string; turnIndex: number }> = [];
    const keywordMap = new Map<string, number>();
    const allTurns: Array<{ userMessage: Message; assistantMessage: Message; turnIndex: number; isInfoRequest: boolean }> = [];
    
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
          
          if (!keyword || keyword.length === 0) {
            keyword = '대화 요약';
          }
          
          keywordMap.set(keyword, firstTurn.turnIndex);
          keywords.push({ keyword, turnIndex: firstTurn.turnIndex });
        }
      } catch (error) {
        console.error('키워드 추출 오류:', error);
        const defaultKeyword = '대화 요약';
        keywordMap.set(defaultKeyword, firstTurn.turnIndex);
        keywords.push({ keyword: defaultKeyword, turnIndex: firstTurn.turnIndex });
      }
    }
    
    keywords.sort((a, b) => a.keyword.length - b.keyword.length);
    
    const limitedKeywords = keywords.slice(0, 6);
    
    return {
      keywords: limitedKeywords.map(k => k.keyword),
      keywordMap: new Map(limitedKeywords.map(k => [k.keyword, k.turnIndex]))
    };
  }, [chatState.messages, isInfoRequestQuestion]);

  // 대화 요약 보러가기 버튼 클릭 핸들러 (종료 메시지 화면으로 이동)
  const handleShowSummary = useCallback(() => {
    setShowEndMessage(true);
  }, []);

  const handleNextToSummary = useCallback(async () => {
    const { keywords, keywordMap } = await extractInfoKeywords();
    setExtractedKeywords(keywords);
    setKeywordToTurnMap(keywordMap);
    setShowSummary(true);
  }, [extractInfoKeywords]);

  const handleKeywordClick = useCallback((keyword: string) => {
    const turnIndex = keywordToTurnMap.get(keyword);
    if (turnIndex !== undefined) {
      setSelectedKeyword(keyword);
      setSelectedKeywordTurn(turnIndex);
    }
  }, [keywordToTurnMap]);

  const handleBackToKeywords = useCallback(() => {
    setSelectedKeyword(null);
    setSelectedKeywordTurn(null);
  }, []);

  const handleEndButton = useCallback(() => {
    setIsKeywordsAnimatingOut(true);
    setTimeout(() => {
      setShowFinalMessage(true);
    }, 800);
  }, []);

  const handleRecommendationClick = useCallback(async (recommendation: string) => {
    if (chatState.isLoading || isConversationEnded) return;
    
    const userMessage = createUserMessage(recommendation);
    chatState.addMessage(userMessage);
    
    // 항상 '생각 중이에요' 화면을 보여주기 위해 isLoading을 true로 설정
    chatState.setIsLoading(true);
    
    // 최소 1.5초 대기 시간을 보장하기 위한 Promise
    const minWaitTime = new Promise(resolve => setTimeout(resolve, 1500));
    
    // 고정 Q&A 데이터에서 일치하는 질문 찾기
    const matchedQA = fixedQAData.find(qa => qa.question === recommendation);
    
    if (matchedQA && matchedQA.answers.length > 0) {
      const randomAnswerObj = matchedQA.answers[Math.floor(Math.random() * matchedQA.answers.length)];
      // answer가 객체 형태인 경우 text와 image 추출, 문자열인 경우 하위 호환성 유지
      const randomAnswerText = typeof randomAnswerObj === 'string' 
        ? randomAnswerObj 
        : randomAnswerObj.text;
      const randomAnswerImage = typeof randomAnswerObj === 'string' 
        ? undefined 
        : randomAnswerObj.image;
      
      const nextMessageNumber = chatState.messageNumber + 1;
      
      // 고정 답변 사용 시에도 로그 저장
      try {
        const now = new Date();
        const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const timestamp = koreanTime.toISOString().replace('T', ' ').substring(0, 19) + ' (KST)';
        const systemPromptForLog = (chatState.systemPrompt || '').substring(0, 100) + ((chatState.systemPrompt || '').length > 100 ? '...' : '');
        
        const logResult = await apiRequests.logMessage(
          chatState.sessionId || `session-${Date.now()}`,
          nextMessageNumber,
          recommendation,
          randomAnswerText,
          chatState.rowIndex,
          timestamp,
          systemPromptForLog
        );
        
        if (logResult.rowIndex) {
          chatState.setRowIndex(logResult.rowIndex);
        }
        if (logResult.sessionId) {
          chatState.setSessionId(logResult.sessionId);
        }
      } catch (error) {
        console.error('Failed to log fixed answer message:', error);
        // 로그 저장 실패해도 메인 플로우는 계속 진행
      }
      
      chatState.setMessageNumber(nextMessageNumber);
      
      // 최소 대기 시간과 함께 답변 표시
      await minWaitTime;
      
      await pushAssistantMessage({
        answer: randomAnswerText,
        tokens: undefined,
        hits: undefined,
        defaultAnswer: randomAnswerText,
        thumbnailUrl: randomAnswerImage, // 이미지 경로 전달
      });
      
      chatState.setIsLoading(false);
    } else {
      try {
        const historyToSend = chatState.chatHistory.slice(-2); // 최근 1턴만 (토큰 절감)
        const nextMessageNumber = chatState.messageNumber + 1;
        
        // API 요청과 최소 대기 시간을 병렬로 실행
        const [data] = await Promise.all([
          apiRequests.sendChatRequest(recommendation, chatState.systemPrompt, historyToSend, chatState.rowIndex, chatState.sessionId, nextMessageNumber),
          minWaitTime
        ]);

        if (data.error) {
          chatState.addErrorMessage(data.error);
          chatState.setIsLoading(false);
        } else {
          if (data.rowIndex) {
            chatState.setRowIndex(data.rowIndex);
          }
          if (data.sessionId) {
            chatState.setSessionId(data.sessionId);
          }
          chatState.setMessageNumber(nextMessageNumber);
          
          await pushAssistantMessage({
            answer: data.answer,
            tokens: data.tokens,
            hits: data.hits,
            defaultAnswer: '(응답 없음)',
          });
          
          chatState.setIsLoading(false);
        }
      } catch (error) {
        console.error('메시지 전송 실패:', error);
        chatState.addErrorMessage('서버와의 통신에 실패했습니다.');
        chatState.setIsLoading(false);
      }
    }
  }, [chatState, isConversationEnded, pushAssistantMessage]);

  const renderRecommendationChips = useCallback((additionalMarginTop?: number, compact?: boolean, shouldAnimate?: boolean) => {
    if (isConversationEnded) return null;
    
    return (
      <RecommendationChips
        recommendations={randomRecommendations}
        onRecommendationClick={handleRecommendationClick}
        isLoading={chatState.isLoading}
        showRecommendationChips={showRecommendationChips}
        additionalMarginTop={additionalMarginTop}
        compact={compact}
        shouldAnimate={shouldAnimate}
      />
    );
  }, [isConversationEnded, randomRecommendations, handleRecommendationClick, chatState.isLoading, showRecommendationChips]);

  const isThinking = chatState.isLoading || voiceState.isProcessingVoice;

  return (
    <div className="min-h-screen flex flex-col safe-area-inset overscroll-contain relative v10-main-page">
      {showBlob && !showSummary && (
        <CanvasBackground boosted={false} phase="completed" popActive={true} />
      )}
      
      {showBlob && !showSummary && isThinking && (
        <ThinkingBlob isActive={isThinking} />
      )}
      
      <AudioWaveVisualizer stream={voiceState.audioStream} isActive={voiceState.isRecording} />
      
      <AnimatedLogo />

      {showFifthAnswerWarning && !showEndMessage && !showSummary && (
        <div className="fixed top-4 left-0 right-0 z-30 flex justify-center">
          <div
            className="fifth-answer-warning"
            style={{
              fontFamily: 'Pretendard Variable',
              fontSize: '15px',
              fontWeight: 400,
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

      <main className="relative flex-1 flex flex-col min-h-0 pb-32 pt-20" style={{ background: 'transparent' }}>
        <div className="flex-1 overflow-hidden">
          <div ref={chatRef} className="h-full overflow-y-auto px-6 pb-4 space-y-4 overscroll-contain" style={{ minHeight: '100vh' }}>
            {chatState.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-full text-center">
                <div 
                  style={{ 
                    color: '#000', 
                    textAlign: 'center', 
                    fontFamily: 'Pretendard Variable', 
                    fontSize: '22px', 
                    fontStyle: 'normal', 
                    fontWeight: 400, 
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
                    <FinalMessageScreen />
                  ) : selectedKeyword && selectedKeywordTurn !== null ? (
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
                        
                        {(() => {
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
                          transition: isKeywordsAnimatingOut ? 'transform 0.8s ease-out, opacity 0.8s ease-out' : 'none',
                          transform: isKeywordsAnimatingOut ? 'translateY(-100vh)' : 'translateY(0)',
                          opacity: isKeywordsAnimatingOut ? 0 : 1,
                        }}
                      >
                        <KeywordCircles
                          keywords={extractedKeywords}
                          onKeywordClick={handleKeywordClick}
                          circleAnimationOffsets={circleAnimationOffsets}
                          isKeywordsAnimatingOut={isKeywordsAnimatingOut}
                        />
                      </div>
                      
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
                            마치기
                          </button>
                        </div>
                      )}
                    </div>
                  )
                ) : showEndMessage ? (
                  <EndMessageScreen onNextToSummary={handleNextToSummary} />
                ) : (
                  <div className="relative">
                    {/* 음성 녹음 중일 때는 AI 답변 div 숨기고 '듣고 있어요' 표시 */}
                    {voiceState.isRecording ? (
                      <div className="flex items-center justify-center min-h-[60vh]">
                        <ChatBubble 
                          key="listening-bubble"
                          message={{ role: 'assistant', content: '' }} 
                          isThinking={true}
                          onPlayTTS={playFull}
                          isPlayingTTS={isPlayingTTS}
                          isGlobalLoading={true}
                          typewriterVariant={typewriterVariant}
                          isRecording={true}
                        />
                      </div>
                    ) : (chatState.isLoading || voiceState.isProcessingVoice || chatState.messages.filter(msg => msg.role === 'assistant').length > 0) && (
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
                            isRecording={false}
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

      {!showSummary && !showEndMessage && (
      <>
        {isConversationEnded ? (
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
                  fontWeight: 600,
                  lineHeight: '110%',
                  letterSpacing: '-0.64px',
                }}
              >
                대화 요약 보러가기
              </button>
            </div>
          </div>
        ) : (
          !voiceState.isRecording && (
            <div className="fixed bottom-0 left-0 right-0 z-30 p-4 safe-bottom">
              <form onSubmit={handleSubmit} className="w-full">
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
                placeholder="Sori에게 얘기해주세요!"
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
          )
        )}
      </>
      )}
      <style jsx>{`
        .v10-main-page {
          background: transparent;
        }
        
        /* ver10/1.js 스타일: 하단 어두운 그라디언트 (더 부드럽게) */
        .v10-main-page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          background: linear-gradient(
            180deg,
            transparent 0%,
            transparent 60%,
            rgba(0, 0, 0, 0.02) 80%,
            rgba(0, 0, 0, 0.05) 100%
          );
        }
        
        .v10-main-page > :global(.coex-v2-canvas-wrapper) {
          z-index: 1;
        }
        
        /* 5번째 답변 경고 애니메이션 */
        @keyframes slideInFadeInOut {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          12.5% {
            transform: translateX(0);
            opacity: 1;
          }
          87.5% {
            transform: translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        .fifth-answer-warning {
          animation: slideInFadeInOut 4s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
