import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AdProvider, useAds } from './context/AdContext';
import { Video, User, LiveRoom } from './types';
import { INITIAL_VIDEOS, INITIAL_USERS, getRandomBannerAd } from './data/initialData';
import { INITIAL_LIVE_ROOMS } from './data/liveData';
import { FeedView } from './components/FeedView';
import { DiscoverView } from './components/DiscoverView';
import { UploadView } from './components/UploadView';
import { NotificationsView } from './components/NotificationsView';
import { ProfileView } from './components/ProfileView';
import { Navbar, NavTab } from './components/Navbar';
import { CommentDrawer } from './components/CommentDrawer';
import { ShareModal } from './components/ShareModal';
import { ReportModal } from './components/ReportModal';
import { FullScreenAdModal } from './components/FullScreenAdModal';
import { PersistentBannerAd } from './components/PersistentBannerAd';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { BlockConfirmModal } from './components/BlockConfirmModal';
import { LiveDiscoveryView } from './components/live/LiveDiscoveryView';
import { LiveRoomView } from './components/live/LiveRoomView';
import { GoLiveModal } from './components/live/GoLiveModal';
import { LiveStartCountdownPopup } from './components/live/LiveStartCountdownPopup';
import { CreateActionSheet, CreateOptionType } from './components/CreateActionSheet';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { TikTopApp } from './components/TikTopApp';

