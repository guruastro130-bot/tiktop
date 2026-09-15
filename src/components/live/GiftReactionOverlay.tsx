import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Crown, Sparkles, Flame, Coins, Shield, Heart, Trophy, Zap, Gift as GiftIcon } from 'lucide-react';
import { LiveGift } from '../../types';
import { liveAudio } from '../../utils/liveAudio';
import { toNepaliDigits } from '../../utils/luckyGiftEngine';

export interface GiftReactionData {
  gift: LiveGift;
  senderName: string;
  senderAvatar?: string;
  recipientName: string;
  recipientAvatar?: string;
  multiplier?: number;
  comboCount?: number;
  totalCoins: number;
  key?: number;
  luckyOutcome?: {
    isWin: boolean;
    winCoins: number;
    multiplierLabel: string;
    receiverPoints: number;
    messageNp?: string;
    tier: string;
  };
}

/**
 * Tiers based strictly on user specifications:
 * - Tier 1: < 1K coins (< 1,000) -> 1.0 second duration (१ second मात्र)
 * - Tier 2: 1K to 2K coins (1,000 - 2,000) -> 3.0 seconds duration (३ second)
 * - Tier 3: 2K to 10K coins (2,001 - 9,999) -> 4.5 seconds 3D React
 * - Tier 4: 10K to 50K coins (10,000 - 49,999) -> 6.5 seconds 3D Grand + Coin Rain
 * - Tier 5: 50K+ coins (50,000+) -> 8.5 seconds Mega Theatrical Takeover + Interactive Coin Shower
 */
export function getGiftTier(coins: number): 1 | 2 | 3 | 4 | 5 {
  if (coins >= 50000) return 5;
  if (coins >= 10000) return 4;
  if (coins > 2000) return 3;
  if (coins >= 1000) return 2;
  return 1;
}

export function getGiftDuration(coins: number): number {
  if (coins < 1000) return 1000;  // 1K भन्दा सानो: १ second मात्र
  if (coins <= 2000) return 3000; // 2K सम्मको Gift: ३ second
  if (coins < 10000) return 4500; // 2K माथि: 4.5s 3D React
  if (coins < 50000) return 6500; // 10K माथि: 6.5s 3D Show + Coin Rain
  return 8500;                    // 50K+ Mega: 8.5s Theatrical Spectacle + Activity
}

interface FallingCoinItem {
  id: number;
  leftPercent: number;
  delayMs: number;
  durationSec: number;
  amount: number;
  icon: string;
  isCollected: boolean;
}

interface GiftReactionOverlayProps {
  reaction: GiftReactionData | null;
  onFinished?: () => void;
  onCollectCoinDrop?: (amount: number) => void;
  onCheerSend?: () => void;
}

