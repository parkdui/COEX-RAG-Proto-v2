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
}

function ChatBubble({ message, isThinking = false }: ChatBubbleProps) {
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
  const chatRef = useRef<HTMLDivElement>(null);

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
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

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

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-800 bg-opacity-95 backdrop-blur-sm border-b border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">COEX 이벤트 안내</h1>
          <div className="text-sm text-green-400">
            온라인
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-4xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-80 bg-gray-800 p-4 border-r border-gray-700">
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
        <main className="flex-1 flex flex-col">
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <ChatBubble key={index} message={message} />
            ))}
            {isLoading && (
              <ChatBubble 
                message={{ role: 'assistant', content: '생각 중…' }} 
                isThinking={true}
              />
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
              >
                보내기
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}