const AppContent: React.FC = () => {
  const { isFullScreenAdVisible, currentFullScreenAd, dismissFullScreenAd } = useAds();
  const { currentUser, isAdmin, openAuthModal, resetUserBans } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState<boolean>(false);
  const [uploadInitialMode, setUploadInitialMode] = useState<'video' | 'live' | 'voice_room'>('video');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isTikTopDashboardOpen, setIsTikTopDashboardOpen] = useState<boolean>(false);

  // Live Streaming States
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>(INITIAL_LIVE_ROOMS);
  const [activeLiveRoom, setActiveLiveRoom] = useState<LiveRoom | null>(null);
  const [isGoLiveOpen, setIsGoLiveOpen] = useState<boolean>(false);
  const [pendingLiveRoom, setPendingLiveRoom] = useState<LiveRoom | null>(null);

  // Modals and Drawer States
  const [commentVideo, setCommentVideo] = useState<Video | null>(null);
  const [highlightCommentId, setHighlightCommentId] = useState<string | undefined>(undefined);
  const [shareVideo, setShareVideo] = useState<Video | null>(null);
  const [reportConfig, setReportConfig] = useState<{
    isOpen: boolean;
    type: 'video' | 'user' | 'comment' | 'copyright';
    targetId: string;
    targetPreview?: string;
    initialMode?: 'standard' | 'copyright';
  }>({
    isOpen: false,
    type: 'video',
    targetId: '',
    initialMode: 'standard',
  });

  const [blockConfirmConfig, setBlockConfirmConfig] = useState<{
    isOpen: boolean;
    type: 'block' | 'mute';
    user: { id: string; username: string; displayName?: string; avatarUrl?: string } | null;
  }>({
    isOpen: false,
    type: 'block',
    user: null,
  });
  const [blockActionLoading, setBlockActionLoading] = useState<boolean>(false);

  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [discoverInitialTag, setDiscoverInitialTag] = useState<string>('');
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // Local storage helper for posted videos
  const getStoredCustomVideos = (): Video[] => {
    try {
      const stored = localStorage.getItem('tiktok_posted_videos');
      if (!stored) return [];
      const parsed: Video[] = JSON.parse(stored);
      // Clean up any old broken commondatastorage or unplayable URLs
      return parsed.map(v => {
        if (v.videoUrl && v.videoUrl.includes('commondatastorage.googleapis.com')) {
          return {
            ...v,
            videoUrl: '/videos/sample_dance.mp4'
          };
        }
        return v;
      });
    } catch {
      return [];
    }
  };

  // Fetch Videos with current user's block/mute preferences and resilient local fallback
  const fetchVideos = useCallback(async () => {
    const customLocalVideos = getStoredCustomVideos();
    try {
      const res = await fetch('/api/videos', {
        headers: currentUser ? { 'x-user-id': currentUser.id } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const serverVideos = data.videos || [];
        // Combine server videos with any unique local videos
        const existingIds = new Set(serverVideos.map((v: Video) => v.id));
        const combined = [...customLocalVideos.filter(v => !existingIds.has(v.id)), ...serverVideos];
        setVideos(combined.length > 0 ? combined : INITIAL_VIDEOS);
        return;
      }
    } catch {
      // Backend not reachable - fallback
    } finally {
      setLoading(false);
    }

    // Fallback: merge local stored videos + initial demo videos
    const existingIds = new Set(customLocalVideos.map((v: Video) => v.id));
    const fallbackList = [...customLocalVideos, ...INITIAL_VIDEOS.filter(v => !existingIds.has(v.id))];
    setVideos(fallbackList);
  }, [currentUser]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Handlers
  const handleOpenComments = (video: Video, commentId?: string) => {
    setCommentVideo(video);
    setHighlightCommentId(commentId);
  };

  const handleOpenShare = (video: Video) => {
    setShareVideo(video);
  };

  const handleOpenCreatorProfile = (userId: string) => {
    setSelectedCreatorId(userId);
    setCurrentTab('profile');
  };

  const handleHashtagClick = (tag: string) => {
    setDiscoverInitialTag(tag.replace('#', ''));
    setCurrentTab('discover');
  };

  const handleSelectVideoFromGrid = (video: Video, targetCommentId?: string) => {
    // Bring video to top of feed and switch to home tab
    setVideos(prev => [video, ...prev.filter(v => v.id !== video.id)]);
    setSelectedCreatorId(null);
    setCurrentTab('home');

    if (targetCommentId) {
      setTimeout(() => {
        setCommentVideo(video);
        setHighlightCommentId(targetCommentId);
      }, 100);
    }
  };

  const handleUploadSuccess = (newVideo: Video) => {
    try {
      const stored = localStorage.getItem('tiktok_posted_videos');
      const list: Video[] = stored ? JSON.parse(stored) : [];
      const updated = [newVideo, ...list.filter(v => v.id !== newVideo.id)];
      localStorage.setItem('tiktok_posted_videos', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setVideos(prev => [newVideo, ...prev.filter(v => v.id !== newVideo.id)]);
    setSelectedCreatorId(null);
    setCurrentTab('home');
  };

  const handleOpenReportFromShare = () => {
    if (shareVideo) {
      setReportConfig({
        isOpen: true,
        type: 'video',
        targetId: shareVideo.id,
        targetPreview: `"${shareVideo.caption}" by @${shareVideo.user.username}`,
        initialMode: 'standard',
      });
    }
  };

  const handleOpenCopyrightReportFromShare = () => {
    if (shareVideo) {
      setReportConfig({
        isOpen: true,
        type: 'copyright',
        targetId: shareVideo.id,
        targetPreview: `"${shareVideo.caption}" by @${shareVideo.user.username} (Video #${shareVideo.id})`,
        initialMode: 'copyright',
      });
    }
  };

  const handleOpenReportUser = (user: { id: string; username: string; displayName?: string }) => {
    setReportConfig({
      isOpen: true,
      type: 'user',
      targetId: user.id,
      targetPreview: `Account: @${user.username} (${user.displayName || user.username})`,
    });
  };

  const handleBlockCreatorFromShare = (targetUser: { id: string; username: string; displayName?: string; avatarUrl?: string }) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    setShareVideo(null);
    setBlockConfirmConfig({
      isOpen: true,
      type: 'block',
      user: targetUser,
    });
  };

  const handleMuteCreatorFromShare = (targetUser: { id: string; username: string; displayName?: string; avatarUrl?: string }) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    setShareVideo(null);
    setBlockConfirmConfig({
      isOpen: true,
      type: 'mute',
      user: targetUser,
    });
  };

  const handleConfirmBlockAction = async () => {
    if (!currentUser || !blockConfirmConfig.user) return;
    setBlockActionLoading(true);
    try {
      const endpoint = blockConfirmConfig.type === 'block' ? 'block' : 'mute';
      const res = await fetch(`/api/users/${blockConfirmConfig.user.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
      });

      if (res.ok) {
        setBlockConfirmConfig({ isOpen: false, type: 'block', user: null });
        fetchVideos();
      }
    } catch {
      // ignore
    } finally {
      setBlockActionLoading(false);
    }
  };

  const handleSelectLiveRoom = (room: LiveRoom) => {
    setActiveLiveRoom({ ...room, isUserHost: false });
  };

  // User triggers Start Live -> Pop up the 3/2/1 countdown modal first
  const handleRequestStartLive = (newRoom: LiveRoom) => {
    setIsGoLiveOpen(false);
    const roomWithBanner: LiveRoom = {
      ...newRoom,
      bannerAd: newRoom.bannerAd || getRandomBannerAd(),
      isUserHost: true,
    };
    setPendingLiveRoom(roomWithBanner);
  };

  // When 3/2/1 countdown finishes and fanfare plays -> Officially start live room!
  const handleConfirmStartLive = (newRoom: LiveRoom) => {
    const hostedRoom: LiveRoom = {
      ...newRoom,
      bannerAd: newRoom.bannerAd || getRandomBannerAd(),
      isUserHost: true,
    };
    setLiveRooms(prev => [hostedRoom, ...prev]);
    setActiveLiveRoom(hostedRoom);
    setPendingLiveRoom(null);
    setCurrentTab('home');
  };

  // If user clicks cancel on the 3/2/1 countdown modal
  const handleCancelStartLive = () => {
    if (pendingLiveRoom?.localMediaStream) {
      pendingLiveRoom.localMediaStream.getTracks().forEach(t => t.stop());
    }
    setPendingLiveRoom(null);
  };

  const handleDirectStartLive = (type: 'video' | 'voice') => {
    const hostUser = currentUser || INITIAL_USERS[0];
    const newRoom: LiveRoom = {
      id: `live_${Date.now()}`,
      hostId: hostUser.id,
      host: {
        id: hostUser.id,
        username: hostUser.username,
        displayName: hostUser.displayName,
        avatarUrl: hostUser.avatarUrl,
        isVerified: hostUser.isVerified,
      },
      title: type === 'voice' ? 'नेपाली भ्वाइस पार्टी 🎙️' : 'नेपाली फेस लाइभ 🔴',
      type,
      category: 'nepal',
      coverUrl: hostUser.avatarUrl,
      streamUrl: type === 'video' ? '/videos/sample_dance.mp4' : undefined,
      viewerCount: 1,
      likesCount: 0,
      diamondCount: 0,
      status: 'live',
      voiceSeatCount: 6,
      seats: type === 'voice' ? [
        {
          seatIndex: 0,
          user: {
            id: hostUser.id,
            username: hostUser.username,
            displayName: hostUser.displayName,
            avatarUrl: hostUser.avatarUrl,
            isVerified: hostUser.isVerified,
          },
          isMuted: false,
          isSpeaking: false,
          joinedAt: new Date().toISOString(),
        },
        ...Array.from({ length: 5 }, (_, idx) => ({
          seatIndex: idx + 1,
          isLocked: false,
        }))
      ] : [],
      bannerAd: getRandomBannerAd(),
      isMicMuted: false,
      isCameraOff: false,
      isHostOnline: true,
      isUserHost: true,
      createdAt: new Date().toISOString(),
    };
    // Direct instant start into the live room for guaranteed reliability
    setLiveRooms(prev => [newRoom, ...prev]);
    setActiveLiveRoom(newRoom);
    setCurrentTab('home');
  };

  const handleCloseLiveRoom = () => {
    setActiveLiveRoom(null);
    setCurrentTab('home');
  };

  const handleUpdateLiveRoom = (updatedRoom: LiveRoom) => {
    setLiveRooms(prev => prev.map(r => (r.id === updatedRoom.id ? updatedRoom : r)));
    setActiveLiveRoom(updatedRoom);
  };

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden flex flex-col font-sans select-none">
      
      {/* Account 3-Day Suspension Banner (When User Account is Banned) */}
      {currentUser?.accountBannedUntil && new Date(currentUser.accountBannedUntil) > new Date() && (
        <div className="relative z-50 bg-red-600 px-4 py-2 text-white flex items-center justify-between text-xs font-bold shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-white animate-pulse" />
            <span>
              🚫 खाता ३ दिनको लागि निलम्बित: लाइभमा बारम्बार क्यामेरा छोडेको उल्लङ्घनका कारण।
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              await resetUserBans();
            }}
            className="rounded bg-black/60 hover:bg-black/80 px-2 py-1 text-[10px] font-black text-white flex items-center gap-1 active:scale-95 cursor-pointer ml-2 shrink-0"
          >
            <RotateCcw className="h-3 w-3" />
            <span>फुकाउनुहोस् (Test Unban)</span>
          </button>
        </div>
      )}

      {/* Persistent AdMob Banner Ad (Always Visible) */}
      <PersistentBannerAd position="top" />

      {/* Active Tab View Stage */}
      <main className="relative flex-1 w-full overflow-hidden">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center bg-black text-white">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-rose-500 border-t-transparent" />
              <p className="text-xs font-bold text-zinc-400">Loading TikTok Feed...</p>
            </div>
          </div>
        ) : (
          <>
            {currentTab === 'home' && (
              <FeedView
                videos={videos}
                liveRooms={liveRooms}
                onSelectLiveRoom={handleSelectLiveRoom}
                onOpenComments={handleOpenComments}
                onOpenShare={handleOpenShare}
                onOpenCreatorProfile={handleOpenCreatorProfile}
                onHashtagClick={handleHashtagClick}
                onOpenLive={() => {
                  const activeStream = liveRooms.find(r => r.status === 'live');
                  if (activeStream) {
                    handleSelectLiveRoom(activeStream);
                  } else {
                    setCurrentTab('discover');
                  }
                }}
                onOpenAdmin={() => setIsAdminOpen(true)}
                onRefresh={fetchVideos}
                isLoading={loading}
              />
            )}

            {(currentTab === 'discover' || currentTab === 'live') && (
              <DiscoverView
                videos={videos}
                liveRooms={liveRooms}
                onSelectLiveRoom={handleSelectLiveRoom}
                onSelectVideo={handleSelectVideoFromGrid}
                onSelectCreator={handleOpenCreatorProfile}
                initialSearchQuery={discoverInitialTag}
                onOpenGoLive={() => setIsGoLiveOpen(true)}
              />
            )}

            {currentTab === 'upload' && (
              <UploadView
                initialMode={uploadInitialMode}
                onUploadSuccess={handleUploadSuccess}
                onCancel={() => setCurrentTab('home')}
                onStartLive={handleRequestStartLive}
                onSwitchToGoLive={() => setIsGoLiveOpen(true)}
              />
            )}

            {currentTab === 'notifications' && (
              <NotificationsView
                onSelectVideo={(videoId, commentId) => {
                  const found = videos.find(v => v.id === videoId);
                  if (found) {
                    handleSelectVideoFromGrid(found, commentId);
                  }
                }}
                onSelectCreator={handleOpenCreatorProfile}
              />
            )}

            {currentTab === 'profile' && (
              <ProfileView
                userId={selectedCreatorId || undefined}
                onSelectVideo={handleSelectVideoFromGrid}
                onOpenReportUser={handleOpenReportUser}
                onOpenAdmin={() => setIsAdminOpen(true)}
                onUpdateVideo={(updated) => {
                  setVideos(prev => prev.map(v => v.id === updated.id ? updated : v));
                }}
                onBack={() => {
                  setSelectedCreatorId(null);
                  setCurrentTab('home');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      {currentTab !== 'upload' && !activeLiveRoom && (
        <Navbar
          currentTab={currentTab}
          onTabChange={tab => {
            setSelectedCreatorId(null);
            setCurrentTab(tab);
          }}
          onOpenCreateMenu={() => setIsCreateMenuOpen(true)}
        />
      )}

      {/* Create / Go Live Action Sheet (Video Post, Face Live, Party Live) */}
      <CreateActionSheet
        isOpen={isCreateMenuOpen}
        onClose={() => setIsCreateMenuOpen(false)}
        onSelectOption={(option: CreateOptionType) => {
          setUploadInitialMode(option);
          setCurrentTab('upload');
        }}
      />

      {/* Full-Screen Immersive Live Streaming View */}
      {activeLiveRoom && (
        <ErrorBoundary onReset={handleCloseLiveRoom}>
          <LiveRoomView
            key={activeLiveRoom.id}
            room={activeLiveRoom}
            onClose={handleCloseLiveRoom}
            onUpdateRoom={handleUpdateLiveRoom}
            onOpenCreatorProfile={handleOpenCreatorProfile}
          />
        </ErrorBoundary>
      )}

      {/* Go LIVE Modal (Voice Room 4/6/9 Seats or Video Live) */}
      <GoLiveModal
        isOpen={isGoLiveOpen}
        onClose={() => setIsGoLiveOpen(false)}
        onStartLive={handleRequestStartLive}
      />

      {/* 3, 2, 1 Countdown Popup before Live starts */}
      <LiveStartCountdownPopup
        isOpen={Boolean(pendingLiveRoom)}
        room={pendingLiveRoom}
        onComplete={handleConfirmStartLive}
        onCancel={handleCancelStartLive}
      />

      {/* Slide-Up Comments Drawer */}
      <CommentDrawer
        video={commentVideo}
        highlightCommentId={highlightCommentId}
        isOpen={Boolean(commentVideo)}
        onClose={() => {
          setCommentVideo(null);
          setHighlightCommentId(undefined);
        }}
        onCommentAdded={fetchVideos}
        onOpenReportUser={handleOpenReportUser}
      />

      {/* Share Modal */}
      <ShareModal
        video={shareVideo}
        isOpen={Boolean(shareVideo)}
        onClose={() => setShareVideo(null)}
        onOpenReport={handleOpenReportFromShare}
        onOpenCopyrightReport={handleOpenCopyrightReportFromShare}
        onBlockCreator={handleBlockCreatorFromShare}
        onMuteCreator={handleMuteCreatorFromShare}
      />

      {/* Community Safety & Copyright Report Modal */}
      <ReportModal
        isOpen={reportConfig.isOpen}
        targetType={reportConfig.type}
        targetId={reportConfig.targetId}
        targetPreview={reportConfig.targetPreview}
        initialMode={reportConfig.initialMode}
        onClose={() => setReportConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Block / Mute Confirm Modal */}
      <BlockConfirmModal
        isOpen={blockConfirmConfig.isOpen}
        type={blockConfirmConfig.type}
        targetUser={blockConfirmConfig.user}
        onClose={() => setBlockConfirmConfig({ isOpen: false, type: 'block', user: null })}
        onConfirm={handleConfirmBlockAction}
        loading={blockActionLoading}
      />

      {/* AUTOMATIC 10-VIDEO INTERSTITIAL FULL-SCREEN AD */}
      <FullScreenAdModal
        ad={currentFullScreenAd}
        isOpen={isFullScreenAdVisible}
        onClose={dismissFullScreenAd}
      />

      {/* Admin Dashboard Overlay */}
      {isAdminOpen && (
        <AdminDashboard onClose={() => setIsAdminOpen(false)} />
      )}

      {/* Authentication Login / Registration Modal */}
      <AuthModal />

      {/* Floating TikTop Dashboard Quick Access Button */}
      <button
        type="button"
        id="open-tiktop-dashboard-btn"
        onClick={() => setIsTikTopDashboardOpen(true)}
        className="fixed top-3 right-16 z-30 flex items-center gap-1.5 rounded-full bg-zinc-950/90 border border-[#00ffcc]/40 px-3 py-1.5 text-xs font-black text-[#00ffcc] shadow-lg backdrop-blur-md hover:bg-zinc-900 hover:border-[#00ffcc] transition-all active:scale-95"
        title="TikTop Dashboard खोल्नुहोस्"
      >
        <span className="text-sm">🚀</span>
        <span className="hidden sm:inline">TikTop Dashboard</span>
      </button>

      {/* TikTop Dashboard Modal */}
      {isTikTopDashboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-[460px]">
            <TikTopApp onClose={() => setIsTikTopDashboardOpen(false)} />
          </div>
        </div>
      )}

    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="अनुप्रयोग लोड गर्न समस्या भयो (App Error)">
      <AuthProvider>
        <NotificationProvider>
          <AdProvider>
            <AppContent />
          </AdProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
