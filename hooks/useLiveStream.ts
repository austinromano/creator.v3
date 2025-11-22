'use client';
import { useState, useEffect } from 'react';
import { ChatMessage } from '@/lib/types';

export const useLiveStream = (creatorSymbol: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewers, setViewers] = useState(0);
  const [isLive, setIsLive] = useState(false);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendTip = async (amount: number, message: string) => {
    addMessage({
      user: 'You',
      message,
      tip: amount,
    });
  };

  // Update viewer count from real stream data
  useEffect(() => {
    if (!isLive) {
      setViewers(0);
    }
  }, [isLive]);

  return {
    messages,
    viewers,
    isLive,
    setIsLive,
    addMessage,
    sendTip,
  };
};