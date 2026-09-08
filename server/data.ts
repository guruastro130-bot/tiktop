import {
  User,
  Video,
  Comment,
  Ad,
  AdSettings,
  Report,
  NotificationItem,
  AuditLogEntry,
  CopyrightViolationRecord,
  RevenueEvent,
  PayoutRequest,
  WithdrawalRequest,
  GiftTransaction,
} from '../src/types';

export const INITIAL_USERS: User[] = [
  {
    id: 'firebase_auth_uid_123',
    userId: 'firebase_auth_uid_123',
    username: 'shambhu_lamsal',
    displayName: 'Shambhu Lamsal',
    name: 'Shambhu Lamsal',
    email: 'shambhu.lamsal@gmail.com',
    phone: '9812345678',
    phoneNumber: '+9779812345678',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    bio: 'TikTok Creator & Live Streamer 🇳🇵 #NepalLive #Creator',
    followersCount: 18400,
    followingCount: 56,
    likesReceivedCount: 92000,
    coinBalance: 5000,       // रिचार्ज गरेर किनेको कोइन
    pointsBalance: 120000,   // लाइभ बसेर कमाएको पोइन्ट
    totalEarned: 120000,     // कुल आर्जन
    points: 120000,
    isVerified: true,
    role: 'user',
    copyrightStrikesCount: 0,
    createdAt: '2026-06-05',
  },
  {
    id: 'user_admin',
    username: 'admin',
    displayName: 'TikTok Admin',
    email: 'admin@tiktok.app',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    bio: 'Platform Administrator & Safety Guardian 🛡️',
    followersCount: 14200,
    followingCount: 35,
    likesReceivedCount: 98400,
    points: 750000, // 7.5 Lakh Points (Eligible for Cashout)
    isVerified: true,
    role: 'admin',
    copyrightStrikesCount: 0,
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'user_sarah',
    username: 'sarah_dance',
    displayName: 'Sarah Jenkins ✨',
    email: 'sarah@tiktok.app',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    bio: 'Dancer & Choreographer based in LA 💃 New routine every Tuesday! #dance #energy',
    followersCount: 852000,
    followingCount: 210,
    likesReceivedCount: 4200000,
    points: 520000, // 5.2 Lakh Points (Eligible for Cashout)
    isVerified: true,
    role: 'user',
    copyrightStrikesCount: 0,
    createdAt: '2025-01-10T12:00:00Z',
  },
  {
    id: 'user_marco',
    username: 'chef_marco',
    displayName: 'Chef Marco Rossi 🍳',
    email: 'marco@tiktok.app',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bio: 'Quick 60-second authentic Italian recipes 🍝 Food is love! #cooking #pasta',
    followersCount: 630000,
    followingCount: 140,
    likesReceivedCount: 3100000,
    points: 340000, // 3.4 Lakh Points (Insufficient Balance test state: unlocks at 5 lakh)
    isVerified: true,
    role: 'user',
    copyrightStrikesCount: 1,
    createdAt: '2025-01-15T09:30:00Z',
  },
  {
    id: 'user_tech',
    username: 'tech_pulse',
    displayName: 'Alex Rivers ⚡ Tech',
    email: 'alex@tiktok.app',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    bio: 'Futuristic gadgets, AI tools & daily desk setups 💻 #tech #gadgets #future',
    followersCount: 412000,
    followingCount: 89,
    likesReceivedCount: 1950000,
    points: 480000, // 4.8 Lakh Points (Close to 5 lakh)
    isVerified: true,
    role: 'user',
    copyrightStrikesCount: 0,
    createdAt: '2025-02-01T14:20:00Z',
  },
  {
    id: 'user_sophia',
    username: 'fit_sophia',
    displayName: 'Sophia Chen 🏋️‍♀️',
    email: 'sophia@tiktok.app',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    bio: '15-min home HIIT & wellness habits 💪 Let’s stay active together! #fitness #workout',
    followersCount: 520000,
    followingCount: 310,
    likesReceivedCount: 2750000,
    points: 680000,
    isVerified: false,
    role: 'user',
    copyrightStrikesCount: 0,
    createdAt: '2025-02-10T18:00:00Z',
  },
  {
    id: 'user_urban',
    username: 'urban_explorer',
    displayName: 'Leo Wilder 🌍',
    email: 'leo@tiktok.app',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    bio: 'Exploring hidden gems, neon nightscapes, and rooftop views 🌆 #travel #explore',
    followersCount: 340000,
    followingCount: 190,
    likesReceivedCount: 1420000,
    points: 210000,
    isVerified: false,
    role: 'user',
    copyrightStrikesCount: 0,
    createdAt: '2025-02-12T11:15:00Z',
  },
  {
    id: 'user_A',
    userId: 'user_A',
    username: 'user_a',
    displayName: 'Viewer A (समर्थक)',
    name: 'Viewer A',
    email: 'user_a@example.com',
    phone: '9800000001',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    bio: 'TikTok Nepal Enthusiast & Top Gifter 🎁',
    followersCount: 320,
    followingCount: 145,
    likesReceivedCount: 1200,
    coinBalance: 25000,
    pointsBalance: 5000,
    totalEarned: 5000,
    points: 5000,
    role: 'user',
    copyrightStrikesCount: 0,
    createdAt: '2026-06-01',
  },
  {
    id: 'creator_B',
    userId: 'creator_B',
    username: 'creator_b',
    displayName: 'Creator B (लाइभ होस्ट)',
    name: 'Creator B',
    email: 'creator_b@example.com',
    phone: '9800000002',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bio: 'Popular Live Streamer 🇳🇵 Singer & Host',
    followersCount: 45000,
    followingCount: 120,
    likesReceivedCount: 240000,
    coinBalance: 1200,
    pointsBalance: 350000,
    totalEarned: 850000,
    points: 350000,
    isVerified: true,
    role: 'user',
    copyrightStrikesCount: 0,
    createdAt: '2026-05-15',
  }
];

