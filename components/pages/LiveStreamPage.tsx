'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StreamPlayer } from '@/components/live/StreamPlayer';
import { LiveChat } from '@/components/live/LiveChat';
import { TipButton } from '@/components/live/TipButton';
import { Creator } from '@/lib/types';
import { useLiveStream } from '@/hooks/useLiveStream';
import {
  Eye,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Heart,
  Share2,
  MoreVertical,
  Star
} from 'lucide-react';

interface LiveStreamPageProps {
  creator: Creator;
}

export function LiveStreamPage({ creator }: LiveStreamPageProps) {
  const { messages, viewers, isLive, setIsLive, addMessage, sendTip } = useLiveStream(creator.symbol);
  const [likes, setLikes] = useState(1247);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    setIsLive(creator.isLive);
  }, [creator.isLive, setIsLive]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const handleLike = () => {
    if (!hasLiked) {
      setLikes(prev => prev + 1);
      setHasLiked(true);
      addMessage({
        user: 'You',
        message: '❤️ Liked the stream!',
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${creator.name} is LIVE!`,
          text: `Watch ${creator.name} live streaming on creator.fun`,
          url: window.location.href,
        });
      } catch (error) {
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const isPositive = creator.priceChange24h > 0;

  return (
    <div className="min-h-screen bg-[#0e0e10]">
      {/* Top Stats Bar */}
      <div className="bg-[#18181b] border-b border-gray-800 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3 text-purple-400" />
              <span className="text-white font-medium">{formatNumber(creator.holders)}</span>
              <span className="text-gray-400">Holders</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3 text-yellow-400" />
              <span className="text-white font-medium">{formatNumber(viewers || creator.viewers || 0)}</span>
              <span className="text-gray-400">Watching</span>
            </div>
            <div className="flex items-center space-x-1">
              <DollarSign className="h-3 w-3 text-green-400" />
              <span className="text-white font-medium">${creator.price.toFixed(6)}</span>
              <span className="text-gray-400">Price</span>
            </div>
            <div className="flex items-center space-x-1">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{creator.priceChange24h.toFixed(1)}%
              </span>
              <span className="text-gray-400">24h</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLike}
              disabled={hasLiked}
              className={`text-white hover:bg-white/10 h-7 px-2 ${hasLiked ? 'text-red-400' : ''}`}
            >
              <Heart className={`h-3 w-3 ${hasLiked ? 'fill-current' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShare}
              className="text-white hover:bg-white/10 h-7 px-2"
            >
              <Share2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout - Contained Width */}
      <div className="max-w-7xl mx-auto">
        {/* Video Player - Full Width */}
        <div className="aspect-video bg-black">
          <StreamPlayer
            creator={creator}
            isLive={isLive}
            viewers={viewers || creator.viewers || 0}
            className="w-full h-full"
          />
        </div>

        {/* Stream Info Below Video */}
        <div className="bg-[#18181b] p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback className="bg-purple-600">
                  {creator.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-white font-bold text-lg">{creator.name}</h2>
                <p className="text-gray-400 text-sm">${creator.symbol}</p>
              </div>
            </div>
            <TipButton
              creator={creator}
              onTip={sendTip}
            />
          </div>
          <p className="text-gray-300 text-base mb-3">{creator.description}</p>

          {/* Quick Stats */}
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span className="flex items-center">
              <Star className="h-4 w-4 mr-1 text-yellow-400" />
              {formatNumber(likes)} likes
            </span>
            <span>•</span>
            <span>Market Cap: ${formatNumber(creator.marketCap)}</span>
          </div>
        </div>

        {/* Live Chat Below Stream Info */}
        <div className="bg-[#18181b] border-t border-gray-800">
          {/* Chat Header */}
          <div className="px-4 py-2 bg-[#18181b]">
            <h3 className="text-gray-400 font-medium text-xs uppercase tracking-wide">Live Chat</h3>
          </div>

          {/* Chat Messages */}
          <div className="h-96">
            <LiveChat
              messages={messages || []}
              onSendMessage={addMessage}
              creatorSymbol={creator.symbol}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
