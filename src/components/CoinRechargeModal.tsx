import React, { useState } from 'react';
import { X, Coins, Sparkles, CheckCircle2, ShieldCheck, Zap, CreditCard, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { liveAudio } from '../utils/liveAudio';

export interface CoinPackage {
  id: string;
  coins: number;
  bonusCoins?: number;
  priceNpr: number;
  tag?: string;
  popular?: boolean;
}

export const COIN_PACKAGES: CoinPackage[] = [
  { id: 'pack_70', coins: 70, priceNpr: 140, tag: 'सुरुवाती प्याक' },
  { id: 'pack_350', coins: 350, bonusCoins: 15, priceNpr: 700, tag: '+15 बोनस' },
  { id: 'pack_700', coins: 700, bonusCoins: 35, priceNpr: 1400, tag: '+35 बोनस' },
  { id: 'pack_1400', coins: 1400, bonusCoins: 100, priceNpr: 2800, popular: true, tag: '🔥 लोकप्रिय (Popular)' },
  { id: 'pack_3500', coins: 3500, bonusCoins: 300, priceNpr: 7000, tag: '⚡ सुपर भ्यालु (+300)' },
  { id: 'pack_7000', coins: 7000, bonusCoins: 700, priceNpr: 14000, tag: '👑 VIP प्याक (+700)' },
  { id: 'pack_17500', coins: 17500, bonusCoins: 2000, priceNpr: 35000, tag: '💎 डायमन्ड ह्वेल्स (+2K)' },
];

interface CoinRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (addedCoins: number, newBalance: number) => void;
}

