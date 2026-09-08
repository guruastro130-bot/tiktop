import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, Edit3, Grid, Heart, Bookmark, Play, UserPlus, Check, Share2, Flag, 
  LogOut, ShieldCheck, Shield, UserX, VolumeX, MoreVertical, Volume2, UserCheck, 
  AlertCircle, ShieldAlert, ArrowLeft, DollarSign, Coins, Wallet, Camera
} from 'lucide-react';
import { User, Video } from '../types';
import { useAuth } from '../context/AuthContext';
import { INITIAL_USERS, INITIAL_VIDEOS } from '../data/initialData';
import { BlockMuteModal } from './BlockMuteModal';
import { BlockConfirmModal } from './BlockConfirmModal';
import { CreatorEarningsDashboard } from './CreatorEarningsDashboard';
import { WithdrawalModal } from './WithdrawalModal';
import { AvatarPickerModal } from './AvatarPickerModal';
import { TikTopApp } from './TikTopApp';
import { CoverPickerModal } from './CoverPickerModal';

interface ProfileViewProps {
  userId?: string; // If undefined, displays logged-in user profile
  onSelectVideo: (video: Video) => void;
  onOpenReportUser?: (user: User) => void;
  onOpenAdmin?: () => void;
  onBack?: () => void;
  onUpdateVideo?: (updatedVideo: Video) => void;
}

const resolveFallbackUser = (id: string, currentLoggedInUser: User | null): User => {
  if (currentLoggedInUser && (currentLoggedInUser.id === id || !id)) {
    return currentLoggedInUser;
  }
  // Try localStorage custom users
  try {
    const stored = localStorage.getItem('tiktok_custom_users');
    if (stored) {
      const customList: User[] = JSON.parse(stored);
      const found = customList.find(u => u.id === id || u.username.toLowerCase() === id.toLowerCase());
      if (found) return found;
    }
  } catch {
    // ignore
  }

  // Try INITIAL_USERS
  const initial = INITIAL_USERS.find(u => u.id === id || u.username.toLowerCase() === id.toLowerCase());
  if (initial) return initial;

  // Try extracting from localStorage videos
  try {
    const storedVids = localStorage.getItem('tiktok_posted_videos');
    if (storedVids) {
      const vList: Video[] = JSON.parse(storedVids);
      const foundVid = vList.find(v => v.userId === id || v.user?.id === id || v.user?.username === id);
      if (foundVid?.user) {
        return {
          id: foundVid.user.id || id,
          username: foundVid.user.username || id.replace(/^user_/, ''),
          displayName: foundVid.user.displayName || foundVid.user.username,
          avatarUrl: foundVid.user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
          email: `${foundVid.user.username || 'creator'}@tiktok.app`,
          bio: 'TikTok Creator 🎥',
          followersCount: 120,
          followingCount: 45,
          likesReceivedCount: 1540,
          role: 'user',
          createdAt: new Date().toISOString(),
        };
      }
    }
  } catch {
    // ignore
  }

  // Fallback creator
  return {
    id: id || 'user_creator',
    username: id ? id.replace(/^user_/, '') : 'creator',
    displayName: id ? id.replace(/^user_/, '') : 'TikTok Creator',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    email: `${id || 'user'}@tiktok.app`,
    bio: 'TikTok Creator 🚀 Welcome to my profile!',
    followersCount: 140,
    followingCount: 12,
    likesReceivedCount: 890,
    role: 'user',
    createdAt: new Date().toISOString(),
  };
};

const resolveFallbackVideos = (id: string, user: User | null): { videos: Video[]; liked: Video[]; saved: Video[] } => {
  let allVideos: Video[] = [];
  try {
    const customVids = localStorage.getItem('tiktok_posted_videos');
    const customList: Video[] = customVids ? JSON.parse(customVids) : [];
    allVideos = [...customList, ...INITIAL_VIDEOS];
  } catch {
    allVideos = [...INITIAL_VIDEOS];
  }

  // Deduplicate by ID
  const uniqueVideos: Video[] = [];
  const seenIds = new Set<string>();
  for (const v of allVideos) {
    if (!seenIds.has(v.id)) {
      seenIds.add(v.id);
      uniqueVideos.push(v);
    }
  }

  const userVids = uniqueVideos.filter(v => 
    v.userId === id || 
    v.user?.id === id || 
    (user && v.user?.username?.toLowerCase() === user.username?.toLowerCase())
  );

  const likedVids = uniqueVideos.filter(v => v.isLiked);
  const savedVids = uniqueVideos.filter(v => v.isSaved);

  return {
    videos: userVids.length > 0 ? userVids : (id === 'user_admin' ? uniqueVideos.slice(0, 3) : []),
    liked: likedVids.length > 0 ? likedVids : uniqueVideos.slice(0, 2),
    saved: savedVids.length > 0 ? savedVids : uniqueVideos.slice(0, 1),
  };
};

