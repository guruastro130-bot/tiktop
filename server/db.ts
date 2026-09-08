import {
  INITIAL_USERS,
  INITIAL_VIDEOS,
  INITIAL_COMMENTS,
  INITIAL_BANNER_ADS,
  INITIAL_FULLSCREEN_ADS,
  INITIAL_AD_SETTINGS,
  INITIAL_REPORTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_COPYRIGHT_VIOLATIONS,
  INITIAL_REVENUE_EVENTS,
  INITIAL_PAYOUT_REQUESTS,
  INITIAL_WITHDRAWAL_REQUESTS,
  INITIAL_GIFT_TRANSACTIONS,
} from './data';
import {
  User,
  Video,
  Comment,
  Ad,
  AdSettings,
  Report,
  NotificationItem,
  AdminStats,
  DiscoverData,
  SearchResults,
  HashtagInfo,
  AuditLogEntry,
  CopyrightViolationRecord,
  RevenueEvent,
  PayoutRequest,
  WithdrawalRequest,
  GiftTransaction,
  CreatorEarningsSummary,
  PlatformMonetizationStats,
} from '../src/types';

// In-Memory Database with robust mutation methods
class Database {
  users: User[] = [...INITIAL_USERS];
  videos: Video[] = INITIAL_VIDEOS.map(v => ({
    ...v,
    qualities: v.qualities || {
      '720p': v.videoUrl,
      '480p': v.videoUrl,
      '360p': v.videoUrl,
      'auto': v.videoUrl
    },
    compressionStats: v.compressionStats || {
      originalSizeMb: 18.5,
      compressedSizeMb: 9.6,
      savingsPercent: 48.1,
      codec: 'H.264 / AAC (Web-Optimized)',
      resolution: '720x1280 (9:16)'
    }
  }));
  comments: Comment[] = [...INITIAL_COMMENTS];
  ads: Ad[] = [...INITIAL_BANNER_ADS, ...INITIAL_FULLSCREEN_ADS];
  adSettings: AdSettings = { ...INITIAL_AD_SETTINGS };
  revenueEvents: RevenueEvent[] = [...INITIAL_REVENUE_EVENTS];
  payoutRequests: PayoutRequest[] = [...INITIAL_PAYOUT_REQUESTS];
  withdrawalRequests: WithdrawalRequest[] = [...INITIAL_WITHDRAWAL_REQUESTS];
  giftTransactions: GiftTransaction[] = [...INITIAL_GIFT_TRANSACTIONS];
  blockedFraudEventsCount: number = 18;
  reports: Report[] = [...INITIAL_REPORTS];
  auditLogs: AuditLogEntry[] = [...INITIAL_AUDIT_LOGS];
  copyrightViolations: CopyrightViolationRecord[] = [...INITIAL_COPYRIGHT_VIOLATIONS];
  notifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS];
  userLikes: Set<string> = new Set(['user_admin:vid_2']); // 'userId:videoId'
  userFollows: Set<string> = new Set(['user_admin:user_marco', 'user_admin:user_sarah']); // 'followerId:followedId'
  userBlocks: Set<string> = new Set(); // 'blockerId:blockedUserId'
  userMutes: Set<string> = new Set(); // 'muterId:mutedUserId'
  validVideoViews: Map<string, number> = new Map(); // 'userId_or_session:videoId' -> count

  attachVideoFlags(video: Video, currentUserId?: string): Video {
    if (!currentUserId) return { ...video };
    return {
      ...video,
      isLiked: this.userLikes.has(`${currentUserId}:${video.id}`),
      isFollowing: this.userFollows.has(`${currentUserId}:${video.userId}`)
    };
  }

  // --- Block & Mute Methods ---
  blockUser(blockerId: string, targetUserId: string): boolean {
    if (!blockerId || !targetUserId || blockerId === targetUserId) return false;
    this.userBlocks.add(`${blockerId}:${targetUserId}`);

    // Automatically remove follow connections in both directions
    const followKey1 = `${blockerId}:${targetUserId}`;
    const followKey2 = `${targetUserId}:${blockerId}`;
    const blocker = this.getUserById(blockerId);
    const target = this.getUserById(targetUserId);

    if (this.userFollows.has(followKey1)) {
      this.userFollows.delete(followKey1);
      if (blocker) blocker.followingCount = Math.max(0, blocker.followingCount - 1);
      if (target) target.followersCount = Math.max(0, target.followersCount - 1);
    }
    if (this.userFollows.has(followKey2)) {
      this.userFollows.delete(followKey2);
      if (target) target.followingCount = Math.max(0, target.followingCount - 1);
      if (blocker) blocker.followersCount = Math.max(0, blocker.followersCount - 1);
    }
    return true;
  }

  unblockUser(blockerId: string, targetUserId: string): boolean {
    if (!blockerId || !targetUserId) return false;
    this.userBlocks.delete(`${blockerId}:${targetUserId}`);
    return true;
  }

  muteUser(muterId: string, targetUserId: string): boolean {
    if (!muterId || !targetUserId || muterId === targetUserId) return false;
    this.userMutes.add(`${muterId}:${targetUserId}`);
    return true;
  }

  unmuteUser(muterId: string, targetUserId: string): boolean {
    if (!muterId || !targetUserId) return false;
    this.userMutes.delete(`${muterId}:${targetUserId}`);
    return true;
  }

  isBlocked(userA: string, userB: string): boolean {
    if (!userA || !userB) return false;
    return this.userBlocks.has(`${userA}:${userB}`) || this.userBlocks.has(`${userB}:${userA}`);
  }

  isBlockedBy(blockerId: string, targetUserId: string): boolean {
    if (!blockerId || !targetUserId) return false;
    return this.userBlocks.has(`${blockerId}:${targetUserId}`);
  }

  isMutedBy(muterId: string, targetUserId: string): boolean {
    if (!muterId || !targetUserId) return false;
    return this.userMutes.has(`${muterId}:${targetUserId}`);
  }

  getBlockedUsers(userId: string): User[] {
    const list: User[] = [];
    this.userBlocks.forEach(key => {
      const [blocker, blocked] = key.split(':');
      if (blocker === userId) {
        const u = this.getUserById(blocked);
        if (u) {
          list.push({ ...u, isBlocked: true });
        }
      }
    });
    return list;
  }

  getMutedUsers(userId: string): User[] {
    const list: User[] = [];
    this.userMutes.forEach(key => {
      const [muter, muted] = key.split(':');
      if (muter === userId) {
        const u = this.getUserById(muted);
        if (u) {
          list.push({ ...u, isMuted: true });
        }
      }
    });
    return list;
  }

  getUserRelationship(currentUserId?: string, targetUserId?: string): { isBlocked: boolean; isMuted: boolean; isBlockedByTarget: boolean; isFollowing: boolean } {
    if (!currentUserId || !targetUserId) {
      return { isBlocked: false, isMuted: false, isBlockedByTarget: false, isFollowing: false };
    }
    return {
      isBlocked: this.userBlocks.has(`${currentUserId}:${targetUserId}`),
      isMuted: this.userMutes.has(`${currentUserId}:${targetUserId}`),
      isBlockedByTarget: this.userBlocks.has(`${targetUserId}:${currentUserId}`),
      isFollowing: this.userFollows.has(`${currentUserId}:${targetUserId}`)
    };
  }

  // --- Users ---
  getUserById(id: string): User | undefined {
    if (!id) return undefined;
    const clean = id.trim().toLowerCase();
    return this.users.find(u => 
      u.id === id || 
      u.userId === id || 
      u.id.toLowerCase() === clean || 
      (u.userId && u.userId.toLowerCase() === clean) || 
      u.username.toLowerCase() === clean
    );
  }

  getUserByEmailOrUsername(identifier: string): User | undefined {
    const lower = identifier.toLowerCase().trim();
    const cleanPhone = identifier.replace(/[^0-9+]/g, '');
    return this.users.find(u => 
      u.id === identifier ||
      u.userId === identifier ||
      u.email.toLowerCase() === lower || 
      u.username.toLowerCase() === lower ||
      (u.name && u.name.toLowerCase() === lower) ||
      (u.displayName && u.displayName.toLowerCase() === lower) ||
      (u.phone && cleanPhone && u.phone.replace(/[^0-9+]/g, '') === cleanPhone) ||
      (u.phoneNumber && cleanPhone && u.phoneNumber.replace(/[^0-9+]/g, '') === cleanPhone)
    );
  }

  getUserByPhone(phoneNumber: string): User | undefined {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '').trim();
    if (!cleanPhone) return undefined;
    return this.users.find(u => 
      (u.phone && u.phone.replace(/[^0-9+]/g, '') === cleanPhone) ||
      (u.phoneNumber && u.phoneNumber.replace(/[^0-9+]/g, '') === cleanPhone)
    );
  }

  createUser(user: User): User {
    this.users.unshift(user);
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.users[idx] = { ...this.users[idx], ...updates };
    return this.users[idx];
  }

  // --- Videos ---
  getVideos(filter?: { userId?: string; search?: string; hashtag?: string; forYou?: boolean; currentUserId?: string }): Video[] {
    let result = this.videos.filter(v => v.status !== 'removed');
    const currentUserId = filter?.currentUserId;
    const currentUser = currentUserId ? this.getUserById(currentUserId) : undefined;
    const isAdmin = currentUser?.role === 'admin';

    // Strict block / mute / privacy filtering
    result = result.filter(v => {
      // 1. Drafts: only author can see their own drafts
      if (v.isDraft && v.userId !== currentUserId) {
        return false;
      }

      // 2. Private videos: only author (or admin) can see private videos
      if ((v.isPrivate || v.visibility === 'private') && v.userId !== currentUserId && !isAdmin) {
        return false;
      }

      // 3. Followers-only videos: only author, admin, or followers can see
      if (v.visibility === 'followers' && v.userId !== currentUserId && !isAdmin) {
        if (!currentUserId || !this.userFollows.has(`${currentUserId}:${v.userId}`)) {
          return false;
        }
      }

      // 4. Block / Mute filtering
      if (currentUserId) {
        if (this.isBlocked(currentUserId, v.userId)) return false;
        if (!filter?.userId && this.isMutedBy(currentUserId, v.userId)) return false;
      }

      return true;
    });
    
    if (filter?.userId) {
      // If current user is blocked by or has blocked the target profile, return empty list
      if (currentUserId && this.isBlocked(currentUserId, filter.userId)) {
        return [];
      }
      result = result.filter(v => v.userId === filter.userId);
    }
    if (filter?.hashtag) {
      const tag = filter.hashtag.toLowerCase().replace('#', '');
      result = result.filter(v => v.hashtags.some(h => h.toLowerCase() === tag));
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(v => 
        v.caption.toLowerCase().includes(q) || 
        v.user.username.toLowerCase().includes(q) ||
        v.hashtags.some(h => h.toLowerCase().includes(q))
      );
    }

    // Attach user-specific flags (liked, following)
    if (currentUserId) {
      result = result.map(v => ({
        ...v,
        isLiked: this.userLikes.has(`${currentUserId}:${v.id}`),
        isFollowing: this.userFollows.has(`${currentUserId}:${v.userId}`)
      }));
    }

    return result;
  }

  getVideoById(id: string, currentUserId?: string): Video | undefined {
    const v = this.videos.find(v => v.id === id);
    if (!v || v.status === 'removed') return undefined;

    const currentUser = currentUserId ? this.getUserById(currentUserId) : undefined;
    const isAdmin = currentUser?.role === 'admin';

    // Privacy & Draft protection
    if (v.isDraft && v.userId !== currentUserId) {
      return undefined;
    }
    if ((v.isPrivate || v.visibility === 'private') && v.userId !== currentUserId && !isAdmin) {
      return undefined;
    }
    if (v.visibility === 'followers' && v.userId !== currentUserId && !isAdmin) {
      if (!currentUserId || !this.userFollows.has(`${currentUserId}:${v.userId}`)) {
        return undefined;
      }
    }

    if (currentUserId && this.isBlocked(currentUserId, v.userId)) {
      return undefined;
    }
    if (currentUserId) {
      return {
        ...v,
        isLiked: this.userLikes.has(`${currentUserId}:${v.id}`),
        isFollowing: this.userFollows.has(`${currentUserId}:${v.userId}`)
      };
    }
    return v;
  }

  addVideo(video: Video): Video {
    const defaultBanner = this.ads.find(a => a.type === 'banner' && a.isActive) || INITIAL_BANNER_ADS[0];
    const enriched: Video = {
      ...video,
      bannerAd: video.bannerAd || defaultBanner,
      qualities: video.qualities || {
        '720p': video.videoUrl,
        '480p': video.videoUrl,
        '360p': video.videoUrl,
        'auto': video.videoUrl
      },
      compressionStats: video.compressionStats || {
        originalSizeMb: 15.0,
        compressedSizeMb: 7.8,
        savingsPercent: 48.0,
        codec: 'H.264 / AAC (Web-Optimized)',
        resolution: '720x1280 (9:16)'
      }
    };
    this.videos.unshift(enriched);
    return enriched;
  }

  updateVideo(id: string, updates: Partial<Video>, requesterId?: string): { success: boolean; video?: Video; error?: string } {
    const video = this.videos.find(v => v.id === id);
    if (!video) return { success: false, error: 'Video not found' };

    const requester = requesterId ? this.getUserById(requesterId) : undefined;
    const isAdmin = requester?.role === 'admin';

    if (requesterId && video.userId !== requesterId && !isAdmin) {
      return { success: false, error: 'Unauthorized: You can only edit your own videos.' };
    }

    // Apply allowed updates
    if (updates.caption !== undefined) video.caption = updates.caption;
    if (updates.hashtags !== undefined) video.hashtags = updates.hashtags;
    if (updates.visibility !== undefined) {
      video.visibility = updates.visibility;
      video.isPrivate = updates.visibility === 'private';
    }
    if (updates.isPrivate !== undefined) video.isPrivate = updates.isPrivate;
    if (updates.isDraft !== undefined) video.isDraft = updates.isDraft;
    if (updates.status !== undefined && isAdmin) video.status = updates.status;

    return { success: true, video };
  }

  deleteVideo(id: string, requesterId?: string): { success: boolean; error?: string } {
    const video = this.videos.find(v => v.id === id);
    if (!video) return { success: false, error: 'Video not found' };

    const requester = requesterId ? this.getUserById(requesterId) : undefined;
    const isAdmin = requester?.role === 'admin';

    if (requesterId && video.userId !== requesterId && !isAdmin) {
      return { success: false, error: 'Unauthorized: You can only delete your own videos.' };
    }

    video.status = 'removed';
    return { success: true };
  }

  restoreVideo(id: string): boolean {
    const video = this.videos.find(v => v.id === id);
    if (!video) return false;
    video.status = 'active';
    return true;
  }

  permanentlyDeleteVideo(id: string): boolean {
    const idx = this.videos.findIndex(v => v.id === id);
    if (idx === -1) return false;
    this.videos.splice(idx, 1);
    return true;
  }

  toggleLike(userId: string, videoId: string): { liked: boolean; likesCount: number } {
    const video = this.videos.find(v => v.id === videoId);
    if (!video) return { liked: false, likesCount: 0 };
    if (this.isBlocked(userId, video.userId)) {
      return { liked: false, likesCount: video.likesCount };
    }

    const key = `${userId}:${videoId}`;
    let liked = false;
    if (this.userLikes.has(key)) {
      this.userLikes.delete(key);
      video.likesCount = Math.max(0, video.likesCount - 1);
      liked = false;
    } else {
      this.userLikes.add(key);
      video.likesCount += 1;
      liked = true;

      // add notification if not blocked or muted
      if (video.userId !== userId && !this.isBlocked(video.userId, userId)) {
        const actor = this.getUserById(userId);
        if (actor) {
          this.createNotification({
            userId: video.userId,
            actorId: actor.id,
            actor: {
              id: actor.id,
              username: actor.username,
              displayName: actor.displayName,
              avatarUrl: actor.avatarUrl
            },
            type: 'like',
            text: 'liked your video.',
            videoId: video.id,
            videoThumbnail: video.thumbnailUrl
          });
        }
      }
    }
    return { liked, likesCount: video.likesCount };
  }

  private viewTimestamps: Map<string, number> = new Map();

  recordVideoView(videoId: string, durationSeconds: number, userId?: string): { valid: boolean; viewsCount: number; fraudPrevented?: boolean } {
    const video = this.videos.find(v => v.id === videoId);
    if (!video || video.status === 'removed') return { valid: false, viewsCount: 0 };
    
    const isValid = durationSeconds >= this.adSettings.validViewThresholdSeconds;
    if (!isValid) {
      return { valid: false, viewsCount: video.viewsCount };
    }

    // Anti-fraud duplicate cooldown check (5s debounce per user/client on same video)
    const key = `${userId || 'client'}:${videoId}`;
    const now = Date.now();
    const lastTime = this.viewTimestamps.get(key) || 0;

    if (now - lastTime < 5000) {
      return { valid: true, viewsCount: video.viewsCount, fraudPrevented: true };
    }

    this.viewTimestamps.set(key, now);
    video.viewsCount += 1;
    return { valid: true, viewsCount: video.viewsCount };
  }

  getCreatorAnalytics(userId: string): any {
    const user = this.getUserById(userId);
    if (!user) return null;

    const creatorVideos = this.videos.filter(v => v.userId === userId && v.status !== 'removed');
    const totalViews = creatorVideos.reduce((sum, v) => sum + (v.viewsCount || 0), 0);
    const totalLikes = creatorVideos.reduce((sum, v) => sum + (v.likesCount || 0), 0);
    const totalComments = creatorVideos.reduce((sum, v) => sum + (v.commentsCount || 0), 0);
    const totalShares = creatorVideos.reduce((sum, v) => sum + (v.sharesCount || 0), 0);

    const engagementRate = totalViews > 0
      ? Number((((totalLikes + totalComments + totalShares) / totalViews) * 100).toFixed(2))
      : 0;

    const earningsSummary = this.getCreatorEarningsSummary(userId);

    const topVideos = [...creatorVideos]
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
      .slice(0, 5);

    return {
      userId,
      username: user.username,
      displayName: user.displayName,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      totalVideos: creatorVideos.length,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      engagementRate,
      estimatedEarningsUsd: earningsSummary?.estimatedEarnings ?? Number(((totalViews / 1000) * 0.04).toFixed(2)),
      earningsSummary,
      topVideos,
      adMilestonesCompleted: Math.floor(totalViews / 10),
      generatedAt: new Date().toISOString()
    };
  }

  recordVideoShare(videoId: string): number {
    const video = this.videos.find(v => v.id === videoId);
    if (!video) return 0;
    video.sharesCount += 1;
    return video.sharesCount;
  }

  // --- Comments ---
  getComments(videoId: string, currentUserId?: string): Comment[] {
    let list = this.comments.filter(c => c.videoId === videoId);
    if (currentUserId) {
      list = list.filter(c => !this.isBlocked(currentUserId, c.userId));
    }
    return list;
  }

  addComment(comment: Comment): Comment | null {
    const video = this.videos.find(v => v.id === comment.videoId);
    if (!video) return null;
    if (this.isBlocked(comment.userId, video.userId)) {
      return null;
    }

    this.comments.unshift(comment);
    video.commentsCount += 1;
      
    // If this is a reply to another comment
    if (comment.parentId) {
      const parentComment = this.comments.find(c => c.id === comment.parentId);
      if (parentComment && parentComment.userId !== comment.userId && !this.isBlocked(parentComment.userId, comment.userId)) {
        this.createNotification({
          userId: parentComment.userId,
          actorId: comment.user.id,
          actor: comment.user,
          type: 'reply',
          text: 'replied to your comment.',
          videoId: video.id,
          videoThumbnail: video.thumbnailUrl,
          commentId: comment.id
        });
      }
      // Also notify video author if distinct from parent author and commenter
      if (video.userId !== comment.userId && (!parentComment || video.userId !== parentComment.userId) && !this.isBlocked(video.userId, comment.userId)) {
        this.createNotification({
          userId: video.userId,
          actorId: comment.user.id,
          actor: comment.user,
          type: 'comment',
          text: 'commented on your video.',
          videoId: video.id,
          videoThumbnail: video.thumbnailUrl,
          commentId: comment.id
        });
      }
    } else {
      // Direct comment on video
      if (video.userId !== comment.userId && !this.isBlocked(video.userId, comment.userId)) {
        this.createNotification({
          userId: video.userId,
          actorId: comment.user.id,
          actor: comment.user,
          type: 'comment',
          text: 'commented on your video.',
          videoId: video.id,
          videoThumbnail: video.thumbnailUrl,
          commentId: comment.id
        });
      }
    }
    return comment;
  }

  // --- Follows ---
  toggleFollow(followerId: string, targetUserId: string): { following: boolean; followersCount: number; error?: string } {
    if (this.isBlocked(followerId, targetUserId)) {
      return { following: false, followersCount: 0, error: 'Cannot follow a blocked user' };
    }

    const key = `${followerId}:${targetUserId}`;
    const targetUser = this.getUserById(targetUserId);
    const follower = this.getUserById(followerId);
    if (!targetUser || !follower) return { following: false, followersCount: 0 };

    let following = false;
    if (this.userFollows.has(key)) {
      this.userFollows.delete(key);
      targetUser.followersCount = Math.max(0, targetUser.followersCount - 1);
      follower.followingCount = Math.max(0, follower.followingCount - 1);
      following = false;
    } else {
      this.userFollows.add(key);
      targetUser.followersCount += 1;
      follower.followingCount += 1;
      following = true;

      this.createNotification({
        userId: targetUser.id,
        actorId: follower.id,
        actor: {
          id: follower.id,
          username: follower.username,
          displayName: follower.displayName,
          avatarUrl: follower.avatarUrl
        },
        type: 'follow',
        text: 'started following you.'
      });
    }
    return { following, followersCount: targetUser.followersCount };
  }

  // --- Ads ---
  getAds(type?: 'banner' | 'fullscreen'): Ad[] {
    if (type) {
      return this.ads.filter(a => a.type === type);
    }
    return this.ads;
  }

  getAdById(id: string): Ad | undefined {
    return this.ads.find(a => a.id === id);
  }

  createAd(ad: Ad): Ad {
    this.ads.unshift(ad);
    return ad;
  }

  updateAd(id: string, updates: Partial<Ad>): Ad | undefined {
    const idx = this.ads.findIndex(a => a.id === id);
    if (idx === -1) return undefined;
    this.ads[idx] = { ...this.ads[idx], ...updates };
    return this.ads[idx];
  }

  deleteAd(id: string): boolean {
    const idx = this.ads.findIndex(a => a.id === id);
    if (idx === -1) return false;
    this.ads.splice(idx, 1);
    return true;
  }

  // --- Monetization & Revenue Tracking ---
  recordAdRevenueEvent(params: {
    adId: string;
    videoId?: string;
    type: 'banner_impression' | 'banner_click' | 'fullscreen_impression' | 'fullscreen_click';
    clientId?: string;
  }): { success: boolean; event?: RevenueEvent; fraudPrevented?: boolean; reason?: string } {
    if (!this.adSettings.enableAds || !this.adSettings.enableMonetization) {
      return { success: false, reason: 'Ads or monetization disabled' };
    }

    const ad = this.getAdById(params.adId);
    if (!ad || !ad.isActive) {
      return { success: false, reason: 'Ad not found or inactive' };
    }

    let creatorId = 'user_admin';
    let videoCaption = undefined;
    if (params.videoId) {
      const video = this.getVideoById(params.videoId);
      if (video) {
        creatorId = video.userId;
        videoCaption = video.caption;
      }
    }

    // Rate CPM / CPC calculation
    let grossRevenue = 0;
    if (params.type === 'banner_impression') {
      grossRevenue = Number(((this.adSettings.bannerCpm || 3.50) / 1000).toFixed(6));
    } else if (params.type === 'banner_click') {
      grossRevenue = Number((this.adSettings.bannerCpc || 0.20).toFixed(4));
    } else if (params.type === 'fullscreen_impression') {
      grossRevenue = Number(((this.adSettings.fullscreenCpm || 9.00) / 1000).toFixed(6));
    } else if (params.type === 'fullscreen_click') {
      grossRevenue = Number((this.adSettings.fullscreenCpc || 0.50).toFixed(4));
    }

    const creatorSharePercent = this.adSettings.creatorSharePercent ?? 55;
    const platformSharePercent = this.adSettings.platformSharePercent ?? 45;
    const creatorRevenue = Number((grossRevenue * (creatorSharePercent / 100)).toFixed(6));
    const platformRevenue = Number((grossRevenue * (platformSharePercent / 100)).toFixed(6));

    const event: RevenueEvent = {
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      creatorId,
      videoId: params.videoId,
      videoCaption,
      adId: ad.id,
      adTitle: ad.title,
      type: params.type,
      grossRevenue,
      creatorRevenue,
      platformRevenue,
      creatorSharePercent,
      isValid: true,
      clientId: params.clientId,
      createdAt: new Date().toISOString()
    };

    this.revenueEvents.unshift(event);
    return { success: true, event };
  }

  getCreatorEarningsSummary(userId: string): CreatorEarningsSummary | null {
    const user = this.getUserById(userId);
    if (!user) return null;

    const userEvents = this.revenueEvents.filter(e => e.creatorId === userId && e.isValid);
    const estimatedEarnings = Number(userEvents.reduce((acc, e) => acc + (e.creatorRevenue || 0), 0).toFixed(2));
    
    const userPayouts = this.payoutRequests.filter(p => p.creatorId === userId);
    const totalPaidOut = Number(
      userPayouts
        .filter(p => p.status === 'completed')
        .reduce((acc, p) => acc + p.amount, 0)
        .toFixed(2)
    );
    const pendingBalance = Number(
      userPayouts
        .filter(p => p.status === 'pending' || p.status === 'processing')
        .reduce((acc, p) => acc + p.amount, 0)
        .toFixed(2)
    );
    const availableBalance = Number(Math.max(0, estimatedEarnings - totalPaidOut - pendingBalance).toFixed(2));

    const impressionEvents = userEvents.filter(e => e.type.includes('impression'));
    const clickEvents = userEvents.filter(e => e.type.includes('click'));

    const creatorVideos = this.videos.filter(v => v.userId === userId && v.status !== 'removed');
    const revenueByVideo = creatorVideos.map(v => {
      const vEvents = userEvents.filter(e => e.videoId === v.id);
      const vEarnings = Number(vEvents.reduce((acc, e) => acc + (e.creatorRevenue || 0), 0).toFixed(2));
      const vImpressions = vEvents.filter(e => e.type.includes('impression')).length;
      const vClicks = vEvents.filter(e => e.type.includes('click')).length;
      return {
        videoId: v.id,
        videoCaption: v.caption,
        thumbnailUrl: v.thumbnailUrl,
        viewsCount: v.viewsCount || 0,
        impressions: vImpressions,
        clicks: vClicks,
        earnings: vEarnings
      };
    });

    return {
      userId,
      username: user.username,
      displayName: user.displayName,
      estimatedEarnings,
      totalLifetimeEarnings: estimatedEarnings,
      availableBalance,
      pendingBalance,
      totalPaidOut,
      totalValidImpressions: impressionEvents.length,
      totalValidClicks: clickEvents.length,
      totalFilteredFraudEvents: 2,
      creatorSharePercent: this.adSettings.creatorSharePercent ?? 55,
      minPayoutThreshold: this.adSettings.minPayoutThreshold ?? 20.00,
      recentTransactions: userEvents.slice(0, 30),
      payouts: userPayouts.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
      revenueByVideo
    };
  }

  getPayoutRequests(status?: string, creatorId?: string): PayoutRequest[] {
    let list = [...this.payoutRequests];
    if (status && status !== 'all') {
      list = list.filter(p => p.status === status);
    }
    if (creatorId) {
      list = list.filter(p => p.creatorId === creatorId);
    }
    return list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  requestPayout(params: {
    creatorId: string;
    amount: number;
    method: 'paypal' | 'bank_transfer' | 'stripe' | 'wire';
    accountDetails: string;
  }): { success: boolean; error?: string; payout?: PayoutRequest } {
    const creator = this.getUserById(params.creatorId);
    if (!creator) return { success: false, error: 'Creator not found' };
    if (creator.isBanned) return { success: false, error: 'Account is suspended from payouts' };

    const minThreshold = this.adSettings.minPayoutThreshold ?? 20.00;
    if (params.amount < minThreshold) {
      return { success: false, error: `Minimum payout threshold is $${minThreshold.toFixed(2)} USD` };
    }

    const summary = this.getCreatorEarningsSummary(params.creatorId);
    if (!summary || summary.availableBalance < params.amount) {
      return { success: false, error: `Insufficient available balance ($${summary?.availableBalance.toFixed(2) || '0.00'})` };
    }

    const newPayout: PayoutRequest = {
      id: 'payout_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      creatorId: creator.id,
      creatorUsername: creator.username,
      creatorDisplayName: creator.displayName,
      amount: Number(params.amount.toFixed(2)),
      currency: 'USD',
      method: params.method,
      accountDetails: params.accountDetails,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    this.payoutRequests.unshift(newPayout);

    // Notify creator
    this.createNotification({
      userId: creator.id,
      actorId: 'user_admin',
      actor: {
        id: 'user_admin',
        username: 'admin',
        displayName: 'TikTok Finance',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
      },
      type: 'system',
      text: `Payout request for $${newPayout.amount.toFixed(2)} USD via ${newPayout.method.replace('_', ' ').toUpperCase()} submitted successfully.`
    });

    return { success: true, payout: newPayout };
  }

  updatePayoutStatus(params: {
    payoutId: string;
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    adminId: string;
    adminUsername: string;
    adminNotes?: string;
    transactionReference?: string;
  }): { success: boolean; error?: string; payout?: PayoutRequest } {
    const payout = this.payoutRequests.find(p => p.id === params.payoutId);
    if (!payout) return { success: false, error: 'Payout request not found' };

    payout.status = params.status;
    payout.processedAt = new Date().toISOString();
    if (params.adminNotes) payout.adminNotes = params.adminNotes;
    if (params.transactionReference) payout.transactionReference = params.transactionReference;

    // Notify creator
    const creator = this.getUserById(payout.creatorId);
    if (creator) {
      const statusText = params.status === 'completed'
        ? `Payout of $${payout.amount.toFixed(2)} USD has been approved and completed!`
        : params.status === 'rejected'
        ? `Payout request for $${payout.amount.toFixed(2)} USD was rejected: ${params.adminNotes || 'Policy review'}. Funds returned to your available balance.`
        : `Payout request for $${payout.amount.toFixed(2)} USD is now ${params.status}.`;

      this.createNotification({
        userId: creator.id,
        actorId: params.adminId,
        actor: {
          id: params.adminId,
          username: params.adminUsername,
          displayName: 'TikTok Finance',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
        },
        type: 'system',
        text: statusText
      });
    }

    this.createAuditLog({
      adminId: params.adminId,
      adminUsername: params.adminUsername,
      action: `payout_${params.status}`,
      targetId: payout.id,
      targetType: 'user',
      targetPreview: `@${payout.creatorUsername} - $${payout.amount.toFixed(2)} (${params.status})`,
      reason: params.adminNotes || `Admin marked payout as ${params.status}`,
      details: params.transactionReference ? `Txn Ref: ${params.transactionReference}` : undefined
    });

    return { success: true, payout };
  }

  // --- Nepali eSewa / Khalti Point Withdrawal System (500,000 Points Threshold) ---
  getWithdrawalRequests(userId?: string, status?: string): WithdrawalRequest[] {
    let list = [...this.withdrawalRequests];
    if (userId) {
      list = list.filter(w => w.userId === userId);
    }
    if (status && status !== 'all') {
      const s = status.toLowerCase();
      list = list.filter(w => String(w.status).toLowerCase() === s);
    }
    return list.sort((a, b) => new Date(b.requestedAt || b.timestamp || 0).getTime() - new Date(a.requestedAt || a.timestamp || 0).getTime());
  }

  createWithdrawalRequest(params: {
    userId: string;
    requestId?: string;
    userName?: string;
    fullName?: string;
    paymentMethod: string;
    mobileNumber?: string;
    phone?: string;
    accountNumber?: string;
    walletIdentifier?: string;
    accountHolderName?: string;
    country?: string;
    countryName?: string;
    currency?: string;
    currencySymbol?: string;
    localAmount?: number;
    localServiceCharge?: number;
    localNetPayout?: number;
    points?: number;
    amountNpr?: number;
    requestedNPR?: number;
    serviceCharge?: number;
    netPayout?: number;
    status?: string;
    timestamp?: string;
  }): { success: boolean; error?: string; withdrawal?: WithdrawalRequest; user?: User } {
    const user = this.getUserById(params.userId);
    if (!user) return { success: false, error: 'प्रयोगकर्ता भेटिएन (User not found)' };
    if (user.isBanned) return { success: false, error: 'तपाईंको खाता निलम्बित गरिएको छ (Account is suspended)' };

    const paymentMethodRaw = String(params.paymentMethod || 'eSewa');

    // Ratio: 1 point = 0.001 NPR (500,000 points = 500 NPR)
    const POINT_TO_NPR_RATIO = 0.001;
    const MIN_WITHDRAW_NPR = 500;

    let amountNpr = params.requestedNPR || params.amountNpr ? Number(params.requestedNPR || params.amountNpr) : 0;
    let pointsToDeduct = params.points ? Number(params.points) : 0;

    if (amountNpr > 0 && pointsToDeduct <= 0) {
      pointsToDeduct = Math.round(amountNpr / POINT_TO_NPR_RATIO);
    } else if (pointsToDeduct > 0 && amountNpr <= 0) {
      amountNpr = Math.floor(pointsToDeduct * POINT_TO_NPR_RATIO);
    } else if (amountNpr <= 0 && pointsToDeduct <= 0) {
      pointsToDeduct = 500000;
      amountNpr = 500;
    }

    if (amountNpr < MIN_WITHDRAW_NPR) {
      return {
        success: false,
        error: `❌ न्यूनतम विथड्र रकम रु. ${MIN_WITHDRAW_NPR} (५ लाख पोइन्ट) हुनुपर्छ!`
      };
    }

    const currentPoints = user.points ?? user.pointsBalance ?? 0;

    // Requirement 1: Check if points >= requiredPoints
    if (currentPoints < pointsToDeduct) {
      const remainingPoints = (pointsToDeduct - currentPoints).toLocaleString('en-IN');
      return {
        success: false,
        error: `❌ तपाईंसँग विथड्र गर्नको लागि पर्याप्त पोइन्ट छैन! ब्यालेन्स: ${currentPoints.toLocaleString('en-IN')} (अझै ${remainingPoints} पोइन्ट आवश्यक)`
      };
    }

    // Validate Account / Mobile / UPI / Wallet Identifier
    const rawAccount = params.walletIdentifier || params.accountNumber || params.phone || params.mobileNumber || user.phone || user.phoneNumber || '';
    const cleanAccount = String(rawAccount).trim();
    if (!cleanAccount) {
      return { success: false, error: '❌ कृपया आफ्नो वालेट / खाता नम्बर वा UPI ID प्रविष्ट गर्नुहोस्!' };
    }
    if (cleanAccount.length < 3) {
      return { success: false, error: '❌ कृपया सही खाता वा वालेट विवरण राख्नुहोस्।' };
    }

    // Full name fallback
    const resolvedFullName = params.accountHolderName?.trim() || params.userName?.trim() || params.fullName?.trim() || user.name || user.displayName || user.username;

    // 8% Service charge & Final payout calculation
    const serviceChargeNpr = params.serviceCharge !== undefined ? Number(params.serviceCharge) : Number((amountNpr * 0.08).toFixed(2));
    const finalPayoutNpr = params.netPayout !== undefined ? Number(params.netPayout) : Number((amountNpr - serviceChargeNpr).toFixed(2));

    const countryCode = params.country || 'NP';
    const countryName = params.countryName || (countryCode === 'NP' ? 'Nepal' : countryCode === 'IN' ? 'India' : countryCode === 'PK' ? 'Pakistan' : countryCode === 'PH' ? 'Philippines' : 'Global');
    const currency = params.currency || (countryCode === 'IN' ? 'INR' : countryCode === 'PK' ? 'PKR' : countryCode === 'PH' ? 'PHP' : countryCode === 'GLOBAL' ? 'USD' : 'NPR');
    const currencySymbol = params.currencySymbol || (countryCode === 'IN' ? '₹' : countryCode === 'PK' ? '₨' : countryCode === 'PH' ? '₱' : countryCode === 'GLOBAL' ? '$' : 'रू');

    const localAmount = params.localAmount !== undefined ? Number(params.localAmount) : amountNpr;
    const localServiceCharge = params.localServiceCharge !== undefined ? Number(params.localServiceCharge) : serviceChargeNpr;
    const localNetPayout = params.localNetPayout !== undefined ? Number(params.localNetPayout) : finalPayoutNpr;

    // Deduct points from user balance
    user.points = currentPoints - pointsToDeduct;
    if (user.pointsBalance !== undefined) {
      user.pointsBalance = Math.max(0, (user.pointsBalance || 0) - pointsToDeduct);
    }

    const assignedId = params.requestId || ('wdraw_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const assignedTimestamp = params.timestamp || new Date().toISOString();

    const newWithdrawal: WithdrawalRequest = {
      id: assignedId,
      requestId: assignedId,
      userId: user.userId || user.id,
      username: user.username,
      userName: resolvedFullName,
      fullName: resolvedFullName,
      accountHolderName: resolvedFullName,
      paymentMethod: paymentMethodRaw,
      phone: cleanAccount,
      mobileNumber: cleanAccount,
      walletIdentifier: cleanAccount,
      country: countryCode,
      countryName,
      currency,
      currencySymbol,
      localAmount,
      localServiceCharge,
      localNetPayout,
      pointsDeducted: pointsToDeduct,
      requestedNPR: amountNpr,
      amountNpr: amountNpr,
      serviceCharge: serviceChargeNpr,
      serviceChargeNpr: serviceChargeNpr,
      netPayout: finalPayoutNpr,
      finalPayoutNpr: finalPayoutNpr,
      status: (params.status as any) || 'Pending', // Status saved as 'Pending'
      timestamp: assignedTimestamp,
      requestedAt: assignedTimestamp
    };

    this.withdrawalRequests.unshift(newWithdrawal);

    // 1. Notify user in-app
    this.createNotification({
      userId: user.id,
      actorId: 'system',
      actor: {
        id: 'system',
        username: 'TikTop Finance',
        displayName: `${countryName} Local Wallet Payouts`,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
      },
      type: 'system',
      text: `विथड्र अनुरोध प्राप्त भयो: ${currencySymbol} ${localAmount} (${paymentMethodRaw.toUpperCase()}: ${cleanAccount})। ८% सर्भिस चार्ज (${currencySymbol} ${localServiceCharge}) कट्टी भई तपाईंले पाउने रकम ${currencySymbol} ${localNetPayout} हुनेछ।`
    });

    // 2. IMMEDIATE ADMIN PANEL NOTIFICATION (विथड्र गर्नासाथ एड्मिन प्यानलमा सूचना)
    this.createNotification({
      userId: 'user_admin',
      actorId: user.id,
      actor: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
      },
      type: 'system',
      text: `🚨 [नयाँ विथड्र अलर्ट]: @${user.username} ले ${countryName} (${paymentMethodRaw.toUpperCase()}: ${cleanAccount}) मार्फत ${currencySymbol} ${localNetPayout} (रु. ${finalPayoutNpr} NPR) भुक्तानीका लागि अनुरोध गर्नुभयो।`
    });

    // Create Audit Log
    this.createAuditLog({
      adminId: 'system',
      adminUsername: 'system',
      action: 'withdrawal_requested',
      targetId: newWithdrawal.id,
      targetType: 'user',
      targetPreview: `@${user.username} requested ${countryName} ${paymentMethodRaw.toUpperCase()} payout for ${currencySymbol} ${localAmount} (${pointsToDeduct.toLocaleString()} points). Payout: ${currencySymbol} ${localNetPayout}`,
      reason: `Points Cashout to ${cleanAccount}`
    });

    return {
      success: true,
      withdrawal: newWithdrawal,
      user
    };
  }

  updateWithdrawalStatus(params: {
    withdrawalId: string;
    status: 'pending' | 'approved' | 'rejected';
    adminId: string;
    adminUsername: string;
    adminNotes?: string;
    transactionReference?: string;
  }): { success: boolean; error?: string; withdrawal?: WithdrawalRequest } {
    const withdrawal = this.withdrawalRequests.find(w => w.id === params.withdrawalId || w.requestId === params.withdrawalId);
    if (!withdrawal) return { success: false, error: 'Withdrawal request not found' };

    const oldStatus = String(withdrawal.status).toLowerCase();
    withdrawal.status = params.status;
    withdrawal.processedAt = new Date().toISOString();
    if (params.adminNotes) withdrawal.adminNotes = params.adminNotes;
    if (params.transactionReference) withdrawal.transactionReference = params.transactionReference;

    const user = this.getUserById(withdrawal.userId);

    // If rejected from pending, refund the deducted points back to user
    if (oldStatus === 'pending' && params.status === 'rejected' && user) {
      user.points = (user.points || 0) + withdrawal.pointsDeducted;
      if (user.pointsBalance !== undefined) {
        user.pointsBalance = (user.pointsBalance || 0) + withdrawal.pointsDeducted;
      }
    }

    if (user) {
      const msg = params.status === 'approved'
        ? `तपाईंको रु. ${withdrawal.amountNpr} को ${withdrawal.paymentMethod.toUpperCase()} विथड्र सफल भएको छ! Txn Ref: ${withdrawal.transactionReference || 'COMPLETED'}`
        : params.status === 'rejected'
        ? `तपाईंको रु. ${withdrawal.amountNpr} को विथड्र अस्वीकृत भयो: ${params.adminNotes || 'विवरण नमिलेको'}. ५ लाख पोइन्ट तपाईंको खातामा फिर्ता गरिएको छ।`
        : `तपाईंको विथड्र अनुरोध अब '${params.status}' स्थितिमा छ।`;

      this.createNotification({
        userId: user.id,
        actorId: params.adminId,
        actor: {
          id: params.adminId,
          username: params.adminUsername,
          displayName: 'TikTok Finance',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
        },
        type: 'system',
        text: msg
      });
    }

    this.createAuditLog({
      adminId: params.adminId,
      adminUsername: params.adminUsername,
      action: `withdrawal_${params.status}`,
      targetId: withdrawal.id,
      targetType: 'user',
      targetPreview: `@${withdrawal.username} - Rs. ${withdrawal.amountNpr} via ${withdrawal.paymentMethod.toUpperCase()}`,
      reason: params.adminNotes || `Admin updated withdrawal status to ${params.status}`,
      details: params.transactionReference ? `Txn: ${params.transactionReference}` : undefined
    });

    return { success: true, withdrawal };
  }

  // --- Live Gift Revenue Sharing (30% Platform, 70% Creator) ---
  getGiftTransactions(creatorId?: string, senderId?: string): GiftTransaction[] {
    let list = [...this.giftTransactions];
    if (creatorId) {
      list = list.filter(t => t.creatorId === creatorId);
    }
    if (senderId) {
      list = list.filter(t => t.senderId === senderId);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  createGiftTransaction(params: {
    transactionId?: string;
    senderId: string;
    creatorId: string;
    giftName: string;
    giftPrice: number;
    roomId?: string;
    timestamp?: string;
  }): { success: boolean; error?: string; transaction?: GiftTransaction } {
    const sender = this.getUserById(params.senderId);
    const creator = this.getUserById(params.creatorId);

    const platformCommission = Math.round(params.giftPrice * 0.30); // ३०% कमिसन (तपाईँको आम्दानी)
    const creatorEarnings = Math.round(params.giftPrice * 0.70);   // ७०% क्रिएटरको भाग

    if (sender && sender.coinBalance !== undefined) {
      sender.coinBalance = Math.max(0, sender.coinBalance - params.giftPrice);
    }

    if (creator) {
      creator.pointsBalance = (creator.pointsBalance || 0) + creatorEarnings;
      creator.totalEarned = (creator.totalEarned || 0) + creatorEarnings;
      creator.points = (creator.points || 0) + creatorEarnings;
    }

    const txn: GiftTransaction = {
      id: params.transactionId || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      transactionId: params.transactionId || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: params.senderId,
      senderName: sender?.displayName || sender?.username || params.senderId,
      creatorId: params.creatorId,
      creatorName: creator?.displayName || creator?.username || params.creatorId,
      giftName: params.giftName,
      giftPrice: params.giftPrice,
      platformCommission,
      creatorEarnings,
      timestamp: params.timestamp || new Date().toISOString(),
      roomId: params.roomId
    };

    this.giftTransactions.unshift(txn);
    return { success: true, transaction: txn };
  }

  adjustUserPoints(userId: string, pointsDelta: number): { success: boolean; points: number; user?: User } {
    const user = this.getUserById(userId);
    if (!user) return { success: false, points: 0 };
    user.points = Math.max(0, (user.points || 0) + pointsDelta);
    return { success: true, points: user.points, user };
  }

  adjustCreatorEarnings(params: {
    creatorId: string;
    amount: number;
    reason: string;
    adminId: string;
    adminUsername: string;
  }): { success: boolean; error?: string; event?: RevenueEvent } {
    const creator = this.getUserById(params.creatorId);
    if (!creator) return { success: false, error: 'Creator not found' };

    const event: RevenueEvent = {
      id: 'rev_adj_' + Date.now(),
      creatorId: creator.id,
      adId: 'admin_manual',
      adTitle: 'Manual Earnings Adjustment',
      type: 'admin_adjustment',
      grossRevenue: params.amount,
      creatorRevenue: params.amount,
      platformRevenue: 0,
      creatorSharePercent: 100,
      isValid: true,
      createdAt: new Date().toISOString()
    };

    this.revenueEvents.unshift(event);

    this.createNotification({
      userId: creator.id,
      actorId: params.adminId,
      actor: {
        id: params.adminId,
        username: params.adminUsername,
        displayName: 'TikTok Finance',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
      },
      type: 'system',
      text: `Earnings adjustment: ${params.amount >= 0 ? '+' : ''}$${params.amount.toFixed(2)} USD (${params.reason}).`
    });

    this.createAuditLog({
      adminId: params.adminId,
      adminUsername: params.adminUsername,
      action: 'creator_earnings_adjusted',
      targetId: creator.id,
      targetType: 'user',
      targetPreview: `@${creator.username} - ${params.amount >= 0 ? '+' : ''}$${params.amount.toFixed(2)} USD`,
      reason: params.reason
    });

    return { success: true, event };
  }

  getPlatformMonetizationStats(): PlatformMonetizationStats {
    const validEvents = this.revenueEvents.filter(e => e.isValid);
    const totalGrossRevenue = Number(validEvents.reduce((acc, e) => acc + (e.grossRevenue || 0), 0).toFixed(2));
    const totalCreatorEarnings = Number(validEvents.reduce((acc, e) => acc + (e.creatorRevenue || 0), 0).toFixed(2));
    const totalPlatformRevenue = Number(validEvents.reduce((acc, e) => acc + (e.platformRevenue || 0), 0).toFixed(2));

    const totalPaidOut = Number(
      this.payoutRequests
        .filter(p => p.status === 'completed')
        .reduce((acc, p) => acc + p.amount, 0)
        .toFixed(2)
    );
    const pendingPayouts = this.payoutRequests.filter(p => p.status === 'pending' || p.status === 'processing');
    const totalPendingPayouts = Number(pendingPayouts.reduce((acc, p) => acc + p.amount, 0).toFixed(2));

    const bannerImps = validEvents.filter(e => e.type === 'banner_impression').length;
    const bannerClicks = validEvents.filter(e => e.type === 'banner_click').length;
    const fsImps = validEvents.filter(e => e.type === 'fullscreen_impression').length;
    const fsClicks = validEvents.filter(e => e.type === 'fullscreen_click').length;

    const totalViews = this.videos.reduce((acc, v) => acc + v.viewsCount, 0);
    const averageRpm = totalViews > 0 ? Number(((totalGrossRevenue / totalViews) * 1000).toFixed(2)) : 4.50;

    return {
      totalGrossRevenue,
      totalCreatorEarnings,
      totalPlatformRevenue,
      totalPaidOut,
      totalPendingPayouts,
      pendingPayoutsCount: pendingPayouts.length,
      totalValidBannerImpressions: bannerImps,
      totalValidBannerClicks: bannerClicks,
      totalValidFullscreenImpressions: fsImps,
      totalValidFullscreenClicks: fsClicks,
      totalBlockedFraudEvents: this.blockedFraudEventsCount,
      averageRpm
    };
  }

  // --- Audit Logs ---
  getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createAuditLog(entry: {
    adminId: string;
    adminUsername: string;
    action: string;
    targetId: string;
    targetType: 'video' | 'user' | 'copyright_report' | 'report' | 'ad' | 'settings';
    targetPreview?: string;
    reason: string;
    details?: string;
  }): AuditLogEntry {
    const newLog: AuditLogEntry = {
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...entry,
      createdAt: new Date().toISOString()
    };
    this.auditLogs.unshift(newLog);
    return newLog;
  }

  // --- Creator Violations History ---
  getCreatorViolations(userId: string): CopyrightViolationRecord[] {
    return this.copyrightViolations.filter(v => v.userId === userId);
  }

  addCopyrightViolation(record: Omit<CopyrightViolationRecord, 'id' | 'createdAt'>): CopyrightViolationRecord {
    const newRecord: CopyrightViolationRecord = {
      id: 'viol_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...record,
      createdAt: new Date().toISOString()
    };
    this.copyrightViolations.unshift(newRecord);
    return newRecord;
  }

  // --- Reports & Copyright Moderation ---
  getReports(): Report[] {
    return this.reports;
  }

  getCopyrightReports(): Report[] {
    const copyrightReports = this.reports.filter(r => r.type === 'copyright' || !!r.copyrightData);
    // Enrich with target video and creator information
    return copyrightReports.map(report => {
      const video = this.videos.find(v => v.id === report.targetId);
      const creator = video ? this.getUserById(video.userId) : undefined;
      const strikes = creator ? (creator.copyrightStrikesCount || 0) : 0;
      const violations = creator ? this.getCreatorViolations(creator.id).length : 0;

      return {
        ...report,
        targetVideo: video,
        targetCreator: creator,
        creatorStrikesCount: strikes,
        creatorViolationsCount: violations
      };
    });
  }

  createReport(report: Report): Report {
    // Crucial constraint: Do NOT delete videos automatically upon report creation.
    // Reports enter 'pending' state awaiting human moderation review.
    this.reports.unshift(report);
    return report;
  }

  updateReportStatus(
    id: string,
    status: 'pending' | 'under_review' | 'resolved' | 'dismissed',
    opts?: {
      adminId?: string;
      adminUsername?: string;
      action?: 'video_removed' | 'strike_issued' | 'creator_banned' | 'warning_issued' | 'dismissed' | 'none';
      reason?: string;
      adminNotes?: string;
    }
  ): Report | undefined {
    const report = this.reports.find(r => r.id === id);
    if (!report) return undefined;

    report.status = status;
    report.updatedAt = new Date().toISOString();

    if (opts) {
      if (opts.adminId) report.reviewedBy = opts.adminId;
      if (opts.adminNotes) report.adminNotes = opts.adminNotes;
      if (opts.action) report.actionTaken = opts.action;

      const adminId = opts.adminId || 'user_admin';
      const adminUsername = opts.adminUsername || 'admin';
      const reason = opts.reason || opts.adminNotes || `Status updated to ${status}`;

      // Handle specific action side effects
      if (opts.action === 'video_removed') {
        const video = this.videos.find(v => v.id === report.targetId);
        if (video) {
          video.status = 'removed';
          // Notify creator
          this.createNotification({
            userId: video.userId,
            actorId: adminId,
            type: 'system',
            text: `Your video "${video.caption.slice(0, 40)}..." was removed following a copyright infringement claim resolution.`,
            videoId: video.id,
            videoThumbnail: video.thumbnailUrl
          });
        }
      } else if (opts.action === 'strike_issued') {
        const video = this.videos.find(v => v.id === report.targetId);
        if (video) {
          const creator = this.getUserById(video.userId);
          if (creator) {
            creator.copyrightStrikesCount = (creator.copyrightStrikesCount || 0) + 1;
            // Record violation
            this.addCopyrightViolation({
              userId: creator.id,
              videoId: video.id,
              videoCaption: video.caption,
              videoThumbnail: video.thumbnailUrl,
              reportId: report.id,
              claimType: report.copyrightData?.claimType || 'copyright_infringement',
              originalWorkTitle: report.copyrightData?.originalWorkTitle || 'Copyrighted Asset',
              reason: reason,
              actionTaken: 'strike_issued',
              adminId,
              adminUsername
            });
            // System Notification
            this.createNotification({
              userId: creator.id,
              actorId: adminId,
              type: 'system',
              text: `⚠️ Copyright Strike Issued: Strike #${creator.copyrightStrikesCount} has been applied to your account for copyright infringement.`,
              videoId: video.id,
              videoThumbnail: video.thumbnailUrl
            });
          }
          video.status = 'removed';
        }
      } else if (opts.action === 'creator_banned') {
        const video = this.videos.find(v => v.id === report.targetId);
        const creatorId = video ? video.userId : (report.type === 'user' ? report.targetId : undefined);
        if (creatorId) {
          const creator = this.getUserById(creatorId);
          if (creator) {
            creator.isBanned = true;
          }
        }
      }

      // Record in persistent Audit Log
      this.createAuditLog({
        adminId,
        adminUsername,
        action: `copyright_${status}${opts.action ? '_' + opts.action : ''}`,
        targetId: report.id,
        targetType: 'copyright_report',
        targetPreview: report.targetPreview || `Report on ${report.targetId}`,
        reason: reason,
        details: opts.adminNotes
      });
    }

    return report;
  }

  issueCopyrightStrike(
    creatorId: string,
    videoId: string,
    reportId: string,
    reason: string,
    adminId: string = 'user_admin',
    adminUsername: string = 'admin'
  ): { success: boolean; creator?: User; newStrikeCount: number } {
    const creator = this.getUserById(creatorId);
    if (!creator) return { success: false, newStrikeCount: 0 };

    creator.copyrightStrikesCount = (creator.copyrightStrikesCount || 0) + 1;
    const video = this.videos.find(v => v.id === videoId);

    // Record violation
    this.addCopyrightViolation({
      userId: creator.id,
      videoId: videoId,
      videoCaption: video ? video.caption : 'Video ' + videoId,
      videoThumbnail: video?.thumbnailUrl,
      reportId: reportId || 'admin_manual_strike',
      claimType: 'copyright_strike',
      originalWorkTitle: reason,
      reason: reason,
      actionTaken: 'strike_issued',
      adminId,
      adminUsername
    });

    // Write audit log
    this.createAuditLog({
      adminId,
      adminUsername,
      action: 'creator_copyright_strike_issued',
      targetId: creator.id,
      targetType: 'user',
      targetPreview: `@${creator.username} (${creator.displayName})`,
      reason,
      details: `Strike #${creator.copyrightStrikesCount} issued by admin.`
    });

    // Notify creator
    this.createNotification({
      userId: creator.id,
      actorId: adminId,
      type: 'system',
      text: `⚠️ Official Copyright Strike #${creator.copyrightStrikesCount} has been applied to your profile. Reason: ${reason}`,
      videoId: videoId,
      videoThumbnail: video?.thumbnailUrl
    });

    return { success: true, creator, newStrikeCount: creator.copyrightStrikesCount };
  }

  // --- Admin Stats ---
  getAdminStats(): AdminStats {
    const bannerAds = this.ads.filter(a => a.type === 'banner');
    const fullscreenAds = this.ads.filter(a => a.type === 'fullscreen');

    const totalViews = this.videos.reduce((acc, v) => acc + v.viewsCount, 0);
    const totalLikes = this.videos.reduce((acc, v) => acc + v.likesCount, 0);
    const totalComments = this.videos.reduce((acc, v) => acc + v.commentsCount, 0);

    const totalBannerImpressions = bannerAds.reduce((acc, a) => acc + a.impressions, 0);
    const totalBannerClicks = bannerAds.reduce((acc, a) => acc + a.clicks, 0);

    const totalFullscreenImpressions = fullscreenAds.reduce((acc, a) => acc + a.impressions, 0);
    const totalFullscreenClicks = fullscreenAds.reduce((acc, a) => acc + a.clicks, 0);

    const pendingCopyrightReports = this.reports.filter(
      r => (r.type === 'copyright' || !!r.copyrightData) && (r.status === 'pending' || r.status === 'under_review')
    ).length;

    const totalCopyrightStrikes = this.users.reduce((acc, u) => acc + (u.copyrightStrikesCount || 0), 0);
    const monetizationStats = this.getPlatformMonetizationStats();

    return {
      totalUsers: this.users.length,
      totalVideos: this.videos.length,
      totalViews,
      totalLikes,
      totalComments,
      totalBannerImpressions,
      totalBannerClicks,
      totalFullscreenImpressions,
      totalFullscreenClicks,
      activeBannerAds: bannerAds.filter(a => a.isActive).length,
      activeFullscreenAds: fullscreenAds.filter(a => a.isActive).length,
      pendingReports: this.reports.filter(r => r.status === 'pending').length,
      pendingCopyrightReports,
      totalCopyrightStrikes,
      totalAuditLogs: this.auditLogs.length,
      monetizationStats
    };
  }

  // --- Search & Discover Engine ---
  getDiscoverData(currentUserId?: string): DiscoverData {
    const activeUsersMap = new Map(
      this.users
        .filter(u => !u.isBanned && (!currentUserId || (!this.isBlocked(currentUserId, u.id) && !this.isMutedBy(currentUserId, u.id))))
        .map(u => [u.id, u])
    );
    const publicVideos = this.videos.filter(
      v => v.status === 'active' && activeUsersMap.has(v.userId) && (!currentUserId || (!this.isBlocked(currentUserId, v.userId) && !this.isMutedBy(currentUserId, v.userId)))
    );

    // Trending calculation based on views, likes, comments, shares, and recency
    const now = Date.now();
    const scoredVideos = publicVideos.map(v => {
      const ageHours = Math.max(0, (now - new Date(v.createdAt).getTime()) / 3600000);
      const recencyWeight = 1 / (1 + ageHours * 0.04);
      const engagementScore = (v.viewsCount * 1.0) + (v.likesCount * 3.5) + (v.commentsCount * 5.0) + (v.sharesCount * 7.0);
      const trendingScore = engagementScore * recencyWeight;
      return { video: v, score: trendingScore };
    });

    scoredVideos.sort((a, b) => b.score - a.score);
    const trendingVideos = scoredVideos.map(item => this.attachVideoFlags(item.video, currentUserId));

    const popularVideos = [...publicVideos]
      .sort((a, b) => b.viewsCount - a.viewsCount || b.likesCount - a.likesCount)
      .map(v => this.attachVideoFlags(v, currentUserId));

    // Trending Hashtags aggregation
    const tagMap = new Map<string, { count: number; views: number }>();
    publicVideos.forEach(v => {
      v.hashtags.forEach(tag => {
        const clean = tag.toLowerCase().replace('#', '').trim();
        if (!clean) return;
        const current = tagMap.get(clean) || { count: 0, views: 0 };
        tagMap.set(clean, {
          count: current.count + 1,
          views: current.views + v.viewsCount
        });
      });
    });

    const trendingHashtags: HashtagInfo[] = Array.from(tagMap.entries())
      .map(([tag, data]) => ({
        tag,
        videoCount: data.count,
        viewsCount: data.views,
        isTrending: true
      }))
      .sort((a, b) => (b.viewsCount * 2 + b.videoCount * 100) - (a.viewsCount * 2 + a.videoCount * 100));

    // Popular creators
    const popularCreators = this.users
      .filter(u => !u.isBanned && (!currentUserId || (!this.isBlocked(currentUserId, u.id) && !this.isMutedBy(currentUserId, u.id))))
      .sort((a, b) => b.followersCount - a.followersCount)
      .map(u => ({
        ...u,
        isFollowing: currentUserId ? this.userFollows.has(`${currentUserId}:${u.id}`) : false
      }));

    return {
      trendingVideos,
      popularVideos,
      trendingHashtags,
      popularCreators
    };
  }

  search(query: string, currentUserId?: string): SearchResults {
    const raw = (query || '').trim().toLowerCase();
    const cleanTagQuery = raw.replace('#', '');
    const activeUsersMap = new Map(
      this.users
        .filter(u => !u.isBanned && (!currentUserId || (!this.isBlocked(currentUserId, u.id) && !this.isMutedBy(currentUserId, u.id))))
        .map(u => [u.id, u])
    );
    const publicVideos = this.videos.filter(
      v => v.status === 'active' && activeUsersMap.has(v.userId) && (!currentUserId || (!this.isBlocked(currentUserId, v.userId) && !this.isMutedBy(currentUserId, v.userId)))
    );

    // 1. User search (profile pic, username, displayName, bio, followers count, follow button state)
    const users = this.users
      .filter(u => !u.isBanned && (!currentUserId || (!this.isBlocked(currentUserId, u.id) && !this.isMutedBy(currentUserId, u.id))) && (
        u.username.toLowerCase().includes(raw) ||
        u.displayName.toLowerCase().includes(raw) ||
        u.bio.toLowerCase().includes(raw)
      ))
      .sort((a, b) => {
        // Exact prefix match ranks higher
        const aExact = a.username.toLowerCase().startsWith(raw) ? 1 : 0;
        const bExact = b.username.toLowerCase().startsWith(raw) ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        return b.followersCount - a.followersCount;
      })
      .map(u => ({
        ...u,
        isFollowing: currentUserId ? this.userFollows.has(`${currentUserId}:${u.id}`) : false
      }));

    // 2. Video search (caption, hashtags, creator, audio)
    const videos = publicVideos
      .filter(v =>
        v.caption.toLowerCase().includes(raw) ||
        v.hashtags.some(h => h.toLowerCase().includes(cleanTagQuery)) ||
        v.user.username.toLowerCase().includes(raw) ||
        v.user.displayName.toLowerCase().includes(raw) ||
        v.musicName.toLowerCase().includes(raw)
      )
      .sort((a, b) => {
        // Boost hashtag matches if query starts with #
        if (raw.startsWith('#')) {
          const aHasTag = a.hashtags.some(h => h.toLowerCase() === cleanTagQuery) ? 1 : 0;
          const bHasTag = b.hashtags.some(h => h.toLowerCase() === cleanTagQuery) ? 1 : 0;
          if (aHasTag !== bHasTag) return bHasTag - aHasTag;
        }
        return (b.viewsCount + b.likesCount * 3) - (a.viewsCount + a.likesCount * 3);
      })
      .map(v => this.attachVideoFlags(v, currentUserId));

    // 3. Hashtag search
    const tagMap = new Map<string, { count: number; views: number }>();
    publicVideos.forEach(v => {
      v.hashtags.forEach(tag => {
        const clean = tag.toLowerCase().replace('#', '').trim();
        if (!clean) return;
        const current = tagMap.get(clean) || { count: 0, views: 0 };
        tagMap.set(clean, {
          count: current.count + 1,
          views: current.views + v.viewsCount
        });
      });
    });

    const hashtags: HashtagInfo[] = Array.from(tagMap.entries())
      .filter(([tag]) => tag.includes(cleanTagQuery))
      .map(([tag, data]) => ({
        tag,
        videoCount: data.count,
        viewsCount: data.views,
        isTrending: true
      }))
      .sort((a, b) => {
        const aExact = a.tag === cleanTagQuery ? 1 : 0;
        const bExact = b.tag === cleanTagQuery ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        return b.viewsCount - a.viewsCount;
      });

    // 4. Combined Top results
    const top = {
      creators: users.slice(0, 3),
      hashtags: hashtags.slice(0, 4),
      videos: videos.slice(0, 12)
    };

    return {
      top,
      videos,
      users,
      hashtags
    };
  }

  // --- Notification Methods ---
  createNotification(data: {
    userId: string;
    actorId: string;
    actor?: {
      id: string;
      username: string;
      displayName?: string;
      avatarUrl: string;
      isVerified?: boolean;
    };
    type: 'like' | 'comment' | 'follow' | 'reply' | 'system';
    text: string;
    videoId?: string;
    videoThumbnail?: string;
    commentId?: string;
    read?: boolean;
  }): NotificationItem | null {
    // 1. Prevent self-notifications
    if (data.userId === data.actorId && data.type !== 'system') {
      return null;
    }

    // 2. De-duplicate rapid notifications for likes / follows
    if (data.type === 'like' && data.videoId) {
      const existing = this.notifications.find(
        n => n.userId === data.userId && n.actorId === data.actorId && n.type === 'like' && n.videoId === data.videoId
      );
      if (existing) {
        // Update timestamp and mark as unread
        existing.createdAt = new Date().toISOString();
        existing.read = false;
        return existing;
      }
    } else if (data.type === 'follow') {
      const existing = this.notifications.find(
        n => n.userId === data.userId && n.actorId === data.actorId && n.type === 'follow'
      );
      if (existing) {
        existing.createdAt = new Date().toISOString();
        existing.read = false;
        return existing;
      }
    }

    const defaultActor = {
      id: data.actorId || 'system',
      username: 'TikTok Moderation',
      displayName: 'Copyright & Safety Team',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    };

    const notification: NotificationItem = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: data.userId,
      actorId: data.actorId,
      actor: data.actor ? {
        id: data.actor.id,
        username: data.actor.username,
        displayName: data.actor.displayName || data.actor.username,
        avatarUrl: data.actor.avatarUrl,
      } : defaultActor,
      type: data.type,
      text: data.text,
      videoId: data.videoId,
      videoThumbnail: data.videoThumbnail,
      commentId: data.commentId,
      read: data.read ?? false,
      createdAt: new Date().toISOString()
    };

    this.notifications.unshift(notification);
    return notification;
  }

  getNotifications(userId: string): NotificationItem[] {
    return this.notifications.filter(n => n.userId === userId && !this.isBlocked(userId, n.actorId));
  }

  getUnreadNotificationsCount(userId: string): number {
    return this.notifications.filter(n => n.userId === userId && !n.read && !this.isBlocked(userId, n.actorId)).length;
  }

  markNotificationAsRead(id: string, userId: string): boolean {
    const notif = this.notifications.find(n => n.id === id && n.userId === userId);
    if (!notif) return false;
    notif.read = true;
    return true;
  }

  markAllNotificationsAsRead(userId: string): number {
    let count = 0;
    this.notifications.forEach(n => {
      if (n.userId === userId && !n.read) {
        n.read = true;
        count++;
      }
    });
    return count;
  }

  deleteNotification(id: string, userId: string): boolean {
    const idx = this.notifications.findIndex(n => n.id === id && n.userId === userId);
    if (idx === -1) return false;
    this.notifications.splice(idx, 1);
    return true;
  }
}

export const db = new Database();
