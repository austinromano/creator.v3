import { NFTCollection, NFTItem, SubscriptionTier } from '../types';
import { Connection, PublicKey } from '@solana/web3.js';

/**
 * NFT Integration System
 * Token holders can claim exclusive NFTs and benefits
 */

export class NFTSystem {
  private collections: Map<string, NFTCollection> = new Map();

  /**
   * Create NFT collection for a token
   */
  createCollection(
    tokenId: string,
    name: string,
    description: string,
    holderBenefits: string[]
  ): NFTCollection {
    const collection: NFTCollection = {
      address: `nft_${tokenId}_${Date.now()}`,
      name,
      description,
      items: [],
      holderBenefits,
    };

    this.collections.set(tokenId, collection);
    return collection;
  }

  /**
   * Add NFT to collection
   */
  addNFT(
    tokenId: string,
    name: string,
    image: string,
    rarity: 'common' | 'rare' | 'epic' | 'legendary',
    attributes: Record<string, string>,
    minimumTokensRequired: number
  ): NFTItem | null {
    const collection = this.collections.get(tokenId);

    if (!collection) {
      return null;
    }

    const nftItem: NFTItem = {
      id: `nft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      image,
      rarity,
      attributes,
      minimumTokensRequired,
    };

    collection.items.push(nftItem);
    return nftItem;
  }

  /**
   * Check if user can claim NFT
   */
  canClaimNFT(nftId: string, tokenId: string, userTokenBalance: number): boolean {
    const collection = this.collections.get(tokenId);

    if (!collection) return false;

    const nft = collection.items.find((item) => item.id === nftId);

    if (!nft) return false;

    // Check if already owned
    if (nft.owner) return false;

    // Check minimum token requirement
    return userTokenBalance >= nft.minimumTokensRequired;
  }

  /**
   * Claim NFT
   */
  claimNFT(
    nftId: string,
    tokenId: string,
    userAddress: string,
    userTokenBalance: number
  ): { success: boolean; message: string; nft?: NFTItem } {
    if (!this.canClaimNFT(nftId, tokenId, userTokenBalance)) {
      return {
        success: false,
        message: 'Cannot claim this NFT - check requirements',
      };
    }

    const collection = this.collections.get(tokenId);
    const nft = collection!.items.find((item) => item.id === nftId)!;

    // Mint NFT to user (in production, interact with Metaplex)
    nft.owner = userAddress;

    return {
      success: true,
      message: 'NFT claimed successfully!',
      nft,
    };
  }

  /**
   * Get collection for token
   */
  getCollection(tokenId: string): NFTCollection | null {
    return this.collections.get(tokenId) || null;
  }

  /**
   * Get available NFTs for user
   */
  getAvailableNFTs(tokenId: string, userTokenBalance: number): NFTItem[] {
    const collection = this.collections.get(tokenId);

    if (!collection) return [];

    return collection.items.filter(
      (nft) => !nft.owner && userTokenBalance >= nft.minimumTokensRequired
    );
  }

  /**
   * Get user's NFTs
   */
  getUserNFTs(tokenId: string, userAddress: string): NFTItem[] {
    const collection = this.collections.get(tokenId);

    if (!collection) return [];

    return collection.items.filter((nft) => nft.owner === userAddress);
  }

  /**
   * Generate tiered NFTs automatically
   */
  generateTieredNFTs(tokenId: string, baseImageUrl: string): NFTItem[] {
    const tiers: Array<{
      rarity: 'common' | 'rare' | 'epic' | 'legendary';
      count: number;
      minTokens: number;
    }> = [
      { rarity: 'common', count: 100, minTokens: 100 },
      { rarity: 'rare', count: 50, minTokens: 500 },
      { rarity: 'epic', count: 20, minTokens: 1000 },
      { rarity: 'legendary', count: 5, minTokens: 5000 },
    ];

    const nfts: NFTItem[] = [];

    tiers.forEach(({ rarity, count, minTokens }) => {
      for (let i = 0; i < count; i++) {
        const nft = this.addNFT(
          tokenId,
          `${rarity.toUpperCase()} #${i + 1}`,
          `${baseImageUrl}/${rarity}/${i}.png`,
          rarity,
          {
            rarity,
            tier: rarity,
            edition: `${i + 1}/${count}`,
          },
          minTokens
        );

        if (nft) {
          nfts.push(nft);
        }
      }
    });

    return nfts;
  }

  /**
   * Burn NFT for benefits (optional mechanism)
   */
  burnNFT(
    nftId: string,
    tokenId: string,
    userAddress: string
  ): { success: boolean; reward?: number } {
    const collection = this.collections.get(tokenId);

    if (!collection) {
      return { success: false };
    }

    const nftIndex = collection.items.findIndex((item) => item.id === nftId);
    const nft = collection.items[nftIndex];

    if (!nft || nft.owner !== userAddress) {
      return { success: false };
    }

    // Calculate burn reward based on rarity
    const rewards = {
      common: 10,
      rare: 50,
      epic: 200,
      legendary: 1000,
    };

    const reward = rewards[nft.rarity];

    // Remove NFT from collection
    collection.items.splice(nftIndex, 1);

    return { success: true, reward };
  }
}

