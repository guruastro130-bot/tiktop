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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LiveRoom, LiveSeat, LiveMessage, LiveGift, VoiceSeatCount, User } from '../../types';
import { VoiceSeatGrid } from './VoiceSeatGrid';
import { LiveBannerAd } from './LiveBannerAd';
import { LiveGiftModal } from './LiveGiftModal';
import { LiveRewardAndSafetyController } from './LiveRewardAndSafetyController';
import { liveAudio } from '../../utils/liveAudio';
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
  const { currentUser, openAuthModal } = useAuth();
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
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [activeGiftAnimation, setActiveGiftAnimation] = useState<{
    gift: LiveGift;
    senderName: string;
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

  // Keep passedMediaStreamRef updated if room updates
  useEffect(() => {
    if (room.localMediaStream) {
      passedMediaStreamRef.current = room.localMediaStream;
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

  // Flip Camera handler for host
  const handleFlipCamera = async () => {
    if (!isHost) return;
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);

    if (internalCameraStreamRef.current) {
      internalCameraStreamRef.current.getTracks().forEach(t => t.stop());
      internalCameraStreamRef.current = null;
    }
    if (passedMediaStreamRef.current) {
      passedMediaStreamRef.current.getTracks().forEach(t => t.stop());
      passedMediaStreamRef.current = undefined;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: nextFacing },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
        if (stream) {
          internalCameraStreamRef.current = stream;
          if (videoStreamRef.current) {
            videoStreamRef.current.srcObject = stream;
            videoStreamRef.current.play().catch(() => {});
          }
          setIsCameraActive(true);
        }
      }
    } catch {
      // ignore
    }
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

      if (hasActiveTracks && videoStreamRef.current) {
        videoStreamRef.current.muted = true;
        videoStreamRef.current.srcObject = activeStream!;
        videoStreamRef.current.play().catch(() => {});
        setIsCameraActive(true);
        return;
      }

      // 2. If host and no active stream passed, acquire camera directly with fallback
      if (isHost && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          let stream: MediaStream | null = null;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: cameraFacing },
              audio: false,
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
          if (isMounted && stream) {
            internalCameraStreamRef.current = stream;
            if (videoStreamRef.current) {
              videoStreamRef.current.muted = true;
              videoStreamRef.current.srcObject = stream;
              videoStreamRef.current.play().catch(() => {});
            }
            setIsCameraActive(true);
            return;
          }
        } catch {
          // Camera permission denied or not available in iframe sandbox
        }
      }

      // 3. Guaranteed Live Video Broadcast Stream (never blank or stuck)
      if (videoStreamRef.current && isMounted) {
        const streamSrc = room.streamUrl || '/videos/sample_dance.mp4';
        videoStreamRef.current.muted = true;
        if (!videoStreamRef.current.srcObject) {
          videoStreamRef.current.src = streamSrc;
        }
        videoStreamRef.current.play().catch(() => {});
        setIsCameraActive(true);
      }
    };

    setupHostCamera();
  }, [room.type, isHost, room.streamUrl, cameraFacing]);

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

  // Live streaming duration and person presence safety states
  // totalLiveDurationSeconds counts every single second the broadcast is alive without freezing
  const [totalLiveDurationSeconds, setTotalLiveDurationSeconds] = useState<number>(0);
  const [isPersonDetected, setIsPersonDetected] = useState<boolean>(true);
  const [liveSeconds, setLiveSeconds] = useState<number>(0);
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
  // Live duration MUST NOT count when person is not detected in Face Live!
  // It pauses automatically and resumes only when person is present or 'I see...' is tapped.
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
      setTotalLiveDurationSeconds(prev => prev + 1);
      setLiveSeconds(prev => prev + 1);
      setAbsentSeconds(0);
    }, 1000);

    return () => clearInterval(timer);
  }, [isPersonDetected, room.status, room.type, showLiveEndedSummary]);

  // Automated Camera & Person Detection Monitor
  // Automatically detects if camera is covered/dark or video stream inactive
  useEffect(() => {
    if (room.type !== 'video' || !isHost || room.status === 'ended' || showLiveEndedSummary) return;

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
      // Allow initial 8-10 seconds for video stream and camera to stabilize
      if (warmUpTicks < 3) {
        return;
      }

      // Check stream video track status only if actively using internal camera
      const stream = internalCameraStreamRef.current;
      if (stream && stream.getVideoTracks().length > 0) {
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.every(t => t.readyState === 'ended' || !t.enabled)) {
          setIsPersonDetected(false);
          return;
        }
      }

      // Check canvas luminance
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

          // If camera is covered or pitch dark (e.g. host walked away or camera down)
          if (avgBrightness < 6) {
            lowBrightnessCount++;
            if (lowBrightnessCount >= 2) {
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
    }, 3500);

    return () => clearInterval(detectorInterval);
  }, [room.type, isHost, room.status, showLiveEndedSummary, isPersonDetected]);

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

  // Send Gift
  const handleSendGift = (gift: LiveGift, targetSeatIndex?: number) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }

    const currentSeats = room.seats || [];
    const targetUser =
      targetSeatIndex !== undefined && targetSeatIndex !== 0
        ? currentSeats.find(s => s.seatIndex === targetSeatIndex)?.user
        : room.host;

    const isLucky = Boolean(gift.isLucky || gift.category === 'lucky');
    const recipientName = targetUser?.username || room.host?.username || 'Host';
    const giftMsg: LiveMessage = {
      id: `gift_${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
      text: isLucky
        ? `🎰 लक्की गिफ्ट! ${gift.nameNp} ${gift.icon} (${gift.coins.toLocaleString()} Coins) ➔ @${recipientName} 🎉`
        : `🎁 ${gift.nameNp} ${gift.icon} (${gift.coins.toLocaleString()} Coins) ➔ @${recipientName}`,
      type: 'gift',
      gift,
      targetSeatIndex,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, giftMsg]);
    setRoom(prev => ({
      ...prev,
      diamondCount: prev.diamondCount + gift.coins,
    }));
    setLiveViewerCount(prev => prev + Math.floor(Math.random() * 3 + 1));

    // Trigger overlay animation
    setActiveGiftAnimation({
      gift,
      senderName: currentUser.displayName,
    });

    setTimeout(() => {
      setActiveGiftAnimation(null);
    }, 3200);
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
                  } else if (!el.srcObject) {
                    const fallbackSrc = room.streamUrl || '/videos/sample_dance.mp4';
                    if (!el.src || (!el.src.includes('sample_dance.mp4') && el.src !== fallbackSrc)) {
                      el.src = fallbackSrc;
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
                onError={() => {
                  if (videoStreamRef.current) {
                    videoStreamRef.current.src = '/videos/sample_dance.mp4';
                    videoStreamRef.current.muted = true;
                    videoStreamRef.current.play().catch(() => {});
                  }
                  setIsCameraActive(true);
                }}
                className={`h-full w-full object-cover object-[center_15%] brightness-95 ${
                  activeFilter === 'radiant' ? 'contrast-125 saturate-150' :
                  activeFilter === 'warm' ? 'sepia-50 saturate-125' :
                  activeFilter === 'velvet' ? 'brightness-90 contrast-125' :
                  activeFilter === 'noir' ? 'grayscale contrast-150' : ''
                }`}
              />
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
                <p className="text-xs text-rose-300 font-bold mt-1">🔴 प्रत्यक्ष अडियो प्रसारण चालु छ (Live Audio On)</p>
                <div className="flex items-center gap-1 mt-3">
                  <span className="w-1 bg-rose-500 h-3 animate-pulse rounded-full" />
                  <span className="w-1 bg-rose-400 h-6 animate-bounce rounded-full" />
                  <span className="w-1 bg-rose-500 h-4 animate-pulse rounded-full" />
                  <span className="w-1 bg-rose-400 h-7 animate-bounce rounded-full" />
                  <span className="w-1 bg-rose-500 h-2 animate-pulse rounded-full" />
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-950/40 via-zinc-950 to-black">
            {/* Animated subtle sound ambient waves */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
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

      {/* 2. Below Ad Banner: Host Profile, Category, Viewers & Close Button */}
      <div className="relative z-20 flex items-start justify-between px-3.5 py-1.5 backdrop-blur-xs gap-2">
        {/* Host Profile Capsule & Category Tag */}
        <div className="flex flex-col gap-1 shrink-0">
          <div className="flex items-center gap-2 rounded-full bg-black/65 border border-white/15 p-1 pr-2.5 backdrop-blur-md shadow-lg">
            {/* Host Avatar with + Follow Icon directly on edge */}
            <div className="relative shrink-0">
              <img
                src={room.host?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt={room.host?.displayName || 'Host'}
                onClick={() => onOpenCreatorProfile && room.host?.id && onOpenCreatorProfile(room.host.id)}
                className="h-9 w-9 rounded-full object-cover border border-rose-500 cursor-pointer"
              />
              {!isHost && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFollowingHost(prev => !prev);
                  }}
                  className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer border border-zinc-950 ${
                    isFollowingHost ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                  }`}
                  title={isFollowingHost ? 'Following' : 'होस्टलाई फलो गर्नुहोस् (+ Follow)'}
                >
                  {isFollowingHost ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : <Plus className="h-2.5 w-2.5 stroke-[3]" />}
                </button>
              )}
            </div>

            <div className="min-w-0 max-w-[95px] sm:max-w-[120px]">
              <p className="text-xs font-black text-white truncate">{room.host?.displayName || 'नेपाली क्रिएटर'}</p>
              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                <Coins className="h-2.5 w-2.5" />
                <span>{(room.diamondCount || 0).toLocaleString()} Diamonds</span>
              </div>
            </div>

            {!isHost && (
              <button
                type="button"
                onClick={() => setIsFollowingHost(prev => !prev)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black transition-all active:scale-95 shrink-0 cursor-pointer ${
                  isFollowingHost
                    ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow hover:brightness-110'
                }`}
                title={isFollowingHost ? 'Following' : 'होस्टलाई फलो गर्नुहोस् (+ Follow)'}
              >
                {isFollowingHost ? (
                  <>
                    <Check className="h-3 w-3 stroke-[3]" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3 stroke-[3]" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Harmonized विधा (Category) Tag Badge */}
          <div className="flex items-center gap-1.5 pl-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 border border-white/20 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-300 backdrop-blur-md shadow-sm">
              <span className="text-zinc-400 font-normal">विधा:</span>
              <span className="text-white">
                {room.category === 'nepal' ? '🇳🇵 नेपाल' :
                 room.category === 'music' ? '🎵 संगीत' :
                 room.category === 'gaming' ? '🎮 गेमिङ' :
                 room.category === 'chat' ? '💬 च्याट' :
                 room.category === 'talent' ? '✨ ट्यालेन्ट' :
                 room.category === 'chill' ? '🌙 आरामदायी' : (room.category || '🇳🇵 नेपाल')}
              </span>
            </span>
          </div>
        </div>

        {/* Clean Live Viewers Count & Top Right Exit/End Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Simple Clean Live Viewer Count */}
          <button
            type="button"
            onClick={() => setIsViewerListOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-black/60 border border-white/15 py-1 px-2.5 backdrop-blur-md hover:bg-black/80 transition-all cursor-pointer group active:scale-95 shadow"
            title="लाइभ दर्शक हेर्नुहोस् (Live Viewers)"
          >
            <Users className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <span className="text-xs font-black text-white font-mono">
              {liveViewerCount.toLocaleString()}
            </span>
            <ChevronDown className="h-3 w-3 text-zinc-400 group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* Exit / End Live Button with Cross (✕) */}
          {isHost ? (
            <button
              type="button"
              id="direct-end-live-btn"
              onClick={() => setShowExitConfirm(true)}
              className="flex items-center gap-1 rounded-full bg-red-600/90 hover:bg-red-500 border border-red-400/60 px-3 py-1 text-xs font-black text-white shadow-lg backdrop-blur-md transition-all active:scale-95 shrink-0 cursor-pointer"
              title="लाइभ अन्त्य गर्नुहोस् (End Live ✕)"
            >
              <X className="h-3.5 w-3.5 stroke-[3]" />
              <span className="font-black text-[11px] whitespace-nowrap">
                {room.type === 'voice' ? 'Party End ✕' : 'End ✕'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-black/60 border border-white/15 p-2 text-white hover:bg-black/80 backdrop-blur-md transition-colors active:scale-95 shrink-0 cursor-pointer"
              title="Exit Live Stream ✕"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

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

        {/* Big Gift Banner Overlay Animation */}
        {activeGiftAnimation && (
          <div className="pointer-events-none absolute inset-x-3 top-1/4 z-40 flex flex-col items-center justify-center animate-fade-in space-y-2">
            
            {/* Flying Emotive Icon Burst */}
            <div className="relative flex items-center justify-center">
              <span className="text-6xl filter drop-shadow-[0_0_20px_rgba(244,63,94,0.8)] animate-pulse scale-125">
                {activeGiftAnimation.gift.icon}
              </span>
              <div className="absolute -inset-4 bg-rose-500/20 rounded-full blur-xl animate-ping" />
            </div>

            {/* Glowing Frosted VIP Gift Capsule */}
            <div className="flex items-center gap-3.5 rounded-3xl border-2 border-amber-400/80 bg-gradient-to-r from-zinc-950/95 via-rose-950/90 to-zinc-950/95 px-6 py-3 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl ring-2 ring-rose-500/30">
              <span className="text-3xl animate-bounce">{activeGiftAnimation.gift.icon}</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-black text-amber-300">
                    {activeGiftAnimation.senderName}
                  </p>
                  <span className="text-[10px] text-zinc-300 font-bold">ले पठाउनुभयो:</span>
                </div>
                <p className="text-sm font-black text-white bg-gradient-to-r from-white via-rose-200 to-amber-200 bg-clip-text text-transparent">
                  {activeGiftAnimation.gift.nameNp}
                </p>
                {activeGiftAnimation.gift.emotionTag && (
                  <p className="text-[10px] font-bold text-rose-300/90">
                    ✨ {activeGiftAnimation.gift.emotionTag}
                  </p>
                )}
                <div className="flex items-center gap-1 text-[10px] text-amber-400 font-black mt-0.5">
                  <Coins className="h-3 w-3" />
                  <span>+{activeGiftAnimation.gift.coins.toLocaleString()} Coins VIP Gift Celebration ⚡</span>
                </div>
              </div>
            </div>
          </div>
        )}
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

      {/* Bottom Live Controls Bar */}
      <div className="relative z-20 border-t border-white/10 bg-black/90 p-2.5 sm:p-3 flex items-center justify-between gap-1.5 sm:gap-2">
        {isHost ? (
          /* Host Dedicated Broadcast Suite */
          <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2">
            {/* Left Controls: Flip Camera, Filters, Video On/Off, Mic, Soundboard, End Live */}
            <div className="flex items-center gap-1 shrink-0">
              {room.type === 'video' && (
                <>
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    className="flex items-center justify-center h-9 w-9 rounded-full bg-zinc-800/90 border border-white/15 text-rose-400 hover:text-white transition-all active:scale-95 shrink-0"
                    title="क्यामेरा बदल्नुहोस् (Flip Camera)"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBeautyModalOpen(prev => !prev)}
                    className={`flex items-center justify-center h-9 w-9 rounded-full border transition-all active:scale-95 shrink-0 ${
                      isBeautyModalOpen
                        ? 'bg-rose-600 text-white border-rose-400'
                        : 'bg-zinc-800/90 text-pink-400 border-white/15 hover:text-white'
                    }`}
                    title="ब्युटी र फिल्टर (Beauty & Filters)"
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>

                  {/* Camera on/off toggle */}
                  <button
                    type="button"
                    onClick={() => setIsCameraOff(prev => !prev)}
                    className={`flex items-center justify-center h-9 w-9 rounded-full border transition-all active:scale-95 shrink-0 ${
                      isCameraOff
                        ? 'bg-amber-600 text-white border-amber-400'
                        : 'bg-zinc-800/90 text-zinc-300 border-white/15 hover:text-white'
                    }`}
                    title={isCameraOff ? 'क्यामेरा खोल्नुहोस् (Turn Camera On)' : 'क्यामेरा बन्द गर्नुहोस् (Turn Camera Off)'}
                  >
                    {isCameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setIsMicMuted(prev => !prev)}
                className={`flex items-center justify-center h-9 w-9 rounded-full transition-all active:scale-95 shrink-0 ${
                  isMicMuted
                    ? 'bg-rose-600 text-white'
                    : 'bg-zinc-800/90 text-emerald-400 border border-emerald-500/40'
                }`}
                title={isMicMuted ? 'माइक खुला गर्नुहोस् (Unmute Mic)' : 'माइक बन्द गर्नुहोस् (Mute Mic)'}
              >
                {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsSoundboardOpen(prev => !prev)}
                className="flex items-center justify-center h-9 w-9 rounded-full bg-zinc-800/90 border border-white/10 text-amber-400 hover:text-amber-300 transition-colors active:scale-95 shrink-0"
                title="साउन्ड इफेक्ट्स (Sound Effects)"
              >
                <Music className="h-4 w-4" />
              </button>

              {/* Host Quick Pause / Person Absence Simulation Button (Face Live only) */}
              {room.type === 'video' && (
                <button
                  type="button"
                  id="host-simulate-absence-btn"
                  onClick={() => {
                    setIsPersonDetected(false);
                    setAbsentSeconds(5);
                  }}
                  className="flex items-center justify-center h-9 w-9 rounded-full bg-zinc-800/90 border border-amber-400/40 text-amber-400 hover:bg-amber-500/20 transition-colors active:scale-95 shrink-0"
                  title="मानिस नदेखिएको अवस्था परिक्षण गर्नुहोस् (Simulate Absence & Pause)"
                >
                  <UserX className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Middle: Direct Comment Input Form for Host just like Party Live */}
            <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-1.5 min-w-0 mx-1">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="कमेन्ट लेख्नुहोस् (Comment)..."
                className="w-full rounded-full border border-white/15 bg-zinc-800/90 px-3 py-2 text-xs text-white placeholder-zinc-400 focus:border-rose-500 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="rounded-full bg-rose-500 p-2 text-white disabled:opacity-40 disabled:pointer-events-none hover:bg-rose-600 transition-colors shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

            {/* Right: Dedicated Gift Box + Share Live (next to heart) + Tap Like Heart Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Dedicated Gift Box (Box मा Gift को Icon - opens categorized gifts & lucky gifts) */}
              <button
                type="button"
                id="live-bottom-gift-box-btn"
                onClick={() => {
                  setGiftModalInitialCategory('all');
                  setIsGiftModalOpen(true);
                }}
                className="relative flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 p-[1.5px] shadow-[0_0_16px_rgba(244,63,94,0.45)] hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer group"
                title="उपहार तथा लक्की गिफ्ट पठाउनुहोस् (Send Gifts & Lucky Gifts)"
              >
                <div className="flex flex-col items-center justify-center w-full h-full rounded-[14px] bg-zinc-950/90 group-hover:bg-zinc-900/80 transition-colors">
                  <span className="text-xl sm:text-2xl filter drop-shadow-md group-hover:scale-110 transition-transform">🎁</span>
                  <span className="text-[7.5px] font-black text-amber-300 leading-none -mt-0.5 tracking-tighter uppercase">GIFT</span>
                </div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[8px] font-black shadow-md ring-1 ring-black animate-pulse">
                  🎰
                </span>
              </button>

              {/* Share Live/Party Button (Right beside Heart button) */}
              <button
                type="button"
                id="host-live-share-btn"
                onClick={handleShareLive}
                className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-zinc-800/90 border border-sky-400/40 text-sky-400 hover:text-white hover:bg-sky-500/20 active:scale-95 transition-all shrink-0 cursor-pointer shadow-md"
                title="लाइभ/पार्टी सेयर गर्नुहोस् (Share Live / Party)"
              >
                <Share2 className="h-4 w-4" />
              </button>

              {/* Tap Like Heart Button */}
              <button
                type="button"
                id="live-tap-like-heart-btn"
                onClick={handleTapLike}
                className="rounded-full bg-rose-600/90 p-2.5 text-white shadow-lg hover:bg-rose-600 active:scale-125 transition-transform cursor-pointer shrink-0"
                title="लाइक पठाउनुहोस् (Send Hearts ❤️)"
              >
                <Heart className="h-4 w-4 fill-white" />
              </button>
            </div>
          </div>
        ) : (
          /* Viewer Interactive Suite */
          <>
            {/* Chat Input Field */}
            <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-1.5 min-w-0">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="कमेन्ट लेख्नुहोस् (Comment)..."
                className="w-full rounded-full border border-white/15 bg-zinc-800/90 px-3.5 py-2 text-xs text-white placeholder-zinc-400 focus:border-rose-500 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="rounded-full bg-rose-500 p-2 text-white disabled:opacity-40 disabled:pointer-events-none hover:bg-rose-600 transition-colors shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

            {/* Mic Control for Seated User */}
            {isUserSeated && (
              <button
                type="button"
                onClick={() => handleToggleSeatMute(currentSeatIndex)}
                className={`rounded-full p-2.5 transition-all active:scale-95 shrink-0 ${
                  isMicMuted
                    ? 'bg-rose-600 text-white'
                    : 'bg-zinc-800 text-emerald-400 border border-emerald-500/40'
                }`}
                title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}

            {/* Soundboard Button (Madal, Horn, Applause) */}
            <button
              type="button"
              onClick={() => setIsSoundboardOpen(prev => !prev)}
              className="rounded-full bg-zinc-800/90 border border-white/10 p-2.5 text-amber-400 hover:text-amber-300 transition-colors active:scale-95 shrink-0"
              title="Sound Effects (मादल / हर्न / ताली)"
            >
              <Music className="h-4 w-4" />
            </button>

            {/* Dedicated Gift Box on the Side */}
            <button
              type="button"
              id="live-bottom-gift-box-btn"
              onClick={() => {
                setGiftModalInitialCategory('all');
                setIsGiftModalOpen(true);
              }}
              className="relative flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 p-[1.5px] shadow-[0_0_16px_rgba(244,63,94,0.45)] hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer group"
              title="उपहार तथा लक्की गिफ्ट पठाउनुहोस् (Send Gifts & Lucky Gifts)"
            >
              <div className="flex flex-col items-center justify-center w-full h-full rounded-[14px] bg-zinc-950/90 group-hover:bg-zinc-900/80 transition-colors">
                <span className="text-xl sm:text-2xl filter drop-shadow-md group-hover:scale-110 transition-transform">🎁</span>
                <span className="text-[7.5px] font-black text-amber-300 leading-none -mt-0.5 tracking-tighter uppercase">GIFT</span>
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[8px] font-black shadow-md ring-1 ring-black animate-pulse">
                🎰
              </span>
            </button>

            {/* Share Live/Party Button (Right beside Heart button) */}
            <button
              type="button"
              id="viewer-live-share-btn"
              onClick={handleShareLive}
              className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-zinc-800/90 border border-sky-400/40 text-sky-400 hover:text-white hover:bg-sky-500/20 active:scale-95 transition-all shrink-0 cursor-pointer shadow-md"
              title="लाइभ/पार्टी सेयर गर्नुहोस् (Share Live / Party)"
            >
              <Share2 className="h-4 w-4" />
            </button>

            {/* Like Heart Button */}
            <button
              type="button"
              onClick={handleTapLike}
              className="rounded-full bg-rose-600/90 p-2.5 text-white shadow-lg hover:bg-rose-600 active:scale-125 transition-transform cursor-pointer shrink-0"
              title="लाइक पठाउनुहोस् (Send Hearts ❤️)"
            >
              <Heart className="h-4 w-4 fill-white" />
            </button>
          </>
        )}
      </div>

      {/* Host Beauty Filter Picker Popover */}
      {isHost && isBeautyModalOpen && (
        <div className="absolute bottom-16 left-3 right-3 z-40 rounded-2xl border border-pink-500/30 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-md animate-fade-in">
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
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-rose-500 text-white shadow-lg ring-2 ring-white/30 scale-105'
                    : 'bg-zinc-800 text-zinc-300 hover:text-white border border-white/10'
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
        <div className="absolute bottom-16 left-4 right-4 z-40 rounded-2xl border border-white/15 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-md animate-fade-in">
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
              { id: 'madal', label: '🥁 मादल (Madal)', fn: () => liveAudio.playSoundboard('madal') },
              { id: 'horn', label: '🎺 एयर हर्न', fn: () => liveAudio.playSoundboard('horn') },
              { id: 'applause', label: '👏 ताली (Clap)', fn: () => liveAudio.playSoundboard('applause') },
            ].map(snd => (
              <button
                key={snd.id}
                type="button"
                onClick={snd.fn}
                className="rounded-xl bg-zinc-800 p-2 text-center text-xs font-bold text-white hover:bg-zinc-700 active:scale-95 transition-all border border-white/5"
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

      {/* Live Viewers & Top Contributors Drawer / Modal */}
      {isViewerListOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs select-none animate-fade-in p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/15 bg-zinc-950 p-4 text-white shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>लाइभ दर्शक सूची (Live Audience)</span>
                    <span className="rounded-full bg-rose-500/20 text-rose-400 px-2 py-0.5 text-xs font-black border border-rose-500/30">
                      {liveViewerCount.toLocaleString()} जना Live
                    </span>
                  </h3>
                  <p className="text-[10px] text-zinc-400">प्रत्यक्ष हेरिरहेका दर्शक तथा उपहार दाताहरू</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsViewerListOpen(false)}
                className="rounded-full bg-zinc-800 p-1.5 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Top 3 Supporters Podium */}
            <div className="rounded-2xl bg-zinc-900/90 border border-white/10 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  <span>शीर्ष योगदानकर्ता (Top Gifters Ranking)</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-bold">आजको लाइभ</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                {/* 2nd Place */}
                <div className="flex flex-col items-center p-2 rounded-xl bg-zinc-800/60 border border-white/5">
                  <div className="relative">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" className="h-10 w-10 rounded-full object-cover border-2 border-slate-300" alt="rank 2" />
                    <span className="absolute -bottom-1 -right-1 bg-slate-400 text-black text-[9px] font-black rounded-full px-1.5">🥈 2</span>
                  </div>
                  <p className="text-xs font-bold text-white mt-1.5 truncate max-w-full">Pooja Sharma</p>
                  <span className="text-[10px] font-extrabold text-amber-400">9,200 💎</span>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center p-2.5 rounded-xl bg-gradient-to-b from-amber-500/20 to-zinc-800/80 border border-amber-400/40 -mt-2 shadow-lg">
                  <div className="relative">
                    <Crown className="h-4 w-4 text-amber-400 absolute -top-3 left-1/2 -translate-x-1/2" />
                    <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" className="h-12 w-12 rounded-full object-cover border-2 border-amber-400" alt="rank 1" />
                    <span className="absolute -bottom-1 -right-1 bg-amber-400 text-black text-[9px] font-black rounded-full px-1.5">🥇 1</span>
                  </div>
                  <p className="text-xs font-black text-amber-300 mt-1.5 truncate max-w-full">Aayush KC</p>
                  <span className="text-[11px] font-black text-amber-400">15,400 💎</span>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center p-2 rounded-xl bg-zinc-800/60 border border-white/5">
                  <div className="relative">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" className="h-10 w-10 rounded-full object-cover border-2 border-amber-700" alt="rank 3" />
                    <span className="absolute -bottom-1 -right-1 bg-amber-700 text-white text-[9px] font-black rounded-full px-1.5">🥉 3</span>
                  </div>
                  <p className="text-xs font-bold text-white mt-1.5 truncate max-w-full">Ramesh A.</p>
                  <span className="text-[10px] font-extrabold text-amber-400">6,800 💎</span>
                </div>
              </div>
            </div>

            {/* Audience List */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              <p className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider">
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
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-white/5 hover:bg-zinc-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <img src={user.avatar} className="h-8 w-8 rounded-full object-cover border border-white/10" alt={user.name} />
                    <div>
                      <p className="text-xs font-bold text-white">{user.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                        <span>@{user.username}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-bold">{user.coins.toLocaleString()} Coins</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-1 text-[10px] font-black hover:bg-rose-500 hover:text-white transition-all"
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
