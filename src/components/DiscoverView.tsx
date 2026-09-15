import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Flame,
  TrendingUp,
  Hash,
  Play,
  User as UserIcon,
  X,
  Check,
  UserPlus,
  UserCheck,
  Eye,
  Heart,
  Music2,
  Sparkles,
  Layers,
  ArrowUpDown,
  Filter,
  Users,
  Radio,
} from 'lucide-react';
import { Video, User, SearchResults, DiscoverData, HashtagInfo, LiveRoom } from '../types';
import { useAuth } from '../context/AuthContext';

interface DiscoverViewProps {
  videos: Video[];
  onSelectVideo: (video: Video) => void;
  onSelectCreator: (userId: string) => void;
  initialSearchQuery?: string;
  liveRooms?: LiveRoom[];
  onSelectLiveRoom?: (room: LiveRoom) => void;
  onOpenGoLive?: () => void;
}

type SearchCategory = 'top' | 'videos' | 'users' | 'hashtags';
type DiscoverTab = 'trending' | 'popular' | 'hashtags' | 'creators';

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  videos,
  onSelectVideo,
  onSelectCreator,
  initialSearchQuery = '',
  liveRooms = [],
  onSelectLiveRoom,
  onOpenGoLive,
}) => {
  const { currentUser } = useAuth();

  // Search input and debounce
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialSearchQuery);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('top');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Discover sub-tabs
  const [activeDiscoverTab, setActiveDiscoverTab] = useState<DiscoverTab>('trending');
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(
    initialSearchQuery.startsWith('#') ? initialSearchQuery.replace('#', '') : null
  );
  const [hashtagSort, setHashtagSort] = useState<'popular' | 'recent'>('popular');

  // Data states
  const [discoverData, setDiscoverData] = useState<DiscoverData | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [loadingDiscover, setLoadingDiscover] = useState<boolean>(true);

  // Local follow state tracking for instant UI responsiveness
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followersCountMap, setFollowersCountMap] = useState<Record<string, number>>({});
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync initialSearchQuery when triggered externally (e.g. from Feed hashtag click)
  useEffect(() => {
    if (initialSearchQuery) {
      if (initialSearchQuery.startsWith('#')) {
        setSelectedHashtag(initialSearchQuery.replace('#', ''));
        setSearchQuery('');
        setDebouncedQuery('');
      } else {
        setSelectedHashtag(null);
        setSearchQuery(initialSearchQuery);
        setDebouncedQuery(initialSearchQuery);
      }
    }
  }, [initialSearchQuery]);

  // Fetch Discover data on load
  const fetchDiscoverData = async () => {
    try {
      setLoadingDiscover(true);
      const headers: Record<string, string> = {};
      if (currentUser?.id) {
        headers['x-user-id'] = currentUser.id;
      }
      const res = await fetch('/api/discover', { headers });
      if (res.ok) {
        const data: DiscoverData = await res.json();
        setDiscoverData(data);

        // Sync follow map
        const fMap: Record<string, boolean> = {};
        const countMap: Record<string, number> = {};
        data.popularCreators.forEach(c => {
          fMap[c.id] = !!c.isFollowing;
          countMap[c.id] = c.followersCount;
        });
        setFollowingMap(prev => ({ ...fMap, ...prev }));
        setFollowersCountMap(prev => ({ ...countMap, ...prev }));
      }
    } catch {
      // Fallback handled gracefully
    } finally {
      setLoadingDiscover(false);
    }
  };

  useEffect(() => {
    fetchDiscoverData();
  }, [currentUser?.id]);

  // Fetch Search results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    const fetchSearch = async () => {
      setIsSearching(true);
      try {
        const headers: Record<string, string> = {};
        if (currentUser?.id) {
          headers['x-user-id'] = currentUser.id;
        }
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, { headers });
        if (res.ok && isMounted) {
          const data = await res.json();
          setSearchResults(data.results);

          // Update follow states
          if (data.results?.users) {
            const fMap: Record<string, boolean> = {};
            const countMap: Record<string, number> = {};
            data.results.users.forEach((u: User & { isFollowing?: boolean }) => {
              fMap[u.id] = !!u.isFollowing;
              countMap[u.id] = u.followersCount;
            });
            setFollowingMap(prev => ({ ...prev, ...fMap }));
            setFollowersCountMap(prev => ({ ...prev, ...countMap }));
          }
        }
      } catch {
        // graceful catch
      } finally {
        if (isMounted) setIsSearching(false);
      }
    };

    fetchSearch();
    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, currentUser?.id]);

  // Handle follow / unfollow
  const handleToggleFollow = async (e: React.MouseEvent, targetUserId: string) => {
    e.stopPropagation();
    if (!targetUserId) return;

    const currentlyFollowing = !!followingMap[targetUserId];
    const currentCount = followersCountMap[targetUserId] || 0;

    // Optimistic UI update
    setFollowingMap(prev => ({ ...prev, [targetUserId]: !currentlyFollowing }));
    setFollowersCountMap(prev => ({
      ...prev,
      [targetUserId]: currentlyFollowing ? Math.max(0, currentCount - 1) : currentCount + 1,
    }));
    setFollowLoading(prev => ({ ...prev, [targetUserId]: true }));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.id) {
        headers['x-user-id'] = currentUser.id;
      }
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setFollowingMap(prev => ({ ...prev, [targetUserId]: data.following }));
        setFollowersCountMap(prev => ({ ...prev, [targetUserId]: data.followersCount }));
      } else {
        // Revert on error
        setFollowingMap(prev => ({ ...prev, [targetUserId]: currentlyFollowing }));
        setFollowersCountMap(prev => ({ ...prev, [targetUserId]: currentCount }));
      }
    } catch {
      // Revert on error
      setFollowingMap(prev => ({ ...prev, [targetUserId]: currentlyFollowing }));
      setFollowersCountMap(prev => ({ ...prev, [targetUserId]: currentCount }));
    } finally {
      setFollowLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
  };

  // Filtered videos for selected hashtag
  const hashtagVideos = useMemo(() => {
    if (!selectedHashtag) return [];
    const tag = selectedHashtag.toLowerCase().replace('#', '');
    const list = videos.filter(v =>
      v.status === 'active' && v.hashtags.some(h => h.toLowerCase() === tag)
    );
    if (hashtagSort === 'popular') {
      return [...list].sort((a, b) => b.viewsCount - a.viewsCount || b.likesCount - a.likesCount);
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [selectedHashtag, videos, hashtagSort]);

  const hasSearchText = debouncedQuery.length > 0;

  return (
    <div className="h-full w-full bg-zinc-950 text-white overflow-y-auto pb-24 scroll-smooth">
      {/* Sticky Header & Search Bar */}
      <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-white/10 px-4 py-3 max-w-2xl mx-auto">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-zinc-400" />
          <input
            id="discover-search-input"
            type="text"
            placeholder="Search creators, videos, sounds, #hashtags..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (selectedHashtag && e.target.value) {
                setSelectedHashtag(null);
              }
            }}
            className="w-full rounded-full border border-white/10 bg-zinc-900/90 py-2.5 pl-10 pr-10 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:bg-zinc-900 focus:ring-1 focus:ring-rose-500 focus:outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              id="clear-search-btn"
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDebouncedQuery('');
                setSearchResults(null);
              }}
              className="absolute right-3 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {isSearching && (
            <div className="absolute right-9 h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          )}
        </div>

        {/* Categories Bar when Searching */}
        {hasSearchText && (
          <div className="flex items-center gap-2 mt-3 pt-1 overflow-x-auto no-scrollbar border-t border-white/5">
            {(
              [
                { id: 'top', label: 'Top' },
                { id: 'videos', label: 'Videos' },
                { id: 'users', label: 'Users' },
                { id: 'hashtags', label: 'Hashtags' },
              ] as const
            ).map(cat => (
              <button
                key={cat.id}
                id={`search-tab-${cat.id}`}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`relative px-4 py-1.5 text-xs font-semibold rounded-full transition-all shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {/* ========================================================================= */}
        {/* 1. SEARCH RESULTS VIEW                                                    */}
        {/* ========================================================================= */}
        {hasSearchText ? (
          <div className="space-y-6 animate-fadeIn">
            {/* SEARCH: TOP TAB */}
            {activeCategory === 'top' && (
              <div className="space-y-6">
                {/* Top Creators Matches */}
                {searchResults?.top.creators && searchResults.top.creators.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        <Users className="h-3.5 w-3.5 text-rose-500" />
                        <span>Creators</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveCategory('users')}
                        className="text-[11px] text-rose-400 font-semibold hover:underline"
                      >
                        See all users
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {searchResults.top.creators.map(creator => (
                        <div
                          key={creator.id}
                          id={`search-creator-${creator.id}`}
                          onClick={() => onSelectCreator(creator.id)}
                          className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/90 border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={creator.avatarUrl}
                              alt={creator.displayName}
                              className="h-12 w-12 rounded-full object-cover border border-white/10 shrink-0 group-hover:scale-105 transition-transform"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-bold text-white truncate">
                                  {creator.displayName}
                                </p>
                                {creator.isVerified && (
                                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-[9px] text-white">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-400 truncate">@{creator.username}</p>
                              {creator.bio && (
                                <p className="text-[11px] text-zinc-500 truncate mt-0.5 max-w-xs">
                                  {creator.bio}
                                </p>
                              )}
                              <p className="text-[10px] text-zinc-400 mt-1 font-medium">
                                {formatNumber(followersCountMap[creator.id] ?? creator.followersCount)}{' '}
                                followers
                              </p>
                            </div>
                          </div>

                          <button
                            id={`follow-creator-${creator.id}`}
                            type="button"
                            onClick={e => handleToggleFollow(e, creator.id)}
                            disabled={followLoading[creator.id]}
                            className={`shrink-0 ml-3 px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                              followingMap[creator.id]
                                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-white/10'
                                : 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-500/30'
                            }`}
                          >
                            {followingMap[creator.id] ? (
                              <>
                                <UserCheck className="h-3.5 w-3.5" />
                                <span>Following</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-3.5 w-3.5" />
                                <span>Follow</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Hashtag Matches */}
                {searchResults?.top.hashtags && searchResults.top.hashtags.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        <Hash className="h-3.5 w-3.5 text-sky-400" />
                        <span>Matching Hashtags</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveCategory('hashtags')}
                        className="text-[11px] text-sky-400 font-semibold hover:underline"
                      >
                        See all
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {searchResults.top.hashtags.map(item => (
                        <div
                          key={item.tag}
                          onClick={() => {
                            setSelectedHashtag(item.tag);
                            setSearchQuery('');
                            setDebouncedQuery('');
                          }}
                          className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors shrink-0">
                              <Hash className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">#{item.tag}</p>
                              <p className="text-[10px] text-zinc-400">
                                {formatNumber(item.viewsCount)} views
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Videos Grid */}
                {searchResults?.top.videos && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        <Play className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" />
                        <span>Videos</span>
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        {searchResults.top.videos.length} videos
                      </span>
                    </div>

                    {searchResults.top.videos.length === 0 ? (
                      <div className="py-10 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-white/5">
                        <Search className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                        <p className="text-xs font-semibold text-zinc-400">No matching videos</p>
                        <p className="text-[11px] text-zinc-600 mt-0.5">
                          Try searching for another keyword or hashtag
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {searchResults.top.videos.map(v => (
                          <div
                            key={v.id}
                            id={`video-result-${v.id}`}
                            onClick={() => onSelectVideo(v)}
                            className="group relative aspect-9/16 overflow-hidden rounded-xl bg-zinc-900 border border-white/5 cursor-pointer hover:border-white/20 transition-all"
                          >
                            <img
                              src={v.thumbnailUrl}
                              alt={v.caption}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />

                            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-xs">
                              <span>@{v.user.username}</span>
                            </div>

                            <div className="absolute bottom-2 left-2 right-2 text-white text-[11px] space-y-1">
                              <p className="text-[11px] font-medium line-clamp-2 leading-snug drop-shadow-xs text-zinc-200">
                                {v.caption}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-zinc-300 pt-0.5 font-semibold">
                                <div className="flex items-center gap-1">
                                  <Play className="h-3 w-3 fill-white" />
                                  <span>{formatNumber(v.viewsCount)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                                  <span>{formatNumber(v.likesCount)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SEARCH: VIDEOS TAB */}
            {activeCategory === 'videos' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    All Matching Videos
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    {searchResults?.videos?.length || 0} results
                  </span>
                </div>

                {!searchResults?.videos || searchResults.videos.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-white/5">
                    <Play className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                    <p className="text-sm font-semibold text-zinc-400">No videos found</p>
                    <p className="text-xs text-zinc-600 mt-1">Try another keyword or creator name</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {searchResults.videos.map(v => (
                      <div
                        key={v.id}
                        onClick={() => onSelectVideo(v)}
                        className="group relative aspect-9/16 overflow-hidden rounded-xl bg-zinc-900 border border-white/5 cursor-pointer hover:border-white/20 transition-all"
                      >
                        <img
                          src={v.thumbnailUrl}
                          alt={v.caption}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />

                        <div className="absolute top-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-xs">
                          @{v.user.username}
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 text-white text-[11px] space-y-1">
                          <p className="text-[11px] font-medium line-clamp-2 leading-snug drop-shadow-xs text-zinc-200">
                            {v.caption}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-zinc-300 pt-0.5 font-semibold">
                            <div className="flex items-center gap-1">
                              <Play className="h-3 w-3 fill-white" />
                              <span>{formatNumber(v.viewsCount)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                              <span>{formatNumber(v.likesCount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SEARCH: USERS TAB */}
            {activeCategory === 'users' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Creators & Accounts
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    {searchResults?.users?.length || 0} creators
                  </span>
                </div>

                {!searchResults?.users || searchResults.users.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-white/5">
                    <UserIcon className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                    <p className="text-sm font-semibold text-zinc-400">No creators found</p>
                    <p className="text-xs text-zinc-600 mt-1">Try another creator name or handle</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {searchResults.users.map(user => (
                      <div
                        key={user.id}
                        onClick={() => onSelectCreator(user.id)}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/90 border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="h-14 w-14 rounded-full object-cover border border-white/10 shrink-0 group-hover:scale-105 transition-transform"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-bold text-white truncate">
                                {user.displayName}
                              </p>
                              {user.isVerified && (
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-[9px] text-white">
                                  ✓
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 font-medium truncate">
                              @{user.username}
                            </p>
                            {user.bio && (
                              <p className="text-xs text-zinc-400 line-clamp-1 mt-1">{user.bio}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400 font-medium">
                              <span>
                                <strong className="text-white">
                                  {formatNumber(followersCountMap[user.id] ?? user.followersCount)}
                                </strong>{' '}
                                followers
                              </span>
                              <span>•</span>
                              <span>
                                <strong className="text-white">
                                  {formatNumber(user.likesReceivedCount || 0)}
                                </strong>{' '}
                                likes
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={e => handleToggleFollow(e, user.id)}
                          disabled={followLoading[user.id]}
                          className={`shrink-0 ml-3 px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                            followingMap[user.id]
                              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-white/10'
                              : 'bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-500/20'
                          }`}
                        >
                          {followingMap[user.id] ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SEARCH: HASHTAGS TAB */}
            {activeCategory === 'hashtags' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Hashtags
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    {searchResults?.hashtags?.length || 0} tags
                  </span>
                </div>

                {!searchResults?.hashtags || searchResults.hashtags.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-white/5">
                    <Hash className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                    <p className="text-sm font-semibold text-zinc-400">No hashtags found</p>
                    <p className="text-xs text-zinc-600 mt-1">Try another keyword</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.hashtags.map(item => (
                      <div
                        key={item.tag}
                        onClick={() => {
                          setSelectedHashtag(item.tag);
                          setSearchQuery('');
                          setDebouncedQuery('');
                        }}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/90 border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors shrink-0 font-bold">
                            <Hash className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">#{item.tag}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {formatNumber(item.videoCount)} videos •{' '}
                              {formatNumber(item.viewsCount)} views
                            </p>
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-sky-400 group-hover:translate-x-0.5 transition-transform">
                          View →
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : selectedHashtag ? (
          /* ========================================================================= */
          /* 2. HASHTAG FILTER VIEW                                                    */
          /* ========================================================================= */
          <div className="space-y-5 animate-fadeIn">
            {/* Dedicated Hashtag Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800/80 p-4 border border-white/10 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-500 border border-rose-500/30">
                    <Hash className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">#{selectedHashtag}</h2>
                    <p className="text-xs text-zinc-400 font-medium">
                      {hashtagVideos.length} videos •{' '}
                      {formatNumber(hashtagVideos.reduce((acc, v) => acc + v.viewsCount, 0))} total
                      views
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedHashtag(null)}
                  className="rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white border border-white/10 transition-colors"
                >
                  All Topics
                </button>
              </div>

              {/* Sort selector for hashtag */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 text-xs">
                <span className="text-zinc-400 font-medium">Sort by:</span>
                <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-full border border-white/5">
                  <button
                    type="button"
                    onClick={() => setHashtagSort('popular')}
                    className={`px-3 py-1 rounded-full font-bold transition-colors ${
                      hashtagSort === 'popular'
                        ? 'bg-rose-500 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Popular
                  </button>
                  <button
                    type="button"
                    onClick={() => setHashtagSort('recent')}
                    className={`px-3 py-1 rounded-full font-bold transition-colors ${
                      hashtagSort === 'recent'
                        ? 'bg-rose-500 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Recent
                  </button>
                </div>
              </div>
            </div>

            {/* Video grid for hashtag */}
            {hashtagVideos.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-white/5">
                <Hash className="h-10 w-10 mx-auto mb-3 text-zinc-600" />
                <p className="text-sm font-semibold text-zinc-400">No videos with #{selectedHashtag}</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Be the first creator to upload a video with this hashtag!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {hashtagVideos.map(v => (
                  <div
                    key={v.id}
                    onClick={() => onSelectVideo(v)}
                    className="group relative aspect-9/16 overflow-hidden rounded-xl bg-zinc-900 border border-white/5 cursor-pointer hover:border-white/20 transition-all"
                  >
                    <img
                      src={v.thumbnailUrl}
                      alt={v.caption}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />

                    <div className="absolute top-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-xs">
                      @{v.user.username}
                    </div>

                    <div className="absolute bottom-2 left-2 right-2 text-white text-[11px] space-y-1">
                      <p className="text-[11px] font-medium line-clamp-2 leading-snug drop-shadow-xs text-zinc-200">
                        {v.caption}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-zinc-300 pt-0.5 font-semibold">
                        <div className="flex items-center gap-1">
                          <Play className="h-3 w-3 fill-white" />
                          <span>{formatNumber(v.viewsCount)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                          <span>{formatNumber(v.likesCount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* 3. DEFAULT DISCOVER FEED (TRENDING, POPULAR, CREATORS, TOPICS)            */
          /* ========================================================================= */
          <div className="space-y-6 animate-fadeIn">
            {/* 🔥 TOP: Popular & Trending LIVE Streams */}
            {liveRooms.filter(r => r.status === 'live').length > 0 && (
              <div className="space-y-3 pb-2 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-500 border border-rose-500/30">
                      <Radio className="h-4 w-4 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>Popular & Trending LIVE</span>
                        <span className="text-[10px] font-extrabold bg-rose-600 text-white px-1.5 py-0.5 rounded-full uppercase">
                          🔴 Live ({liveRooms.filter(r => r.status === 'live').length})
                        </span>
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        प्रत्यक्ष प्रसारणमा जोडिनुहोस् र कुराकानी गर्नुहोस्
                      </p>
                    </div>
                  </div>

                  {onOpenGoLive && (
                    <button
                      type="button"
                      onClick={onOpenGoLive}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-500/90 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all active:scale-95 cursor-pointer"
                    >
                      <Radio className="h-3.5 w-3.5" />
                      <span>Go Live</span>
                    </button>
                  )}
                </div>

                {/* Horizontal Carousel of Live Cards */}
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 pt-1">
                  {liveRooms
                    .filter(r => r.status === 'live')
                    .map(room => (
                      <div
                        key={room.id}
                        onClick={() => onSelectLiveRoom?.(room)}
                        className="group relative w-44 sm:w-52 shrink-0 aspect-3/4 overflow-hidden rounded-2xl bg-zinc-900 border border-white/10 hover:border-rose-500/60 transition-all cursor-pointer shadow-lg hover:shadow-rose-500/10"
                      >
                        {/* Background Image / Cover */}
                        <img
                          src={room.coverUrl || room.host.avatarUrl}
                          alt={room.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/60" />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                          <span className="flex items-center gap-1 rounded-full bg-rose-600/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                            {room.type === 'voice' ? 'Party' : 'LIVE'}
                          </span>

                          <span className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-white/90">
                            <Eye className="h-3 w-3 text-rose-400" />
                            <span>{formatNumber(room.viewerCount)}</span>
                          </span>
                        </div>

                        {/* Category Tag if available */}
                        {room.category && (
                          <div className="absolute top-8 left-2.5 rounded-md bg-black/50 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-medium text-zinc-300">
                            {room.category === 'nepal'
                              ? '🇳🇵 नेपाल'
                              : room.category === 'music'
                              ? '🎵 संगीत'
                              : room.category === 'gaming'
                              ? '🎮 गेमिङ'
                              : room.category === 'chat'
                              ? '💬 च्याट'
                              : room.category}
                          </div>
                        )}

                        {/* Bottom Info: Host & Title & Diamonds */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="relative shrink-0 p-[1px] rounded-full bg-gradient-to-tr from-rose-500 to-amber-400">
                              <img
                                src={room.host.avatarUrl}
                                alt={room.host.displayName}
                                className="h-6 w-6 rounded-full object-cover border border-black"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate group-hover:text-rose-400 transition-colors flex items-center gap-1">
                                <span>{room.host.displayName}</span>
                                {room.host.isVerified && (
                                  <span className="flex h-3 w-3 items-center justify-center rounded-full bg-sky-500 text-[7px] text-white">
                                    ✓
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-zinc-400 truncate">@{room.host.username}</p>
                            </div>
                          </div>

                          <p className="text-[11px] font-semibold text-zinc-200 line-clamp-1 leading-snug">
                            {room.title}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
                            <span className="flex items-center gap-0.5 text-amber-300 font-semibold">
                              💎 {formatNumber(room.diamondCount || 0)}
                            </span>
                            <span className="text-rose-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                              Join →
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Discover Sub-Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {(
                [
                  { id: 'trending', label: '🔥 Trending', icon: Flame },
                  { id: 'popular', label: '⭐ Popular', icon: TrendingUp },
                  { id: 'hashtags', label: '#️⃣ Topics & Tags', icon: Hash },
                  { id: 'creators', label: '👥 Creators', icon: Users },
                ] as const
              ).map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    id={`discover-tab-${tab.id}`}
                    type="button"
                    onClick={() => setActiveDiscoverTab(tab.id)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                      activeDiscoverTab === tab.id
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB: TRENDING */}
            {activeDiscoverTab === 'trending' && (
              <div className="space-y-6">
                {/* Trending Topics Carousel */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      <Flame className="h-4 w-4 text-rose-500" />
                      <span>Trending Topics</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveDiscoverTab('hashtags')}
                      className="text-[11px] text-rose-400 font-semibold hover:underline"
                    >
                      View all
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                    {(discoverData?.trendingHashtags || []).slice(0, 8).map(item => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => setSelectedHashtag(item.tag)}
                        className="shrink-0 flex items-center gap-2 rounded-2xl bg-zinc-900/90 border border-white/10 px-3.5 py-2.5 hover:border-rose-500/50 hover:bg-zinc-800/90 transition-all text-left group"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                          <Hash className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors">
                            #{item.tag}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {formatNumber(item.viewsCount)} views
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Popular Creators Carousel */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      <TrendingUp className="h-4 w-4 text-sky-400" />
                      <span>Popular Creators</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveDiscoverTab('creators')}
                      className="text-[11px] text-sky-400 font-semibold hover:underline"
                    >
                      Browse all
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {(discoverData?.popularCreators || []).slice(0, 3).map(creator => (
                      <div
                        key={creator.id}
                        onClick={() => onSelectCreator(creator.id)}
                        className="flex flex-col items-center rounded-2xl bg-zinc-900/80 p-3.5 text-center border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                      >
                        <div className="relative mb-2">
                          <img
                            src={creator.avatarUrl}
                            alt={creator.displayName}
                            className="h-14 w-14 rounded-full object-cover border-2 border-rose-500/60 group-hover:scale-105 transition-transform"
                          />
                          {creator.isVerified && (
                            <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[10px] text-white border border-black">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-white truncate w-full">
                          {creator.displayName}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate w-full">
                          @{creator.username}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                          {formatNumber(followersCountMap[creator.id] ?? creator.followersCount)}{' '}
                          followers
                        </p>

                        <button
                          type="button"
                          onClick={e => handleToggleFollow(e, creator.id)}
                          disabled={followLoading[creator.id]}
                          className={`mt-2.5 w-full py-1.5 rounded-full text-[10px] font-bold transition-all ${
                            followingMap[creator.id]
                              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-white/10'
                              : 'bg-rose-500 text-white hover:bg-rose-600'
                          }`}
                        >
                          {followingMap[creator.id] ? 'Following' : '+ Follow'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trending Videos Feed */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <span>Trending Now</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {(discoverData?.trendingVideos || videos).length} videos
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {(discoverData?.trendingVideos || videos)
                      .filter(v => v.status === 'active')
                      .map(v => (
                        <div
                          key={v.id}
                          onClick={() => onSelectVideo(v)}
                          className="group relative aspect-9/16 overflow-hidden rounded-xl bg-zinc-900 border border-white/5 cursor-pointer hover:border-white/20 transition-all shadow-md"
                        >
                          <img
                            src={v.thumbnailUrl}
                            alt={v.caption}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />

                          <div className="absolute top-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-xs">
                            @{v.user.username}
                          </div>

                          <div className="absolute bottom-2 left-2 right-2 text-white text-[11px] space-y-1">
                            <p className="text-[11px] font-medium line-clamp-2 leading-snug drop-shadow-xs text-zinc-200">
                              {v.caption}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-zinc-300 pt-0.5 font-semibold">
                              <div className="flex items-center gap-1">
                                <Play className="h-3 w-3 fill-white" />
                                <span>{formatNumber(v.viewsCount)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                                <span>{formatNumber(v.likesCount)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: POPULAR */}
            {activeDiscoverTab === 'popular' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Most Viewed Videos of All Time
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    {(discoverData?.popularVideos || videos).length} videos
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(discoverData?.popularVideos || videos)
                    .filter(v => v.status === 'active')
                    .map((v, index) => (
                      <div
                        key={v.id}
                        onClick={() => onSelectVideo(v)}
                        className="group relative aspect-9/16 overflow-hidden rounded-xl bg-zinc-900 border border-white/5 cursor-pointer hover:border-white/20 transition-all shadow-md"
                      >
                        <img
                          src={v.thumbnailUrl}
                          alt={v.caption}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />

                        {/* Top Rank Badge */}
                        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-zinc-950/80 border border-white/10 px-2 py-0.5 text-[10px] font-black text-amber-300 backdrop-blur-xs">
                          <span>
                            {index === 0
                              ? '🥇 #1'
                              : index === 1
                              ? '🥈 #2'
                              : index === 2
                              ? '🥉 #3'
                              : `#${index + 1}`}
                          </span>
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 text-white text-[11px] space-y-1">
                          <p className="text-[11px] font-medium line-clamp-2 leading-snug drop-shadow-xs text-zinc-200">
                            {v.caption}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-zinc-300 pt-0.5 font-semibold">
                            <div className="flex items-center gap-1 text-white">
                              <Eye className="h-3 w-3 text-sky-400" />
                              <span>{formatNumber(v.viewsCount)} views</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                              <span>{formatNumber(v.likesCount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB: HASHTAGS & TOPICS */}
            {activeDiscoverTab === 'hashtags' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Explore Trending Hashtags
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    {(discoverData?.trendingHashtags || []).length} topics
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(discoverData?.trendingHashtags || []).map(item => (
                    <div
                      key={item.tag}
                      onClick={() => setSelectedHashtag(item.tag)}
                      className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/90 border border-white/5 hover:border-rose-500/40 hover:bg-zinc-850 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors shrink-0 font-black">
                          <Hash className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors truncate">
                            #{item.tag}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {formatNumber(item.videoCount)} videos • {formatNumber(item.viewsCount)}{' '}
                            views
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-rose-500 group-hover:translate-x-0.5 transition-transform">
                        Explore →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: CREATORS */}
            {activeDiscoverTab === 'creators' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Discover Top Creators
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    {(discoverData?.popularCreators || []).length} creators
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(discoverData?.popularCreators || []).map(user => (
                    <div
                      key={user.id}
                      onClick={() => onSelectCreator(user.id)}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/90 border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="h-14 w-14 rounded-full object-cover border border-white/10 shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-bold text-white truncate">
                              {user.displayName}
                            </p>
                            {user.isVerified && (
                              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-[9px] text-white">
                                ✓
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 font-medium truncate">
                            @{user.username}
                          </p>
                          {user.bio && (
                            <p className="text-xs text-zinc-400 line-clamp-1 mt-1">{user.bio}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400 font-medium">
                            <span>
                              <strong className="text-white">
                                {formatNumber(followersCountMap[user.id] ?? user.followersCount)}
                              </strong>{' '}
                              followers
                            </span>
                            <span>•</span>
                            <span>
                              <strong className="text-white">
                                {formatNumber(user.likesReceivedCount || 0)}
                              </strong>{' '}
                              likes
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={e => handleToggleFollow(e, user.id)}
                        disabled={followLoading[user.id]}
                        className={`shrink-0 ml-3 px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                          followingMap[user.id]
                            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-white/10'
                            : 'bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-500/20'
                        }`}
                      >
                        {followingMap[user.id] ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
