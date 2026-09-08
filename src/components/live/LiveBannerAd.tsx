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

  // If no person detected, immediately pause and display ad-paused notice
  if (!isPersonDetected) {
    return (
      <div className="relative mx-3 my-1.5 flex items-center justify-between gap-2 overflow-hidden rounded-xl border border-rose-500/40 bg-rose-950/80 px-3 py-2 text-white shadow-lg backdrop-blur-md animate-fade-in">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <div>
            <p className="text-[11px] font-black text-rose-200">
              🛑 मानिस नदेखिएकोले Banner Ad रोकियो
            </p>
            <p className="text-[9px] text-zinc-300">
              क्यामेरा अगाडि मानिस देखिएपछि मात्र विज्ञापन चल्नेछ • लाइभमा ब्यानर हेरेबापत पोइन्ट प्राप्त हुँदैन (0 Pts)
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-black/60 border border-white/15 px-2 py-0.5 text-[9px] font-black text-rose-300">
          AD PAUSED
        </span>
      </div>
    );
  }

  if (!activeAd) return null;

  return (
    <div
      onClick={handleClick}
      className="relative mx-3 my-1.5 flex items-center justify-between gap-2.5 overflow-hidden rounded-xl border border-white/15 bg-zinc-900/90 p-2 text-white shadow-lg backdrop-blur-md transition-all hover:border-amber-400/50 active:scale-[0.99] cursor-pointer group select-none"
    >
      {/* Background subtle brand accent gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent pointer-events-none" />

      <div className="flex items-center gap-2.5 min-w-0 z-10">
        {/* Ad Thumbnail / Icon */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-800">
          <img
            src={activeAd.imageUrl}
            alt={activeAd.brand}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <span className="absolute bottom-0 left-0 right-0 bg-amber-500 text-[8px] font-black text-black text-center leading-tight">
            AD
          </span>
        </div>

        {/* Text Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-extrabold text-amber-300 truncate">
              {activeAd.brand}
            </span>
            <span className="rounded bg-amber-400/20 px-1 py-0.2 text-[9px] font-bold text-amber-300 flex items-center gap-0.5">
              <Sparkles className="h-2 w-2" /> Live Sponsor (० पोइन्ट)
            </span>
          </div>
          <p className="text-[11px] font-medium text-zinc-200 line-clamp-1 leading-snug">
            {activeAd.title}
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <div className="shrink-0 z-10 flex items-center gap-1">
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 px-2.5 py-1 text-[11px] font-extrabold text-white shadow hover:from-amber-400 hover:to-rose-400 active:scale-95 transition-all"
        >
          <span>{activeAd.ctaText || 'खोज्नुहोस्'}</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
};