/**
 * Subscription Tier System
 * Token holders can subscribe to exclusive content/benefits
 */

export class SubscriptionSystem {
  private tiers: Map<string, SubscriptionTier[]> = new Map(); // tokenId -> tiers
  private subscriptions: Map<string, Map<string, Subscription>> = new Map(); // tokenId -> (user -> subscription)

  /**
   * Create subscription tier
   */
  createTier(
    tokenId: string,
    name: string,
    description: string,
    priceInTokens: number,
    benefits: string[],
    color: string,
    badge?: string
  ): SubscriptionTier {
    if (!this.tiers.has(tokenId)) {
      this.tiers.set(tokenId, []);
    }

    const tier: SubscriptionTier = {
      id: `tier_${Date.now()}`,
      name,
      description,
      priceInTokens,
      benefits,
      subscribers: 0,
      color,
      badge,
    };

    this.tiers.get(tokenId)!.push(tier);
    return tier;
  }

  /**
   * Subscribe to tier
   */
  subscribe(
    tokenId: string,
    tierId: string,
    userAddress: string,
    userTokenBalance: number,
    duration: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): { success: boolean; message: string; subscription?: Subscription } {
    const tiers = this.tiers.get(tokenId);

    if (!tiers) {
      return { success: false, message: 'No tiers available for this token' };
    }

    const tier = tiers.find((t) => t.id === tierId);

    if (!tier) {
      return { success: false, message: 'Tier not found' };
    }

    // Calculate total cost based on duration
    const durationMultiplier = {
      monthly: 1,
      quarterly: 2.7, // 10% discount
      yearly: 10, // ~17% discount
    };

    const totalCost = tier.priceInTokens * durationMultiplier[duration];

    // Check if user has enough tokens
    if (userTokenBalance < totalCost) {
      return {
        success: false,
        message: `Insufficient tokens. Need ${totalCost}, have ${userTokenBalance}`,
      };
    }

    // Create subscription
    const expiresAt = this.calculateExpiration(duration);

    const subscription: Subscription = {
      tierId,
      subscribedAt: new Date().toISOString(),
      expiresAt,
      autoRenew: false,
      duration,
    };

    // Save subscription
    if (!this.subscriptions.has(tokenId)) {
      this.subscriptions.set(tokenId, new Map());
    }

    this.subscriptions.get(tokenId)!.set(userAddress, subscription);

    // Update subscriber count
    tier.subscribers++;

    return {
      success: true,
      message: 'Successfully subscribed!',
      subscription,
    };
  }

