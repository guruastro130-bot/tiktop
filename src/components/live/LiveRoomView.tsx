import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Heart,
  Share2,
  Mic,
  MicOff,
  Radio,
  Send,
  Sparkles,
  Volume2,
  Music,
  Users,
  Coins,
  ChevronDown,
  Layers,
  Smile,
  Plus,
  Check,
  Trophy,
  Gift,
  Crown,
  RefreshCw,
  Video,
  VideoOff,
  MessageSquare,
  Power,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  Award,
  UserX,
  UserCheck,
  AlertTriangle,
  Copy,
  SlidersHorizontal,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LiveRoom, LiveSeat, LiveMessage, LiveGift, VoiceSeatCount, User } from '../../types';
import { VoiceSeatGrid } from './VoiceSeatGrid';
import { LiveBannerAd } from './LiveBannerAd';
import { LiveGiftModal } from './LiveGiftModal';
import { LiveRewardAndSafetyController } from './LiveRewardAndSafetyController';
import { GiftReactionOverlay, GiftReactionData, getGiftTier } from './GiftReactionOverlay';
import { liveAudio } from '../../utils/liveAudio';
import { LuckyGiftOutcome, toNepaliDigits } from '../../utils/luckyGiftEngine';
import {
  getDailyLiveRecord,
  saveDailyLiveRecord,
  updateDailyLiveSeconds,
  getTodayDateKey,
} from '../../utils/dailyLiveTracker';
import { useAuth } from '../../context/AuthContext';
import { useAds } from '../../context/AdContext';

interface LiveRoomViewProps {
  room: LiveRoom;
  onClose: () => void;
  onUpdateRoom?: (updatedRoom: LiveRoom) => void;
  onOpenCreatorProfile?: (userId: string) => void;
}

interface FloatingHeart {
  id: number;
  x: number;
  color: string;
}

