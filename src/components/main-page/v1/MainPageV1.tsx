'use client';

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { ChatBubble } from '@/components/ChatBubble';
import { Message } from '@/types';
import { createAssistantMessage, createUserMessage } from '@/lib/messageUtils';
import { createWavBlob, getAudioConstraints, checkMicrophonePermission, handleMicrophoneError, checkBrowserSupport } from '@/lib/audioUtils';
import { ChatTypewriterV1, ChatTypewriterV2, ChatTypewriterV3, SplitText } from '@/components/ui';
import Logo from '@/components/ui/Logo';
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
  const modalRef = useRef<HTMLElement | null>(null); // Test2Scene.js처럼 마지막 assistant-glass-wrapper를 추적
  const chatState = useChatState();
  const voiceState = useVoiceRecording();
  const { isPlayingTTS, playFull, prepareAuto } = useCoexTTS();
  const [isConversationEnded, setIsConversationEnded] = useState(false);
  const [showEndMessage, setShowEndMessage] = useState(false); // 개발용: true로 설정하여 바로 확인 가능
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
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set());
  const [visibleChipCount, setVisibleChipCount] = useState<3 | 2>(3);
  const [chipsBehind, setChipsBehind] = useState(false);
  const [chipAIdx, setChipAIdx] = useState(0);
  const [chipBIdx, setChipBIdx] = useState(1);
  const [swapNonce, setSwapNonce] = useState(0);
  const [chipsBottomPx, setChipsBottomPx] = useState(0); // Test2Scene.js처럼 0으로 초기화
  const chipAIdxRef = useRef(0);
  const chipBIdxRef = useRef(1);
  const nextChipIdxRef = useRef(2);
  const chipsWrapRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const placeholderContainerRef = useRef<HTMLDivElement>(null);

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


  // Placeholder vertical carousel sliding animation (AnimatedLogo와 같은 형식)
  useEffect(() => {
    const container = placeholderContainerRef.current;
    if (!container || showSummary || showEndMessage || isConversationEnded) return;

    const textHeight = 21; // 각 텍스트의 높이 (line-height: 150%, font-size: 14px ≈ 21px)
    const containerHeight = 21; // 외부 컨테이너 높이 (텍스트 하나 높이와 동일)
    const holdDuration = 3000; // 중앙에 도착했을 때 3초 대기
    const moveDuration = 2000; // 텍스트가 올라가는 시간 (2초)
    const cycleHeight = textHeight * 2; // 첫 번째 → 두 번째 (2개 텍스트 높이)
    
    // 컨테이너와 텍스트 div 높이가 동일하므로 offset 없음
    const verticalOffset = 0;
    
    // 역동적인 easing 함수
    const easeInOutCubic = (t: number): number => {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    let startTime: number | null = null;
    let animationFrameId: number;
    let currentPosition = verticalOffset;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      
      const elapsed = (currentTime - startTime) / 1000; // 초 단위
      
      // 전체 사이클: hold(3초) → move(2초) → hold(3초) → move(2초) = 10초
      const totalCycleDuration = (holdDuration * 2 + moveDuration * 2) / 1000;
      const cycleProgress = (elapsed % totalCycleDuration) * 1000;
      
      let translateY: number;
      
      // 1단계: 첫 번째 텍스트 중앙에 3초 대기 (0-3000ms)
      if (cycleProgress < holdDuration) {
        translateY = verticalOffset;
      } 
      // 2단계: 첫 번째 텍스트 올라가고 두 번째 텍스트 올라옴 (3000-5000ms)
      else if (cycleProgress >= holdDuration && cycleProgress <= holdDuration + moveDuration) {
        const moveProgress = Math.min((cycleProgress - holdDuration) / moveDuration, 1);
        const easedProgress = easeInOutCubic(moveProgress);
        // 0에서 -21px로 이동 (첫 번째 올라가고 두 번째 나타남)
        translateY = verticalOffset - easedProgress * textHeight;
      } 
      // 3단계: 두 번째 텍스트 중앙에 3초 대기 (5000-8000ms)
      else if (cycleProgress > holdDuration + moveDuration && cycleProgress < holdDuration * 2 + moveDuration) {
        // 정확히 -21px 위치에서 고정 (두 번째 대기)
        translateY = verticalOffset - textHeight;
      } 
      // 4단계: 두 번째 텍스트 올라가고 첫 번째 텍스트 올라옴 (8000-10000ms)
      else {
        const moveProgress = (cycleProgress - (holdDuration * 2 + moveDuration)) / moveDuration;
        const easedProgress = easeInOutCubic(moveProgress);
        translateY = verticalOffset - textHeight - easedProgress * textHeight;
      }
      
      currentPosition = translateY;
      
      if (container) {
        container.style.transform = `translateY(${translateY}px)`;
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    // 초기 위치 설정
    container.style.transform = `translateY(${currentPosition}px)`;
    
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [showSummary, showEndMessage, isConversationEnded]);

  const getRandomRecommendations = useCallback(() => {
    // fixedQAData의 question들을 사용
    const questions = fixedQAData.map(qa => qa.question);
    // 선택된 추천 제외
    const availableQuestions = questions.filter(q => !selectedRecommendations.has(q));
    // 선택된 추천이 너무 많으면 다시 사용 가능하도록
    const questionsToUse = availableQuestions.length >= 3 ? availableQuestions : questions;
    const shuffled = [...questionsToUse].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [selectedRecommendations]);

  const randomRecommendations = useMemo(() => getRandomRecommendations(), [getRandomRecommendations]);

  // Chip indices refs 업데이트
  useEffect(() => {
    chipAIdxRef.current = chipAIdx;
  }, [chipAIdx]);
  useEffect(() => {
    chipBIdxRef.current = chipBIdx;
  }, [chipBIdx]);


  // 3개로 리셋
  useEffect(() => {
    if (visibleChipCount !== 3) return;
    setChipAIdx(0);
    setChipBIdx(1);
    nextChipIdxRef.current = 2;
    setSwapNonce(0);
  }, [visibleChipCount]);

  const assistantMessages = useMemo(
    () => chatState.messages.filter((message) => message.role === 'assistant'),
    [chatState.messages]
  );

  // 마지막 assistant-glass-wrapper를 찾아서 modalRef에 저장 (Test2Scene.js와 동일)
  useLayoutEffect(() => {
    const updateModalRef = () => {
      // chatRef 내부에서만 찾기 (더 정확함)
      const container = chatRef.current;
      if (!container) {
        modalRef.current = null;
        return;
      }

      const assistantGlassWrappers = container.querySelectorAll('.assistant-glass-wrapper');
      if (assistantGlassWrappers.length === 0) {
        modalRef.current = null;
        return;
      }

      // 가장 아래에 있는 wrapper 찾기 (getBoundingClientRect로 정확히 측정)
      let lastWrapper: HTMLElement | null = null;
      let maxBottom = -Infinity;
      
      assistantGlassWrappers.forEach((wrapper) => {
        const element = wrapper as HTMLElement;
        if (element && typeof element.getBoundingClientRect === 'function') {
          const rect = element.getBoundingClientRect();
          if (rect.bottom > maxBottom) {
            maxBottom = rect.bottom;
            lastWrapper = element;
          }
        }
      });

      modalRef.current = lastWrapper;
    };

    // 초기 실행
    updateModalRef();

    // MutationObserver로 DOM 변경 감지 (더 빠른 반응)
    const observer = new MutationObserver(() => {
      // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 실행
      requestAnimationFrame(() => {
        updateModalRef();
      });
    });

    if (chatRef.current) {
      observer.observe(chatRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    // 주기적으로도 확인 (안전장치)
    const intervalId = setInterval(() => {
      updateModalRef();
    }, 200);

    return () => {
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, [assistantMessages.length, chatState.messages.length]);

  // 겹침 감지 함수 (Test2Scene.js와 동일한 로직)
  const recomputeOverlap = useCallback(() => {
    const modalEl = modalRef.current;
    const chipsEl = chipsWrapRef.current;
    if (!modalEl || !chipsEl) {
      // modal이 없으면 3개로 리셋
      if (visibleChipCount !== 3) {
        setVisibleChipCount(3);
        setChipsBehind(false);
      }
      return;
    }

    const modalRect = modalEl.getBoundingClientRect();
    const chipsRect = chipsEl.getBoundingClientRect();

    // If modal bottom crosses into the chips stack area, treat as overlap.
    // Small buffer so we pre-emptively reduce chip count before it visually collides.
    const buffer = 12;
    const isOverlapping = modalRect.bottom > chipsRect.top - buffer;

    // Two-step behavior (as requested):
    // 1) if overlapping with 3 chips -> reduce to 2 (no blur/behind yet)
    // 2) if still overlapping with 2 chips -> chips go BEHIND modal + blur/dim
    if (visibleChipCount === 3) {
      if (isOverlapping) {
        setVisibleChipCount(2);
        setChipsBehind(false);
        return;
      }
      setChipsBehind(false);
      return;
    }

    // visibleChipCount === 2
    // 첫 번째 chip의 위치를 정확히 측정하여 더 정밀한 겹침 감지
    const firstChip = chipsEl.querySelector('.chip-btn') as HTMLElement;
    if (firstChip) {
      const firstChipRect = firstChip.getBoundingClientRect();
      const isOverlappingFirstChip = modalRect.bottom > firstChipRect.top - buffer;
      
      if (isOverlappingFirstChip) {
        setChipsBehind(true);
      } else {
        setChipsBehind(false);
        // 첫 번째 chip이 겹치지 않고 전체 chips도 겹치지 않으면 3개로 복원
        if (!isOverlapping) {
          setVisibleChipCount(3);
        }
      }
    } else {
      // 첫 번째 chip을 찾을 수 없으면 기본 로직 사용
      if (isOverlapping) {
        setChipsBehind(true);
      } else {
        setChipsBehind(false);
        setVisibleChipCount(3);
      }
    }
  }, [visibleChipCount]);

  // Auto-manage chip count when modal overlaps chips (Test2Scene.js와 동일)
  useLayoutEffect(() => {
    let raf = 0;
    let ro: ResizeObserver | null = null;

    const tick = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Keep chips positioned above the input bar with the same gap as the original layout.
        try {
          const inputRect = inputBarRef.current?.getBoundingClientRect();
          if (inputRect) {
            // Place the chips layer so its BOTTOM sits just above the input bar (gap ~= 16px).
            // bottom = viewportHeight - (inputTop - gap)
            const gap = 16;
            setChipsBottomPx(Math.round(window.innerHeight - inputRect.top + gap));
          }
        } catch {
          // ignore
        }
        recomputeOverlap();
      });
    };

    const setupObserver = () => {
      if (ro) {
        ro.disconnect();
      }

      ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(tick) : null;
      if (ro) {
        // Test2Scene.js처럼 modalRef를 observe (현재 값이 있을 때만)
        if (modalRef.current) ro.observe(modalRef.current);
        if (chipsWrapRef.current) ro.observe(chipsWrapRef.current);
        if (inputBarRef.current) ro.observe(inputBarRef.current);
        ro.observe(document.documentElement);
      }
    };

    tick();
    setupObserver();

    // modalRef가 변경될 때마다 다시 observe (주기적으로 확인)
    const checkModalRef = setInterval(() => {
      if (modalRef.current && ro) {
        try {
          ro.observe(modalRef.current);
        } catch {
          // 이미 observe 중일 수 있음, 무시
        }
      }
    }, 100);

    window.addEventListener('resize', tick, { passive: true });
    window.addEventListener('orientationchange', tick, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(checkModalRef);
      window.removeEventListener('resize', tick);
      window.removeEventListener('orientationchange', tick);
      if (ro) ro.disconnect();
    };
  }, [recomputeOverlap, assistantMessages.length]);

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

  // 초기 로드 시 인사말 텍스트 완료 후 추천 칩 fade-in
  useEffect(() => {
    if (chatState.messages.length === 0) {
      // 인사말 텍스트가 완료되는 시점: 첫 번째(0초 시작, 1.2초 duration) + 두 번째(1.2초 delay, 1.2초 duration) + 여유시간
      // 대략 2.5~2.7초 후 추천 칩 표시
      const timer = setTimeout(() => {
        setShowRecommendationChips(true);
      }, 2600); // 2.6초 후 fade-in 시작
      return () => clearTimeout(timer);
    }
  }, [chatState.messages.length]);

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

  // 대화 요약 보러가기 버튼 클릭 핸들러 (바로 FinalMessageScreen으로 이동)
  const handleShowSummary = useCallback(() => {
    setShowFinalMessage(true);
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
    
    // 선택된 추천 추가
    setSelectedRecommendations(prev => new Set(prev).add(recommendation));
    
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
    
    const shouldShow = chatState.messages.length === 0 || assistantMessages.length > 0;
    const chipsToShow = visibleChipCount === 2 
      ? [randomRecommendations[chipAIdx], randomRecommendations[chipBIdx]].filter(Boolean)
      : randomRecommendations.slice(0, 3);
    
    return (
      <div
        className="fixed left-0 right-0"
        style={{
          bottom: `${chipsBottomPx}px`,
          zIndex: chipsBehind ? 8 : 32,
          opacity: shouldShow ? (shouldAnimate ? (showRecommendationChips ? 1 : 0) : 1) : 0,
          visibility: shouldShow ? 'visible' : 'hidden',
          transition: 'opacity 0.6s ease-in-out', // fade-in 애니메이션 추가
          maxWidth: 'min(360px, 92vw)',
          margin: '0 auto',
          width: '100%',
          paddingLeft: 0,
          paddingRight: 0,
        }}
      >
        <div
          ref={chipsWrapRef}
          className={chipsBehind ? 'chips-wrap chips-wrap--behind' : 'chips-wrap'}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          {chipsToShow.map((text, idx) => (
            <button
              key={`chip-${idx}-${text}`}
              type="button"
              onClick={() => handleRecommendationClick(text)}
              disabled={chatState.isLoading}
              className={`touch-manipulation active:scale-95 rounded-3xl outline outline-1 outline-offset-[-1px] outline-white chip-btn ${
                chipsBehind && idx === 0 ? 'chip-btn--fade' : ''
              }`}
              style={{
                display: 'inline-flex',
                padding: '8px 16px',
                justifyContent: 'center',
                alignItems: 'center',
                flex: '0 0 auto',
                cursor: 'default',
                background: 'linear-gradient(180deg,rgb(251, 255, 254) 0%, #F4E9F0 63.94%, #FFF 100%)',
                pointerEvents: chipsBehind && idx === 0 ? 'none' : 'auto', // 첫 번째 chip만 클릭 불가, 두 번째 chip은 클릭 가능
              }}
            >
              <span
                key={`${idx}-${text}-${swapNonce}`}
                className="chip-label"
                style={{
                  ['--dy' as any]: idx === 0 ? '-6px' : '-10px',
                  fontFamily: 'Pretendard Variable',
                  fontSize: '14px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '190%',
                  letterSpacing: '-0.48px',
                  color: '#757575',
                  whiteSpace: 'nowrap',
                }}
              >
                {text}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }, [isConversationEnded, randomRecommendations, handleRecommendationClick, chatState.isLoading, chatState.messages.length, assistantMessages.length, showRecommendationChips, visibleChipCount, chipAIdx, chipBIdx, swapNonce, chipsBehind, chipsBottomPx]);

  const isThinking = chatState.isLoading || voiceState.isProcessingVoice;

  return (
    <div className="min-h-screen flex flex-col safe-area-inset overscroll-contain relative v10-main-page">
      {showBlob && !showSummary && !isThinking && (
        <CanvasBackground boosted={false} phase="completed" popActive={true} />
      )}
      
      {showBlob && !showSummary && isThinking && (
        <ThinkingBlob isActive={isThinking} />
      )}
      
      <AudioWaveVisualizer stream={voiceState.audioStream} isActive={voiceState.isRecording} />
      
      <Logo />

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
          <div ref={chatRef} className="h-full overflow-y-auto overflow-x-visible px-4 pb-4 space-y-4 overscroll-contain" style={{ minHeight: '100vh' }}>
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
                {showFinalMessage ? (
                  <FinalMessageScreen />
                ) : showSummary ? (
                  selectedKeyword && selectedKeywordTurn !== null ? (
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

      {!showSummary && !showEndMessage && !showFinalMessage && (
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
            <>
              {/* chips layer: can go behind modal when still overlapping after reducing to 2 */}
              {renderRecommendationChips(0, true, true)}
              
              {/* input layer: always on top */}
              <div className="fixed bottom-0 left-0 right-0 z-30 safe-bottom" style={{ maxWidth: 'min(360px, 92vw)', margin: '0 auto', width: '100%', paddingTop: '16px', paddingBottom: '16px', paddingLeft: 0, paddingRight: 0 }}>
                <form onSubmit={handleSubmit} className="w-full">
            <div 
              ref={inputBarRef}
              className="flex items-center relative"
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
                placeholder=""
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
                className="flex-1 px-4 py-3 bg-transparent focus:outline-none"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              {!chatState.inputValue && (
                <div
                  className="absolute left-4 pointer-events-none"
                  style={{
                    top: '50%',
                    marginTop: '-10.5px', // 높이의 절반만큼 위로 이동 (중앙 정렬)
                    height: '21px', // 텍스트 하나 높이와 동일 (한 번에 하나만 보이도록)
                    overflow: 'hidden', // 마스크 역할
                  }}
                >
                  {/* 가상의 캔버스: 무한 반복을 위한 텍스트 배치 */}
                  <div
                    ref={placeholderContainerRef}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                      transition: 'none', // 애니메이션은 requestAnimationFrame으로 제어
                      willChange: 'transform',
                      gap: 0, // gap 제거 (텍스트가 붙어있도록)
                      position: 'relative',
                      top: 0,
                      left: 0,
                      width: '100%',
                      margin: '0',
                      padding: '0',
                      lineHeight: '150%',
                    }}
                  >
                    {/* 첫 번째 텍스트 (초기 중앙 위치) */}
                    <div
                      style={{
                        width: '100%',
                        height: '21px', // 정확히 21px로 고정
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                        padding: '0',
                        margin: '0',
                        color: '#878181',
                        fontFamily: 'Pretendard Variable',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '150%',
                      }}
                    >
                      다른 게 필요하신가요?
                    </div>
                    
                    {/* 두 번째 텍스트 */}
                    <div
                      style={{
                        width: '100%',
                        height: '21px', // 정확히 21px로 고정
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                        padding: '0',
                        margin: '0',
                        color: '#878181',
                        fontFamily: 'Pretendard Variable',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '150%',
                      }}
                    >
                      궁금한 건 말하거나 입력하세요
                    </div>
                    
                    {/* 첫 번째 텍스트 복제 (무한 반복용) */}
                    <div
                      style={{
                        width: '100%',
                        height: '21px', // 정확히 21px로 고정
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                        padding: '0',
                        margin: '0',
                        color: '#878181',
                        fontFamily: 'Pretendard Variable',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '150%',
                      }}
                    >
                      다른 게 필요하신가요?
                    </div>
                    
                    {/* 두 번째 텍스트 복제 (무한 반복용) */}
                    <div
                      style={{
                        width: '100%',
                        height: '21px', // 정확히 21px로 고정
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                        padding: '0',
                        margin: '0',
                        color: '#878181',
                        fontFamily: 'Pretendard Variable',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '150%',
                      }}
                    >
                      궁금한 건 말하거나 입력하세요
                    </div>
                    
                    {/* 첫 번째 텍스트 복제 2 (무한 반복을 위한 마지막 - 첫 번째와 같은 위치) */}
                    <div
                      style={{
                        width: '100%',
                        height: '21px', // 정확히 21px로 고정
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                        padding: '0',
                        margin: '0',
                        color: '#878181',
                        fontFamily: 'Pretendard Variable',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '150%',
                      }}
                    >
                      다른 게 필요하신가요?
                    </div>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleMicClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                disabled={chatState.isLoading || voiceState.isProcessingVoice || voiceState.isRequestingPermission}
                className="mic-btn mic-btn--v9 touch-manipulation disabled:opacity-50"
                title={voiceState.isRecording ? '녹음 중지' : voiceState.isRequestingPermission ? '권한 요청 중...' : '음성 입력'}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {voiceState.isRecording ? (
                  <img src="/pause.svg" alt="녹음 중지" className="w-5 h-5" />
                ) : (
                  <>
                    <span className="mic-white-glass" aria-hidden />
                    <svg className="mic-svg" width="16" height="22" viewBox="0 0 20 28" fill="none" aria-hidden>
                      <defs>
                        <linearGradient id="micGradV9" x1="10" y1="0" x2="10" y2="28" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#22E6B1" />
                          <stop offset="55%" stopColor="#22E6B1" />
                          <stop offset="100%" stopColor="#1F7BFF" />
                        </linearGradient>
                      </defs>
                      <path d="M14 5C14 2.79086 12.2091 1 10 1C7.79086 1 6 2.79086 6 5" stroke="url(#micGradV9)" strokeWidth="2" />
                      <path d="M6 12C6 14.2091 7.79086 16 10 16C12.2091 16 14 14.2091 14 12" stroke="url(#micGradV9)" strokeWidth="2" />
                      <path
                        d="M18.2551 16C16.9542 19.248 14.0187 21.5 10 21.5C4.47715 21.5 1 17.2467 1 12"
                        stroke="url(#micGradV9)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <line x1="10" y1="22" x2="10" y2="27" stroke="url(#micGradV9)" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="19" cy="12" r="1" fill="url(#micGradV9)" />
                      <rect x="5" y="5" width="2" height="7" fill="url(#micGradV9)" />
                      <rect x="13" y="5" width="2" height="7" fill="url(#micGradV9)" />
                    </svg>
                  </>
                )}
              </button>
            </div>
              </form>
            </div>
            </>
          )
        )}
      </>
      )}
      <style jsx>{`
        .v10-main-page {
          background: transparent;
          /* v10/1: bottom tint cycle (5s per step) */
          --v10-pulse-0: #fff2fb; /* top */
          --v10-pulse-1: #f3e2f7; /* mid */
          --v10-pulse-2: #cfaedd; /* lower */
          --v10-pulse-3: #a781c3; /* bottom */
        }

        /* Allow smooth/discrete animation of custom color props */
        @property --v10-pulse-0 { syntax: '<color>'; inherits: true; initial-value: #fff2fb; }
        @property --v10-pulse-1 { syntax: '<color>'; inherits: true; initial-value: #f3e2f7; }
        @property --v10-pulse-2 { syntax: '<color>'; inherits: true; initial-value: #cfaedd; }
        @property --v10-pulse-3 { syntax: '<color>'; inherits: true; initial-value: #a781c3; }
        
        /* v10/1: background pulse + tint cycle (핑크 → 밝아짐 → 민트 → 밝아짐 → 핑크) */
        .v10-main-page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0;
          /* 항상 왼쪽이 더 진해지도록 "좌측 음영" 레이어를 추가 */
          background:
            linear-gradient(90deg,
              /* 무채색(회색)으로 죽지 않게, 살짝 퍼플 틴트로 좌측 음영 */
              rgba(64, 20, 104, 0.10) 0%,
              rgba(64, 20, 104, 0.06) 34%,
              rgba(64, 20, 104, 0.00) 68%,
              rgba(64, 20, 104, 0.00) 100%),
            /* 상단은 살짝 더 밝게(위쪽이 더 화사하게) */
            linear-gradient(180deg,
              /* 순백 라이트는 색을 씻어 회색빛이 나기 쉬워서, 아주 옅게 틴트 */
              rgba(255, 230, 248, 0.14) 0%,
              rgba(236, 246, 255, 0.06) 32%,
              rgba(255, 255, 255, 0.00) 60%),
            /* 하단 눌림을 "선"처럼 보이지 않게: 곡선 + 대각선 레이어로 유동형 느낌 */
            radial-gradient(140% 48% at 18% 108%,
              rgba(52, 18, 86, 0.00) 58%,
              rgba(52, 18, 86, 0.08) 70%,
              rgba(52, 18, 86, 0.22) 82%,
              rgba(52, 18, 86, 0.34) 100%),
            linear-gradient(168deg,
              rgba(52, 18, 86, 0.00) 0%,
              rgba(52, 18, 86, 0.00) 86%,
              rgba(52, 18, 86, 0.06) 88%,
              rgba(52, 18, 86, 0.36) 95%,
              rgba(52, 18, 86, 0.54) 100%),
            radial-gradient(circle at 30% 20%,
              var(--v10-pulse-0) 0%,
              var(--v10-pulse-1) 32%,
              var(--v10-pulse-2) 78%,
              var(--v10-pulse-3) 100%);
          background-repeat: no-repeat;
          /* bottom layers를 크게 깔아두고 position을 살짝 흔들어 "유동형"으로 보이게 */
          background-size: auto, auto, 160% 140%, 140% 140%, auto;
          background-position: 0 0, 0 0, 45% 100%, 50% 100%, 0 0;
          /* 채도 아주 살짝 올리고, 명도는 아주 살짝 낮춰 "조금만" 진하게 */
          /* 회색빛 방지: 채도는 한 단계 더 올리고, 명도는 유지 */
          filter: saturate(1.22) brightness(1.03);
          animation:
            v10PinkPulse 9s ease-in-out infinite,
            v10PulseTintCycle 20s ease-in-out infinite,
            v10BottomDrift 6.5s ease-in-out infinite;
          will-change: opacity, filter, background-position;
        }
        
        .v10-main-page > :global(.coex-v2-canvas-wrapper) {
          z-index: 1;
        }
        
        @keyframes v10PinkPulse {
          0%, 100% { opacity: 0; }
          45%, 55% { opacity: 0.58; }
        }

        /* 하단 눌림 레이어(곡선/대각선)만 아주 미세하게 좌우로 드리프트 */
        @keyframes v10BottomDrift {
          0%, 100% {
            background-position: 0 0, 0 0, 45% 100%, 50% 100%, 0 0;
          }
          50% {
            background-position: 0 0, 0 0, 55% 100%, 46% 100%, 0 0;
          }
        }

        /* 5초 단위 "단계"를 유지하되, 단계 사이(약 1초)는 부드럽게 그라데이션 전환 */
        @keyframes v10PulseTintCycle {
          /* 0s: 원래 핑크 (하단 어두운 핑크) */
          0%, 20% {
            --v10-pulse-0: #fff2fb;
            --v10-pulse-1: #f4e0f2;
            --v10-pulse-2: #d3b5e0;
            --v10-pulse-3: #b58fd0;
            filter: saturate(1.26) brightness(1.03);
          }
          /* 5s: 밝아짐(핑크가 더 화사) */
          25%, 45% {
            --v10-pulse-0: #fff6fd;
            --v10-pulse-1: #f8e9f6;
            --v10-pulse-2: #e6d0f0;
            --v10-pulse-3: #d1b7e6;
            filter: saturate(1.20) brightness(1.07);
          }
          /* 10s: 민트보단 블루에 가까운 아쿠아(채도 낮춤) */
          50%, 70% {
            --v10-pulse-0: #f0fbff;
            --v10-pulse-1: #def3ff;
            --v10-pulse-2: #b6e6ff;
            --v10-pulse-3: #87cdf6;
            filter: saturate(1.26) brightness(1.05);
          }
          /* 15s: 밝아짐(아쿠아가 더 화사) */
          75%, 95% {
            --v10-pulse-0: #f6fdff;
            --v10-pulse-1: #eaf8ff;
            --v10-pulse-2: #d2f0ff;
            --v10-pulse-3: #a9dfff;
            filter: saturate(1.16) brightness(1.08);
          }
          /* 20s: 다시 핑크로 복귀 */
          100% {
            --v10-pulse-0: #fff2fb;
            --v10-pulse-1: #f4e0f2;
            --v10-pulse-2: #d3b5e0;
            --v10-pulse-3: #b58fd0;
            filter: saturate(1.26) brightness(1.03);
          }
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
        
        /* Mic Icon V9 스타일 */
        :global(.mic-btn) {
          padding: 12px 16px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 0;
          cursor: default;
          -webkit-tap-highlight-color: transparent;
          isolation: isolate;
        }

        :global(.mic-white-glass) {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 36px;
          height: 36px;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          z-index: 0;
          pointer-events: none;
          background: rgba(255, 255, 255, 0.34);
          border: 1px solid rgba(255, 255, 255, 0.62);
          box-shadow: 0 18px 34px rgba(22, 42, 58, 0.10);
          backdrop-filter: blur(16px) saturate(1.15);
          -webkit-backdrop-filter: blur(16px) saturate(1.15);
        }

        :global(.mic-svg) {
          position: relative;
          z-index: 1;
          width: 16px;
          height: 22px;
          display: block;
          filter: drop-shadow(0 10px 18px rgba(31, 123, 255, 0.10));
        }
        
        /* Recommendation Chips 스타일 */
        .chips-wrap--behind {
          /* Chips are behind the modal (z-index handles it). Keep them readable; only the TOP chip fades. */
        }
        .chip-label {
          display: inline-block;
          will-change: transform, opacity;
          animation: chipSwapIn 520ms cubic-bezier(0.16, 1.0, 0.3, 1) both;
        }
        @keyframes chipSwapIn {
          0% {
            transform: translateY(var(--dy, -8px)) scale(0.985);
            opacity: 0.0;
          }
          60% {
            transform: translateY(1px) scale(1.035);
            opacity: 1;
          }
          100% {
            transform: translateY(0px) scale(1);
            opacity: 1;
          }
        }
        .chip-btn--fade {
          /* Only the top chip softens: lighter opacity + a touch of blur (no darkening) */
          opacity: 0.48;
          filter: blur(0.5px);
        }
      `}</style>
    </div>
  );
}
