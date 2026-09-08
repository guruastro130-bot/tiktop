import { Video, User, HashtagInfo, UserInterests } from '../src/types';
import { db } from './db';

export interface WatchHistoryEntry {
  videoId: string;
  watchedAt: number;
  watchDuration: number;
  completionRate: number;
}

export interface UserInterestsProfile {
  userId: string;
  hashtagWeights: Record<string, number>;
  creatorAffinities: Record<string, number>;
  watchHistory: WatchHistoryEntry[];
  likedVideoIds: Set<string>;
  interactedHashtags: Record<string, number>;
  lastActive: number;
}

// Modular interface for future Machine Learning / AI Model extensions
export type AIModelPredictor = (
  userId: string,
  candidateVideos: Video[],
  interests: UserInterestsProfile
) => Promise<Map<string, number>> | Map<string, number>;

export class RecommendationEngine {
  private userProfiles = new Map<string, UserInterestsProfile>();
  private aiPredictor: AIModelPredictor | null = null;

  // In-memory feed cache with short TTL (15s) for performance optimization
  private feedCache = new Map<string, { timestamp: number; videos: Video[] }>();
  private CACHE_TTL_MS = 15000;

  constructor() {
    this.seedDefaultInterests();
  }

  private seedDefaultInterests() {
    // Pre-seed default test user interests for Sarah & Marco
    this.userProfiles.set('user_admin', {
      userId: 'user_admin',
      hashtagWeights: { dance: 12, tech: 10, cooking: 8, fitness: 6, viral: 5, fyp: 5 },
      creatorAffinities: { user_sarah: 15, user_tech: 12, user_marco: 8 },
      watchHistory: [],
      likedVideoIds: new Set(['vid_1', 'vid_3']),
      interactedHashtags: { dance: 4, tech: 3 },
      lastActive: Date.now(),
    });
  }

