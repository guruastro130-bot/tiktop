import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Sparkles, Clock, ArrowRight, Award, ShieldCheck, CheckCircle2, Bug } from 'lucide-react';
import { Ad } from '../types';
import { useAds } from '../context/AdContext';
import { ADMOB_LIVE_CONFIG, ADMOB_TEST_CONFIG } from '../data/initialData';

interface FullScreenAdModalProps {
  ad: Ad | null;
  isOpen: boolean;
  onClose: (claimed?: boolean) => void;
}

export const FullScreenAdModal: React.FC<FullScreenAdModalProps> = ({ ad, isOpen, onClose }) => {
  const { trackAdClick, adSettings, isAppVisible, isTestMode } = useAds();
  const [countdown, setCountdown] = useState<number>(5);
  const [canSkip, setCanSkip] = useState<boolean>(false);
  const [rewardClaimed, setRewardClaimed] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setCountdown(5);
      setCanSkip(false);
      setRewardClaimed(false);

      // Only decrement countdown if app is visible in foreground
      const timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return; // Pause countdown while in background
        }

        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanSkip(true);
            setRewardClaimed(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen || !ad) return null;

  const rewardedUnitId = ad.adMobUnitId || (isTestMode ? adSettings?.adMobTestRewardedUnitId || ADMOB_TEST_CONFIG.rewardedUnitId : adSettings?.adMobRewardedUnitId || ADMOB_LIVE_CONFIG.rewardedUnitId);

  const handleCtaClick = () => {
    trackAdClick(ad.id, ad.destinationUrl);
  };

  const handleClose = () => {
    onClose(rewardClaimed);
  };

  return (
    <div
      id="fullscreen-ad-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 text-white backdrop-blur-2xl animate-fade-in"
    >
      <div className="relative flex h-full w-full max-w-lg flex-col justify-between overflow-hidden bg-zinc-950 p-4 sm:p-6 sm:rounded-3xl sm:border sm:border-white/10 sm:max-h-[92vh] sm:shadow-2xl">
        
        {/* Top Bar Header with AdMob Info */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-amber-400/40 bg-zinc-800 shadow-md">
              <img
                src={ad.sponsorLogo || ad.mediaUrl}
                alt={ad.sponsorName}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-bold text-white tracking-wide">{ad.sponsorName}</p>
                {isTestMode ? (
                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/40">
                    <Bug className="h-2.5 w-2.5" />
                    Test Rewarded Ad
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    AdMob Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                  <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                  🎁 पुरस्कृत विज्ञापन (Rewarded Ad Only)
                </span>
              </div>
            </div>
          </div>

          {/* Skip / Close Button with Countdown */}
          <div className="flex items-center gap-2">
            {!canSkip ? (
              <div className="flex items-center gap-1.5 rounded-full bg-black/60 border border-white/20 px-3 py-1 text-xs font-medium text-amber-300 backdrop-blur-md">
                <Clock className="h-3 w-3 animate-spin text-amber-400" />
                <span>Reward in {countdown}s</span>
              </div>
            ) : (
              <button
                id="close-fullscreen-ad-btn"
                type="button"
                onClick={handleClose}
                className="flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 text-xs font-bold text-black hover:brightness-110 active:scale-95 transition-all shadow-lg"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Claim & Continue</span>
                <X className="h-3 w-3 ml-0.5" />
              </button>
            )}
          </div>
        </div>

        {/* Milestone Rewarded Badge Banner */}
        <div className="mt-2.5 flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-xs text-amber-300">
            <Award className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="font-semibold">Milestone Unlocked:</span>
            <span className="text-amber-200">10 of 10 videos watched</span>
          </div>
          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
            Unit: {rewardedUnitId ? `${rewardedUnitId.slice(0, 18)}...` : 'AdMob'}
          </span>
        </div>

        {/* Center Ad Visual / Media */}
        <div className="relative my-3 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-inner flex items-center justify-center">
          <img
            src={ad.mediaUrl}
            alt={ad.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

          {/* Overlay Text Inside Media */}
          <div className="absolute bottom-4 left-4 right-4 text-left">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-block rounded bg-amber-400 text-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow">
                {isTestMode ? 'Google AdMob Test Mode' : 'Featured AdMob Sponsor'}
              </span>
              {rewardClaimed && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/90 text-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  <CheckCircle2 className="h-3 w-3" />
                  +50 Coins Earned
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
              {ad.title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-zinc-300 line-clamp-3 drop-shadow">
              {ad.description}
            </p>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-2.5 z-10">
          <button
            id="fullscreen-ad-cta-btn"
            type="button"
            onClick={handleCtaClick}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 py-3.5 text-sm sm:text-base font-bold text-black shadow-xl hover:brightness-110 active:scale-98 transition-all"
          >
            <span>{ad.ctaText || 'Claim Special Offer'}</span>
            <ExternalLink className="h-4 w-4" />
          </button>

          <button
            id="fullscreen-ad-dismiss-btn"
            type="button"
            onClick={handleClose}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <span>{canSkip ? 'Continue to next short video' : `Resume video in ${countdown}s`}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
