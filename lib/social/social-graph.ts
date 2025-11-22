import { UserProfile, Achievement, TokenHolding } from '../types';

/**
 * Social Graph System
 * Manages user profiles, follows, and social interactions
 */

export class SocialGraph {
  private profiles: Map<string, UserProfile> = new Map();
  private followerGraph: Map<string, Set<string>> = new Map(); // address -> Set of followers
  private followingGraph: Map<string, Set<string>> = new Map(); // address -> Set of following

  /**
   * Create or update user profile
   */
  createProfile(
    address: string,
    username?: string,
    avatar?: string,
    bio?: string
  ): UserProfile {
    const existing = this.profiles.get(address);

    const profile: UserProfile = {
      address,
      username: username || existing?.username,
      avatar: avatar || existing?.avatar,
      bio: bio || existing?.bio,
      following: existing?.following || [],
      followers: existing?.followers || [],
      tokensCreated: existing?.tokensCreated || [],
      tokensHeld: existing?.tokensHeld || [],
      achievements: existing?.achievements || [],
      reputation: existing?.reputation || 0,
    };

    this.profiles.set(address, profile);
    return profile;
  }

  /**
   * Follow a user
   */
  follow(follower: string, target: string): { success: boolean; message: string } {
    if (follower === target) {
      return { success: false, message: 'Cannot follow yourself' };
    }

    // Initialize graphs if needed
    if (!this.followerGraph.has(target)) {
      this.followerGraph.set(target, new Set());
    }
    if (!this.followingGraph.has(follower)) {
      this.followingGraph.set(follower, new Set());
    }

    // Check if already following
    if (this.followingGraph.get(follower)!.has(target)) {
      return { success: false, message: 'Already following this user' };
    }

    // Add to graphs
    this.followerGraph.get(target)!.add(follower);
    this.followingGraph.get(follower)!.add(target);

    // Update profiles
    this.updateProfileFollowCounts(follower, target);

    // Check for achievements
    this.checkFollowAchievements(follower);
    this.checkFollowerAchievements(target);

    return { success: true, message: 'Successfully followed user' };
  }

  /**
   * Unfollow a user
   */
  unfollow(follower: string, target: string): { success: boolean; message: string } {
    const following = this.followingGraph.get(follower);
    const followers = this.followerGraph.get(target);

    if (!following || !following.has(target)) {
      return { success: false, message: 'Not following this user' };
    }

    // Remove from graphs
    following.delete(target);
    followers?.delete(follower);

    // Update profiles
    this.updateProfileFollowCounts(follower, target);

    return { success: true, message: 'Successfully unfollowed user' };
  }

  /**
   * Update profile follow counts
   */
  private updateProfileFollowCounts(follower: string, target: string): void {
    const followerProfile = this.profiles.get(follower);
    const targetProfile = this.profiles.get(target);

    if (followerProfile) {
      followerProfile.following = Array.from(this.followingGraph.get(follower) || []);
    }

    if (targetProfile) {
      targetProfile.followers = Array.from(this.followerGraph.get(target) || []);
    }
  }

  /**
   * Get user profile
   */
  getProfile(address: string): UserProfile | null {
    return this.profiles.get(address) || null;
  }

  /**
   * Get followers
   */
  getFollowers(address: string): string[] {
    return Array.from(this.followerGraph.get(address) || []);
  }

  /**
   * Get following
   */
  getFollowing(address: string): string[] {
    return Array.from(this.followingGraph.get(address) || []);
  }

  /**
   * Check if user A follows user B
   */
  isFollowing(follower: string, target: string): boolean {
    return this.followingGraph.get(follower)?.has(target) || false;
  }

  /**
   * Get mutual follows (friends)
   */
  getMutualFollows(address: string): string[] {
    const following = this.followingGraph.get(address) || new Set();
    const followers = this.followerGraph.get(address) || new Set();

    return Array.from(following).filter((user) => followers.has(user));
  }

  /**
   * Get suggested follows (based on mutual connections)
   */
  getSuggestedFollows(address: string, limit: number = 10): string[] {
    const following = this.followingGraph.get(address) || new Set();
    const suggestions = new Map<string, number>(); // user -> score

    // Find users followed by people you follow
    following.forEach((user) => {
      const theirFollowing = this.followingGraph.get(user) || new Set();

      theirFollowing.forEach((suggestion) => {
        // Don't suggest yourself or people you already follow
        if (suggestion !== address && !following.has(suggestion)) {
          const score = suggestions.get(suggestion) || 0;
          suggestions.set(suggestion, score + 1);
        }
      });
    });

    // Sort by score and return top suggestions
    return Array.from(suggestions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([user]) => user);
  }

  /**
   * Add token to user's created tokens
   */
  addCreatedToken(address: string, tokenId: string): void {
    let profile = this.profiles.get(address);

    if (!profile) {
      profile = this.createProfile(address);
    }

    if (!profile.tokensCreated.includes(tokenId)) {
      profile.tokensCreated.push(tokenId);
      this.checkCreatorAchievements(address);
    }
  }

  /**
   * Update user's token holdings
   */
  updateTokenHoldings(address: string, holdings: TokenHolding[]): void {
    let profile = this.profiles.get(address);

    if (!profile) {
      profile = this.createProfile(address);
    }

    profile.tokensHeld = holdings;
    this.checkHolderAchievements(address);
  }

