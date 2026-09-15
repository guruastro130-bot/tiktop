import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown, Sparkles, RefreshCw, AlertCircle, Flame, Radio, Users, MessageCircle, Heart, Gift, Volume2 } from 'lucide-react';
import { Video, LiveRoom } from '../types';
import { VideoPlayer } from './VideoPlayer';
import { useAds } from '../context/AdContext';
import { useAuth } from '../context/AuthContext';

interface FeedViewProps {
  videos: Video[];
  liveRooms?: LiveRoom[];
  onSelectLiveRoom?: (room: LiveRoom) => void;
  onOpenComments: (video: Video) => void;
  onOpenShare: (video: Video) => void;
  onOpenCreatorProfile: (userId: string) => void;
  onHashtagClick: (tag: string) => void;
  onOpenLive?: () => void;
  onOpenAdmin?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export type FeedType = 'forYou' | 'trending' | 'following';

export type FeedItem =
  | { type: 'video'; data: Video }
  | { type: 'live'; data: LiveRoom };

export const FeedView: React.FC<FeedViewProps> = ({
  videos,
  liveRooms = [],
  onSelectLiveRoom,
  onOpenComments,
  onOpenShare,
  onOpenCreatorProfile,
  onHashtagClick,
  onOpenLive,
  onOpenAdmin,
  onRefresh,
  isLoading = false,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<FeedType>('forYou');
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [loadingTrending, setLoadingTrending] = useState<boolean>(false);
  const { validWatchedCount, adSettings, isFullScreenAdVisible } = useAds();
  const { isAdmin, currentUser } = useAuth();

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number>(0);
  const isScrollingRef = useRef<boolean>(false);

  // Active live streams
  const activeLiveRooms = React.useMemo(() => {
    return liveRooms.filter(r => r.status === 'live');
  }, [liveRooms]);

  // Fetch trending feed on demand
  const fetchTrendingFeed = useCallback(async () => {
    try {
      setLoadingTrending(true);
      const headers: Record<string, string> = {};
      if (currentUser?.id) {
        headers['x-user-id'] = currentUser.id;
      }
      const res = await fetch('/api/feed/trending', { headers });
      if (res.ok) {
        const data = await res.json();
        setTrendingVideos(data.videos || []);
      }
    } catch {
      // fallback to sorted props
    } finally {
      setLoadingTrending(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'trending' && trendingVideos.length === 0) {
      fetchTrendingFeed();
    }
  }, [activeTab, trendingVideos.length, fetchTrendingFeed]);

  const displayedVideos = React.useMemo(() => {
    if (activeTab === 'following') {
      const filtered = videos.filter(v => v.isFollowing || v.userId === 'user_sarah' || v.userId === 'user_marco');
      return filtered.length > 0 ? filtered : videos.slice(0, 3);
    }
    if (activeTab === 'trending') {
      return trendingVideos.length > 0 ? trendingVideos : videos;
    }
    return videos;
  }, [activeTab, videos, trendingVideos]);

  // Interleave live rooms directly into the For You feed so live streams are seen immediately
  const feedItems: FeedItem[] = React.useMemo(() => {
    const videoItems: FeedItem[] = displayedVideos.map(v => ({ type: 'video', data: v }));
    if (activeTab === 'forYou' && activeLiveRooms.length > 0) {
      const items: FeedItem[] = [];
      videoItems.forEach((vItem, idx) => {
        items.push(vItem);
        // Insert first live room right after 1st video
        if (idx === 0 && activeLiveRooms[0]) {
          items.push({ type: 'live', data: activeLiveRooms[0] });
        }
        // Insert second live room after 3rd video if available
        else if (idx === 2 && activeLiveRooms[1]) {
          items.push({ type: 'live', data: activeLiveRooms[1] });
        }
      });
      return items;
    }
    return videoItems;
  }, [displayedVideos, activeTab, activeLiveRooms]);

  // Handle hashtag click with interest learning tracking
  const handleHashtagClickWithTracking = (tag: string) => {
    // Record interest signal in background
    if (currentUser?.id) {
      fetch('/api/user/interests/interact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ hashtag: tag.replace('#', '') }),
      }).catch(() => {});
    }
    onHashtagClick(tag);
  };

  // Make sure activeIndex stays within bounds when tabs or item list changes
  useEffect(() => {
    if (activeIndex >= feedItems.length && feedItems.length > 0) {
      setActiveIndex(feedItems.length - 1);
    }
  }, [feedItems.length, activeIndex]);

  const goToNextItem = useCallback(() => {
    if (isFullScreenAdVisible) return;
    if (activeIndex < feedItems.length - 1) {
      setActiveIndex(prev => prev + 1);
    }
  }, [activeIndex, feedItems.length, isFullScreenAdVisible]);

  const goToPrevItem = useCallback(() => {
    if (isFullScreenAdVisible) return;
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    }
  }, [activeIndex, isFullScreenAdVisible]);

  // Handle Keyboard Navigation (ArrowUp, ArrowDown) - strictly manual
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFullScreenAdVisible) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        goToNextItem();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        goToPrevItem();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextItem, goToPrevItem, isFullScreenAdVisible]);

  // Handle Wheel Scroll (Debounced, strictly manual)
  const handleWheel = (e: React.WheelEvent) => {
    if (isFullScreenAdVisible) return;
    if (isScrollingRef.current) return;
    if (Math.abs(e.deltaY) > 30) {
      isScrollingRef.current = true;
      if (e.deltaY > 0) {
        goToNextItem();
      } else {
        goToPrevItem();
      }
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 400);
    }
  };

  // Touch Swipe Handling (Swipe Up = Next, Swipe Down = Prev) - strictly manual
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isFullScreenAdVisible) return;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isFullScreenAdVisible) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartYRef.current - touchEndY;
    const SWIPE_THRESHOLD = 50;

    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        // Swiped UP -> next item
        goToNextItem();
      } else {
        // Swiped DOWN -> previous item
        goToPrevItem();
      }
    }
  };

  const currentItem = feedItems[activeIndex];
  // Next video to preload
  const nextItem = feedItems[activeIndex + 1];
  const nextVideo = nextItem?.type === 'video' ? nextItem.data : null;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative h-full w-full bg-black overflow-hidden select-none flex flex-col items-center justify-center"
    >
      {/* Preload the NEXT video (only 1 next video) to ensure instant swipe response */}
      {nextVideo && (
        <link rel="preload" as="video" href={nextVideo.videoUrl} crossOrigin="anonymous" />
      )}

      {/* Top Header Navigation: LIVE | Following | For You | Trending & Milestone Indicator */}
      <div className="absolute top-3 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-4 max-w-lg mx-auto pointer-events-none">
        
        {/* Left Side: Ad Progress Badge (LIVE menu option removed per request) */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-md border border-white/10">
            <Sparkles className="h-2.5 w-2.5 text-amber-400" />
            <span>{validWatchedCount}/{adSettings.fullscreenAdInterval}</span>
          </div>
        </div>

        {/* Center Tabs: Following | For You | Trending */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-bold text-white/70 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
          <button
            type="button"
            onClick={() => {
              setActiveTab('following');
              setActiveIndex(0);
            }}
            className={`transition-colors relative py-0.5 ${
              activeTab === 'following' ? 'text-white scale-105 font-black' : 'hover:text-white/90'
            }`}
          >
            Following
            {activeTab === 'following' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded bg-white" />
            )}
          </button>

          <span className="text-white/20 text-[10px]">•</span>

          <button
            type="button"
            onClick={() => {
              setActiveTab('forYou');
              setActiveIndex(0);
            }}
            className={`transition-colors relative py-0.5 ${
              activeTab === 'forYou' ? 'text-white scale-105 font-black' : 'hover:text-white/90'
            }`}
          >
            For You
            {activeTab === 'forYou' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded bg-rose-500" />
            )}
          </button>

          <span className="text-white/20 text-[10px]">•</span>

          <button
            type="button"
            onClick={() => {
              setActiveTab('trending');
              setActiveIndex(0);
            }}
            className={`transition-colors relative py-0.5 flex items-center gap-1 ${
              activeTab === 'trending' ? 'text-amber-400 scale-105 font-black' : 'hover:text-amber-300/80'
            }`}
          >
            <Flame className={`h-3 w-3 ${activeTab === 'trending' ? 'fill-amber-400' : ''}`} />
            <span>Trending</span>
            {activeTab === 'trending' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded bg-amber-400" />
            )}
          </button>
        </div>

        {/* Admin Switch Quick Button */}
        <div className="pointer-events-auto">
          {isAdmin && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="flex items-center gap-1 rounded-full bg-rose-500/80 px-2.5 py-1 text-[11px] font-bold text-white shadow hover:bg-rose-600 transition-colors backdrop-blur-md"
              title="Open Admin Dashboard"
            >
              <span className="font-bold">Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Top LIVE Friends & Creators Bar: Visible at top of Home feed whenever friends/creators are live */}
      {activeLiveRooms.length > 0 && (
        <div className="absolute top-13 sm:top-14 left-0 right-0 z-20 px-3 flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto py-1 max-w-lg mx-auto">
          {/* Live indicator capsule */}
          <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-black/75 backdrop-blur-md px-2.5 py-1 border border-rose-500/40 shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span className="text-[10px] font-black text-white tracking-wider uppercase">
              Live Friends
            </span>
          </div>

          {/* Horizontally scrollable live friends story capsules */}
          {activeLiveRooms.map(room => (
            <button
              key={room.id}
              type="button"
              onClick={() => onSelectLiveRoom?.(room)}
              className="flex items-center gap-2 bg-black/75 backdrop-blur-md rounded-full pl-1 pr-3 py-1 border border-rose-500/50 hover:border-rose-400 hover:bg-black/90 transition-all active:scale-95 group shrink-0 shadow-xl cursor-pointer"
              title={`${room.host.displayName} is LIVE now!`}
            >
              {/* Creator Avatar with Animated Live Gradient Ring */}
              <div className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 animate-pulse">
                <img
                  src={room.host.avatarUrl}
                  alt={room.host.displayName}
                  className="h-6 w-6 rounded-full object-cover border border-black"
                />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-rose-600 text-[8px] font-black text-white px-1 rounded-full leading-tight uppercase shadow-sm">
                  {room.type === 'voice' ? 'Party' : 'Live'}
                </span>
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-white leading-tight flex items-center gap-1">
                  <span className="max-w-[80px] truncate">{room.host.displayName}</span>
                  <span className="text-[9px] text-rose-400 font-bold font-mono">
                    👁️ {room.viewerCount}
                  </span>
                </p>
                {room.title && (
                  <p className="text-[9px] text-zinc-400 max-w-[95px] truncate font-normal leading-none mt-0.5">
                    {room.title}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main Feed View Stage */}
      {isLoading || (activeTab === 'trending' && loadingTrending) ? (
        <div className="flex flex-col items-center justify-center text-center text-white p-6 space-y-3">
          <RefreshCw className="h-8 w-8 text-rose-500 animate-spin" />
          <p className="text-sm font-bold text-zinc-300">
            {activeTab === 'trending' ? 'Loading trending videos...' : 'Curating your recommended feed...'}
          </p>
        </div>
      ) : feedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center text-white p-6 max-w-xs">
          <div className="rounded-full bg-zinc-900 border border-white/10 p-4 mb-3 text-zinc-400">
            <Radio className="h-8 w-8" />
          </div>
          <p className="text-base font-bold">No content available</p>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            {activeTab === 'following'
              ? 'None of the creators you follow have published videos yet.'
              : 'Unable to load videos right now. Check your connection or retry.'}
          </p>
          <div className="mt-4 flex items-center gap-2">
            {activeTab === 'following' ? (
              <button
                type="button"
                onClick={() => setActiveTab('forYou')}
                className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-600 shadow-md transition-colors"
              >
                Go to For You
              </button>
            ) : (
              onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-600 shadow-md transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Feed</span>
                </button>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="relative h-full w-full max-w-md mx-auto flex items-center justify-center">
          {/* Active Item: Video or In-Feed Live Room Card */}
          {currentItem && currentItem.type === 'video' ? (
            <VideoPlayer
              key={`${activeTab}_video_${currentItem.data.id}`}
              video={currentItem.data}
              isActive={true}
              onOpenComments={onOpenComments}
              onOpenShare={onOpenShare}
              onOpenCreatorProfile={onOpenCreatorProfile}
              onHashtagClick={handleHashtagClickWithTracking}
            />
          ) : currentItem && currentItem.type === 'live' ? (
            /* In-Feed Live Stream Card */
            <div
              key={`feed_live_${currentItem.data.id}`}
              className="relative h-full w-full bg-zinc-950 flex flex-col justify-between p-5 overflow-hidden select-none"
            >
              {/* Animated Live Ambient Background */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                  src={currentItem.data.coverUrl || currentItem.data.host.avatarUrl}
                  alt={currentItem.data.title}
                  className="h-full w-full object-cover scale-110 blur-xl opacity-30 filter"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />

                {/* Animated Pulsing Soundwave / Live Radar Rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-64 w-64 rounded-full border border-rose-500/20 animate-ping opacity-25" />
                  <div className="absolute h-48 w-48 rounded-full border border-pink-500/30 animate-pulse" />
                </div>
              </div>

              {/* In-Feed Live Top Header */}
              <div className="relative z-10 pt-16 flex items-start justify-between">
                {/* Host Info Chip */}
                <button
                  type="button"
                  onClick={() => onSelectLiveRoom?.(currentItem.data)}
                  className="flex items-center gap-2.5 bg-black/60 backdrop-blur-md p-1.5 pr-4 rounded-full border border-white/10 hover:border-rose-500 transition-all cursor-pointer text-left"
                >
                  <div className="relative">
                    <img
                      src={currentItem.data.host.avatarUrl}
                      alt={currentItem.data.host.displayName}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-rose-500 ring-offset-1 ring-offset-black"
                    />
                    <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[8px] font-black text-white">
                      🔴
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white flex items-center gap-1">
                      <span>{currentItem.data.host.displayName}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">@{currentItem.data.host.username}</span>
                    </h3>
                    <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                      <Radio className="h-2.5 w-2.5 animate-pulse" />
                      <span>LIVE प्रसारण भइरहेको छ</span>
                    </p>
                  </div>
                </button>

                {/* Live Viewer Badge */}
                <div className="flex items-center gap-1.5 rounded-full bg-rose-600/90 backdrop-blur-md px-3 py-1 text-[11px] font-black text-white shadow-lg border border-white/20">
                  <Users className="h-3 w-3" />
                  <span>{currentItem.data.viewerCount.toLocaleString()} watching</span>
                </div>
              </div>

              {/* Center Live Details & Interaction Simulation */}
              <div
                onClick={() => onSelectLiveRoom?.(currentItem.data)}
                className="relative z-10 my-auto text-center space-y-4 cursor-pointer"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold">
                  <Radio className="h-3.5 w-3.5 animate-ping" />
                  <span>{currentItem.data.type === 'voice' ? '🎙️ भ्वाइस रुम (Voice Room)' : '📹 भिडियो लाइभ (Video Stream)'}</span>
                </div>

                <h2 className="text-xl font-black text-white px-4 leading-tight drop-shadow-md">
                  {currentItem.data.title}
                </h2>

                {/* Simulated Floating Live Comments */}
                <div className="max-w-xs mx-auto space-y-1.5 text-left text-xs">
                  <div className="bg-black/50 backdrop-blur-xs rounded-xl px-3 py-1.5 text-white/90 border border-white/5 flex items-center gap-2 animate-fadeIn">
                    <span className="font-bold text-rose-400">{currentItem.data.host.displayName}:</span>
                    <span className="truncate">सबै साथीहरूलाई लाइभमा स्वागत छ! 🌸</span>
                  </div>
                  <div className="bg-black/50 backdrop-blur-xs rounded-xl px-3 py-1.5 text-white/90 border border-white/5 flex items-center gap-2 animate-fadeIn">
                    <span className="font-bold text-amber-400">Gift Alert:</span>
                    <span className="truncate">Lucky Gift Jackpot खेल्दै कोइन जित्नुहोस्! 🎁✨</span>
                  </div>
                </div>
              </div>

              {/* Bottom In-Feed Live Call to Action */}
              <div className="relative z-10 pb-16 space-y-2">
                <button
                  type="button"
                  onClick={() => onSelectLiveRoom?.(currentItem.data)}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:from-rose-500 hover:to-pink-500 text-white font-black text-sm shadow-xl shadow-rose-600/30 active:scale-98 transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-white/20 animate-pulse"
                >
                  <Radio className="h-5 w-5" />
                  <span>🔴 लाइभमा जोडिनुहोस् (Watch LIVE Now)</span>
                </button>

                <p className="text-center text-[10px] text-zinc-400">
                  सिधै च्याट गर्नुहोस्, गेस्ट सिटमा बस्नुहोस् र लक्की गिफ्ट पठाउनुहोस् • 👆 अर्को भिडियोको लागि माथि स्वाइप गर्नुहोस्
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Floating Desktop Next / Prev Navigation Arrows */}
      <div className="hidden sm:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col gap-3 z-30">
        <button
          type="button"
          disabled={activeIndex === 0}
          onClick={goToPrevItem}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900/80 text-white border border-white/15 backdrop-blur-md hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xl active:scale-95 cursor-pointer"
          title="Previous (Up Arrow)"
        >
          <ChevronUp className="h-6 w-6" />
        </button>

        <button
          type="button"
          disabled={activeIndex >= feedItems.length - 1}
          onClick={goToNextItem}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900/80 text-white border border-white/15 backdrop-blur-md hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xl active:scale-95 cursor-pointer"
          title="Next (Down Arrow)"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>

    </div>
  );
};

