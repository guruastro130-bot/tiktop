export interface User {
  id: string;
  userId?: string; // Firebase Auth UID support (e.g. 'firebase_auth_uid_123')
  username: string;
  displayName: string;
  name?: string; // Nepali user name field (e.g. 'Shambhu Lamsal')
  email: string;
  phone?: string; // 10-digit mobile number (e.g. '9812345678')
  phoneNumber?: string;
  coinBalance?: number; // रिचार्ज गरेर किनेको कोइन (recharged coins for gifting)
  pointsBalance?: number; // लाइभ बसेर कमाएको पोइन्ट (earned live points)
  totalEarned?: number; // कुल आर्जन (total earned points/amount)
  authProvider?: 'email' | 'google' | 'facebook' | 'phone';
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  likesReceivedCount: number;
  points?: number; // User reward / watch points (e.g. 500,000)
  isVerified?: boolean;
  isBanned?: boolean;
  isBlocked?: boolean;
  isMuted?: boolean;
  isBlockedByTarget?: boolean;
  role: 'user' | 'admin';
  copyrightStrikesCount?: number;
  liveBannedUntil?: string | null; // 24-hour live ban timestamp
  liveViolationsCount?: number; // Number of times left camera empty / no person detected
  accountBannedUntil?: string | null; // 3-day account suspension timestamp
  accountBanReason?: string;
  lastLiveBanExpiredAt?: string | null;
  createdAt: string;
}

export type SupportedCountryCode = 'NP' | 'IN' | 'PK' | 'PH' | 'GLOBAL';

export interface LocalWalletConfig {
  id: string;
  name: string;
  country: SupportedCountryCode;
  countryName: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  ratePerNpr: number; // 1 NPR = X local currency (e.g., INR: 0.625, PKR: 2.1, PHP: 0.42, USD: 0.0075)
  accountPlaceholder: string;
  accountLabel: string;
  helpText: string;
  badgeColor: string;
}

export interface WithdrawalRequest {
  id: string;
  requestId?: string; // e.g. 'w_req_001'
  userId: string;
  username: string;
  userName?: string; // e.g. 'Shambhu Lamsal'
  fullName: string;
  phone?: string; // e.g. '9812345678'
  paymentMethod: 'esewa' | 'khalti' | 'eSewa' | 'Khalti' | string;
  mobileNumber: string;
  pointsDeducted: number; // e.g. 500,000 points
  requestedNPR?: number; // e.g. 500
  amountNpr: number; // e.g. 500 NPR requested
  serviceCharge?: number; // ८% काटिएको चार्ज (e.g. 40)
  serviceChargeNpr?: number; // 8% platform service charge (e.g. 40 NPR)
  netPayout?: number; // युजरले पाउने रकम (e.g. 460)
  finalPayoutNpr?: number; // Net payout received by user (e.g. 460 NPR)
  status: 'pending' | 'approved' | 'rejected' | 'Pending' | 'Approved' | 'Rejected';
  country?: SupportedCountryCode | string;
  countryName?: string;
  currency?: string;
  currencySymbol?: string;
  localAmount?: number;
  localServiceCharge?: number;
  localNetPayout?: number;
  accountHolderName?: string;
  accountNumber?: string;
  walletIdentifier?: string; // UPI ID / Phone / eSewa / GCash / Easypaisa / USDT
  timestamp?: string; // e.g. '2026-06-05T12:00:00Z'
  requestedAt: string;
  processedAt?: string;
  adminNotes?: string;
  transactionReference?: string;
}

export interface GiftTransaction {
  id?: string;
  transactionId: string;
  senderId: string;
  senderName?: string;
  creatorId: string;
  creatorName?: string;
  giftName: string;
  giftPrice: number; // e.g. 5000 (Coins)
  platformCommission: number; // ३०% कमिसन (तपाईँको आम्दानी) e.g. 1500
  creatorEarnings: number; // ७०% क्रिएटरको भाग e.g. 3500
  timestamp: string; // e.g. '2026-06-05T12:30:00Z'
  roomId?: string;
}

export interface RelationshipStatus {
  isBlocked: boolean;
  isMuted: boolean;
  isBlockedByTarget: boolean;
  isFollowing: boolean;
}

export interface VideoQualities {
  '720p'?: string;
  '480p'?: string;
  '360p'?: string;
  'auto'?: string;
}