  /**
   * Calculate subscription expiration
   */
  private calculateExpiration(duration: 'monthly' | 'quarterly' | 'yearly'): string {
    const now = new Date();

    switch (duration) {
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
      case 'quarterly':
        now.setMonth(now.getMonth() + 3);
        break;
      case 'yearly':
        now.setFullYear(now.getFullYear() + 1);
        break;
    }

    return now.toISOString();
  }

  /**
   * Check if user has active subscription
   */
  hasActiveSubscription(tokenId: string, userAddress: string): boolean {
    const subscription = this.subscriptions.get(tokenId)?.get(userAddress);

    if (!subscription) return false;

    return new Date(subscription.expiresAt) > new Date();
  }

  /**
   * Get user's subscription
   */
  getSubscription(tokenId: string, userAddress: string): Subscription | null {
    return this.subscriptions.get(tokenId)?.get(userAddress) || null;
  }

  /**
   * Get tier details
   */
  getTier(tokenId: string, tierId: string): SubscriptionTier | null {
    const tiers = this.tiers.get(tokenId);
    return tiers?.find((t) => t.id === tierId) || null;
  }

  /**
   * Get all tiers for token
   */
  getAllTiers(tokenId: string): SubscriptionTier[] {
    return this.tiers.get(tokenId) || [];
  }

  /**
   * Cancel subscription
   */
  cancelSubscription(tokenId: string, userAddress: string): boolean {
    const subscription = this.subscriptions.get(tokenId)?.get(userAddress);

    if (!subscription) return false;

    subscription.autoRenew = false;
    return true;
  }

  /**
   * Renew subscription
   */
  renewSubscription(
    tokenId: string,
    userAddress: string,
    userTokenBalance: number
  ): { success: boolean; message: string } {
    const subscription = this.subscriptions.get(tokenId)?.get(userAddress);

    if (!subscription) {
      return { success: false, message: 'No subscription found' };
    }

    const tier = this.getTier(tokenId, subscription.tierId);

    if (!tier) {
      return { success: false, message: 'Tier not found' };
    }

    const durationMultiplier = {
      monthly: 1,
      quarterly: 2.7,
      yearly: 10,
    };

    const cost = tier.priceInTokens * durationMultiplier[subscription.duration];

    if (userTokenBalance < cost) {
      return { success: false, message: 'Insufficient tokens for renewal' };
    }

    // Extend expiration
    subscription.expiresAt = this.calculateExpiration(subscription.duration);

    return { success: true, message: 'Subscription renewed!' };
  }

  /**
   * Create default tiers for a token
   */
  createDefaultTiers(tokenId: string): SubscriptionTier[] {
    const defaultTiers: Array<Omit<SubscriptionTier, 'id' | 'subscribers'>> = [
      {
        name: 'Bronze',
        description: 'Basic access to exclusive content',
        priceInTokens: 100,
        benefits: ['Access to subscriber-only streams', 'Exclusive badge', 'Priority chat'],
        color: '#CD7F32',
        badge: '🥉',
      },
      {
        name: 'Silver',
        description: 'Enhanced benefits and perks',
        priceInTokens: 500,
        benefits: [
          'All Bronze benefits',
          'VOD access',
          'Monthly NFT drops',
          'Custom emotes',
        ],
        color: '#C0C0C0',
        badge: '🥈',
      },
      {
        name: 'Gold',
        description: 'Premium experience with maximum benefits',
        priceInTokens: 1000,
        benefits: [
          'All Silver benefits',
          'Direct messaging with creator',
          'Exclusive Discord role',
          'Early access to new features',
          'Governance voting power boost',
        ],
        color: '#FFD700',
        badge: '🥇',
      },
    ];

    return defaultTiers.map((tier) =>
      this.createTier(
        tokenId,
        tier.name,
        tier.description,
        tier.priceInTokens,
        tier.benefits,
        tier.color,
        tier.badge
      )
    );
  }
}

// Types
interface Subscription {
  tierId: string;
  subscribedAt: string;
  expiresAt: string;
  autoRenew: boolean;
  duration: 'monthly' | 'quarterly' | 'yearly';
}

export default NFTSystem;