export const INITIAL_WITHDRAWAL_REQUESTS: WithdrawalRequest[] = [
  {
    id: 'w_req_001',
    requestId: 'w_req_001',
    userId: 'firebase_auth_uid_123',
    username: 'shambhu_lamsal',
    userName: 'Shambhu Lamsal',
    fullName: 'Shambhu Lamsal',
    phone: '9812345678',
    mobileNumber: '9812345678',
    paymentMethod: 'eSewa',
    pointsDeducted: 500000,
    requestedNPR: 500,
    amountNpr: 500,
    serviceCharge: 40,
    serviceChargeNpr: 40,
    netPayout: 460,
    finalPayoutNpr: 460,
    status: 'Pending',
    timestamp: '2026-06-05T12:00:00Z',
    requestedAt: '2026-06-05T12:00:00Z'
  },
  {
    id: 'wdraw_1',
    userId: 'user_admin',
    username: 'admin',
    fullName: 'Ramesh Adhikari (रमेश अधिकारी)',
    paymentMethod: 'esewa',
    mobileNumber: '9841234567',
    pointsDeducted: 500000,
    amountNpr: 500,
    status: 'approved',
    requestedAt: '2026-08-25T14:30:00.000Z',
    processedAt: '2026-08-26T10:15:00.000Z',
    adminNotes: 'eSewa Direct Wallet Transfer Successful',
    transactionReference: 'ESEWA-TXN-8723910'
  },
  {
    id: 'wdraw_2',
    userId: 'user_sarah',
    username: 'sarah_dance',
    fullName: 'Sarah Jenkins (सोनिया अधिकारी)',
    paymentMethod: 'esewa',
    mobileNumber: '9841987654',
    pointsDeducted: 500000,
    amountNpr: 500,
    status: 'pending',
    requestedAt: '2026-08-31T08:20:00.000Z'
  },
  {
    id: 'wdraw_3',
    userId: 'user_marco',
    username: 'chef_marco',
    fullName: 'Marco Rossi (दिपेश गुरुङ)',
    paymentMethod: 'khalti',
    mobileNumber: '9801234567',
    pointsDeducted: 500000,
    amountNpr: 500,
    status: 'pending',
    requestedAt: '2026-08-31T11:45:00.000Z'
  },
  {
    id: 'wdraw_4',
    userId: 'user_tech',
    username: 'tech_insider',
    fullName: 'Bikash Thapa (बिकेश थापा)',
    paymentMethod: 'esewa',
    mobileNumber: '9861234567',
    pointsDeducted: 500000,
    amountNpr: 500,
    status: 'approved',
    requestedAt: '2026-08-28T09:10:00.000Z',
    processedAt: '2026-08-28T14:30:00.000Z',
    adminNotes: 'eSewa Mass-Transfer payout verified',
    transactionReference: 'ESEWA-TXN-884920'
  },
  {
    id: 'wdraw_5',
    userId: 'user_sophia',
    username: 'sophia_art',
    fullName: 'Sophia Maharjan (सोफिया महर्जन)',
    paymentMethod: 'khalti',
    mobileNumber: '9818765432',
    pointsDeducted: 500000,
    amountNpr: 500,
    status: 'approved',
    requestedAt: '2026-08-27T16:00:00.000Z',
    processedAt: '2026-08-28T09:00:00.000Z',
    adminNotes: 'Khalti merchant payout verified',
    transactionReference: 'KHALTI-PAY-449102'
  }
];

export const INITIAL_GIFT_TRANSACTIONS: GiftTransaction[] = [
  {
    id: 'tx_987',
    transactionId: 'tx_987',
    senderId: 'user_A',
    senderName: 'Viewer A (समर्थक)',
    creatorId: 'creator_B',
    creatorName: 'Creator B (लाइभ होस्ट)',
    giftName: 'Car 🚗',
    giftPrice: 5000,
    platformCommission: 1500, // ३०% कमिसन (तपाईँको आम्दानी)
    creatorEarnings: 3500,   // ७०% क्रिएटरको भाग
    timestamp: '2026-06-05T12:30:00Z',
    roomId: 'live_voice_1'
  }
];

