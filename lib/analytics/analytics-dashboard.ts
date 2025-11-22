import { Creator, TokenAnalytics, DataPoint } from '../types';

/**
 * Advanced Analytics Dashboard
 * Comprehensive insights for creators to track performance
 */

export class AnalyticsDashboard {
  private analytics: Map<string, TokenAnalytics> = new Map();
  private events: Map<string, AnalyticsEvent[]> = new Map(); // tokenId -> events

  /**
   * Initialize analytics for a token
   */
  initializeAnalytics(tokenId: string): TokenAnalytics {
    const analytics: TokenAnalytics = {
      totalViews: 0,
      uniqueVisitors: 0,
      avgHoldingTime: 0,
      topReferrers: [],
      geographicDistribution: {},
      holderGrowth: [],
      volumeGrowth: [],
      engagement: {
        likes: 0,
        shares: 0,
        comments: 0,
      },
    };

    this.analytics.set(tokenId, analytics);
    this.events.set(tokenId, []);

    return analytics;
  }

  /**
   * Track page view
   */
  trackView(tokenId: string, visitor: string, referrer?: string, location?: string): void {
    let analytics = this.analytics.get(tokenId);

    if (!analytics) {
      analytics = this.initializeAnalytics(tokenId);
    }

    // Increment total views
    analytics.totalViews++;

    // Track unique visitors (in production, use session tracking)
    analytics.uniqueVisitors = Math.max(analytics.uniqueVisitors, analytics.totalViews);

    // Track referrer
    if (referrer && !analytics.topReferrers.includes(referrer)) {
      analytics.topReferrers.push(referrer);
    }

    // Track geographic distribution
    if (location) {
      analytics.geographicDistribution[location] = (analytics.geographicDistribution[location] || 0) + 1;
    }

    // Log event
    this.logEvent(tokenId, {
      type: 'view',
      timestamp: Date.now(),
      data: { visitor, referrer, location },
    });
  }

  /**
   * Track holder growth
   */
  trackHolderGrowth(tokenId: string, holderCount: number): void {
    const analytics = this.analytics.get(tokenId);

    if (!analytics) return;

    analytics.holderGrowth.push({
      timestamp: Date.now(),
      value: holderCount,
    });

    // Keep only last 100 data points
    if (analytics.holderGrowth.length > 100) {
      analytics.holderGrowth.shift();
    }
  }

  /**
   * Track volume growth
   */
  trackVolumeGrowth(tokenId: string, volume: number): void {
    const analytics = this.analytics.get(tokenId);

    if (!analytics) return;

    analytics.volumeGrowth.push({
      timestamp: Date.now(),
      value: volume,
    });

    // Keep only last 100 data points
    if (analytics.volumeGrowth.length > 100) {
      analytics.volumeGrowth.shift();
    }
  }

  /**
   * Track engagement (likes, shares, comments)
   */
  trackEngagement(
    tokenId: string,
    type: 'like' | 'share' | 'comment',
    user: string
  ): void {
    const analytics = this.analytics.get(tokenId);

    if (!analytics) return;

    if (type === 'like') analytics.engagement.likes++;
    if (type === 'share') analytics.engagement.shares++;
    if (type === 'comment') analytics.engagement.comments++;

    this.logEvent(tokenId, {
      type: `engagement_${type}`,
      timestamp: Date.now(),
      data: { user, type },
    });
  }

  /**
   * Calculate average holding time
   */
  calculateAvgHoldingTime(tokenId: string, holdings: Array<{ boughtAt: number; soldAt?: number }>): void {
    const analytics = this.analytics.get(tokenId);

    if (!analytics) return;

    const completedHoldings = holdings.filter((h) => h.soldAt);

    if (completedHoldings.length === 0) {
      analytics.avgHoldingTime = 0;
      return;
    }

    const totalTime = completedHoldings.reduce((sum, h) => {
      return sum + (h.soldAt! - h.boughtAt);
    }, 0);

    // Convert to hours
    analytics.avgHoldingTime = totalTime / completedHoldings.length / (1000 * 60 * 60);
  }

  /**
   * Get analytics summary
   */
  getSummary(tokenId: string): AnalyticsSummary | null {
    const analytics = this.analytics.get(tokenId);

    if (!analytics) return null;

    return {
      overview: {
        totalViews: analytics.totalViews,
        uniqueVisitors: analytics.uniqueVisitors,
        avgHoldingTime: analytics.avgHoldingTime,
        engagementRate: this.calculateEngagementRate(tokenId),
      },
      growth: {
        holderGrowth: this.calculateGrowthRate(analytics.holderGrowth),
        volumeGrowth: this.calculateGrowthRate(analytics.volumeGrowth),
      },
      engagement: {
        ...analytics.engagement,
        total: analytics.engagement.likes + analytics.engagement.shares + analytics.engagement.comments,
      },
      geographic: {
        topCountries: this.getTopCountries(analytics.geographicDistribution, 5),
        distribution: analytics.geographicDistribution,
      },
      referrers: {
        top: analytics.topReferrers.slice(0, 5),
        all: analytics.topReferrers,
      },
    };
  }

