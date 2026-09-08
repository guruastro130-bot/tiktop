import React, { useEffect, useRef } from 'react';
import { ExternalLink, Sparkles, ShieldCheck, Bug } from 'lucide-react';
import { Ad } from '../types';
import { useAds } from '../context/AdContext';
import { ADMOB_LIVE_CONFIG, ADMOB_TEST_CONFIG } from '../data/initialData';

interface BannerAdProps {
  ad: Ad | null;
  onRotateNextAd?: () => void;
  isLongVideo?: boolean;
}

export const BannerAd: React.FC<BannerAdProps> = ({ ad, onRotateNextAd, isLongVideo }) => {
  const { trackAdImpression, trackAdClick, adSettings, isAppVisible, isTestMode } = useAds();
  const impressionTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    // Safety check: Only track impression if app is in active foreground
    if (ad && isAppVisible && impressionTrackedRef.current !== ad.id) {
      impressionTrackedRef.current = ad.id;
      trackAdImpression(ad.id);
    }
  }, [ad, isAppVisible, trackAdImpression]);

  if (!ad || !ad.isActive) return null;

  const bannerUnitId = ad.adMobUnitId || (isTestMode ? adSettings?.adMobTestBannerUnitId || ADMOB_TEST_CONFIG.bannerUnitId : adSettings?.adMobBannerUnitId || ADMOB_LIVE_CONFIG.bannerUnitId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackAdClick(ad.id, ad.destinationUrl);
  };

  return (
    <div
      id={`banner-ad-${ad.id}`}
      onClick={handleClick}
      className="relative mx-3 mb-2 flex items-center justify-between gap-2.5 rounded-xl border border-amber-400/30 bg-black/75 px-3 py-2 text-white shadow-xl backdrop-blur-md transition-all hover:border-amber-400/60 hover:bg-black/85 cursor-pointer select-none"
    >
      {/* Left Media & Info */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Ad Image / Icon */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-amber-400/30 bg-zinc-800">
          <img
            src={ad.mediaUrl || ad.imageUrl || ad.sponsorLogo}
            alt={ad.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <span className="absolute bottom-0 right-0 rounded-tl bg-amber-500 px-1 py-0.2 text-[8px] font-black tracking-wider text-black uppercase">
            AD
          </span>
        </div>

        {/* Text Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="truncate text-xs font-bold text-white/95">
              {ad.title || ad.brand}
            </span>
            {isLongVideo && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.2 text-[8px] font-bold text-rose-300 shrink-0">
                Mid-Roll
              </span>
            )}
            {isTestMode ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[8px] font-bold text-amber-300 shrink-0">
                <Bug className="h-2 w-2" />
                Test Ad
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400 shrink-0">
                <ShieldCheck className="h-2 w-2" />
                AdMob
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-white/75">
            {ad.description || ad.sponsorName || ad.brand}
          </p>
        </div>
      </div>

      {/* CTA Button and Next Ad Button */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onRotateNextAd && isLongVideo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRotateNextAd();
            }}
            title="अर्को विज्ञापन हेर्नुहोस् (Next Ad)"
            className="flex items-center gap-1 rounded-lg bg-zinc-800/90 border border-white/20 px-2 py-1.5 text-[10px] font-bold text-amber-300 hover:bg-zinc-700 active:scale-95 transition-all"
          >
            <Sparkles className="h-2.5 w-2.5 text-amber-400" />
            <span>अर्को Add</span>
          </button>
        )}
        <button
          id={`banner-cta-btn-${ad.id}`}
          type="button"
          onClick={handleClick}
          className="shrink-0 flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 px-2.5 py-1.5 text-xs font-black text-black shadow hover:brightness-110 active:scale-95 transition-transform"
        >
          <span className="whitespace-nowrap">{ad.ctaText || 'Learn More'}</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