  /**
   * Add reputation points
   */
  addReputation(address: string, points: number): void {
    const profile = this.profiles.get(address);

    if (profile) {
      profile.reputation += points;
      this.checkReputationAchievements(address);
    }
  }

  /**
   * Unlock achievement
   */
  unlockAchievement(address: string, achievement: Achievement): void {
    const profile = this.profiles.get(address);

    if (profile) {
      // Check if already unlocked
      const alreadyHas = profile.achievements.some((a) => a.id === achievement.id);

      if (!alreadyHas) {
        profile.achievements.push(achievement);
        console.log(`🏆 Achievement unlocked: ${achievement.name}`);
      }
    }
  }

  /**
   * Check follow-related achievements
   */
  private checkFollowAchievements(address: string): void {
    const following = this.followingGraph.get(address);

    if (!following) return;

    if (following.size >= 10) {
      this.unlockAchievement(address, {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Follow 10 creators',
        icon: '🦋',
        unlockedAt: new Date().toISOString(),
        rarity: 'common',
      });
    }

    if (following.size >= 100) {
      this.unlockAchievement(address, {
        id: 'super_connector',
        name: 'Super Connector',
        description: 'Follow 100 creators',
        icon: '🌐',
        unlockedAt: new Date().toISOString(),
        rarity: 'rare',
      });
    }
  }

  /**
   * Check follower-related achievements
   */
  private checkFollowerAchievements(address: string): void {
    const followers = this.followerGraph.get(address);

    if (!followers) return;

    if (followers.size >= 100) {
      this.unlockAchievement(address, {
        id: 'influencer',
        name: 'Influencer',
        description: 'Reach 100 followers',
        icon: '⭐',
        unlockedAt: new Date().toISOString(),
        rarity: 'rare',
      });
    }

    if (followers.size >= 1000) {
      this.unlockAchievement(address, {
        id: 'celebrity',
        name: 'Celebrity',
        description: 'Reach 1,000 followers',
        icon: '🌟',
        unlockedAt: new Date().toISOString(),
        rarity: 'epic',
      });
    }

    if (followers.size >= 10000) {
      this.unlockAchievement(address, {
        id: 'legend',
        name: 'Legend',
        description: 'Reach 10,000 followers',
        icon: '👑',
        unlockedAt: new Date().toISOString(),
        rarity: 'legendary',
      });
    }
  }

  /**
   * Check creator achievements
   */
  private checkCreatorAchievements(address: string): void {
    const profile = this.profiles.get(address);

    if (!profile) return;

    if (profile.tokensCreated.length >= 1) {
      this.unlockAchievement(address, {
        id: 'first_token',
        name: 'Token Creator',
        description: 'Create your first token',
        icon: '🪙',
        unlockedAt: new Date().toISOString(),
        rarity: 'common',
      });
    }

    if (profile.tokensCreated.length >= 5) {
      this.unlockAchievement(address, {
        id: 'serial_creator',
        name: 'Serial Creator',
        description: 'Create 5 tokens',
        icon: '🏭',
        unlockedAt: new Date().toISOString(),
        rarity: 'rare',
      });
    }
  }

  /**
   * Check holder achievements
   */
  private checkHolderAchievements(address: string): void {
    const profile = this.profiles.get(address);

    if (!profile) return;

    if (profile.tokensHeld.length >= 10) {
      this.unlockAchievement(address, {
        id: 'collector',
        name: 'Collector',
        description: 'Hold 10 different tokens',
        icon: '🎨',
        unlockedAt: new Date().toISOString(),
        rarity: 'common',
      });
    }

    // Check for profitable trades
    const profitableHoldings = profile.tokensHeld.filter(
      (h) => h.unrealizedPnL + h.realizedPnL > 0
    );

    if (profitableHoldings.length >= 5) {
      this.unlockAchievement(address, {
        id: 'profitable_trader',
        name: 'Profitable Trader',
        description: 'Make profit on 5 tokens',
        icon: '💰',
        unlockedAt: new Date().toISOString(),
        rarity: 'rare',
      });
    }
  }

  /**
   * Check reputation achievements
   */
  private checkReputationAchievements(address: string): void {
    const profile = this.profiles.get(address);

    if (!profile) return;

    if (profile.reputation >= 1000) {
      this.unlockAchievement(address, {
        id: 'respected',
        name: 'Respected Member',
        description: 'Earn 1,000 reputation',
        icon: '🎖️',
        unlockedAt: new Date().toISOString(),
        rarity: 'rare',
      });
    }

    if (profile.reputation >= 10000) {
      this.unlockAchievement(address, {
        id: 'elite',
        name: 'Elite Member',
        description: 'Earn 10,000 reputation',
        icon: '💎',
        unlockedAt: new Date().toISOString(),
        rarity: 'legendary',
      });
    }
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(sortBy: 'reputation' | 'followers' | 'tokens', limit: number = 10): UserProfile[] {
    const profiles = Array.from(this.profiles.values());

    switch (sortBy) {
      case 'reputation':
        return profiles.sort((a, b) => b.reputation - a.reputation).slice(0, limit);

      case 'followers':
        return profiles.sort((a, b) => b.followers.length - a.followers.length).slice(0, limit);

      case 'tokens':
        return profiles
          .sort((a, b) => b.tokensCreated.length - a.tokensCreated.length)
          .slice(0, limit);

      default:
        return profiles.slice(0, limit);
    }
  }
}

export default SocialGraph;