export const CoinRechargeModal: React.FC<CoinRechargeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, rechargeCoins } = useAuth();
  const [selectedPack, setSelectedPack] = useState<CoinPackage>(COIN_PACKAGES[3]); // default 1400 coins
  const [paymentMethod, setPaymentMethod] = useState<'esewa' | 'khalti' | 'banking' | 'card'>('esewa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCoins = currentUser?.coinBalance ?? 5000;
  const totalCoinsToReceive = selectedPack.coins + (selectedPack.bonusCoins || 0);

  const handleConfirmRecharge = async () => {
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      // Simulate real-time wallet verification (eSewa / Khalti API)
      await new Promise(res => setTimeout(res, 900));

      const newBal = await rechargeCoins(totalCoinsToReceive);

      try {
        liveAudio.playGiftSound('nepal');
      } catch {}

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setSuccessMessage(`✅ रू. ${selectedPack.priceNpr.toLocaleString()} को रिचार्ज सफल! +${totalCoinsToReceive.toLocaleString()} Coins थपियो। नयाँ ब्यालेन्स: ${newBal.toLocaleString()} Coins`);

      if (onSuccess) {
        onSuccess(totalCoinsToReceive, newBal);
      }

      setTimeout(() => {
        setIsProcessing(false);
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm select-none animate-fade-in p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/15 bg-zinc-950 text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header with TikTok / Poppo styled Coin Balance Badge */}
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Coins className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <span>कोइन रिचार्ज स्टोर</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                    Live & Inbox
                  </span>
                </h3>
                <p className="text-[10px] text-zinc-400">लाइभ स्ट्रिम तथा एसएमएस इनबक्समा उपहार पठाउन कोइन</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-zinc-800/80 p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Current Live Coin Balance Display */}
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-orange-500/20 border border-amber-500/40 p-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-black shadow-md font-black">
                🪙
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-400/90">
                  तपाईंको हालको ब्यालेन्स (Current Coins)
                </span>
                <div className="text-lg font-black text-amber-300 font-mono tracking-tight flex items-center gap-1">
                  <span>{currentCoins.toLocaleString()}</span>
                  <span className="text-xs font-bold text-amber-400">Coins</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <Zap className="h-2.5 w-2.5" />
                तत्काल प्राप्त (Instant)
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Body: Coin Bundles & Payment Method */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* Coin Packs Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-zinc-200">
                रिचार्ज प्याक रोज्नुहोस् (Select Coin Package):
              </span>
              <span className="text-[10px] text-amber-400 font-semibold">
                १ कोइन ≈ रू. २.००
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {COIN_PACKAGES.map(pack => {
                const isSelected = selectedPack.id === pack.id;
                const totalCoins = pack.coins + (pack.bonusCoins || 0);

                return (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedPack(pack)}
                    className={`relative flex flex-col justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-gradient-to-b from-amber-500/20 to-zinc-900 border-amber-400 ring-2 ring-amber-400/40 shadow-lg scale-[1.02]'
                        : 'bg-zinc-900/80 border-white/10 hover:border-white/20 hover:bg-zinc-850'
                    }`}
                  >
                    {/* Badge for Bonus/Popular */}
                    {pack.tag && (
                      <span className={`absolute -top-2 left-2 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase shadow-xs ${
                        pack.popular
                          ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white'
                          : 'bg-amber-400 text-black'
                      }`}>
                        {pack.tag}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-lg">🪙</span>
                      <span className="text-base font-black text-white font-mono">
                        {totalCoins.toLocaleString()}
                      </span>
                    </div>

                    {pack.bonusCoins ? (
                      <span className="text-[9.5px] text-emerald-400 font-bold">
                        (मूल: {pack.coins} + बोनस: {pack.bonusCoins})
                      </span>
                    ) : (
                      <span className="text-[9.5px] text-zinc-500 font-medium">
                        मानक कोइन
                      </span>
                    )}

                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs font-black text-amber-300">
                        रू. {pack.priceNpr.toLocaleString()}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-amber-400 fill-amber-400/20" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-black text-zinc-200">
              भुक्तानी माध्यम (Payment Method):
            </span>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'esewa', label: 'eSewa (इसेवा)', color: 'border-emerald-500 bg-emerald-950/20 text-emerald-400', badge: 'नेपाल १ नं.' },
                { id: 'khalti', label: 'Khalti (खल्ती)', color: 'border-purple-500 bg-purple-950/20 text-purple-400', badge: 'लोकप्रिय' },
                { id: 'banking', label: 'Mobile Banking', color: 'border-sky-500 bg-sky-950/20 text-sky-400', badge: 'सबै बैंक' },
                { id: 'card', label: 'Visa / Mastercard', color: 'border-amber-500 bg-amber-950/20 text-amber-400', badge: 'कार्ड' },
              ].map(method => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    paymentMethod === method.id
                      ? `${method.color} ring-1 ring-white/30 font-black shadow-sm`
                      : 'border-white/10 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className="truncate">{method.label}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-zinc-300 border border-white/5">
                    {method.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Security & Instant Delivery Guarantee */}
          <div className="flex items-center gap-2 rounded-xl bg-zinc-900/60 border border-white/5 p-2.5 text-[10px] text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>सुरक्षित र तत्काल डेलिभरी। कोइन तुरुन्तै तपाईंको खातामा थपिनेछ।</span>
          </div>

          {/* Success Message Banner */}
          {successMessage && (
            <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-3 text-xs font-black text-emerald-300 animate-bounce">
              {successMessage}
            </div>
          )}

        </div>

        {/* Footer Action Button */}
        <div className="p-4 border-t border-white/10 bg-zinc-950 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">जम्मा पाउने कोइन:</span>
            <span className="font-black text-amber-300 font-mono text-sm">
              +{totalCoinsToReceive.toLocaleString()} Coins
            </span>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleConfirmRecharge}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black py-3.5 px-4 text-xs font-black shadow-xl shadow-amber-500/20 hover:brightness-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                <span>रिचार्ज प्रमाणीकरण हुँदैछ...</span>
              </div>
            ) : (
              <>
                <Coins className="h-4 w-4" />
                <span>रू. {selectedPack.priceNpr.toLocaleString()} भुक्तानी गरी कोइन लिनुहोस्</span>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
