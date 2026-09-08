import React, { useEffect, useState, useRef } from 'react';
import { ExternalLink, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAds } from '../context/AdContext';
import { INITIAL_BANNER_ADS, ADMOB_CONFIG } from '../data/initialData';
import { Ad } from '../types';

interface PersistentBannerAdProps {
  position?: 'top' | 'bottom';
}

export const PersistentBannerAd: React.FC<PersistentBannerAdProps> = ({ position = 'top' }) => {
  const { currentBannerAd, fetchNextBannerAd, trackAdImpression, trackAdClick, adSettings } = useAds();
  const [activeAd, setActiveAd] = useState<Ad>(currentBannerAd || INITIAL_BANNER_ADS[0]);
  const impressionTrackedRef = useRef<string | null>(null);

  // Sync with context or fallback
  useEffect(() => {
    if (currentBannerAd) {
      setActiveAd(currentBannerAd);
    } else {
      setActiveAd(INITIAL_BANNER_ADS[0]);
    }
  }, [currentBannerAd]);

  // Periodic rotation
  useEffect(() => {
    const refreshSec = adSettings?.bannerRefreshSeconds || 20;
    const interval = setInterval(async () => {
      const next = await fetchNextBannerAd(activeAd?.id);
      if (next) {
        setActiveAd(next);
      } else {
        // Rotate local fallback
        const currentIndex = INITIAL_BANNER_ADS.findIndex(a => a.id === activeAd?.id);
        const nextIndex = (currentIndex + 1) % INITIAL_BANNER_ADS.length;
        setActiveAd(INITIAL_BANNER_ADS[nextIndex]);
      }
    }, refreshSec * 1000);

    return () => clearInterval(interval);
  }, [activeAd, fetchNextBannerAd, adSettings?.bannerRefreshSeconds]);

  // Track impression
  useEffect(() => {
    if (activeAd && impressionTrackedRef.current !== activeAd.id) {
      impressionTrackedRef.current = activeAd.id;
      trackAdImpression(activeAd.id);
    }
  }, [activeAd, trackAdImpression]);

  if (!activeAd || !adSettings?.enableAds) return null;

  const bannerUnitId = activeAd.adMobUnitId || adSettings?.adMobBannerUnitId || ADMOB_CONFIG.bannerUnitId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackAdClick(activeAd.id, activeAd.destinationUrl);
  };

  return (
    <div
      id={`persistent-admob-banner-${position}`}
      onClick={handleClick}
      className={`w-full z-40 bg-zinc-950/95 border-y border-amber-500/20 px-3 py-1.5 text-white backdrop-blur-xl shadow-lg transition-all hover:bg-zinc-900 cursor-pointer select-none ${
        position === 'top' ? 'relative' : 'relative'
      }`}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2.5">
        {/* AdMob Visual & Text */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Ad Image / Icon */}
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-amber-500/30 bg-zinc-800 shadow-sm">
            <img
              src={activeAd.mediaUrl || activeAd.sponsorLogo}
              alt={activeAd.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <span className="absolute bottom-0 right-0 rounded-tl bg-amber-500 px-1 py-0.2 text-[7px] font-black tracking-wider text-black uppercase">
              AD
            </span>
          </div>

          {/* Ad Description */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-bold text-white">
                {activeAd.title}
              </span>
              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/20 px-1 py-0.2 text-[8px] font-bold text-emerald-400 border border-emerald-500/30 shrink-0">
                <ShieldCheck className="h-2 w-2" />
                AdMob Banner
              </span>
            </div>
            <p className="truncate text-[10px] text-zinc-400">
              {activeAd.description || activeAd.sponsorName}
            </p>
          </div>
        </div>

        {/* Action Button & Unit ID */}
        <div className="shrink-0 flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end text-[8px] text-zinc-500 font-mono">
            <span>Unit: {bannerUnitId.slice(0, 14)}...</span>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400 to-yellow-400 px-2.5 py-1 text-[11px] font-black text-black shadow hover:brightness-110 active:scale-95 transition-all"
          >
            <span>{activeAd.ctaText || 'Learn More'}</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
