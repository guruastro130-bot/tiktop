import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trophy, Zap, AlertTriangle, ShieldCheck, History, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface LuckyGiftTier {
  id: string;
  name: string;
  price: number;
  icon: string;
  color: string;
}

export const LUCKY_GIFT_TIERS: LuckyGiftTier[] = [
  { id: 'lg_100', name: 'Lucky Coin 🪙', price: 100, icon: '🪙', color: '#10b981' },
  { id: 'lg_500', name: 'Lucky Clover 🍀', price: 500, icon: '🍀', color: '#00ffcc' },
  { id: 'lg_1000', name: 'Lucky Box 🎁', price: 1000, icon: '🎁', color: '#3b82f6' },
  { id: 'lg_2500', name: 'Lucky Wheel 🎡', price: 2500, icon: '🎡', color: '#a855f7' },
  { id: 'lg_5000', name: 'Jackpot Diamond 💎', price: 5000, icon: '💎', color: '#f59e0b' },
];

export interface LuckySpinResult {
  id: string;
  timestamp: string;
  giftName: string;
  betAmount: number;
  isWin: boolean;
  multiplier: number;
  winAmount: number;
  creatorShare: number; // ७०%
  platformShare: number; // १०% प्रत्यक्ष नाफा
  reserveAddition: number; // २०% रिजर्भमा थपिएको
}

interface LuckyGiftSystemProps {
  userBalance?: number;
  onBalanceChange?: (newBalance: number) => void;
  creatorName?: string;
  onSendToCreator?: (creatorEarnings: number, giftName: string) => void;
}