// Curated list of reliable vertical and high quality video loops
export const INITIAL_VIDEOS: Video[] = [
  {
    id: 'vid_1',
    userId: 'user_sarah',
    user: {
      id: 'user_sarah',
      username: 'sarah_dance',
      displayName: 'Sarah Jenkins ✨',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      isVerified: true
    },
    videoUrl: '/videos/sample_dance.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
    caption: 'Neon stage lighting and new choreography! Who wants the full tutorial breakdown? 💃🔥 #dance #choreography #fyp #energy',
    musicName: 'Midnight Beat - Sarah & Beatmakers',
    musicAuthor: 'Beatmaker Collective',
    hashtags: ['dance', 'choreography', 'fyp', 'energy'],
    likesCount: 142300,
    commentsCount: 2840,
    sharesCount: 11200,
    viewsCount: 685000,
    duration: 15,
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    status: 'active',
    createdAt: '2025-03-01T10:00:00Z'
  },
  {
    id: 'vid_2',
    userId: 'user_marco',
    user: {
      id: 'user_marco',
      username: 'chef_marco',
      displayName: 'Chef Marco Rossi 🍳',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      isVerified: true
    },
    videoUrl: '/videos/sample_cooking.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    caption: 'Secret to silky smooth carbonara without heavy cream! Rule #1: Use guanciale and egg yolks only 🍝👨‍🍳 #foodtok #cooking #pasta #italian',
    musicName: 'Italian Summer Accordion - Roma Trio',
    musicAuthor: 'Roma Trio',
    hashtags: ['foodtok', 'cooking', 'pasta', 'italian'],
    likesCount: 98400,
    commentsCount: 1950,
    sharesCount: 8400,
    viewsCount: 420000,
    duration: 15,
    isLiked: true,
    isSaved: true,
    isFollowing: true,
    status: 'active',
    createdAt: '2025-03-02T14:30:00Z'
  },
  {
    id: 'vid_3',
    userId: 'user_tech',
    user: {
      id: 'user_tech',
      username: 'tech_pulse',
      displayName: 'Alex Rivers ⚡ Tech',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      isVerified: true
    },
    videoUrl: '/videos/sample_tech.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    caption: 'The minimalist desk upgrade you actually need in 2025. Wireless charging pad + magnetic cable dock ⚡🖥️ #tech #setup #gadgets #productivity',
    musicName: 'Cyber Ambient Synth - LoFi Wave',
    musicAuthor: 'LoFi Wave',
    hashtags: ['tech', 'setup', 'gadgets', 'productivity'],
    likesCount: 231000,
    commentsCount: 3410,
    sharesCount: 19800,
    viewsCount: 910000,
    duration: 15,
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    status: 'active',
    createdAt: '2025-03-03T18:45:00Z'
  },
  {
    id: 'vid_4',
    userId: 'user_sophia',
    user: {
      id: 'user_sophia',
      username: 'fit_sophia',
      displayName: 'Sophia Chen 🏋️‍♀️',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
      isVerified: false
    },
    videoUrl: '/videos/sample_fitness.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
    caption: 'Try this quick 4-move core burner! 30 seconds each, 3 rounds. No equipment needed! 💥🔥 #fitness #homeworkout #abs #motivation',
    musicName: 'Pump It Up Beats - Fitness Club',
    musicAuthor: 'Fitness Club',
    hashtags: ['fitness', 'homeworkout', 'abs', 'motivation'],
    likesCount: 76500,
    commentsCount: 890,
    sharesCount: 6200,
    viewsCount: 310000,
    duration: 15,
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    status: 'active',
    createdAt: '2025-03-04T08:15:00Z'
  },
  {
    id: 'vid_5',
    userId: 'user_urban',
    user: {
      id: 'user_urban',
      username: 'urban_explorer',
      displayName: 'Leo Wilder 🌍',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
      isVerified: false
    },
    videoUrl: '/videos/sample_travel.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80',
    caption: 'Rooftop golden hour over Tokyo. Have you ever seen neon reflections like this? 🇯🇵✨ #travel #tokyo #rooftop #aesthetic #cityvibes',
    musicName: 'Tokyo City Lights - Shibuya Drift',
    musicAuthor: 'Shibuya Sound',
    hashtags: ['travel', 'tokyo', 'rooftop', 'aesthetic', 'cityvibes'],
    likesCount: 312000,
    commentsCount: 4120,
    sharesCount: 25400,
    viewsCount: 1250000,
    duration: 15,
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    status: 'active',
    createdAt: '2025-03-05T20:10:00Z'
  },
  {
    id: 'vid_6',
    userId: 'user_sarah',
    user: {
      id: 'user_sarah',
      username: 'sarah_dance',
      displayName: 'Sarah Jenkins ✨',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      isVerified: true
    },
    videoUrl: '/videos/sample_sunset.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=600&auto=format&fit=crop&q=80',
    caption: 'Syncing steps with the sunset lighting on Santa Monica pier 🌅 Comment your favorite dance style! #dance #sunset #santamonica #viral',
    musicName: 'Summer Breeze Groove - DJ Ocean',
    musicAuthor: 'DJ Ocean',
    hashtags: ['dance', 'sunset', 'santamonica', 'viral'],
    likesCount: 189000,
    commentsCount: 2150,
    sharesCount: 14300,
    viewsCount: 780000,
    duration: 15,
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    status: 'active',
    createdAt: '2025-03-06T17:00:00Z'
  },
  {
    id: 'vid_7',
    userId: 'user_marco',
    user: {
      id: 'user_marco',
      username: 'chef_marco',
      displayName: 'Chef Marco Rossi 🍳',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      isVerified: true
    },
    videoUrl: '/videos/sample_cooking.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
    caption: 'Handcrafted Neapolitan Pizza Margherita in wood fired oven! 48-hour fermented dough is pure magic 🍕🍅 #pizza #food #chef #recipe',
    musicName: 'Tarantella Bella - Napoli Express',
    musicAuthor: 'Napoli Express',
    hashtags: ['pizza', 'food', 'chef', 'recipe'],
    likesCount: 145000,
    commentsCount: 1820,
    sharesCount: 9900,
    viewsCount: 590000,
    duration: 15,
    isLiked: false,
    isSaved: false,
    isFollowing: true,
    status: 'active',
    createdAt: '2025-03-07T12:00:00Z'
  },
  {
    id: 'vid_8',
    userId: 'user_tech',
    user: {
      id: 'user_tech',
      username: 'tech_pulse',
      displayName: 'Alex Rivers ⚡ Tech',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      isVerified: true
    },
    videoUrl: '/videos/sample_gaming.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
    caption: 'Testing this transparent mechanical keyboard with custom OLED screen ⌨️🔊 Sound test at the end! #keyboard #tech #asmr #gadgets',
    musicName: 'Key Clicks & Lo-Fi Chill',
    musicAuthor: 'KeySound Studio',
    hashtags: ['keyboard', 'tech', 'asmr', 'gadgets'],
    likesCount: 420000,
    commentsCount: 6500,
    sharesCount: 31000,
    viewsCount: 1800000,
    duration: 15,
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    status: 'active',
    createdAt: '2025-03-08T15:30:00Z'
  },
  {
    id: 'vid_9',
    userId: 'user_sophia',
    user: {
      id: 'user_sophia',
      username: 'fit_sophia',
      displayName: 'Sophia Chen 🏋️‍♀️',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
      isVerified: false
    },
    videoUrl: '/videos/sample_pet.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&auto=format&fit=crop&q=80',
    caption: 'Post-run recovery routine. Don’t skip dynamic stretching! Save this for after your next 5k 🏃‍♀️🧘‍♀️ #running #recovery #stretch #health',
    musicName: 'Zen Flow Meditation - Calm Wave',
    musicAuthor: 'Calm Wave',
    hashtags: ['running', 'recovery', 'stretch', 'health'],
    likesCount: 88900,
    commentsCount: 740,
    sharesCount: 5100,
    viewsCount: 360000,
    duration: 15,
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    status: 'active',
    createdAt: '2025-03-09T09:00:00Z'
  },
  {
    id: 'vid_10',
    userId: 'user_urban',
    user: {
      id: 'user_urban',
      username: 'urban_explorer',
      displayName: 'Leo Wilder 🌍',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
      isVerified: false
    },
    videoUrl: '/videos/sample_travel.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
    caption: 'Found this unreal mountain waterfall hidden deep inside the Pacific Northwest forest 🌲💧 #nature #hiking #waterfall #adventure',
    musicName: 'Into The Wild - Wanderlust Beats',
    musicAuthor: 'Wanderlust Beats',
    hashtags: ['nature', 'hiking', 'waterfall', 'adventure'],
    likesCount: 512000,
    commentsCount: 5890,
    sharesCount: 42000,
    viewsCount: 2100000,
    duration: 15,
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    status: 'active',
    createdAt: '2025-03-10T16:20:00Z'
  },
  {
    id: 'vid_11',
    userId: 'user_sarah',
    user: {
      id: 'user_sarah',
      username: 'sarah_dance',
      displayName: 'Sarah Jenkins ✨',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      isVerified: true
    },
    videoUrl: '/videos/sample_fashion.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    caption: 'Backstage vibes right before taking the main stage! Heart is racing 💖⚡ #backstage #dancer #tour #liveperformance',
    musicName: 'Electric Heartbeat - Neon Sound',
    musicAuthor: 'Neon Sound',
    hashtags: ['backstage', 'dancer', 'tour', 'liveperformance'],
    likesCount: 220000,
    commentsCount: 2900,
    sharesCount: 15600,
    viewsCount: 890000,
    duration: 15,
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    status: 'active',
    createdAt: '2025-03-11T19:00:00Z'
  },
  {
    id: 'vid_12',
    userId: 'user_marco',
    user: {
      id: 'user_marco',
      username: 'chef_marco',
      displayName: 'Chef Marco Rossi 🍳',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      isVerified: true
    },
    videoUrl: '/videos/sample_comedy.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
    caption: 'Traditional Tiramisu with espresso soaked savoiardi & rich mascarpone cream ☕🍰 Sweet dreams! #dessert #tiramisu #italianfood',
    musicName: 'Dolce Vita Melody - Acoustic Guitar',
    musicAuthor: 'Acoustic Guitar Band',
    hashtags: ['dessert', 'tiramisu', 'italianfood'],
    likesCount: 168000,
    commentsCount: 2100,
    sharesCount: 11500,
    viewsCount: 670000,
    duration: 15,
    isLiked: false,
    isSaved: false,
    isFollowing: true,
    status: 'active',
    createdAt: '2025-03-12T11:40:00Z'
  }
];

