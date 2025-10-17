'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  hits?: Array<{
    id: string;
    meta: Record<string, unknown>;
    text: string;
    score: number;
  }>;
}

interface ChatBubbleProps {
  message: Message;
  isThinking?: boolean;
  onPlayTTS?: (text: string) => void;
  isPlayingTTS?: boolean;
}

function ChatBubble({ message, isThinking = false, onPlayTTS, isPlayingTTS = false }: ChatBubbleProps) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[86%] rounded-2xl px-4 py-3 ${
        message.role === 'user' 
          ? 'bg-gray-700 text-white' 
          : 'bg-gray-800 text-white border border-gray-600'
      }`}>
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {isThinking && (
            <span className="inline-block ml-2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
          )}
        </div>
        
        {/* TTS 버튼 - AI 응답에만 표시 */}
        {message.role === 'assistant' && onPlayTTS && message.content && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => onPlayTTS(message.content)}
              disabled={isPlayingTTS}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                isPlayingTTS 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title={isPlayingTTS ? '음성 재생 중...' : '음성으로 듣기'}
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
        )}
        
        {message.tokens && (
          <div className="mt-2 text-xs text-gray-400">
            📊 토큰 사용량: 입력 {message.tokens.input.toLocaleString()} / 
            출력 {message.tokens.output.toLocaleString()} / 
            총 {message.tokens.total.toLocaleString()}
          </div>
        )}
        
        {message.hits && message.hits.length > 0 && (
          <details className="mt-2 text-xs text-gray-400">
            <summary className="cursor-pointer">참조한 이벤트 ({message.hits.length})</summary>
            <pre className="mt-2 p-2 bg-gray-900 rounded text-xs overflow-x-auto">
              {message.hits.map((hit, i) => 
                `[${i + 1}] ${hit.meta?.title || ''} | ${hit.meta?.date || ''} | ${hit.meta?.venue || ''}`
              ).join('\n')}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoButtonDisabled, setIsGoButtonDisabled] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [autoPlayTTS, setAutoPlayTTS] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 시스템 프롬프트 로드
    fetch('/LLM/system_prompt.txt')
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.text();
      })
      .then(text => setSystemPrompt(text))
      .catch(error => {
        console.error('system_prompt.txt 파일을 불러오는 데 실패했습니다:', error);
        setSystemPrompt('system_prompt.txt 파일을 찾을 수 없습니다.');
      });

    // 브라우저 호환성 및 마이크 권한 상태 확인 (초기 로딩 시)
    const checkInitialSupport = async () => {
      // 브라우저 호환성 체크
      if (!checkBrowserSupport()) {
        console.warn('브라우저가 음성 녹음을 지원하지 않습니다.');
        return;
      }

      // 마이크 권한 상태 확인
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('초기 마이크 권한 상태:', permission.state);
          
          // 권한이 거부된 경우 사용자에게 알림
          if (permission.state === 'denied') {
            console.warn('마이크 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
          }
        } catch (error) {
          console.log('권한 상태 확인 실패:', error);
        }
      }
    };

    checkInitialSupport();
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // 컴포넌트 언마운트 시 오디오 정리
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;

    // 사용자 메시지 추가
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setChatHistory(prev => [...prev, userMessage]);

    setInputValue('');
    setIsLoading(true);

    try {
      // 디버깅 로그: 전송할 히스토리 확인
      const historyToSend = chatHistory.slice(-10);
      console.log("=== FRONTEND DEBUG ===");
      console.log("Question:", text);
      console.log("History length:", historyToSend.length);
      console.log("History content:", JSON.stringify(historyToSend, null, 2));
      console.log("=====================");

      // 서버로 질문 전송
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: text,
          systemPrompt: systemPrompt,
          history: historyToSend, // 최근 10개 메시지만 전송
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ ' + data.error,
          timestamp: new Date()
        }]);
      } else {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer || '(응답 없음)',
          timestamp: new Date(),
          tokens: data.tokens,
          hits: data.hits
        };
        setMessages(prev => [...prev, assistantMessage]);
        setChatHistory(prev => [...prev, assistantMessage]);
        
        // 자동 TTS 재생
        handleAutoTTS(assistantMessage);
      }
    } catch (error) {
      console.error('API 호출 실패:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ 서버와의 통신에 실패했습니다.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoButton = async () => {
    setIsGoButtonDisabled(true);
    setIsLoading(true);

    try {
      // 디버깅 로그: 초기 대화 시작
      console.log("=== GO BUTTON DEBUG ===");
      console.log("Initial question: 안녕하세요! COEX 이벤트 안내 AI입니다. 무엇을 도와드릴까요?");
      console.log("History length: 0 (initial)");
      console.log("=====================");

      // CLOVA API를 통해 실제 대화 시작 메시지 생성
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: "안녕하세요! COEX 이벤트 안내 AI입니다. 무엇을 도와드릴까요?",
          systemPrompt: systemPrompt,
          history: [], // 초기 대화이므로 빈 히스토리
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ ' + data.error,
          timestamp: new Date()
        }]);
      } else {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer || '안녕하세요! COEX 이벤트 안내 AI입니다. 무엇을 도와드릴까요?',
          timestamp: new Date(),
          tokens: data.tokens,
          hits: data.hits
        };
        setMessages(prev => [...prev, assistantMessage]);
        setChatHistory(prev => [...prev, assistantMessage]);
        
        // 자동 TTS 재생
        handleAutoTTS(assistantMessage);
      }
    } catch (error) {
      console.error('대화 시작 실패:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ 서버와의 통신에 실패했습니다.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.nativeEvent as any).isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // WAV 형식으로 오디오 데이터를 생성하는 함수
  const createWavBlob = (audioBuffer: Float32Array, sampleRate: number): Blob => {
    const length = audioBuffer.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV 헤더 작성
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // 오디오 데이터 작성
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };

  // 음성 녹음 시작 (WAV 형식으로)
  const startRecording = async () => {
    try {
      // 브라우저 호환성 먼저 체크
      if (!checkBrowserSupport()) {
        return;
      }

      // 모바일 브라우저 호환성을 위한 오디오 설정
      const audioConstraints = {
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // 모바일에서 더 안정적인 설정
          latency: 0.01
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      
      // 모바일 브라우저 호환성을 위한 AudioContext 생성
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({
        sampleRate: 16000,
        latencyHint: 'interactive'
      });
      
      // 모바일에서 AudioContext가 suspended 상태일 수 있으므로 resume
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      
      // 모바일에서 더 안정적인 버퍼 크기 사용
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      const audioData: Float32Array[] = [];
      
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        audioData.push(new Float32Array(inputData));
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      // 녹음 중지 시 WAV 파일 생성
      const stopRecording = () => {
        processor.disconnect();
        source.disconnect();
        audioContext.close();
        stream.getTracks().forEach(track => track.stop());
        
        // 오디오 데이터를 하나의 배열로 합치기
        const totalLength = audioData.reduce((sum, chunk) => sum + chunk.length, 0);
        const combinedAudio = new Float32Array(totalLength);
        let offset = 0;
        
        for (const chunk of audioData) {
          combinedAudio.set(chunk, offset);
          offset += chunk.length;
        }
        
        // WAV 파일 생성
        const wavBlob = createWavBlob(combinedAudio, 16000);
        processAudio(wavBlob, 'audio/wav');
        setIsRecording(false);
      };
      
      // 전역 stopRecording 함수 설정
      (window as any).stopRecording = stopRecording;
      setIsRecording(true);
      
    } catch (error) {
      console.error('마이크 접근 오류:', error);
      
      // 모바일에서 더 구체적인 오류 메시지 제공
      let errorMessage = '마이크 접근 권한이 필요합니다.';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = '마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = '마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = '이 브라우저는 음성 녹음을 지원하지 않습니다.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = '마이크가 다른 애플리케이션에서 사용 중입니다. 다른 앱을 종료하고 다시 시도해주세요.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = '마이크 설정이 지원되지 않습니다. 다른 마이크를 사용해주세요.';
        }
      }
      
      alert(errorMessage);
    }
  };

  // 음성 녹음 중지
  const stopRecording = () => {
    if (isRecording && (window as any).stopRecording) {
      (window as any).stopRecording();
    }
  };

  // 오디오 처리 및 STT
  const processAudio = async (audioBlob: Blob, mimeType?: string) => {
    setIsProcessingVoice(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.text) {
        setInputValue(result.text);
        // 자동으로 메시지 전송
        const userMessage: Message = {
          role: 'user',
          content: result.text,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setChatHistory(prev => [...prev, userMessage]);

        // AI 응답 요청
        setIsLoading(true);
        try {
          const historyToSend = chatHistory.slice(-10);
          const chatResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              question: result.text,
              systemPrompt: systemPrompt,
              history: historyToSend,
            }),
          });

          const chatData = await chatResponse.json();
          
          if (chatData.error) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: '⚠️ ' + chatData.error,
              timestamp: new Date()
            }]);
          } else {
            const assistantMessage: Message = {
              role: 'assistant',
              content: chatData.answer || '(응답 없음)',
              timestamp: new Date(),
              tokens: chatData.tokens,
              hits: chatData.hits
            };
            setMessages(prev => [...prev, assistantMessage]);
            setChatHistory(prev => [...prev, assistantMessage]);
            
            // 자동 TTS 재생
            handleAutoTTS(assistantMessage);
          }
        } catch (error) {
          console.error('AI 응답 요청 실패:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '⚠️ 서버와의 통신에 실패했습니다.',
            timestamp: new Date()
          }]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // STT007 오류 (음성 데이터가 너무 짧음) 특별 처리
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
      setIsProcessingVoice(false);
    }
  };

  // 브라우저 호환성 체크
  const checkBrowserSupport = () => {
    // HTTPS 체크
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      alert('음성 녹음 기능은 HTTPS 환경에서만 사용할 수 있습니다. 현재 HTTP 환경입니다.');
      return false;
    }

    // getUserMedia 지원 체크
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('이 브라우저는 음성 녹음을 지원하지 않습니다. 최신 브라우저를 사용해주세요.');
      return false;
    }

    // Web Audio API 지원 체크
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      alert('이 브라우저는 Web Audio API를 지원하지 않습니다. 최신 브라우저를 사용해주세요.');
      return false;
    }

    return true;
  };

  // 마이크 권한 확인 및 요청
  const checkMicrophonePermission = async () => {
    setIsRequestingPermission(true);
    
    try {
      // 브라우저 호환성 먼저 체크
      if (!checkBrowserSupport()) {
        return false;
      }

      // 권한 상태 확인
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('마이크 권한 상태:', permission.state);
        
        if (permission.state === 'denied') {
          alert('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
          return false;
        }
      }
      
      // 실제 마이크 접근 테스트
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // 즉시 스트림 종료 (권한 확인만을 위해)
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('마이크 권한 확인 오류:', error);
      
      // 모바일에서 더 구체적인 오류 메시지 제공
      let errorMessage = '마이크 접근 권한이 필요합니다.';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = '마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = '마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = '이 브라우저는 음성 녹음을 지원하지 않습니다.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = '마이크가 다른 애플리케이션에서 사용 중입니다. 다른 앱을 종료하고 다시 시도해주세요.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = '마이크 설정이 지원되지 않습니다. 다른 마이크를 사용해주세요.';
        }
      }
      
      alert(errorMessage);
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // 마이크 버튼 클릭 핸들러 (모바일 터치 최적화)
  const handleMicClick = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isRecording) {
      stopRecording();
    } else {
      // 권한 확인 후 녹음 시작
      const hasPermission = await checkMicrophonePermission();
      if (hasPermission) {
        startRecording();
      } else {
        alert('마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
      }
    }
  };

  // 터치 이벤트 핸들러 (모바일에서 더 나은 반응성)
  const handleTouchStart = async (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isRecording) {
      const hasPermission = await checkMicrophonePermission();
      if (hasPermission) {
        startRecording();
      } else {
        alert('마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    }
  };

  // TTS 기능
  const playTTS = async (text: string) => {
    if (isPlayingTTS) {
      // 이미 재생 중이면 중지
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlayingTTS(false);
      return;
    }

    try {
      setIsPlayingTTS(true);

      // TTS API 호출
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          speaker: 'nara',
          speed: '0',
          pitch: '0',
          volume: '0',
          format: 'mp3'
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS API failed: ${response.status}`);
      }

      // 오디오 데이터를 Blob으로 변환
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // 기존 오디오 정리
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      // 새 오디오 엘리먼트 생성
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // 오디오 이벤트 리스너
      audio.onended = () => {
        setIsPlayingTTS(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingTTS(false);
        URL.revokeObjectURL(audioUrl);
        console.error('TTS audio playback failed');
      };

      // 오디오 재생
      await audio.play();

    } catch (error) {
      console.error('TTS error:', error);
      setIsPlayingTTS(false);
      alert('음성 재생에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 자동 TTS 재생 (AI 응답에 대해)
  const handleAutoTTS = (message: Message) => {
    if (autoPlayTTS && message.role === 'assistant' && message.content) {
      // 약간의 지연 후 재생 (UI 업데이트 완료 후)
      setTimeout(() => {
        playTTS(message.content);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-800 bg-opacity-95 backdrop-blur-sm border-b border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-lg sm:text-xl font-bold">COEX 이벤트 안내</h1>
          <div className="flex items-center gap-3">
            {/* 자동 TTS 토글 버튼 */}
            <button
              onClick={() => setAutoPlayTTS(!autoPlayTTS)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                autoPlayTTS 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
              }`}
              title={autoPlayTTS ? '자동 음성 재생 켜짐' : '자동 음성 재생 끔'}
            >
              {autoPlayTTS ? '🔊 자동재생' : '🔇 수동재생'}
            </button>
            <div className="text-xs sm:text-sm text-green-400">
              온라인
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-4xl mx-auto w-full min-h-0">
        {/* Sidebar - 모바일에서는 접을 수 있게 */}
        <aside className="hidden lg:block w-80 bg-gray-800 p-4 border-r border-gray-700">
          <h3 className="text-lg font-semibold mb-3">System Prompt</h3>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            disabled={isGoButtonDisabled}
            rows={10}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            placeholder="System Prompt를 입력하세요"
          />
          <button
            onClick={handleGoButton}
            disabled={isGoButtonDisabled}
            className="w-full mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {isGoButtonDisabled ? '대화 중...' : 'go'}
          </button>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col min-h-0">
          <div ref={chatRef} className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 overscroll-contain">
            {messages.map((message, index) => (
              <ChatBubble 
                key={index} 
                message={message} 
                onPlayTTS={playTTS}
                isPlayingTTS={isPlayingTTS}
              />
            ))}
            {isLoading && (
              <ChatBubble 
                message={{ role: 'assistant', content: '생각 중…' }} 
                isThinking={true}
              />
            )}
          </div>

          {/* Input Form - 모바일 최적화 */}
          <form onSubmit={handleSubmit} className="p-2 sm:p-4 border-t border-gray-700 bg-gray-900">
            <div className="flex gap-1 sm:gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                disabled={isLoading || isProcessingVoice}
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
                disabled={isLoading || isProcessingVoice || isRequestingPermission}
                className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-colors touch-manipulation select-none ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white disabled:bg-gray-500 disabled:cursor-not-allowed'
                }`}
                title={isRecording ? '녹음 중지' : isRequestingPermission ? '권한 요청 중...' : '음성 입력'}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {isProcessingVoice ? (
                  <span className="inline-block w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : isRequestingPermission ? (
                  <span className="inline-block w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : isRecording ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V7z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim() || isProcessingVoice}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg sm:rounded-xl font-semibold transition-colors text-sm sm:text-base touch-manipulation select-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                보내기
              </button>
            </div>
            {isRequestingPermission && (
              <div className="mt-2 text-center text-xs sm:text-sm text-yellow-400 animate-pulse">
                🔐 마이크 권한 요청 중... 브라우저에서 권한을 허용해주세요
              </div>
            )}
            {isRecording && (
              <div className="mt-2 text-center text-xs sm:text-sm text-red-400 animate-pulse">
                🎤 녹음 중... 최소 1초 이상 말씀해주세요
              </div>
            )}
            {isProcessingVoice && (
              <div className="mt-2 text-center text-xs sm:text-sm text-blue-400">
                🔄 음성을 텍스트로 변환 중...
              </div>
            )}
          </form>
        </main>
      </div>
    </div>
  );
}