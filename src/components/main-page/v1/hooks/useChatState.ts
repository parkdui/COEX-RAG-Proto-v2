import { useState, useCallback, useMemo } from 'react';
import { Message } from '@/types';
import { createErrorMessage } from '@/lib/messageUtils';
import { extractKeywords } from '../utils/extractKeywords';

export const useChatState = () => {
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
    
    // chatHistory에는 assistant 메시지는 키워드만 저장, user 메시지는 그대로 저장
    if (message.role === 'assistant') {
      const keywords = extractKeywords(message.content);
      if (keywords) {
        setChatHistory(prev => [...prev, {
          ...message,
          content: keywords
        }]);
      }
    } else {
      setChatHistory(prev => [...prev, message]);
    }
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

