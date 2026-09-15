import React, { useState, useEffect } from 'react';
import { X, Coins, Sparkles, Send, PlusCircle, Users, ChevronDown, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { LiveGift, LiveSeat } from '../../types';
import { LIVE_GIFTS } from '../../data/liveData';
import { liveAudio } from '../../utils/liveAudio';
import { useAuth } from '../../context/AuthContext';
import { LuckyGiftSystem } from '../LuckyGiftSystem';
import { CoinRechargeModal } from '../CoinRechargeModal';
import { calculateLuckyGiftResult, LuckyGiftOutcome } from '../../utils/luckyGiftEngine';

interface LiveGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  seats: LiveSeat[];
  hostName: string;
  hostAvatar?: string;
  onSendGift: (gift: LiveGift, targetSeatIndex?: number | 'all', multiplier?: number, luckyOutcome?: LuckyGiftOutcome) => void;
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
  const [luckyToast, setLuckyToast] = useState<LuckyGiftOutcome | null>(null);
  const [showJackpotMachine, setShowJackpotMachine] = useState<boolean>(false);
  const [isRecipientMenuOpen, setIsRecipientMenuOpen] = useState<boolean>(false);

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

  const safeSeats = Array.isArray(seats) ? seats : [];
  const occupiedSeats = safeSeats.filter(s => s.user);
  const allRecipientsCount = Math.max(1, (occupiedSeats.length > 0 ? occupiedSeats.length : 1));
  const multiplierFactor = selectedTargetSeat === 'all' ? allRecipientsCount : 1;
  const totalCost = (selectedGift?.coins || 0) * giftMultiplier * multiplierFactor;
  const isInsufficient = coinBalance < totalCost;

  const handleRechargeSuccess = (_addedCoins: number, newBalance: number) => {
    setCoinBalance(newBalance);
  };

  const getRecipientLabel = () => {
    if (selectedTargetSeat === 'host') return `👑 ${hostName} (Host)`;
    if (selectedTargetSeat === 'all') return `🌟 All Seats (${occupiedSeats.length})`;
    const targetSeat = safeSeats.find(s => s.seatIndex === selectedTargetSeat);
    if (targetSeat?.user) {
      return `Seat ${targetSeat.seatIndex + 1}: ${targetSeat.user.displayName}`;
    }
    return `Seat ${(selectedTargetSeat as number) + 1}`;
  };

  const handleSend = () => {
    if (!selectedGift) return;

    if (isInsufficient) {
      setIsRechargeModalOpen(true);
      return;
    }

    const isLucky = Boolean(selectedGift.isLucky || selectedGift.category === 'lucky');
    let luckyOutcome: LuckyGiftOutcome | undefined;

    if (isLucky) {
      // Calculate lucky cashback & recipient 3% points
      luckyOutcome = calculateLuckyGiftResult(totalCost);
    }

    // New balance calculation: Deduct totalCost, and if won, add winCoins back immediately!
    const winBonus = (isLucky && luckyOutcome?.isWin) ? luckyOutcome.winCoins : 0;
    const newBal = Math.max(0, coinBalance - totalCost + winBonus);
    setCoinBalance(newBal);
    if (updateUserCoins) {
      updateUserCoins(newBal);
    }
    if (updateUserPoints) {
      updateUserPoints(-totalCost * 100);
    }

    setFloatingDeduction(totalCost);
    setTimeout(() => setFloatingDeduction(null), 1200);

    if (isLucky && luckyOutcome) {
      setLuckyToast(luckyOutcome);
      setTimeout(() => setLuckyToast(null), 3800);

      if (luckyOutcome.isWin) {
        if (luckyOutcome.winCoins >= 1000) {
          liveAudio.playLuckySound('jackpot');
          confetti({
            particleCount: 140,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#ffd700', '#fbbf24', '#f43f5e', '#ffffff'],
          });
        } else if (luckyOutcome.winCoins >= totalCost) {
          liveAudio.playLuckySound('win');
          confetti({
            particleCount: 60,
            spread: 60,
            origin: { y: 0.65 },
            colors: ['#34d399', '#fbbf24', '#f43f5e'],
          });
        } else {
          liveAudio.playLuckySound('coin');
        }
      } else {
        liveAudio.playLuckySound('loss');
      }
    } else {
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
          particleCount: selectedGift.coins >= 5000 || selectedTargetSeat === 'all' ? 100 : 50,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#f43f5e', '#fbbf24', '#ec4899', '#ffffff'],
        });
      }
    }

    if (selectedTargetSeat === 'all') {
      onSendGift(selectedGift, 'all', giftMultiplier, luckyOutcome);
    } else {
      onSendGift(
        selectedGift,
        selectedTargetSeat === 'host' ? 0 : typeof selectedTargetSeat === 'number' ? selectedTargetSeat : 0,
        giftMultiplier,
        luckyOutcome
      );
    }

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
          roomId: 'live_voice_1',
        }),
      }).catch(() => {});
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/35 backdrop-blur-[2px] pointer-events-auto select-none transition-opacity duration-200">
      {/* Click-outside backdrop to dismiss modal & keep video visible */}
      <div className="flex-1 w-full cursor-pointer" onClick={onClose} />

      {/* Slide-Up Floating Gift Tray (Poppo Live Style) */}
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg mx-auto rounded-t-[28px] border-t border-white/10 bg-zinc-950/85 backdrop-blur-2xl shadow-[0_-12px_36px_rgba(0,0,0,0.85)] text-white flex flex-col max-h-[48vh] sm:max-h-[46vh] transition-transform duration-300 animate-slide-up overflow-hidden"
      >
        {/* Sleek Top Drag Handle Indicator */}
        <div className="pt-2 pb-1 flex justify-center shrink-0">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Top Minimalist Navigation Bar */}
        <div className="px-3 py-1.5 flex items-center justify-between gap-2 border-b border-white/5 shrink-0">
          {/* Coin Balance & Quick Recharge */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex items-center gap-1.5 rounded-full bg-white/5 border border-amber-500/30 px-2.5 py-1 text-xs font-mono font-bold text-amber-300">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>{coinBalance.toLocaleString()}</span>
              {floatingDeduction !== null && (
                <span className="absolute -top-3 right-0 text-[10px] font-black text-rose-400 bg-zinc-900 px-1.5 py-0.5 rounded-full border border-rose-500/40 animate-bounce shadow">
                  -{floatingDeduction.toLocaleString()}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsRechargeModalOpen(true)}
              className="flex items-center gap-1 rounded-full bg-amber-400 hover:bg-amber-300 text-black px-2.5 py-1 text-[11px] font-bold shadow transition-transform active:scale-95 cursor-pointer"
              title="Coins Recharge"
            >
              <PlusCircle className="h-3 w-3 stroke-[2.5]" />
              <span>रिचार्ज</span>
            </button>
          </div>

          {/* Recipient Dropdown Chip */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRecipientMenuOpen(prev => !prev)}
              className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 hover:border-white/20 transition-all cursor-pointer"
            >
              <span className="truncate max-w-[120px]">{getRecipientLabel()}</span>
              <ChevronDown className={`h-3 w-3 text-zinc-400 transition-transform ${isRecipientMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Recipient Dropdown Popup */}
            {isRecipientMenuOpen && (
              <div className="absolute right-0 bottom-full mb-1.5 w-48 rounded-2xl border border-white/10 bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-xl z-50 space-y-0.5 animate-fade-in">
                <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  उपहार पाउने व्यक्ति छान्नुहोस्
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTargetSeat('host');
                    setIsRecipientMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    selectedTargetSeat === 'host' ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">👑 {hostName} (Host)</span>
                  {selectedTargetSeat === 'host' && <Check className="h-3.5 w-3.5 text-rose-400" />}
                </button>

                {occupiedSeats.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTargetSeat('all');
                      setIsRecipientMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      selectedTargetSeat === 'all' ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-200 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>सबै सिट ({occupiedSeats.length})</span>
                    </span>
                    {selectedTargetSeat === 'all' && <Check className="h-3.5 w-3.5 text-purple-400" />}
                  </button>
                )}

                {seats
                  .filter(s => s.user && s.seatIndex !== 0)
                  .map(s => (
                    <button
                      key={s.seatIndex}
                      type="button"
                      onClick={() => {
                        setSelectedTargetSeat(s.seatIndex);
                        setIsRecipientMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        selectedTargetSeat === s.seatIndex ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-200 hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate">सिट {s.seatIndex + 1}: {s.user?.displayName}</span>
                      {selectedTargetSeat === s.seatIndex && <Check className="h-3.5 w-3.5 text-rose-400" />}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/5 p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Minimalist Categories Filter Bar */}
        <div className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-white/5 shrink-0">
          {[
            { id: 'all', label: 'सबै' },
            { id: 'popular', label: 'लोकप्रिय' },
            { id: 'lucky', label: '🎰 लक्की' },
            { id: 'nepal', label: '🇳🇵 नेपाल' },
            { id: 'romantic', label: 'माया' },
            { id: 'luxury', label: '👑 VIP' },
            { id: 'greeting', label: 'अभिवादन' },
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
              className={`rounded-full px-3 py-0.5 text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Lucky Category Sub-banner */}
        {selectedCategory === 'lucky' && (
          <div className="px-3 py-1.5 flex items-center justify-between bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-b border-amber-500/25 text-xs shrink-0">
            <div className="flex items-center gap-1.5 min-w-0 pr-1">
              <span className="text-base shrink-0 animate-bounce">🎰</span>
              <div className="min-w-0">
                <span className="text-[10px] text-amber-300 font-bold block leading-tight truncate">
                  १०० कोइनमा १२०, १३५, २००, ५२५, ११२३, १८९० देखि ५,००० सम्म ब्याक!
                </span>
                <span className="text-[9px] text-zinc-300 font-medium block leading-tight">
                  रिसिभर (Host/Guest) ले ठीक ३% पोइन्ट्स प्राप्त गर्ने
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowJackpotMachine(prev => !prev)}
              className="rounded-full bg-amber-400 text-black px-2.5 py-1 text-[10px] font-black hover:bg-amber-300 transition-all cursor-pointer shrink-0 shadow-sm"
            >
              {showJackpotMachine ? 'उपहार सूची' : 'स्पिन ह्विल 🎰'}
            </button>
          </div>
        )}

        {/* Floating Lucky Feedback Toast inside Modal */}
        {luckyToast && (
          <div className="absolute top-12 inset-x-3 z-50 pointer-events-none flex items-center justify-center animate-bounce">
            <div className={`flex items-center gap-2.5 rounded-2xl px-4 py-2 text-xs shadow-2xl backdrop-blur-xl border ${
              luckyToast.isWin
                ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.6)]'
                : 'bg-zinc-900/95 text-zinc-300 border-white/20'
            }`}>
              <span className="text-2xl">{luckyToast.isWin ? '🎉' : '🍀'}</span>
              <div>
                <div className="flex items-center gap-1.5 font-black text-[11.5px]">
                  <span>{luckyToast.isWin ? `+${luckyToast.winCoins.toLocaleString()} COINS BACK!` : 'अर्को पटक अवश्य भाग्य खुल्नेछ!'}</span>
                  {luckyToast.isWin && (
                    <span className="rounded-full bg-black/40 px-1.5 py-0.2 text-[9px] text-amber-300 font-extrabold">
                      {luckyToast.multiplierLabel}
                    </span>
                  )}
                </div>
                <p className="text-[9.5px] opacity-90 text-white/90">
                  {luckyToast.isWin
                    ? `तपाईंको ब्यालेन्समा थपियो! (रिसिभरले +${luckyToast.receiverPoints} पोइन्ट पाए)`
                    : `रिसिभर (Host/Guest) ले +${luckyToast.receiverPoints} पोइन्ट प्राप्त गर्नुभयो`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Gift Selection Area */}
        {selectedCategory === 'lucky' && showJackpotMachine ? (
          <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
            <LuckyGiftSystem
              userBalance={coinBalance}
              onBalanceChange={(newBal) => {
                setCoinBalance(newBal);
                if (updateUserCoins) updateUserCoins(newBal);
                if (updateUserPoints) updateUserPoints(newBal * 100);
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
                  emotionTag: '🎰 लक्की ज्याकपट',
                }, selectedTargetSeat === 'host' ? 0 : typeof selectedTargetSeat === 'number' ? selectedTargetSeat : 0);
              }}
            />
          </div>
        ) : (
          /* Sleek 4-Column Gifts Grid */
          <div className="grid grid-cols-4 gap-1.5 p-2.5 flex-1 overflow-y-auto min-h-0 no-scrollbar">
            {filteredGifts.map(gift => {
              const isSelected = selectedGift.id === gift.id;
              return (
                <div
                  key={gift.id}
                  onClick={() => {
                    setSelectedGift(gift);
                    if (gift.isLucky) setSelectedCategory('lucky');
                  }}
                  className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-white/10 border border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.35)] scale-[1.02]'
                      : 'bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15'
                  }`}
                >
                  {/* Subtle Badge */}
                  {gift.isLucky ? (
                    <span className="absolute top-1 right-1 rounded-full bg-amber-400 text-black px-1 text-[7px] font-black uppercase">
                      Lucky
                    </span>
                  ) : gift.coins >= 50000 ? (
                    <span className="absolute top-1 right-1 rounded-full bg-amber-300 text-black px-1 text-[6.5px] font-black uppercase">
                      VIP
                    </span>
                  ) : null}

                  {gift.imageUrl ? (
                    <div className="h-8 w-8 mb-1 flex items-center justify-center overflow-hidden rounded-md border border-amber-400/50 shadow-sm bg-black/40">
                      <img src={gift.imageUrl} alt={gift.nameNp} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <span className="text-2xl filter drop-shadow-sm mb-1">{gift.icon}</span>
                  )}
                  <p className="text-[11px] font-medium text-zinc-200 truncate max-w-full text-center">
                    {gift.nameNp}
                  </p>
                  <div className="mt-0.5 flex items-center gap-0.5 text-amber-400 font-bold text-[10px]">
                    <Coins className="h-2.5 w-2.5" />
                    <span>{gift.coins.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Compact Poppo-Style Bottom Control Bar (Always visible for gifts list) */}
        {!showJackpotMachine && (
          <div className="px-3 py-2 border-t border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
            {/* Combo Multipliers */}
            <div className="flex items-center gap-1">
              {[1, 5, 10, 99].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setGiftMultiplier(num)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                    giftMultiplier === num
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  x{num}
                </button>
              ))}
            </div>

            {/* Total Cost & Send CTA */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block leading-none">
                  {(selectedGift.isLucky || selectedCategory === 'lucky') ? 'लक्की गिफ्ट' : 'कुल मूल्य'}
                </span>
                <span className="text-xs font-bold text-amber-400">{totalCost.toLocaleString()} Coins</span>
              </div>

              {isInsufficient ? (
                <button
                  type="button"
                  onClick={() => setIsRechargeModalOpen(true)}
                  className="rounded-full bg-amber-400 hover:bg-amber-300 text-black px-4 py-1.5 text-xs font-bold shadow transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  रिचार्ज गर्नुहोस्
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  className={`rounded-full px-4 py-1.5 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    (selectedGift.isLucky || selectedCategory === 'lucky')
                      ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 hover:brightness-110 text-white ring-1 ring-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                      : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:brightness-110 text-white'
                  }`}
                >
                  <Send className="h-3 w-3" />
                  <span>{(selectedGift.isLucky || selectedCategory === 'lucky') ? 'लक्की पठाउनुहोस् 🎰' : 'पठाउनुहोस्'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Coin Recharge Modal */}
      <CoinRechargeModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
        onSuccess={handleRechargeSuccess}
      />
    </div>
  );
};
