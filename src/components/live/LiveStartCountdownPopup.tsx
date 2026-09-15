import React, { useState, useEffect, useRef } from 'react';
import { Radio, Mic, Video as VideoIcon, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { LiveRoom } from '../../types';
import { liveAudio } from '../../utils/liveAudio';

interface LiveStartCountdownPopupProps {
  isOpen: boolean;
  room: LiveRoom | null;
  onComplete: (room: LiveRoom) => void;
  onCancel: () => void;
}

export const LiveStartCountdownPopup: React.FC<LiveStartCountdownPopupProps> = ({
  isOpen,
  room,
  onComplete,
  onCancel,
}) => {
  const [count, setCount] = useState<3 | 2 | 1 | 0>(3);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const isCompletedRef = useRef<boolean>(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const roomRef = useRef(room);
  roomRef.current = room;

  const clearAllTimers = () => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  };

  const handleInstantLaunch = () => {
    const targetRoom = roomRef.current || room;
    if (!targetRoom || isCompletedRef.current) return;
    isCompletedRef.current = true;
    clearAllTimers();
    try {
      liveAudio.playLiveStartFanfare();
    } catch {}
    onCompleteRef.current(targetRoom);
  };

  // Bind local media stream to preview video element if available
  useEffect(() => {
    if (!isOpen || !room) return;
    const stream = room.localMediaStream;
    if (stream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
      videoPreviewRef.current.play().catch(() => {});
    }
  }, [isOpen, room]);

  // Handle 3 -> 2 -> 1 -> LIVE countdown sequence with audio ticks and confetti
  useEffect(() => {
    if (!isOpen || !room) {
      setCount(3);
      setIsLiveActive(false);
      clearAllTimers();
      isCompletedRef.current = false;
      return;
    }

    clearAllTimers();
    isCompletedRef.current = false;

    // Step 1: Count 3
    setCount(3);
    setIsLiveActive(false);
    try {
      liveAudio.playCountdownTick(3);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(80);
    } catch {}

    // Step 2: Transition to 2 after 700ms
    const t2 = setTimeout(() => {
      setCount(2);
      try {
        liveAudio.playCountdownTick(2);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(80);
      } catch {}
    }, 700);
    timersRef.current.push(t2);

    // Step 3: Transition to 1 after 1400ms
    const t1 = setTimeout(() => {
      setCount(1);
      try {
        liveAudio.playCountdownTick(1);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(90);
      } catch {}
    }, 1400);
    timersRef.current.push(t1);

    // Step 4: Transition to 0 (LIVE NOW) after 2100ms
    const t0 = setTimeout(() => {
      setCount(0);
      setIsLiveActive(true);
      try {
        liveAudio.playLiveStartFanfare();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([100, 50, 200]);
      } catch {}

      // Fire festive confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      // Step 5: Automatically launch live room after brief fanfare display
      const tFinish = setTimeout(() => {
        if (!isCompletedRef.current) {
          isCompletedRef.current = true;
          const target = roomRef.current || room;
          if (target) {
            onCompleteRef.current(target);
          }
        }
      }, 500);
      timersRef.current.push(tFinish);
    }, 2100);
    timersRef.current.push(t0);

    return () => {
      clearAllTimers();
    };
  }, [isOpen, room?.id]);

  if (!isOpen || !room) return null;

  return (
    <div
      id="live-start-countdown-popup"
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 select-none animate-fade-in"
    >
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-500/20 rounded-full blur-2xl" />
      </div>

      {/* Main Popup Modal Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-rose-500/40 bg-zinc-950/95 p-6 text-center text-white shadow-[0_0_80px_rgba(244,63,94,0.4)] animate-scale-up">
        
        {/* Top Cancel Button */}
        {!isLiveActive && (
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-4 right-4 rounded-full bg-zinc-900/80 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer border border-white/10"
            title="रद्द गर्नुहोस् (Cancel)"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Stream Type Pill */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-3.5 py-1 text-[11px] font-black text-rose-300 uppercase tracking-wider mb-5">
          {room.type === 'voice' ? (
            <>
              <Mic className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              <span>🎙️ पार्टी लाइभ ({room.voiceSeatCount} सिट)</span>
            </>
          ) : (
            <>
              <VideoIcon className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
              <span>📹 भिडियो क्यामेरा लाइभ</span>
            </>
          )}
        </div>

        {/* Central Circular Stage (Camera Preview or Avatar + Glowing Animated Countdown Number) */}
        <div className="relative mx-auto my-2 flex items-center justify-center">
          
          {/* Pulsing outer rings */}
          <div className="absolute -inset-4 rounded-full bg-rose-500/30 blur-xl animate-ping" />
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 animate-spin opacity-75 blur-xs" />

          {/* Center container */}
          <div className="relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border-4 border-white/80 bg-zinc-900 shadow-[0_0_50px_rgba(244,63,94,0.8)]">
            
            {/* Live Camera preview or Host Avatar in background - High clarity */}
            {room.type === 'video' && room.localMediaStream ? (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover -scale-x-100 opacity-90 filter brightness-105"
              />
            ) : (
              <img
                src={room.host.avatarUrl}
                alt={room.host.displayName}
                className="absolute inset-0 h-full w-full object-cover opacity-90 filter brightness-105"
              />
            )}

            {/* Subtle radial tint overlay for text legibility without obscuring the face */}
            <div className="absolute inset-0 bg-black/35" />

            {/* Dynamic Countdown Number (3, 2, 1) or LIVE Icon (0) */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              {count > 0 ? (
                <span
                  key={count}
                  className="text-8xl font-black tracking-tighter text-white drop-shadow-[0_4px_20px_rgba(244,63,94,0.9)] animate-bounce"
                >
                  {count}
                </span>
              ) : (
                <div className="flex flex-col items-center animate-scale-up">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 shadow-[0_0_30px_rgba(244,63,94,1)] border-2 border-white">
                    <Radio className="h-8 w-8 text-white animate-pulse" />
                  </div>
                  <span className="mt-2 text-xs font-black tracking-widest text-rose-300 uppercase bg-black/70 px-2 py-0.5 rounded-full border border-rose-500/40">
                    LIVE!
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Countdown Sub-Status & Room Title */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <h3 className="text-base font-black text-white">
              {count > 0 ? (
                <span>{count} सेकेन्डमा लाइभ सुरु हुँदैछ...</span>
              ) : (
                <span className="text-rose-400">🔴 प्रत्यक्ष प्रसारण सुरु भयो!</span>
              )}
            </h3>
          </div>

          <p className="text-xs font-bold text-zinc-300 line-clamp-1 px-4">
            "{room.title}"
          </p>

          <p className="text-[11px] text-zinc-400">
            {count > 0
              ? 'तयार हुनुहोस्! दर्शकहरूलाई तपाईंको लाइभ स्ट्रिम सिफारिस गरिँदैछ...'
              : 'तपाईं अहिले अन-एयर हुनुहुन्छ, शुभकामना! 🚀'}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-center gap-2">
          {count > 0 ? (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-white/15 py-2.5 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
              >
                ✕ रद्द (Cancel)
              </button>
              <button
                type="button"
                onClick={handleInstantLaunch}
                className="flex-1 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95 border border-white/20 flex items-center justify-center gap-1"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>तुरुन्त सुरु (Start Now)</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1 text-xs font-black text-rose-400 animate-pulse">
              <Sparkles className="h-4 w-4" />
              <span>प्रसारण कोठा खुल्दैछ...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