export const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'comm_1',
    videoId: 'vid_1',
    userId: 'user_sophia',
    user: {
      id: 'user_sophia',
      username: 'fit_sophia',
      displayName: 'Sophia Chen 🏋️‍♀️',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
      isVerified: false
    },
    text: 'The timing on the beat drop was unbelievable! Need this tutorial ASAP 🔥👏',
    likesCount: 420,
    isLiked: true,
    createdAt: '2025-03-01T10:15:00Z'
  },
  {
    id: 'comm_2',
    videoId: 'vid_1',
    userId: 'user_tech',
    user: {
      id: 'user_tech',
      username: 'tech_pulse',
      displayName: 'Alex Rivers ⚡ Tech',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      isVerified: true
    },
    text: 'Lighting director did an incredible job on this shot. 10/10 production value!',
    likesCount: 185,
    isLiked: false,
    createdAt: '2025-03-01T10:45:00Z'
  },
  {
    id: 'comm_3',
    videoId: 'vid_2',
    userId: 'user_sarah',
    user: {
      id: 'user_sarah',
      username: 'sarah_dance',
      displayName: 'Sarah Jenkins ✨',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      isVerified: true
    },
    text: 'Making this for dinner tonight! Saving right now 😍🍝',
    likesCount: 310,
    isLiked: false,
    createdAt: '2025-03-02T15:00:00Z'
  }
];

