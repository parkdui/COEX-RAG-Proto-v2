'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatBubble } from '@/components/ChatBubble';
import { Message } from '@/types';
import { createAssistantMessage, createErrorMessage, createUserMessage } from '@/lib/messageUtils';
import { createWavBlob, getAudioConstraints, checkMicrophonePermission, handleMicrophoneError, checkBrowserSupport } from '@/lib/audioUtils';
import { SplitWords, ChatTypewriterV1, ChatTypewriterV2, ChatTypewriterV3, SplitText } from '@/components/ui';
import AnimatedLogo from '@/components/ui/AnimatedLogo';
import TextPressure from '@/components/ui/TextPressure';
import LetterColorAnimation from '@/components/ui/LetterColorAnimation';
import ThinkingBlob from '@/components/ui/ThinkingBlob';
import AudioWaveVisualizer from '@/components/ui/AudioWaveVisualizer';
import { CanvasBackground } from '@/components/ui/BlobBackgroundV2Canvas';
import useCoexTTS from '@/hooks/useCoexTTS';

const useChatState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoButtonDisabled, setIsGoButtonDisabled] = useState(false);
  const [rowIndex, setRowIndex] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messageNumber, setMessageNumber] = useState<number>(0);

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
    setSessionId,
    messageNumber,
    setMessageNumber
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
    sessionId,
    messageNumber
  ]);
};

const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  return {
    isRecording,
    setIsRecording,
    isProcessingVoice,
    setIsProcessingVoice,
    isRequestingPermission,
    setIsRequestingPermission,
    audioStream,
    setAudioStream
  };
};

