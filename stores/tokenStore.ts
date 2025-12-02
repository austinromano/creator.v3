'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Creator } from '@/lib/types';
import { mockCreators } from '@/lib/mock-data';

interface CreateTokenInput {
  name: string;
  symbol: string;
  avatar: string;
  description: string;
  isLive: boolean;
  creatorId: string;
  twitter?: string;
  website?: string;
  telegram?: string;
}

interface TokenState {
  tokens: Creator[];
  addToken: (tokenData: CreateTokenInput) => Creator;
  getTokenBySymbol: (symbol: string) => Creator | undefined;
  getTokenByCreator: (creatorId: string) => Creator | undefined;
  updateToken: (symbol: string, updates: Partial<Creator>) => void;
}

const generateTokenId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

const generateInitialPriceHistory = (initialPrice: number) => {
  const points = [];
  const now = Date.now();
  
  // Generate 24 hours of price history starting from initial price
  for (let i = 23; i >= 0; i--) {
    const timestamp = now - (i * 60 * 60 * 1000);
    // Small random variations around the initial price
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const price = Math.max(initialPrice * (1 + variation), 0.00001);
    
    points.push({
      timestamp,
      price,
      volume: Math.random() * 100 + 10, // Random volume between 10-110
    });
  }
  
  return points;
};

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => ({
      tokens: mockCreators,

      addToken: (tokenData: CreateTokenInput) => {
        const id = generateTokenId();
        const created = new Date().toISOString();
        const initialPrice = 0.00001; // Starting price in SOL

        const newToken: Creator = {
          ...tokenData,
          id,
          created,
          creatorAddress: tokenData.creatorId,
          price: initialPrice,
          marketCap: initialPrice * 1000000, // 1M token supply initially
          priceChange24h: 0,
          holders: 1, // Creator is the first holder
          transactions: 0,
          volume24h: 0,
          bondingCurve: 0, // Starting at 0%
          liquidity: 100, // Initial liquidity pool
          priceHistory: generateInitialPriceHistory(initialPrice),
          topHolders: [{
            address: 'Creator', // Placeholder for creator address
            balance: 1000000,
            percentage: 100,
            value: initialPrice * 1000000,
          }],
          recentTrades: [],
          messages: [{
            id: '1',
            user: tokenData.name,
            message: `Welcome to ${tokenData.symbol}! 🎉 First token created!`,
            timestamp: new Date(),
            isCreator: true,
            avatar: tokenData.avatar,
          }],
          // Set default values for required fields
          bondingCurveType: 'linear',
          category: 'entertainment',
          verificationLevel: 'none',
          trustScore: 50,
          isVerified: false,
          revenueSharing: {
            enabled: false,
            holderPercentage: 0,
            totalDistributed: 0,
          },
          staking: {
            enabled: false,
            totalStaked: 0,
            apy: 0,
          },
          tradingLimits: {
            maxBuyPerTx: 1000,
            maxSellPerTx: 1000,
            cooldownPeriod: 0,
          },
          followers: 0,
          following: 0,
          totalLikes: 0,
        };

        set((state) => ({
          tokens: [newToken, ...state.tokens],
        }));

        return newToken;
      },

      getTokenBySymbol: (symbol: string) => {
        return get().tokens.find(token => token.symbol.toLowerCase() === symbol.toLowerCase());
      },

      getTokenByCreator: (creatorId: string) => {
        return get().tokens.find(token => token.creatorAddress === creatorId);
      },

      updateToken: (symbol: string, updates: Partial<Creator>) => {
        set((state) => ({
          tokens: state.tokens.map(token =>
            token.symbol.toLowerCase() === symbol.toLowerCase()
              ? { ...token, ...updates }
              : token
          ),
        }));
      },
    }),
    {
      name: 'creator-tokens-storage',
      partialize: (state) => ({
        tokens: state.tokens.filter(token => !mockCreators.some(mock => mock.id === token.id))
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TokenState>;
        // Merge persisted user-created tokens with mock creators
        const userTokens = persisted?.tokens || [];
        return {
          ...currentState,
          tokens: [...userTokens, ...mockCreators],
        };
      },
    }
  )
);