export interface VideoCompressionStats {
  originalSizeMb: number;
  compressedSizeMb: number;
  savingsPercent: number;
  codec: string;
  resolution: string;
  processedAt?: string;
}

export interface Video {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified?: boolean;
  };
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  musicName: string;
  musicAuthor?: string;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  duration: number; // in seconds
  isLiked?: boolean;
  isSaved?: boolean;
  isFollowing?: boolean;
  status: 'active' | 'under_review' | 'removed';
  visibility?: 'public' | 'followers' | 'private';
  isPrivate?: boolean;
  isDraft?: boolean;
  recommendationReason?: string;
  recommendationScore?: number;
  qualities?: VideoQualities;
  compressionStats?: VideoCompressionStats;
  bannerAd?: Ad;
  createdAt: string;
}

export interface UserInterests {
  userId: string;
  hashtagWeights: Record<string, number>;
  creatorAffinities: Record<string, number>;
  totalWatchedCount: number;
  totalLikesCount: number;
  topHashtags: string[];
  lastActive: string;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified?: boolean;
  };
  text: string;
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
  parentId?: string;
}

export interface Ad {
  id: string;
  type: 'banner' | 'fullscreen';
  title: string;
  description: string;
  ctaText: string; // e.g. "Install Now", "Shop Now", "Learn More", "Order Food"
  mediaUrl: string; // Image or short video URL
  destinationUrl: string;
  sponsorName: string;
  sponsorLogo: string;
  badgeText?: string; // "Sponsored" | "Promoted" | "Ad" | "AdMob Rewarded"
  adMobUnitId?: string;
  isActive: boolean;
  priority: number; // 1 - 10
  startDate?: string;
  endDate?: string;
  impressions: number;
  clicks: number;
  brand?: string;
  imageUrl?: string;
  targetUrl?: string;
  active?: boolean;
  impressionRewardPoints?: number;
  clickRewardPoints?: number;
  createdAt: string;
}

export interface AdSettings {
  fullscreenAdInterval: number; // e.g. 10 valid videos
  validViewThresholdSeconds: number; // e.g. 10.0 seconds playback (strictly 10 seconds watch required for points)
  minAdVisibilitySeconds?: number; // e.g. 1.0 seconds for valid ad impression
  bannerAdsEnabled: boolean;
  fullscreenAdsEnabled: boolean;
  bannerRefreshSeconds: number; // e.g. 20
  enableAds: boolean;
  isTestMode?: boolean; // Google AdMob Test Mode toggle (true for dev/testing, false for production release)
  adMobAppId?: string;
  adMobBannerUnitId?: string;
  adMobRewardedUnitId?: string;
  adMobTestAppId?: string;
  adMobTestBannerUnitId?: string;
  adMobTestRewardedUnitId?: string;
  adFrequencyCooldownSeconds?: number; // Anti-repetition frequency capping in seconds (e.g. 45s)
  // Anti-Cheat & Security Settings
  bannerRewardPoints: number; // 50 points per valid 5s video watch
  rewardCooldownSeconds: number; // 5 seconds between reward claims
  autoClickerMaxBurstPer10s: number; // Max 3 requests in 10s window before triggering auto-click security lock
  securityLockDurationSeconds: number; // 15 seconds cooldown when suspicious burst detected
  strictForegroundValidation: boolean; // Enforce tab/window visibility check
  bannerCpm: number; // e.g. 3.50 ($3.50 per 1k impressions = $0.0035/imp)
  bannerCpc: number; // e.g. 0.20 ($0.20 per click)
  fullscreenCpm: number; // e.g. 9.00 ($9.00 per 1k impressions = $0.009/imp)
  fullscreenCpc: number; // e.g. 0.50 ($0.50 per click)
  creatorSharePercent: number; // e.g. 55%
  platformSharePercent: number; // e.g. 45%
  creatorRevenueSharePercent?: number; // alias
  platformRevenueSharePercent?: number; // alias
  minPayoutThreshold: number; // e.g. 20.00 USD
  enableMonetization: boolean; // toggle monetization system
  // Admin Guard & Instant Telegram Alerts
  adminPassword?: string; // Secret Admin Password (default: 'TikTopAdmin@2026')
  telegramBotToken?: string; // Telegram Bot API Token from @BotFather
  telegramChatId?: string; // Telegram Chat ID for instant admin alerts
  telegramAlertsEnabled?: boolean; // Instant withdrawal notifications toggle
  telegramLastAlertSentAt?: string;
}