  /**
   * Calculate engagement rate
   */
  private calculateEngagementRate(tokenId: string): number {
    const analytics = this.analytics.get(tokenId);

    if (!analytics || analytics.uniqueVisitors === 0) return 0;

    const totalEngagement = analytics.engagement.likes + analytics.engagement.shares + analytics.engagement.comments;

    return (totalEngagement / analytics.uniqueVisitors) * 100;
  }

  /**
   * Calculate growth rate
   */
  private calculateGrowthRate(dataPoints: DataPoint[]): number {
    if (dataPoints.length < 2) return 0;

    const oldest = dataPoints[0].value;
    const newest = dataPoints[dataPoints.length - 1].value;

    if (oldest === 0) return 0;

    return ((newest - oldest) / oldest) * 100;
  }

  /**
   * Get top countries
   */
  private getTopCountries(distribution: Record<string, number>, limit: number): Array<{ country: string; visitors: number }> {
    return Object.entries(distribution)
      .map(([country, visitors]) => ({ country, visitors }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, limit);
  }

  /**
   * Log analytics event
   */
  private logEvent(tokenId: string, event: AnalyticsEvent): void {
    let events = this.events.get(tokenId);

    if (!events) {
      events = [];
      this.events.set(tokenId, events);
    }

    events.push(event);

    // Keep only last 1000 events
    if (events.length > 1000) {
      events.shift();
    }
  }

  /**
   * Get events in time range
   */
  getEvents(tokenId: string, startTime: number, endTime: number): AnalyticsEvent[] {
    const events = this.events.get(tokenId);

    if (!events) return [];

    return events.filter((e) => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  /**
   * Generate performance report
   */
  generateReport(tokenId: string, token: Creator): PerformanceReport {
    const summary = this.getSummary(tokenId);
    const events = this.events.get(tokenId) || [];

    return {
      tokenId,
      tokenName: token.name,
      generatedAt: new Date().toISOString(),
      period: {
        start: new Date(token.created).toISOString(),
        end: new Date().toISOString(),
      },
      metrics: {
        marketPerformance: {
          currentPrice: token.price,
          priceChange24h: token.priceChange24h,
          marketCap: token.marketCap,
          volume24h: token.volume24h,
          holders: token.holders,
          transactions: token.transactions,
        },
        audience: {
          totalViews: summary?.overview.totalViews || 0,
          uniqueVisitors: summary?.overview.uniqueVisitors || 0,
          avgHoldingTime: summary?.overview.avgHoldingTime || 0,
          engagementRate: summary?.overview.engagementRate || 0,
        },
        growth: {
          holderGrowthRate: summary?.growth.holderGrowth || 0,
          volumeGrowthRate: summary?.growth.volumeGrowth || 0,
        },
        streaming: {
          totalStreams: this.countEvents(events, 'stream_start'),
          totalStreamTime: this.calculateTotalStreamTime(events),
          avgViewers: token.viewers || 0,
          peakViewers: this.getPeakViewers(events),
        },
      },
      insights: this.generateInsights(token, summary),
      recommendations: this.generateRecommendations(token, summary),
    };
  }

  /**
   * Count specific event types
   */
  private countEvents(events: AnalyticsEvent[], type: string): number {
    return events.filter((e) => e.type === type).length;
  }

  /**
   * Calculate total stream time
   */
  private calculateTotalStreamTime(events: AnalyticsEvent[]): number {
    let totalTime = 0;
    let streamStart: number | null = null;

    events.forEach((event) => {
      if (event.type === 'stream_start') {
        streamStart = event.timestamp;
      } else if (event.type === 'stream_end' && streamStart) {
        totalTime += event.timestamp - streamStart;
        streamStart = null;
      }
    });

    // Convert to hours
    return totalTime / (1000 * 60 * 60);
  }

  /**
   * Get peak concurrent viewers
   */
  private getPeakViewers(events: AnalyticsEvent[]): number {
    let peak = 0;

    events.forEach((event) => {
      if (event.type === 'viewer_count' && event.data?.count > peak) {
        peak = event.data.count;
      }
    });

    return peak;
  }

  /**
   * Generate insights based on analytics
   */
  private generateInsights(token: Creator, summary: AnalyticsSummary | null): string[] {
    const insights: string[] = [];

    if (!summary) return insights;

    // Price performance insight
    if (token.priceChange24h > 50) {
      insights.push(`🚀 Strong price momentum: +${token.priceChange24h.toFixed(1)}% in 24h`);
    } else if (token.priceChange24h < -20) {
      insights.push(`⚠️ Price declining: ${token.priceChange24h.toFixed(1)}% in 24h`);
    }

    // Holder growth insight
    if (summary.growth.holderGrowthRate > 10) {
      insights.push(`📈 Rapidly growing community: ${summary.growth.holderGrowthRate.toFixed(1)}% holder increase`);
    }

    // Engagement insight
    if (summary.overview.engagementRate > 20) {
      insights.push(`💬 Highly engaged audience: ${summary.overview.engagementRate.toFixed(1)}% engagement rate`);
    } else if (summary.overview.engagementRate < 5) {
      insights.push(`📊 Low engagement: Consider more interactive content`);
    }

    // Geographic diversity
    const countryCount = Object.keys(summary.geographic.distribution).length;
    if (countryCount > 10) {
      insights.push(`🌍 Global reach: Audience from ${countryCount} countries`);
    }

    // Holding time insight
    if (summary.overview.avgHoldingTime > 168) {
      // > 1 week
      insights.push(`💎 Strong holders: Average holding time ${Math.floor(summary.overview.avgHoldingTime / 24)} days`);
    } else if (summary.overview.avgHoldingTime < 24) {
      insights.push(`⚡ High turnover: Short average holding time`);
    }

    return insights;
  }

  /**
   * Generate recommendations for improvement
   */
  private generateRecommendations(token: Creator, summary: AnalyticsSummary | null): string[] {
    const recommendations: string[] = [];

    if (!summary) return recommendations;

    // Streaming recommendations
    if (!token.isLive) {
      recommendations.push('📹 Start streaming to increase engagement and visibility');
    }

    // Social media recommendations
    if (!token.twitter && !token.telegram) {
      recommendations.push('🐦 Add social media links to build community');
    }

    // Engagement recommendations
    if (summary.overview.engagementRate < 10) {
      recommendations.push('💡 Create polls and interactive content to boost engagement');
    }

    // Revenue sharing recommendation
    if (!token.revenueSharing.enabled) {
      recommendations.push('💰 Enable revenue sharing to incentivize long-term holding');
    }

    // Staking recommendation
    if (!token.staking.enabled) {
      recommendations.push('🔒 Add staking to reward loyal holders');
    }

    // Governance recommendation
    if (!token.governance?.enabled && token.holders > 100) {
      recommendations.push('🗳️ Enable governance to give community a voice');
    }

    // Liquidity recommendation
    const liquidityRatio = token.liquidity / token.marketCap;
    if (liquidityRatio < 0.2) {
      recommendations.push('💧 Increase liquidity to reduce slippage');
    }

    // Verification recommendation
    if (!token.isVerified && token.holders > 50) {
      recommendations.push('✅ Get verified to build trust and credibility');
    }

    return recommendations;
  }

  /**
   * Export analytics data
   */
  exportData(tokenId: string): ExportData | null {
    const analytics = this.analytics.get(tokenId);
    const events = this.events.get(tokenId);

    if (!analytics) return null;

    return {
      analytics,
      events: events || [],
      exportedAt: new Date().toISOString(),
    };
  }
}

// Types
interface AnalyticsEvent {
  type: string;
  timestamp: number;
  data?: any;
}

interface AnalyticsSummary {
  overview: {
    totalViews: number;
    uniqueVisitors: number;
    avgHoldingTime: number;
    engagementRate: number;
  };
  growth: {
    holderGrowth: number;
    volumeGrowth: number;
  };
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    total: number;
  };
  geographic: {
    topCountries: Array<{ country: string; visitors: number }>;
    distribution: Record<string, number>;
  };
  referrers: {
    top: string[];
    all: string[];
  };
}

interface PerformanceReport {
  tokenId: string;
  tokenName: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  metrics: {
    marketPerformance: {
      currentPrice: number;
      priceChange24h: number;
      marketCap: number;
      volume24h: number;
      holders: number;
      transactions: number;
    };
    audience: {
      totalViews: number;
      uniqueVisitors: number;
      avgHoldingTime: number;
      engagementRate: number;
    };
    growth: {
      holderGrowthRate: number;
      volumeGrowthRate: number;
    };
    streaming: {
      totalStreams: number;
      totalStreamTime: number;
      avgViewers: number;
      peakViewers: number;
    };
  };
  insights: string[];
  recommendations: string[];
}

interface ExportData {
  analytics: TokenAnalytics;
  events: AnalyticsEvent[];
  exportedAt: string;
}

export default AnalyticsDashboard;