export const LiveRoomView: React.FC<LiveRoomViewProps> = ({
  room: initialRoom,
  onClose,
  onUpdateRoom,
  onOpenCreatorProfile,
}) => {
  const { currentUser, openAuthModal, updateUserCoins, adjustCoins } = useAuth();
  const { recordAdImpression } = useAds();

  const [room, setRoom] = useState<LiveRoom>(() => ({
    ...initialRoom,
    seats: Array.isArray(initialRoom.seats) ? initialRoom.seats : [],
    voiceSeatCount: initialRoom.voiceSeatCount || 6,
  }));

  // Sync state if initialRoom changes
  useEffect(() => {
    setRoom({
      ...initialRoom,
      seats: Array.isArray(initialRoom.seats) ? initialRoom.seats : [],
      voiceSeatCount: initialRoom.voiceSeatCount || 6,
    });
  }, [initialRoom]);

  const preseededRoomIds = ['live_voice_1', 'live_voice_2', 'live_voice_3', 'live_video_1'];
  const isHost = Boolean(
    room.isUserHost ??
    (
      Boolean(room.localMediaStream) ||
      (!preseededRoomIds.includes(room.id) && Boolean(currentUser && (currentUser.id === room.hostId || (room.host && currentUser.id === room.host.id))))
    )
  );

  const [messages, setMessages] = useState<LiveMessage[]>(() => {
    return [
      {
        id: 'msg_sys_1',
        userId: 'system',
        username: 'system',
        displayName: 'TikTok Safety',
        avatarUrl: '',
        text: '🇳🇵 प्रत्यक्ष प्रसारण (TikTok LIVE) सुरु भयो! मर्यादा र नियम पालना गर्नुहोस्।',
        type: 'system',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  const [chatInput, setChatInput] = useState<string>('');
  const [isHostCommentInputOpen, setIsHostCommentInputOpen] = useState<boolean>(false);
  const [isChatVisible, setIsChatVisible] = useState<boolean>(true);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState<boolean>(false);
  const [giftModalInitialCategory, setGiftModalInitialCategory] = useState<'all' | 'romantic' | 'greeting' | 'nepal' | 'luxury' | 'lucky'>('all');
  const [giftModalTargetSeat, setGiftModalTargetSeat] = useState<number | 'host' | 'all'>('host');
  const [isViewerListOpen, setIsViewerListOpen] = useState<boolean>(false);

  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [activeFilter, setActiveFilter] = useState<string>(room.activeFilter || 'natural');
  const [isBeautyModalOpen, setIsBeautyModalOpen] = useState<boolean>(false);

  const [liveViewerCount, setLiveViewerCount] = useState<number>(() => {
    if (room.viewerCount && room.viewerCount > 0) return room.viewerCount;
    return isHost ? 1 : 1240;
  });
  const [showLiveStartedBanner, setShowLiveStartedBanner] = useState<boolean>(isHost);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState<boolean>(false);
  const [isHostToolsOpen, setIsHostToolsOpen] = useState<boolean>(false);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [giftReaction, setGiftReaction] = useState<GiftReactionData | null>(null);
  const [hostReaction, setHostReaction] = useState<{
    text: string;
    emoji: string;
    tier: 1 | 2 | 3 | 4;
  } | null>(null);
  const [luckyWinBanner, setLuckyWinBanner] = useState<{
    gifterName: string;
    recipientName: string;
    winCoins: number;
    totalCashback: number;
    multiplierLabel: string;
    giftName: string;
    giftIcon: string;
  } | null>(null);

  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isFollowingHost, setIsFollowingHost] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareSuccessToast, setShareSuccessToast] = useState<string | null>(null);

  const handleShareLive = async () => {
    const shareData = {
      title: room.title || 'नेपाल प्रत्यक्ष प्रसारण (TikTok Nepal Live)',
      text: `${room.host?.displayName || 'नेपाली क्रिएटर'} को लाइभ प्रसारण हेर्नुहोस्! 🔴 #NepalLive`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        setIsShareModalOpen(true);
      }
    } catch {
      setIsShareModalOpen(true);
    }
  };

  const handleCopyLiveLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setShareSuccessToast('लाइभ लिङ्क कपी भयो! 🔗');
      setTimeout(() => setShareSuccessToast(null), 2500);
    } catch {
      setShareSuccessToast('लिङ्क कपी भयो!');
      setTimeout(() => setShareSuccessToast(null), 2500);
    }
  };

  const videoStreamRef = useRef<HTMLVideoElement>(null);
  const internalCameraStreamRef = useRef<MediaStream | null>(null);
  const passedMediaStreamRef = useRef<MediaStream | undefined>(room.localMediaStream);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(room.isCameraOff || false);
  const [hasActiveCameraStream, setHasActiveCameraStream] = useState<boolean>(
    Boolean(room.localMediaStream && room.localMediaStream.active && room.localMediaStream.getVideoTracks().some(t => t.readyState === 'live'))
  );
  const [cameraPermissionError, setCameraPermissionError] = useState<boolean>(false);
  const [isRequestingCamera, setIsRequestingCamera] = useState<boolean>(false);

  // Keep passedMediaStreamRef updated if room updates
  useEffect(() => {
    if (room.localMediaStream) {
      passedMediaStreamRef.current = room.localMediaStream;
      const hasLive = room.localMediaStream.active && room.localMediaStream.getVideoTracks().some(t => t.readyState === 'live');
      if (hasLive) {
        setHasActiveCameraStream(true);
      }
    }
  }, [room.localMediaStream]);

  // Simulated Audience Joining when Host Starts Live so Host Immediately Sees Live Activity
  useEffect(() => {
    if (!isHost) return;

    const joiners = [
      { name: 'Aarav Sharma', handle: 'aarav_ktm' },
      { name: 'Pooja Thapa', handle: 'pooja_pokhara' },
      { name: 'Rohan KC', handle: 'rohan_nepal' },
      { name: 'Samikshya Adhikari', handle: 'samikshya_a' },
      { name: 'Dipesh Shrestha', handle: 'dipesh_live' },
    ];

    const timeouts: NodeJS.Timeout[] = [];

    const increments = [
      { delay: 3500, count: 6, user: joiners[0] },
      { delay: 7500, count: 18, user: joiners[1] },
      { delay: 12000, count: 42, user: joiners[2] },
      { delay: 18000, count: 85, user: joiners[3] },
      { delay: 25000, count: 140, user: joiners[4] },
    ];

    increments.forEach(({ delay, count, user }) => {
      const t = setTimeout(() => {
        setLiveViewerCount(count);
        setMessages(prev => [
          ...prev,
          {
            id: `msg_join_${Date.now()}_${count}`,
            userId: user.handle,
            username: user.handle,
            displayName: user.name,
            avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + count}?w=100&auto=format&fit=crop&q=80`,
            text: '👋 प्रसारणमा जोडिनुभयो (joined the LIVE)',
            type: 'system',
            createdAt: new Date().toISOString(),
          },
        ]);
      }, delay);
      timeouts.push(t);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isHost]);

  // Request physical camera access with progressive fallbacks
  const requestCameraAccess = async (facing: 'user' | 'environment' = cameraFacing) => {
    if (!isHost) return false;
    setIsRequestingCamera(true);
    setCameraPermissionError(false);

    try {
      if (internalCameraStreamRef.current) {
        internalCameraStreamRef.current.getTracks().forEach(t => t.stop());
        internalCameraStreamRef.current = null;
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facing,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch {
            stream = null;
          }
        }

        if (stream && stream.getVideoTracks().some(t => t.readyState === 'live')) {
          internalCameraStreamRef.current = stream;
          passedMediaStreamRef.current = stream;
          setHasActiveCameraStream(true);
          setCameraPermissionError(false);
          setIsCameraActive(true);
          setIsPersonDetected(true);

          if (videoStreamRef.current) {
            videoStreamRef.current.srcObject = stream;
            videoStreamRef.current.muted = true;
            videoStreamRef.current.play().catch(() => {});
          }
          return true;
        }
      }
      setCameraPermissionError(true);
      setHasActiveCameraStream(false);
      return false;
    } catch {
      setCameraPermissionError(true);
      setHasActiveCameraStream(false);
      return false;
    } finally {
      setIsRequestingCamera(false);
    }
  };

  // Flip Camera handler for host
  const handleFlipCamera = async () => {
    if (!isHost) return;
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    await requestCameraAccess(nextFacing);
  };

  // Confetti celebration when host starts Live
  useEffect(() => {
    if (isHost) {
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.2 },
        });
      } catch {}
    }
  }, [isHost]);

  // Hook up host camera mediaStream if available, or acquire camera directly if host
  useEffect(() => {
    if (room.type !== 'video') return;
    let isMounted = true;

    const setupHostCamera = async () => {
      const activeStream = passedMediaStreamRef.current || room.localMediaStream;
      // 1. Check if provided stream from GoLiveModal / Upload has active video tracks
      const hasActiveTracks =
        activeStream &&
        activeStream.active &&
        activeStream.getVideoTracks().some(t => t.readyState === 'live');

      if (hasActiveTracks && isMounted) {
        setHasActiveCameraStream(true);
        setCameraPermissionError(false);
        setIsCameraActive(true);
        setIsPersonDetected(true);
        if (videoStreamRef.current) {
          videoStreamRef.current.muted = true;
          videoStreamRef.current.srcObject = activeStream!;
          videoStreamRef.current.play().catch(() => {});
        }
        return;
      }

      // 2. If host and no active stream passed, acquire camera directly with fallback
      if (isHost && isMounted) {
        await requestCameraAccess(cameraFacing);
      }
    };

    setupHostCamera();
  }, [room.type, isHost, cameraFacing]);

  // Clean up camera tracks ONLY when LiveRoomView unmounts
  useEffect(() => {
    return () => {
      if (internalCameraStreamRef.current) {
        internalCameraStreamRef.current.getTracks().forEach(t => t.stop());
        internalCameraStreamRef.current = null;
      }
      if (passedMediaStreamRef.current) {
        passedMediaStreamRef.current.getTracks().forEach(t => t.stop());
        passedMediaStreamRef.current = undefined;
      }
    };
  }, []);

  // When host starts live, quickly simulate viewers arriving to give immediate feedback
  useEffect(() => {
    if (!isHost) return;

    const initialJoinTimeouts = [
      setTimeout(() => {
        setLiveViewerCount(prev => prev + 3);
        setMessages(prev => [
          ...prev,
          {
            id: `msg_join_1`,
            userId: 'user_pooja',
            username: 'pooja_99',
            displayName: 'Pooja Sharma',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
            text: '👋 पूजा शर्मा लाइभमा जोडिनुभयो! (Joined)',
            type: 'system',
            createdAt: new Date().toISOString(),
          }
        ]);
      }, 1200),
      setTimeout(() => {
        setLiveViewerCount(prev => prev + 4);
        setMessages(prev => [
          ...prev,
          {
            id: `msg_join_2`,
            userId: 'user_kiran',
            username: 'kiran_t',
            displayName: 'Kiran Thapa',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
            text: '👋 किरण थापा लाइभमा जोडिनुभयो! (Joined)',
            type: 'system',
            createdAt: new Date().toISOString(),
          }
        ]);
      }, 3200),
      setTimeout(() => {
        setLiveViewerCount(prev => prev + 6);
      }, 5500),
    ];

    return () => {
      initialJoinTimeouts.forEach(clearTimeout);
    };
  }, [isHost]);

  // Real-time Live Viewer Count Fluctuation Effect (प्राकृतिक लाइभ दर्शक घट-बढ)
  useEffect(() => {
    if (room.status === 'ended') return;

    const interval = setInterval(() => {
      setLiveViewerCount(prev => {
        const delta = Math.floor(Math.random() * 7) - 2; // -2 to +4
        return Math.max(1, prev + delta);
      });
    }, 3600);

    return () => clearInterval(interval);
  }, [room.status]);

  // Persistent Daily Face Live Accumulator & 12:00 AM Midnight Reset Logic
  const targetHostId = room.host?.id || room.hostId || (isHost ? currentUser?.id : 'host') || 'host';
  const trackerUserId = isHost ? (currentUser?.id || targetHostId) : targetHostId;
  const activeDayKeyRef = useRef<string>(getTodayDateKey());

  // Live streaming duration and person presence safety states:
  // Starts/resumes from previously accumulated face live time for today, NOT 0!
  const [totalLiveDurationSeconds, setTotalLiveDurationSeconds] = useState<number>(() => {
    if (room.type === 'video') {
      const record = getDailyLiveRecord(trackerUserId);
      return record.accumulatedSeconds || 0;
    }
    return 0;
  });
  const [isPersonDetected, setIsPersonDetected] = useState<boolean>(true);
  const [liveSeconds, setLiveSeconds] = useState<number>(() => {
    if (room.type === 'video') {
      const record = getDailyLiveRecord(trackerUserId);
      return record.accumulatedSeconds || 0;
    }
    return 0;
  });
  const [absentSeconds, setAbsentSeconds] = useState<number>(0);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showLiveEndedSummary, setShowLiveEndedSummary] = useState<boolean>(false);
  const [finalLiveStats, setFinalLiveStats] = useState<{
    durationSeconds: number;
    viewers: number;
    likes: number;
    diamonds: number;
    points: number;
  } | null>(null);

  // Live Broadcast Clock:
  // 1. Live duration pauses automatically when person is not detected in Face Live!
  // 2. Continuous accumulation across Face Live sessions on the same day (resumes where left off).
  // 3. 12:00 AM Midnight Rollover Reset:
  //    At 12:00 AM, a new day begins. Incomplete time from previous day (e.g. 59m before 12 AM)
  //    cannot be claimed for reward; timer resets to 0 for the fresh day.
  useEffect(() => {
    if (room.status === 'ended' || showLiveEndedSummary) return;

    const isLiveActiveAndCounting = room.type === 'voice' ? true : isPersonDetected;

    if (!isLiveActiveAndCounting) {
      // Live time paused! Count absent seconds instead
      const absentTimer = setInterval(() => {
        setAbsentSeconds(prev => prev + 1);
      }, 1000);
      return () => clearInterval(absentTimer);
    }

    const timer = setInterval(() => {
      const currentDayKey = getTodayDateKey();

      // 12:00 AM Midnight Rollover Check
      if (currentDayKey !== activeDayKeyRef.current) {
        activeDayKeyRef.current = currentDayKey;
        // 12:00 AM reset: Previous day's incomplete time expires; start fresh at 0 for new day
        setTotalLiveDurationSeconds(0);
        setLiveSeconds(0);
        setAbsentSeconds(0);
        if (room.type === 'video') {
          saveDailyLiveRecord(trackerUserId, {
            dateKey: currentDayKey,
            accumulatedSeconds: 0,
            claimedMilestone1: false,
            claimedMilestone2: false,
            lastUpdated: Date.now(),
          });
        }
        return;
      }

      setTotalLiveDurationSeconds(prev => {
        const next = prev + 1;
        // Regularly persist accumulated time so re-joining continues seamlessly
        if (room.type === 'video' && next % 2 === 0) {
          updateDailyLiveSeconds(trackerUserId, next);
        }
        return next;
      });
      setLiveSeconds(prev => prev + 1);
      setAbsentSeconds(0);
    }, 1000);

    return () => clearInterval(timer);
  }, [isPersonDetected, room.status, room.type, showLiveEndedSummary, trackerUserId]);

  // Persist accumulated time when leaving or closing Face Live
  useEffect(() => {
    return () => {
      if (room.type === 'video') {
        updateDailyLiveSeconds(trackerUserId, totalLiveDurationSeconds);
      }
    };
  }, [trackerUserId, room.type, totalLiveDurationSeconds]);

  // Automated Camera & Person Detection Monitor
  // Automatically detects if camera is covered/dark or video stream inactive
  useEffect(() => {
    if (room.type !== 'video' || !isHost || room.status === 'ended' || showLiveEndedSummary) return;

    // If host is on Face Studio Stage (physical webcam not active), the host's face is 100% on stage!
    // Therefore, person is ALWAYS detected and live duration counts continuously!
    if (!hasActiveCameraStream) {
      setIsPersonDetected(true);
      return;
    }

    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 32;
    sampleCanvas.height = 32;
    const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });

    let lowBrightnessCount = 0;
    let warmUpTicks = 0;

    const detectorInterval = setInterval(() => {
      const videoEl = videoStreamRef.current;
      if (!videoEl || videoEl.paused || videoEl.ended || !isPersonDetected) {
        return;
      }

      warmUpTicks++;
      // Allow initial 10-12 seconds for video stream and camera to stabilize
      if (warmUpTicks < 3) {
        return;
      }

      // Check stream video track status
      const stream = internalCameraStreamRef.current || passedMediaStreamRef.current;
      if (stream && stream.getVideoTracks().length > 0) {
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.every(t => t.readyState === 'ended' || !t.enabled)) {
          setIsPersonDetected(false);
          return;
        }
      }

      // Check canvas luminance with safe threshold
      if (videoEl.videoWidth > 0 && ctx) {
        try {
          ctx.drawImage(videoEl, 0, 0, 32, 32);
          const imgData = ctx.getImageData(0, 0, 32, 32);
          const data = imgData.data;
          let totalBrightness = 0;
          for (let i = 0; i < data.length; i += 4) {
            totalBrightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
          }
          const avgBrightness = totalBrightness / (32 * 32);

          // Only flag if camera is pitch black for multiple consecutive checks
          if (avgBrightness < 2) {
            lowBrightnessCount++;
            if (lowBrightnessCount >= 5) {
              setIsPersonDetected(false);
              lowBrightnessCount = 0;
            }
          } else {
            lowBrightnessCount = 0;
          }
        } catch {
          // Cross-origin fallback
        }
      }
    }, 4000);

    return () => clearInterval(detectorInterval);
  }, [room.type, isHost, room.status, showLiveEndedSummary, isPersonDetected, hasActiveCameraStream]);

  // Format total seconds into HH:MM:SS or MM:SS
  const formatLiveDuration = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Detailed human-readable duration (Nepali)
  const formatLiveDurationText = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} घण्टा`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes} मिनेट`);
    parts.push(`${seconds} सेकेन्ड`);
    return parts.join(' ');
  };

  // Handle Host ending the live broadcast
  const handleConfirmEndLive = () => {
    setShowExitConfirm(false);
    if (room.type === 'video') {
      updateDailyLiveSeconds(trackerUserId, totalLiveDurationSeconds);
    }
    if (isHost) {
      const earnedPoints = totalLiveDurationSeconds >= 7200 ? 2000 : totalLiveDurationSeconds >= 3600 ? 1000 : Math.floor(totalLiveDurationSeconds / 60) * 10;
      setFinalLiveStats({
        durationSeconds: totalLiveDurationSeconds,
        viewers: liveViewerCount,
        likes: room.likesCount || 0,
        diamonds: room.diamondCount || 0,
        points: earnedPoints,
      });
      setShowLiveEndedSummary(true);
      try {
        confetti({ particleCount: 75, spread: 80, origin: { y: 0.55 } });
      } catch {}
    } else {
      onClose();
    }
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const heartCounterRef = useRef<number>(0);

  // Check if current user is seated on any seat
  const currentSeatIndex = currentUser
    ? (room.seats || []).findIndex(s => s.user?.id === currentUser.id)
    : -1;
  const isUserSeated = currentSeatIndex !== -1;

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Periodic simulated viewer joins (clean stream focusing on Viewer Joins)
  useEffect(() => {
    const chatInterval = setInterval(() => {
      const demoNames = [
        { name: 'Pooja Sharma', user: 'pooja_99', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' },
        { name: 'Kiran Thapa', user: 'kiran_t', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
        { name: 'Suman Shrestha', user: 'suman_np', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
        { name: 'Anjali Gurung', user: 'anjali_g', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
        { name: 'Bikash Tamang', user: 'bikash_t', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' },
        { name: 'Sunita KC', user: 'sunita_kc', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100' },
      ];

      const randomUser = demoNames[Math.floor(Math.random() * demoNames.length)];

      const newMsg: LiveMessage = {
        id: `join_${Date.now()}_${Math.random()}`,
        userId: randomUser.user,
        username: randomUser.user,
        displayName: randomUser.name,
        avatarUrl: randomUser.avatar,
        text: '👋 लाइभमा जोडिनुभयो! (Joined Live)',
        type: 'join',
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev.slice(-30), newMsg]);
      setLiveViewerCount(prev => prev + 1);
      setRoom(prev => ({
        ...prev,
        likesCount: prev.likesCount + Math.floor(Math.random() * 3 + 1),
      }));
    }, 4000);

    return () => clearInterval(chatInterval);
  }, []);

  // Handle Seat Actions
  const handleTakeSeat = (seatIndex: number) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }

    const currentSeats = room.seats || [];
    // Check if seat is occupied
    const targetSeat = currentSeats.find(s => s.seatIndex === seatIndex);
    if (targetSeat?.user || targetSeat?.isLocked) {
      return;
    }

    // Remove user from any existing seat first
    const updatedSeats = currentSeats.map(s => {
      if (s.user?.id === currentUser.id) {
        return { seatIndex: s.seatIndex, isLocked: false };
      }
      if (s.seatIndex === seatIndex) {
        return {
          seatIndex,
          user: {
            id: currentUser.id,
            username: currentUser.username,
            displayName: currentUser.displayName,
            avatarUrl: currentUser.avatarUrl,
            isVerified: currentUser.isVerified,
          },
          isMuted: false,
          isSpeaking: false,
          joinedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    // If seat wasn't explicitly in the list, append it
    if (!updatedSeats.find(s => s.seatIndex === seatIndex)) {
      updatedSeats.push({
        seatIndex,
        user: {
          id: currentUser.id,
          username: currentUser.username,
          displayName: currentUser.displayName,
          avatarUrl: currentUser.avatarUrl,
          isVerified: currentUser.isVerified,
        },
        isMuted: false,
        isSpeaking: false,
        joinedAt: new Date().toISOString(),
      });
    }

    const updatedRoom: LiveRoom = {
      ...room,
      seats: updatedSeats,
    };

    setRoom(updatedRoom);
    if (onUpdateRoom) onUpdateRoom(updatedRoom);

    liveAudio.playGiftSound('seat_join');

    // Add join message
    setMessages(prev => [
      ...prev,
      {
        id: `seat_join_${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.username,
        displayName: currentUser.displayName,
        avatarUrl: currentUser.avatarUrl,
        text: `🎤 ${currentUser.displayName} सिट #${seatIndex + 1} मा बस्नुभयो!`,
        type: 'seat_action',
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleLeaveSeat = (seatIndex: number) => {
    const currentSeats = room.seats || [];
    const updatedSeats = currentSeats.map(s => {
      if (s.seatIndex === seatIndex) {
        return { seatIndex, isLocked: false };
      }
      return s;
    });

    const updatedRoom: LiveRoom = { ...room, seats: updatedSeats };
    setRoom(updatedRoom);
    if (onUpdateRoom) onUpdateRoom(updatedRoom);
  };

  const handleToggleSeatMute = (seatIndex: number) => {
    const currentSeats = room.seats || [];
    const updatedSeats = currentSeats.map(s => {
      if (s.seatIndex === seatIndex) {
        return { ...s, isMuted: !s.isMuted };
      }
      return s;
    });

    const updatedRoom: LiveRoom = { ...room, seats: updatedSeats };
    setRoom(updatedRoom);
    if (onUpdateRoom) onUpdateRoom(updatedRoom);
  };

  // Host Controls: Change Layout (4, 6, 9 Seats)
  const handleChangeSeatLayout = (newCount: VoiceSeatCount) => {
    if (!isHost) return;

    const currentSeats = room.seats || [];
    // Preserve users up to newCount
    const newSeats: LiveSeat[] = Array.from({ length: newCount }, (_, idx) => {
      const existing = currentSeats.find(s => s.seatIndex === idx);
      return existing || { seatIndex: idx, isLocked: false };
    });

    const updatedRoom: LiveRoom = {
      ...room,
      voiceSeatCount: newCount,
      seats: newSeats,
    };

    setRoom(updatedRoom);
    if (onUpdateRoom) onUpdateRoom(updatedRoom);

    setMessages(prev => [
      ...prev,
      {
        id: `layout_change_${Date.now()}`,
        userId: 'system',
        username: 'system',
        displayName: 'Host Action',
        avatarUrl: '',
        text: `⚡ होस्टले भ्वाइस रुमलाई ${newCount} सिटमा परिवर्तन गर्नुभयो!`,
        type: 'system',
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  // Host Kick Guest
  const handleHostKickGuest = (seatIndex: number) => {
    handleLeaveSeat(seatIndex);
  };

  // Host Mute Guest
  const handleHostMuteGuest = (seatIndex: number) => {
    handleToggleSeatMute(seatIndex);
  };

  // Host Lock Seat
  const handleHostLockSeat = (seatIndex: number) => {
    const currentSeats = room.seats || [];
    const updatedSeats = currentSeats.map(s => {
      if (s.seatIndex === seatIndex) {
        return { ...s, isLocked: !s.isLocked };
      }
      return s;
    });

    const updatedRoom = { ...room, seats: updatedSeats };
    setRoom(updatedRoom);
    if (onUpdateRoom) onUpdateRoom(updatedRoom);
  };

  // Send Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (!currentUser) {
      openAuthModal();
      return;
    }

    const newMsg: LiveMessage = {
      id: `chat_${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
      text: chatInput.trim(),
      type: 'chat',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMsg]);
    setChatInput('');
  };

  // Send Gift with Tiered Reactions & Lucky Gift Cashback Support
  const handleSendGift = (
    gift: LiveGift,
    targetSeatIndex?: number | 'all',
    multiplier: number = 1,
    luckyOutcome?: LuckyGiftOutcome
  ) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }

    const currentSeats = room.seats || [];
    const isAllSeats = targetSeatIndex === 'all';
    const targetUser =
      !isAllSeats && targetSeatIndex !== undefined && targetSeatIndex !== 0
        ? currentSeats.find(s => s.seatIndex === targetSeatIndex)?.user
        : room.host;

    const multi = multiplier || 1;
    const totalCoins = gift.coins * multi * (isAllSeats ? Math.max(1, currentSeats.filter(s => s.user).length + 1) : 1);
    const isLucky = Boolean(gift.isLucky || gift.category === 'lucky');
    const recipientName = isAllSeats
      ? 'सबै सिटहरू (All Seats 🎙️)'
      : targetUser?.displayName || targetUser?.username || room.host?.displayName || 'Host';
    const recipientAvatar = isAllSeats ? room.host?.avatarUrl : targetUser?.avatarUrl || room.host?.avatarUrl;

    // Recipient receives diamonds/points: for lucky gifts, exactly 3 points per 100 coins!
    const receiverPoints = isLucky
      ? (luckyOutcome ? luckyOutcome.receiverPoints : Math.max(1, Math.round((totalCoins / 100) * 3)))
      : totalCoins;

    let chatText = '';
    if (isLucky) {
      if (luckyOutcome && luckyOutcome.isWin && luckyOutcome.winCoins > 0) {
        const totalCashback = totalCoins + luckyOutcome.winCoins;
        chatText = `🎰 @${currentUser.displayName} ले लक्की उपहारमा पाउनुभयो 🎉 ${toNepaliDigits(totalCashback)} Case back! ➔ @${recipientName} (+${receiverPoints} Pts)`;
      } else {
        chatText = `🎰 @${currentUser.displayName} ले लक्की उपहार पठाउनुभयो ➔ @${recipientName} (+${receiverPoints} Pts)`;
      }
    } else {
      chatText = `🎁 ${gift.nameNp} ${gift.icon} ${multi > 1 ? `x${multi}` : ''} (${totalCoins.toLocaleString()} Coins) ➔ @${recipientName}`;
    }

    const giftMsg: LiveMessage = {
      id: `gift_${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
      text: chatText,
      type: 'gift',
      gift,
      targetSeatIndex: typeof targetSeatIndex === 'number' ? targetSeatIndex : 0,
      createdAt: new Date().toISOString(),
      luckyOutcome,
    };

    setMessages(prev => [...prev, giftMsg]);
    setRoom(prev => ({
      ...prev,
      diamondCount: prev.diamondCount + receiverPoints,
    }));
    setLiveViewerCount(prev => prev + Math.floor(Math.random() * 3 + 1));

    // Determine Tier (Tier 1: <1000, Tier 2: 1000-2000, Tier 3: 2001-9999, Tier 4: 10000-49999, Tier 5: 50000+)
    const tier = getGiftTier(totalCoins);

    // Global room announcement banner if Gifter wins cashback coins!
    // "बढीमा 5 secend मात्र Show गर्ने"
    if (isLucky && luckyOutcome && luckyOutcome.isWin && luckyOutcome.winCoins > 0) {
      const totalCashback = totalCoins + luckyOutcome.winCoins;
      setLuckyWinBanner({
        gifterName: currentUser.displayName,
        recipientName,
        winCoins: luckyOutcome.winCoins,
        totalCashback,
        multiplierLabel: luckyOutcome.multiplierLabel,
        giftName: gift.nameNp,
        giftIcon: gift.icon,
      });
      setTimeout(() => setLuckyWinBanner(null), 5000);
    }

    // Trigger Rich Tiered Gift Reaction Overlay with Combo Stacking (Prevents annoying repeated popup spam)
    setGiftReaction(prev => {
      if (prev && prev.gift.id === gift.id && prev.senderName === currentUser.displayName) {
        return {
          ...prev,
          multiplier: (prev.multiplier || 1) + multi,
          comboCount: (prev.comboCount || 1) + 1,
          totalCoins: prev.totalCoins + totalCoins,
          luckyOutcome: luckyOutcome || prev.luckyOutcome,
          key: Date.now(),
        };
      }
      return {
        gift,
        senderName: currentUser.displayName,
        senderAvatar: currentUser.avatarUrl,
        recipientName,
        recipientAvatar,
        multiplier: multi,
        comboCount: 1,
        totalCoins,
        luckyOutcome,
        key: Date.now(),
      };
    });

    // Dynamic Host Enthusiastic Reactions scaling with Gift Size & Lucky Events
    if (isLucky && luckyOutcome?.isWin && luckyOutcome.winCoins > 0) {
      setHostReaction({
        text: `बधाई छ @${currentUser.displayName}! +${luckyOutcome.winCoins.toLocaleString()} कोइन जित्नुभयो! 🎉🎰`,
        emoji: '🎰🎉',
        tier: luckyOutcome.winCoins >= 1000 ? 4 : 3,
      });
      setTimeout(() => setHostReaction(null), 4000);
    } else if (isLucky) {
      setHostReaction({
        text: `धन्यवाद @${currentUser.displayName}! अर्को लक्की उपहारमा अवश्य भाग्य खुल्नेछ! 🍀🙏`,
        emoji: '🍀✨',
        tier: 2,
      });
      setTimeout(() => setHostReaction(null), 3000);
    } else {
      const hostReactionConfigs = {
        1: {
          text: `धन्यवाद @${currentUser.displayName}! 🙏`,
          emoji: '🙏✨',
          tier: 1 as const,
        },
        2: {
          text: `वाह! धेरै धेरै धन्यवाद @${currentUser.displayName}! 💖🎉`,
          emoji: '🎉💖',
          tier: 2 as const,
        },
        3: {
          text: `ओहो! भव्य उपहार! मुरी मुरी धन्यवाद @${currentUser.displayName}!! 🤩🔥👑`,
          emoji: '🤩🔥👑',
          tier: 3 as const,
        },
        4: {
          text: `अविश्वसनीय! शाही उपहार! दिलबाटै सलाम @${currentUser.displayName}!! 🦁👑✨❤️`,
          emoji: '🦁👑🔥✨',
          tier: 3 as const,
        },
        5: {
          text: `कोटि-कोटि धन्यवाद @${currentUser.displayName}! सर्वोच्च सम्राट उपहार!! 🦁👑🔥✨🙌`,
          emoji: '🦁👑🔥✨🙌',
          tier: 4 as const,
        },
      };

      setHostReaction(hostReactionConfigs[tier]);
      const reactionTimeoutMs = tier === 5 ? 8500 : tier === 4 ? 6500 : tier === 3 ? 4500 : tier === 2 ? 3000 : 1000;
      setTimeout(() => {
        setHostReaction(null);
      }, reactionTimeoutMs);
    }
  };

  // Tap-to-like screen / Heart button
  const handleTapLike = (e?: React.MouseEvent) => {
    liveAudio.playGiftSound('like');
    setRoom(prev => ({ ...prev, likesCount: prev.likesCount + 1 }));

    const colors = ['#f43f5e', '#ec4899', '#e11d48', '#fb7185', '#fbbf24', '#38bdf8'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomX = Math.floor(Math.random() * 80) + 10;

    const newHeart: FloatingHeart = {
      id: ++heartCounterRef.current,
      x: randomX,
      color: randomColor,
    };

    setFloatingHearts(prev => [...prev.slice(-15), newHeart]);

    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white select-none overflow-hidden animate-fade-in font-sans">
      
      {/* Background Ambience / Video Stream */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-black">
        {room.type === 'video' ? (
          <div className="relative h-full w-full">
            {!isCameraOff ? (
              hasActiveCameraStream ? (
                /* 1. Real Webcam Live Stream (Mirrored for natural selfie view) */
                <video
                  ref={el => {
                    videoStreamRef.current = el;
                    if (!el) return;
                    el.muted = true;
                    const stream = passedMediaStreamRef.current || room.localMediaStream || internalCameraStreamRef.current;
                    if (stream && stream.active && stream.getVideoTracks().some(t => t.readyState === 'live')) {
                      if (el.srcObject !== stream) {
                        el.srcObject = stream;
                      }
                      el.play().catch(() => {});
                      setIsCameraActive(true);
                    }
                  }}
                  autoPlay
                  loop
                  playsInline
                  muted
                  onPlay={() => setIsCameraActive(true)}
                  onLoadedData={() => setIsCameraActive(true)}
                  className={`h-full w-full object-cover object-center ${
                    cameraFacing === 'user' ? '-scale-x-100' : ''
                  } ${
                    activeFilter === 'radiant' ? 'contrast-125 saturate-150' :
                    activeFilter === 'warm' ? 'sepia-50 saturate-125' :
                    activeFilter === 'velvet' ? 'brightness-90 contrast-125' :
                    activeFilter === 'noir' ? 'grayscale contrast-150' : ''
                  }`}
                />
              ) : (
                /* 2. Guaranteed Fail-Safe Live Face Stage (Host's Face is 100% visible, centered, & never blank) */
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-4 text-center select-none overflow-hidden">
                  {/* Atmospheric studio backdrop lighting */}
                  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-rose-500/20 blur-3xl pointer-events-none animate-pulse" />
                  <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-pink-500/15 blur-2xl pointer-events-none" />

                  {/* Central Radiant Live Face Disc */}
                  <div className="relative my-2">
                    {/* Ring-light animated rotating border */}
                    <div className="absolute -inset-2.5 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 animate-spin opacity-80 blur-xs" />
                    <div className="absolute -inset-1 rounded-full bg-rose-500/40 animate-ping" />

                    <div className="relative h-44 w-44 sm:h-52 sm:w-52 rounded-full overflow-hidden border-4 border-white/90 shadow-[0_0_50px_rgba(244,63,94,0.7)] bg-zinc-900">
                      <img
                        src={room.host.avatarUrl}
                        alt={room.host.displayName}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Live Badge */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-0.5 text-[10px] font-black text-white shadow-lg border border-white/40 whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                      <span>🔴 LIVE FACE</span>
                    </div>
                  </div>

                  {/* Host Info & Verification */}
                  <div className="mt-4 flex flex-col items-center">
                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-1.5 drop-shadow-md">
                      <span>{room.host.displayName}</span>
                      {room.host.isVerified && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[10px] text-white">
                          ✓
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-rose-300 font-bold mt-0.5">
                      🔴 प्रत्यक्ष फेस लाइभ (Face Live Active)
                    </p>

                    {/* Live Speaking Audio Equalizer Waveform */}
                    <div className="flex items-center gap-1 mt-3 px-3 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-xs shadow-inner">
                      <span className="w-1 bg-rose-400 h-2.5 animate-pulse rounded-full" />
                      <span className="w-1 bg-rose-500 h-5 animate-bounce rounded-full" />
                      <span className="w-1 bg-pink-400 h-7 animate-bounce rounded-full" />
                      <span className="w-1 bg-rose-500 h-4 animate-pulse rounded-full" />
                      <span className="w-1 bg-rose-400 h-6 animate-bounce rounded-full" />
                      <span className="w-1 bg-rose-500 h-3 animate-pulse rounded-full" />
                      <span className="text-[10px] text-zinc-300 font-bold ml-1.5">अडियो लाइभ</span>
                    </div>
                  </div>

                  {/* If user is the Host: quick one-tap Webcam Connect button */}
                  {isHost && (
                    <div className="mt-5 flex flex-col items-center gap-2 max-w-xs z-10">
                      <button
                        type="button"
                        onClick={() => requestCameraAccess(cameraFacing)}
                        disabled={isRequestingCamera}
                        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-2 text-xs font-black text-white shadow-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-rose-400/50"
                      >
                        <Video className="h-4 w-4 animate-pulse" />
                        <span>
                          {isRequestingCamera
                            ? 'क्यामेरा जोड्दैछ...'
                            : '📹 क्यामेरा अन गर्नुहोस् (Connect Webcam)'}
                        </span>
                      </button>

                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 rounded-full px-3 py-0.5">
                        <Check className="h-3 w-3" />
                        <span>फेस लाइभ सुरक्षित छ - अनुहार प्रत्यक्ष देखिन्छ</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              /* Camera Off Host Stage View */
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center select-none">
                <div className="relative mb-4">
                  <span className="absolute -inset-6 rounded-full bg-rose-500/25 blur-xl animate-pulse" />
                  <img
                    src={room.host.avatarUrl}
                    alt={room.host.displayName}
                    className="relative h-28 w-28 rounded-full border-4 border-rose-500 object-cover shadow-2xl"
                  />
                  <span className="absolute bottom-1 right-1 h-7 w-7 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-xs shadow">
                    🔴
                  </span>
                </div>
                <h2 className="text-xl font-black text-white">{room.host.displayName}</h2>
                <p className="text-xs text-rose-300 font-bold mt-1">🔴 क्यामेरा बन्द - प्रत्यक्ष अडियो प्रसारण चालु छ</p>
                <div className="flex items-center gap-1 mt-3">
                  <span className="w-1 bg-rose-500 h-3 animate-pulse rounded-full" />
                  <span className="w-1 bg-rose-400 h-6 animate-bounce rounded-full" />
                  <span className="w-1 bg-rose-500 h-4 animate-pulse rounded-full" />
                  <span className="w-1 bg-rose-400 h-7 animate-bounce rounded-full" />
                  <span className="w-1 bg-rose-500 h-2 animate-pulse rounded-full" />
                </div>
                {isHost && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCameraOff(false);
                      requestCameraAccess(cameraFacing);
                    }}
                    className="mt-4 flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-500 active:scale-95"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>क्यामेरा खोल्नुहोस्</span>
                  </button>
                )}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950">
            {/* Minimalist ambient stage glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
          </div>
        )}
      </div>

      {/* 1. Topmost: Live Rotating Sponsor Banner Ad (mathi sabai vanda agadi) */}
      <div className="relative z-30 px-3 pt-2.5 pb-1">
        <LiveBannerAd
          initialAd={room.bannerAd}
          hostUsername={room.host?.username || 'host'}
          isPersonDetected={room.type === 'voice' ? true : isPersonDetected}
        />
      </div>

      {/* 2. Below Ad Banner: Compact Unified Header (Host Profile, Category, Viewers & Close Button) */}
      <div className="relative z-20 flex items-center justify-between px-3 py-1 backdrop-blur-xs gap-2 select-none">
        {/* Left: Host Profile Capsule, Live Counting & Category */}
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Host Profile Capsule */}
          <div className="flex items-center gap-1.5 rounded-full bg-black/50 border border-white/10 p-0.5 pr-2 backdrop-blur-md shadow-sm">
            {/* Host Avatar with reaction ring */}
            <div className="relative shrink-0">
              <img
                src={room.host?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt={room.host?.displayName || 'Host'}
                onClick={() => onOpenCreatorProfile && room.host?.id && onOpenCreatorProfile(room.host.id)}
                className={`h-7.5 w-7.5 rounded-full object-cover cursor-pointer transition-all duration-300 ${
                  hostReaction?.tier === 4
                    ? 'ring-2 ring-yellow-300 shadow-[0_0_12px_rgba(253,224,71,0.9)] animate-bounce'
                    : hostReaction?.tier === 3
                    ? 'ring-2 ring-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse'
                    : hostReaction?.tier === 2
                    ? 'ring-2 ring-rose-400'
                    : 'border border-rose-500/80'
                }`}
              />
              {!isHost && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFollowingHost(prev => !prev);
                  }}
                  className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-white shadow transition-transform hover:scale-110 active:scale-95 cursor-pointer border border-zinc-950 ${
                    isFollowingHost ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  title={isFollowingHost ? 'Following' : 'Follow Host'}
                >
                  {isFollowingHost ? <Check className="h-2 w-2 stroke-[3]" /> : <Plus className="h-2 w-2 stroke-[3]" />}
                </button>
              )}
            </div>

            <div className="min-w-0 max-w-[80px] sm:max-w-[110px]">
              <p className="text-[11px] font-bold text-white truncate leading-tight">{room.host?.displayName || 'नेपाली क्रिएटर'}</p>
              <div className="flex items-center gap-0.5 text-[9px] text-amber-400 font-semibold leading-tight">
                <Coins className="h-2 w-2 shrink-0" />
                <span>{(room.diamondCount || 0).toLocaleString()}</span>
              </div>
            </div>

            {!isHost && !isFollowingHost && (
              <button
                type="button"
                onClick={() => setIsFollowingHost(true)}
                className="flex items-center gap-0.5 rounded-full bg-rose-500 px-2 py-0.5 text-[9.5px] font-bold text-white transition-all active:scale-95 shrink-0 cursor-pointer shadow-xs hover:bg-rose-600"
              >
                <Plus className="h-2.5 w-2.5 stroke-[3]" />
                <span>Follow</span>
              </button>
            )}
          </div>

          {/* Live Timer Capsule */}
          <div
            id="face-live-timer-capsule"
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-mono font-medium backdrop-blur-md border transition-all shrink-0 ${
              !isPersonDetected && room.type !== 'voice'
                ? 'bg-amber-950/80 border-amber-400/50 text-amber-300 animate-pulse'
                : 'bg-black/50 border-white/10 text-zinc-200'
            }`}
            title={
              !isPersonDetected && room.type !== 'voice'
                ? 'मानिस नदेखिएकाले समय रोकिएको छ'
                : 'लाइभ समय'
            }
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              {!isPersonDetected && room.type !== 'voice' ? (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
                </>
              )}
            </span>
            <span className="tracking-wide text-[10px]">
              {formatLiveDuration(totalLiveDurationSeconds)}
            </span>
            {!isPersonDetected && room.type !== 'voice' && (
              <span className="text-[8.5px] font-sans font-bold text-amber-300 bg-amber-500/20 px-1 rounded">
                Pause
              </span>
            )}
          </div>

          {/* Minimal Category Pill */}
          <span className="hidden sm:inline-flex items-center rounded-full bg-black/40 border border-white/10 px-2 py-0.5 text-[9.5px] font-medium text-zinc-300 backdrop-blur-md">
            {room.category === 'nepal' ? '🇳🇵 नेपाल' :
             room.category === 'music' ? '🎵 संगीत' :
             room.category === 'gaming' ? '🎮 गेमिङ' :
             room.category === 'chat' ? '💬 च्याट' :
             room.category === 'chill' ? '🌙 आरामदायी' : (room.category || '🇳🇵 नेपाल')}
          </span>
        </div>

        {/* Right: Clean Live Viewers Count & Top Right Exit/End Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Simple Clean Live Viewer Count */}
          <button
            type="button"
            onClick={() => setIsViewerListOpen(true)}
            className="flex items-center gap-1 rounded-full bg-black/50 border border-white/10 py-1 px-2.5 backdrop-blur-md hover:bg-white/10 transition-all cursor-pointer group active:scale-95 shadow-xs"
            title="दर्शक सूची"
          >
            <Users className="h-3 w-3 text-rose-400 shrink-0" />
            <span className="text-[11px] font-bold text-white font-mono">
              {liveViewerCount.toLocaleString()}
            </span>
            <ChevronDown className="h-2.5 w-2.5 text-zinc-400 group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* Exit / End Live Button with Cross (✕) */}
          {isHost ? (
            <button
              type="button"
              id="direct-end-live-btn"
              onClick={() => setShowExitConfirm(true)}
              className="flex items-center gap-1 rounded-full bg-red-600/90 hover:bg-red-500 border border-red-400/50 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs backdrop-blur-md transition-all active:scale-95 shrink-0 cursor-pointer"
              title="लाइभ अन्त्य गर्नुहोस्"
            >
              <X className="h-3 w-3 stroke-[2.5]" />
              <span className="whitespace-nowrap">
                {room.type === 'voice' ? 'Party End' : 'End'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center h-7.5 w-7.5 rounded-full bg-black/50 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 backdrop-blur-md transition-colors active:scale-95 shrink-0 cursor-pointer"
              title="बन्द गर्नुहोस्"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Host Reaction Bubble (Under Host Capsule) */}
      {hostReaction && (
        <div className="relative z-20 px-3.5 -mt-0.5 mb-1 select-none pointer-events-none">
          <div
            className={`inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-0.5 text-[10.5px] font-bold shadow-lg backdrop-blur-xl animate-bounce border max-w-[240px] ${
              hostReaction.tier === 4
                ? 'bg-amber-950/90 text-amber-200 border-yellow-300'
                : hostReaction.tier === 3
                ? 'bg-amber-950/80 text-amber-200 border-amber-400'
                : hostReaction.tier === 2
                ? 'bg-rose-950/80 text-rose-200 border-rose-400'
                : 'bg-black/80 text-white border-white/20'
            }`}
          >
            <span>{hostReaction.emoji}</span>
            <span className="truncate">{hostReaction.text}</span>
          </div>
        </div>
      )}

      {/* Global Room Lucky Win Announcement Banner */}
      {luckyWinBanner && (
        <div className="relative z-30 px-3.5 mt-0.5 mb-1 select-none pointer-events-none animate-slide-down">
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 p-2 text-white shadow-2xl border border-amber-300/80 backdrop-blur-xl animate-pulse">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl shrink-0">🎰</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1 flex-wrap text-[11px] font-black leading-tight">
                  <span className="text-amber-200">@{luckyWinBanner.gifterName}</span>
                  <span>ले पाउनुभयो</span>
                  <span className="rounded-full bg-black/40 px-2 py-0.5 text-amber-300 text-[11px] font-black border border-amber-300/40">
                    🎉 {toNepaliDigits(luckyWinBanner.totalCashback)} Case back
                  </span>
                </div>
                <div className="text-[9.5px] text-white/90 truncate leading-tight mt-0.5">
                  {luckyWinBanner.giftName} {luckyWinBanner.giftIcon} ({luckyWinBanner.multiplierLabel}) ➔ @{luckyWinBanner.recipientName}
                </div>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[9.5px] font-black text-amber-300 border border-amber-300/40">
              <span>🎉 WIN</span>
            </div>
          </div>
        </div>
      )}

      {/* Live Reward & Moderation Safety Controller (Runs in background, alerts on violation) */}
      <LiveRewardAndSafetyController
        isHost={isHost}
        onCloseRoom={onClose}
        isPersonDetected={isPersonDetected}
        setIsPersonDetected={setIsPersonDetected}
        liveSeconds={liveSeconds}
        setLiveSeconds={setLiveSeconds}
        absentSeconds={absentSeconds}
        setAbsentSeconds={setAbsentSeconds}
        streamType={room.type}
      />

      {/* Main Interactive Stage */}
      <div
        onClick={handleTapLike}
        className="relative flex-1 w-full overflow-hidden flex flex-col justify-between cursor-pointer"
      >
        {/* For Voice Live: Render Multi-Guest Seat Grid (4, 6, or 9 Seats) */}
        {room.type === 'voice' ? (
          <div
            onClick={e => e.stopPropagation()}
            className="w-full my-auto flex flex-col items-center cursor-default z-10"
          >
            <div className="mb-2 text-center px-4">
              <h3 className="text-sm font-extrabold text-white line-clamp-1">{room.title}</h3>
              <p className="text-[11px] text-zinc-400">
                {isUserSeated
                  ? 'तपाईं सिटमा हुनुहुन्छ • बोल्न माइक खोल्नुहोस् 🎙️'
                  : 'सिटमा बस्न खाली सिटको "+" बटन थिच्नुहोस् 💬'}
              </p>
            </div>

            <VoiceSeatGrid
              seatCount={room.voiceSeatCount || 6}
              seats={room.seats || []}
              currentUser={currentUser}
              isHost={isHost}
              onTakeSeat={handleTakeSeat}
              onLeaveSeat={handleLeaveSeat}
              onToggleSeatMute={handleToggleSeatMute}
              onChangeSeatLayout={handleChangeSeatLayout}
              onHostKickGuest={handleHostKickGuest}
              onHostMuteGuest={handleHostMuteGuest}
              onHostLockSeat={handleHostLockSeat}
              onDirectEndPartyLive={() => setShowExitConfirm(true)}
              liveDurationText={formatLiveDuration(totalLiveDurationSeconds)}
              onGiftSeatUser={(seatIndex) => {
                setGiftModalTargetSeat(seatIndex === 0 ? 'host' : seatIndex);
                setGiftModalInitialCategory('all');
                setIsGiftModalOpen(true);
              }}
              onLuckyGiftSeatUser={(seatIndex) => {
                setGiftModalTargetSeat(seatIndex === 0 ? 'host' : seatIndex);
                setGiftModalInitialCategory('lucky');
                setIsGiftModalOpen(true);
              }}
            />
          </div>
        ) : (
          /* For Video Live: Transparent Tap Canvas */
          <div className="flex-1 w-full flex items-center justify-center pointer-events-none">
            {/* Ambient overlay */}
          </div>
        )}

        {/* Floating Hearts Animation Canvas */}
        <div className="pointer-events-none absolute right-4 bottom-24 h-64 w-24 overflow-hidden z-20">
          {floatingHearts.map(h => (
            <div
              key={h.id}
              style={{
                left: `${h.x}%`,
                color: h.color,
                animation: 'floatUp 1.8s ease-out forwards',
              }}
              className="absolute bottom-0 text-2xl filter drop-shadow-md"
            >
              ❤️
            </div>
          ))}
        </div>

        {/* Rich Tiered Gift Reaction Celebration Overlay (जति ठूलो उपहार, त्यति विशेष उत्सव) */}
        <GiftReactionOverlay
          reaction={giftReaction}
          onFinished={() => setGiftReaction(null)}
          onCollectCoinDrop={amount => {
            adjustCoins?.(amount);
          }}
          onCheerSend={() => {
            setFloatingHearts(prev => [
              ...prev,
              { id: Date.now(), x: Math.random() * 50 + 25, color: '#ffd700' },
              { id: Date.now() + 1, x: Math.random() * 50 + 25, color: '#f43f5e' },
            ]);
            setRoom(prev => ({ ...prev, likesCount: prev.likesCount + 10 }));
          }}
        />
      </div>

      {/* Floating Live Chat Messages Container (Only 2 most recent comments shown to keep screen clear) */}
      {isChatVisible && (
        <div
          ref={chatContainerRef}
          className="relative z-20 mx-3 max-h-24 overflow-hidden space-y-1.5 pointer-events-auto pr-1"
        >
          {messages.slice(-2).map(msg => (
            <div
              key={msg.id}
              className={`flex items-start gap-1.5 rounded-2xl px-3 py-1.5 text-xs backdrop-blur-md max-w-[85%] ${
                msg.type === 'gift'
                  ? 'bg-gradient-to-r from-amber-500/25 to-rose-500/25 border border-amber-400/40 text-amber-200'
                  : msg.type === 'join'
                  ? 'bg-black/65 border border-emerald-500/35 text-emerald-300 font-semibold'
                  : msg.type === 'system' || msg.type === 'seat_action'
                  ? 'bg-zinc-900/80 border border-white/10 text-emerald-300 font-bold'
                  : 'bg-black/50 border border-white/5 text-white'
              }`}
            >
              {msg.avatarUrl && (
                <img
                  src={msg.avatarUrl}
                  alt={msg.displayName}
                  className="h-4 w-4 rounded-full object-cover shrink-0 mt-0.5"
                />
              )}
              <div className="min-w-0">
                <span className="font-extrabold text-zinc-300 mr-1.5">
                  {msg.displayName}:
                </span>
                <span className="font-medium text-white/90 break-words">{msg.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Host Quick Comment Popover (when opened by Host) */}
      {isHost && isHostCommentInputOpen && (
        <div className="relative z-30 mx-3 mb-1 animate-fade-in">
          <form onSubmit={e => {
            handleSendMessage(e);
            setIsHostCommentInputOpen(false);
          }} className="flex items-center gap-1.5 rounded-2xl bg-zinc-900/95 p-1.5 border border-white/20 shadow-2xl backdrop-blur-md">
            <input
              type="text"
              autoFocus
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="दर्शकसँग सन्देश लेख्नुहोस्..."
              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40 hover:bg-rose-500 transition-colors"
            >
              पठाउनुहोस्
            </button>
            <button
              type="button"
              onClick={() => setIsHostCommentInputOpen(false)}
              className="rounded-xl p-1.5 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Bottom Live Controls Bar (Poppo Live Minimalist Floating Toolbar) */}
      <div className="relative z-30 border-t border-white/10 bg-black/60 backdrop-blur-xl px-3 py-2 flex items-center justify-between gap-1.5 sm:gap-2 select-none">
        {isHost ? (
          /* Host Dedicated Clean Controls */
          <div className="w-full flex items-center justify-between gap-2">
            {/* Comment Input */}
            <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-1.5 min-w-0">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="कमेन्ट लेख्नुहोस्..."
                className="w-full rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-zinc-400 focus:border-rose-500 focus:outline-hidden transition-colors"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="rounded-full bg-rose-500 p-1.5 text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-rose-600 transition-colors shrink-0"
              >
                <Send className="h-3 w-3" />
              </button>
            </form>

            {/* Mic Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMicMuted(prev => !prev)}
              className={`flex items-center justify-center h-9 w-9 rounded-full transition-all active:scale-95 shrink-0 cursor-pointer ${
                isMicMuted
                  ? 'bg-rose-600 text-white'
                  : 'bg-black/50 text-emerald-400 border border-emerald-500/40 hover:bg-white/10'
              }`}
              title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMicMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>

            {/* Host Tools Menu (Flip, Beauty/Filters, Camera On/Off, Soundboard) */}
            <button
              type="button"
              onClick={() => setIsHostToolsOpen(prev => !prev)}
              className={`flex items-center justify-center h-9 w-9 rounded-full border transition-all active:scale-95 shrink-0 cursor-pointer ${
                isHostToolsOpen
                  ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                  : 'bg-black/50 text-zinc-200 border-white/10 hover:text-white hover:bg-white/10'
              }`}
              title="होस्ट कन्ट्रोल (Host Tools)"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>

            {/* Dedicated Single Gift Box */}
            <button
              type="button"
              id="host-live-gift-box-btn"
              onClick={() => {
                setGiftModalInitialCategory('all');
                setIsGiftModalOpen(true);
              }}
              className="relative flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow hover:brightness-110 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="उपहार"
            >
              <Gift className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-amber-400 text-black text-[6px] font-black ring-1 ring-black">
                ★
              </span>
            </button>

            {/* Share Live Button */}
            <button
              type="button"
              id="host-live-share-btn"
              onClick={handleShareLive}
              className="flex items-center justify-center h-9 w-9 rounded-full bg-black/50 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="सेयर"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>

            {/* Tap Like Heart Button */}
            <button
              type="button"
              id="live-tap-like-heart-btn"
              onClick={handleTapLike}
              className="flex items-center justify-center h-9 w-9 rounded-full bg-rose-600 text-white shadow hover:bg-rose-500 active:scale-110 transition-transform cursor-pointer shrink-0"
              title="लाइक"
            >
              <Heart className="h-3.5 w-3.5 fill-white" />
            </button>
          </div>
        ) : (
          /* Viewer Interactive Suite */
          <div className="w-full flex items-center justify-between gap-2">
            {/* Chat Input Field */}
            <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-1.5 min-w-0">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="कमेन्ट लेख्नुहोस्..."
                className="w-full rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-zinc-400 focus:border-rose-500 focus:outline-hidden transition-colors"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="rounded-full bg-rose-500 p-1.5 text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-rose-600 transition-colors shrink-0"
              >
                <Send className="h-3 w-3" />
              </button>
            </form>

            {/* Mic Control for Seated User */}
            {isUserSeated && (
              <button
                type="button"
                onClick={() => handleToggleSeatMute(currentSeatIndex)}
                className={`flex items-center justify-center h-9 w-9 rounded-full transition-all active:scale-95 shrink-0 ${
                  isMicMuted
                    ? 'bg-rose-600 text-white'
                    : 'bg-black/50 text-emerald-400 border border-emerald-500/40'
                }`}
                title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMicMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* Soundboard Button */}
            <button
              type="button"
              onClick={() => setIsSoundboardOpen(prev => !prev)}
              className="flex items-center justify-center h-9 w-9 rounded-full bg-black/50 border border-white/10 text-amber-400 hover:text-amber-300 transition-colors active:scale-95 shrink-0 cursor-pointer"
              title="साउन्ड"
            >
              <Music className="h-3.5 w-3.5" />
            </button>

            {/* Dedicated Single Gift Box */}
            <button
              type="button"
              id="live-bottom-gift-box-btn"
              onClick={() => {
                setGiftModalInitialCategory('all');
                setIsGiftModalOpen(true);
              }}
              className="relative flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow hover:brightness-110 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="उपहार"
            >
              <Gift className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-amber-400 text-black text-[6px] font-black ring-1 ring-black">
                ★
              </span>
            </button>

            {/* Share Live Button */}
            <button
              type="button"
              id="viewer-live-share-btn"
              onClick={handleShareLive}
              className="flex items-center justify-center h-9 w-9 rounded-full bg-black/50 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="सेयर"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>

            {/* Like Heart Button */}
            <button
              type="button"
              onClick={handleTapLike}
              className="flex items-center justify-center h-9 w-9 rounded-full bg-rose-600 text-white shadow hover:bg-rose-500 active:scale-110 transition-transform cursor-pointer shrink-0"
              title="लाइक"
            >
              <Heart className="h-3.5 w-3.5 fill-white" />
            </button>
          </div>
        )}
      </div>

      {/* Host Tools Floating Sheet (Flip camera, Filters, Camera on/off, Soundboard) */}
      {isHost && isHostToolsOpen && (
        <div className="absolute bottom-16 left-3 right-3 sm:left-auto sm:right-3 sm:w-72 z-40 rounded-2xl border border-white/10 bg-zinc-950/90 p-3 shadow-2xl backdrop-blur-xl animate-fade-in text-white select-none">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-rose-400" />
              <span>होस्ट कन्ट्रोल (Host Tools)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsHostToolsOpen(false)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {room.type === 'video' && (
              <>
                {/* Flip Camera */}
                <button
                  type="button"
                  onClick={() => {
                    handleFlipCamera();
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all active:scale-95 text-left"
                >
                  <div className="h-7 w-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-[11px] leading-tight">क्यामेरा बदल्नुहोस्</p>
                    <p className="text-[9px] text-zinc-400">Flip Camera</p>
                  </div>
                </button>

                {/* Beauty & Filters */}
                <button
                  type="button"
                  onClick={() => {
                    setIsBeautyModalOpen(prev => !prev);
                    setIsHostToolsOpen(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all active:scale-95 text-left"
                >
                  <div className="h-7 w-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-[11px] leading-tight">ब्युटी र फिल्टर</p>
                    <p className="text-[9px] text-zinc-400">Beauty Effects</p>
                  </div>
                </button>

                {/* Camera Off / On */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCameraOff(prev => !prev);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition-all active:scale-95 text-left ${
                    isCameraOff
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isCameraOff ? 'bg-amber-500/30 text-amber-300' : 'bg-white/10 text-zinc-300'
                  }`}>
                    {isCameraOff ? <VideoOff className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="font-bold text-[11px] leading-tight">{isCameraOff ? 'क्यामेरा अन' : 'क्यामेरा बन्द'}</p>
                    <p className="text-[9px] text-zinc-400">{isCameraOff ? 'Camera Off' : 'Camera On'}</p>
                  </div>
                </button>
              </>
            )}

            {/* Soundboard */}
            <button
              type="button"
              onClick={() => {
                setIsSoundboardOpen(prev => !prev);
                setIsHostToolsOpen(false);
              }}
              className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all active:scale-95 text-left"
            >
              <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Music className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="font-bold text-[11px] leading-tight">साउन्ड इफेक्ट्स</p>
                <p className="text-[9px] text-zinc-400">Audio Sounds</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Host Beauty Filter Picker Popover */}
      {isHost && isBeautyModalOpen && (
        <div className="absolute bottom-16 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 z-40 rounded-2xl border border-pink-500/30 bg-zinc-950/90 p-3 shadow-2xl backdrop-blur-xl animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
            <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-pink-400" />
              <span>ब्युटी र फिल्टरहरू (Live Beauty Filters)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsBeautyModalOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'natural', label: '🌸 Natural' },
              { id: 'radiant', label: '✨ Radiant' },
              { id: 'warm', label: '☀️ Warm' },
              { id: 'velvet', label: '🍷 Velvet' },
              { id: 'noir', label: '🎬 Noir' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-rose-500 text-white shadow-sm ring-1 ring-white/30 scale-105'
                    : 'bg-white/5 text-zinc-300 hover:text-white border border-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Soundboard Popover */}
      {isSoundboardOpen && (
        <div className="absolute bottom-16 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 z-40 rounded-2xl border border-white/10 bg-zinc-950/90 p-3 shadow-2xl backdrop-blur-xl animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
            <span className="text-xs font-bold text-amber-300">🎵 साउन्ड इफेक्ट्स (Sound Effects)</span>
            <button
              type="button"
              onClick={() => setIsSoundboardOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'madal', label: '🥁 मादल', fn: () => liveAudio.playSoundboard('madal') },
              { id: 'horn', label: '🎺 एयर हर्न', fn: () => liveAudio.playSoundboard('horn') },
              { id: 'applause', label: '👏 ताली', fn: () => liveAudio.playSoundboard('applause') },
            ].map(snd => (
              <button
                key={snd.id}
                type="button"
                onClick={snd.fn}
                className="rounded-xl bg-white/5 p-2 text-center text-xs font-semibold text-white hover:bg-white/10 active:scale-95 transition-all border border-white/10"
              >
                {snd.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gift Modal with Lucky Gift Category support */}
      <LiveGiftModal
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
        seats={room.seats || []}
        hostName={room.host?.displayName || 'Host'}
        hostAvatar={room.host?.avatarUrl}
        onSendGift={handleSendGift}
        initialCategory={giftModalInitialCategory}
        initialTargetSeat={giftModalTargetSeat}
      />

      {/* Live Viewers & Top Contributors Floating Bottom Sheet */}
      {isViewerListOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs select-none animate-fade-in p-0 sm:p-4"
          onClick={() => setIsViewerListOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-t-[28px] sm:rounded-3xl border-t sm:border border-white/10 bg-zinc-950/90 backdrop-blur-2xl p-4 text-white shadow-2xl space-y-3.5 max-h-[60vh] sm:max-h-[70vh] flex flex-col"
          >
            {/* Top Sheet Drag Indicator */}
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-1 sm:hidden" />
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>दर्शक सूची (Live Audience)</span>
                    <span className="rounded-full bg-rose-500/20 text-rose-400 px-2 py-0.2 text-[10.5px] font-bold border border-rose-500/30">
                      {liveViewerCount.toLocaleString()} Live
                    </span>
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsViewerListOpen(false)}
                className="rounded-full bg-white/5 p-1 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Top 3 Supporters Podium */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Trophy className="h-3 w-3 text-amber-400" />
                  <span>शीर्ष योगदानकर्ता (Top Gifters)</span>
                </span>
                <span className="text-[9.5px] text-zinc-400 font-medium">आजको लाइभ</span>
              </div>
              
              <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                {/* 2nd Place */}
                <div className="flex flex-col items-center p-1.5 rounded-xl bg-black/40 border border-white/5">
                  <div className="relative">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" className="h-9 w-9 rounded-full object-cover border border-slate-300" alt="rank 2" />
                    <span className="absolute -bottom-1 -right-1 bg-slate-400 text-black text-[8px] font-black rounded-full px-1">🥈 2</span>
                  </div>
                  <p className="text-[11px] font-bold text-white mt-1 truncate max-w-full">Pooja Sharma</p>
                  <span className="text-[9.5px] font-bold text-amber-400">9,200 💎</span>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center p-2 rounded-xl bg-amber-500/10 border border-amber-400/30 -mt-1 shadow-sm">
                  <div className="relative">
                    <Crown className="h-3.5 w-3.5 text-amber-400 absolute -top-2.5 left-1/2 -translate-x-1/2" />
                    <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" className="h-10 w-10 rounded-full object-cover border-2 border-amber-400" alt="rank 1" />
                    <span className="absolute -bottom-1 -right-1 bg-amber-400 text-black text-[8.5px] font-black rounded-full px-1">🥇 1</span>
                  </div>
                  <p className="text-[11px] font-bold text-amber-300 mt-1 truncate max-w-full">Aayush KC</p>
                  <span className="text-[10px] font-bold text-amber-400">15,400 💎</span>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center p-1.5 rounded-xl bg-black/40 border border-white/5">
                  <div className="relative">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" className="h-9 w-9 rounded-full object-cover border border-amber-700" alt="rank 3" />
                    <span className="absolute -bottom-1 -right-1 bg-amber-700 text-white text-[8px] font-black rounded-full px-1">🥉 3</span>
                  </div>
                  <p className="text-[11px] font-bold text-white mt-1 truncate max-w-full">Ramesh A.</p>
                  <span className="text-[9.5px] font-bold text-amber-400">6,800 💎</span>
                </div>
              </div>
            </div>

            {/* Audience List */}
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                सक्रिय दर्शकहरू ({liveViewerCount.toLocaleString()})
              </p>
              {[
                { id: 'aud_1', name: 'Aayush KC', username: 'aayush_kc', coins: 15400, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', rank: '🥇 1st' },
                { id: 'aud_2', name: 'Pooja Sharma', username: 'pooja_99', coins: 9200, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', rank: '🥈 2nd' },
                { id: 'aud_3', name: 'Ramesh Adhikari', username: 'ramesh_a', coins: 6800, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', rank: '🥉 3rd' },
                { id: 'aud_4', name: 'Sita Rai', username: 'sita_rai', coins: 3400, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', rank: 'Top 5' },
                { id: 'aud_5', name: 'Kiran Thapa', username: 'kiran_t', coins: 1800, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', rank: 'Top 10' },
                { id: 'aud_6', name: 'Manish Shrestha', username: 'manish_s', coins: 950, avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100', rank: 'Viewer' },
                { id: 'aud_7', name: 'Sunita Gurung', username: 'sunita_g', coins: 600, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100', rank: 'Viewer' },
              ].map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-1.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <img src={user.avatar} className="h-7 w-7 rounded-full object-cover border border-white/10" alt={user.name} />
                    <div>
                      <p className="text-[11px] font-bold text-white">{user.name}</p>
                      <div className="flex items-center gap-1.5 text-[9.5px] text-zinc-400">
                        <span>@{user.username}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-semibold">{user.coins.toLocaleString()} Coins</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 text-[9.5px] font-bold hover:bg-rose-500 hover:text-white transition-all"
                  >
                    + Follow
                  </button>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Host Exit Confirmation Dialog with Live Duration */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-xs rounded-2xl border border-white/20 bg-zinc-950 p-5 text-center shadow-2xl space-y-3">
            {/* Close Cross in Dialog Header */}
            <button
              type="button"
              onClick={() => setShowExitConfirm(false)}
              className="absolute top-3 right-3 rounded-full bg-zinc-800/80 p-1.5 text-zinc-400 hover:text-white transition-colors"
              title="बन्द गर्नुहोस् (Cancel ✕)"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-600/20 text-red-500 border border-red-500/30">
              <X className="h-6 w-6 stroke-[3]" />
            </div>
            <h3 className="text-sm font-black text-white">
              {room.type === 'voice' ? 'पार्टी लाइभ अन्त्य (End Party LIVE)?' : 'लाइभ अन्त्य गर्न चाहनुहुन्छ?'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              लाइभ समाप्त गरेपछि प्रसारण बन्द हुनेछ र तपाईंको कुल लाइभ समयावधि तथा रिवार्ड सारांश देखिनेछ।
            </p>

            {/* Current Elapsed Live Duration Box */}
            <div className="rounded-xl bg-zinc-900 border border-white/10 p-2.5 text-center space-y-0.5">
              <span className="text-[10px] text-zinc-400 font-medium">⏱️ अहिले सम्म लाइभ बसेको समय:</span>
              <div className="text-base font-black text-rose-400 font-mono tracking-wider flex items-center justify-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                {formatLiveDuration(totalLiveDurationSeconds)}
              </div>
              <p className="text-[10px] text-zinc-300 font-semibold">
                {formatLiveDurationText(totalLiveDurationSeconds)}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 py-2.5 text-xs font-bold text-zinc-300 transition-colors cursor-pointer"
              >
                जारी राख्नुहोस्
              </button>
              <button
                type="button"
                onClick={handleConfirmEndLive}
                className="flex-1 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 py-2.5 text-xs font-black text-white shadow-md active:scale-95 transition-all cursor-pointer border border-red-400 flex items-center justify-center gap-1"
              >
                <X className="h-3.5 w-3.5 stroke-[3]" />
                <span>हो, अन्त्य ✕</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TikTok-Style Live Stream Ended Summary Modal (लाइभ समाप्त सारांश) */}
      {showLiveEndedSummary && finalLiveStats && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 animate-fade-in select-none">
          <div className="w-full max-w-sm rounded-3xl border border-white/20 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-center shadow-2xl space-y-5 animate-scale-up">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-[0_0_35px_rgba(244,63,94,0.6)] border-2 border-white/40">
              <Award className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-[11px] font-black text-rose-300 border border-rose-500/30">
                <CheckCircle2 className="h-3.5 w-3.5 text-rose-400" />
                प्रत्यक्ष प्रसारण सम्पन्न भयो
              </span>
              <h2 className="text-xl font-black text-white">लाइभ सारांश (Live Summary)</h2>
              <p className="text-xs text-zinc-400">
                तपाईंको आजको प्रत्यक्ष प्रसारणको पूर्ण विवरण
              </p>
            </div>

            {/* 4 Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-left">
              {/* Duration Card (कति समय बस्यो) */}
              <div className="flex flex-col justify-between rounded-2xl bg-zinc-900/90 border border-white/10 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-medium">लाइभ बसेको समय</span>
                  <Clock className="h-4 w-4 text-sky-400 shrink-0" />
                </div>
                <div>
                  <div className="text-lg font-black text-white font-mono tracking-tight">
                    {formatLiveDuration(finalLiveStats.durationSeconds)}
                  </div>
                  <div className="text-[10px] text-sky-300 font-semibold leading-tight line-clamp-1">
                    {formatLiveDurationText(finalLiveStats.durationSeconds)}
                  </div>
                </div>
              </div>

              {/* Viewers Card */}
              <div className="flex flex-col justify-between rounded-2xl bg-zinc-900/90 border border-white/10 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-medium">कुल दर्शक</span>
                  <Users className="h-4 w-4 text-rose-400 shrink-0" />
                </div>
                <div>
                  <div className="text-lg font-black text-white font-mono tracking-tight">
                    {finalLiveStats.viewers.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-rose-300 font-medium">
                    Viewers Reached
                  </div>
                </div>
              </div>

              {/* Likes Card */}
              <div className="flex flex-col justify-between rounded-2xl bg-zinc-900/90 border border-white/10 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-medium">कुल लाइकहरू</span>
                  <Heart className="h-4 w-4 text-pink-400 fill-pink-400/30 shrink-0" />
                </div>
                <div>
                  <div className="text-lg font-black text-white font-mono tracking-tight">
                    {finalLiveStats.likes.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-pink-300 font-medium">
                    Likes Received
                  </div>
                </div>
              </div>

              {/* Diamonds / Gifts Card */}
              <div className="flex flex-col justify-between rounded-2xl bg-zinc-900/90 border border-white/10 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-medium">उपहार / डायमन्ड</span>
                  <Gift className="h-4 w-4 text-amber-400 shrink-0" />
                </div>
                <div>
                  <div className="text-lg font-black text-amber-300 font-mono tracking-tight">
                    +{finalLiveStats.diamonds.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-amber-400/90 font-medium">
                    Diamonds Earned
                  </div>
                </div>
              </div>
            </div>

            {/* Points Earned Banner */}
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-3.5 py-2.5 text-left">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-400 shrink-0 animate-bounce" />
                <div>
                  <p className="text-[11px] font-black text-white">रिवार्ड पोइन्ट्स प्राप्त</p>
                  <p className="text-[10px] text-zinc-400">लाइभ समयावधि अनुसार</p>
                </div>
              </div>
              <span className="text-sm font-black text-amber-300 font-mono">
                +{finalLiveStats.points} Pts
              </span>
            </div>

            {/* Done & Return Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 py-3 text-sm font-black text-white shadow-xl shadow-rose-600/30 active:scale-95 transition-all cursor-pointer border border-rose-400/50"
            >
              सम्पन्न गर्नुहोस् (Done & Return)
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          AUTOMATIC PAUSE NOTICE MODAL (मान्छे नदेखिएपछि आउने Notice Modal)
          - Face live बसेको समयमा मान्छे देखिएको छैन भने Live र Add दुवै रोकिनु पर्छ
          - Live time पनि Count हुँदैन
          - Automatic pause भएपछि Screen मा Notice दिइन्छ
          - Notice को 'I see...' ट्याप गरेपछि Live र Ad पुनः सुरु हुन्छ
          ========================================================================= */}
      {room.type === 'video' && !isPersonDetected && !showLiveEndedSummary && (
        <div
          id="live-absence-pause-notice-modal"
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-fade-in"
        >
          <div className="relative w-full max-w-sm rounded-3xl border-2 border-rose-500 bg-zinc-950 p-6 text-center text-white shadow-[0_0_60px_rgba(244,63,94,0.4)] animate-scale-up">
            {/* Warning / Pause Icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20 border-2 border-rose-500 text-rose-400 animate-pulse">
              <UserX className="h-8 w-8 stroke-[2.5]" />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-black text-rose-300 mb-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span>लाइभ स्वतः रोकियो (LIVE PAUSED)</span>
            </div>

            <h2 className="text-base font-black text-white mb-2">
              क्यामेरा अगाडि मानिस देखिएन!
            </h2>

            <div className="rounded-2xl bg-zinc-900/90 border border-white/10 p-3.5 mb-5 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <span>⏸️ लाइभ स्ट्रिम रोकिएको छ (Paused)</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <span>⏸️ प्रायोजक विज्ञापन रोकिएको छ (Ad Paused)</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <span>⏸️ लाइभ समय गणना रोकिएको छ (Time Paused)</span>
              </div>
              <p className="text-[11px] text-zinc-300 pt-1 border-t border-white/10 leading-relaxed">
                क्यामेरा अगाडि कोही नदेखिएकाले प्रसारण र विज्ञापन स्वतः रोकिएका छन्। क्यामेरा अगाडि आएर तलको <strong>'I see...'</strong> बटन थिच्नुहोस्।
              </p>
            </div>

            {/* "I see..." Button explicitly requested by user */}
            <button
              type="button"
              id="live-resume-i-see-btn"
              onClick={() => {
                setIsPersonDetected(true);
                setAbsentSeconds(0);
                try {
                  liveAudio.playSoundboard('cheer');
                } catch {}
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 py-3.5 text-base font-black text-white shadow-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer ring-2 ring-emerald-400/50"
            >
              <UserCheck className="h-5 w-5" />
              <span>I see... (म बुझ्छु, सुरु गर्नुहोस्)</span>
            </button>

            <p className="mt-3 text-[10px] text-zinc-400">
              ट्याप गरेपछि फेस लाइभ, प्रायोजक विज्ञापन र समय गणना पुनः सुरु हुनेछ।
            </p>
          </div>
        </div>
      )}

      {/* Live Share Modal / Popover */}
      {isShareModalOpen && (
        <div
          id="live-share-modal-overlay"
          className="fixed inset-0 z-[450] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-3 animate-fade-in"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/15 bg-zinc-950 p-5 text-white shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">लाइभ सेयर गर्नुहोस्</h3>
                  <p className="text-[10px] text-zinc-400">साथीहरूसँग प्रत्यक्ष प्रसारण सेयर गर्नुहोस्</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="rounded-full bg-zinc-800/80 p-1.5 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-zinc-900 border border-white/10 p-2.5 mb-4">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? window.location.href : ''}
                className="w-full bg-transparent text-xs text-zinc-300 font-mono focus:outline-hidden truncate"
              />
              <button
                type="button"
                onClick={handleCopyLiveLink}
                className="flex items-center gap-1 rounded-xl bg-rose-500 hover:bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition-all active:scale-95 shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>कपी (Copy)</span>
              </button>
            </div>

            {/* Quick social share buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = encodeURIComponent(window.location.href);
                  const text = encodeURIComponent(`${room.host?.displayName || 'नेपाली क्रिएटर'} को लाइभ हेर्नुहोस्! 🔴`);
                  window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
                  setIsShareModalOpen(false);
                }}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 p-2.5 text-emerald-400 hover:bg-emerald-600/30 transition-all active:scale-95"
              >
                <span className="text-xl">💬</span>
                <span className="text-[10px] font-bold">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = encodeURIComponent(window.location.href);
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
                  setIsShareModalOpen(false);
                }}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-blue-600/20 border border-blue-500/30 p-2.5 text-blue-400 hover:bg-blue-600/30 transition-all active:scale-95"
              >
                <span className="text-xl">👥</span>
                <span className="text-[10px] font-bold">Facebook</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleCopyLiveLink();
                  setIsShareModalOpen(false);
                }}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-rose-600/20 border border-rose-500/30 p-2.5 text-rose-400 hover:bg-rose-600/30 transition-all active:scale-95"
              >
                <span className="text-xl">🔗</span>
                <span className="text-[10px] font-bold">लिङ्क कपी</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Success Toast Notification */}
      {shareSuccessToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-black text-black shadow-2xl animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          <span>{shareSuccessToast}</span>
        </div>
      )}

    </div>
  );
};