export const ProfileView: React.FC<ProfileViewProps> = ({
  userId,
  onSelectVideo,
  onOpenReportUser,
  onOpenAdmin,
  onBack,
  onUpdateVideo,
}) => {
  const { currentUser, logout, openAuthModal, updateProfile, isAdmin } = useAuth();
  
  const isOwnProfile = !userId || (currentUser && currentUser.id === userId);
  const targetId = userId || currentUser?.id || 'user_admin';

  // Synchronously initialize with cached or fallback user so profile renders immediately
  const [profileUser, setProfileUser] = useState<User | null>(() => 
    resolveFallbackUser(targetId, currentUser)
  );

  const initialVideoData = useMemo(() => 
    resolveFallbackVideos(targetId, profileUser),
    [targetId, profileUser]
  );

  const [userVideos, setUserVideos] = useState<Video[]>(initialVideoData.videos);
  const [likedVideos, setLikedVideos] = useState<Video[]>(initialVideoData.liked);
  const [savedVideos, setSavedVideos] = useState<Video[]>(initialVideoData.saved);

  const [coverPickerVideo, setCoverPickerVideo] = useState<Video | null>(null);

  const handleSelectCover = async (videoId: string, newCoverUrl: string) => {
    const updateList = (prev: Video[]) =>
      prev.map(v => (v.id === videoId ? { ...v, thumbnailUrl: newCoverUrl } : v));

    setUserVideos(updateList);
    setLikedVideos(updateList);
    setSavedVideos(updateList);

    try {
      const stored = localStorage.getItem('tiktok_posted_videos');
      if (stored) {
        const list: Video[] = JSON.parse(stored);
        const updated = list.map(v => (v.id === videoId ? { ...v, thumbnailUrl: newCoverUrl } : v));
        localStorage.setItem('tiktok_posted_videos', JSON.stringify(updated));
      }
    } catch {
      // ignore
    }

    try {
      if (currentUser) {
        await fetch(`/api/videos/${videoId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ thumbnailUrl: newCoverUrl }),
        });
      }
    } catch {
      // ignore
    }

    const target = userVideos.find(v => v.id === videoId);
    if (target && onUpdateVideo) {
      onUpdateVideo({ ...target, thumbnailUrl: newCoverUrl });
    }
  };

  const [activeTab, setActiveTab] = useState<'videos' | 'liked' | 'saved'>('videos');
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBlockedByTarget, setIsBlockedByTarget] = useState<boolean>(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'block' | 'mute' }>({
    isOpen: false,
    type: 'block',
  });
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState<boolean>(false);
  const [isEarningsModalOpen, setIsEarningsModalOpen] = useState<boolean>(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState<boolean>(false);
  const [isTikTopDashboardOpen, setIsTikTopDashboardOpen] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(profileUser?.displayName || '');
  const [editBio, setEditBio] = useState<string>(profileUser?.bio || '');
  const [editAvatar, setEditAvatar] = useState<string>(profileUser?.avatarUrl || '');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSaveNewAvatar = async (newAvatarUrl: string) => {
    const success = await updateProfile({ avatarUrl: newAvatarUrl });
    if (success && profileUser) {
      setProfileUser({
        ...profileUser,
        avatarUrl: newAvatarUrl,
      });
      setEditAvatar(newAvatarUrl);
    }
  };

  const loadProfileData = useCallback(async () => {
    // Immediate fallback user to ensure zero blank/loading screens
    const immediateUser = resolveFallbackUser(targetId, currentUser);
    setProfileUser(immediateUser);
    setEditName(immediateUser.displayName);
    setEditBio(immediateUser.bio);
    setEditAvatar(immediateUser.avatarUrl);

    // Immediate fallback videos
    const fallbackVids = resolveFallbackVideos(targetId, immediateUser);
    setUserVideos(fallbackVids.videos);
    setLikedVideos(fallbackVids.liked);
    setSavedVideos(fallbackVids.saved);

    // Try fetching fresh data from backend
    try {
      const res = await fetch(`/api/users/${targetId}`, {
        headers: currentUser ? { 'x-user-id': currentUser.id } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setProfileUser(data.user);
          setIsFollowing(data.isFollowing || false);
          setIsBlocked(data.isBlocked || false);
          setIsMuted(data.isMuted || false);
          setIsBlockedByTarget(data.isBlockedByTarget || false);
          setEditName(data.user.displayName);
          setEditBio(data.user.bio);
          setEditAvatar(data.user.avatarUrl);
        }
      }
    } catch {
      // Offline/fallback handled
    }

    // Try fetching user videos from backend
    try {
      const vRes = await fetch(`/api/users/${targetId}/videos`, {
        headers: currentUser ? { 'x-user-id': currentUser.id } : {},
      });
      if (vRes.ok) {
        const data = await vRes.json();
        if (Array.isArray(data.videos) && data.videos.length > 0) {
          setUserVideos(data.videos);
        }
      }
    } catch {
      // Offline/fallback handled
    } finally {
      setLoading(false);
    }
  }, [targetId, currentUser]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    if (!profileUser || isBlocked || isBlockedByTarget) return;

    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setProfileUser(prev =>
      prev
        ? {
            ...prev,
            followersCount: nextState ? prev.followersCount + 1 : Math.max(0, prev.followersCount - 1),
          }
        : null
    );

    try {
      await fetch(`/api/users/${profileUser.id}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
      });
    } catch {
      // rollback if needed
    }
  };

  const handleToggleBlock = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    if (!profileUser) return;

    if (!isBlocked) {
      // Open confirm modal first
      setShowOptionsMenu(false);
      setConfirmModal({ isOpen: true, type: 'block' });
    } else {
      // Direct Unblock
      setActionLoading(true);
      try {
        const res = await fetch(`/api/users/${profileUser.id}/unblock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
        });
        if (res.ok) {
          setIsBlocked(false);
          loadProfileData();
        }
      } catch {
        // ignore
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleConfirmBlockAction = async () => {
    if (!currentUser || !profileUser) return;
    setActionLoading(true);
    try {
      if (confirmModal.type === 'block') {
        const res = await fetch(`/api/users/${profileUser.id}/block`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
        });
        if (res.ok) {
          setIsBlocked(true);
          setIsFollowing(false);
          setUserVideos([]);
          setConfirmModal({ isOpen: false, type: 'block' });
        }
      } else {
        const res = await fetch(`/api/users/${profileUser.id}/mute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
        });
        if (res.ok) {
          setIsMuted(true);
          setConfirmModal({ isOpen: false, type: 'mute' });
        }
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleMute = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    if (!profileUser) return;

    if (!isMuted) {
      setShowOptionsMenu(false);
      setConfirmModal({ isOpen: true, type: 'mute' });
    } else {
      // Direct Unmute
      setActionLoading(true);
      try {
        const res = await fetch(`/api/users/${profileUser.id}/unmute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
        });
        if (res.ok) {
          setIsMuted(false);
        }
      } catch {
        // ignore
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateProfile({
      displayName: editName,
      bio: editBio,
      avatarUrl: editAvatar,
    });
    if (success && profileUser) {
      setProfileUser({
        ...profileUser,
        displayName: editName,
        bio: editBio,
        avatarUrl: editAvatar,
      });
      setIsEditing(false);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M';
    if (count >= 1_000) return (count / 1_000).toFixed(1) + 'K';
    return count.toString();
  };

  if (!currentUser && isOwnProfile) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950 p-6 text-center text-white pb-24">
        <div className="h-16 w-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-3">
          <UserPlus className="h-8 w-8 text-zinc-500" />
        </div>
        <h2 className="text-lg font-bold">Profile & Account</h2>
        <p className="text-xs text-zinc-400 max-w-xs mt-1 mb-4">
          Log in or create a TikTok account to manage your profile, uploaded videos, and privacy settings.
        </p>
        <button
          type="button"
          onClick={openAuthModal}
          className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:brightness-110"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950 p-6 text-center text-white pb-24">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-3" />
        <h2 className="text-base font-bold">Profile Unavailable</h2>
        <p className="text-xs text-zinc-400 max-w-xs mt-1 mb-4">
          Unable to load this user profile at the moment.
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl bg-zinc-800 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-700"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  const displayedVideos = activeTab === 'videos' ? userVideos : (activeTab === 'liked' ? likedVideos : savedVideos);

  return (
    <div className="h-full w-full bg-zinc-950 text-white overflow-y-auto pb-24 relative">
      <div className="max-w-xl mx-auto px-4 py-6">
        
        {/* Top Actions Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {onBack && !isOwnProfile && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold truncate">@{profileUser.username}</span>
              {profileUser.isVerified && (
                <span className="rounded-full bg-sky-500 px-1 py-0.2 text-[9px] text-white">✓</span>
              )}
              {profileUser.role === 'admin' && (
                <span className="rounded-full bg-amber-500/20 border border-amber-400/30 px-1.5 py-0.2 text-[9px] font-bold text-amber-300">
                  Admin
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {isOwnProfile && isAdmin && onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="flex items-center gap-1 rounded-xl bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/25"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Admin</span>
              </button>
            )}

            {/* Privacy & Safety Settings for Own Profile */}
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="flex items-center gap-1 rounded-xl bg-zinc-900 border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                title="Privacy & Blocked Users"
              >
                <Shield className="h-3.5 w-3.5 text-rose-400" />
                <span className="hidden sm:inline">Privacy</span>
              </button>
            )}

            {/* Options Menu for other creators */}
            {!isOwnProfile && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowOptionsMenu(prev => !prev)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                  title="Options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {showOptionsMenu && (
                  <div
                    onClick={e => e.stopPropagation()}
                    className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-zinc-900 py-1.5 shadow-2xl z-30 animate-fade-in"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        handleToggleBlock();
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-rose-400 hover:bg-white/5 transition-colors"
                    >
                      <UserX className="h-4 w-4 shrink-0" />
                      <span>{isBlocked ? 'Unblock User' : 'Block User'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        handleToggleMute();
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-amber-400 hover:bg-white/5 transition-colors"
                    >
                      {isMuted ? <Volume2 className="h-4 w-4 shrink-0" /> : <VolumeX className="h-4 w-4 shrink-0" />}
                      <span>{isMuted ? 'Unmute User' : 'Mute User'}</span>
                    </button>

                    {onOpenReportUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          onOpenReportUser(profileUser);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-zinc-300 hover:bg-white/5 transition-colors border-t border-white/5 mt-1 pt-2"
                      >
                        <Flag className="h-4 w-4 shrink-0 text-zinc-400" />
                        <span>Report Account</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {isOwnProfile && (
              <button
                type="button"
                onClick={logout}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Profile Card Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative group">
            <img
              src={profileUser.avatarUrl}
              alt={profileUser.username}
              className="h-24 w-24 rounded-full object-cover border-2 border-rose-500 shadow-xl bg-zinc-900"
            />
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setIsAvatarPickerOpen(true)}
                className="absolute bottom-0 right-0 rounded-full bg-rose-500 p-1.5 text-white shadow-lg hover:bg-rose-600 transition-transform active:scale-95 group-hover:scale-110"
                title="Change profile picture"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            )}
            {isBlocked && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-xs">
                <UserX className="h-8 w-8 text-rose-500" />
              </div>
            )}
          </div>

          <div>
            <h1 className="text-lg font-black text-white">{profileUser.displayName}</h1>
            <p className="text-xs text-zinc-400 mt-0.5">@{profileUser.username}</p>
            
            {/* Status Badges */}
            <div className="flex items-center justify-center gap-2 mt-1.5">
              {isBlocked && (
                <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400 flex items-center gap-1">
                  <UserX className="h-3 w-3" />
                  Blocked
                </span>
              )}
              {isMuted && (
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                  <VolumeX className="h-3 w-3" />
                  Muted
                </span>
              )}
            </div>
          </div>

          {/* If the current user has blocked this creator */}
          {isBlocked ? (
            <div className="w-full max-w-sm rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-center my-4 space-y-3">
              <ShieldAlert className="h-8 w-8 text-rose-400 mx-auto" />
              <div>
                <p className="text-xs font-bold text-rose-300">You blocked @{profileUser.username}</p>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  You won&apos;t see their videos, comments, or notifications. They cannot view your profile.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleBlock}
                disabled={actionLoading}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2 text-xs font-bold text-white shadow transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Unblocking...' : 'Unblock Account'}
              </button>
            </div>
          ) : isBlockedByTarget ? (
            /* If this creator has blocked the current user */
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center my-4 space-y-2">
              <AlertCircle className="h-8 w-8 text-zinc-500 mx-auto" />
              <p className="text-xs font-bold text-zinc-300">Account Unavailable</p>
              <p className="text-[11px] text-zinc-500">
                You cannot view this user&apos;s profile or content.
              </p>
            </div>
          ) : (
            <>
              {/* Counts Bar */}
              <div className="flex items-center justify-center gap-6 py-2 border-y border-white/10 w-full max-w-sm">
                <div className="text-center">
                  <span className="text-sm font-bold text-white block">
                    {formatCount(profileUser.followingCount)}
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Following</span>
                </div>

                <div className="h-6 w-px bg-white/10" />

                <div className="text-center">
                  <span className="text-sm font-bold text-white block">
                    {formatCount(profileUser.followersCount)}
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Followers</span>
                </div>

                <div className="h-6 w-px bg-white/10" />

                <div className="text-center">
                  <span className="text-sm font-bold text-white block">
                    {formatCount(profileUser.likesReceivedCount)}
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Likes</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center flex-wrap justify-center gap-2 pt-1">
                {isOwnProfile ? (
                  <>
                    <button
                      id="edit-profile-btn"
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Profile</span>
                    </button>

                    <button
                      id="nepal-withdrawal-cashout-btn"
                      type="button"
                      onClick={() => setIsWithdrawalModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-colors shadow-sm"
                      title="eSewa / Khalti Point Withdrawal"
                    >
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                      <span>विथड्र ({(currentUser?.points ?? 0).toLocaleString('en-IN')} Pts)</span>
                    </button>

                    <button
                      id="creator-monetization-btn"
                      type="button"
                      onClick={() => setIsEarningsModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors shadow-sm"
                    >
                      <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Earnings</span>
                    </button>

                    <button
                      id="profile-tiktop-dashboard-btn"
                      type="button"
                      onClick={() => setIsTikTopDashboardOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-[#00ffcc]/40 bg-[#00ffcc]/10 px-3.5 py-2 text-xs font-bold text-[#00ffcc] hover:bg-[#00ffcc]/20 transition-colors shadow-sm"
                      title="TikTop Live, Gifts & Withdraw Dashboard"
                    >
                      <span>🚀</span>
                      <span>TikTop</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      id="follow-creator-btn"
                      type="button"
                      onClick={handleToggleFollow}
                      className={`flex items-center gap-1.5 rounded-xl px-6 py-2 text-xs font-bold transition-all shadow ${
                        isFollowing
                          ? 'bg-zinc-800 text-zinc-300 border border-white/10'
                          : 'bg-rose-500 text-white hover:bg-rose-600'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>

                    {isAdmin && (
                      <button
                        id="admin-inspect-earnings-btn"
                        type="button"
                        onClick={() => setIsEarningsModalOpen(true)}
                        className="flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title="Inspect Creator Earnings"
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>Earnings</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleToggleBlock}
                      className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                      title="Block User"
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Bio */}
              <p className="text-xs text-zinc-300 max-w-sm leading-relaxed px-4">
                {profileUser.bio || 'No bio yet.'}
              </p>
            </>
          )}
        </div>

        {/* Video Tabs and Grid (only if not blocked) */}
        {!isBlocked && !isBlockedByTarget && (
          <>
            <div className="mt-6 border-b border-white/10 flex items-center justify-around text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('videos')}
                className={`flex items-center gap-1.5 py-3 border-b-2 transition-colors ${
                  activeTab === 'videos' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Grid className="h-4 w-4" />
                <span>Videos ({userVideos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('liked')}
                className={`flex items-center gap-1.5 py-3 border-b-2 transition-colors ${
                  activeTab === 'liked' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Heart className="h-4 w-4" />
                <span>Liked ({likedVideos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-1.5 py-3 border-b-2 transition-colors ${
                  activeTab === 'saved' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Bookmark className="h-4 w-4" />
                <span>Bookmarks ({savedVideos.length})</span>
              </button>
            </div>

            {/* Video Grid */}
            <div className="mt-4">
              {displayedVideos.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  {activeTab === 'videos' && (
                    <>
                      <Grid className="h-8 w-8 mx-auto mb-2 stroke-1" />
                      <p className="text-sm font-medium">No videos uploaded yet</p>
                      <p className="text-xs text-zinc-600 mt-1">Upload your first short video!</p>
                    </>
                  )}
                  {activeTab === 'liked' && (
                    <>
                      <Heart className="h-8 w-8 mx-auto mb-2 stroke-1" />
                      <p className="text-sm font-medium">No liked videos yet</p>
                      <p className="text-xs text-zinc-600 mt-1">Videos you like will appear here.</p>
                    </>
                  )}
                  {activeTab === 'saved' && (
                    <>
                      <Bookmark className="h-8 w-8 mx-auto mb-2 stroke-1" />
                      <p className="text-sm font-medium">No bookmarks yet</p>
                      <p className="text-xs text-zinc-600 mt-1">Save videos to watch them later.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {displayedVideos.map(v => (
                    <div
                      key={v.id}
                      onClick={() => onSelectVideo(v)}
                      className="group relative aspect-9/16 overflow-hidden rounded-lg bg-zinc-900 cursor-pointer"
                    >
                      <img
                        src={v.thumbnailUrl}
                        alt={v.caption}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                      {/* Owner Quick Cover Select Button - Clean, no noisy text */}
                      {isOwnProfile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoverPickerVideo(v);
                          }}
                          className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-xs text-white shadow hover:bg-black/90 active:scale-90 transition-all cursor-pointer"
                          title="Cover"
                        >
                          <Camera className="h-3 w-3" />
                        </button>
                      )}

                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[10px] text-white font-semibold">
                        <Play className="h-2.5 w-2.5 fill-white" />
                        <span>{formatCount(v.viewsCount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Edit Profile Modal */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-5 text-white shadow-2xl animate-fade-in">
              <h3 className="text-base font-bold mb-4">Edit Profile</h3>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl bg-zinc-800/80 p-3 border border-white/5">
                  <img
                    src={editAvatar || profileUser.avatarUrl}
                    alt="Current Avatar"
                    className="h-12 w-12 rounded-full object-cover border-2 border-rose-500 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{editName || profileUser.displayName}</p>
                    <button
                      type="button"
                      onClick={() => setIsAvatarPickerOpen(true)}
                      className="mt-1 inline-flex items-center gap-1 rounded-lg bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/30 transition-colors"
                    >
                      <Camera className="h-3 w-3" />
                      <span>फोटो परिवर्तन गर्नुहोस्</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Avatar Image URL (वैकल्पिक)</label>
                  <input
                    type="url"
                    value={editAvatar}
                    onChange={e => setEditAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 rounded-xl bg-zinc-800 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-rose-500 py-2 text-xs font-bold text-white hover:bg-rose-600"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Privacy & Safety Modal (Blocked & Muted Lists) */}
        <BlockMuteModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
          onRelationshipChanged={loadProfileData}
        />

        {/* Block / Mute Confirmation Modal */}
        <BlockConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, type: 'block' })}
          onConfirm={handleConfirmBlockAction}
          type={confirmModal.type}
          targetUser={profileUser}
          loading={actionLoading}
        />

        {/* Creator Earnings & Monetization Dashboard Modal */}
        {profileUser && (
          <CreatorEarningsDashboard
            userId={profileUser.id}
            isOpen={isEarningsModalOpen}
            onClose={() => setIsEarningsModalOpen(false)}
          />
        )}

        {/* Nepal eSewa / Khalti Withdrawal Modal */}
        <WithdrawalModal
          isOpen={isWithdrawalModalOpen}
          onClose={() => setIsWithdrawalModalOpen(false)}
        />

        {/* Avatar / Profile Picture Picker Modal */}
        {profileUser && (
          <AvatarPickerModal
            isOpen={isAvatarPickerOpen}
            currentAvatarUrl={profileUser.avatarUrl}
            onClose={() => setIsAvatarPickerOpen(false)}
            onSaveAvatar={handleSaveNewAvatar}
          />
        )}

        {/* TikTop Dashboard Modal */}
        {isTikTopDashboardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
            <div className="w-full max-w-[460px]">
              <TikTopApp onClose={() => setIsTikTopDashboardOpen(false)} />
            </div>
          </div>
        )}

        {/* Video Cover Picker Modal */}
        <CoverPickerModal
          isOpen={!!coverPickerVideo}
          video={coverPickerVideo}
          onClose={() => setCoverPickerVideo(null)}
          onSelectCover={handleSelectCover}
        />

      </div>
    </div>
  );
};