// Initial Banner Ads (Automatic rotation on every video)
export const INITIAL_BANNER_ADS: Ad[] = [
  {
    id: 'ad_b1',
    type: 'banner',
    title: 'GlowSkin Peptide Serum',
    description: 'Hydrate & brighten in 7 days. Dermatologist approved.',
    ctaText: 'Shop 30% Off',
    mediaUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80',
    destinationUrl: 'https://example.com/glowskin',
    sponsorName: 'GlowSkin Labs',
    sponsorLogo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    badgeText: 'Sponsored',
    isActive: true,
    priority: 8,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    impressions: 48920,
    clicks: 2130,
    createdAt: '2025-01-10T00:00:00Z'
  },
  {
    id: 'ad_b2',
    type: 'banner',
    title: 'Nordic Audio Pro Buds',
    description: 'Active Noise Cancellation with 48hr battery life.',
    ctaText: 'Get Yours',
    mediaUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80',
    destinationUrl: 'https://example.com/nordicaudio',
    sponsorName: 'Nordic Sound',
    sponsorLogo: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    badgeText: 'Promoted',
    isActive: true,
    priority: 9,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    impressions: 61400,
    clicks: 3420,
    createdAt: '2025-01-12T00:00:00Z'
  },
  {
    id: 'ad_b3',
    type: 'banner',
    title: 'TurboVPN Ultra Fast',
    description: 'Military-grade privacy & unblock global streaming.',
    ctaText: '3 Months Free',
    mediaUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&auto=format&fit=crop&q=80',
    destinationUrl: 'https://example.com/turbovpn',
    sponsorName: 'TurboShield',
    sponsorLogo: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100&auto=format&fit=crop&q=80',
    badgeText: 'Ad',
    isActive: true,
    priority: 7,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    impressions: 39800,
    clicks: 1890,
    createdAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'ad_b4',
    type: 'banner',
    title: 'FitFuel Clean Protein',
    description: '100% plant-based organic recovery blend. Zero sugar.',
    ctaText: 'Try Starter Pack',
    mediaUrl: 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=400&auto=format&fit=crop&q=80',
    destinationUrl: 'https://example.com/fitfuel',
    sponsorName: 'FitFuel Organics',
    sponsorLogo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
    badgeText: 'Sponsored',
    isActive: true,
    priority: 6,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    impressions: 27500,
    clicks: 1240,
    createdAt: '2025-01-18T00:00:00Z'
  }
];

// Google Official Sample / Test AdMob IDs (for safe dev/testing without risking account ban)
export const ADMOB_TEST_CONFIG = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  bannerUnitId: 'ca-app-pub-3940256099942544/6300978111',
  rewardedUnitId: 'ca-app-pub-3940256099942544/5224354917',
};

// Real Live Production AdMob IDs (configured for live publishing)
export const ADMOB_LIVE_CONFIG = {
  appId: 'ca-app-pub-977092633792186~7605665418',
  bannerUnitId: 'ca-app-pub-977092633792186/4461566677',
  rewardedUnitId: 'ca-app-pub-977092633792186/526899383',
};

export const ADMOB_CONFIG = ADMOB_LIVE_CONFIG;

// Initial Full-Screen Ads (Triggered after 10 valid videos)
export const INITIAL_FULLSCREEN_ADS: Ad[] = [
  {
    id: 'ad_f1',
    type: 'fullscreen',
    title: 'CyberDrive GT - Next-Gen All-Electric SUV',
    description: 'Experience 0-60 in 3.1s with autonomous highway assist and panoramic augmented cockpit display.',
    ctaText: 'Book Free Test Drive',
    mediaUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1000&auto=format&fit=crop&q=80',
    destinationUrl: 'https://example.com/cyberdrive',
    sponsorName: 'CyberDrive Motors',
    sponsorLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
    badgeText: 'AdMob Rewarded',
    adMobUnitId: ADMOB_CONFIG.rewardedUnitId,
    isActive: true,
    priority: 10,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    impressions: 8940,
    clicks: 720,
    createdAt: '2025-01-05T00:00:00Z'
  },
  {
    id: 'ad_f2',
    type: 'fullscreen',
    title: 'StreamFlix Ultimate - Stream 10,000+ Blockbusters in 4K HDR',
    description: 'Unlimited access to original films, trending anime, and live sporting events on any screen.',
    ctaText: 'Start 30-Day Free Trial',
    mediaUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1000&auto=format&fit=crop&q=80',
    destinationUrl: 'https://example.com/streamflix',
    sponsorName: 'StreamFlix Entertainment',
    sponsorLogo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    badgeText: 'AdMob Rewarded',
    adMobUnitId: ADMOB_CONFIG.rewardedUnitId,
    isActive: true,
    priority: 9,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    impressions: 7420,
    clicks: 610,
    createdAt: '2025-01-08T00:00:00Z'
  },
  {
    id: 'ad_f3',
    type: 'fullscreen',
    title: 'AeroPulse HyperRun - Featherlight Carbon Racing Shoes',
    description: 'Engineered with responsive aerospace foam to return 85% energy on every single stride.',
    ctaText: 'Unlock Exclusive 25% Off',
    mediaUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&auto=format&fit=crop&q=80',
    destinationUrl: 'https://example.com/aeropulse',
    sponsorName: 'AeroPulse Athletics',
    sponsorLogo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    badgeText: 'AdMob Rewarded',
    adMobUnitId: ADMOB_CONFIG.rewardedUnitId,
    isActive: true,
    priority: 8,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    impressions: 5930,
    clicks: 490,
    createdAt: '2025-01-14T00:00:00Z'
  }
];

