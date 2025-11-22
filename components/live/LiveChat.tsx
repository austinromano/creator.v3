'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import { useWallet } from '@/hooks/useWallet';
import { ChatMessage } from '@/lib/types';
import { 
  Send, 
  Heart, 
  DollarSign, 
  Crown,
  MessageCircle,
  Smile,
  Gift
} from 'lucide-react';

interface LiveChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  creatorSymbol: string;
  className?: string;
}

export function LiveChat({ messages, onSendMessage, creatorSymbol, className = '' }: LiveChatProps) {
  const { isConnected, formatAddress } = useWallet();
  const [messageText, setMessageText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const emojis = ['😀', '😂', '❤️', '🚀', '🔥', '💎', '👏', '🌙', '⭐', '💯', '🎉', '🎊'];

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    onSendMessage({
      user: isConnected ? formatAddress() : 'Anonymous',
      message: messageText,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
    });

    setMessageText('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const addEmoji = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getTipBadgeColor = (tipAmount: number) => {
    if (tipAmount >= 5) return 'bg-yellow-600 hover:bg-yellow-700';
    if (tipAmount >= 1) return 'bg-purple-600 hover:bg-purple-700';
    if (tipAmount >= 0.5) return 'bg-blue-600 hover:bg-blue-700';
    return 'bg-green-600 hover:bg-green-700';
  };

  return (
    <div className={`${className} flex flex-col h-full`}>
      {/* Message Input - Flat Design */}
      <div className="p-3 bg-[#18181b]">
        <div className="flex items-center space-x-2">
          <Input
            ref={inputRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Send a message" : "Connect wallet to chat"}
            disabled={!isConnected}
            className="bg-[#0e0e10] border-gray-700 text-white text-sm h-9 rounded-none"
            maxLength={500}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !messageText.trim()}
            size="sm"
            className="bg-gray-700 hover:bg-gray-600 text-white h-9 px-3 rounded-none"
          >
            Chat
          </Button>
        </div>
      </div>

      {/* Messages Area - Twitch-style with avatars */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">Welcome to the chat room!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {[...messages].reverse().map((message) => (
              <div key={message.id} className="py-1 hover:bg-[#0e0e10] px-2 -mx-2 flex gap-2">
                <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                  <AvatarImage src={message.avatar} />
                  <AvatarFallback className="text-xs bg-gray-700">
                    {message.user.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-semibold text-sm ${
                      message.isCreator ? 'text-purple-400' : 'text-gray-400'
                    }`}>
                      {message.user}
                      {message.isCreator && <span className="text-yellow-500 ml-1">★</span>}
                    </span>
                    {message.tip && (
                      <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">
                        ${message.tip}
                      </span>
                    )}
                    <span className="text-gray-600 text-xs">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-white text-sm mt-0.5 break-words">
                    {message.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}