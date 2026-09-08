import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { adEngine } from './server/adEngine';
import { recommendationEngine } from './server/recommendation';
import { antiCheatEngine } from './server/antiCheat';
import { sendWithdrawalTelegramAlert, sendTestTelegramAlert } from './server/telegram';
import { User, Video, Comment, Ad, Report } from './src/types';

export function createServerApp(): express.Express {
  const app = express();
  const PORT = 3000;

// Dedicated uploads directory for persistent video storage
  const UPLOADS_DIR = process.env.VERCEL
    ? path.join('/tmp', 'uploads')
    : path.join(process.cwd(), 'uploads');
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not create uploads directory:', err);
  }

  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));

  // --- HEALTH & STATUS ---
  app.get('/api/health', (req, res) => {
    return res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- EXPLICIT FEED ENDPOINTS ---
  app.get('/api/feed/for-you', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const videos = recommendationEngine.getRecommendedFeed(currentUserId, 30);
    return res.json({ videos });
  });

  app.get('/api/feed/trending', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const videos = recommendationEngine.getTrendingFeed(currentUserId, 30);
    return res.json({ videos });
  });

  app.get('/api/feed/following', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const allVideos = db.getVideos({ currentUserId });
    const followingVideos = allVideos.filter(v => v.isFollowing || v.userId === 'user_sarah' || v.userId === 'user_marco');
    return res.json({ videos: followingVideos.length > 0 ? followingVideos : allVideos });
  });

  // --- AUTH ROUTES ---
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
      return res.status(400).json({ error: 'Username, email or phone number required' });
    }

    const cleanIdentifier = identifier.trim();
    const user = db.getUserByEmailOrUsername(cleanIdentifier) || db.getUserByPhone(cleanIdentifier);
    if (!user) {
      return res.status(404).json({ error: 'User not found. Try creating a new account!' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'This account has been suspended by administration.' });
    }

    return res.json({ user, token: 'session_' + user.id });
  });

  // 1-Tap Google / Facebook Social Auth & Instant ID Creation
  app.post('/api/auth/oauth', (req, res) => {
    const { provider, email, displayName, avatarUrl } = req.body;
    if (!provider || !['google', 'facebook'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid OAuth provider. Must be "google" or "facebook".' });
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : `${provider}_user_${Date.now()}@tiktok.app`;
    
    // Check if account already exists with this email or OAuth provider
    let existingUser = db.getUserByEmailOrUsername(cleanEmail);
    if (existingUser) {
      if (existingUser.isBanned) {
        return res.status(403).json({ error: 'This account has been suspended by administration.' });
      }
      return res.json({ user: existingUser, token: 'session_' + existingUser.id, isNew: false });
    }

    // Otherwise generate clean unique username from email or display name
    const rawName = displayName || (cleanEmail.includes('@') ? cleanEmail.split('@')[0] : `${provider}_user`);
    let baseUsername = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 18);
    if (baseUsername.length < 3) baseUsername = `${provider}_${Date.now().toString().slice(-4)}`;

    let candidateUsername = baseUsername;
    let counter = 1;
    while (db.getUserByEmailOrUsername(candidateUsername)) {
      candidateUsername = `${baseUsername}${counter++}`;
    }

    const defaultAvatar = avatarUrl || (provider === 'google' 
      ? `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80`
      : `https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80`);

    const newUser: User = {
      id: `user_${provider}_` + Date.now(),
      username: candidateUsername,
      displayName: displayName ? String(displayName).trim().slice(0, 50) : `${provider.toUpperCase()} Creator`,
      email: cleanEmail,
      authProvider: provider as 'google' | 'facebook',
      avatarUrl: defaultAvatar,
      bio: `Logged in via ${provider === 'google' ? 'Google' : 'Facebook'} ✨`,
      followersCount: 0,
      followingCount: 0,
      likesReceivedCount: 0,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser);
    return res.status(201).json({ user: newUser, token: 'session_' + newUser.id, isNew: true });
  });

  // Phone Number Auth & Registration (Country code + Phone + Password)
  app.post('/api/auth/phone', (req, res) => {
    const { phoneNumber, countryCode, password, displayName, mode } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const fullPhone = `${countryCode || '+977'}${String(phoneNumber).replace(/[^0-9]/g, '')}`.trim();
    const cleanDigits = String(phoneNumber).replace(/[^0-9]/g, '');

    if (cleanDigits.length < 7 || cleanDigits.length > 15) {
      return res.status(400).json({ error: 'Please enter a valid phone number (7-15 digits).' });
    }

    if (!password || String(password).length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }

    const existingUser = db.getUserByPhone(fullPhone) || db.getUserByPhone(cleanDigits);

    if (mode === 'login') {
      if (!existingUser) {
        return res.status(404).json({ error: 'No account found with this phone number. Please create an account!' });
      }
      if (existingUser.isBanned) {
        return res.status(403).json({ error: 'This account has been suspended by administration.' });
      }
      return res.json({ user: existingUser, token: 'session_' + existingUser.id });
    }

    // Registration mode
    if (existingUser) {
      // User already exists, log them in seamlessly
      return res.json({ user: existingUser, token: 'session_' + existingUser.id, existing: true });
    }

    const baseUsername = `user_${cleanDigits.slice(-4)}_${Math.floor(100 + Math.random() * 900)}`;
    const syntheticEmail = `${cleanDigits}@phone.tiktok.app`;

    const newUser: User = {
      id: 'user_phone_' + Date.now(),
      username: baseUsername,
      displayName: displayName ? String(displayName).trim().slice(0, 50) : `User ${cleanDigits.slice(-4)}`,
      email: syntheticEmail,
      phoneNumber: fullPhone,
      authProvider: 'phone',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanDigits}`,
      bio: `TikTok creator registered with phone ID 📱`,
      followersCount: 0,
      followingCount: 0,
      likesReceivedCount: 0,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser);
    return res.status(201).json({ user: newUser, token: 'session_' + newUser.id, isNew: true });
  });

  app.post('/api/auth/register', (req, res) => {
    const { username, displayName, email, phoneNumber, avatarUrl, bio } = req.body;
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required.' });
    }

    const cleanUsername = String(username).replace('@', '').trim().toLowerCase();
    
    // Validate username syntax (alphanumeric and underscores, 3-30 chars)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'Username must be 3-30 characters and contain only letters, numbers, and underscores.' });
    }

    // Validate email format
    const cleanEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const existing = db.getUserByEmailOrUsername(cleanUsername) || db.getUserByEmailOrUsername(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'Username or email is already registered.' });
    }

    const newUser: User = {
      id: 'user_' + Date.now(),
      username: cleanUsername,
      displayName: displayName ? String(displayName).trim().slice(0, 50) : cleanUsername,
      email: cleanEmail,
      phoneNumber: phoneNumber || undefined,
      authProvider: phoneNumber ? 'phone' : 'email',
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      bio: bio ? String(bio).trim().slice(0, 160) : 'Hello TikTok! 👋 New creator here.',
      followersCount: 0,
      followingCount: 0,
      likesReceivedCount: 0,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser);
    return res.status(201).json({ user: newUser, token: 'session_' + newUser.id });
  });

  app.post('/api/auth/logout', (req, res) => {
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  app.get('/api/auth/me', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const user = db.getUserById(userId) || db.getUserById('user_admin');
    return res.json({ user });
  });

  app.put('/api/auth/profile', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { displayName, bio, avatarUrl } = req.body;
    // Disallow role or banned modification via public profile route
    const safeUpdates: Partial<User> = {};
    if (displayName !== undefined) safeUpdates.displayName = String(displayName).trim().slice(0, 50);
    if (bio !== undefined) safeUpdates.bio = String(bio).trim().slice(0, 160);
    if (avatarUrl !== undefined) safeUpdates.avatarUrl = String(avatarUrl).trim();

    const updated = db.updateUser(userId, safeUpdates);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: updated });
  });

  // --- VIDEOS & RECOMMENDATION ROUTES ---
  app.get('/api/discover', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const trendingVideos = recommendationEngine.getTrendingFeed(currentUserId, 20);
    const trendingHashtags = recommendationEngine.getTrendingHashtags(currentUserId);
    const popularCreators = recommendationEngine.getPopularCreators(currentUserId);
    const recommendedVideos = recommendationEngine.getRecommendedFeed(currentUserId, 20);

    return res.json({
      trendingVideos,
      popularVideos: recommendedVideos,
      trendingHashtags,
      popularCreators,
    });
  });

  // Recommended "For You" Feed
  app.get('/api/feed/recommended', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const limit = req.query.limit ? Math.min(50, Number(req.query.limit)) : 30;
    const videos = recommendationEngine.getRecommendedFeed(currentUserId, limit);
    return res.json({ videos });
  });

  // Trending Feed
  app.get('/api/feed/trending', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const limit = req.query.limit ? Math.min(50, Number(req.query.limit)) : 30;
    const videos = recommendationEngine.getTrendingFeed(currentUserId, limit);
    return res.json({ videos });
  });

  // Trending Hashtags
  app.get('/api/trending/hashtags', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const hashtags = recommendationEngine.getTrendingHashtags(currentUserId);
    return res.json({ hashtags });
  });

  // Popular / Trending Creators
  app.get('/api/trending/creators', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const creators = recommendationEngine.getPopularCreators(currentUserId);
    return res.json({ creators });
  });

  // User Interests profile summary
  app.get('/api/user/interests', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const interests = recommendationEngine.getUserInterestsSummary(currentUserId);
    return res.json({ interests });
  });

  // Record user interaction for explicit interest learning (hashtag clicks, category views)
  app.post('/api/user/interests/interact', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const { hashtag, creatorId } = req.body;

    if (hashtag) {
      recommendationEngine.trackHashtagInteraction(currentUserId, hashtag);
    }
    if (creatorId) {
      recommendationEngine.trackCreatorFollow(currentUserId, creatorId, true);
    }

    const updated = recommendationEngine.getUserInterestsSummary(currentUserId);
    return res.json({ success: true, interests: updated });
  });

  app.get('/api/search', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const { q } = req.query;
    const queryStr = typeof q === 'string' ? q : '';
    const results = db.search(queryStr, currentUserId);
    return res.json({ results });
  });

  app.get('/api/videos', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const { userId, search, hashtag, feedType, forYou } = req.query;

    if (!userId && !search && !hashtag) {
      if (feedType === 'trending') {
        const videos = recommendationEngine.getTrendingFeed(currentUserId, 30);
        return res.json({ videos });
      }
      if (feedType === 'forYou' || forYou === 'true' || feedType === 'recommended' || !feedType) {
        const videos = recommendationEngine.getRecommendedFeed(currentUserId, 30);
        return res.json({ videos });
      }
    }

    const videos = db.getVideos({
      userId: userId as string,
      search: search as string,
      hashtag: hashtag as string,
      currentUserId
    });

    return res.json({ videos });
  });

  // Dedicated Video Upload & Storage Endpoint
  app.post('/api/videos/upload', (req, res) => {
    try {
      const { base64Data, fileName = 'video.mp4', mimeType = 'video/mp4' } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: 'Video file data is required.' });
      }

      // Clean base64 header if present
      const cleanBase64 = base64Data.replace(/^data:video\/[a-zA-Z0-9.-]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      const rawExt = path.extname(fileName).toLowerCase() || '.mp4';
      const fileExt = ['.mp4', '.webm', '.mov', '.ogg', '.m4v'].includes(rawExt) ? rawExt : '.mp4';
      const fileId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${fileExt}`;
      const filePath = path.join(UPLOADS_DIR, fileId);

      fs.writeFileSync(filePath, buffer);

      const streamUrl = `/api/videos/stream/${fileId}`;
      return res.status(201).json({
        success: true,
        fileId,
        streamUrl,
        sizeBytes: buffer.length,
        mimeType: mimeType || 'video/mp4'
      });
    } catch (err: any) {
      console.error('Error saving uploaded video file:', err);
      return res.status(500).json({ error: 'Failed to process and store uploaded video file.' });
    }
  });

  // High-performance Range-enabled Video Streaming Endpoint
  app.get('/api/videos/stream/:fileId', (req, res) => {
    try {
      const fileId = req.params.fileId;
      const safeFileName = path.basename(fileId);
      let filePath = path.join(UPLOADS_DIR, safeFileName);

      if (!fs.existsSync(filePath)) {
        const publicPath = path.join(process.cwd(), 'public', 'videos', safeFileName);
        if (fs.existsSync(publicPath)) {
          filePath = publicPath;
        } else {
          return res.status(404).json({ error: 'Video file not found' });
        }
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      const ext = path.extname(safeFileName).toLowerCase();
      let contentType = 'video/mp4';
      if (ext === '.webm') contentType = 'video/webm';
      if (ext === '.mov') contentType = 'video/quicktime';
      if (ext === '.ogg') contentType = 'video/ogg';

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
          return;
        }

        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes'
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err: any) {
      console.error('Video streaming error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Streaming error occurred' });
      }
    }
  });

  // Universal Video Stream Proxy for external video sources & CORS support
  app.get('/api/videos/proxy', async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).send('url parameter required');
    }

    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      const headers: Record<string, string> = {};
      if (req.headers.range) {
        headers['range'] = req.headers.range;
      }

      const upstream = await fetch(rawUrl, {
        headers
      });

      res.status(upstream.status);
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
      const contentRange = upstream.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);
      const contentLength = upstream.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      if (!upstream.body) {
        return res.end();
      }

      const arrayBuf = await upstream.arrayBuffer();
      return res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      console.error('Proxy streaming error:', err);
      return res.status(502).send('Error proxying video stream');
    }
  });

  // In-memory cache for processed video assets (prevents redundant transcoding/processing of same video)
  const videoProcessingCache = new Map<string, any>();

  // --- VIDEO UPLOAD & PROCESSING PIPELINE ROUTES ---
  app.post('/api/videos/validate', (req, res) => {
    const { fileType, fileSize, duration, fileName } = req.body;

    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-m4v',
      'video/ogg',
      'video/mp4v-es'
    ];

    const allowedExtensions = ['.mp4', '.mov', '.webm', '.m4v', '.ogg'];

    // 1. File Type / Extension Check
    const hasValidMime = fileType ? allowedTypes.some(t => fileType.toLowerCase().includes(t.replace('video/', ''))) || allowedTypes.includes(fileType.toLowerCase()) : true;
    const hasValidExt = fileName ? allowedExtensions.some(ext => fileName.toLowerCase().endsWith(ext)) : true;

    if (fileType && !hasValidMime && !hasValidExt) {
      return res.status(400).json({
        valid: false,
        error: `Unsupported video format (${fileType || 'unknown'}). Please upload MP4, WebM, or MOV.`
      });
    }

    // 2. File Size Check (Max 100MB)
    const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
    if (fileSize && Number(fileSize) > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (Number(fileSize) / (1024 * 1024)).toFixed(1);
      return res.status(400).json({
        valid: false,
        error: `File size (${sizeMb}MB) exceeds the maximum allowed limit of 100MB.`
      });
    }

    // 3. Duration Check (1 to 180 seconds)
    if (duration !== undefined && duration !== null) {
      const dur = Number(duration);
      if (dur < 1) {
        return res.status(400).json({
          valid: false,
          error: 'Video is too short. Minimum duration is 1 second.'
        });
      }
      if (dur > 180) {
        return res.status(400).json({
          valid: false,
          error: `Video is too long (${Math.round(dur)}s). Maximum duration for shorts is 180 seconds (3 minutes).`
        });
      }
    }

    return res.json({
      valid: true,
      message: 'Video passed server security & format validation',
      details: {
        fileType: fileType || 'video/mp4',
        fileSizeMb: fileSize ? (Number(fileSize) / (1024 * 1024)).toFixed(2) : '15.0',
        durationSec: duration ? Number(duration).toFixed(1) : '15.0'
      }
    });
  });

  app.get('/api/videos/:id', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const video = db.getVideoById(req.params.id, currentUserId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    return res.json({ video });
  });

  app.post('/api/videos/process', (req, res) => {
    const { videoUrl, fileSize, duration, width, height, fileName } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'videoUrl is required for video processing' });
    }

    // Check cache first to avoid re-processing identical media
    const cacheKey = `${videoUrl}_${fileSize || 0}_${duration || 0}`;
    if (videoProcessingCache.has(cacheKey)) {
      const cached = videoProcessingCache.get(cacheKey);
      return res.json({
        ...cached,
        cached: true,
        message: 'Retrieved optimized video profile from processing cache'
      });
    }

    const origSizeMb = fileSize ? Number((fileSize / (1024 * 1024)).toFixed(2)) : 18.5;
    // Calculate simulated mobile compression optimization (35% to 52% bandwidth reduction)
    const compressionRatio = 0.48; // 48% compression savings
    const compressedSizeMb = Number((origSizeMb * (1 - compressionRatio)).toFixed(2));
    const savingsPercent = Number((compressionRatio * 100).toFixed(1));

    // Multi-quality resolution streaming profiles
    const qualities = {
      '720p': videoUrl,
      '480p': videoUrl,
      '360p': videoUrl,
      'auto': videoUrl
    };

    const compressionStats = {
      originalSizeMb: origSizeMb,
      compressedSizeMb: compressedSizeMb,
      savingsPercent: savingsPercent,
      codec: 'H.264 / AAC (Web-Optimized FastStart)',
      resolution: width && height ? `${width}x${height} (9:16)` : '720x1280 (9:16)',
      processedAt: new Date().toISOString()
    };

    const processedData = {
      success: true,
      qualities,
      compressionStats,
      duration: duration ? Math.round(Number(duration)) : 15,
      cached: false
    };

    // Store in cache
    videoProcessingCache.set(cacheKey, processedData);

    return res.json(processedData);
  });

  app.post('/api/videos', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const author = db.getUserById(currentUserId) || db.getUserById('user_admin')!;
    const { videoUrl, thumbnailUrl, caption, musicName, hashtags, qualities, compressionStats, duration, bannerAd } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL or file is required' });
    }

    // Auto extract hashtags from caption if not explicitly provided
    const extractedTags = hashtags && hashtags.length > 0
      ? hashtags
      : (caption.match(/#[\w\u0590-\u05ff]+/g) || []).map((t: string) => t.replace('#', ''));

    const parsedDuration = duration ? Math.max(1, Math.min(180, Math.round(Number(duration)))) : 15;
    const assignedBanner = bannerAd || db.ads.find(a => a.type === 'banner' && a.isActive);

    const newVideo: Video = {
      id: 'vid_' + Date.now(),
      userId: author.id,
      user: {
        id: author.id,
        username: author.username,
        displayName: author.displayName,
        avatarUrl: author.avatarUrl,
        isVerified: author.isVerified
      },
      videoUrl,
      thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      caption: caption || '',
      musicName: musicName || 'Original Sound - ' + author.displayName,
      hashtags: extractedTags.length > 0 ? extractedTags : ['fyp', 'viral'],
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      viewsCount: 0,
      duration: parsedDuration,
      isLiked: false,
      isSaved: false,
      isFollowing: false,
      status: 'active',
      bannerAd: assignedBanner,
      qualities: qualities || {
        '720p': videoUrl,
        '480p': videoUrl,
        '360p': videoUrl,
        'auto': videoUrl
      },
      compressionStats: compressionStats || {
        originalSizeMb: 15.0,
        compressedSizeMb: 7.8,
        savingsPercent: 48.0,
        codec: 'H.264 / AAC (Web-Optimized)',
        resolution: '720x1280 (9:16)'
      },
      createdAt: new Date().toISOString()
    };

    db.addVideo(newVideo);
    return res.status(201).json({ video: newVideo });
  });

  app.put('/api/videos/:id', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const result = db.updateVideo(req.params.id, req.body, currentUserId);
    if (!result.success) {
      return res.status(result.error?.includes('Unauthorized') ? 403 : 404).json({ error: result.error });
    }
    return res.json({ video: result.video });
  });

  app.delete('/api/videos/:id', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const result = db.deleteVideo(req.params.id, currentUserId);
    if (!result.success) {
      return res.status(result.error?.includes('Unauthorized') ? 403 : 404).json({ error: result.error });
    }
    return res.json({ success: true, message: 'Video deleted successfully' });
  });

  app.get('/api/creators/:id/analytics', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const targetUserId = req.params.id;
    const currentUser = currentUserId ? db.getUserById(currentUserId) : undefined;
    const isAdmin = currentUser?.role === 'admin';

    // Strict Authorization: Only the creator themselves or an administrator can view analytics
    if (currentUserId !== targetUserId && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized: You cannot access another creator\'s private analytics.' });
    }

    const analytics = db.getCreatorAnalytics(targetUserId);
    if (!analytics) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    return res.json({ analytics });
  });

  app.post('/api/videos/:id/like', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const result = db.toggleLike(currentUserId, req.params.id);
    // Track like interest signal
    if (result && typeof result.liked === 'boolean') {
      recommendationEngine.trackVideoLike(currentUserId, req.params.id, result.liked);
    }
    return res.json(result);
  });

  app.post('/api/videos/:id/share', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const sharesCount = db.recordVideoShare(req.params.id);
    const video = db.getVideoById(req.params.id);
    if (video) {
      recommendationEngine.trackVideoWatch(currentUserId, req.params.id, video.duration || 15, 1.0, true);
    }
    return res.json({ sharesCount });
  });

  app.post('/api/videos/:id/view', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'guest';
    const { durationSeconds = 0 } = req.body;
    const durNum = Number(durationSeconds);
    const result = db.recordVideoView(req.params.id, durNum, currentUserId);
    const video = db.getVideoById(req.params.id);
    const videoDur = video?.duration || 15;
    const completionRate = Math.min(2.0, durNum / videoDur);

    // Track user watch activity and learn interests
    recommendationEngine.trackVideoWatch(currentUserId, req.params.id, durNum, completionRate, result.valid);

    return res.json(result);
  });

  // --- COMMENTS ROUTES ---
  app.get('/api/videos/:id/comments', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const comments = db.getComments(req.params.id, currentUserId);
    return res.json({ comments });
  });

  app.post('/api/videos/:id/comments', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const user = db.getUserById(currentUserId) || db.getUserById('user_admin')!;
    const { text, parentId } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text cannot be empty' });
    }

    const newComment: Comment = {
      id: 'comm_' + Date.now(),
      videoId: req.params.id,
      userId: user.id,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified
      },
      text: text.trim(),
      parentId: parentId || undefined,
      likesCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString()
    };

    const added = db.addComment(newComment);
    if (!added) {
      return res.status(403).json({ error: 'Unable to comment on this video due to privacy or block restrictions.' });
    }
    return res.status(201).json({ comment: newComment });
  });

  // --- USERS & RELATIONSHIP ROUTES ---
  app.get('/api/users/blocked', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const blockedUsers = db.getBlockedUsers(currentUserId);
    return res.json({ blockedUsers });
  });

  app.get('/api/users/muted', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const mutedUsers = db.getMutedUsers(currentUserId);
    return res.json({ mutedUsers });
  });

  app.get('/api/users/:id', (req, res) => {
    const user = db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const currentUserId = req.headers['x-user-id'] as string;
    const rel = db.getUserRelationship(currentUserId, user.id);
    return res.json({
      user: {
        ...user,
        isBlocked: rel.isBlocked,
        isMuted: rel.isMuted,
        isBlockedByTarget: rel.isBlockedByTarget
      },
      isFollowing: rel.isFollowing,
      isBlocked: rel.isBlocked,
      isMuted: rel.isMuted,
      isBlockedByTarget: rel.isBlockedByTarget
    });
  });

  app.get('/api/users/:id/relationship', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const rel = db.getUserRelationship(currentUserId, req.params.id);
    return res.json(rel);
  });

  app.post('/api/users/:id/block', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const targetUserId = req.params.id;
    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: 'You cannot block yourself.' });
    }
    const success = db.blockUser(currentUserId, targetUserId);
    return res.json({ success, isBlocked: true });
  });

  app.post('/api/users/:id/unblock', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const targetUserId = req.params.id;
    const success = db.unblockUser(currentUserId, targetUserId);
    return res.json({ success, isBlocked: false });
  });

  app.delete('/api/users/:id/block', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const targetUserId = req.params.id;
    const success = db.unblockUser(currentUserId, targetUserId);
    return res.json({ success, isBlocked: false });
  });

  app.post('/api/users/:id/mute', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const targetUserId = req.params.id;
    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: 'You cannot mute yourself.' });
    }
    const success = db.muteUser(currentUserId, targetUserId);
    return res.json({ success, isMuted: true });
  });

  app.post('/api/users/:id/unmute', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const targetUserId = req.params.id;
    const success = db.unmuteUser(currentUserId, targetUserId);
    return res.json({ success, isMuted: false });
  });

  app.delete('/api/users/:id/mute', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const targetUserId = req.params.id;
    const success = db.unmuteUser(currentUserId, targetUserId);
    return res.json({ success, isMuted: false });
  });

  app.get('/api/users/:id/videos', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const videos = db.getVideos({ userId: req.params.id, currentUserId });
    return res.json({ videos });
  });

  app.post('/api/users/:id/follow', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const result = db.toggleFollow(currentUserId, req.params.id);
    if (result.error) {
      return res.status(403).json(result);
    }
    // Track creator follow affinity
    if (typeof result.following === 'boolean') {
      recommendationEngine.trackCreatorFollow(currentUserId, req.params.id, result.following);
    }
    return res.json(result);
  });

  // --- AD ENGINE ROUTES ---
  app.get('/api/ads/banner', (req, res) => {
    const { avoidAdId } = req.query;
    const clientId = (req.headers['x-user-id'] as string) || (req.ip || 'guest');
    const bannerAd = adEngine.getBannerAd(avoidAdId as string, clientId);
    return res.json({ ad: bannerAd });
  });

  app.get('/api/ads/fullscreen', (req, res) => {
    const { avoidAdId } = req.query;
    const clientId = (req.headers['x-user-id'] as string) || (req.ip || 'guest');
    const fullscreenAd = adEngine.getFullscreenAd(avoidAdId as string, clientId);
    return res.json({ ad: fullscreenAd });
  });

  app.post('/api/ads/:id/impression', (req, res) => {
    const clientId = (req.headers['x-user-id'] as string) || (req.ip || 'guest');
    const { videoId } = req.body || {};
    const result = adEngine.recordImpression(req.params.id, clientId, videoId);
    return res.json(result);
  });

  app.post('/api/ads/:id/click', (req, res) => {
    const clientId = (req.headers['x-user-id'] as string) || (req.ip || 'guest');
    const { videoId } = req.body || {};
    const result = adEngine.recordClick(req.params.id, clientId, videoId);
    return res.json(result);
  });

  app.get('/api/ads/settings', (req, res) => {
    return res.json({ settings: adEngine.getSettings() });
  });

  app.put('/api/ads/settings', (req, res) => {
    const currentUserId = req.headers['x-user-id'] as string;
    const user = db.getUserById(currentUserId);
    if (user && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized. Admin role required.' });
    }
    const settings = adEngine.updateSettings(req.body);
    return res.json({ settings });
  });

  // --- CREATOR MONETIZATION & EARNINGS ---
  app.get('/api/creators/:id/earnings', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const targetUserId = req.params.id;
    const requestingUser = db.getUserById(currentUserId);

    // Only the creator themselves or an admin can see detailed earnings
    if (currentUserId !== targetUserId && (!requestingUser || requestingUser.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied: You can only view your own earnings dashboard.' });
    }

    const earningsSummary = db.getCreatorEarningsSummary(targetUserId);
    if (!earningsSummary) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    return res.json({ earnings: earningsSummary });
  });

  app.post('/api/creators/:id/payouts', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const targetUserId = req.params.id;
    const requestingUser = db.getUserById(currentUserId);

    if (currentUserId !== targetUserId && (!requestingUser || requestingUser.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied: You can only request payouts for your own account.' });
    }

    const { amount, method, accountDetails } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid payout amount is required.' });
    }
    if (!method || !['paypal', 'bank_transfer', 'stripe', 'wire'].includes(method)) {
      return res.status(400).json({ error: 'Valid payout method is required (paypal, bank_transfer, stripe, wire).' });
    }
    if (!accountDetails || typeof accountDetails !== 'string' || !accountDetails.trim()) {
      return res.status(400).json({ error: 'Account details (e.g. PayPal email or Bank account number) are required.' });
    }

    const result = db.requestPayout({
      creatorId: targetUserId,
      amount: Number(amount),
      method,
      accountDetails: accountDetails.trim()
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({ payout: result.payout, success: true });
  });

  // --- ADMIN AUTHORIZATION MIDDLEWARE & PASSWORD GUARD ---
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const currentUserId = (req.headers['x-user-id'] as string) || '';
    const adminPasswordHeader = (req.headers['x-admin-password'] as string) || '';
    const configuredPassword = db.adSettings.adminPassword || 'TikTopAdmin@2026';
    
    // Check if valid admin password header supplied
    if (adminPasswordHeader && adminPasswordHeader === configuredPassword) {
      return next();
    }

    const user = db.getUserById(currentUserId);
    // Allow if user has role 'admin'
    if (user && user.role === 'admin') {
      return next();
    }

    return res.status(403).json({ error: 'Access denied: Valid Admin password or Admin role required.' });
  };

  // Endpoint to verify Admin Secret Password from frontend
  app.post('/api/admin/verify-password', (req, res) => {
    const { password } = req.body;
    const configuredPassword = db.adSettings.adminPassword || 'TikTopAdmin@2026';

    if (!password || String(password).trim() !== configuredPassword) {
      return res.status(401).json({
        success: false,
        error: 'अमान्य एडमिन पासवर्ड! कृपया सही पासवर्ड प्रविष्ट गर्नुहोस्।'
      });
    }

    return res.json({
      success: true,
      message: 'Admin access granted successfully',
      timestamp: new Date().toISOString()
    });
  });

  // Endpoint to change Admin Password
  app.post('/api/admin/change-password', requireAdmin, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'नयाँ पासवर्ड कम्तीमा ६ अक्षरको हुनुपर्दछ।' });
    }

    db.adSettings.adminPassword = newPassword.trim();
    return res.json({
      success: true,
      message: 'एडमिन पासवर्ड सफलतापूर्वक परिवर्तन गरियो।'
    });
  });

  // Endpoint to test Telegram Bot Alert
  app.post('/api/admin/telegram/test', requireAdmin, async (req, res) => {
    const botToken = req.body.botToken || db.adSettings.telegramBotToken;
    const chatId = req.body.chatId || db.adSettings.telegramChatId;

    if (!botToken || !chatId) {
      return res.status(400).json({
        success: false,
        error: 'Telegram Bot Token र Chat ID आवश्यक छ। कृपया दुवै भर्नुहोस्।'
      });
    }

    const result = await sendTestTelegramAlert(botToken, chatId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  });

  // --- NEPAL REWARD POINTS & ESEWA / KHALTI WITHDRAWAL ROUTES ---
  app.get('/api/withdrawals/my', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const user = db.getUserById(currentUserId);
    const withdrawals = db.getWithdrawalRequests(currentUserId);
    return res.json({
      withdrawals,
      points: user?.points ?? 0,
      minWithdrawalPoints: 500000,
      pointsToNprRate: 1000 // 1000 points = 1 NPR, so 500,000 points = 500 NPR
    });
  });

  app.post('/api/withdrawals/request', async (req, res) => {
    const currentUserId = (req.body.userId as string) || (req.headers['x-user-id'] as string) || 'user_admin';
    const { 
      fullName, 
      userName, 
      accountHolderName,
      paymentMethod, 
      mobileNumber, 
      phone, 
      accountNumber, 
      walletIdentifier,
      country,
      countryName,
      currency,
      currencySymbol,
      localAmount,
      localServiceCharge,
      localNetPayout,
      points, 
      amountNpr, 
      withdrawAmount, 
      requestedNPR,
      requestId,
      serviceCharge,
      netPayout,
      status,
      timestamp
    } = req.body;

    const finalAccount = walletIdentifier || accountNumber || phone || mobileNumber;
    const finalAmount = requestedNPR || amountNpr || withdrawAmount;

    const result = db.createWithdrawalRequest({
      userId: currentUserId,
      requestId,
      userName: accountHolderName || userName || fullName,
      fullName: accountHolderName || fullName || userName,
      accountHolderName: accountHolderName || fullName || userName,
      paymentMethod: paymentMethod || 'eSewa',
      mobileNumber: finalAccount,
      phone: finalAccount,
      accountNumber: finalAccount,
      walletIdentifier: finalAccount,
      country,
      countryName,
      currency,
      currencySymbol,
      localAmount: localAmount ? Number(localAmount) : undefined,
      localServiceCharge: localServiceCharge ? Number(localServiceCharge) : undefined,
      localNetPayout: localNetPayout ? Number(localNetPayout) : undefined,
      points: points ? Number(points) : undefined,
      amountNpr: finalAmount ? Number(finalAmount) : undefined,
      requestedNPR: finalAmount ? Number(finalAmount) : undefined,
      serviceCharge: serviceCharge !== undefined ? Number(serviceCharge) : undefined,
      netPayout: netPayout !== undefined ? Number(netPayout) : undefined,
      status,
      timestamp
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Trigger instant Telegram Notification to the Admin's phone
    try {
      if (result.withdrawal) {
        sendWithdrawalTelegramAlert(result.withdrawal, result.user, db.adSettings)
          .then(res => {
            if (res.success) {
              console.log(`[Telegram Alert Delivered] Withdrawal ID: ${result.withdrawal?.id}`);
            } else if (!res.skipped) {
              console.warn(`[Telegram Alert Failed]:`, res.error);
            }
          })
          .catch(err => console.error('[Telegram Async Error]:', err));
      }
    } catch (telegramErr) {
      console.error('[Telegram Notification Trigger Error]:', telegramErr);
    }

    return res.status(201).json({
      success: true,
      withdrawal: result.withdrawal,
      user: result.user,
      points: result.user?.points
    });
  });

  app.post('/api/users/:id/points/adjust', (req, res) => {
    const { pointsDelta } = req.body;
    if (pointsDelta === undefined || isNaN(Number(pointsDelta))) {
      return res.status(400).json({ error: 'Valid points delta number required' });
    }
    const result = db.adjustUserPoints(req.params.id, Number(pointsDelta));
    return res.json(result);
  });

  // --- LIVE BAN & ACCOUNT SANCTION ROUTES ---
  app.post('/api/users/:id/live-ban', (req, res) => {
    const { durationHours = 24, reason } = req.body;
    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const banUntil = new Date(Date.now() + Number(durationHours) * 3600 * 1000).toISOString();
    const updatedViolations = (user.liveViolationsCount || 0) + 1;
    const updated = db.updateUser(user.id, {
      liveBannedUntil: banUntil,
      liveViolationsCount: updatedViolations,
    });
    return res.json({ success: true, user: updated, banUntil });
  });

  app.post('/api/users/:id/account-ban', (req, res) => {
    const { durationDays = 3, reason } = req.body;
    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const banUntil = new Date(Date.now() + Number(durationDays) * 24 * 3600 * 1000).toISOString();
    const updatedViolations = (user.liveViolationsCount || 0) + 1;
    const updated = db.updateUser(user.id, {
      accountBannedUntil: banUntil,
      accountBanReason: reason || 'लाइभमा बारम्बार मानिस नदेखिएर क्यामेरा छोडेको उल्लङ्घनका कारण ३ दिनको लागि खाता प्रतिबन्ध।',
      isBanned: true,
      liveViolationsCount: updatedViolations,
    });
    return res.json({ success: true, user: updated, banUntil });
  });

  app.post('/api/users/:id/reset-bans', (req, res) => {
    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const updated = db.updateUser(user.id, {
      liveBannedUntil: null,
      accountBannedUntil: null,
      accountBanReason: undefined,
      isBanned: false,
    });
    return res.json({ success: true, user: updated });
  });

  // --- LIVE STREAM REWARD CLAIM (1 Hour = 1K pts, 2 Hours = +1K pts, Cap at 2 Hours) ---
  app.post('/api/rewards/claim-live-stream', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || req.body.userId || 'user_admin';
    const user = db.getUserById(currentUserId);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const { milestone } = req.body;
    if (milestone !== 1 && milestone !== 2) {
      return res.status(400).json({ error: 'Milestone must be 1 (1 hour) or 2 (2 hours)' });
    }

    const pointsAwarded = 1000;
    const result = db.adjustUserPoints(user.id, pointsAwarded);

    return res.json({
      success: true,
      milestone,
      pointsAwarded,
      newTotalPoints: result.points,
      message: milestone === 1
        ? '🎉 १ घण्टा लाइभ पूरा गरे बापत १,००० पोइन्ट प्राप्त भयो!'
        : '🎉 २ घण्टा लाइभ पूरा गरे बापत थप १,००० पोइन्ट प्राप्त भयो! (अधिकतम क्याप)'
    });
  });

  // --- ANTI-CHEAT & REWARD CLAIM ENGINE ---
  app.post('/api/rewards/claim-video-view', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const user = db.getUserById(currentUserId) || db.getUserById('user_admin');
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { videoId, watchDurationSeconds, videoDurationSeconds, isFullWatch, clientNonce } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    const duration = Number(watchDurationSeconds) || 0;
    const totalDuration = Number(videoDurationSeconds) || 0;

    // Run Anti-Cheat security validation (Full Watch requirement, spam click prevention, cooldown check)
    const validation = antiCheatEngine.validateVideoRewardClaim(
      user.id,
      user.username,
      videoId,
      duration,
      db.adSettings,
      clientNonce,
      totalDuration,
      isFullWatch !== undefined ? Boolean(isFullWatch) : true
    );

    if (!validation.success) {
      return res.status(validation.securityLockActive ? 429 : 400).json({
        success: false,
        pointsAwarded: 0,
        error: validation.error,
        isCooldown: validation.isCooldown,
        cooldownRemainingSeconds: validation.cooldownRemainingSeconds,
        securityLockActive: validation.securityLockActive,
        currentPoints: user.points || 0
      });
    }

    // Award 50 points legitimately
    const newPoints = (user.points || 0) + validation.pointsAwarded;
    user.points = newPoints;
    db.updateUser(user.id, { points: newPoints });

    // Also register valid view count on video
    db.recordVideoView(videoId, duration, user.id);

    return res.json({
      success: true,
      pointsAwarded: validation.pointsAwarded,
      newTotalPoints: newPoints,
      antiCheatPassed: true,
      watchDurationSeconds: duration,
      message: `🎉 +${validation.pointsAwarded} पोइन्ट सफलतापूर्वक प्राप्त भयो!`
    });
  });

  app.get('/api/admin/anti-cheat/stats', requireAdmin, (req, res) => {
    const stats = antiCheatEngine.getAntiCheatStats();
    return res.json({ stats, settings: db.adSettings });
  });

  app.post('/api/admin/anti-cheat/reset-user-cooldown', requireAdmin, (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    antiCheatEngine.resetUserFraudState(userId);
    return res.json({ success: true, message: `Security cooldown reset for user ${userId}` });
  });

  app.get('/api/admin/withdrawals', requireAdmin, (req, res) => {
    const { userId, status } = req.query;
    const withdrawals = db.getWithdrawalRequests(userId as string, status as string);
    return res.json({ withdrawals });
  });

  app.patch('/api/admin/withdrawals/:id/status', requireAdmin, (req, res) => {
    const adminId = (req.headers['x-user-id'] as string) || 'user_admin';
    const adminUser = db.getUserById(adminId) || db.getUserById('user_admin')!;
    const { status, adminNotes, transactionReference } = req.body;

    const rawStatus = (status || '').toString().toLowerCase();
    if (!rawStatus || !['pending', 'approved', 'rejected'].includes(rawStatus)) {
      return res.status(400).json({ error: 'Valid status required: pending, approved, rejected' });
    }

    const result = db.updateWithdrawalStatus({
      withdrawalId: req.params.id,
      status: rawStatus as 'pending' | 'approved' | 'rejected',
      adminId: adminUser.id,
      adminUsername: adminUser.username,
      adminNotes,
      transactionReference
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, withdrawal: result.withdrawal });
  });

  // Real-time Pending Withdrawals Summary for Instant Admin Notification Badge & Sound
  app.get('/api/admin/withdrawals/summary', requireAdmin, (req, res) => {
    const all = db.getWithdrawalRequests();
    const pendingList = all.filter(w => String(w.status).toLowerCase() === 'pending');
    const latestPending = pendingList.length > 0 ? pendingList[0] : null;
    return res.json({
      totalCount: all.length,
      pendingCount: pendingList.length,
      latestPending,
      hasPending: pendingList.length > 0
    });
  });

  // Local Wallet Recharge (Top-up Coins with eSewa, Khalti, UPI, Easypaisa, GCash, USDT)
  app.post('/api/wallet/recharge', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || (req.body.userId as string) || 'user_sarah';
    const user = db.getUserById(currentUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { coins, packageId, country, paymentMethod, localAmount, currency, walletAccount } = req.body;
    const coinsToAdd = Number(coins) || 1000;

    user.coinBalance = (user.coinBalance || 0) + coinsToAdd;
    if (user.points !== undefined) {
      user.points += coinsToAdd * 10;
    }

    // Create user in-app notification
    db.createNotification({
      userId: user.id,
      actorId: 'system',
      actor: {
        id: 'system',
        username: 'TikTok Finance',
        displayName: 'Coin Recharge Center',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
      },
      type: 'system',
      text: `🎉 सफल रिचार्ज! ${coinsToAdd.toLocaleString()} कोइन तपाईंको खातामा थपियो (${paymentMethod?.toUpperCase() || 'Local Wallet'}, ${currency || 'NPR'} ${localAmount || ''})। हालको कोइन ब्यालेन्स: ${(user.coinBalance || 0).toLocaleString()} Coins.`
    });

    return res.json({
      success: true,
      coinsAdded: coinsToAdd,
      coinBalance: user.coinBalance,
      user
    });
  });

  // --- LIVE GIFT TRANSACTIONS & REVENUE SPLIT (30% Platform, 70% Creator) ---
  app.get('/api/gift-transactions', (req, res) => {
    const { creatorId, senderId } = req.query;
    const transactions = db.getGiftTransactions(creatorId as string, senderId as string);
    const totalPlatformCommission = transactions.reduce((acc, t) => acc + (t.platformCommission || 0), 0);
    const totalCreatorEarnings = transactions.reduce((acc, t) => acc + (t.creatorEarnings || 0), 0);
    const totalVolume = transactions.reduce((acc, t) => acc + (t.giftPrice || 0), 0);

    return res.json({
      transactions,
      stats: {
        totalTransactions: transactions.length,
        totalVolume,
        totalPlatformCommission,
        totalCreatorEarnings
      }
    });
  });

  app.get('/api/admin/gift-transactions', requireAdmin, (req, res) => {
    const { creatorId, senderId } = req.query;
    const transactions = db.getGiftTransactions(creatorId as string, senderId as string);
    const totalPlatformCommission = transactions.reduce((acc, t) => acc + (t.platformCommission || 0), 0);
    const totalCreatorEarnings = transactions.reduce((acc, t) => acc + (t.creatorEarnings || 0), 0);
    const totalVolume = transactions.reduce((acc, t) => acc + (t.giftPrice || 0), 0);

    return res.json({
      transactions,
      stats: {
        totalTransactions: transactions.length,
        totalVolume,
        totalPlatformCommission,
        totalCreatorEarnings
      }
    });
  });

  app.post('/api/live/send-gift', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || req.body.senderId || 'user_A';
    const {
      transactionId,
      creatorId,
      giftName,
      giftPrice,
      roomId,
      timestamp
    } = req.body;

    if (!creatorId || !giftName || !giftPrice) {
      return res.status(400).json({ error: 'creatorId, giftName, and giftPrice are required' });
    }

    const result = db.createGiftTransaction({
      transactionId,
      senderId: currentUserId,
      creatorId,
      giftName,
      giftPrice: Number(giftPrice),
      roomId,
      timestamp
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      transaction: result.transaction,
      sender: db.getUserById(currentUserId),
      creator: db.getUserById(creatorId)
    });
  });

  // --- REPORTS ---
  app.post('/api/reports', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const user = db.getUserById(currentUserId) || db.getUserById('user_admin')!;
    const { type, targetId, reason, details, targetPreview, copyrightData } = req.body;

    const report: Report = {
      id: (type === 'copyright' ? 'rep_cp_' : 'rep_') + Date.now(),
      type: type || 'video',
      targetId,
      targetPreview: targetPreview || 'Item ID: ' + targetId,
      reporterId: user.id,
      reporterUsername: user.username,
      reason,
      details,
      status: 'pending',
      copyrightData: copyrightData || undefined,
      createdAt: new Date().toISOString()
    };

    db.createReport(report);
    return res.status(201).json({ report, success: true });
  });

  // --- NOTIFICATIONS ---
  app.get('/api/notifications', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    if (!currentUserId) {
      return res.json({ notifications: [], unreadCount: 0 });
    }
    const notifs = db.getNotifications(currentUserId);
    const unreadCount = db.getUnreadNotificationsCount(currentUserId);
    return res.json({ notifications: notifs, unreadCount });
  });

  app.get('/api/notifications/unread-count', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    if (!currentUserId) {
      return res.json({ unreadCount: 0 });
    }
    const unreadCount = db.getUnreadNotificationsCount(currentUserId);
    return res.json({ unreadCount });
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const success = db.markNotificationAsRead(req.params.id, currentUserId);
    const unreadCount = db.getUnreadNotificationsCount(currentUserId);
    return res.json({ success, unreadCount });
  });

  app.post('/api/notifications/read-all', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const count = db.markAllNotificationsAsRead(currentUserId);
    return res.json({ success: true, count, unreadCount: 0 });
  });

  app.delete('/api/notifications/:id', (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const success = db.deleteNotification(req.params.id, currentUserId);
    const unreadCount = db.getUnreadNotificationsCount(currentUserId);
    return res.json({ success, unreadCount });
  });

  // --- ADMIN ROUTES ---
  app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const stats = db.getAdminStats();
    return res.json({ stats, settings: db.adSettings });
  });

  app.get('/api/admin/users', requireAdmin, (req, res) => {
    const { search } = req.query;
    let users = [...db.users];
    if (search) {
      const q = String(search).toLowerCase();
      users = users.filter(u => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return res.json({ users });
  });

  app.put('/api/admin/users/:id/ban', requireAdmin, (req, res) => {
    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isBanned = req.body.isBanned ?? !user.isBanned;
    return res.json({ user });
  });

  app.get('/api/admin/videos', requireAdmin, (req, res) => {
    const { search, status } = req.query;
    let videos = [...db.videos];
    if (status) {
      videos = videos.filter(v => v.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      videos = videos.filter(v => v.caption.toLowerCase().includes(q) || v.user.username.toLowerCase().includes(q));
    }
    return res.json({ videos });
  });

  app.delete('/api/admin/videos/:id', requireAdmin, (req, res) => {
    const success = db.deleteVideo(req.params.id);
    return res.json({ success });
  });

  app.put('/api/admin/videos/:id/restore', requireAdmin, (req, res) => {
    const success = db.restoreVideo(req.params.id);
    return res.json({ success });
  });

  app.get('/api/admin/ads', requireAdmin, (req, res) => {
    return res.json({ ads: db.ads });
  });

  app.post('/api/admin/ads', requireAdmin, (req, res) => {
    const {
      type,
      title,
      description,
      ctaText,
      mediaUrl,
      destinationUrl,
      sponsorName,
      sponsorLogo,
      badgeText,
      priority,
      startDate,
      endDate,
      isActive
    } = req.body;

    const newAd: Ad = {
      id: 'ad_' + (type === 'banner' ? 'b' : 'f') + '_' + Date.now(),
      type: type || 'banner',
      title: title || 'New Campaign',
      description: description || '',
      ctaText: ctaText || 'Learn More',
      mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
      destinationUrl: destinationUrl || 'https://example.com',
      sponsorName: sponsorName || 'Sponsor',
      sponsorLogo: sponsorLogo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      badgeText: badgeText || (type === 'banner' ? 'Promoted' : 'Sponsored Ad'),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      priority: Number(priority) || 5,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || '2026-12-31',
      impressions: 0,
      clicks: 0,
      createdAt: new Date().toISOString()
    };

    db.createAd(newAd);
    return res.status(201).json({ ad: newAd });
  });

  app.put('/api/admin/ads/:id', requireAdmin, (req, res) => {
    const updated = db.updateAd(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Ad not found' });
    return res.json({ ad: updated });
  });

  app.delete('/api/admin/ads/:id', requireAdmin, (req, res) => {
    const success = db.deleteAd(req.params.id);
    return res.json({ success });
  });

  app.get('/api/admin/reports', requireAdmin, (req, res) => {
    const { type, status } = req.query;
    let reports = db.getReports();
    if (type) {
      reports = reports.filter(r => r.type === type);
    }
    if (status) {
      reports = reports.filter(r => r.status === status);
    }
    return res.json({ reports });
  });

  app.put('/api/admin/reports/:id', requireAdmin, (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const adminUser = db.getUserById(currentUserId) || db.getUserById('user_admin')!;
    const { status, action, reason, adminNotes } = req.body;
    
    const report = db.updateReportStatus(req.params.id, status, {
      adminId: adminUser.id,
      adminUsername: adminUser.username,
      action,
      reason: reason || `Admin marked report as ${status}`,
      adminNotes
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Handle traditional report action fallback
    if (action === 'ban_user' && report.type === 'user') {
      const u = db.getUserById(report.targetId);
      if (u) u.isBanned = true;
    } else if (action === 'remove_video' && report.type === 'video') {
      db.deleteVideo(report.targetId);
    }

    return res.json({ report });
  });

  // --- DEDICATED COPYRIGHT REPORTS (ADMIN ONLY) ---
  app.get('/api/admin/copyright-reports', requireAdmin, (req, res) => {
    const { status, claimType } = req.query;
    let reports = db.getCopyrightReports();
    if (status && status !== 'all') {
      reports = reports.filter(r => r.status === status);
    }
    if (claimType && claimType !== 'all') {
      reports = reports.filter(r => r.copyrightData?.claimType === claimType);
    }
    return res.json({ reports });
  });

  app.put('/api/admin/copyright-reports/:id', requireAdmin, (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const adminUser = db.getUserById(currentUserId) || db.getUserById('user_admin')!;
    const { status, action, reason, adminNotes } = req.body;

    const report = db.updateReportStatus(req.params.id, status, {
      adminId: adminUser.id,
      adminUsername: adminUser.username,
      action,
      reason,
      adminNotes
    });

    if (!report) return res.status(404).json({ error: 'Copyright report not found' });
    return res.json({ report, success: true });
  });

  // --- AUDIT LOGS (ADMIN ONLY) ---
  app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
    const logs = db.getAuditLogs();
    return res.json({ logs });
  });

  // --- CREATOR VIOLATIONS & STRIKES (ADMIN ONLY) ---
  app.get('/api/admin/creators/:id/violations', requireAdmin, (req, res) => {
    const violations = db.getCreatorViolations(req.params.id);
    const user = db.getUserById(req.params.id);
    return res.json({ violations, user });
  });

  app.post('/api/admin/creators/:id/strike', requireAdmin, (req, res) => {
    const currentUserId = (req.headers['x-user-id'] as string) || 'user_admin';
    const adminUser = db.getUserById(currentUserId) || db.getUserById('user_admin')!;
    const { videoId, reportId, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required to issue a copyright strike.' });
    }

    const result = db.issueCopyrightStrike(
      req.params.id,
      videoId || '',
      reportId || '',
      reason,
      adminUser.id,
      adminUser.username
    );

    return res.json(result);
  });

  // --- ADMIN MONETIZATION & PAYOUT MANAGEMENT ---
  app.get('/api/admin/monetization', requireAdmin, (req, res) => {
    const stats = db.getPlatformMonetizationStats();
    const recentRevenueEvents = db.revenueEvents.slice(0, 50);
    return res.json({ stats, settings: db.adSettings, recentRevenueEvents });
  });

  app.get('/api/admin/payouts', requireAdmin, (req, res) => {
    const { status, creatorId } = req.query;
    const payouts = db.getPayoutRequests(status as string, creatorId as string);
    return res.json({ payouts });
  });

  app.put('/api/admin/payouts/:id', requireAdmin, (req, res) => {
    const adminId = (req.headers['x-user-id'] as string) || 'user_admin';
    const adminUser = db.getUserById(adminId) || db.getUserById('user_admin')!;
    const { status, adminNotes, transactionReference } = req.body;

    if (!status || !['pending', 'processing', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required: pending, processing, completed, rejected' });
    }

    const result = db.updatePayoutStatus({
      payoutId: req.params.id,
      status,
      adminId: adminUser.id,
      adminUsername: adminUser.username,
      adminNotes,
      transactionReference
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, payout: result.payout });
  });

  app.post('/api/admin/creators/:id/adjust-earnings', requireAdmin, (req, res) => {
    const adminId = (req.headers['x-user-id'] as string) || 'user_admin';
    const adminUser = db.getUserById(adminId) || db.getUserById('user_admin')!;
    const { amount, reason } = req.body;

    if (amount === undefined || isNaN(Number(amount))) {
      return res.status(400).json({ error: 'Valid adjustment amount is required.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason for manual adjustment is required.' });
    }

    const result = db.adjustCreatorEarnings({
      creatorId: req.params.id,
      amount: Number(amount),
      reason: reason.trim(),
      adminId: adminUser.id,
      adminUsername: adminUser.username
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, event: result.event });
  });

  return app;
}

let cachedApp: express.Express | null = null;
export function getApp(): express.Express {
  if (!cachedApp) {
    cachedApp = createServerApp();
  }
  return cachedApp;
}

export const app = getApp();

export async function startServer() {
  const serverApp = getApp();
  const PORT = 3000;

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    serverApp.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    serverApp.use(express.static(distPath));
    serverApp.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  serverApp.listen(PORT, '0.0.0.0', () => {
    console.log(`TikTok App Server running on http://0.0.0.0:${PORT}`);
  });
  return serverApp;
}

// Only launch standalone dev / production server when not running in Vercel Serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export default app;
