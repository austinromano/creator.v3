import { BondingCurveType } from './types';

/**
 * Bonding Curve Formulas
 * These formulas calculate token price based on supply
 */

export interface BondingCurveParams {
  type: BondingCurveType;
  initialPrice: number;
  finalPrice: number;
  maxSupply: number;
  steepness?: number; // for sigmoid curves
  base?: number; // for exponential curves
}

export class BondingCurve {
  private params: BondingCurveParams;

  constructor(params: BondingCurveParams) {
    this.params = params;
  }

  /**
   * Calculate price at a given supply
   */
  calculatePrice(supply: number): number {
    const { type } = this.params;

    switch (type) {
      case 'linear':
        return this.linearCurve(supply);
      case 'exponential':
        return this.exponentialCurve(supply);
      case 'sigmoid':
        return this.sigmoidCurve(supply);
      case 'logarithmic':
        return this.logarithmicCurve(supply);
      default:
        return this.linearCurve(supply);
    }
  }

  /**
   * Linear bonding curve: price = initial + (final - initial) * (supply / maxSupply)
   */
  private linearCurve(supply: number): number {
    const { initialPrice, finalPrice, maxSupply } = this.params;
    const progress = Math.min(supply / maxSupply, 1);
    return initialPrice + (finalPrice - initialPrice) * progress;
  }

  /**
   * Exponential bonding curve: price = initial * base^(supply/maxSupply)
   */
  private exponentialCurve(supply: number): number {
    const { initialPrice, finalPrice, maxSupply, base = 2 } = this.params;
    const progress = Math.min(supply / maxSupply, 1);
    const growthFactor = Math.pow(base, progress);

    // Scale to fit between initial and final price
    const maxGrowth = Math.pow(base, 1);
    return initialPrice + (finalPrice - initialPrice) * ((growthFactor - 1) / (maxGrowth - 1));
  }

  /**
   * Sigmoid (S-curve) bonding curve: slower growth at start/end, faster in middle
   * Uses logistic function: 1 / (1 + e^(-steepness * (x - 0.5)))
   */
  private sigmoidCurve(supply: number): number {
    const { initialPrice, finalPrice, maxSupply, steepness = 10 } = this.params;
    const progress = Math.min(supply / maxSupply, 1);

    // Sigmoid function centered at 0.5
    const sigmoid = 1 / (1 + Math.exp(-steepness * (progress - 0.5)));

    // Normalize to 0-1 range
    const sigmoidMin = 1 / (1 + Math.exp(steepness / 2));
    const sigmoidMax = 1 / (1 + Math.exp(-steepness / 2));
    const normalized = (sigmoid - sigmoidMin) / (sigmoidMax - sigmoidMin);

    return initialPrice + (finalPrice - initialPrice) * normalized;
  }

  /**
   * Logarithmic bonding curve: fast growth at start, slower later
   * price = initial + (final - initial) * log(1 + x) / log(2)
   */
  private logarithmicCurve(supply: number): number {
    const { initialPrice, finalPrice, maxSupply } = this.params;
    const progress = Math.min(supply / maxSupply, 1);

    // Use log(1 + x) to ensure smooth curve from 0
    const logProgress = Math.log(1 + progress) / Math.log(2);

    return initialPrice + (finalPrice - initialPrice) * logProgress;
  }

  /**
   * Calculate cost to buy a certain amount of tokens
   * Uses integral of the bonding curve
   */
  calculateBuyCost(currentSupply: number, amount: number): number {
    const samples = 100;
    const step = amount / samples;
    let totalCost = 0;

    for (let i = 0; i < samples; i++) {
      const supply = currentSupply + i * step;
      const price = this.calculatePrice(supply);
      totalCost += price * step;
    }

    return totalCost;
  }

  /**
   * Calculate proceeds from selling tokens
   */
  calculateSellProceeds(currentSupply: number, amount: number): number {
    const samples = 100;
    const step = amount / samples;
    let totalProceeds = 0;

    for (let i = 0; i < samples; i++) {
      const supply = currentSupply - i * step;
      const price = this.calculatePrice(supply);
      totalProceeds += price * step;
    }

    return totalProceeds;
  }

  /**
   * Calculate market cap at current supply
   */
  calculateMarketCap(currentSupply: number): number {
    return this.calculatePrice(currentSupply) * currentSupply;
  }