const apiRequests = {
  async sendChatRequest(question: string, systemPrompt: string, history: Message[], rowIndex?: number | null, sessionId?: string | null, messageNumber?: number) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question, 
        systemPrompt, 
        history,
        rowIndex: rowIndex || undefined,
        sessionId: sessionId || undefined,
        messageNumber: messageNumber || undefined
      }),
    });
    return response.json();
  },

  async logMessage(sessionId: string, messageNumber: number, userMessage: string, aiMessage: string, rowIndex?: number | null, timestamp?: string, systemPrompt?: string) {
    const response = await fetch('/api/log-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messageNumber,
        userMessage,
        aiMessage,
        rowIndex: rowIndex || undefined,
        timestamp: timestamp || new Date().toISOString(),
        systemPrompt: systemPrompt || ''
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

const fixedQAData = [
  {
    "question": "친구와 함께 먹기 좋은 식당을 추천해줘",
    "answers": [
      "친구들과 여럿이 방문한다면 '피에프창(P.F. Chang's)'을 추천해요. 넓은 좌석과 화려한 비주얼의 퓨전 아시안 요리가 있어 모임 장소로 제격입니다.",
      "가볍고 트렌디한 분위기를 원한다면 '카페마마스'는 어떠신가요? 리코타 치즈 샐러드와 청포도 주스로 유명해 친구들과 브런치를 즐기기에 딱 좋습니다."
    ]
  },
  {
    "question": "컨퍼런스를 관람하며 쉬기 좋은 곳을 추천해줘",
    "answers": [
      "코엑스의 랜드마크인 '별마당 도서관'을 방문해 보세요. 탁 트인 개방감 속에서 책을 읽으며 컨퍼런스 도중 머리를 식히기에 가장 좋습니다.",
      "조금 더 정적인 휴식을 원하신다면 코엑스 아쿠아리움 내 카페나 전시장 인근의 '라이브 플라자' 계단형 휴게 공간에서 잠시 앉아 쉬어가는 것을 추천합니다."
    ]
  },
  {
    "question": "KPOP 관련 구경거리를 추천해줘",
    "answers": [
      "코엑스 동측 광장에 있는 '강남스타일 말춤 동상'과 외벽의 초대형 커브드 LED 전광판을 확인해 보세요. 압도적인 스케일의 K-콘텐츠 영상을 감상할 수 있습니다.",
      "메가박스 인근이나 몰 내부에 위치한 '플레이인더박스' 같은 굿즈 샵을 추천합니다. 아이돌 팝업스토어나 포토부스가 상시 운영되어 팬들에게 인기가 많습니다."
    ]
  },
  {
    "question": "데이트하기 좋은 행사 추천해줘",
    "answers": [
      "실내 데이트의 정석인 '코엑스 아쿠아리움'을 추천합니다. 신비로운 수중 터널을 걸으며 날씨에 상관없이 로맨틱한 시간을 보낼 수 있습니다.",
      "예술적인 감성을 채우고 싶다면 매년 열리는 'KIAF(키아프) & 프리즈 서울' 같은 대형 아트 페어나 감각적인 디자인 전시회를 함께 관람해 보세요."
    ]
  },
  {
    "question": "홀로 방문하기 좋은 곳 추천해줘",
    "answers": [
      "혼자만의 시간이 필요할 땐 '메가박스 코엑스'를 추천합니다. 돌비 시네마 등 최첨단 시설을 갖추고 있어 오롯이 영화에만 몰입하기 최적의 장소입니다.",
      "혼밥하기 편한 비건 레스토랑 '플랜튜드(Plantude)'를 추천드려요. 깔끔한 1인석 분위기 덕분에 혼자서도 부담 없이 건강한 식사를 즐길 수 있습니다."
    ]
  },
  {
    "question": "쇼핑하기 좋은 곳을 찾고 있어",
    "answers": [
      "최신 트렌드를 원한다면 스타필드 코엑스몰의 '패션 거리'를 걸어보세요. 글로벌 SPA 브랜드부터 힙한 스트리트 브랜드까지 한곳에 모여 있습니다.",
      "아기자기한 소품을 좋아하신다면 '버터(BUTTER)'나 '자주(JAJU)'를 방문해 보세요. 아이디어 상품이 가득해 구경하는 재미가 쏠쏠합니다."
    ]
  },
  {
    "question": "조용히 작업할 수 있는 카페를 찾고 있어",
    "answers": [
      "차분하고 고풍스러운 인테리어의 '가배도'를 추천합니다. 다른 카페에 비해 비교적 조용한 분위기여서 노트북 작업을 하거나 독서하기에 좋습니다.",
      "세련된 분위기의 '피어커피(Peer Coffee)'를 추천드려요. 좌석 배치가 여유롭고 커피 맛이 훌륭해 혼자 방문해 집중하기 좋은 환경입니다."
    ]
  },
  {
    "question": "즐길 거리가 많은 핫플레이스를 알려줘",
    "answers": [
      "언제나 활기찬 '별마당 도서관'은 필수 코스입니다. 주기적으로 바뀌는 대형 조형물과 무료 강연, 공연이 열려 볼거리가 매우 풍성합니다.",
      "이색 체험을 원한다면 '건담베이스'나 '레고 스토어'를 방문해 보세요. 한정판 피규어 전시와 체험존이 있어 키덜트와 가족 단위 방문객 모두에게 인기가 많습니다."
    ]
  },
  {
    "question": "문화적인 경험을 할 수 있는 곳을 추천해줘",
    "answers": [
      "코엑스 전시장(A~D홀)에서 매주 열리는 박람회를 확인해 보세요. 도서전, 디자인 페어 등 다양한 주제의 전시가 열려 새로운 문화를 경험하기 좋습니다.",
      "코엑스 바로 맞은편의 '봉은사'에 들러보세요. 현대적인 빌딩숲 사이에서 한국 전통 사찰의 고요함과 정취를 느낄 수 있는 특별한 문화 명소입니다."
    ]
  },
  {
    "question": "트렌디한 음식점을 찾고 있어",
    "answers": [
      "고메스트리트에 위치한 중식당 '무탄'을 추천합니다. 트러플 짜장면처럼 SNS에서 화제가 된 독특하고 고급스러운 메뉴를 맛볼 수 있습니다.",
      "세련된 유러피안 그릴 요리를 선보이는 '이비티(ebt)'를 추천드려요. 감각적인 플레이팅과 인테리어 덕분에 트렌디한 미식 경험이 가능합니다."
    ]
  }
];

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
      { pattern: /추천.*?해|추천.*?해줘/i, replacement: '장소 추천'       },
    ];
    
    for (const { pattern, replacement } of patterns) {
      if (pattern.test(text)) {
        return replacement.length > 20 ? replacement.substring(0, 20) : replacement;
      }
    }
    
    const keywords = ['문화', '경험', '가족', '친구', '혼자', '데이트', '컨퍼런스', '식당', '카페', '쇼핑', '장소', '곳'];
    const foundKeywords = keywords.filter(kw => text.includes(kw));
    
    if (foundKeywords.length > 0) {
      const summary = foundKeywords.slice(0, 3).join(' ') + ' 추천';
      return summary.length > 20 ? summary.substring(0, 20) : summary;
    }
    
    return text.length > 20 ? text.substring(0, 20) : text;
  }, []);

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
    async (response: { answer?: string; tokens?: any; hits?: any[]; defaultAnswer?: string }) => {
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

  useEffect(() => {
    if (!chatState.isLoading) return;

    const intervalId = setInterval(() => {
      scrollToBottom();
    }, 500);

    return () => clearInterval(intervalId);
  }, [chatState.isLoading, scrollToBottom]);

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
  }, [processAudio, voiceState.setIsRecording]);

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

  const isInfoRequestQuestion = useCallback((question: string) => {
    const infoRequestPatterns = [
      /추천|알려|정보|위치|어디|어떤|어때|어떠|있어|찾아|보여|가르쳐|안내|소개|추천해|알려줘|알려줄|가르쳐줘/i,
      /카페|식당|레스토랑|맛집|음식|장소|공간|장소|이벤트|전시|체험|활동|프로그램/i,
      /어디서|어디에|어디로|어디가|어디서|어디에|어디로|어디가/i,
    ];
    
    return infoRequestPatterns.some(pattern => pattern.test(question));
  }, []);

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
      const randomAnswer = matchedQA.answers[Math.floor(Math.random() * matchedQA.answers.length)];
      
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
          randomAnswer,
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
        answer: randomAnswer,
        tokens: undefined,
        hits: undefined,
        defaultAnswer: randomAnswer,
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

  const renderTextWithAnimation = useCallback((text: string) => {
    const parts: Array<{ text: string; isImportant: boolean }> = [];
    let lastIndex = 0;

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

    nonOverlappingMatches.sort((a, b) => a.start - b.start);

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

      <main className="relative flex-1 flex flex-col min-h-0 pb-32 pt-20" style={{ background: 'transparent' }}>
        <div className="flex-1 overflow-hidden">
          <div ref={chatRef} className="h-full overflow-y-auto px-6 pb-4 space-y-4 overscroll-contain">
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
                        {extractedKeywords.map((keyword, index) => {
                        const keywordLength = keyword.length;
                        const baseSize = 120;
                        const sizeMultiplier = Math.max(0.7, Math.min(1.8, keywordLength / 6));
                        const ellipseSize = baseSize * sizeMultiplier * 1.2;
                        const padding = Math.max(8, ellipseSize * 0.25);
                        
                        const getPosition = (idx: number, keywordLen: number, ellipseSize: number) => {
                          const minTop = 20;
                          const maxTop = 80;
                          const estimatedScreenWidth = 375;
                          const ellipseRadiusPercent = (ellipseSize / 2 / estimatedScreenWidth) * 100;
                          const minLeft = Math.max(10, 10 + ellipseRadiusPercent);
                          const maxLeft = Math.min(90, 90 - ellipseRadiusPercent);
                          
                          const existingPositions: Array<{top: number, left: number, size: number}> = [];
                          for (let i = 0; i < idx; i++) {
                            const existingKeywordLength = extractedKeywords[i].length;
                            const existingSize = baseSize * Math.max(0.7, Math.min(1.8, existingKeywordLength / 6)) * 1.2;
                            const existingEllipseRadiusPercent = (existingSize / 2 / estimatedScreenWidth) * 100;
                            const existingMinLeft = Math.max(10, 10 + existingEllipseRadiusPercent);
                            const existingMaxLeft = Math.min(90, 90 - existingEllipseRadiusPercent);
                            
                            const row = Math.floor(i / 3);
                            const col = i % 3;
                            const existingTop = minTop + (row * 18) + ((i % 2) * 5);
                            const existingGridLeft = 10 + (col * 40);
                            const existingLeft = Math.max(existingMinLeft, Math.min(existingMaxLeft, existingGridLeft));
                            existingPositions.push({
                              top: existingTop,
                              left: existingLeft,
                              size: existingSize
                            });
                          }
                          
                          const row = Math.floor(idx / 3);
                          const col = idx % 3;
                          let topPercent = minTop + (row * 18) + ((idx % 2) * 5);
                          const gridLeftPercent = 10 + (col * 40);
                          let leftPercent = Math.max(minLeft, Math.min(maxLeft, gridLeftPercent));
                          
                          let attempts = 0;
                          const maxAttempts = 50;
                          
                          while (attempts < maxAttempts) {
                            let hasOverlap = false;
                            
                            for (const existing of existingPositions) {
                              const topDiff = Math.abs(topPercent - existing.top);
                              const leftDiff = Math.abs(leftPercent - existing.left);
                              const distance = Math.sqrt(topDiff * topDiff + leftDiff * leftDiff);
                              
                              const ellipseSizePercent = (ellipseSize / 800) * 100;
                              const existingSizePercent = (existing.size / 800) * 100;
                              const minDistance = ((ellipseSizePercent / 2) + (existingSizePercent / 2)) * 1.2;
                              
                              if (distance < minDistance) {
                                hasOverlap = true;
                                const angle = Math.atan2(topPercent - existing.top, leftPercent - existing.left);
                                const moveDistance = minDistance - distance + 2;
                                topPercent += Math.sin(angle) * moveDistance;
                                leftPercent += Math.cos(angle) * moveDistance;
                                break;
                              }
                            }
                            
                            if (!hasOverlap) break;
                            attempts++;
                            
                            if (attempts > 20) {
                              topPercent = minTop + Math.random() * (maxTop - minTop);
                              leftPercent = minLeft + Math.random() * (maxLeft - minLeft);
                            }
                          }
                          
                          for (const existing of existingPositions) {
                            const topDiff = Math.abs(topPercent - existing.top);
                            const leftDiff = Math.abs(leftPercent - existing.left);
                            const distance = Math.sqrt(topDiff * topDiff + leftDiff * leftDiff);
                            const ellipseSizePercent = (ellipseSize / 800) * 100;
                            const existingSizePercent = (existing.size / 800) * 100;
                            const minDistance = ((ellipseSizePercent / 2) + (existingSizePercent / 2)) * 1.2;
                            
                            if (distance < minDistance) {
                              const angle = Math.atan2(topPercent - existing.top, leftPercent - existing.left);
                              const moveDistance = minDistance - distance + 3;
                              topPercent += Math.sin(angle) * moveDistance;
                              leftPercent += Math.cos(angle) * moveDistance;
                            }
                          }
                          
                          topPercent = Math.max(minTop, Math.min(maxTop, topPercent));
                          
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
                          onClick={handleNextToSummary}
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
                  </div>
                ) : (
                  <div className="relative">
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
      `}</style>
    </div>
  );
}
