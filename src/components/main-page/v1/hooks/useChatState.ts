import { useState, useCallback, useMemo } from 'react';
import { Message } from '@/types';
import { createErrorMessage } from '@/lib/messageUtils';

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