  /**
   * Calculate progress towards bonding curve completion (0-100%)
   */
  calculateProgress(currentSupply: number): number {
    const { maxSupply } = this.params;
    return Math.min((currentSupply / maxSupply) * 100, 100);
  }
}

/**
 * Anti-bot trading limits
 */
export class TradingLimits {
  private lastTrades: Map<string, number> = new Map();
  private tradeCounts: Map<string, number> = new Map();

  constructor(
    private maxBuyPerTx: number,
    private maxSellPerTx: number,
    private cooldownPeriod: number // seconds
  ) {}

  /**
   * Check if a buy is allowed
   */
  canBuy(userAddress: string, amount: number): { allowed: boolean; reason?: string } {
    // Check amount limit
    if (amount > this.maxBuyPerTx) {
      return {
        allowed: false,
        reason: `Maximum buy amount is ${this.maxBuyPerTx} SOL per transaction`,
      };
    }

    // Check cooldown
    const lastTrade = this.lastTrades.get(userAddress);
    if (lastTrade) {
      const timeSinceLastTrade = (Date.now() - lastTrade) / 1000;
      if (timeSinceLastTrade < this.cooldownPeriod) {
        return {
          allowed: false,
          reason: `Please wait ${Math.ceil(this.cooldownPeriod - timeSinceLastTrade)}s before trading again`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if a sell is allowed
   */
  canSell(userAddress: string, amount: number): { allowed: boolean; reason?: string } {
    if (amount > this.maxSellPerTx) {
      return {
        allowed: false,
        reason: `Maximum sell amount is ${this.maxSellPerTx} tokens per transaction`,
      };
    }

    // Check cooldown
    const lastTrade = this.lastTrades.get(userAddress);
    if (lastTrade) {
      const timeSinceLastTrade = (Date.now() - lastTrade) / 1000;
      if (timeSinceLastTrade < this.cooldownPeriod) {
        return {
          allowed: false,
          reason: `Please wait ${Math.ceil(this.cooldownPeriod - timeSinceLastTrade)}s before trading again`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record a trade
   */
  recordTrade(userAddress: string) {
    this.lastTrades.set(userAddress, Date.now());
    const count = this.tradeCounts.get(userAddress) || 0;
    this.tradeCounts.set(userAddress, count + 1);
  }

  /**
   * Get trade statistics for a user
   */
  getUserStats(userAddress: string) {
    return {
      totalTrades: this.tradeCounts.get(userAddress) || 0,
      lastTradeTime: this.lastTrades.get(userAddress),
    };
  }
}

/**
 * Revenue sharing calculator
 */
export class RevenueSharing {
  /**
   * Calculate fee distribution
   */
  static calculateDistribution(
    totalFees: number,
    holderPercentage: number,
    totalSupply: number,
    holderBalances: Map<string, number>
  ): Map<string, number> {
    const holderShare = totalFees * (holderPercentage / 100);
    const distribution = new Map<string, number>();

    // Distribute proportionally to holders
    for (const [holder, balance] of holderBalances.entries()) {
      const share = (balance / totalSupply) * holderShare;
      distribution.set(holder, share);
    }

    return distribution;
  }

  /**
   * Calculate claimable rewards for a holder
   */
  static calculateClaimable(
    holderBalance: number,
    totalSupply: number,
    totalRewardsPool: number
  ): number {
    if (totalSupply === 0) return 0;
    return (holderBalance / totalSupply) * totalRewardsPool;
  }
}

/**
 * Staking reward calculator
 */
export class StakingRewards {
  /**
   * Calculate staking rewards based on APY
   */
  static calculateRewards(
    stakedAmount: number,
    apy: number,
    stakingDuration: number // in seconds
  ): number {
    const yearInSeconds = 365 * 24 * 60 * 60;
    const apyDecimal = apy / 100;
    const timeRatio = stakingDuration / yearInSeconds;

    return stakedAmount * apyDecimal * timeRatio;
  }

  /**
   * Calculate dynamic APY based on total staked
   */
  static calculateDynamicAPY(
    totalStaked: number,
    totalSupply: number,
    baseAPY: number,
    maxAPY: number
  ): number {
    const stakingRatio = totalStaked / totalSupply;

    // Lower staking ratio = higher APY (incentivize staking)
    // APY decreases as more people stake
    const apy = baseAPY + (maxAPY - baseAPY) * (1 - stakingRatio);

    return Math.max(baseAPY, Math.min(maxAPY, apy));
  }
}

export default BondingCurve;
