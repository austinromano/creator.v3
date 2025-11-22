import { Creator, TokenRecommendation, RecommendationEngine, TokenCategory } from '../types';

/**
 * AI-Powered Token Discovery and Recommendation Engine
 * Uses collaborative filtering and content-based recommendations
 */

export class TokenRecommendationEngine {
  /**
   * Generate personalized recommendations for a user
   */
  static generateRecommendations(
    userAddress: string,
    userHistory: UserInteraction[],
    allTokens: Creator[],
    limit: number = 10
  ): RecommendationEngine {
    const recommendations: TokenRecommendation[] = [];

    // 1. Content-based filtering (based on user preferences)
    const contentBased = this.contentBasedFiltering(userHistory, allTokens);

    // 2. Collaborative filtering (what similar users liked)
    const collaborative = this.collaborativeFiltering(userAddress, userHistory, allTokens);

    // 3. Trending and hot picks
    const trending = this.getTrendingTokens(allTokens);

    // 4. Category-based recommendations
    const categoryBased = this.categoryBasedRecommendations(userHistory, allTokens);

    // Combine all recommendations with weights
    const combined = [
      ...contentBased.map((r) => ({ ...r, weight: 0.35 })),
      ...collaborative.map((r) => ({ ...r, weight: 0.30 })),
      ...trending.map((r) => ({ ...r, weight: 0.20 })),
      ...categoryBased.map((r) => ({ ...r, weight: 0.15 })),
    ];

    // Aggregate scores for same tokens
    const tokenScores = new Map<string, { token: Creator; score: number; reasons: Set<string> }>();

    combined.forEach((rec) => {
      const existing = tokenScores.get(rec.token.id);

      if (existing) {
        existing.score += rec.score * rec.weight;
        rec.reasons.forEach((reason) => existing.reasons.add(reason));
      } else {
        tokenScores.set(rec.token.id, {
          token: rec.token,
          score: rec.score * rec.weight,
          reasons: new Set(rec.reasons),
        });
      }
    });

    // Convert to array and sort by score
    recommendations.push(
      ...Array.from(tokenScores.values())
        .map((item) => ({
          token: item.token,
          score: item.score,
          reasons: Array.from(item.reasons),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    );

    return {
      forUser: userAddress,
      recommendations,
      basedOn: this.generateBasedOn(userHistory),
    };
  }

  /**
   * Content-based filtering
   * Recommends tokens similar to ones the user has interacted with
   */
  private static contentBasedFiltering(
    userHistory: UserInteraction[],
    allTokens: Creator[]
  ): TokenRecommendation[] {
    const recommendations: TokenRecommendation[] = [];

    // Find tokens user has positively interacted with
    const likedTokens = userHistory
      .filter((h) => h.type === 'buy' || h.type === 'like' || h.type === 'follow')
      .map((h) => h.tokenId);

    if (likedTokens.length === 0) {
      return recommendations;
    }

    // Find similar tokens
    allTokens.forEach((token) => {
      if (likedTokens.includes(token.id)) {
        return; // Skip tokens user already knows
      }

      const similarityScore = this.calculateSimilarity(token, allTokens, likedTokens);

      if (similarityScore > 0.5) {
        recommendations.push({
          token,
          score: similarityScore,
          reasons: ['Similar to tokens you like'],
        });
      }
    });

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  /**
   * Calculate similarity between tokens
   */
  private static calculateSimilarity(
    token: Creator,
    allTokens: Creator[],
    likedTokenIds: string[]
  ): number {
    let totalSimilarity = 0;
    const likedTokens = allTokens.filter((t) => likedTokenIds.includes(t.id));

    likedTokens.forEach((likedToken) => {
      let similarity = 0;

      // Category similarity
      if (token.category === likedToken.category) {
        similarity += 0.3;
      }

      // Bonding curve type similarity
      if (token.bondingCurveType === likedToken.bondingCurveType) {
        similarity += 0.2;
      }

      // Price range similarity
      const priceRatio = Math.min(token.price, likedToken.price) / Math.max(token.price, likedToken.price);
      similarity += priceRatio * 0.2;

      // Market cap similarity
      const mcapRatio = Math.min(token.marketCap, likedToken.marketCap) / Math.max(token.marketCap, likedToken.marketCap);
      similarity += mcapRatio * 0.15;

      // Features similarity
      if (token.revenueSharing.enabled === likedToken.revenueSharing.enabled) {
        similarity += 0.1;
      }
      if (token.staking.enabled === likedToken.staking.enabled) {
        similarity += 0.05;
      }

      totalSimilarity += similarity;
    });

    return likedTokens.length > 0 ? totalSimilarity / likedTokens.length : 0;
  }

  /**
   * Collaborative filtering
   * Find what similar users liked
   */
  private static collaborativeFiltering(
    userAddress: string,
    userHistory: UserInteraction[],
    allTokens: Creator[]
  ): TokenRecommendation[] {
    // In production, this would query a database of all user interactions
    // For now, return similar trending tokens
    return this.getTrendingTokens(allTokens).slice(0, 3);
  }

  /**
   * Get trending tokens
   */
  private static getTrendingTokens(allTokens: Creator[]): TokenRecommendation[] {
    return allTokens
      .filter((token) => {
        // High volume, positive price change, many holders
        return token.volume24h > 1000 && token.priceChange24h > 0 && token.holders > 50;
      })
      .sort((a, b) => {
        // Score based on volume, price change, and holders
        const scoreA = a.volume24h * 0.4 + a.priceChange24h * 0.3 + a.holders * 0.3;
        const scoreB = b.volume24h * 0.4 + b.priceChange24h * 0.3 + b.holders * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, 5)
      .map((token) => ({
        token,
        score: 0.8,
        reasons: ['Trending now', 'High trading volume'],
      }));
  }

  /**
   * Category-based recommendations
   */
  private static categoryBasedRecommendations(
    userHistory: UserInteraction[],
    allTokens: Creator[]
  ): TokenRecommendation[] {
    // Find user's preferred categories
    const categoryPreferences = new Map<TokenCategory, number>();

    userHistory.forEach((interaction) => {
      const token = allTokens.find((t) => t.id === interaction.tokenId);
      if (token) {
        const current = categoryPreferences.get(token.category) || 0;
        categoryPreferences.set(token.category, current + 1);
      }
    });

    // Get top category
    const topCategory = Array.from(categoryPreferences.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    if (!topCategory) {
      return [];
    }

    // Recommend top tokens from that category
    return allTokens
      .filter((token) => token.category === topCategory)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 3)
      .map((token) => ({
        token,
        score: 0.7,
        reasons: [`Popular in ${topCategory} category`],
      }));
  }

  /**
   * Generate "based on" summary
   */
  private static generateBasedOn(userHistory: UserInteraction[]): string[] {
    const basedOn: string[] = [];

    const buyCount = userHistory.filter((h) => h.type === 'buy').length;
    if (buyCount > 0) {
      basedOn.push(`${buyCount} tokens you've purchased`);
    }

    const likeCount = userHistory.filter((h) => h.type === 'like').length;
    if (likeCount > 0) {
      basedOn.push(`${likeCount} tokens you've liked`);
    }

    const followCount = userHistory.filter((h) => h.type === 'follow').length;
    if (followCount > 0) {
      basedOn.push(`${followCount} creators you follow`);
    }

    return basedOn;
  }

  /**
   * Search tokens with advanced filters
   */
  static searchTokens(
    query: string,
    allTokens: Creator[],
    filters?: SearchFilters
  ): Creator[] {
    let results = allTokens;

    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        (token) =>
          token.name.toLowerCase().includes(lowerQuery) ||
          token.symbol.toLowerCase().includes(lowerQuery) ||
          token.description.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply filters
    if (filters) {
      if (filters.category) {
        results = results.filter((token) => token.category === filters.category);
      }

      if (filters.minPrice !== undefined) {
        results = results.filter((token) => token.price >= filters.minPrice!);
      }

      if (filters.maxPrice !== undefined) {
        results = results.filter((token) => token.price <= filters.maxPrice!);
      }

      if (filters.minMarketCap !== undefined) {
        results = results.filter((token) => token.marketCap >= filters.minMarketCap!);
      }

      if (filters.maxMarketCap !== undefined) {
        results = results.filter((token) => token.marketCap <= filters.maxMarketCap!);
      }

      if (filters.isLive !== undefined) {
        results = results.filter((token) => token.isLive === filters.isLive);
      }

      if (filters.isVerified !== undefined) {
        results = results.filter((token) => token.isVerified === filters.isVerified);
      }

      if (filters.minTrustScore !== undefined) {
        results = results.filter((token) => token.trustScore >= filters.minTrustScore!);
      }

      if (filters.hasRevenueSharing !== undefined) {
        results = results.filter(
          (token) => token.revenueSharing.enabled === filters.hasRevenueSharing
        );
      }

      if (filters.hasStaking !== undefined) {
        results = results.filter((token) => token.staking.enabled === filters.hasStaking);
      }

      if (filters.hasGovernance !== undefined) {
        results = results.filter(
          (token) => token.governance?.enabled === filters.hasGovernance
        );
      }
    }

    return results;
  }

  /**
   * Get token recommendations based on current viewing
   */
  static getSimilarTokens(token: Creator, allTokens: Creator[], limit: number = 5): Creator[] {
    return allTokens
      .filter((t) => t.id !== token.id)
      .map((t) => ({
        token: t,
        similarity: this.calculateSimilarity(t, allTokens, [token.id]),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((item) => item.token);
  }
}

/**
 * Advanced category and tag system
 */
export class CategoryManager {
  /**
   * Get tokens by category
   */
  static getByCategory(category: TokenCategory, allTokens: Creator[]): Creator[] {
    return allTokens.filter((token) => token.category === category);
  }

  /**
   * Get category statistics
   */
  static getCategoryStats(category: TokenCategory, allTokens: Creator[]) {
    const tokens = this.getByCategory(category, allTokens);

    return {
      category,
      totalTokens: tokens.length,
      totalMarketCap: tokens.reduce((sum, t) => sum + t.marketCap, 0),
      totalVolume24h: tokens.reduce((sum, t) => sum + t.volume24h, 0),
      averagePrice: tokens.reduce((sum, t) => sum + t.price, 0) / tokens.length || 0,
      topTokens: tokens.sort((a, b) => b.marketCap - a.marketCap).slice(0, 5),
    };
  }

  /**
   * Get all category statistics
   */
  static getAllCategoryStats(allTokens: Creator[]) {
    const categories: TokenCategory[] = [
      'gaming',
      'music',
      'art',
      'sports',
      'education',
      'entertainment',
      'technology',
      'other',
    ];

    return categories.map((category) => this.getCategoryStats(category, allTokens));
  }

  /**
   * Auto-categorize token based on description
   */
  static autoCategorize(description: string): TokenCategory {
    const keywords: Record<TokenCategory, string[]> = {
      gaming: ['game', 'gaming', 'esports', 'player', 'tournament', 'streamer'],
      music: ['music', 'song', 'artist', 'album', 'concert', 'band', 'musician'],
      art: ['art', 'artist', 'nft', 'painting', 'design', 'creative'],
      sports: ['sports', 'athlete', 'team', 'league', 'fitness', 'training'],
      education: ['education', 'learning', 'course', 'tutorial', 'teach', 'study'],
      entertainment: ['entertainment', 'show', 'comedy', 'content', 'creator'],
      technology: ['tech', 'technology', 'developer', 'coding', 'software', 'ai'],
      other: [],
    };

    const lowerDesc = description.toLowerCase();

    for (const [category, words] of Object.entries(keywords)) {
      if (words.some((word) => lowerDesc.includes(word))) {
        return category as TokenCategory;
      }
    }

    return 'other';
  }
}

// Types
export interface UserInteraction {
  type: 'buy' | 'sell' | 'like' | 'follow' | 'view' | 'trade';
  tokenId: string;
  timestamp: number;
  value?: number;
}

export interface SearchFilters {
  category?: TokenCategory;
  minPrice?: number;
  maxPrice?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  isLive?: boolean;
  isVerified?: boolean;
  minTrustScore?: number;
  hasRevenueSharing?: boolean;
  hasStaking?: boolean;
  hasGovernance?: boolean;
  bondingCurveType?: string;
  sortBy?: 'price' | 'marketCap' | 'volume' | 'holders' | 'created';
  sortOrder?: 'asc' | 'desc';
}

export default TokenRecommendationEngine;
