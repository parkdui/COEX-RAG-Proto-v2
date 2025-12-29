import { Message } from '@/types';

export const apiRequests = {
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

