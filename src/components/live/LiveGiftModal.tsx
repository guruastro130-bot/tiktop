import React, { useState, useEffect } from 'react';
import { X, Coins, Sparkles, Send, PlusCircle, Heart, Users, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { LiveGift, LiveSeat } from '../../types';
import { LIVE_GIFTS } from '../../data/liveData';
import { liveAudio } from '../../utils/liveAudio';
import { useAuth } from '../../context/AuthContext';
import { LuckyGiftSystem } from '../LuckyGiftSystem';
import { CoinRechargeModal } from '../CoinRechargeModal';

interface LiveGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  seats: LiveSeat[];
  hostName: string;
  hostAvatar?: string;
  onSendGift: (gift: LiveGift, targetSeatIndex?: number) => void;
  initialCategory?: 'all' | 'popular' | 'romantic' | 'greeting' | 'nepal' | 'luxury' | 'lucky';
  initialTargetSeat?: number | 'host' | 'all';
}

export const LiveGiftModal: React.FC<LiveGiftModalProps> = ({
  isOpen,
  onClose,
  seats,
  hostName,
  hostAvatar,
  onSendGift,
  initialCategory = 'all',
  initialTargetSeat = 'host',
}) => {
  const { currentUser, updateUserPoints, updateUserCoins } = useAuth();
  const [selectedGift, setSelectedGift] = useState<LiveGift>(LIVE_GIFTS[0]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'popular' | 'romantic' | 'greeting' | 'nepal' | 'luxury' | 'lucky'>(initialCategory);
  const [selectedTargetSeat, setSelectedTargetSeat] = useState<number | 'host' | 'all'>(initialTargetSeat);
  const [giftMultiplier, setGiftMultiplier] = useState<number>(1);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [floatingDeduction, setFloatingDeduction] = useState<number | null>(null);
  const [showJackpotMachine, setShowJackpotMachine] = useState<boolean>(false);

  const [coinBalance, setCoinBalance] = useState<number>(() => {
    if (currentUser?.coinBalance !== undefined) return currentUser.coinBalance;
    return (currentUser?.points ? Math.floor(currentUser.points / 100) : 5000) || 5000;
  });

  useEffect(() => {
    if (isOpen && initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  useEffect(() => {
    if (isOpen && initialTargetSeat !== undefined) {
      setSelectedTargetSeat(initialTargetSeat);
    }
  }, [isOpen, initialTargetSeat]);

  useEffect(() => {
    if (currentUser?.coinBalance !== undefined) {
      setCoinBalance(currentUser.coinBalance);
    }
  }, [currentUser?.coinBalance]);

  if (!isOpen) return null;

  const filteredGifts = LIVE_GIFTS.filter(g => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'lucky') return g.category === 'lucky' || g.isLucky;
    return g.category === selectedCategory;
  });

  // Calculate occupied recipients count if 'all' seats selected
  const safeSeats = Array.isArray(seats) ? seats : [];
  const occupiedSeats = safeSeats.filter(s => s.user);
  const allRecipientsCount = Math.max(1, (occupiedSeats.length > 0 ? occupiedSeats.length : 1));
  const multiplierFactor = selectedTargetSeat === 'all' ? allRecipientsCount : 1;
  const totalCost = (selectedGift?.coins || 0) * giftMultiplier * multiplierFactor;
  const isInsufficient = coinBalance < totalCost;

  const handleRechargeSuccess = (addedCoins: number, newBalance: number) => {
    setCoinBalance(newBalance);
  };

  const handleSend = () => {
    if (!selectedGift) return;

    if (isInsufficient) {
      setIsRechargeModalOpen(true);
      return;
    }

    // Deduct coins & show floating deduction animation
    const newBal = Math.max(0, coinBalance - totalCost);
    setCoinBalance(newBal);
    if (updateUserCoins) {
      updateUserCoins(newBal);
    }
    if (updateUserPoints) {
      updateUserPoints(-totalCost * 100);
    }

    setFloatingDeduction(totalCost);
    setTimeout(() => setFloatingDeduction(null), 1200);

    // Audio sound mapping
    const anim = selectedGift.animation;
    if (anim === 'kiss' || anim === 'romantic_kiss') {
      liveAudio.playGiftSound('kiss');
    } else if (anim === 'love' || anim === 'miss_you') {
      liveAudio.playGiftSound('love');
    } else if (anim === 'hug' || anim === 'coffee') {
      liveAudio.playGiftSound('hug');
    } else if (anim === 'ring' || anim === 'crown' || anim === 'car' || anim === 'lion') {
      liveAudio.playGiftSound('luxury');
    } else if (anim === 'night') {
      liveAudio.playGiftSound('night');
    } else if (selectedGift.category === 'nepal') {
      liveAudio.playGiftSound('nepal');
    } else {
      liveAudio.playGiftSound('rose');
    }

    if (selectedGift.coins >= 500 || giftMultiplier > 1 || selectedTargetSeat === 'all') {
      confetti({
        particleCount: selectedGift.coins >= 5000 || selectedTargetSeat === 'all' ? 120 : 60,
        spread: 80,
        origin: { y: 0.65 },
      });
    }

    // Send gift to recipient(s)
    if (selectedTargetSeat === 'all') {
      // Send to host and all seated guests
      onSendGift(selectedGift, 0); // Host
      occupiedSeats.forEach(s => {
        if (s.seatIndex !== 0) {
          onSendGift(selectedGift, s.seatIndex);
        }
      });
    } else {
      for (let i = 0; i < Math.min(giftMultiplier, 3); i++) {
        onSendGift(
          selectedGift,
          selectedTargetSeat === 'host' ? 0 : typeof selectedTargetSeat === 'number' ? selectedTargetSeat : 0
        );
      }
    }

    // Record gift transaction to backend
    try {
      fetch('/api/live/send-gift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'user_A',
        },
        body: JSON.stringify({
          creatorId: 'creator_B',
          giftName: selectedGift.name,
          giftPrice: totalCost,
          roomId: 'live_voice_1'
        })
      }).catch(() => {});
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-transparent pointer-events-auto select-none animate-fade-in">
      {/* Transparent upper area so user can see host and tap video to dismiss */}
      <div className="flex-1 w-full cursor-pointer bg-transparent" onClick={onClose} />

      {/* Floating Host Live Glance Pill (Allows gifter to clearly see the Host Face & Live status) */}
      <div className="w-full max-w-lg mx-auto px-4 pb-1.5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 rounded-full bg-black/85 border border-rose-500/50 px-2.5 py-1 backdrop-blur-md shadow-xl pointer-events-auto">
          <div className="relative">
            <img
              src={hostAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt={hostName}
              className="h-6 w-6 rounded-full object-cover border border-rose-500"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-black" />
          </div>
          <span className="text-[11px] font-black text-white truncate max-w-[120px]">
            {hostName}
          </span>
          <span className="flex items-center gap-1 text-[9px] text-rose-300 font-bold bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.2 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
            <span>होस्ट प्रत्यक्ष 🔴</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-black/85 border border-white/20 p-1.5 text-zinc-300 hover:text-white backdrop-blur-md pointer-events-auto shadow-md transition-colors cursor-pointer active:scale-95"
          title="बन्द गर्नुहोस् (Close)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg mx-auto max-h-[35vh] sm:max-h-[38vh] rounded-t-3xl border-t border-amber-500/40 bg-zinc-950/90 p-2.5 sm:p-3 text-white shadow-[0_-10px_35px_rgba(0,0,0,0.85)] space-y-1.5 backdrop-blur-xl flex flex-col overflow-hidden animate-slide-up"
      >
        
        {/* Header with Coin Balance & Quick Recharge */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/25 to-yellow-500/20 border border-amber-500/40 px-2.5 py-0.5 shadow-xs">
              <Coins className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span className="text-xs font-black text-amber-300 font-mono tracking-tight">
                {coinBalance.toLocaleString()} Coins
              </span>

              {/* Floating coin deduction bubble */}
              {floatingDeduction !== null && (
                <span className="absolute -top-3 right-0 -translate-y-1 text-[10px] font-black text-rose-400 bg-black/90 px-1.5 py-0.5 rounded-full border border-rose-500/40 animate-bounce shadow-md">
                  -{floatingDeduction.toLocaleString()} 🪙
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsRechargeModalOpen(true)}
              className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-2.5 py-0.5 text-[10px] font-black shadow-md hover:brightness-110 transition-all active:scale-95 cursor-pointer"
              title="रिचार्ज गर्नुहोस् (Recharge Coins)"
            >
              <PlusCircle className="h-3 w-3 stroke-[2.5]" />
              <span>+ रिचार्ज</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-zinc-800/90 p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Target Recipient Selector (Host, All Seats, or Specific Seated Guest) */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar border-b border-white/10 pb-1.5 shrink-0">
          <span className="text-[9.5px] font-black text-zinc-400 shrink-0">उपहार पाउने:</span>
          
          {/* Host Button */}
          <button
            type="button"
            onClick={() => setSelectedTargetSeat('host')}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold transition-all shrink-0 cursor-pointer ${
              selectedTargetSeat === 'host'
                ? 'bg-amber-500 text-black shadow-md font-black ring-1 ring-amber-300'
                : 'bg-zinc-800 text-zinc-300 border border-white/10 hover:border-white/25'
            }`}
          >
            <span>👑 {hostName} (Host)</span>
          </button>

          {/* All Seats / Multi-seat option */}
          {occupiedSeats.length > 1 && (
            <button
              type="button"
              onClick={() => setSelectedTargetSeat('all')}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold transition-all shrink-0 cursor-pointer ${
                selectedTargetSeat === 'all'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md font-black ring-1 ring-purple-300'
                  : 'bg-zinc-800 text-purple-300 border border-purple-500/30 hover:border-purple-400'
              }`}
              title="सबै सिटहरूमा बसेकाहरूलाई एकै पटक पठाउनुहोस्"
            >
              <Users className="h-3 w-3" />
              <span>🌟 सबै सिट ({occupiedSeats.length})</span>
            </button>
          )}

          {/* Seated Guests */}
          {seats
            .filter(s => s.user && s.seatIndex !== 0)
            .map(s => (
              <button
                key={s.seatIndex}
                type="button"
                onClick={() => setSelectedTargetSeat(s.seatIndex)}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold transition-all shrink-0 cursor-pointer ${
                  selectedTargetSeat === s.seatIndex
                    ? 'bg-rose-500 text-white shadow-md font-black ring-1 ring-rose-300'
                    : 'bg-zinc-800 text-zinc-300 border border-white/10 hover:border-white/25'
                }`}
              >
                <span>सिट {s.seatIndex + 1}: {s.user?.displayName}</span>
              </button>
            ))}
        </div>

        {/* Gift Categories Tab */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar shrink-0">
          {[
            { id: 'all', label: '🌟 सबै' },
            { id: 'popular', label: '🔥 लोकप्रिय' },
            { id: 'lucky', label: '🎰 लक्की' },
            { id: 'nepal', label: '🇳🇵 नेपाल' },
            { id: 'romantic', label: '❤️ माया' },
            { id: 'luxury', label: '👑 VIP' },
            { id: 'greeting', label: '👋 अभिवादन' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedCategory(tab.id as any);
                if (tab.id !== 'lucky') {
                  setShowJackpotMachine(false);
                }
              }}
              className={`rounded-full px-2.5 py-0.5 font-bold whitespace-nowrap transition-all text-[10px] ${
                selectedCategory === tab.id
                  ? tab.id === 'lucky'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md shadow-amber-500/30'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {selectedCategory === 'lucky' && (
          <div className="flex items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/30 p-1.5 rounded-xl text-xs shrink-0">
            <span className="text-[10px] text-amber-300 font-bold px-1 flex items-center gap-1">
              <span>🎰</span>
              <span>५००x सम्म जित्न सकिने उपहार</span>
            </span>
            <button
              type="button"
              onClick={() => setShowJackpotMachine(prev => !prev)}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-2 py-0.5 text-[9.5px] font-black hover:brightness-110 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
            >
              {showJackpotMachine ? '🎁 उपहारहरू' : '🎰 स्पिन खोल्नुहोस्'}
            </button>
          </div>
        )}

        {selectedCategory === 'lucky' && showJackpotMachine ? (
          <div className="flex-1 overflow-y-auto pr-1 min-h-0">
            <LuckyGiftSystem
              userBalance={coinBalance}
              onBalanceChange={(newBal) => {
                setCoinBalance(newBal);
                if (updateUserCoins) {
                  updateUserCoins(newBal);
                }
                if (updateUserPoints) {
                  updateUserPoints(newBal * 100);
                }
              }}
              creatorName={hostName}
              onSendToCreator={(earnings, giftName) => {
                onSendGift({
                  id: `lg_${Date.now()}`,
                  name: giftName,
                  nameNp: giftName,
                  coins: earnings,
                  icon: '🎁',
                  category: 'lucky',
                  animation: 'confetti',
                  isLucky: true,
                  emotionTag: '🎰 लक्की ज्याकपट उपहार',
                }, selectedTargetSeat === 'host' ? 0 : typeof selectedTargetSeat === 'number' ? selectedTargetSeat : 0);
              }}
            />
          </div>
        ) : (
          /* Compact Gifts Grid */
          <div className="grid grid-cols-4 gap-1.5 flex-1 overflow-y-auto pr-1 min-h-0">
            {filteredGifts.map(gift => {
              const isSelected = selectedGift.id === gift.id;
              return (
                <div
                  key={gift.id}
                  onClick={() => {
                    setSelectedGift(gift);
                    if (gift.isLucky) {
                      setSelectedCategory('lucky');
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-rose-500 bg-rose-500/20 shadow-md scale-[1.02] ring-1 ring-rose-500/50'
                      : gift.isLucky
                      ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-zinc-900/90 hover:border-amber-400'
                      : 'border-white/10 bg-zinc-900/90 hover:bg-zinc-800/80 hover:border-white/20'
                  }`}
                >
                  {gift.isLucky && (
                    <span className="absolute -top-1 -right-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-1 py-0.2 text-[7px] font-black uppercase shadow-xs">
                      🎰 Lucky
                    </span>
                  )}
                  <span className="text-2xl filter drop-shadow-sm mb-0.5">{gift.icon}</span>
                  <p className="text-[10px] font-extrabold text-white truncate max-w-full text-center leading-tight">
                    {gift.nameNp}
                  </p>
                  <div className="mt-0.5 flex items-center gap-0.5 text-amber-400 font-black text-[10px]">
                    <Coins className="h-2.5 w-2.5" />
                    <span>{gift.coins.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Multiplier Presets & Send Action Footer */}
        {selectedCategory !== 'lucky' && (
          <div className="pt-1.5 border-t border-white/10 space-y-1.5 shrink-0">
            
            {/* Multiplier Combo Selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-zinc-300 font-bold">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>कम्बो (Qty):</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 5, 10, 99].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGiftMultiplier(num)}
                    className={`rounded-full px-2 py-0.2 text-[9.5px] font-black transition-all cursor-pointer ${
                      giftMultiplier === num
                        ? 'bg-amber-400 text-black shadow-sm'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    x{num}
                  </button>
                ))}
              </div>
            </div>

            {/* Send / Recharge CTA Bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xl filter drop-shadow">{selectedGift.icon}</span>
                <div className="truncate">
                  <div className="flex items-center gap-1">
                    <p className="text-[11px] font-extrabold text-white truncate">{selectedGift.nameNp}</p>
                    {giftMultiplier > 1 && (
                      <span className="text-[9px] font-black text-amber-400 bg-amber-400/15 px-1 py-0.2 rounded-full border border-amber-400/30">
                        x{giftMultiplier}
                      </span>
                    )}
                  </div>
                  <p className="text-[9.5px] text-amber-400 font-bold leading-tight">
                    कुल: {totalCost.toLocaleString()} Coins
                  </p>
                </div>
              </div>

              {isInsufficient ? (
                <button
                  type="button"
                  onClick={() => setIsRechargeModalOpen(true)}
                  className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-3 py-1.5 text-[11px] font-black text-black shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer animate-pulse shrink-0"
                >
                  <Coins className="h-3.5 w-3.5" />
                  <span>रिचार्ज गरी पठाउनुहोस्</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 px-3.5 py-1.5 text-[11px] font-black text-white shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <Send className="h-3 w-3" />
                  <span>उपहार पठाउनुहोस् ({totalCost.toLocaleString()})</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Coin Recharge Store Drawer */}
      <CoinRechargeModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
        onSuccess={handleRechargeSuccess}
      />
    </div>
  );
};