export const GiftReactionOverlay: React.FC<GiftReactionOverlayProps> = ({
  reaction,
  onFinished,
  onCollectCoinDrop,
  onCheerSend,
}) => {
  const [phase, setPhase] = useState<'enter' | 'active' | 'exit'>('enter');
  const [fallingCoins, setFallingCoins] = useState<FallingCoinItem[]>([]);
  const [collectedTotal, setCollectedTotal] = useState<number>(0);
  const [collectedToast, setCollectedToast] = useState<string | null>(null);
  const [comboPulse, setComboPulse] = useState(false);
  const prevReactionKeyRef = useRef<number | string | null>(null);

  // Initialize interactive falling coin shower for mega gifts (Tier 4 & 5)
  useEffect(() => {
    if (!reaction) {
      setFallingCoins([]);
      setCollectedTotal(0);
      setCollectedToast(null);
      return;
    }

    const tier = getGiftTier(reaction.totalCoins);

    // If Tier 4 or Tier 5, generate interactive falling coin chests
    if (tier >= 4) {
      const count = tier === 5 ? 10 : 6;
      const items: FallingCoinItem[] = Array.from({ length: count }, (_, idx) => {
        const amounts = [5, 10, 15, 20, 25, 50];
        const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
        const icons = ['🪙', '🧧', '💎', '🎁'];
        return {
          id: Date.now() + idx,
          leftPercent: 8 + Math.floor((idx / count) * 80) + (Math.random() * 8 - 4),
          delayMs: idx * (tier === 5 ? 450 : 600),
          durationSec: 4.5 + Math.random() * 1.5,
          amount: randomAmount,
          icon: icons[idx % icons.length],
          isCollected: false,
        };
      });
      setFallingCoins(items);
      setCollectedTotal(0);
    } else {
      setFallingCoins([]);
    }
  }, [reaction?.gift.id, reaction?.totalCoins]);

  // Main reaction timing engine
  useEffect(() => {
    if (!reaction) return;

    const coins = reaction.totalCoins;
    const tier = getGiftTier(coins);
    // Lucky Gift with cashback: "बढीमा 5 secend मात्र Show गर्ने" (max 5.0 seconds)
    const durationMs = reaction.luckyOutcome?.isWin
      ? 5000
      : getGiftDuration(coins);

    // Audio cue matching tier
    liveAudio.playGiftTierSound(
      tier === 5 ? 4 : (tier as 1 | 2 | 3 | 4),
      reaction.gift.animation
    );

    // Confetti based on tier
    if (tier === 2) {
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.65 },
        colors: ['#fbbf24', '#f43f5e', '#ffffff'],
      });
    } else if (tier === 3) {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#fbbf24', '#f59e0b', '#ec4899', '#ffffff'],
      });
    } else if (tier >= 4) {
      const end = Date.now() + (tier === 5 ? 3000 : 1800);
      const interval = setInterval(() => {
        if (Date.now() > end) {
          clearInterval(interval);
          return;
        }
        confetti({
          startVelocity: 35,
          spread: 360,
          ticks: 60,
          origin: { x: Math.random(), y: Math.random() * 0.45 },
          colors: ['#ffd700', '#ffae00', '#ff4500', '#ffffff', '#38bdf8'],
        });
      }, 400);
    }

    // Trigger combo pulse if key updated
    setComboPulse(true);
    const pulseTimer = setTimeout(() => setComboPulse(false), 300);

    // Smooth entry
    setPhase('enter');
    const enterDelay = tier === 1 ? 40 : 100;
    const enterTimer = setTimeout(() => setPhase('active'), enterDelay);

    // Exit phase (start before end)
    const exitLeadMs = tier === 1 ? 180 : 350;
    const exitTimer = setTimeout(() => {
      setPhase('exit');
    }, Math.max(0, durationMs - exitLeadMs));

    // Finish callback
    const finishTimer = setTimeout(() => {
      onFinished?.();
    }, durationMs);

    return () => {
      clearTimeout(pulseTimer);
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [reaction?.gift.id, reaction?.totalCoins, reaction?.multiplier, reaction?.comboCount, onFinished]);

  if (!reaction) return null;

  const {
    gift,
    senderName,
    senderAvatar,
    recipientName,
    multiplier = 1,
    comboCount = 1,
    totalCoins,
    luckyOutcome,
  } = reaction;

  const tier = getGiftTier(totalCoins);
  const effectiveMultiplier = Math.max(multiplier, comboCount);

  // Handle user tapping on falling coin drop (Interactive Activity)
  const handleCollectCoin = (coinItem: FallingCoinItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (coinItem.isCollected) return;

    // Mark as collected
    setFallingCoins(prev =>
      prev.map(c => (c.id === coinItem.id ? { ...c, isCollected: true } : c))
    );

    // Sound and particle burst
    liveAudio.playGiftSound('like');
    confetti({
      particleCount: 20,
      spread: 60,
      origin: { x: coinItem.leftPercent / 100, y: 0.5 },
      colors: ['#ffd700', '#f59e0b', '#ffffff'],
    });

    // Notify parent to add real coins to user balance
    onCollectCoinDrop?.(coinItem.amount);
    setCollectedTotal(prev => prev + coinItem.amount);
    setCollectedToast(`+${coinItem.amount} Coins संकलन भयो! 🎉`);
    setTimeout(() => setCollectedToast(null), 1800);
  };

  // =========================================================================
  // TIER 1: सानो उपहार (< 1K / 1,000 Coins) - Exactly 1.0 Second Duration
  // "1K भन्दा सानो gift मा Popup १ second मात्र"
  // Clean, sleek, non-intrusive floating pill at bottom-left
  // =========================================================================
  if (tier === 1) {
    return (
      <div className="pointer-events-none absolute inset-x-3 bottom-24 z-40 flex items-center justify-start select-none">
        <div
          className={`flex items-center gap-2 rounded-full border border-amber-400/40 bg-zinc-950/85 px-3 py-1 shadow-lg backdrop-blur-md transition-all duration-200 ${
            phase === 'enter'
              ? '-translate-x-12 opacity-0 scale-95'
              : phase === 'exit'
              ? '-translate-x-8 opacity-0 scale-95'
              : 'translate-x-0 opacity-100 scale-100'
          }`}
        >
          {/* Sender Avatar */}
          <div className="relative h-6 w-6 shrink-0 rounded-full border border-amber-400/70 overflow-hidden shadow-xs">
            <img
              src={senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt={senderName}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Compact Gift Details */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-amber-300 max-w-[90px] truncate">{senderName}</span>
            <span className="text-[10px] text-zinc-300">➔</span>
            {gift.imageUrl ? (
              <img src={gift.imageUrl} alt={gift.nameNp} className="h-5 w-5 object-cover rounded-full border border-amber-400/50" />
            ) : (
              <span className="text-base">{gift.icon}</span>
            )}
            <span className="font-bold text-white text-[11px]">{gift.nameNp}</span>
          </div>

          {/* Combo Multiplier Pill (Bouncy punch on combo tap) */}
          {effectiveMultiplier > 1 && (
            <span
              className={`rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-1.5 py-0.2 text-[9.5px] font-black text-white shadow-xs transition-transform duration-200 ${
                comboPulse ? 'scale-125 ring-2 ring-yellow-300' : 'scale-100'
              }`}
            >
              x{effectiveMultiplier}
            </span>
          )}

          {/* Total Coin Badge OR Lucky Cashback ("Lucky coins +100 लेखेर देखाउनु पर्दैन ... १६५ Case back") */}
          {luckyOutcome ? (
            luckyOutcome.isWin ? (
              <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 px-2 py-0.5 text-[10px] font-black text-black shadow-md border border-amber-300 animate-pulse">
                <span>🎉</span>
                <span>{toNepaliDigits(totalCoins + luckyOutcome.winCoins)} Case back</span>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-zinc-300">
                <span>🍀 लक्की</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9.5px] font-black text-amber-300 border border-amber-400/20">
              <Coins className="h-2.5 w-2.5" />
              <span>+{totalCoins}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // TIER 2: मध्यम उपहार (1,000 - 2,000 Coins) - Exactly 3.0 Seconds Duration
  // "सो भन्दा माथिको 2K सम्मको Gift मा ३ second"
  // 3D elevated floating VIP Card with gold glow and 3D depth
  // =========================================================================
  if (tier === 2) {
    return (
      <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center p-4 select-none [perspective:1000px]">
        {/* Ambient Subtle Warm Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

        <div
          className={`relative flex flex-col items-center space-y-2.5 transition-all duration-300 [transform-style:preserve-3d] ${
            phase === 'enter'
              ? 'scale-70 opacity-0 -translate-y-4'
              : phase === 'exit'
              ? 'scale-90 opacity-0 -translate-y-6'
              : 'scale-100 opacity-100 translate-y-0'
          }`}
          style={{
            transform: phase === 'active' ? 'perspective(1000px) rotateX(4deg) translateZ(20px)' : undefined,
          }}
        >
          {/* 3D Elevated Center Gift Icon with Orbital Aura */}
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-amber-400/25 to-rose-500/25 blur-xl animate-pulse" />
            <div className="absolute -inset-2 rounded-full border border-amber-400/50 animate-spin-slow" />

            {gift.imageUrl ? (
              <img
                src={gift.imageUrl}
                alt={gift.nameNp}
                className="relative h-16 w-16 object-cover rounded-2xl border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)] animate-bounce"
              />
            ) : (
              <span className="relative text-5xl filter drop-shadow-[0_0_20px_rgba(251,191,36,0.8)] animate-bounce">
                {gift.icon}
              </span>
            )}

            <span className="absolute -top-2 -right-2 text-sm animate-pulse">✨</span>
          </div>

          {/* 3D Floating VIP Capsule */}
          <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-r from-zinc-950/95 via-amber-950/80 to-zinc-950/95 px-5 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.85)] backdrop-blur-xl ring-1 ring-amber-400/40 max-w-xs">
            <div className="relative h-9 w-9 shrink-0 rounded-full border-2 border-amber-400 overflow-hidden shadow">
              <img
                src={senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt={senderName}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-xs font-black text-amber-300 truncate max-w-[110px]">{senderName}</p>
                <span className="text-[10px] text-zinc-300 font-medium">➔ @{recipientName}</span>
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-sm font-black text-white">{gift.nameNp}</p>
                {effectiveMultiplier > 1 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-black text-white shadow">
                    x{effectiveMultiplier}
                  </span>
                )}
              </div>

              {luckyOutcome?.isWin ? (
                <div className="flex items-center gap-1 text-[11px] text-amber-300 font-black mt-0.5 animate-pulse">
                  <span>🎉 {toNepaliDigits(totalCoins + luckyOutcome.winCoins)} Case back</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10.5px] text-amber-400 font-black mt-0.5">
                  <Coins className="h-3 w-3" />
                  <span>+{totalCoins.toLocaleString()} Coins (३s VIP React)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TIER 3: ठूलो शाही उपहार (2,001 - 9,999 Coins) - 4.5 Seconds 3D React
  // "जति ठूलो gifts त्यति लामो समय 3D मा React गर्ने"
  // Dynamic 3D perspective stage, rotating god-rays, royal banner
  // =========================================================================
  if (tier === 3) {
    return (
      <div className="pointer-events-none absolute inset-0 z-40 flex flex-col justify-between p-3 select-none [perspective:1200px] overflow-hidden">
        {/* Ambient 3D Rotating Light Rays */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
          <div className="w-[450px] h-[450px] rounded-full bg-[conic-gradient(from_0deg,_#fbbf24_0deg,_transparent_30deg,_#f59e0b_60deg,_transparent_90deg,_#fbbf24_120deg,_transparent_150deg,_#f59e0b_180deg,_transparent_210deg,_#fbbf24_240deg,_transparent_270deg,_#f59e0b_300deg,_transparent_330deg,_#fbbf24_360deg)] animate-god-ray blur-sm" />
        </div>

        {/* Top VIP Marquee */}
        <div
          className={`relative z-10 mx-auto w-full max-w-sm transition-all duration-300 ${
            phase === 'enter'
              ? '-translate-y-12 opacity-0'
              : phase === 'exit'
              ? '-translate-y-8 opacity-0'
              : 'translate-y-0 opacity-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-950 via-yellow-700 to-amber-950 px-3.5 py-1.5 shadow-xl backdrop-blur-xl text-center">
            <Crown className="h-3.5 w-3.5 text-amber-200 animate-bounce" />
            <p className="text-[11px] font-black text-white">
              <span className="text-yellow-300">{senderName}</span> showered{' '}
              <span className="text-yellow-300">@{recipientName}</span> with{' '}
              <span className="underline decoration-amber-400">{gift.nameNp}</span>!
            </p>
            <Sparkles className="h-3.5 w-3.5 text-amber-200 animate-spin-slow" />
          </div>
        </div>

        {/* 3D Centerpiece Showcase */}
        <div className="relative flex flex-1 items-center justify-center my-auto [transform-style:preserve-3d]">
          <div
            className={`relative flex flex-col items-center transition-all duration-400 ${
              phase === 'enter'
                ? 'scale-50 opacity-0 rotate-12'
                : phase === 'exit'
                ? 'scale-90 opacity-0 -translate-y-8'
                : 'scale-100 opacity-100'
            }`}
            style={{
              transform: 'perspective(1000px) rotateY(-8deg) rotateX(6deg) translateZ(30px)',
            }}
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-8 bg-amber-400/30 rounded-full blur-2xl animate-ping" />
              <div className="absolute -inset-4 border-2 border-amber-300/70 rounded-full animate-spin-slow" />

              {gift.imageUrl ? (
                <img
                  src={gift.imageUrl}
                  alt={gift.nameNp}
                  className="h-24 w-24 object-cover rounded-2xl border-3 border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.9)] animate-bounce"
                />
              ) : (
                <span className="text-7xl filter drop-shadow-[0_0_35px_rgba(251,191,36,0.9)] animate-bounce">
                  {gift.icon}
                </span>
              )}
            </div>

            <div className="mt-3 rounded-full bg-gradient-to-r from-amber-600 to-yellow-500 px-4 py-1 border border-white shadow-lg">
              <span className="text-xs font-black text-zinc-950 uppercase tracking-wide">
                ✨ {gift.emotionTag || 'भव्य शाही लक्जरी उपहार'} ✨
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Sender Card */}
        <div
          className={`relative z-10 mx-auto w-full max-w-xs transition-all duration-300 mb-16 ${
            phase === 'enter'
              ? 'translate-y-12 opacity-0'
              : phase === 'exit'
              ? 'translate-y-8 opacity-0'
              : 'translate-y-0 opacity-100'
          }`}
        >
          <div className="flex items-center justify-between rounded-2xl border border-amber-400 bg-zinc-950/90 px-3 py-2 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <img
                src={senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt={senderName}
                className="h-9 w-9 rounded-full border border-amber-400 object-cover"
              />
              <div>
                <p className="text-xs font-black text-amber-300">{senderName}</p>
                <p className="text-[10px] text-zinc-300 font-bold">{gift.nameNp} {effectiveMultiplier > 1 ? `x${effectiveMultiplier}` : ''}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-0.5 text-xs font-black text-amber-400">
                <Coins className="h-3 w-3" />
                <span>+{totalCoins.toLocaleString()}</span>
              </div>
              <span className="text-[8.5px] font-bold text-amber-200">💎 3D STAGE REACT</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TIER 4: भव्य शाही उपहार (10,000 – 49,999 Coins) - 6.5s 3D + Coin Shower Activity
  // "धेरै ठूलो gifts मा Popup मात्रले पुग्दैन .......... थप आकर्षक गतिविधि चाहियो"
  // Helicopter flight, Khukuri slash, Everest summit + Falling Coin Pouches (Tap to Collect)
  // =========================================================================
  if (tier === 4) {
    const isHelicopter = gift.id.includes('helicopter');
    const isKhukuri = gift.animation === 'khukuri' || gift.id.includes('khukuri');
    const isEverest = gift.id.includes('everest');
    const isCar = gift.animation === 'car' || gift.id.includes('car');

    return (
      <div className="absolute inset-0 z-50 flex flex-col justify-between p-3 select-none [perspective:1200px] overflow-hidden pointer-events-auto">
        {/* Amber Stage Glow */}
        <div className="absolute inset-0 border-3 border-amber-400/60 shadow-[inset_0_0_50px_rgba(251,191,36,0.5)] pointer-events-none animate-pulse" />

        {/* Interactive Falling Coin Pouches Rain (कोइन वर्षा) */}
        {fallingCoins.map(coin => (
          <button
            key={coin.id}
            type="button"
            onClick={e => handleCollectCoin(coin, e)}
            disabled={coin.isCollected}
            style={{
              left: `${coin.leftPercent}%`,
              animationDelay: `${coin.delayMs}ms`,
              animationDuration: `${coin.durationSec}s`,
            }}
            className={`absolute top-0 z-50 flex flex-col items-center transition-transform active:scale-125 cursor-pointer animate-float-down ${
              coin.isCollected ? 'opacity-30 scale-75 pointer-events-none' : 'hover:scale-110'
            }`}
            title="ट्याप गरी कोइन लिनुहोस्!"
          >
            <div className="relative flex items-center justify-center">
              <span className="text-3xl filter drop-shadow-[0_0_12px_rgba(251,191,36,1)] animate-bounce">
                {coin.icon}
              </span>
              <span className="absolute -bottom-1 rounded-full bg-amber-400 text-black px-1 py-0.2 text-[8px] font-black shadow ring-1 ring-black">
                +{coin.amount}
              </span>
            </div>
          </button>
        ))}

        {/* Top Royal Marquee + Coin Shower Banner Activity Indicator */}
        <div
          className={`relative z-20 mx-auto w-full max-w-md transition-all duration-400 ${
            phase === 'enter'
              ? '-translate-y-16 opacity-0'
              : phase === 'exit'
              ? '-translate-y-12 opacity-0'
              : 'translate-y-0 opacity-100'
          }`}
        >
          <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-950 via-yellow-700 to-amber-950 p-2 shadow-2xl text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Crown className="h-4 w-4 text-amber-300 animate-bounce" />
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-200">
                👑 शाही उपहार उत्सव • कोइन वर्षा जारी (Tap to Collect) 🪙
              </p>
              <Crown className="h-4 w-4 text-amber-300 animate-bounce" />
            </div>
            <p className="text-xs font-black text-white mt-0.5">
              <span className="text-yellow-300">{senderName}</span> showered{' '}
              <span className="text-yellow-300">@{recipientName}</span> with{' '}
              <span className="underline decoration-amber-400">{gift.nameNp}</span>!
            </p>
          </div>
        </div>

        {/* Center Themed 3D Visual */}
        <div className="relative flex flex-1 items-center justify-center my-auto [transform-style:preserve-3d] pointer-events-none">
          {/* Helicopter */}
          {isHelicopter && (
            <div className="relative flex flex-col items-center animate-bounce">
              <div className="h-1 w-36 rounded-full bg-white/80 animate-ping mb-1" />
              <span className="text-8xl filter drop-shadow-[0_0_35px_rgba(251,191,36,1)]">🚁</span>
              <p className="text-xs font-black text-amber-300 mt-2 bg-black/80 px-3 py-1 rounded-full border border-amber-400">
                शाही हेलिकप्टर उडान (VIP Luxury Flight) 🚁✨
              </p>
            </div>
          )}

          {/* Gorkha Khukuri */}
          {isKhukuri && (
            <div className="relative flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <span className="text-7xl -rotate-45 transform filter drop-shadow-[0_0_30px_rgba(225,29,72,0.9)] animate-pulse">🗡️</span>
                <span className="text-5xl -mx-3 z-10">⚡</span>
                <span className="text-7xl rotate-45 transform filter drop-shadow-[0_0_30px_rgba(251,191,36,0.9)] animate-pulse">🗡️</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 rounded-full bg-rose-950/90 border-2 border-amber-400 px-4 py-1.5 shadow-2xl">
                <Shield className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-black text-white">वीर गोर्खाली वीरता र शान 🇳🇵⚔️</span>
              </div>
            </div>
          )}

          {/* Mount Everest */}
          {isEverest && (
            <div className="relative flex flex-col items-center">
              <div className="relative">
                <span className="text-8xl filter drop-shadow-[0_0_40px_rgba(255,255,255,0.9)]">🏔️</span>
                <span className="absolute top-2 right-4 text-3xl animate-bounce">🇳🇵</span>
              </div>
              <p className="text-xs font-black text-cyan-200 mt-2 bg-black/85 px-4 py-1.5 rounded-full border border-cyan-400/70 shadow-2xl">
                विश्वको सर्वोच्च शिखर सगरमाथा (Mt. Everest 8848.86m) 🏔️✨
              </p>
            </div>
          )}

          {/* Luxury Car */}
          {isCar && !isHelicopter && (
            <div className="relative flex flex-col items-center">
              <span className="text-8xl filter drop-shadow-[0_0_35px_rgba(244,63,94,0.9)] animate-pulse">🏎️</span>
              <p className="text-xs font-black text-rose-300 mt-2 bg-black/85 px-4 py-1 rounded-full border border-rose-500/70 shadow">
                लक्जरी कार सुपर ड्राइभ 🏎️💨
              </p>
            </div>
          )}

          {/* Generic Tier 4 */}
          {!isHelicopter && !isKhukuri && !isEverest && !isCar && (
            <div className="relative flex flex-col items-center">
              {gift.imageUrl ? (
                <img src={gift.imageUrl} alt={gift.nameNp} className="h-28 w-28 object-cover rounded-2xl border-2 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.9)] animate-bounce" />
              ) : (
                <span className="text-8xl filter drop-shadow-[0_0_35px_rgba(251,191,36,0.9)] animate-bounce">{gift.icon}</span>
              )}
              <p className="text-xs font-black text-amber-300 mt-2 bg-black/80 px-3 py-1 rounded-full border border-amber-400">
                {gift.emotionTag || 'भव्य शाही लक्जरी उपहार'}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Floating Interactive Actions: Audience Cheer & Collection Toast */}
        <div className="relative z-30 mx-auto w-full max-w-sm flex items-center justify-between gap-2 mb-16 pointer-events-auto">
          {/* Collected Coin indicator */}
          <div className="flex items-center gap-1.5 rounded-full bg-black/80 border border-amber-400/50 px-3 py-1.5 text-xs text-amber-300 backdrop-blur-md">
            <Coins className="h-3.5 w-3.5 text-amber-400 animate-spin-slow" />
            <span className="font-bold">तपाईंले संकलन: +{collectedTotal}</span>
          </div>

          {/* Audience Cheer Button (Activity!) */}
          <button
            type="button"
            onClick={() => {
              onCheerSend?.();
              confetti({
                particleCount: 30,
                spread: 70,
                origin: { x: 0.85, y: 0.85 },
                colors: ['#ffd700', '#f43f5e', '#38bdf8'],
              });
              liveAudio.playGiftSound('like');
            }}
            className="flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 px-3.5 py-1.5 text-xs font-black text-white shadow-xl active:scale-95 transition-all cursor-pointer border border-white/40"
          >
            <span>🎉</span>
            <span>बधाई / Cheers!</span>
          </button>
        </div>

        {/* Floating toast notification when user taps a coin */}
        {collectedToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] rounded-full bg-amber-400 px-4 py-1 text-xs font-black text-black shadow-2xl animate-bounce">
            {collectedToast}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // TIER 5: अति विशेष सर्वोच्च सम्राट उपहार (50,000+ Coins) - 8.5s Takeover
  // "धेरै ठूलो gifts मा Popup मात्रले पुग्दैन .......... थप आकर्षक गतिविधि चाहियो"
  // Golden Lion 🦁 250k, Royal Crown 👑 100k, Racing Supercar 🏎️ 50k
  // FULL-THEATRE 3D TAKEOVER + SCREEN RUMBLE + INTERACTIVE COIN SHOWER (10 CHESTS) + CHEERS TAP
  // =========================================================================
  const isLion = gift.animation === 'lion' || gift.id.includes('lion');
  const isCrown = gift.animation === 'crown' || gift.id.includes('crown');

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between p-3 select-none [perspective:1400px] overflow-hidden pointer-events-auto">
      {/* 1. Cinematic Dimmed Stage Backdrop */}
      <div className="absolute inset-0 bg-black/80 pointer-events-none transition-opacity duration-500" />

      {/* 2. Screen Rumble Frame on Entrance (Camera Shake Effect) */}
      <div className="absolute inset-0 border-4 border-yellow-300 shadow-[inset_0_0_80px_rgba(253,224,71,0.8)] pointer-events-none animate-rumble" />

      {/* 3. Volumetric 3D God-Rays Rotating in Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
        <div className="w-[600px] h-[600px] rounded-full bg-[conic-gradient(from_0deg,_#ffd700_0deg,_transparent_30deg,_#ff8c00_60deg,_transparent_90deg,_#ffd700_120deg,_transparent_150deg,_#ff8c00_180deg,_transparent_210deg,_#ffd700_240deg,_transparent_270deg,_#ff8c00_300deg,_transparent_330deg,_#ffd700_360deg)] animate-god-ray blur-md" />
      </div>

      {/* 4. Interactive Falling Golden Coin Pouches (१० वटा थैलीहरूको कोइन वर्षा) */}
      {fallingCoins.map(coin => (
        <button
          key={coin.id}
          type="button"
          onClick={e => handleCollectCoin(coin, e)}
          disabled={coin.isCollected}
          style={{
            left: `${coin.leftPercent}%`,
            animationDelay: `${coin.delayMs}ms`,
            animationDuration: `${coin.durationSec}s`,
          }}
          className={`absolute top-0 z-50 flex flex-col items-center transition-transform active:scale-125 cursor-pointer animate-float-down ${
            coin.isCollected ? 'opacity-30 scale-75 pointer-events-none' : 'hover:scale-110'
          }`}
          title="ट्याप गरी कोइन लिनुहोस्!"
        >
          <div className="relative flex items-center justify-center">
            <span className="text-4xl filter drop-shadow-[0_0_15px_rgba(255,215,0,1)] animate-bounce">
              {coin.icon}
            </span>
            <span className="absolute -bottom-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-1.5 py-0.2 text-[9px] font-black shadow ring-1 ring-black">
              +{coin.amount}
            </span>
          </div>
        </button>
      ))}

      {/* 5. Top Supreme Emperor Marquee */}
      <div
        className={`relative z-20 mx-auto w-full max-w-md transition-all duration-500 ${
          phase === 'enter'
            ? '-translate-y-20 opacity-0 scale-90'
            : phase === 'exit'
            ? '-translate-y-16 opacity-0'
            : 'translate-y-0 opacity-100 scale-100'
        }`}
      >
        <div className="rounded-2xl border-2 border-yellow-300 bg-gradient-to-r from-red-950 via-amber-600 to-red-950 p-2.5 shadow-[0_0_40px_rgba(251,191,36,0.9)] text-center">
          <div className="flex items-center justify-center gap-2">
            <Flame className="h-4 w-4 text-yellow-200 fill-yellow-400 animate-pulse" />
            <p className="text-xs font-black uppercase tracking-widest text-yellow-200 drop-shadow">
              🔥👑 SUPREME EMPEROR TAKEOVER 👑🔥
            </p>
            <Flame className="h-4 w-4 text-yellow-200 fill-yellow-400 animate-pulse" />
          </div>
          <p className="text-sm font-black text-white mt-0.5">
            <span className="text-yellow-300 font-extrabold">{senderName}</span> ले{' '}
            <span className="text-yellow-300 font-extrabold">@{recipientName}</span> लाई{' '}
            <span className="text-white underline decoration-yellow-300">{gift.nameNp}</span> अर्पण गर्नुभयो!
          </p>
        </div>
      </div>

      {/* 6. Center 3D Cinematic Centerpiece Showcase */}
      <div className="relative z-20 flex flex-1 items-center justify-center my-auto [transform-style:preserve-3d] pointer-events-none">
        {/* GOLDEN LION SHOWCASE (गोल्डेन सिंह 🦁 250,000 Coins) */}
        {isLion && (
          <div className="relative flex flex-col items-center text-center">
            {/* Shockwave Rings */}
            <div className="absolute -inset-16 rounded-full border-4 border-yellow-400/40 animate-ping" style={{ animationDuration: '1.4s' }} />
            <div className="absolute -inset-8 rounded-full border-2 border-amber-300/60 animate-pulse" />
            <div className="absolute -inset-20 bg-gradient-to-r from-yellow-500/25 via-red-600/20 to-yellow-500/25 blur-3xl animate-pulse" />

            <span className="text-4xl animate-bounce mb-1">👑</span>

            <div className="relative">
              <span className="text-9xl filter drop-shadow-[0_0_50px_rgba(255,215,0,1)] animate-pulse">
                🦁
              </span>
              <span className="absolute -bottom-2 -right-2 text-3xl">🔥</span>
              <span className="absolute -bottom-2 -left-2 text-3xl">🔥</span>
            </div>

            <div className="mt-3 rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 px-6 py-2 shadow-[0_0_30px_rgba(251,191,36,1)] border-2 border-white">
              <h3 className="text-sm font-black text-zinc-950 uppercase tracking-wide">
                सर्वोच्च सम्राट गोल्डेन सिंह (Supreme Emperor Lion)
              </h3>
            </div>
            <p className="text-xs font-black text-yellow-200 mt-1 drop-shadow">
              ⚡ २५०,००० कोइन्स शाही सम्मान • कोइन वर्षा जारी ⚡
            </p>
          </div>
        )}

        {/* ROYAL CROWN SHOWCASE (शाही सुनौलो मुकुट 👑 100,000 Coins) */}
        {isCrown && !isLion && (
          <div className="relative flex flex-col items-center text-center">
            <div className="absolute -inset-14 bg-gradient-to-t from-yellow-400/30 via-amber-200/20 to-transparent rounded-full blur-3xl animate-pulse" />
            <div className="flex items-center gap-2">
              <span className="text-4xl animate-pulse">🪽</span>
              <span className="text-9xl filter drop-shadow-[0_0_50px_rgba(255,215,0,1)] animate-bounce">
                👑
              </span>
              <span className="text-4xl animate-pulse">🪽</span>
            </div>

            <div className="mt-3 rounded-full bg-gradient-to-r from-yellow-500 via-amber-200 to-yellow-500 px-6 py-2 shadow-2xl border-2 border-white">
              <h3 className="text-sm font-black text-zinc-950 uppercase tracking-wider">
                शाही सुनौलो मुकुट (Royal Imperial Crown)
              </h3>
            </div>
            <p className="text-xs font-black text-yellow-200 mt-1 drop-shadow">
              💎 १००,००० कोइन्स शाही सम्मान 💎
            </p>
          </div>
        )}

        {/* RACING SPORTS CAR SHOWCASE (रेसिङ स्पोर्ट्स कार 🏎️ 50,000 Coins) */}
        {!isLion && !isCrown && (
          <div className="relative flex flex-col items-center text-center">
            <div className="absolute -inset-12 bg-rose-600/25 rounded-full blur-3xl animate-pulse" />
            <div className="flex items-center gap-3">
              <span className="text-4xl animate-pulse">💨</span>
              <span className="text-9xl filter drop-shadow-[0_0_45px_rgba(244,63,94,1)] animate-bounce">
                🏎️
              </span>
              <span className="text-4xl animate-pulse">🔥</span>
            </div>

            <div className="mt-3 rounded-full bg-gradient-to-r from-rose-600 via-pink-500 to-rose-600 px-6 py-2 shadow-2xl border-2 border-white">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                सुपर स्पोर्ट्स कार ड्रिफ्ट (Hypercar Drift)
              </h3>
            </div>
            <p className="text-xs font-black text-rose-300 mt-1 drop-shadow">
              🚀 ५०,००० कोइन्स लक्जरी सम्मान 🚀
            </p>
          </div>
        )}
      </div>

      {/* 7. Bottom Supreme Supporter Card & Audience Cheers Interactive Activity */}
      <div
        className={`relative z-30 mx-auto w-full max-w-sm transition-all duration-500 mb-16 space-y-2 pointer-events-auto ${
          phase === 'enter'
            ? 'translate-y-20 opacity-0 scale-90'
            : phase === 'exit'
            ? 'translate-y-16 opacity-0'
            : 'translate-y-0 opacity-100 scale-100'
        }`}
      >
        {/* Supporter Honor Bar */}
        <div className="flex items-center justify-between rounded-2xl border-2 border-yellow-300 bg-zinc-950/95 p-3 shadow-[0_0_35px_rgba(251,191,36,0.8)] backdrop-blur-2xl">
          <div className="flex items-center gap-2.5">
            <div className="relative h-11 w-11 shrink-0 rounded-full border-2 border-yellow-300 overflow-hidden shadow">
              <img
                src={senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt={senderName}
                className="h-full w-full object-cover"
              />
              <span className="absolute -top-1 -right-1 text-xs">👑</span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-black text-yellow-300">{senderName}</p>
                <span className="rounded-full bg-yellow-400 text-zinc-950 px-1.5 py-0.2 text-[8.5px] font-black">
                  TOP GIFTER
                </span>
              </div>
              <p className="text-xs text-white font-bold">{gift.nameNp} {effectiveMultiplier > 1 ? `x${effectiveMultiplier}` : ''}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1 text-sm font-black text-yellow-300">
              <Coins className="h-4 w-4" />
              <span>+{totalCoins.toLocaleString()}</span>
            </div>
            <span className="text-[9px] font-black text-amber-200">💎 DIAMONDS ADDED</span>
          </div>
        </div>

        {/* Live Coin Collection & Audience Cheers Action Bar */}
        <div className="flex items-center justify-between gap-2">
          {/* User's collected coins from rain */}
          <div className="flex items-center gap-1.5 rounded-full bg-black/85 border border-yellow-300/60 px-3 py-1.5 text-xs text-yellow-300 backdrop-blur-md">
            <Coins className="h-3.5 w-3.5 text-yellow-400 animate-spin-slow" />
            <span className="font-bold">बटुलिएको कोइन: +{collectedTotal}</span>
          </div>

          {/* Audience Cheer Button (Interactive Activity!) */}
          <button
            type="button"
            onClick={() => {
              onCheerSend?.();
              confetti({
                particleCount: 50,
                spread: 100,
                origin: { x: 0.85, y: 0.85 },
                colors: ['#ffd700', '#ff0000', '#ffffff', '#38bdf8'],
              });
              liveAudio.playGiftSound('like');
            }}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 hover:brightness-110 px-4 py-2 text-xs font-black text-zinc-950 shadow-[0_0_20px_rgba(251,191,36,0.8)] active:scale-95 transition-all cursor-pointer border border-white"
          >
            <span className="text-sm">🔥</span>
            <span>बधाई / Cheers!</span>
          </button>
        </div>
      </div>

      {/* Floating toast notification when user taps a coin */}
      {collectedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-black text-black shadow-2xl animate-bounce border-2 border-black">
          {collectedToast}
        </div>
      )}
    </div>
  );
};
