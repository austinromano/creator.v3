export type BondingCurveType = 'linear' | 'exponential' | 'sigmoid' | 'logarithmic';
export type TokenCategory = 'gaming' | 'music' | 'art' | 'sports' | 'education' | 'entertainment' | 'technology' | 'other';
export type VerificationLevel = 'none' | 'basic' | 'verified' | 'premium';

export interface Creator {
  id: string;
  name: string;
  symbol: string;
  avatar: string;
  description: string;
  marketCap: number;
  price: number;
  priceChange24h: number;
  created: string;
  holders: number;
  transactions: number;
  volume24h: number;
  bondingCurve: number;
  liquidity: number;
  isLive: boolean;
  viewers?: number;
  twitter?: string;
  website?: string;
  telegram?: string;
  messages?: ChatMessage[];
  priceHistory?: PricePoint[];
  topHolders?: TokenHolder[];
  recentTrades?: Trade[];

  // Enhanced features
  bondingCurveType: BondingCurveType;
  category: TokenCategory;
  verificationLevel: VerificationLevel;
  trustScore: number; // 0-100
  isVerified: boolean;
  creatorAddress: string;

  // Revenue sharing
  revenueSharing: {
    enabled: boolean;
    holderPercentage: number;
    totalDistributed: number;
  };

  // Staking
  staking: {
    enabled: boolean;
    totalStaked: number;
    apy: number;
  };

  // Anti-bot measures
  tradingLimits: {
    maxBuyPerTx: number;
    maxSellPerTx: number;
    cooldownPeriod: number; // seconds
  };

  // Social features
  followers: number;
  following: number;
  totalLikes: number;

  // Streaming
  streamConfig?: StreamConfig;
  vodReplays?: VODReplay[];
  scheduledStreams?: ScheduledStream[];

  // Governance
  governance?: GovernanceConfig;

  // NFT Integration
  nftCollection?: NFTCollection;

  // Analytics
  analytics?: TokenAnalytics;
}

export interface ChatMessage {
  id: string;
  user: string;
  avatar?: string;
  message: string;
  tip?: number;
  timestamp: Date;
  isCreator?: boolean;
}

export interface Trade {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  tokens: number;
  price: number;
  slippage: number;
  user: string;
  timestamp: Date;
}

export interface PricePoint {
  timestamp: number;
  price: number;
  volume: number;
}

export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
  value: number;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  connect: () => void;
  disconnect: () => void;
}

export interface TradingState {
  selectedToken: Creator | null;
  tradeType: 'buy' | 'sell';
  amount: string;
  slippage: number;
  setSelectedToken: (token: Creator | null) => void;
  setTradeType: (type: 'buy' | 'sell') => void;
  setAmount: (amount: string) => void;
  setSlippage: (slippage: number) => void;
  executeTrade: () => Promise<void>;
}

export type FilterType = 'live' | 'new' | 'trending' | 'completing';

// Advanced Streaming Features
export interface StreamConfig {
  quality: 'auto' | '1080p' | '720p' | '480p';
  enableAdaptiveBitrate: boolean;
  multiStreamDestinations: StreamDestination[];
  overlays: StreamOverlay[];
  enableRecording: boolean;
  enableChat: boolean;
  enableTips: boolean;
  enablePolls: boolean;
  streamKey?: string;
  rtmpUrl?: string;
}

export interface StreamDestination {
  platform: 'youtube' | 'twitter' | 'twitch' | 'custom';
  streamKey: string;
  enabled: boolean;
}

export interface StreamOverlay {
  type: 'alert' | 'chart' | 'chat' | 'donation' | 'ticker';
  position: { x: number; y: number };
  size: { width: number; height: number };
  enabled: boolean;
}

export interface VODReplay {
  id: string;
  title: string;
  thumbnail: string;
  duration: number; // seconds
  views: number;
  recorded: string;
  url: string;
  highlights?: VideoHighlight[];
}

export interface VideoHighlight {
  timestamp: number;
  description: string;
  thumbnailUrl: string;
}

export interface ScheduledStream {
  id: string;
  title: string;
  description: string;
  scheduledFor: string;
  duration: number; // minutes
  notified: boolean;
  thumbnail?: string;
}

// Governance
export interface GovernanceConfig {
  enabled: boolean;
  proposals: Proposal[];
  votingPower: 'token-weighted' | 'one-person-one-vote';
  quorumRequired: number; // percentage
  proposalThreshold: number; // minimum tokens to create proposal
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  created: string;
  votingEnds: string;
  status: 'active' | 'passed' | 'rejected' | 'executed';
  votes: {
    for: number;
    against: number;
    abstain: number;
  };
  actions: ProposalAction[];
}

export interface ProposalAction {
  type: 'parameter-change' | 'treasury-spend' | 'feature-toggle';
  target: string;
  value: any;
}

// NFT Integration
export interface NFTCollection {
  address: string;
  name: string;
  description: string;
  items: NFTItem[];
  holderBenefits: string[];
}

export interface NFTItem {
  id: string;
  name: string;
  image: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  attributes: Record<string, string>;
  owner?: string;
  minimumTokensRequired: number;
}

// Analytics
export interface TokenAnalytics {
  totalViews: number;
  uniqueVisitors: number;
  avgHoldingTime: number; // hours
  topReferrers: string[];
  geographicDistribution: Record<string, number>;
  holderGrowth: DataPoint[];
  volumeGrowth: DataPoint[];
  engagement: {
    likes: number;
    shares: number;
    comments: number;
  };
}

export interface DataPoint {
  timestamp: number;
  value: number;
}

// Interactive Features
export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  created: string;
  endsAt: string;
  totalVotes: number;
  creatorOnly: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Prediction {
  id: string;
  question: string;
  outcomes: PredictionOutcome[];
  created: string;
  resolvedAt?: string;
  resolved: boolean;
  result?: string;
}

export interface PredictionOutcome {
  id: string;
  text: string;
  odds: number;
  totalStaked: number;
  participants: number;
}

// Subscription Tiers
export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  priceInTokens: number;
  benefits: string[];
  subscribers: number;
  color: string;
  badge?: string;
}

// Trust & Safety
export interface TrustMetrics {
  score: number; // 0-100
  signals: TrustSignal[];
  riskLevel: 'low' | 'medium' | 'high';
  scamProbability: number; // 0-1
  lastUpdated: string;
}

export interface TrustSignal {
  type: 'positive' | 'negative' | 'neutral';
  category: 'contract' | 'social' | 'financial' | 'behavioral';
  description: string;
  weight: number;
  timestamp: string;
}

// Social Graph
export interface UserProfile {
  address: string;
  username?: string;
  avatar?: string;
  bio?: string;
  following: string[];
  followers: string[];
  tokensCreated: string[];
  tokensHeld: TokenHolding[];
  achievements: Achievement[];
  reputation: number;
}

export interface TokenHolding {
  tokenId: string;
  balance: number;
  averageBuyPrice: number;
  realizedPnL: number;
  unrealizedPnL: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Discovery & Recommendations
export interface RecommendationEngine {
  forUser: string;
  recommendations: TokenRecommendation[];
  basedOn: string[];
}

export interface TokenRecommendation {
  token: Creator;
  score: number;
  reasons: string[];
}