import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Plus,
  Check,
  Sparkles,
  RefreshCw,
  Sliders,
  Settings,
  ShieldAlert,
  Gauge,
  Flame,
  Zap,
  Coins,
  ShieldCheck,
  Lock,
  RotateCcw,
  Maximize2,
  Minimize2,
  Clock,
  Camera
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Video, Ad } from '../types';
import { BannerAd } from './BannerAd';
import { useAuth } from '../context/AuthContext';
import { useAds } from '../context/AdContext';
import { getVideoBlobUrl } from '../utils/mediaStore';

const RELIABLE_FALLBACK_STREAMS = [
  '/videos/sample_dance.mp4',
  '/videos/sample_cooking.mp4',
  '/videos/sample_tech.mp4',
  '/videos/sample_fitness.mp4',
  '/videos/sample_travel.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  'https://media.w3.org/2010/05/sintel/trailer_hd.mp4'
];

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
  onOpenComments: (video: Video) => void;
  onOpenShare: (video: Video) => void;
  onOpenCreatorProfile: (userId: string) => void;
  onHashtagClick?: (tag: string) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  isActive,
  onOpenComments,
  onOpenShare,
  onOpenCreatorProfile,
  onHashtagClick,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const { currentUser, openAuthModal, updateUserPoints } = useAuth();
  const {
    registerValidView,
    claimVideoReward,
    currentBannerAd,
    fetchNextBannerAd,
    adSettings,
    isFullScreenAdVisible,
    isAppVisible,
    isSecurityLockActive,
    securityCooldownRemaining
  } = useAds();

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isLiked, setIsLiked] = useState<boolean>(video.isLiked || false);
  const [likesCount, setLikesCount] = useState<number>(video.likesCount);
  const [isFollowing, setIsFollowing] = useState<boolean>(video.isFollowing || false);
  const [videoBannerAd, setVideoBannerAd] = useState<Ad | null>(video.bannerAd || currentBannerAd);
  const [showHeartBurst, setShowHeartBurst] = useState<boolean>(false);
  const [burstPosition, setBurstPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [progress, setProgress] = useState<number>(0);

  // Full Watch & Timeline Tracking States
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [totalDurationSec, setTotalDurationSec] = useState<number>(video.duration || 15);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [hasCompletedFullWatch, setHasCompletedFullWatch] = useState<boolean>(false);
  const [showFullWatchBanner, setShowFullWatchBanner] = useState<boolean>(false);

  // Long Video Mid-Roll Ad System (Prompt Next Ad when video is long >=14s)
  const isLongVideo = (video.duration && video.duration >= 14) || totalDurationSec >= 14;
  const [hasTriggeredMidrollAd, setHasTriggeredMidrollAd] = useState<boolean>(false);
  const [showMidrollAlert, setShowMidrollAlert] = useState<boolean>(false);

  // Watch Time & Anti-Cheat Reward States (strictly 10-second threshold)
  const [watchSeconds, setWatchSeconds] = useState<number>(0);
  const [hasClaimedPoints, setHasClaimedPoints] = useState<boolean>(false);
  const [rewardCelebration, setRewardCelebration] = useState<{ show: boolean; text: string }>({ show: false, text: '' });
  const [antiCheatError, setAntiCheatError] = useState<string | null>(null);

  // Streaming quality state
  const [selectedQuality, setSelectedQuality] = useState<'auto' | '720p' | '480p' | '360p'>('auto');
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);

  // Playback buffering & error states
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [hasPlaybackError, setHasPlaybackError] = useState<boolean>(false);
  const [activeStreamUrl, setActiveStreamUrl] = useState<string>('');
  const [hasAttemptedProxyFallback, setHasAttemptedProxyFallback] = useState<boolean>(false);

  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimeSecRef = useRef<number>(0);
  const hasTriggeredValidViewRef = useRef<boolean>(false);
  const lastTapRef = useRef<number>(0);
  const lastCurrentTimeRef = useRef<number>(0);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Reset watch progress when switching videos
  useEffect(() => {
    setWatchSeconds(0);
    setHasClaimedPoints(false);
    setRewardCelebration({ show: false, text: '' });
    setAntiCheatError(null);
    setHasCompletedFullWatch(false);
    setShowFullWatchBanner(false);
    setHasTriggeredMidrollAd(false);
    setShowMidrollAlert(false);
    playbackTimeSecRef.current = 0;
    hasTriggeredValidViewRef.current = false;
  }, [video.id]);

  // Resolve current active stream URL based on quality selection
  const baseStreamUrl = React.useMemo(() => {
    if (video.qualities) {
      if (selectedQuality === '720p' && video.qualities['720p']) return video.qualities['720p'];
      if (selectedQuality === '480p' && video.qualities['480p']) return video.qualities['480p'];
      if (selectedQuality === '360p' && video.qualities['360p']) return video.qualities['360p'];
      if (video.qualities.auto) return video.qualities.auto;
    }
    return video.videoUrl;
  }, [video, selectedQuality]);

  // Sync state if video prop updates and check for local IndexedDB blob
  useEffect(() => {
    let isCancelled = false;

    setIsLiked(video.isLiked || false);
    setLikesCount(video.likesCount);
    setIsFollowing(video.isFollowing || false);
    setHasPlaybackError(false);
    setHasAttemptedProxyFallback(false);

    // Check if there is an IndexedDB blob for user-posted videos
    const checkLocalBlob = async () => {
      try {
        const localBlobUrl = await getVideoBlobUrl(video.id);
        if (localBlobUrl && !isCancelled) {
          setActiveStreamUrl(localBlobUrl);
          return;
        }
      } catch {
        // use fallback URL
      }
      if (!isCancelled) {
        setActiveStreamUrl(baseStreamUrl || RELIABLE_FALLBACK_STREAMS[0]);
      }
    };

    checkLocalBlob();

    if (video.bannerAd) {
      setVideoBannerAd(video.bannerAd);
    }

    return () => {
      isCancelled = true;
    };
  }, [video, baseStreamUrl]);

  // Fetch unique rotating banner ad for this video instance if not already attached
  useEffect(() => {
    if (video.bannerAd) {
      setVideoBannerAd(video.bannerAd);
      return;
    }
    fetchNextBannerAd().then(ad => {
      if (ad) setVideoBannerAd(ad);
    });
  }, [video.id, video.bannerAd, fetchNextBannerAd]);

  // Handle stream quality switch seamlessly
  const handleSelectQuality = (q: 'auto' | '720p' | '480p' | '360p') => {
    setSelectedQuality(q);
    setShowQualityMenu(false);
    setHasAttemptedProxyFallback(false);
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const wasPlaying = !videoRef.current.paused;
      videoRef.current.currentTime = currentTime;
      if (wasPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // Handle playback error with reliable CDN stream recovery
  const handleVideoPlaybackError = () => {
    const nextFallback = RELIABLE_FALLBACK_STREAMS[Math.floor(Math.random() * RELIABLE_FALLBACK_STREAMS.length)];
    
    if (activeStreamUrl !== nextFallback) {
      setActiveStreamUrl(nextFallback);
      setHasPlaybackError(false);
      setIsBuffering(true);
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
          setHasPlaybackError(false);
        }).catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().then(() => {
              setIsPlaying(true);
              setIsBuffering(false);
              setHasPlaybackError(false);
            }).catch(() => {
              setHasPlaybackError(false);
              setIsBuffering(false);
              setIsPlaying(false);
            });
          }
        });
      }
      return;
    }

    setHasPlaybackError(false);
    setIsBuffering(false);
  };

  // Rotate banner ad when video loops, replays, or mid-roll triggers
  const rotateBannerAdOnLoop = useCallback(async () => {
    const nextAd = await fetchNextBannerAd(videoBannerAd?.id);
    if (nextAd) {
      setVideoBannerAd(nextAd);
    }
  }, [fetchNextBannerAd, videoBannerAd?.id]);

  // Manually or automatically trigger Next Ad for Long Videos
  const handleTriggerNextAdImmediately = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await rotateBannerAdOnLoop();
    setShowMidrollAlert(true);
    setTimeout(() => setShowMidrollAlert(false), 3000);
  };

  // User Intent Enforcement: "प्रत्येक 5 sec १० Sec मा points दिने मा हैन vedo full watch गर्नु पर्छ"
  // Strictly award coins only when user completes 100% full watch of the video
  const triggerFullWatchReward = useCallback(async () => {
    if (hasClaimedPoints || hasTriggeredValidViewRef.current) return;

    const effectiveDuration = totalDurationSec || video.duration || 10;
    // Anti-cheat verification: actual playback duration must cover at least 70% of video duration (prevents instant scrubber jumping)
    const minGenuineWatch = Math.max(3.0, Math.min(effectiveDuration * 0.70, effectiveDuration - 0.5));

    if (playbackTimeSecRef.current < minGenuineWatch) {
      setAntiCheatError(`भिडियो पूरा (Full Watch) नगरी पोइन्ट पाइँदैन। तपाईंले ${playbackTimeSecRef.current.toFixed(1)}s मात्र हेर्नुभयो।`);
      setTimeout(() => setAntiCheatError(null), 4000);
      return;
    }

    hasTriggeredValidViewRef.current = true;

    try {
      const rewardRes = await claimVideoReward(video.id, playbackTimeSecRef.current, effectiveDuration, true);
      if (rewardRes.success) {
        setHasClaimedPoints(true);
        setHasCompletedFullWatch(true);
        setShowFullWatchBanner(true);
        setRewardCelebration({
          show: true,
          text: `+${rewardRes.pointsAwarded || 50} Coins 🎉`
        });
        if (rewardRes.newTotalPoints !== undefined) {
          updateUserPoints(rewardRes.newTotalPoints);
        }
        // Register valid view for the 10-video loop
        registerValidView(video.id, playbackTimeSecRef.current);

        // Celebration confetti
        try {
          confetti({
            particleCount: 45,
            spread: 70,
            origin: { y: 0.25, x: 0.5 },
            colors: ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#ffffff'],
          });
        } catch {
          // ignore
        }

        setTimeout(() => {
          setRewardCelebration(prev => ({ ...prev, show: false }));
        }, 4000);
        setTimeout(() => {
          setShowFullWatchBanner(false);
        }, 4500);
      } else {
        setAntiCheatError(rewardRes.error || 'भिडियो पूरा (Full Watch) गरेपछि मात्र पोइन्ट पाइन्छ!');
        setTimeout(() => setAntiCheatError(null), 4000);
      }
    } catch {
      registerValidView(video.id, playbackTimeSecRef.current);
    }
  }, [
    hasClaimedPoints,
    totalDurationSec,
    video.duration,
    video.id,
    claimVideoReward,
    updateUserPoints,
    registerValidView
  ]);

  // Auto-play / pause based on active state, app visibility, and fullscreen ad visibility
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive && isAppVisible && !isFullScreenAdVisible) {
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setHasPlaybackError(false);
          })
          .catch(() => {
            el.muted = true;
            setIsMuted(true);
            el.play()
              .then(() => {
                setIsPlaying(true);
                setHasPlaybackError(false);
              })
              .catch(() => setIsPlaying(false));
          });
      }

      // Start tracking genuine watch time
      playbackTimeSecRef.current = 0;
      hasTriggeredValidViewRef.current = false;
      setWatchSeconds(0);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);

      playbackTimerRef.current = setInterval(async () => {
        const videoElement = videoRef.current;
        if (
          !videoElement ||
          videoElement.paused ||
          isBuffering ||
          typeof document === 'undefined' ||
          document.visibilityState === 'hidden'
        ) {
          return;
        }

        playbackTimeSecRef.current += 0.25;
        const currentWatch = Number(playbackTimeSecRef.current.toFixed(2));
        setWatchSeconds(currentWatch);

        // Long Video Subsequent Ad Trigger: if video is long (>=14s) and watch time reaches >= 6s, show next ad immediately
        if (isLongVideo && playbackTimeSecRef.current >= 6.0 && !hasTriggeredMidrollAd) {
          setHasTriggeredMidrollAd(true);
          rotateBannerAdOnLoop();
          setShowMidrollAlert(true);
          setTimeout(() => setShowMidrollAlert(false), 3500);
        }
      }, 250);
    } else {
      el.pause();
      setIsPlaying(false);
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [
    isActive,
    isAppVisible,
    isFullScreenAdVisible,
    video.id,
    isBuffering,
    isLongVideo,
    hasTriggeredMidrollAd,
    rotateBannerAdOnLoop
  ]);

  // Video Loaded Metadata - read actual video duration
  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      setTotalDurationSec(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setCurrentTimeSec(current);
      setTotalDurationSec(duration);
      const p = (current / duration) * 100;
      setProgress(p);

      // Long Video prompt Next Ad trigger during playback
      if (isLongVideo && current >= 6.0 && !hasTriggeredMidrollAd) {
        setHasTriggeredMidrollAd(true);
        rotateBannerAdOnLoop();
        setShowMidrollAlert(true);
        setTimeout(() => setShowMidrollAlert(false), 3500);
      }

      // Check if video reached full watch completion near end (>= 98.5% or within 0.35s of duration)
      if ((p >= 98.5 || current >= duration - 0.35) && !hasClaimedPoints) {
        triggerFullWatchReward();
      }

      // Detect video loop: currentTime looped back from end to near 0
      if (lastCurrentTimeRef.current > 1 && current < 0.5 && lastCurrentTimeRef.current < duration) {
        rotateBannerAdOnLoop();
      }
      lastCurrentTimeRef.current = current;
    }
  };

  // Full Video Watch Completed Handler (onEnded)
  const handleVideoEnded = () => {
    setHasCompletedFullWatch(true);
    triggerFullWatchReward();
    rotateBannerAdOnLoop();

    // Loop video smoothly
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Interactive Timeline Seeking / Scrubber (Drag or Click)
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!scrubberRef.current || !videoRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const seekPercent = clickX / rect.width;
    const newTime = seekPercent * (videoRef.current.duration || totalDurationSec);

    videoRef.current.currentTime = newTime;
    setCurrentTimeSec(newTime);
    setProgress(seekPercent * 100);
  };

  const handleRetryPlayback = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasPlaybackError(false);
    setIsBuffering(true);
    setHasAttemptedProxyFallback(false);

    const delimiter = baseStreamUrl.includes('?') ? '&' : '?';
    const retryUrl = `${baseStreamUrl}${delimiter}retry=${Date.now()}`;
    setActiveStreamUrl(retryUrl);

    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
      }).catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
          }).catch(() => {
            handleVideoPlaybackError();
          });
        }
      });
    }
  };

  // Screen Click: Single tap toggle play/pause, Double tap heart like
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double Tap Like
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setBurstPosition({ x, y });
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);

      if (!isLiked) {
        handleToggleLike();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          // Single tap - toggle play/pause
          if (videoRef.current) {
            if (isPlaying) {
              videoRef.current.pause();
              setIsPlaying(false);
            } else {
              videoRef.current.play().catch(() => {});
              setIsPlaying(true);
            }
          }
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleToggleLike = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount(prev => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    if (nextLiked) {
      try {
        confetti({
          particleCount: 25,
          spread: 60,
          origin: { y: 0.7, x: 0.9 },
          colors: ['#ff0050', '#00f2fe', '#ffffff'],
        });
      } catch {
        // ignore
      }
    }

    try {
      await fetch(`/api/videos/${video.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
      });
    } catch {
      // ignore
    }
  };

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      openAuthModal();
      return;
    }

    setIsFollowing(prev => !prev);
    try {
      await fetch(`/api/users/${video.userId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
      });
    } catch {
      // ignore
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
  };

  const [coverSavedToast, setCoverSavedToast] = useState<boolean>(false);

  const handleCaptureCoverFromCurrentVideo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    try {
      const vid = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 854;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        const newCover = canvas.toDataURL('image/jpeg', 0.9);
        video.thumbnailUrl = newCover;
        try {
          const stored = localStorage.getItem('tiktok_posted_videos');
          if (stored) {
            const list: Video[] = JSON.parse(stored);
            const updated = list.map(v => (v.id === video.id ? { ...v, thumbnailUrl: newCover } : v));
            localStorage.setItem('tiktok_posted_videos', JSON.stringify(updated));
          }
        } catch {
          // ignore
        }
        if (currentUser) {
          await fetch(`/api/videos/${video.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
            body: JSON.stringify({ thumbnailUrl: newCover }),
          });
        }
        setCoverSavedToast(true);
        setTimeout(() => setCoverSavedToast(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={containerRef}
      id={`video-slide-${video.id}`}
      onClick={handleContainerClick}
      className="relative h-full w-full bg-black select-none overflow-hidden flex items-center justify-center"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={activeStreamUrl || baseStreamUrl}
        poster={video.thumbnailUrl}
        loop={false}
        playsInline
        preload="auto"
        muted={isMuted}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnded}
        onWaiting={() => setIsBuffering(true)}
        onLoadedData={() => {
          setIsBuffering(false);
          setHasPlaybackError(false);
        }}
        onPlaying={() => {
          setIsBuffering(false);
          setHasPlaybackError(false);
        }}
        onCanPlay={() => {
          setIsBuffering(false);
          setHasPlaybackError(false);
        }}
        onError={handleVideoPlaybackError}
        className="h-full w-full object-cover sm:object-contain sm:max-w-md mx-auto"
      />

      {/* Floating Double-Tap Animated Heart */}
      {showHeartBurst && (
        <div
          style={{ left: burstPosition.x - 40, top: burstPosition.y - 40 }}
          className="pointer-events-none absolute z-40 animate-ping-once"
        >
          <Heart className="h-20 w-20 fill-rose-500 text-rose-500 drop-shadow-2xl" />
        </div>
      )}

      {/* Center Buffering Loader */}
      {isBuffering && !hasPlaybackError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-25">
          <div className="rounded-full bg-black/50 p-3 text-white/90 backdrop-blur-sm shadow-xl">
            <RefreshCw className="h-7 w-7 text-rose-400 animate-spin" />
          </div>
        </div>
      )}

      {/* Playback Error Overlay with Retry */}
      {hasPlaybackError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30 p-4 text-center">
          <ShieldAlert className="h-10 w-10 text-rose-500 mb-2" />
          <p className="text-sm font-bold text-white">Video Playback Error</p>
          <p className="text-xs text-zinc-400 mt-0.5 max-w-xs">
            Network speed drop or media buffer stalled.
          </p>
          <button
            type="button"
            onClick={handleRetryPlayback}
            className="mt-3 flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-rose-500 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Tap to Retry</span>
          </button>
        </div>
      )}

      {/* Play/Pause Center Indicator */}
      {!isPlaying && !hasPlaybackError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
          <div className="rounded-full bg-black/40 p-4 text-white/90 backdrop-blur-xs">
            <Play className="h-10 w-10 fill-white" />
          </div>
        </div>
      )}

      {/* Gradient Overlays for Readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85 z-10" />

      {/* Top Left: 10-Second Watch & Earn 50 Points Progress Badge */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2 pointer-events-auto">
        {isSecurityLockActive ? (
          <div className="flex items-center gap-1.5 rounded-full bg-rose-950/80 px-3 py-1.5 text-xs font-bold text-rose-300 backdrop-blur-md border border-rose-500/40 shadow-lg animate-pulse">
            <Lock className="h-3.5 w-3.5 text-rose-400" />
            <span>सुरक्षा लक ({securityCooldownRemaining}s)</span>
          </div>
        ) : hasClaimedPoints ? (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/80 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur-md border border-emerald-500/50 shadow-lg">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <Coins className="h-3.5 w-3.5 text-amber-300" />
            <span>Full Watch पूरा (+50 Coins)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full bg-black/65 px-3 py-1 text-xs font-bold text-white backdrop-blur-md border border-amber-500/40 shadow-md">
            {/* Circular mini progress SVG for Full Watch */}
            <div className="relative h-4 w-4">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/20"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-amber-400 transition-all duration-200"
                  strokeDasharray={`${Math.min(100, Math.round(progress))}, 100`}
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
            <Coins className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span className="text-[11px] text-amber-200">
              Full Watch: {Math.min(100, Math.round(progress))}% (+50)
            </span>
          </div>
        )}

        {/* Long Video Mid-Roll Rapid Ad Button */}
        {isLongVideo && (
          <button
            type="button"
            onClick={handleTriggerNextAdImmediately}
            className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/30 to-yellow-500/20 border border-amber-400/60 px-2.5 py-1 text-[11px] font-black text-amber-300 backdrop-blur-md hover:bg-amber-500/40 transition-all shadow-md active:scale-95 animate-pulse"
            title="लामो भिडियोमा अर्को प्रायोजक Add तुरुन्त हेर्नुहोस्"
          >
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
            <span>अर्को Add ⚡</span>
          </button>
        )}
      </div>

      {/* Floating Mid-roll / Next Ad Alert on Long Videos */}
      {showMidrollAlert && (
        <div className="absolute top-14 left-4 right-4 z-40 flex items-center justify-center pointer-events-none animate-fadeIn">
          <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-4 py-2 text-xs font-black text-black backdrop-blur-md shadow-2xl border-2 border-white">
            <Sparkles className="h-4 w-4 fill-black text-yellow-900 animate-bounce" />
            <span>🎬 लामो भिडियो: अर्को प्रायोजक विज्ञापन लोड भयो! ⚡</span>
          </div>
        </div>
      )}

      {/* Full Watch Completed Banner */}
      {showFullWatchBanner && (
        <div className="absolute top-24 left-4 right-4 z-40 flex items-center justify-center pointer-events-none animate-fadeIn">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-600/95 px-4 py-2 text-xs font-black text-white backdrop-blur-md shadow-2xl border border-emerald-300">
            <Check className="h-4 w-4 text-emerald-200" />
            <span>🎉 भिडियो पूरा हेर्नुभयो (Full Video Watched)! +50 Coins थपियो</span>
          </div>
        </div>
      )}

      {/* Floating Center Reward Celebration Pop */}
      {rewardCelebration.show && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-40">
          <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-5 text-black shadow-2xl backdrop-blur-md border-2 border-yellow-200 animate-bounce">
            <div className="flex items-center gap-2">
              <Coins className="h-8 w-8 fill-black text-yellow-100" />
              <span className="text-2xl font-black tracking-wide">{rewardCelebration.text}</span>
            </div>
            <p className="text-xs font-black text-amber-950">🎉 भिडियो १००% पूरा (Full Watch) गरेकोमा पोइन्ट थपियो!</p>
            <span className="text-[10px] font-bold text-black/70">Full Video Watched Successfully</span>
          </div>
        </div>
      )}

      {/* Anti-Cheat Error Toast Warning */}
      {antiCheatError && (
        <div className="absolute top-16 left-4 right-4 z-40 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 rounded-xl bg-rose-900/90 px-3.5 py-2 text-xs font-semibold text-rose-100 backdrop-blur-md border border-rose-500/50 shadow-xl max-w-sm text-center">
            <ShieldAlert className="h-4 w-4 text-rose-300 shrink-0" />
            <span>{antiCheatError}</span>
          </div>
        </div>
      )}

      {/* Top Right Controls: Quality Switcher & Volume */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        
        {/* Adaptive Quality Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setShowQualityMenu(prev => !prev);
            }}
            className="flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md hover:bg-black/60 border border-white/10 transition-colors uppercase"
            title="Video Quality"
          >
            <Gauge className="h-3 w-3 text-rose-400" />
            <span>{selectedQuality === 'auto' ? 'HD Auto' : selectedQuality}</span>
          </button>

          {/* Quality Menu Popover */}
          {showQualityMenu && (
            <div
              onClick={e => e.stopPropagation()}
              className="absolute right-0 top-8 z-40 w-36 rounded-xl border border-white/15 bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-md"
            >
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/5">
                Streaming Quality
              </div>
              <button
                type="button"
                onClick={() => handleSelectQuality('auto')}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold text-left transition-colors ${
                  selectedQuality === 'auto' ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <span>Auto (Adaptive)</span>
                {selectedQuality === 'auto' && <Check className="h-3 w-3 text-rose-400" />}
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuality('720p')}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold text-left transition-colors ${
                  selectedQuality === '720p' ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <span>720p HD</span>
                {selectedQuality === '720p' && <Check className="h-3 w-3 text-rose-400" />}
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuality('480p')}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold text-left transition-colors ${
                  selectedQuality === '480p' ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <span>480p SD</span>
                {selectedQuality === '480p' && <Check className="h-3 w-3 text-rose-400" />}
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuality('360p')}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold text-left transition-colors ${
                  selectedQuality === '360p' ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <span>360p Saver</span>
                {selectedQuality === '360p' && <Check className="h-3 w-3 text-rose-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Volume Button */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setIsMuted(prev => !prev);
          }}
          className="rounded-full bg-black/40 p-2 text-white backdrop-blur-md hover:bg-black/60 transition-colors border border-white/10"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Right Side Action Rail */}
      <div className="absolute right-2 sm:right-4 bottom-24 sm:bottom-28 z-30 flex flex-col items-center gap-4">
        
        {/* Creator Avatar & Follow Button */}
        <div className="relative mb-1 flex flex-col items-center">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onOpenCreatorProfile(video.userId);
            }}
            className="h-11 w-11 overflow-hidden rounded-full border-2 border-white bg-zinc-800 shadow-md transition-transform hover:scale-105"
          >
            <img
              src={video.user.avatarUrl}
              alt={video.user.username}
              className="h-full w-full object-cover"
            />
          </button>
          
          {currentUser?.id !== video.userId && (
            <button
              type="button"
              onClick={handleToggleFollow}
              className={`absolute -bottom-2 flex h-5 w-5 items-center justify-center rounded-full text-white shadow transition-all ${
                isFollowing ? 'bg-zinc-700 text-zinc-300' : 'bg-rose-500 hover:scale-110'
              }`}
            >
              {isFollowing ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 stroke-[3]" />}
            </button>
          )}
        </div>

        {/* Like Button */}
        <button
          id={`like-btn-${video.id}`}
          type="button"
          onClick={e => {
            e.stopPropagation();
            handleToggleLike();
          }}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs transition-transform active:scale-125">
            <Heart
              className={`h-6 w-6 transition-colors ${
                isLiked ? 'fill-rose-500 text-rose-500' : 'text-white group-hover:text-rose-400'
              }`}
            />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow">
            {formatNumber(likesCount)}
          </span>
        </button>

        {/* Comments Button */}
        <button
          id={`comments-btn-${video.id}`}
          type="button"
          onClick={e => {
            e.stopPropagation();
            onOpenComments(video);
          }}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs transition-transform group-hover:scale-110">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow">
            {formatNumber(video.commentsCount)}
          </span>
        </button>

        {/* Share Button */}
        <button
          id={`share-btn-${video.id}`}
          type="button"
          onClick={e => {
            e.stopPropagation();
            onOpenShare(video);
          }}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs transition-transform group-hover:scale-110">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow">
            {formatNumber(video.sharesCount)}
          </span>
        </button>

        {/* Owner Quick Cover Snap - Discreet, instant & no noisy text */}
        {currentUser && (video.userId === currentUser.id || video.user?.id === currentUser.id) && (
          <button
            type="button"
            onClick={handleCaptureCoverFromCurrentVideo}
            className="flex flex-col items-center gap-1 group cursor-pointer"
            title="Cover"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-xs transition-all ${
              coverSavedToast ? 'bg-emerald-600 text-white scale-110 shadow-lg' : 'bg-black/40 text-white hover:bg-black/60 group-hover:scale-105'
            }`}>
              {coverSavedToast ? <Check className="h-4 w-4 stroke-[3]" /> : <Camera className="h-4 w-4 text-zinc-300 group-hover:text-white" />}
            </div>
          </button>
        )}

        {/* Replay Full Video Button */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.play().catch(() => {});
              setIsPlaying(true);
            }
          }}
          className="flex flex-col items-center gap-1 group"
          title="सुरुदेखि हेर्नुहोस् (Replay from start)"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs transition-transform group-hover:scale-110">
            <RotateCcw className="h-4 w-4 text-zinc-300 group-hover:text-white" />
          </div>
          <span className="text-[10px] font-medium text-zinc-300 drop-shadow">Replay</span>
        </button>

        {/* Spinning Sound Disc */}
        <div className="mt-0.5">
          <div
            className={`h-9 w-9 rounded-full border border-zinc-700 bg-zinc-950 p-1.5 shadow-lg ${
              isPlaying ? 'animate-spin-slow' : ''
            }`}
          >
            <div className="h-full w-full rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-900 flex items-center justify-center border border-zinc-600">
              <Music className="h-3.5 w-3.5 text-zinc-300" />
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Overlay: Creator info, caption, AUTOMATED BANNER AD, and INTERACTIVE FULL WATCH SCRUBBER */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-3 sm:p-4 text-white max-w-lg mx-auto pointer-events-auto">
        
        {/* Recommendation / Trending Context Badge */}
        {video.recommendationReason && (
          <div className="mb-1.5 flex items-center gap-1.5 inline-flex">
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-md border shadow-sm ${
              video.recommendationReason.includes('Trending')
                ? 'bg-amber-500/25 border-amber-500/40 text-amber-300'
                : video.recommendationReason.includes('Because you')
                ? 'bg-sky-500/25 border-sky-500/40 text-sky-300'
                : video.recommendationReason.includes('Fresh')
                ? 'bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/25 border-rose-500/40 text-rose-300'
            }`}>
              {video.recommendationReason.includes('Trending') ? (
                <Flame className="h-3 w-3 fill-amber-400 text-amber-400" />
              ) : video.recommendationReason.includes('Because you') ? (
                <Zap className="h-3 w-3 fill-sky-400 text-sky-400" />
              ) : (
                <Sparkles className="h-3 w-3 text-rose-400" />
              )}
              <span>{video.recommendationReason}</span>
            </span>
          </div>
        )}

        {/* Creator Handle & Description */}
        <div className="mb-2 pr-16 text-left">
          <div
            onClick={e => {
              e.stopPropagation();
              onOpenCreatorProfile(video.userId);
            }}
            className="flex items-center gap-1.5 cursor-pointer hover:underline inline-flex"
          >
            <h3 className="text-sm sm:text-base font-bold text-white drop-shadow">
              @{video.user.username}
            </h3>
            {video.user.isVerified && (
              <span className="rounded-full bg-sky-500 p-0.5 text-[8px] text-white">✓</span>
            )}
          </div>

          <p className="mt-1 text-xs sm:text-sm text-zinc-100 leading-relaxed drop-shadow line-clamp-2">
            {video.caption.split(' ').map((word, idx) => {
              if (word.startsWith('#')) {
                return (
                  <span
                    key={idx}
                    onClick={e => {
                      e.stopPropagation();
                      if (onHashtagClick) onHashtagClick(word);
                    }}
                    className="font-bold text-sky-300 hover:text-sky-200 cursor-pointer mr-1"
                  >
                    {word}
                  </span>
                );
              }
              return word + ' ';
            })}
          </p>

          {/* Sound / Music Title */}
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-300">
            <Music className="h-3 w-3 shrink-0" />
            <span className="truncate text-[11px] font-medium">{video.musicName}</span>
          </div>
        </div>

        {/* EVERY VIDEO AUTOMATIC BANNER AD WITH SUBSEQUENT AD ROTATION */}
        <BannerAd
          ad={videoBannerAd}
          onRotateNextAd={handleTriggerNextAdImmediately}
          isLongVideo={isLongVideo}
        />

        {/* Full Watch Timeline & Interactive Scrubber Bar */}
        <div className="space-y-1 pt-1">
          {/* Timeline counter: Current Time / Total Duration */}
          <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-300 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-mono">{formatTime(currentTimeSec)}</span>
              <span className="text-zinc-500">/</span>
              <span className="text-zinc-400 font-mono">{formatTime(totalDurationSec)}</span>
              {isLongVideo && (
                <span className="rounded bg-amber-500/30 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 text-[9px] font-bold flex items-center gap-0.5">
                  <Sparkles className="h-2.5 w-2.5 text-yellow-300" />
                  लामो भिडियो (Next Add Supported)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {hasClaimedPoints ? (
                <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                  <Check className="h-3 w-3 text-emerald-400" /> Full Watch पूरा (+50)
                </span>
              ) : (
                <span className="text-amber-300 font-bold">
                  {progress >= 98 ? '१००% पूरा' : `${Math.round(progress)}% Full Watch`}
                </span>
              )}
            </div>
          </div>

          {/* Interactive Seek / Scrubber Bar (Full Watch Drag & Tap) */}
          <div
            ref={scrubberRef}
            onClick={handleScrubberClick}
            onTouchStart={handleScrubberClick}
            className="group relative h-3.5 w-full flex items-center cursor-pointer select-none"
            title="क्लिक वा ड्र्याग गरेर भिडियो अगाडि/पछाडि सार्नुहोस्"
          >
            {/* Background track */}
            <div className="h-1 group-hover:h-1.5 w-full bg-white/25 rounded-full overflow-hidden transition-all">
              <div
                style={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-75"
              />
            </div>
            {/* Scrubber thumb circle */}
            <div
              style={{ left: `calc(${progress}% - 5px)` }}
              className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-white shadow-md border border-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </div>

    </div>
  );
};