export const INITIAL_AD_SETTINGS: AdSettings = {
  fullscreenAdInterval: 10, // After every 10 valid videos
  validViewThresholdSeconds: 10.0, // 10.0 seconds minimum genuine playback for valid view & points
  minAdVisibilitySeconds: 1.0, // 1 second minimum ad visibility for valid impression
  bannerAdsEnabled: true,
  fullscreenAdsEnabled: true,
  bannerRefreshSeconds: 20,
  enableAds: true,
  isTestMode: false, // Set false for production, true for sandbox test ads
  adMobAppId: 'ca-app-pub-977092633792186~7605665418',
  adMobBannerUnitId: 'ca-app-pub-977092633792186/4461566677',
  adMobRewardedUnitId: 'ca-app-pub-977092633792186/526899383',
  adMobTestAppId: 'ca-app-pub-3940256099942544~3347511713',
  adMobTestBannerUnitId: 'ca-app-pub-3940256099942544/6300978111',
  adMobTestRewardedUnitId: 'ca-app-pub-3940256099942544/5224354917',
  adFrequencyCooldownSeconds: 45, // 45 seconds cooldown to prevent repeating same ad to same user
  // Anti-Cheat & Security
  bannerRewardPoints: 50, // 50 points per 10s video watch
  rewardCooldownSeconds: 10.0, // 10 seconds inter-claim cooldown
  autoClickerMaxBurstPer10s: 3, // Max 3 requests in 10s window before triggering auto-click security lock
  securityLockDurationSeconds: 15, // 15 seconds cooldown when suspicious burst detected
  strictForegroundValidation: true, // Enforce tab/window visibility check
  bannerCpm: 3.50, // $3.50 CPM ($0.0035 per impression)
  bannerCpc: 0.20, // $0.20 per verified click
  fullscreenCpm: 9.00, // $9.00 CPM ($0.009 per impression)
  fullscreenCpc: 0.50, // $0.50 per verified click
  creatorSharePercent: 55, // 55% of revenue credited to creator
  platformSharePercent: 45, // 45% retained by platform
  minPayoutThreshold: 20.00, // Minimum $20.00 to request payout
  enableMonetization: true, // Global monetization active
  // Admin Guard & Instant Telegram Alerts
  adminPassword: 'TikTopAdmin@2026', // Default secret admin password
  telegramBotToken: '', // Enter Telegram Bot Token e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
  telegramChatId: '', // Enter your Telegram Chat ID e.g. 987654321
  telegramAlertsEnabled: true, // Instant Telegram push alert on user withdrawal
};

export const INITIAL_REPORTS: Report[] = [
  {
    id: 'rep_cp_1',
    type: 'copyright',
    targetId: 'vid_1',
    targetPreview: 'Neon stage lighting and new choreography! #dance #energy',
    reporterId: 'user_tech',
    reporterUsername: 'tech_pulse',
    reason: 'Unlicensed Audio & Commercial Choreography Track',
    details: 'This video includes 15 seconds of the registered studio track "Midnight Beat" by Beatmaker Collective without digital broadcast synchronization rights.',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    copyrightData: {
      claimType: 'unlicensed_music',
      originalWorkTitle: 'Midnight Beat (Original Master)',
      originalWorkUrl: 'https://example.com/soundtracks/midnight-beat',
      claimantName: 'Alex Rivers (Beatmaker Rights LLC)',
      claimantEmail: 'legal@beatmakercollective.io',
      claimantOrganization: 'Beatmaker Music Publishing Ltd.',
      relationshipToOwner: 'authorized_agent',
      legalDeclarationConfirmed: true,
      notes: 'Please review audio stems between 0:00 - 0:15.'
    }
  },
  {
    id: 'rep_cp_2',
    type: 'copyright',
    targetId: 'vid_2',
    targetPreview: 'Secret to silky smooth carbonara without heavy cream! 🍝👨‍🍳',
    reporterId: 'user_sophia',
    reporterUsername: 'fit_sophia',
    reason: 'Direct B-roll footage clip lifted without license',
    details: 'Video incorporates 4 seconds of copyrighted cooking masterclass footage produced for Culinary Arts TV.',
    status: 'under_review',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    copyrightData: {
      claimType: 'footage_clip',
      originalWorkTitle: 'Authentic Roman Pasta Masterclass Ep. 4',
      originalWorkUrl: 'https://example.com/culinary/roman-pasta-ep4',
      claimantName: 'Sophia Chen',
      claimantEmail: 'licensing@culinaryarts.media',
      claimantOrganization: 'Culinary Arts Media Group',
      relationshipToOwner: 'owner',
      legalDeclarationConfirmed: true,
      notes: 'Timestamp 0:04 - 0:08 matches our master reels.'
    }
  },
  {
    id: 'rep_cp_3',
    type: 'copyright',
    targetId: 'vid_5',
    targetPreview: 'Rooftop golden hour over Tokyo skyline...',
    reporterId: 'user_sarah',
    reporterUsername: 'sarah_dance',
    reason: 'Stolen Full Video Re-upload',
    details: 'This exact drone sequence was filmed by our studio and reposted without credit.',
    status: 'resolved',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    reviewedBy: 'user_admin',
    adminNotes: 'Confirmed match with creator portfolio. Warning issued and attribution resolved.',
    actionTaken: 'warning_issued',
    copyrightData: {
      claimType: 'video_reupload',
      originalWorkTitle: 'Tokyo Twilight 4K Drone Reel',
      originalWorkUrl: 'https://example.com/tokyo-twilight',
      claimantName: 'Sarah Jenkins',
      claimantEmail: 'sarah@danceproductions.la',
      claimantOrganization: 'Jenkins Visuals LLC',
      relationshipToOwner: 'owner',
      legalDeclarationConfirmed: true,
    }
  },
  {
    id: 'rep_1',
    type: 'video',
    targetId: 'vid_3',
    targetPreview: 'Desk setup transformation with ambient light bars...',
    reporterId: 'user_urban',
    reporterUsername: 'urban_explorer',
    reason: 'Spam or Misleading Content',
    details: 'Links in comments redirect to unverified affiliate site.',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString()
  }
];

