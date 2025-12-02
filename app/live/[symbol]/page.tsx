'use client';
import React from 'react';
import { notFound } from 'next/navigation';
import { LiveStreamPage } from '@/components/pages/LiveStreamPage';
import { useTokenStore } from '@/stores/tokenStore';

interface LivePageProps {
  params: Promise<{
    symbol: string;
  }>;
}

export default function LivePage({ params }: LivePageProps) {
  const resolvedParams = React.use(params);
  const { getTokenBySymbol } = useTokenStore();
  const creator = getTokenBySymbol(resolvedParams.symbol);

  if (!creator) {
    notFound();
  }

  // Allow viewing even if not marked as live - the StreamPlayer will show
  // "Waiting for broadcaster" if no stream is available. This enables
  // viewers to wait for a stream to start.
  // Force isLive to true so StreamPlayer attempts connection
  const creatorWithLive = { ...creator, isLive: true };

  return <LiveStreamPage creator={creatorWithLive} />;
}