  public getUserInterestsProfile(userId: string): UserInterestsProfile {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        userId,
        hashtagWeights: {},
        creatorAffinities: {},
        watchHistory: [],
        likedVideoIds: new Set<string>(),
        interactedHashtags: {},
        lastActive: Date.now(),
      });
    }
    return this.userProfiles.get(userId)!;
  }

  public getUserInterestsSummary(userId: string): UserInterests {
    const profile = this.getUserInterestsProfile(userId);
    const sortedTags = Object.entries(profile.hashtagWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    return {
      userId,
      hashtagWeights: profile.hashtagWeights,
      creatorAffinities: profile.creatorAffinities,
      totalWatchedCount: profile.watchHistory.length,
      totalLikesCount: profile.likedVideoIds.size,
      topHashtags: sortedTags,
      lastActive: new Date(profile.lastActive).toISOString(),
    };
  }

  /**
   * Track valid video watch activity to learn user interests
   * Only counts if duration is genuine (>= threshold or high completion rate)
   */
  public trackVideoWatch(
    userId: string,
    videoId: string,
    watchDuration: number,
    completionRate: number,
    isValidView: boolean
  ) {
    if (!userId || !videoId) return;

    const profile = this.getUserInterestsProfile(userId);
    profile.lastActive = Date.now();

    // 1. Record in watch history (keep last 100 entries for deduplication and fatigue avoidance)
    profile.watchHistory.unshift({
      videoId,
      watchedAt: Date.now(),
      watchDuration: Math.max(0, watchDuration),
      completionRate: Math.max(0, Math.min(2.0, completionRate)),
    });

    if (profile.watchHistory.length > 100) {
      profile.watchHistory.pop();
    }

    // 2. If valid view or high completion, learn interest signals
    if (isValidView || completionRate >= 0.5) {
      const video = db.getVideoById(videoId);
      if (video) {
        // Boost hashtag weights
        const boost = completionRate >= 0.9 ? 3.5 : isValidView ? 2.0 : 1.0;
        video.hashtags.forEach(tag => {
          const clean = tag.toLowerCase().replace('#', '').trim();
          if (clean) {
            profile.hashtagWeights[clean] = Number(((profile.hashtagWeights[clean] || 0) + boost).toFixed(2));
          }
        });

        // Boost creator affinity
        profile.creatorAffinities[video.userId] = Number(
          ((profile.creatorAffinities[video.userId] || 0) + (boost * 0.75)).toFixed(2)
        );
      }
    }

    // Invalidate cache for this user
    this.feedCache.delete(`rec_${userId}`);
  }

  /**
   * Track likes/unlikes to heavily weight explicit user preferences
   */
  public trackVideoLike(userId: string, videoId: string, isLiked: boolean) {
    if (!userId || !videoId) return;

    const profile = this.getUserInterestsProfile(userId);
    profile.lastActive = Date.now();

    const video = db.getVideoById(videoId);
    if (!video) return;

    const weightDelta = isLiked ? 4.5 : -2.5;

    if (isLiked) {
      profile.likedVideoIds.add(videoId);
    } else {
      profile.likedVideoIds.delete(videoId);
    }

    // Update hashtag affinity
    video.hashtags.forEach(tag => {
      const clean = tag.toLowerCase().replace('#', '').trim();
      if (clean) {
        profile.hashtagWeights[clean] = Math.max(
          0,
          Number(((profile.hashtagWeights[clean] || 0) + weightDelta).toFixed(2))
        );
      }
    });

    // Update creator affinity
    profile.creatorAffinities[video.userId] = Math.max(
      0,
      Number(((profile.creatorAffinities[video.userId] || 0) + (weightDelta * 0.8)).toFixed(2))
    );

    this.feedCache.delete(`rec_${userId}`);
  }

  /**
   * Track hashtag clicks and searches
   */
  public trackHashtagInteraction(userId: string, hashtag: string) {
    if (!userId || !hashtag) return;
    const clean = hashtag.toLowerCase().replace('#', '').trim();
    if (!clean) return;

    const profile = this.getUserInterestsProfile(userId);
    profile.lastActive = Date.now();
    profile.hashtagWeights[clean] = Number(((profile.hashtagWeights[clean] || 0) + 2.5).toFixed(2));
    profile.interactedHashtags[clean] = (profile.interactedHashtags[clean] || 0) + 1;

    this.feedCache.delete(`rec_${userId}`);
  }

  /**
   * Track creator follow
   */
  public trackCreatorFollow(userId: string, creatorId: string, isFollowing: boolean) {
    if (!userId || !creatorId) return;

    const profile = this.getUserInterestsProfile(userId);
    profile.lastActive = Date.now();

    const delta = isFollowing ? 8.0 : -4.0;
    profile.creatorAffinities[creatorId] = Math.max(
      0,
      Number(((profile.creatorAffinities[creatorId] || 0) + delta).toFixed(2))
    );

    this.feedCache.delete(`rec_${userId}`);
  }

  /**
   * Helper: Check if video is strictly eligible for recommendation (Privacy & Moderation Guardrails)
   */
  private isVideoEligible(video: Video, currentUserId?: string): boolean {
    // 1. Status check: never recommend removed or under-review videos
    if (video.status !== 'active') return false;

    // 2. Draft check: never recommend drafts
    if (video.isDraft || (video as any).status === 'draft') return false;

    // 3. Privacy check: never recommend private videos
    if (video.isPrivate || video.visibility === 'private') {
      // Only author can view private videos
      if (!currentUserId || currentUserId !== video.userId) return false;
    }

    // 4. Followers-only check
    if (video.visibility === 'followers') {
      if (!currentUserId) return false;
      if (currentUserId !== video.userId) {
        const rel = db.getUserRelationship(currentUserId, video.userId);
        if (!rel.isFollowing) return false;
      }
    }

    // 5. Creator check
    const creator = db.getUserById(video.userId);
    if (!creator || creator.isBanned) return false;

    // 6. Block and Mute rules: never recommend content from blocked or muted users
    if (currentUserId) {
      if (db.isBlocked(currentUserId, video.userId)) return false;
      if (db.isMutedBy(currentUserId, video.userId)) return false;
    }

    return true;
  }

  /**
   * Calculate Personalized "For You" Recommended Feed
   * Combines:
   * - Engagement signals (views, likes, comments, shares)
   * - Recency decay & Freshness exploration
   * - User interest alignment (hashtag weights, creator affinity)
   * - Deduplication & view fatigue avoidance
   * - Creator diversity interleaving
   */
  public getRecommendedFeed(currentUserId?: string, limit = 30): Video[] {
    const cacheKey = `rec_${currentUserId || 'guest'}`;
    const cached = this.feedCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.videos;
    }

    const allVideos = db.getVideos();
    const eligibleVideos = allVideos.filter(v => this.isVideoEligible(v, currentUserId));

    if (eligibleVideos.length === 0) return [];

    const now = Date.now();
    const userProfile = currentUserId ? this.getUserInterestsProfile(currentUserId) : null;

    // Set of recently watched video IDs with timestamp lookup
    const recentWatchedMap = new Map<string, number>();
    if (userProfile) {
      userProfile.watchHistory.forEach(w => {
        if (!recentWatchedMap.has(w.videoId)) {
          recentWatchedMap.set(w.videoId, w.watchedAt);
        }
      });
    }

    // Candidate scoring
    const scoredCandidates = eligibleVideos.map(video => {
      let score = 0;
      let primaryReason = '✨ Recommended for you';

      // 1. BASE ENGAGEMENT SCORE (Views, Likes, Comments, Shares)
      const views = Math.max(0, video.viewsCount);
      const likes = Math.max(0, video.likesCount);
      const comments = Math.max(0, video.commentsCount);
      const shares = Math.max(0, video.sharesCount);

      const engagementBase =
        Math.log10(views + 1) * 2.0 +
        likes * 3.5 +
        comments * 5.0 +
        shares * 7.5;

      // Calculate engagement rate boost
      const engagementRatio = views > 0 ? (likes + comments * 2 + shares * 3) / views : 0.1;
      const qualityBoost = Math.min(2.0, 1.0 + engagementRatio * 2.5);

      // 2. RECENCY DECAY & FRESHNESS EXPLORATION
      const createdAtMs = new Date(video.createdAt).getTime();
      const ageHours = Math.max(0, (now - createdAtMs) / 3600000);
      const recencyWeight = 1 / (1 + ageHours * 0.025); // Smooth decay

      // Freshness exploration boost: new uploads in past 12 hours get tested in the algorithm
      let freshnessBoost = 0;
      if (ageHours < 12) {
        freshnessBoost = 15.0 * (1 - ageHours / 12);
        if (freshnessBoost > 8.0) {
          primaryReason = '✨ Fresh upload';
        }
      }

      // 3. PERSONALIZED USER INTEREST ALIGNMENT
      let personalizationScore = 0;
      let matchedTag: string | null = null;
      let maxTagWeight = 0;

      if (userProfile) {
        // A. Hashtag Match
        video.hashtags.forEach(tag => {
          const clean = tag.toLowerCase().replace('#', '').trim();
          const weight = userProfile.hashtagWeights[clean] || 0;
          if (weight > maxTagWeight) {
            maxTagWeight = weight;
            matchedTag = clean;
          }
          personalizationScore += weight * 2.2;
        });

        // B. Creator Affinity Match
        const creatorAffinity = userProfile.creatorAffinities[video.userId] || 0;
        personalizationScore += creatorAffinity * 2.8;

        // C. Followed Creator Bonus
        const isFollowed = db.getUserRelationship(currentUserId, video.userId).isFollowing;
        if (isFollowed) {
          personalizationScore += 20.0;
          primaryReason = `👤 From @${video.user.username}`;
        } else if (matchedTag && maxTagWeight >= 4.0) {
          primaryReason = `⚡ Because you enjoy #${matchedTag}`;
        } else if (creatorAffinity >= 5.0) {
          primaryReason = `⭐ From a favorite creator`;
        }
      }

      // High viral trending indicator if not personalized
      if (primaryReason === '✨ Recommended for you' && (likes > 50 || views > 500)) {
        primaryReason = '🔥 Highly engaging';
      }

      // 4. DEDUPLICATION & FATIGUE PENALTY
      let fatiguePenalty = 1.0;
      if (recentWatchedMap.has(video.id)) {
        const lastWatched = recentWatchedMap.get(video.id)!;
        const hoursSinceWatch = (now - lastWatched) / 3600000;

        if (hoursSinceWatch < 2) {
          fatiguePenalty = 0.05; // Recently watched: heavy downrank
        } else if (hoursSinceWatch < 24) {
          fatiguePenalty = 0.25; // Watched today: moderate downrank
        } else {
          fatiguePenalty = 0.70; // Watched earlier: slight downrank
        }
      }

      // Liked videos retain high value for re-watching but slightly deprioritized after fresh unviewed
      if (userProfile?.likedVideoIds.has(video.id) && recentWatchedMap.has(video.id)) {
        fatiguePenalty = Math.max(fatiguePenalty, 0.4);
      }

      // COMBINE WEIGHTED TOTAL SCORE
      score = ((engagementBase * qualityBoost * recencyWeight) + freshnessBoost + (personalizationScore * 1.5)) * fatiguePenalty;

      return {
        video: {
          ...video,
          recommendationReason: primaryReason,
          recommendationScore: Number(score.toFixed(1)),
        },
        score,
        creatorId: video.userId,
      };
    });

    // Sort candidates by total score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    // 5. CREATOR DIVERSITY INTERLEAVING PASS
    // Avoid clustering multiple consecutive videos from the same creator in a 3-video sequence
    const diversified: Video[] = [];
    const pool = [...scoredCandidates];
    const recentCreators: string[] = [];

    while (pool.length > 0 && diversified.length < limit) {
      // Find the highest-scoring candidate whose creator is not in the last 2 slots
      let pickedIdx = pool.findIndex(item => !recentCreators.includes(item.creatorId));

      if (pickedIdx === -1) {
        // If all candidates in pool belong to recently used creators, take the top candidate
        pickedIdx = 0;
      }

      const picked = pool.splice(pickedIdx, 1)[0];
      diversified.push(picked.video);

      // Track recent creator window of size 2
      recentCreators.push(picked.creatorId);
      if (recentCreators.length > 2) {
        recentCreators.shift();
      }
    }

    // Attach dynamic user relationship flags (liked, following)
    const result = diversified.map(v => db.attachVideoFlags(v, currentUserId));

    // Save to cache
    this.feedCache.set(cacheKey, { timestamp: now, videos: result });

    return result;
  }

  /**
   * Calculate Trending Feed
   * Ranks videos by current engagement velocity (views, likes, comments, shares per unit time)
   */
  public getTrendingFeed(currentUserId?: string, limit = 30): Video[] {
    const allVideos = db.getVideos();
    const eligibleVideos = allVideos.filter(v => this.isVideoEligible(v, currentUserId));

    const now = Date.now();

    const scored = eligibleVideos.map(video => {
      const createdAtMs = new Date(video.createdAt).getTime();
      const ageHours = Math.max(0.1, (now - createdAtMs) / 3600000);

      // Trending Velocity Score Formula (High weight on shares & comments)
      const engagementVelocity =
        (video.viewsCount * 1.0) +
        (video.likesCount * 4.0) +
        (video.commentsCount * 6.5) +
        (video.sharesCount * 9.0);

      // Time decay emphasizing recent momentum:
      const velocityTimeMultiplier = 1 / (1 + Math.pow(ageHours, 1.15) * 0.035);
      const trendingScore = engagementVelocity * velocityTimeMultiplier;

      return {
        video,
        trendingScore,
      };
    });

    scored.sort((a, b) => b.trendingScore - a.trendingScore);

    const trendingVideos = scored.slice(0, limit).map((item, idx) => {
      const v = db.attachVideoFlags(item.video, currentUserId);
      return {
        ...v,
        recommendationReason: `🔥 #${idx + 1} Trending Today`,
        recommendationScore: Number(item.trendingScore.toFixed(1)),
      };
    });

    return trendingVideos;
  }

  /**
   * Calculate Trending Hashtags
   * Aggregates activity, volume, and velocity across hashtags
   */
  public getTrendingHashtags(currentUserId?: string): HashtagInfo[] {
    const allVideos = db.getVideos();
    const eligibleVideos = allVideos.filter(v => this.isVideoEligible(v, currentUserId));

    const now = Date.now();
    const tagMap = new Map<string, { count: number; views: number; likes: number; velocityScore: number }>();

    eligibleVideos.forEach(v => {
      const ageHours = Math.max(0.5, (now - new Date(v.createdAt).getTime()) / 3600000);
      const recency = 1 / (1 + ageHours * 0.04);

      v.hashtags.forEach(tag => {
        const clean = tag.toLowerCase().replace('#', '').trim();
        if (!clean) return;

        const current = tagMap.get(clean) || { count: 0, views: 0, likes: 0, velocityScore: 0 };
        const itemScore = (v.viewsCount * 1.2 + v.likesCount * 3.5 + v.sharesCount * 5.0) * recency;

        tagMap.set(clean, {
          count: current.count + 1,
          views: current.views + v.viewsCount,
          likes: current.likes + v.likesCount,
          velocityScore: current.velocityScore + itemScore,
        });
      });
    });

    const hashtags: HashtagInfo[] = Array.from(tagMap.entries())
      .map(([tag, data]) => ({
        tag,
        videoCount: data.count,
        viewsCount: data.views,
        isTrending: true,
      }))
      .sort((a, b) => {
        const scoreA = tagMap.get(a.tag)?.velocityScore || 0;
        const scoreB = tagMap.get(b.tag)?.velocityScore || 0;
        return scoreB - scoreA;
      });

    return hashtags;
  }

  /**
   * Calculate Popular and Trending Creators
   */
  public getPopularCreators(currentUserId?: string): (User & { isFollowing?: boolean; recentEngagementScore?: number })[] {
    const allVideos = db.getVideos();
    const eligibleVideos = allVideos.filter(v => this.isVideoEligible(v, currentUserId));

    const creatorScoreMap = new Map<string, { totalViews: number; totalLikes: number; videoCount: number }>();

    eligibleVideos.forEach(v => {
      const current = creatorScoreMap.get(v.userId) || { totalViews: 0, totalLikes: 0, videoCount: 0 };
      creatorScoreMap.set(v.userId, {
        totalViews: current.totalViews + v.viewsCount,
        totalLikes: current.totalLikes + v.likesCount,
        videoCount: current.videoCount + 1,
      });
    });

    const users = db.users
      .filter(u => !u.isBanned && (!currentUserId || (!db.isBlocked(currentUserId, u.id) && !db.isMutedBy(currentUserId, u.id))))
      .map(u => {
        const stats = creatorScoreMap.get(u.id) || { totalViews: 0, totalLikes: 0, videoCount: 0 };
        const engagementScore = (u.followersCount * 1.5) + (stats.totalLikes * 2.0) + (stats.totalViews * 0.2);
        return {
          ...u,
          isFollowing: currentUserId ? db.getUserRelationship(currentUserId, u.id).isFollowing : false,
          recentEngagementScore: Math.round(engagementScore),
        };
      })
      .sort((a, b) => (b.recentEngagementScore || 0) - (a.recentEngagementScore || 0));

    return users;
  }

  /**
   * Extensible AI Hook: Register custom AI/ML model predictor
   */
  public registerCustomModelPredictor(predictor: AIModelPredictor) {
    this.aiPredictor = predictor;
    this.feedCache.clear();
  }
}

export const recommendationEngine = new RecommendationEngine();
