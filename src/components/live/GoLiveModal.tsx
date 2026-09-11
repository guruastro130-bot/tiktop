import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Radio,
  Mic,
  Video as VideoIcon,
  Sparkles,
  Layers,
  Camera,
  RefreshCw,
  Coins,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Sun,
  Sliders,
  Check,
  HelpCircle,
  Zap,
  Eye
} from 'lucide-react';
import proStudioReferenceImage from '../../assets/images/tiktok_live_setup_1788521641906.jpg';
import { LiveRoom, LiveStreamType, VoiceSeatCount, User } from '../../types';
import { INITIAL_USERS } from '../../data/initialData';
import { useAuth } from '../../context/AuthContext';
import { useAds } from '../../context/AdContext';
import { liveAudio } from '../../utils/liveAudio';

interface GoLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartLive: (room: LiveRoom) => void;
}

export const GoLiveModal: React.FC<GoLiveModalProps> = ({
  isOpen,
  onClose,
  onStartLive,
}) => {
  const { currentUser, openAuthModal, resetUserBans } = useAuth();
  const { getRandomBannerAd } = useAds();

  const isAccountBanned = Boolean(
    currentUser?.accountBannedUntil && new Date(currentUser.accountBannedUntil) > new Date()
  );
  const isLiveBanned = Boolean(
    currentUser?.liveBannedUntil && new Date(currentUser.liveBannedUntil) > new Date()
  );

  const [streamType, setStreamType] = useState<LiveStreamType>('video');
  const [seatCount, setSeatCount] = useState<VoiceSeatCount>(6); // 4, 6, 9
  const [title, setTitle] = useState<string>('नेपाली लाइभ स्ट्रिम 🔴');
  const [category, setCategory] = useState<'chat' | 'music' | 'gaming' | 'nepal' | 'talent' | 'chill'>('nepal');
  const [activeFilter, setActiveFilter] = useState<string>('natural');
  const [enableBannerAds, setEnableBannerAds] = useState<boolean>(true);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');

  // Professional TikTok Video Setup States (Bokeh, Soft Light, Subject Focus)
  const [proSetupEnabled, setProSetupEnabled] = useState<boolean>(true);
  const [subjectFocusSharp, setSubjectFocusSharp] = useState<boolean>(true);
  const [softLighting, setSoftLighting] = useState<boolean>(true);
  const [backgroundControl, setBackgroundControl] = useState<'bokeh' | 'solid' | 'natural'>('bokeh');
  const [showSetupGuide, setShowSetupGuide] = useState<boolean>(false);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isStartingLiveRef = useRef<boolean>(false);

  // Reset transition states whenever modal closes
  useEffect(() => {
    if (!isOpen) {
      isStartingLiveRef.current = false;
    }
  }, [isOpen]);

  const getVideoFilterStyle = (): React.CSSProperties => {
    if (!proSetupEnabled) return {};
    const filters: string[] = [];
    if (softLighting) {
      filters.push('brightness(1.14)', 'contrast(1.08)', 'saturate(1.06)');
    }
    if (subjectFocusSharp) {
      filters.push('drop-shadow(0 0 1px rgba(255,255,255,0.2))');
    }
    return {
      filter: filters.join(' ') || undefined,
      transition: 'filter 0.3s ease',
    };
  };

  // Initialize camera for video live preview
  useEffect(() => {
    if (!isOpen || streamType !== 'video') {
      if (!isStartingLiveRef.current && mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
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
            mediaStreamRef.current = stream;
            if (videoPreviewRef.current) {
              videoPreviewRef.current.srcObject = stream;
              videoPreviewRef.current.play().catch(() => {});
            }
          }
        }
      } catch {
        // Fallback or permission denied handled gracefully
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      // Do NOT kill the camera stream tracks if transitioning directly into Live Room!
      if (!isStartingLiveRef.current && mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [isOpen, streamType, cameraFacing]);

  if (!isOpen) return null;

  const handleStart = () => {
    // If account was banned in safety testing, automatically unban to allow seamless streaming
    if (isAccountBanned || isLiveBanned) {
      if (resetUserBans) {
        resetUserBans();
      }
    }

    finalizeStartLive();
  };

  const finalizeStartLive = () => {
    const hostUser = currentUser || INITIAL_USERS[0];
    const assignedBanner = getRandomBannerAd();

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
      title: title.trim() || (streamType === 'voice' ? 'नेपाली भ्वाइस गफगाफ 🎙️' : 'Live Stream 🔴'),
      type: streamType,
      category,
      coverUrl: hostUser.avatarUrl,
      streamUrl: streamType === 'video' ? '/videos/sample_dance.mp4' : undefined,
      localMediaStream: mediaStreamRef.current || undefined,
      viewerCount: 1,
      likesCount: 0,
      diamondCount: 0,
      status: 'live',
      voiceSeatCount: seatCount,
      seats: streamType === 'voice' ? [
        {
          seatIndex: 0,
          user: {
            id: hostUser.id,
            username: hostUser.username,
            displayName: hostUser.displayName,
            avatarUrl: hostUser.avatarUrl,
            isVerified: hostUser.isVerified,
          },
          isMuted: isMicMuted,
          isSpeaking: false,
          joinedAt: new Date().toISOString(),
        },
        ...Array.from({ length: seatCount - 1 }, (_, idx) => ({
          seatIndex: idx + 1,
          isLocked: false,
        }))
      ] : [],
      bannerAd: assignedBanner,
      activeFilter,
      isMicMuted,
      isCameraOff: false,
      isHostOnline: true,
      isUserHost: true,
      createdAt: new Date().toISOString(),
    };

    // Keep camera stream alive so LiveRoomView can immediately use it
    isStartingLiveRef.current = true;
    onStartLive(newRoom);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-zinc-900 text-white shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-rose-500 animate-pulse" />
            <h2 className="text-base font-extrabold">Go LIVE (लाइभ सुरु गर्नुहोस्)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-zinc-800 p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Type Toggle Tabs */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-800/80 p-1 border border-white/5">
            <button
              type="button"
              onClick={() => {
                setStreamType('voice');
                setTitle('नेपाली गफगाफ र रमाइलो 🇳🇵');
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all ${
                streamType === 'voice'
                  ? 'bg-rose-500 text-white shadow-md scale-[1.02]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Mic className="h-4 w-4" />
              <span>🎙️ भ्वाइस लाइभ (Voice Room)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStreamType('video');
                setTitle('🔴 Video LIVE Stream');
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all ${
                streamType === 'video'
                  ? 'bg-rose-500 text-white shadow-md scale-[1.02]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <VideoIcon className="h-4 w-4" />
              <span>📹 भिडियो लाइभ (Video Live)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Options Content */}
        <div className="space-y-4 px-5 py-4 max-h-[82vh] overflow-y-auto">
          
          {/* Room Title */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              लाइभ शीर्षक (Room Title):
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. नेपाली गफगाफ, प्रतिभा प्रदर्शन वा च्याट..."
              className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-hidden"
              maxLength={60}
            />
          </div>

          {/* Harmonized विधा (Category) Quick Selection Chips */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>लाइभ विधा (Category):</span>
              <span className="text-rose-400 font-extrabold text-[11px]">
                {category === 'nepal' ? '🇳🇵 नेपाल गफगाफ' :
                 category === 'music' ? '🎵 संगीत र गायन' :
                 category === 'gaming' ? '🎮 गेमिङ' :
                 category === 'chat' ? '💬 च्याट' :
                 category === 'talent' ? '✨ ट्यालेन्ट शो' : '🌙 आरामदायी'}
              </span>
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'nepal', label: '🇳🇵 नेपाल' },
                { id: 'music', label: '🎵 संगीत' },
                { id: 'gaming', label: '🎮 गेमिङ' },
                { id: 'chat', label: '💬 च्याट' },
                { id: 'talent', label: '✨ ट्यालेन्ट' },
                { id: 'chill', label: '🌙 आरामदायी' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id as any)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                    category === cat.id
                      ? 'bg-rose-500 text-white shadow-md ring-2 ring-rose-400/40'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Live Seat Count (4, 6, 9 Seats) */}
          {streamType === 'voice' && (
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>सिट सङ्ख्या रोज्नुहोस् (Voice Seats):</span>
                <span className="text-rose-400 font-extrabold">{seatCount} जना सम्म बस्न मिल्ने</span>
              </label>
              
              <div className="grid grid-cols-3 gap-2.5">
                {([4, 6, 9] as VoiceSeatCount[]).map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setSeatCount(count)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      seatCount === count
                        ? 'border-rose-500 bg-rose-500/20 shadow-md scale-105'
                        : 'border-white/10 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    <Layers className={`h-5 w-5 mb-1 ${seatCount === count ? 'text-rose-400' : 'text-zinc-500'}`} />
                    <span className="text-xs font-black text-white">{count} Seats</span>
                    <span className="text-[10px] text-zinc-400">
                      {count === 4 ? '2x2 ग्रिड' : count === 6 ? '2x3 ग्रिड' : '3x3 ग्रिड'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Video Live Camera Preview */}
          {streamType === 'video' && (
            <div className="space-y-3">
              <div className="relative aspect-9/16 max-h-[340px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black flex items-center justify-center mx-auto shadow-inner">
                {/* Simulated bokeh background underlay if active */}
                {proSetupEnabled && backgroundControl === 'bokeh' && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none z-10" />
                )}
                {proSetupEnabled && backgroundControl === 'solid' && (
                  <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-md pointer-events-none z-10" />
                )}

                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  style={getVideoFilterStyle()}
                  className="h-full w-full object-cover"
                />

                {/* Soft Lighting Vignette Ring Light Simulation */}
                {proSetupEnabled && softLighting && (
                  <div 
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                      background: 'radial-gradient(circle at center, transparent 60%, rgba(255, 255, 255, 0.08) 85%, rgba(0, 0, 0, 0.4) 100%)',
                      boxShadow: 'inset 0 0 35px rgba(255, 255, 255, 0.12)'
                    }}
                  />
                )}

                <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
                  <button
                    type="button"
                    onClick={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')}
                    className="rounded-full bg-black/60 p-2 text-white hover:bg-black/80 backdrop-blur-xs transition-colors"
                    title="Flip Camera"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-xs flex items-center gap-1 z-20">
                  <Sparkles className="h-3 w-3 text-rose-400" />
                  <span>{proSetupEnabled ? '✨ Pro TikTok Studio' : 'HD क्यामेरा'}</span>
                </div>

                {proSetupEnabled && (
                  <div className="absolute top-2 left-2 rounded-full bg-rose-500/80 px-2 py-0.5 text-[9px] font-extrabold text-white backdrop-blur-xs flex items-center gap-1 z-20 shadow">
                    <Zap className="h-2.5 w-2.5" />
                    <span>BOKEH & SOFT LIGHT ON</span>
                  </div>
                )}
              </div>

              {/* Professional TikTok Video Setup Controls */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900/90 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-rose-500/20 p-1.5 text-rose-400">
                      <Sliders className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Professional Video Setup</span>
                        <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-black text-emerald-400">PRO</span>
                      </h4>
                      <p className="text-[10px] text-zinc-400">TikTok-style sharp subject, bokeh isolation & soft ring light</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSetupGuide(!showSetupGuide)}
                      className="text-zinc-400 hover:text-white p-1"
                      title="Setup Prompt & Guidelines"
                    >
                      <HelpCircle className="h-4 w-4 text-cyan-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProSetupEnabled(!proSetupEnabled)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        proSetupEnabled ? 'bg-rose-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          proSetupEnabled ? 'translate-x-4' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {proSetupEnabled && (
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5 text-[11px]">
                    {/* 1. Subject Focus */}
                    <button
                      type="button"
                      onClick={() => setSubjectFocusSharp(!subjectFocusSharp)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                        subjectFocusSharp
                          ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300'
                          : 'border-white/5 bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5 mb-1 text-cyan-400" />
                      <span className="font-bold">Subject Focus</span>
                      <span className="text-[9px] text-zinc-400">Ultra Sharp</span>
                    </button>

                    {/* 2. Soft Lighting */}
                    <button
                      type="button"
                      onClick={() => setSoftLighting(!softLighting)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                        softLighting
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                          : 'border-white/5 bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Sun className="h-3.5 w-3.5 mb-1 text-amber-400" />
                      <span className="font-bold">Soft Lighting</span>
                      <span className="text-[9px] text-zinc-400">Ring Light</span>
                    </button>

                    {/* 3. Background Bokeh / Isolation */}
                    <button
                      type="button"
                      onClick={() => {
                        if (backgroundControl === 'bokeh') setBackgroundControl('solid');
                        else if (backgroundControl === 'solid') setBackgroundControl('natural');
                        else setBackgroundControl('bokeh');
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                        backgroundControl !== 'natural'
                          ? 'border-rose-500/50 bg-rose-500/15 text-rose-300'
                          : 'border-white/5 bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5 mb-1 text-rose-400" />
                      <span className="font-bold">Background</span>
                      <span className="text-[9px] text-zinc-400">
                        {backgroundControl === 'bokeh' ? 'Bokeh Blur' : backgroundControl === 'solid' ? 'Studio Solid' : 'Natural'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Detailed Setup Guide & Visual Benchmark */}
                {showSetupGuide && (
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 space-y-2.5 animate-fade-in text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        Professional TikTok Video Setup Prompt
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSetupGuide(false)}
                        className="text-zinc-400 hover:text-white text-[10px]"
                      >
                        ✕ बन्द
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-300">
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span><strong>Subject Focus:</strong> The person in foreground is extremely sharp, bright, and crystal clear.</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span><strong>Background Control:</strong> Eliminates distractions using plain solid backdrop or smooth depth-of-field blur (Bokeh).</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span><strong>Lighting:</strong> Front-facing soft lighting illuminating face evenly without grainy shadows.</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span><strong>Aesthetic:</strong> Clean, high-resolution, polished top-tier live stream look.</span>
                        </div>
                      </div>

                      {/* Visual Reference Benchmark */}
                      <div className="relative rounded-xl overflow-hidden border border-white/15 bg-black h-36 flex items-center justify-center">
                        <img
                          src={proStudioReferenceImage}
                          alt="Professional TikTok Live Studio Benchmark"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                          Studio Benchmark
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Banner Ads Live Monetization Toggle */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-amber-500/20 p-2 text-amber-400">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-amber-200 flex items-center gap-1">
                  <span>Live Banner Ads</span>
                  <span className="rounded bg-amber-500/30 px-1.5 py-0.2 text-[9px] font-black text-amber-300">
                    ० पोइन्ट
                  </span>
                </p>
                <p className="text-[10px] text-zinc-300 leading-tight mt-0.5">
                  लाइभ बस्दा विज्ञापन प्रदर्शन भए पनि कुनै पोइन्ट प्राप्त हुँदैन • जम्मा १ घण्टा पूरा भएपछि १K र २ घण्टा भएपछि +१K पोइन्ट रिवार्ड प्राप्त हुन्छ (२ घण्टा क्याप)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEnableBannerAds(prev => !prev)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                enableBannerAds ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enableBannerAds ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Active Ban Alert Notice if user is banned */}
          {(isAccountBanned || isLiveBanned) && (
            <div className="rounded-2xl border-2 border-red-500 bg-red-950/80 p-3.5 text-white animate-fade-in shadow-xl">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-red-200">
                    {isAccountBanned
                      ? '🚫 खाता ३ दिनको लागि प्रतिबन्धित (Account 3-Day Ban)'
                      : '🚫 २४ घण्टा लाइभ प्रतिबन्ध (Live 24-Hour Ban)'}
                  </h4>
                  <p className="text-[11px] text-zinc-200 mt-1 leading-snug">
                    {isAccountBanned
                      ? currentUser?.accountBanReason || 'लाइभमा बारम्बार १ मिनेटभन्दा बढी मानिस नदेखिएर क्यामेरा खाली छोडेको उल्लङ्घनका कारण तपाईंको खाता ३ दिनको लागि प्रतिबन्धित गरिएको छ।'
                      : 'लाइभ स्ट्रिममा १ मिनेटभन्दा बढी क्यामेरा अगाडि मानिस नदेखिएकाले २४ घण्टाका लागि लाइभ बस्न प्रतिबन्ध गरिएको छ।'}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-red-300 font-mono">
                      फुकुवा हुने मिति:{' '}
                      {new Date(
                        (isAccountBanned ? currentUser?.accountBannedUntil : currentUser?.liveBannedUntil) || ''
                      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await resetUserBans();
                      }}
                      className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/20 px-2 py-1 text-[10px] font-black text-white flex items-center gap-1 active:scale-95"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      <span>परिक्षणका लागि फुकुवा (Test Unban)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Start Live Action Button */}
        <div className="border-t border-white/10 px-5 py-4">
          {(isAccountBanned || isLiveBanned) && (
            <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-200 flex items-center justify-between gap-2">
              <span>⚠️ क्यामेरा प्रतिबन्ध सक्रिय छ।</span>
              <button
                type="button"
                onClick={() => resetUserBans && resetUserBans()}
                className="rounded-lg bg-amber-500 hover:bg-amber-400 px-2 py-1 text-[11px] font-bold text-black cursor-pointer shadow"
              >
                फुकुवा गर्नुहोस्
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white shadow-xl transition-all bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 hover:from-rose-600 hover:to-pink-700 active:scale-[0.98] cursor-pointer"
          >
            <Radio className="h-5 w-5 animate-pulse" />
            <span>
              {isAccountBanned || isLiveBanned
                ? 'प्रतिबन्ध फुकुवा गरी लाइभ सुरु गर्नुहोस् (Unban & Go LIVE)'
                : 'लाइभ सुरु गर्नुहोस् (Go LIVE)'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
