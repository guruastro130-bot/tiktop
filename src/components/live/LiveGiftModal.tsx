import React, { useState, useEffect } from 'react';
import { X, Coins, Sparkles, Send, PlusCircle, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import { LiveGift, LiveSeat } from '../../types';
import { LIVE_GIFTS } from '../../data/liveData';
import { liveAudio } from '../../utils/liveAudio';
import { useAuth } from '../../context/AuthContext';
import { LuckyGiftSystem } from '../LuckyGiftSystem';

interface LiveGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  seats: LiveSeat[];
  hostName: string;
  onSendGift: (gift: LiveGift, targetSeatIndex?: number) => void;
  initialCategory?: 'all' | 'romantic' | 'greeting' | 'nepal' | 'luxury' | 'lucky';
}

export const LiveGiftModal: React.FC<LiveGiftModalProps> = ({
  isOpen,
  onClose,
  seats,
  hostName,
  onSendGift,
  initialCategory = 'all',
}) => {
  const { currentUser, updateUserPoints } = useAuth();
  const [selectedGift, setSelectedGift] = useState<LiveGift>(LIVE_GIFTS[0]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'romantic' | 'greeting' | 'nepal' | 'luxury' | 'lucky'>(initialCategory);
  const [selectedTargetSeat, setSelectedTargetSeat] = useState<number | 'host'>('host');
  const [giftMultiplier, setGiftMultiplier] = useState<number>(1);
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
    if (currentUser?.coinBalance !== undefined) {
      setCoinBalance(currentUser.coinBalance);
    }
  }, [currentUser?.coinBalance]);

  if (!isOpen) return null;

  const filteredGifts = LIVE_GIFTS.filter(g => {
    if (selectedCategory === 'all') return true;
    return g.category === selectedCategory;
  });

  const totalCost = (selectedGift?.coins || 0) * giftMultiplier;

  const handleRechargeCoins = (amount: number = 5000) => {
    setCoinBalance(prev => prev + amount);
    if (updateUserPoints) {
      updateUserPoints(amount * 100);
    }
    liveAudio.playGiftSound('nepal');
  };

  const handleSend = () => {
    if (!selectedGift) return;

    if (coinBalance < totalCost) {
      handleRechargeCoins(Math.max(5000, totalCost));
      return;
    }

    // Deduct coins
    setCoinBalance(prev => Math.max(0, prev - totalCost));
    if (updateUserPoints) {
      updateUserPoints(-totalCost * 100);
    }

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

    if (selectedGift.coins >= 500 || giftMultiplier > 1) {
      confetti({
        particleCount: selectedGift.coins >= 10000 ? 120 : 50,
        spread: 75,
        origin: { y: 0.65 },
      });
    }

    // Send gift
    for (let i = 0; i < Math.min(giftMultiplier, 3); i++) {
      onSendGift(
        selectedGift,
        selectedTargetSeat === 'host' ? 0 : typeof selectedTargetSeat === 'number' ? selectedTargetSeat : 0
      );
    }

    // Record gift transaction to backend (30% platform commission, 70% creator earnings)
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
      }).catch(err => console.warn('Gift transaction API sync skipped:', err));
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-xs select-none animate-fade-in">
      <div className="w-full max-w-md rounded-t-3xl border-t border-white/15 bg-zinc-950 p-4 text-white shadow-2xl space-y-3">
        
        {/* Header with Coin Balance & Quick Recharge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1">
              <Coins className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-black text-amber-300">
                {coinBalance.toLocaleString()} Coins
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleRechargeCoins(5000)}
              className="flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500/30 to-pink-500/30 border border-rose-500/40 px-2.5 py-1 text-[11px] font-extrabold text-rose-300 hover:from-rose-500/40 hover:to-pink-500/40 transition-colors active:scale-95"
              title="Add 5,000 Coins"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>सस्तो रिचार्ज (+5K)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-zinc-800 p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Gift Categories Tab */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'all', label: 'सबै (All)' },
            { id: 'lucky', label: '🎰 लक्की ज्याकपट (Lucky)' },
            { id: 'romantic', label: '❤️ रोमान्टिक & माया' },
            { id: 'greeting', label: '👋 अभिवादन & भाइब्स' },
            { id: 'nepal', label: '🇳🇵 नेपाल स्पेशल' },
            { id: 'luxury', label: '👑 लक्जरी VIP' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`rounded-full px-3 py-1.5 font-bold whitespace-nowrap transition-all text-[11px] ${
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

        {selectedCategory === 'lucky' ? (
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <LuckyGiftSystem
              userBalance={coinBalance}
              onBalanceChange={(newBal) => {
                setCoinBalance(newBal);
                if (updateUserPoints) {
                  updateUserPoints(newBal * 100);
                }
              }}
              creatorName={hostName}
              onSendToCreator={(earnings, giftName) => {
                // Record to live gift stream
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
          <>
            {/* Target Recipient Selector (Host or Seated Guest) */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
              <span className="text-[10px] font-bold text-zinc-400 shrink-0">प्राप्तकर्ता:</span>
              
              <button
                type="button"
                onClick={() => setSelectedTargetSeat('host')}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all shrink-0 ${
                  selectedTargetSeat === 'host'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'bg-zinc-800 text-zinc-300 border border-white/10'
                }`}
              >
                <span>👑 {hostName} (Host)</span>
              </button>

              {seats
                .filter(s => s.user && s.seatIndex !== 0)
                .map(s => (
                  <button
                    key={s.seatIndex}
                    type="button"
                    onClick={() => setSelectedTargetSeat(s.seatIndex)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all shrink-0 ${
                      selectedTargetSeat === s.seatIndex
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-zinc-800 text-zinc-300 border border-white/10'
                    }`}
                  >
                    <span>सिट {s.seatIndex + 1}: {s.user?.displayName}</span>
                  </button>
                ))}
            </div>

            {/* Gifts Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
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
                    className={`relative flex flex-col items-center justify-center p-2 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/20 shadow-lg scale-102 ring-1 ring-rose-500/50'
                        : gift.isLucky
                        ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-zinc-900/90 hover:border-amber-400'
                        : 'border-white/10 bg-zinc-900/90 hover:bg-zinc-800/80 hover:border-white/20'
                    }`}
                  >
                    {gift.isLucky && (
                      <span className="absolute -top-1.5 -right-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-1.5 py-0.2 text-[8px] font-black uppercase shadow-xs">
                        🎰 Lucky
                      </span>
                    )}
                    <span className="text-3xl filter drop-shadow-md mb-0.5">{gift.icon}</span>
                    <p className="text-[11px] font-extrabold text-white truncate max-w-full text-center">
                      {gift.nameNp}
                    </p>
                    {gift.emotionTag && (
                      <span className="text-[8.5px] text-zinc-400 font-medium truncate max-w-full">
                        {gift.emotionTag}
                      </span>
                    )}
                    <div className="mt-1 flex items-center gap-0.5 text-amber-400 font-black text-[11px]">
                      <Coins className="h-3 w-3" />
                      <span>{gift.coins.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Multiplier Presets & Send Action Footer (for standard gifts) */}
        {selectedCategory !== 'lucky' && (
          <div className="pt-2 border-t border-white/10 space-y-2">
            
            {/* Multiplier Combo Selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[11px] text-zinc-300 font-bold">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>कम्बो संख्या:</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 5, 10, 99].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGiftMultiplier(num)}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black transition-all ${
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

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-2xl filter drop-shadow">{selectedGift.icon}</span>
                <div className="truncate">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-extrabold text-white truncate">{selectedGift.nameNp}</p>
                    {giftMultiplier > 1 && (
                      <span className="text-[10px] font-black text-amber-400 bg-amber-400/15 px-1.5 py-0.2 rounded-full border border-amber-400/30">
                        x{giftMultiplier}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-amber-400 font-bold">
                    कुल: {totalCost.toLocaleString()} Coins
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSend}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 px-5 py-2.5 text-xs font-black text-white shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>पठाउनुहोस् (Send {totalCost.toLocaleString()})</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

