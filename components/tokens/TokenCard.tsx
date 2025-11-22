'use client';
import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Creator } from '@/lib/types';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Eye, 
  Radio,
  ExternalLink,
  ShoppingCart
} from 'lucide-react';

interface TokenCardProps {
  creator: Creator;
  onQuickBuy?: (creator: Creator) => void;
}

export function TokenCard({ creator, onQuickBuy }: TokenCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(6)}`;
  };

  const formatMarketCap = (marketCap: number) => {
    return `$${formatNumber(marketCap)}`;
  };

  const isPositive = creator.priceChange24h > 0;

  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10">
      {/* Live Indicator */}
      {creator.isLive && (
        <div className="absolute top-3 right-3 z-10">
          <Badge 
            variant="destructive" 
            className="bg-red-600 hover:bg-red-700 animate-pulse"
          >
            <Radio className="h-3 w-3 mr-1" />
            LIVE
          </Badge>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start space-x-3">
          <Avatar className="h-12 w-12 ring-2 ring-purple-500/20">
            <AvatarImage src={creator.avatar} alt={creator.name} />
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600">
              {creator.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate group-hover:text-purple-300 transition-colors">
              {creator.name}
            </h3>
            <p className="text-purple-400 font-mono text-sm">${creator.symbol}</p>
            {creator.isLive && creator.viewers && (
              <div className="flex items-center space-x-1 text-red-400 text-xs">
                <Eye className="h-3 w-3" />
                <span>{formatNumber(creator.viewers)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed">
          {creator.description}
        </p>

        {/* Price and Change */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg">{formatPrice(creator.price)}</p>
            <div className={`flex items-center space-x-1 text-sm ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{isPositive ? '+' : ''}{creator.priceChange24h.toFixed(1)}%</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs">Market Cap</p>
            <p className="text-white font-semibold">{formatMarketCap(creator.marketCap)}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-gray-800/50 rounded">
            <Users className="h-3 w-3 mx-auto mb-1 text-blue-400" />
            <p className="text-gray-400">Holders</p>
            <p className="text-white font-semibold">{formatNumber(creator.holders)}</p>
          </div>
          <div className="text-center p-2 bg-gray-800/50 rounded">
            <DollarSign className="h-3 w-3 mx-auto mb-1 text-green-400" />
            <p className="text-gray-400">Volume</p>
            <p className="text-white font-semibold">${formatNumber(creator.volume24h)}</p>
          </div>
          <div className="text-center p-2 bg-gray-800/50 rounded">
            <ExternalLink className="h-3 w-3 mx-auto mb-1 text-purple-400" />
            <p className="text-gray-400">Txns</p>
            <p className="text-white font-semibold">{formatNumber(creator.transactions)}</p>
          </div>
        </div>

        {/* Bonding Curve Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Bonding curve progress</span>
            <span className="text-purple-400 font-semibold">{creator.bondingCurve.toFixed(1)}%</span>
          </div>
          <Progress 
            value={creator.bondingCurve} 
            className="h-2 bg-gray-700"
          />
          <p className="text-xs text-gray-500">
            {creator.bondingCurve >= 85 ? 'Ready for Raydium!' : 'When the curve completes, all liquidity deposited to Raydium'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Link href={`/live/${creator.symbol}`} className="flex-1">
            <Button
              variant="outline"
              className="w-full border-purple-500 text-purple-300 hover:bg-purple-500/10 hover:text-white"
            >
              View
            </Button>
          </Link>
          {creator.isLive && (
            <Link href={`/live/${creator.symbol}`}>
              <Button 
                variant="outline" 
                size="icon"
                className="border-red-500 text-red-400 hover:bg-red-500/10"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <Button 
            size="icon"
            onClick={() => onQuickBuy?.(creator)}
            className="bg-green-600 hover:bg-green-700"
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}