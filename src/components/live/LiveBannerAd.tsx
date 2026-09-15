import React, { useState, useEffect } from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';
import { Ad } from '../../types';
import { useAds } from '../../context/AdContext';

interface LiveBannerAdProps {
  initialAd?: Ad;
  hostUsername?: string;
  isPersonDetected?: boolean;
  onAdClicked?: (ad: Ad) => void;
}

const DEFAULT_LIVE_ADS: Ad[] = [
  {
    id: 'live_ad_esewa',
    title: 'eSewa Nepal - Instant Mobile Recharge & Movie Tickets',
    brand: 'eSewa Nepal 🇳🇵',
    sponsorName: 'eSewa Nepal 🇳🇵',
    sponsorLogo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=100&auto=format&fit=crop&q=80',
    description: 'Send money instantly across Nepal with 0% transfer charges.',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    ctaText: 'Open eSewa',
    targetUrl: 'https://esewa.com.np',
    destinationUrl: 'https://esewa.com.np',
    type: 'banner',
    isActive: true,
    active: true,
    priority: 10,
    impressions: 4800,
    clicks: 340,
    impressionRewardPoints: 15,
    clickRewardPoints: 60,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'live_ad_khalti',
    title: 'Khalti Digital Wallet - 10% Flight Cashback & Utility Pay',
    brand: 'Khalti Nepal ⚡',
    sponsorName: 'Khalti Nepal ⚡',
    sponsorLogo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80',
    description: 'Pay electricity, water, internet bills & earn bonus Khalti points.',
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80',
    ctaText: 'Get Khalti',
    targetUrl: 'https://khalti.com',
    destinationUrl: 'https://khalti.com',
    type: 'banner',
    isActive: true,
    active: true,
    priority: 9,
    impressions: 3900,
    clicks: 290,
    impressionRewardPoints: 15,
    clickRewardPoints: 60,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'live_ad_daraz',
    title: 'Daraz Mega Sale - Flat 50% Off & Free Delivery Across Nepal',
    brand: 'Daraz Shopping 🛍️',
    sponsorName: 'Daraz Shopping 🛍️',
    sponsorLogo: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=100&auto=format&fit=crop&q=80',
    description: 'Shop latest electronics, winter fashion and lifestyle goods today.',
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80',
    ctaText: 'Shop Now',
    targetUrl: 'https://daraz.com.np',
    destinationUrl: 'https://daraz.com.np',
    type: 'banner',
    isActive: true,
    active: true,
    priority: 8,
    impressions: 5200,
    clicks: 410,
    impressionRewardPoints: 15,
    clickRewardPoints: 60,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'live_ad_ntc',
    title: 'Nepal Telecom 4G Data Pack - Nonstop Social & Live Stream',
    brand: 'Nepal Telecom 📶',
    sponsorName: 'Nepal Telecom 📶',
    sponsorLogo: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=100&auto=format&fit=crop&q=80',
    description: 'Activate 10GB streaming pack starting at just Rs. 99.',
    imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80',
    ctaText: 'View Packs',
    targetUrl: 'https://ntc.net.np',
    destinationUrl: 'https://ntc.net.np',
    type: 'banner',
    isActive: true,
    active: true,
    priority: 7,
    impressions: 2800,
    clicks: 195,
    impressionRewardPoints: 15,
    clickRewardPoints: 60,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const LiveBannerAd: React.FC<LiveBannerAdProps> = ({
  initialAd,
  hostUsername,
  isPersonDetected = true,
  onAdClicked,
}) => {
  const { recordAdImpression, recordAdClick } = useAds();
  const [currentAdIndex, setCurrentAdIndex] = useState<number>(0);
  const [ads] = useState<Ad[]>(initialAd ? [initialAd, ...DEFAULT_LIVE_ADS] : DEFAULT_LIVE_ADS);

  const activeAd = ads[currentAdIndex % ads.length];

  // Rotate banner ads every 16 seconds during live stream ONLY IF person is detected
  useEffect(() => {
    if (!isPersonDetected) return;

    if (activeAd) {
      recordAdImpression(activeAd.id);
    }

    const interval = setInterval(() => {
      setCurrentAdIndex(prev => (prev + 1) % ads.length);
    }, 16000);

    return () => clearInterval(interval);
  }, [activeAd, ads.length, recordAdImpression, isPersonDetected]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeAd || !isPersonDetected) return;
    recordAdClick(activeAd.id);
    if (onAdClicked) {
      onAdClicked(activeAd);
    }
    if (activeAd.targetUrl) {
      window.open(activeAd.targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // If no person detected, show paused ad indicator
  if (!isPersonDetected) {
    return (
      <div
        id="live-banner-ad-paused"
        className="relative w-full max-w-sm mx-auto flex items-center justify-between gap-2 overflow-hidden rounded-full border border-rose-500/40 bg-black/60 px-2.5 py-1 text-white shadow-sm backdrop-blur-md select-none animate-pulse"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500 animate-ping" />
          <span className="text-[10px] font-bold text-rose-300 whitespace-nowrap">
            ⏸️ विज्ञापन रोकियो (Ad Paused)
          </span>
          <span className="text-[9px] text-zinc-400 truncate hidden sm:inline">
            मानिस नदेखिएकाले
          </span>
        </div>
        <span className="rounded-full bg-rose-500/20 border border-rose-400/30 px-1.5 py-0.2 text-[8px] font-bold text-rose-200 shrink-0">
          PAUSED
        </span>
      </div>
    );
  }

  if (!activeAd) return null;

  return (
    <div
      id="live-top-banner-ad"
      onClick={handleClick}
      className="relative w-full max-w-sm mx-auto flex items-center justify-between gap-2 overflow-hidden rounded-full border border-white/10 bg-black/50 hover:bg-black/70 px-2 py-0.5 text-white shadow-sm backdrop-blur-md transition-all active:scale-[0.99] cursor-pointer group select-none"
    >
      <div className="flex items-center gap-1.5 min-w-0 z-10">
        {/* Ad Thumbnail / Icon */}
        <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full border border-amber-400/40 bg-zinc-800">
          <img
            src={activeAd.imageUrl}
            alt={activeAd.brand}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Text Details */}
        <div className="min-w-0 flex items-center gap-1">
          <span className="text-[10px] font-bold text-amber-300 truncate max-w-[90px] sm:max-w-[130px]">
            {activeAd.brand}
          </span>
          <span className="text-zinc-500 text-[10px]">•</span>
          <p className="text-[9.5px] font-normal text-zinc-300 truncate max-w-[120px] sm:max-w-[160px]">
            {activeAd.title}
          </p>
        </div>
      </div>

      {/* Subtle CTA Pill */}
      <div className="shrink-0 z-10 flex items-center pr-1">
        <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold text-amber-300/90 bg-amber-400/10 border border-amber-400/20 rounded-full px-1.5 py-0.2">
          <span>{activeAd.ctaText || 'Open'}</span>
          <ExternalLink className="h-2 w-2" />
        </span>
      </div>
    </div>
  );
};