export const INITIAL_COPYRIGHT_VIOLATIONS: CopyrightViolationRecord[] = [
  {
    id: 'viol_1',
    userId: 'user_marco',
    videoId: 'vid_2',
    videoCaption: 'Classic Carbonara Pasta Tips #foodtok #cooking',
    videoThumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    reportId: 'rep_cp_prev_101',
    claimType: 'footage_clip',
    originalWorkTitle: 'Italian Culinary Series Footage',
    reason: 'Uncredited broadcast B-roll segment without synchronization clearance.',
    actionTaken: 'strike_issued',
    adminId: 'user_admin',
    adminUsername: 'admin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString()
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit_1',
    adminId: 'user_admin',
    adminUsername: 'admin',
    action: 'copyright_strike_issued',
    targetId: 'user_marco',
    targetType: 'user',
    targetPreview: '@chef_marco (Marco Rossi)',
    reason: 'Repeated uncredited third-party video clip usage in cooking reel',
    details: '1st official copyright strike applied to creator profile.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString()
  },
  {
    id: 'audit_2',
    adminId: 'user_admin',
    adminUsername: 'admin',
    action: 'copyright_report_resolved',
    targetId: 'rep_cp_3',
    targetType: 'copyright_report',
    targetPreview: 'Claim on "Tokyo Twilight 4K Drone Reel"',
    reason: 'Claimant verified and mutual attribution resolved with creator.',
    details: 'Warning notice dispatched to uploader without account suspension.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
  },
  {
    id: 'audit_3',
    adminId: 'user_admin',
    adminUsername: 'admin',
    action: 'copyright_mark_under_review',
    targetId: 'rep_cp_2',
    targetType: 'copyright_report',
    targetPreview: 'Claim on "Authentic Roman Pasta Masterclass Ep. 4"',
    reason: 'Audio and video stream analysis pending review by senior moderation.',
    details: 'Claimant contacted at licensing@culinaryarts.media for proof of license.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_admin_1',
    userId: 'user_admin',
    actorId: 'user_sophia',
    actor: {
      id: 'user_sophia',
      username: 'fit_sophia',
      displayName: 'Sophia Chen 🏋️‍♀️',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    },
    type: 'like',
    text: 'liked your video.',
    videoId: 'vid_1',
    videoThumbnail: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  },
  {
    id: 'notif_admin_2',
    userId: 'user_admin',
    actorId: 'user_marco',
    actor: {
      id: 'user_marco',
      username: 'chef_marco',
      displayName: 'Chef Marco Rossi 🍳',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    },
    type: 'comment',
    text: 'commented on your video.',
    videoId: 'vid_1',
    videoThumbnail: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
    commentId: 'comm_1',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
  },
  {
    id: 'notif_admin_3',
    userId: 'user_admin',
    actorId: 'user_urban',
    actor: {
      id: 'user_urban',
      username: 'urban_explorer',
      displayName: 'Leo Wilder 🌍',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    },
    type: 'follow',
    text: 'started following you.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString()
  },
  {
    id: 'notif_admin_4',
    userId: 'user_admin',
    actorId: 'user_sarah',
    actor: {
      id: 'user_sarah',
      username: 'sarah_dance',
      displayName: 'Sarah Jenkins ✨',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    },
    type: 'reply',
    text: 'replied to your comment.',
    videoId: 'vid_1',
    videoThumbnail: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
    commentId: 'comm_2',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: 'notif_1',
    userId: 'user_sarah',
    actorId: 'user_sophia',
    actor: {
      id: 'user_sophia',
      username: 'fit_sophia',
      displayName: 'Sophia Chen 🏋️‍♀️',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    },
    type: 'like',
    text: 'liked your video.',
    videoId: 'vid_1',
    videoThumbnail: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
    read: false,
    createdAt: '2025-03-01T10:16:00Z'
  },
  {
    id: 'notif_2',
    userId: 'user_sarah',
    actorId: 'user_marco',
    actor: {
      id: 'user_marco',
      username: 'chef_marco',
      displayName: 'Chef Marco Rossi 🍳',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    },
    type: 'follow',
    text: 'started following you.',
    read: true,
    createdAt: '2025-03-02T08:00:00Z'
  }
];