export interface SecurityIncidentRecord {
  id: string;
  userId: string;
  username: string;
  type: 'rapid_swipe' | 'auto_clicker_burst' | 'duplicate_claim' | 'background_view' | 'bot_detected';
  severity: 'low' | 'medium' | 'high';
  videoId?: string;
  actionTaken: 'claim_rejected' | 'cooldown_applied' | 'warning_logged' | 'account_flagged';
  details: string;
  reason?: string;
  watchTimeSeconds?: number;
  burstCount?: number;
  ipAddress?: string;
  createdAt: string;
}

export interface AntiCheatStats {
  totalLegitimateRewardsGiven: number;
  totalPointsAwarded: number;
  totalRapidSwipesBlocked: number;
  totalAutoClickAttemptsBlocked: number;
  totalDuplicateClaimsPrevented: number;
  activeCooldownsCount: number;
  averageGenuineWatchTimeSec: number;
  incidents: SecurityIncidentRecord[];
  recentIncidents?: SecurityIncidentRecord[];
}

export interface RevenueEvent {
  id: string;
  creatorId: string;
  creatorUsername?: string;
  videoId?: string;
  videoCaption?: string;
  adId: string;
  adTitle?: string;
  type:
    | 'banner_impression'
    | 'banner_click'
    | 'fullscreen_impression'
    | 'fullscreen_click'
    | 'admin_adjustment'
    | 'creator_bonus';
  grossRevenue: number;
  creatorRevenue: number;
  platformRevenue: number;
  creatorSharePercent: number;
  isValid: boolean;
  fraudReason?: string;
  clientId?: string;
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  amount: number;
  currency: string;
  method: 'paypal' | 'bank_transfer' | 'stripe' | 'wire';
  accountDetails: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  adminNotes?: string;
  transactionReference?: string;
}

export interface CreatorEarningsSummary {
  userId: string;
  username: string;
  displayName: string;
  estimatedEarnings: number;
  totalLifetimeEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  totalPaidOut: number;
  totalValidImpressions: number;
  totalValidClicks: number;
  totalFilteredFraudEvents: number;
  creatorSharePercent: number;
  minPayoutThreshold: number;
  recentTransactions: RevenueEvent[];
  payouts: PayoutRequest[];
  revenueByVideo: {
    videoId: string;
    videoCaption: string;
    thumbnailUrl?: string;
    viewsCount: number;
    impressions: number;
    clicks: number;
    earnings: number;
  }[];
}

export interface PlatformMonetizationStats {
  totalGrossRevenue: number;
  totalCreatorEarnings: number;
  totalPlatformRevenue: number;
  totalPaidOut: number;
  totalPendingPayouts: number;
  pendingPayoutsCount: number;
  totalValidBannerImpressions: number;
  totalValidBannerClicks: number;
  totalValidFullscreenImpressions: number;
  totalValidFullscreenClicks: number;
  totalBlockedFraudEvents: number;
  averageRpm: number;
  totalValidImpressions?: number;
  totalValidClicks?: number;
  availableCreatorBalanceTotal?: number;
  pendingPayoutsAmount?: number;
  totalPayoutsDisbursed?: number;
  blockedFraudEventsCount?: number;
}

export interface CopyrightClaimData {
  claimType:
    | 'unlicensed_music'
    | 'video_reupload'
    | 'footage_clip'
    | 'artwork_logo'
    | 'other';
  originalWorkTitle: string;
  originalWorkUrl?: string;
  claimantName: string;
  claimantEmail: string;
  claimantOrganization?: string;
  relationshipToOwner: 'owner' | 'authorized_agent' | 'legal_representative';
  legalDeclarationConfirmed: boolean;
  infringementTimestamp?: string;
  notes?: string;
}

export interface CopyrightViolationRecord {
  id: string;
  userId: string;
  videoId: string;
  videoCaption: string;
  videoThumbnail?: string;
  reportId: string;
  claimType: string;
  originalWorkTitle: string;
  reason: string;
  actionTaken: 'video_removed' | 'strike_issued' | 'creator_banned' | 'warning_issued';
  adminId: string;
  adminUsername: string;
  timestamp?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminUsername: string;
  action: string;
  targetId: string;
  targetType: 'video' | 'user' | 'copyright_report' | 'report' | 'ad' | 'settings';
  targetPreview?: string;
  reason: string;
  details?: string;
  notes?: string;
  timestamp?: string;
  createdAt: string;
}