export const LuckyGiftSystem: React.FC<LuckyGiftSystemProps> = ({
  userBalance: externalBalance,
  onBalanceChange,
  creatorName = 'Creator B (लाइभ होस्ट)',
  onSendToCreator,
}) => {
  // १. स्टेट म्यानेजमेन्ट
  const [balance, setBalance] = useState<number>(() => externalBalance ?? 50000);
  const [selectedTier, setSelectedTier] = useState<LuckyGiftTier>(LUCKY_GIFT_TIERS[0]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [displayMultiplier, setDisplayMultiplier] = useState<string>('?');
  const [lastResult, setLastResult] = useState<LuckySpinResult | null>(null);
  const [history, setHistory] = useState<LuckySpinResult[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // २. जोखिममुक्त हाउस-एज रिजर्भ पुल (House-Edge Reserve Pool)
  // प्लेटफर्मको यो पुलबाट मात्र खेलाडीको जीत भुक्तानी गरिन्छ।
  // गोजीबाट १ रुपैयाँ पनि घाटा नलाग्ने गरी डिजाइन गरिएको।
  const [jackpotReservePool, setJackpotReservePool] = useState<number>(150000); // प्रारम्भिक सुरक्षित रिजर्भ
  const [totalPlatformProfit, setTotalPlatformProfit] = useState<number>(35000); // १०% प्लेटफर्मको सुनिश्चित मुनाफा

  // सिङ्क गर्नुहोस् बाह्य ब्यालेन्ससँग
  useEffect(() => {
    if (externalBalance !== undefined) {
      setBalance(externalBalance);
    }
  }, [externalBalance]);

  const updateBalance = (newVal: number) => {
    setBalance(newVal);
    if (onBalanceChange) {
      onBalanceChange(newVal);
    }
  };

  // वेब अडियो सिन्थेसाइजर (ध्वनि प्रभाव)
  const playSound = (type: 'spin' | 'win' | 'loss' | 'jackpot') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'spin') {
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'win') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'jackpot') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  // ------------------------------------------------------------------------
  // ३. बिजनेस लजिक र प्रोबबिलिटी एल्गोरिदम (Mathematical House Edge Algorithm)
  // ------------------------------------------------------------------------
  const handleLuckySpin = () => {
    const bet = selectedTier.price;

    if (balance < bet) {
      alert('❌ तपाईंको वालेटमा पर्याप्त कोइन छैन!');
      return;
    }

    if (isSpinning) return;
    setIsSpinning(true);
    setLastResult(null);

    // कोइन कटौती (User Balance Deduction)
    const newBal = balance - bet;
    updateBalance(newBal);

    // आम्दानी बाँडफाँड (Split Breakdown):
    // - ७०% क्रिएटरको पक्का भाग (Creator Guaranteed Earnings)
    const creatorEarn = Math.floor(bet * 0.70);
    // - १०% प्लेटफर्मको सुरक्षित मुनाफा (Direct Platform Profit)
    const platformDirectProfit = Math.floor(bet * 0.10);
    // - २०% ज्याकपट रिजर्भ पुलमा जाने (Reserve Pool Contribution)
    const reserveContribution = Math.floor(bet * 0.20);

    // क्रिएटर र प्लेटफर्म अद्यावधिक
    if (onSendToCreator) {
      onSendToCreator(creatorEarn, selectedTier.name);
    }
    setTotalPlatformProfit(prev => prev + platformDirectProfit);

    // स्पिनिङ एनिमेसन टाइमर
    let spinCount = 0;
    const reels = ['0x', '2x', '0x', '5x', '0x', '10x', '0x'];
    const interval = setInterval(() => {
      setDisplayMultiplier(reels[spinCount % reels.length]);
      playSound('spin');
      spinCount++;
    }, 100);

    setTimeout(() => {
      clearInterval(interval);

      // ----------------------------------------------------
      // प्रोबबिलिटी गणना:
      // ९०% (०.१० देखि १.०० सम्म) = Loss (0x)
      // १०% (०.०० देखि ०.१० सम्म) = Win (2x, 5x, 10x)
      // ----------------------------------------------------
      const rand = Math.random(); // 0.0 - 1.0
      let isWin = false;
      let targetMultiplier = 0;

      if (rand < 0.10) {
        // १०% सम्भावना: जीत (Win)
        isWin = true;
        // जीत भित्रको बाँडफाँड:
        // ७% (०.०३ - ०.१०) = 2x
        // २.५% (०.००५ - ०.०३) = 5x
        // ०.५% (०.००० - ०.००५) = 10x (MEGA JACKPOT)
        if (rand < 0.005) {
          targetMultiplier = 10;
        } else if (rand < 0.03) {
          targetMultiplier = 5;
        } else {
          targetMultiplier = 2;
        }
      } else {
        // ९०% सम्भावना: हार (Loss)
        isWin = false;
        targetMultiplier = 0;
      }

      // ----------------------------------------------------
      // जोखिममुक्त हाउस-एज सुरक्षा जाँच (Risk-Free House-Edge Guard):
      // यदि ज्याकपट रिजर्भ पुलमा पर्याप्त रकम छैन भने,
      // सिस्टमले कुनै पनि अवस्थामा प्लेटफर्मलाई घाटा हुन दिँदैन!
      // ----------------------------------------------------
      let finalWinCoins = isWin ? bet * targetMultiplier : 0;
      const currentReserveWithAddition = jackpotReservePool + reserveContribution;

      if (isWin && finalWinCoins > currentReserveWithAddition) {
        // यदि रिजर्भ भन्दा ठूलो रकम पर्यो भने, उपलब्ध रिजर्भ अनुसार सुरक्षित मल्टीप्लायरमा घटाइने:
        if (currentReserveWithAddition >= bet * 5) {
          targetMultiplier = 5;
          finalWinCoins = bet * 5;
        } else if (currentReserveWithAddition >= bet * 2) {
          targetMultiplier = 2;
          finalWinCoins = bet * 2;
        } else {
          // यदि रिजर्भ अत्यन्त न्यून छ भने सुरक्षित फिर्ता वा 1x:
          targetMultiplier = 0;
          isWin = false;
          finalWinCoins = 0;
        }
      }

      // नतिजा अनुसार रिजर्भ पुल घटाउने/बढाउने
      if (isWin) {
        // खेलाडीको जीत रिजर्भ पुलबाट घट्छ
        setJackpotReservePool(prev => Math.max(0, prev + reserveContribution - finalWinCoins));
        // खेलाडीको वालेटमा जीत थप्ने
        updateBalance(newBal + finalWinCoins);
        setDisplayMultiplier(`${targetMultiplier}x 🔥`);

        if (targetMultiplier >= 10) {
          playSound('jackpot');
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
        } else {
          playSound('win');
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        }
      } else {
        // हारमा रिजर्भ पुल २०% ले बढ्छ
        setJackpotReservePool(prev => prev + reserveContribution);
        setDisplayMultiplier('0x ❌');
        playSound('loss');
      }

      const outcome: LuckySpinResult = {
        id: `spin_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('ne-NP'),
        giftName: selectedTier.name,
        betAmount: bet,
        isWin,
        multiplier: targetMultiplier,
        winAmount: finalWinCoins,
        creatorShare: creatorEarn,
        platformShare: platformDirectProfit,
        reserveAddition: reserveContribution,
      };

      setLastResult(outcome);
      setHistory(prev => [outcome, ...prev.slice(0, 7)]);
      setIsSpinning(false);
    }, 1800);
  };

  return (
    <div id="lucky-gift-jackpot-system" className="w-full max-w-md mx-auto bg-zinc-950 text-white rounded-2xl border border-amber-500/30 p-4 shadow-2xl space-y-4">
      {/* १. हेडलाइन र लाइभ रिजर्भ स्ट्याटस */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-black font-black text-lg shadow-lg shadow-amber-500/20">
            🎰
          </div>
          <div>
            <h3 className="text-sm font-black tracking-wide text-amber-300 flex items-center gap-1.5">
              <span>Lucky Gift Jackpot</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                10% Win Rate
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">९०% क्रिएटर सहयोग • १०% लक्की ज्याकपट (२x, ५x, १०x)</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-zinc-400 hover:text-white p-1.5 rounded-lg bg-zinc-900 border border-white/5"
          title="ध्वनि अन/अफ"
        >
          {soundEnabled ? <Volume2 className="h-4 w-4 text-amber-400" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      {/* २. हाउस-एज र पारदर्शी रिजर्भ बार (Risk-Free Transparency Bar) */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-zinc-900/90 border border-emerald-500/20 rounded-xl p-2.5">
          <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold mb-0.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>प्लेटफर्म रिजर्भ पुल</span>
          </div>
          <div className="text-base font-black text-white">
            {jackpotReservePool.toLocaleString()} <span className="text-[10px] font-normal text-zinc-400">Coins</span>
          </div>
          <p className="text-[9px] text-zinc-500 mt-0.5">१००% हाउस-एज सुरक्षित (No Out-of-Pocket)</p>
        </div>

        <div className="bg-zinc-900/90 border border-amber-500/20 rounded-xl p-2.5">
          <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold mb-0.5">
            <Trophy className="h-3.5 w-3.5" />
            <span>तपाईंको वालेट</span>
          </div>
          <div className="text-base font-black text-amber-300">
            {balance.toLocaleString()} <span className="text-[10px] font-normal text-zinc-400">Coins</span>
          </div>
          <p className="text-[9px] text-zinc-500 mt-0.5">क्रिएटर: {creatorName}</p>
        </div>
      </div>

      {/* ३. लक्की गिफ्ट टियर छनोट (Tiers Selection) */}
      <div>
        <label className="text-[11px] text-zinc-400 font-bold block mb-1.5">गिफ्ट रकम छान्नुहोस्:</label>
        <div className="grid grid-cols-3 gap-2">
          {LUCKY_GIFT_TIERS.map((tier) => {
            const isSelected = selectedTier.id === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                disabled={isSpinning}
                onClick={() => setSelectedTier(tier)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/15 text-white shadow-md shadow-amber-500/20'
                    : 'border-white/5 bg-zinc-900/80 text-zinc-400 hover:border-white/20'
                }`}
              >
                <span className="text-xl mb-1">{tier.icon}</span>
                <span className="text-xs font-black">{tier.price.toLocaleString()}</span>
                <span className="text-[10px] text-zinc-400">{tier.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ४. मुख्य स्पिनिङ रिल र एनिमेसन (Slot Reel Display) */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-zinc-900 via-black to-zinc-900 p-6 text-center shadow-inner">
        {/* सजावटी बत्तीहरू */}
        <div className="absolute top-2 left-3 right-3 flex justify-between pointer-events-none opacity-60">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
        </div>

        <div className="text-[11px] uppercase tracking-widest text-zinc-400 mb-2 font-bold">
          {isSpinning ? '🎰 स्पिनिङ हुँदैछ...' : 'ज्याकपट मल्टिप्लायर'}
        </div>

        <div
          className={`inline-block py-2 px-8 rounded-2xl font-black text-4xl tracking-wider transition-transform duration-150 ${
            isSpinning
              ? 'scale-110 text-yellow-300 animate-pulse'
              : lastResult?.isWin
              ? 'scale-105 text-emerald-400 bg-emerald-950/40 border border-emerald-500/40'
              : lastResult && !lastResult.isWin
              ? 'text-rose-400 bg-rose-950/20 border border-rose-500/30'
              : 'text-amber-400 bg-zinc-900 border border-white/10'
          }`}
        >
          {displayMultiplier}
        </div>

        {/* नतिजा सन्देश */}
        <div className="mt-3 min-h-[38px] flex items-center justify-center">
          {isSpinning ? (
            <div className="text-xs text-amber-300 flex items-center gap-1.5 animate-pulse">
              <Zap className="h-3.5 w-3.5 animate-spin" />
              <span>भाग्यशाली एल्गोरिदम चल्दैछ...</span>
            </div>
          ) : lastResult ? (
            lastResult.isWin ? (
              <div className="text-xs text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/30 py-1.5 px-3 rounded-xl animate-fade-in">
                🎉 बधाई! तपाईंले {lastResult.multiplier}x जित्नुभयो (+{lastResult.winAmount.toLocaleString()} Coins)!
              </div>
            ) : (
              <div className="text-xs text-zinc-300 bg-zinc-900 border border-white/10 py-1.5 px-3 rounded-xl">
                ❤️ {lastResult.giftName} क्रिएटरलाई गयो (७०% = {lastResult.creatorShare} Pts)!
              </div>
            )
          ) : (
            <div className="text-[11px] text-zinc-400">
              १०% सम्भावना: २x, ५x वा १०x मल्टिप्लायर • ९०% सामान्य गिफ्ट
            </div>
          )}
        </div>
      </div>

      {/* ५. स्पिन / गिफ्ट पठाउने बटन */}
      <button
        type="button"
        id="btn-spin-lucky-gift"
        disabled={isSpinning || balance < selectedTier.price}
        onClick={handleLuckySpin}
        className={`w-full py-3.5 px-4 rounded-xl font-black text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg ${
          isSpinning || balance < selectedTier.price
            ? 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
            : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black hover:brightness-110 active:scale-[0.99] shadow-amber-500/25'
        }`}
      >
        <Sparkles className="h-4 w-4" />
        <span>
          {isSpinning
            ? 'स्पिन भइरहेको छ...'
            : balance < selectedTier.price
            ? 'पर्याप्त कोइन छैन'
            : `Send Lucky Gift (${selectedTier.price.toLocaleString()} Coins) 🚀`}
        </span>
      </button>

      {/* ६. बिजनेस मोडल र कमिसन नियम (Math Breakdown) */}
      <div className="rounded-xl bg-zinc-900/60 border border-white/5 p-3 text-[10px] text-zinc-400 space-y-1">
        <div className="font-bold text-zinc-300 flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-amber-400" />
          <span>नियम र बाँडफाँड (House-Edge Guaranteed):</span>
        </div>
        <p>• <strong>क्रिएटर (७०%):</strong> खेलाडीले जिते पनि हारे पनि क्रिएटरले ७०% (७०० कोइन) अनिवार्य पाउँछन्।</p>
        <p>• <strong>प्लेटफर्म (१०% मुनाफा + २०% रिजर्भ):</strong> १०% प्लेटफर्मको नाफा, २०% रिजर्भ पुलमा जम्मा हुन्छ।</p>
        <p>• <strong>१०% सम्भावना जीत:</strong> जीतको भुक्तानी केवल रिजर्भ पुलबाट हुन्छ (कहिले पनि घाटा हुँदैन)।</p>
      </div>

      {/* ७. हालैका लक्की स्पिन्स हिस्ट्री (Spin History) */}
      {history.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-bold">
            <span className="flex items-center gap-1">
              <History className="h-3 w-3" />
              <span>हालैका नतिजाहरू (History)</span>
            </span>
            <span className="text-[10px] text-zinc-500">{history.length} कारोबार</span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-white/5 text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${item.isWin ? 'text-emerald-400 font-black' : 'text-zinc-400'}`}>
                    {item.isWin ? `🎉 ${item.multiplier}x` : '0x'}
                  </span>
                  <span className="text-zinc-300 font-medium">{item.giftName}</span>
                </div>

                <div className="text-right">
                  <div className={`font-bold ${item.isWin ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {item.isWin ? `+${item.winAmount.toLocaleString()}` : `-${item.betAmount.toLocaleString()}`}
                  </div>
                  <div className="text-[9px] text-zinc-500">
                    होस्ट: +{item.creatorShare} Pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LuckyGiftSystem;