export const INITIAL_REVENUE_EVENTS: RevenueEvent[] = [
  {
    id: 'rev_ev_1',
    creatorId: 'user_sarah',
    videoId: 'vid_1',
    videoCaption: 'Neon stage lighting and new choreography! #dance #energy',
    adId: 'ad_b_1',
    adTitle: 'GlowFit Energy Drink - Fuel Your Flow',
    type: 'banner_impression',
    grossRevenue: 0.0035,
    creatorRevenue: 0.001925,
    platformRevenue: 0.001575,
    creatorSharePercent: 55,
    isValid: true,
    clientId: 'user_tech',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
  },
  {
    id: 'rev_ev_2',
    creatorId: 'user_sarah',
    videoId: 'vid_1',
    videoCaption: 'Neon stage lighting and new choreography! #dance #energy',
    adId: 'ad_b_1',
    adTitle: 'GlowFit Energy Drink - Fuel Your Flow',
    type: 'banner_click',
    grossRevenue: 0.20,
    creatorRevenue: 0.11,
    platformRevenue: 0.09,
    creatorSharePercent: 55,
    isValid: true,
    clientId: 'user_tech',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
  },
  {
    id: 'rev_ev_3',
    creatorId: 'user_sarah',
    videoId: 'vid_1',
    videoCaption: 'Neon stage lighting and new choreography! #dance #energy',
    adId: 'ad_f_1',
    adTitle: 'CyberVision Pro - Next-Gen Smart AR Glasses',
    type: 'fullscreen_impression',
    grossRevenue: 0.009,
    creatorRevenue: 0.00495,
    platformRevenue: 0.00405,
    creatorSharePercent: 55,
    isValid: true,
    clientId: 'user_marco',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  },
  {
    id: 'rev_ev_4',
    creatorId: 'user_sarah',
    videoId: 'vid_1',
    videoCaption: 'Neon stage lighting and new choreography! #dance #energy',
    adId: 'ad_f_1',
    adTitle: 'CyberVision Pro - Next-Gen Smart AR Glasses',
    type: 'fullscreen_click',
    grossRevenue: 0.50,
    creatorRevenue: 0.275,
    platformRevenue: 0.225,
    creatorSharePercent: 55,
    isValid: true,
    clientId: 'user_marco',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  },
  {
    id: 'rev_ev_5',
    creatorId: 'user_sarah',
    videoId: 'vid_1',
    videoCaption: 'Neon stage lighting and new choreography! #dance #energy',
    adId: 'ad_b_2',
    adTitle: 'Nordic Roast Artisan Coffee Beans',
    type: 'creator_bonus',
    grossRevenue: 150.00,
    creatorRevenue: 150.00,
    platformRevenue: 0.00,
    creatorSharePercent: 100,
    isValid: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
  },
  {
    id: 'rev_ev_6',
    creatorId: 'user_marco',
    videoId: 'vid_2',
    videoCaption: 'Secret to silky smooth carbonara without heavy cream! 🍝👨‍🍳',
    adId: 'ad_b_2',
    adTitle: 'Nordic Roast Artisan Coffee Beans',
    type: 'banner_click',
    grossRevenue: 0.20,
    creatorRevenue: 0.11,
    platformRevenue: 0.09,
    creatorSharePercent: 55,
    isValid: true,
    clientId: 'user_sophia',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()
  },
  {
    id: 'rev_ev_7',
    creatorId: 'user_tech',
    videoId: 'vid_3',
    videoCaption: 'Desk setup transformation with ambient light bars...',
    adId: 'ad_f_1',
    adTitle: 'CyberVision Pro - Next-Gen Smart AR Glasses',
    type: 'fullscreen_click',
    grossRevenue: 0.50,
    creatorRevenue: 0.275,
    platformRevenue: 0.225,
    creatorSharePercent: 55,
    isValid: true,
    clientId: 'user_sarah',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
  },
  {
    id: 'rev_ev_8',
    creatorId: 'user_admin',
    videoId: 'vid_4',
    videoCaption: 'Morning routine for high performance and deep focus 🌅',
    adId: 'ad_b_1',
    adTitle: 'GlowFit Energy Drink - Fuel Your Flow',
    type: 'creator_bonus',
    grossRevenue: 75.00,
    creatorRevenue: 75.00,
    platformRevenue: 0.00,
    creatorSharePercent: 100,
    isValid: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
  }
];

export const INITIAL_PAYOUT_REQUESTS: PayoutRequest[] = [
  {
    id: 'payout_1',
    creatorId: 'user_sarah',
    creatorUsername: 'sarah_dance',
    creatorDisplayName: 'Sarah Jenkins ✨',
    amount: 50.00,
    currency: 'USD',
    method: 'paypal',
    accountDetails: 'sarah.jenkins.payouts@gmail.com',
    status: 'completed',
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    processedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    adminNotes: 'Verified legitimate creator earnings via PayPal MassPay',
    transactionReference: 'TXN-PAYPAL-982341'
  },
  {
    id: 'payout_2',
    creatorId: 'user_sarah',
    creatorUsername: 'sarah_dance',
    creatorDisplayName: 'Sarah Jenkins ✨',
    amount: 35.00,
    currency: 'USD',
    method: 'stripe',
    accountDetails: 'acct_1N9x7z8Y...',
    status: 'pending',
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
  },
  {
    id: 'payout_3',
    creatorId: 'user_marco',
    creatorUsername: 'chef_marco',
    creatorDisplayName: 'Chef Marco Rossi 🍳',
    amount: 25.00,
    currency: 'USD',
    method: 'bank_transfer',
    accountDetails: 'Chase Bank (•••• 4819)',
    status: 'processing',
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    adminNotes: 'ACH direct deposit submitted, clearing in 1-2 business days'
  }
];