export interface Report {
  id: string;
  type: 'video' | 'user' | 'comment' | 'copyright';
  targetId: string;
  targetPreview?: string;
  reporterId: string;
  reporterUsername: string;
  reason: string;
  details?: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  // Copyright details (Accessible by authorized admins only)
  copyrightData?: CopyrightClaimData;
  reviewedBy?: string;
  adminNotes?: string;
  actionTaken?: string;
  // Enriched admin fields
  targetVideo?: Video;
  targetCreator?: User;
  creatorStrikesCount?: number;
  creatorViolationsCount?: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actorId: string;
  actor: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  type: 'like' | 'comment' | 'follow' | 'reply' | 'system';
  text: string;
  videoId?: string;
  videoThumbnail?: string;
  commentId?: string;
  read: boolean;
  createdAt: string;
}

export interface HashtagInfo {
  tag: string;
  videoCount: number;
  viewsCount: number;
  isTrending?: boolean;
}

export interface SearchResults {
  top: {
    creators: (User & { isFollowing?: boolean })[];
    hashtags: HashtagInfo[];
    videos: Video[];
  };
  videos: Video[];
  users: (User & { isFollowing?: boolean })[];
  hashtags: HashtagInfo[];
}

export interface DiscoverData {
  trendingVideos: Video[];
  popularVideos: Video[];
  trendingHashtags: HashtagInfo[];
  popularCreators: (User & { isFollowing?: boolean })[];
}

export interface AdminStats {
  totalUsers: number;
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalBannerImpressions: number;
  totalBannerClicks: number;
  totalFullscreenImpressions: number;
  totalFullscreenClicks: number;
  activeBannerAds: number;
  activeFullscreenAds: number;
  pendingReports: number;
  pendingCopyrightReports: number;
  totalCopyrightStrikes: number;
  totalAuditLogs: number;
  monetizationStats?: PlatformMonetizationStats;
  monetization?: PlatformMonetizationStats;
}

// ==========================================
// LIVE STREAMING & MULTI-GUEST VOICE ROOMS
// ==========================================

export type LiveStreamType = 'video' | 'voice';
export type VoiceSeatCount = 4 | 6 | 9;

export interface LiveSeat {
  seatIndex: number; // 0..3 (4 seats), 0..5 (6 seats), 0..8 (9 seats)
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified?: boolean;
  };
  isMuted?: boolean;
  isSpeaking?: boolean;
  isLocked?: boolean;
  joinedAt?: string;
}

export interface LiveGift {
  id: string;
  name: string;
  nameNp: string;
  icon: string;
  coins: number;
  category: 'popular' | 'nepal' | 'luxury' | 'romantic' | 'greeting' | 'lucky';
  animation: 'rose' | 'confetti' | 'lion' | 'car' | 'crown' | 'fire' | 'topi' | 'khukuri' | 'kiss' | 'romantic_kiss' | 'hug' | 'love' | 'miss_you' | 'ring' | 'night' | 'coffee' | 'greeting';
  emotionTag?: string;
  isLucky?: boolean;
}

export interface LiveMessage {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  text: string;
  type: 'chat' | 'gift' | 'system' | 'join' | 'seat_action';
  gift?: LiveGift;
  targetSeatIndex?: number;
  createdAt: string;
}

export interface LiveRoom {
  id: string;
  hostId: string;
  host: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified?: boolean;
  };
  title: string;
  type: LiveStreamType; // 'video' | 'voice'
  category: 'chat' | 'music' | 'gaming' | 'nepal' | 'talent' | 'chill';
  coverUrl: string;
  streamUrl?: string;
  viewerCount: number;
  likesCount: number;
  diamondCount: number;
  status: 'live' | 'ended';
  voiceSeatCount: VoiceSeatCount; // 4, 6, or 9 seats
  seats?: LiveSeat[];
  isUserHost?: boolean;
  bannerAd?: Ad; // Rotating banner ad while live
  activeFilter?: string; // Beauty & video filters
  isMicMuted?: boolean;
  isCameraOff?: boolean;
  isHostOnline?: boolean;
  localMediaStream?: any; // Active camera MediaStream for live host
  createdAt: string;
}

