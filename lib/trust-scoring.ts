import { TrustMetrics, TrustSignal, Creator } from './types';

/**
 * Trust Scoring System
 * Analyzes tokens for potential scams and risks
 */

export class TrustScorer {
  /**
   * Calculate comprehensive trust score (0-100)
   */
  static calculateTrustScore(token: Creator): TrustMetrics {
    const signals: TrustSignal[] = [];
    let score = 50; // Start at neutral

    // Contract analysis
    const contractSignals = this.analyzeContract(token);
    signals.push(...contractSignals);

    // Social signals
    const socialSignals = this.analyzeSocial(token);
    signals.push(...socialSignals);

    // Financial signals
    const financialSignals = this.analyzeFinancials(token);
    signals.push(...financialSignals);

    // Behavioral signals
    const behavioralSignals = this.analyzeBehavior(token);
    signals.push(...behavioralSignals);

    // Calculate weighted score
    for (const signal of signals) {
      const impact = signal.weight * (signal.type === 'positive' ? 1 : -1);
      score += impact;
    }

    // Clamp between 0-100
    score = Math.max(0, Math.min(100, score));

    // Calculate risk level
    const riskLevel = this.calculateRiskLevel(score);

    // Calculate scam probability
    const scamProbability = this.calculateScamProbability(score, signals);

    return {
      score,
      signals,
      riskLevel,
      scamProbability,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Analyze smart contract security
   */
  private static analyzeContract(token: Creator): TrustSignal[] {
    const signals: TrustSignal[] = [];

    // Check if verified
    if (token.isVerified) {
      signals.push({
        type: 'positive',
        category: 'contract',
        description: 'Creator verified by platform',
        weight: 15,
        timestamp: new Date().toISOString(),
      });
    }

    // Check revenue sharing (indicates long-term thinking)
    if (token.revenueSharing.enabled) {
      signals.push({
        type: 'positive',
        category: 'contract',
        description: 'Revenue sharing enabled for holders',
        weight: 10,
        timestamp: new Date().toISOString(),
      });
    }

    // Check trading limits (anti-bot protection)
    if (token.tradingLimits.maxBuyPerTx < 100 && token.tradingLimits.cooldownPeriod > 0) {
      signals.push({
        type: 'positive',
        category: 'contract',
        description: 'Anti-bot protection enabled',
        weight: 8,
        timestamp: new Date().toISOString(),
      });
    }

    // Check liquidity
    const liquidityRatio = token.liquidity / token.marketCap;
    if (liquidityRatio < 0.1) {
      signals.push({
        type: 'negative',
        category: 'contract',
        description: 'Low liquidity compared to market cap',
        weight: 12,
        timestamp: new Date().toISOString(),
      });
    }

    return signals;
  }

  /**
   * Analyze social presence
   */
  private static analyzeSocial(token: Creator): TrustSignal[] {
    const signals: TrustSignal[] = [];

    // Check social media presence
    const hasSocials = token.twitter || token.telegram || token.website;
    if (hasSocials) {
      signals.push({
        type: 'positive',
        category: 'social',
        description: 'Active social media presence',
        weight: 5,
        timestamp: new Date().toISOString(),
      });
    } else {
      signals.push({
        type: 'negative',
        category: 'social',
        description: 'No social media links',
        weight: 8,
        timestamp: new Date().toISOString(),
      });
    }

    // Check follower count
    if (token.followers > 1000) {
      signals.push({
        type: 'positive',
        category: 'social',
        description: 'Strong community following',
        weight: 10,
        timestamp: new Date().toISOString(),
      });
    }

    // Check engagement
    if (token.totalLikes > 500) {
      signals.push({
        type: 'positive',
        category: 'social',
        description: 'High community engagement',
        weight: 7,
        timestamp: new Date().toISOString(),
      });
    }

    return signals;
  }

  /**
   * Analyze financial metrics
   */
  private static analyzeFinancials(token: Creator): TrustSignal[] {
    const signals: TrustSignal[] = [];

    // Check holder distribution
    if (token.holders > 100) {
      signals.push({
        type: 'positive',
        category: 'financial',
        description: 'Healthy holder distribution',
        weight: 10,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for whale concentration (if top holder has >30% could be risky)
    if (token.topHolders && token.topHolders.length > 0) {
      const topHolderPercentage = token.topHolders[0].percentage;
      if (topHolderPercentage > 30) {
        signals.push({
          type: 'negative',
          category: 'financial',
          description: 'High concentration in top holder',
          weight: 15,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Check trading volume
    const volumeToMcapRatio = token.volume24h / token.marketCap;
    if (volumeToMcapRatio < 0.01) {
      signals.push({
        type: 'negative',
        category: 'financial',
        description: 'Low trading volume',
        weight: 8,
        timestamp: new Date().toISOString(),
      });
    } else if (volumeToMcapRatio > 0.5) {
      signals.push({
        type: 'positive',
        category: 'financial',
        description: 'Healthy trading volume',
        weight: 8,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for suspicious price movements
    if (Math.abs(token.priceChange24h) > 500) {
      signals.push({
        type: 'negative',
        category: 'financial',
        description: 'Extreme price volatility',
        weight: 10,
        timestamp: new Date().toISOString(),
      });
    }

    return signals;
  }

  /**
   * Analyze behavioral patterns
   */
  private static analyzeBehavior(token: Creator): TrustSignal[] {
    const signals: TrustSignal[] = [];

    // Check token age
    const ageInHours = (Date.now() - new Date(token.created).getTime()) / (1000 * 60 * 60);

    if (ageInHours < 1) {
      signals.push({
        type: 'neutral',
        category: 'behavioral',
        description: 'Newly created token (< 1 hour)',
        weight: 5,
        timestamp: new Date().toISOString(),
      });
    } else if (ageInHours > 168) {
      // > 1 week
      signals.push({
        type: 'positive',
        category: 'behavioral',
        description: 'Established token (> 1 week old)',
        weight: 12,
        timestamp: new Date().toISOString(),
      });
    }

    // Check if creator is actively streaming
    if (token.isLive) {
      signals.push({
        type: 'positive',
        category: 'behavioral',
        description: 'Creator actively streaming',
        weight: 8,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for governance (shows commitment)
    if (token.governance?.enabled) {
      signals.push({
        type: 'positive',
        category: 'behavioral',
        description: 'Community governance enabled',
        weight: 10,
        timestamp: new Date().toISOString(),
      });
    }

    // Check transaction count
    if (token.transactions > 1000) {
      signals.push({
        type: 'positive',
        category: 'behavioral',
        description: 'High transaction activity',
        weight: 8,
        timestamp: new Date().toISOString(),
      });
    }

    return signals;
  }

  /**
   * Calculate risk level from score
   */
  private static calculateRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'low';
    if (score >= 40) return 'medium';
    return 'high';
  }

  /**
   * Calculate scam probability
   */
  private static calculateScamProbability(score: number, signals: TrustSignal[]): number {
    // Base probability from score
    let probability = (100 - score) / 100;

    // Increase probability if multiple negative financial signals
    const negativeFinancial = signals.filter(
      (s) => s.type === 'negative' && s.category === 'financial'
    ).length;

    if (negativeFinancial >= 3) {
      probability = Math.min(probability + 0.2, 1);
    }

    // Decrease probability if verified and has governance
    const hasVerification = signals.some((s) => s.description.includes('verified'));
    const hasGovernance = signals.some((s) => s.description.includes('governance'));

    if (hasVerification && hasGovernance) {
      probability = Math.max(probability - 0.3, 0);
    }

    return Number(probability.toFixed(2));
  }

  /**
   * Check for common scam patterns
   */
  static detectScamPatterns(token: Creator): string[] {
    const patterns: string[] = [];

    // Pattern 1: Honeypot (high buy volume, no sells)
    const buyTrades = token.recentTrades?.filter((t) => t.type === 'buy').length || 0;
    const sellTrades = token.recentTrades?.filter((t) => t.type === 'sell').length || 0;

    if (buyTrades > 10 && sellTrades === 0) {
      patterns.push('Potential honeypot - no sell transactions detected');
    }

    // Pattern 2: Rug pull warning (creator holds too much)
    if (token.topHolders && token.topHolders.length > 0) {
      const creatorPercentage = token.topHolders[0].percentage;
      if (creatorPercentage > 50) {
        patterns.push('Rug pull risk - creator holds >50% of supply');
      }
    }

    // Pattern 3: Pump and dump (rapid price increase)
    if (token.priceChange24h > 1000) {
      patterns.push('Pump and dump warning - extreme price increase');
    }

    // Pattern 4: No liquidity
    if (token.liquidity < 1) {
      patterns.push('Insufficient liquidity - high slippage risk');
    }

    // Pattern 5: Copycat token (generic description)
    const genericKeywords = ['moon', 'gem', '100x', 'safe', 'ape'];
    const hasGenericKeywords = genericKeywords.some((keyword) =>
      token.description.toLowerCase().includes(keyword)
    );

    if (hasGenericKeywords && token.description.length < 50) {
      patterns.push('Generic token description - possible copycat');
    }

    return patterns;
  }

  /**
   * Generate trust report
   */
  static generateTrustReport(token: Creator): string {
    const metrics = this.calculateTrustScore(token);
    const patterns = this.detectScamPatterns(token);

    let report = `Trust Score: ${metrics.score}/100 (${metrics.riskLevel.toUpperCase()} RISK)\n\n`;

    report += `Scam Probability: ${(metrics.scamProbability * 100).toFixed(1)}%\n\n`;

    if (patterns.length > 0) {
      report += `⚠️  Warning Signs:\n`;
      patterns.forEach((pattern) => {
        report += `  • ${pattern}\n`;
      });
      report += `\n`;
    }

    report += `Positive Signals:\n`;
    metrics.signals
      .filter((s) => s.type === 'positive')
      .forEach((signal) => {
        report += `  ✓ ${signal.description}\n`;
      });

    report += `\nNegative Signals:\n`;
    metrics.signals
      .filter((s) => s.type === 'negative')
      .forEach((signal) => {
        report += `  ✗ ${signal.description}\n`;
      });

    return report;
  }
}

export default TrustScorer;
