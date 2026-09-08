import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Ad, AdSettings } from '../types';
import { INITIAL_FULLSCREEN_ADS, INITIAL_BANNER_ADS, ADMOB_TEST_CONFIG, ADMOB_LIVE_CONFIG } from '../data/initialData';

interface AdContextType {
  adSettings: AdSettings;
  validWatchedCount: number;
  isFullScreenAdVisible: boolean;
  currentFullScreenAd: Ad | null;
  currentBannerAd: Ad | null;
  isAppVisible: boolean; // True when app is in active foreground and window is focused
  isTestMode: boolean;
  isSecurityLockActive: boolean;
  securityCooldownRemaining: number;
  getActiveAdMobAppId: () => string;
  getActiveBannerUnitId: () => string;
  getActiveRewardedUnitId: () => string;
  claimVideoReward: (
    videoId: string,
    watchDurationSeconds: number,
    videoDurationSeconds?: number,
    isFullWatch?: boolean
  ) => Promise<{
    success: boolean;
    pointsAwarded?: number;
    error?: string;
    isCooldown?: boolean;
    cooldownRemainingSeconds?: number;
    securityLockActive?: boolean;
    newTotalPoints?: number;
  }>;
  registerValidView: (videoId: string, durationSeconds?: number) => Promise<boolean>;
  dismissFullScreenAd: (claimedReward?: boolean) => void;
  triggerFullScreenAdManually: () => void;
  trackAdImpression: (adId: string, videoId?: string) => Promise<void>;
  trackAdClick: (adId: string, destinationUrl: string, videoId?: string) => Promise<void>;
  fetchNextBannerAd: (avoidId?: string) => Promise<Ad | null>;
  updateSettings: (newSettings: Partial<AdSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

export const AdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adSettings, setAdSettings] = useState<AdSettings>({
    fullscreenAdInterval: 10,
    validViewThresholdSeconds: 10.0, // 10.0 seconds strictly enforced
    bannerRefreshSeconds: 20,
    enableAds: true,
    isTestMode: false,
    adFrequencyCooldownSeconds: 45,
    bannerRewardPoints: 50,
    rewardCooldownSeconds: 10.0,
    autoClickerMaxBurstPer10s: 3,
    securityLockDurationSeconds: 15,
    strictForegroundValidation: true,
    adMobAppId: ADMOB_LIVE_CONFIG.appId,
    adMobBannerUnitId: ADMOB_LIVE_CONFIG.bannerUnitId,
    adMobRewardedUnitId: ADMOB_LIVE_CONFIG.rewardedUnitId,
    adMobTestAppId: ADMOB_TEST_CONFIG.appId,
    adMobTestBannerUnitId: ADMOB_TEST_CONFIG.bannerUnitId,
    adMobTestRewardedUnitId: ADMOB_TEST_CONFIG.rewardedUnitId,
    bannerCpm: 3.50,
    bannerCpc: 0.20,
    fullscreenCpm: 9.00,
    fullscreenCpc: 0.50,
    creatorSharePercent: 55,
    platformSharePercent: 45,
    minPayoutThreshold: 20.00,
    enableMonetization: true,
  });

  const [validWatchedCount, setValidWatchedCount] = useState<number>(0);
  const [isFullScreenAdVisible, setIsFullScreenAdVisible] = useState<boolean>(false);
  const [currentFullScreenAd, setCurrentFullScreenAd] = useState<Ad | null>(null);
  const [currentBannerAd, setCurrentBannerAd] = useState<Ad | null>(null);
  const [isAppVisible, setIsAppVisible] = useState<boolean>(true);
  const [isSecurityLockActive, setIsSecurityLockActive] = useState<boolean>(false);
  const [securityCooldownRemaining, setSecurityCooldownRemaining] = useState<number>(0);

  // Keep track of which video IDs have already been counted in the current streak to prevent double counting on loops
  const countedVideoIdsRef = useRef<Set<string>>(new Set());
  // Client-side recent ads map to prevent duplicate ads
  const recentAdsMapRef = useRef<Map<string, number>>(new Map());
  // Client-side anti-burst click tracker
  const clickBurstTimestampsRef = useRef<number[]>([]);

  // Safety Logic 1: Listen for tab switch, window blur, and backgrounding
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setIsAppVisible(isVisible);
    };

    const handleWindowFocus = () => setIsAppVisible(true);
    const handleWindowBlur = () => setIsAppVisible(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  const isTestMode = Boolean(adSettings.isTestMode);

  const getActiveAdMobAppId = useCallback(() => {
    if (adSettings.isTestMode) {
      return adSettings.adMobTestAppId || ADMOB_TEST_CONFIG.appId;
    }
    return adSettings.adMobAppId || ADMOB_LIVE_CONFIG.appId;
  }, [adSettings]);

  const getActiveBannerUnitId = useCallback(() => {
    if (adSettings.isTestMode) {
      return adSettings.adMobTestBannerUnitId || ADMOB_TEST_CONFIG.bannerUnitId;
    }
    return adSettings.adMobBannerUnitId || ADMOB_LIVE_CONFIG.bannerUnitId;
  }, [adSettings]);

  const getActiveRewardedUnitId = useCallback(() => {
    if (adSettings.isTestMode) {
      return adSettings.adMobTestRewardedUnitId || ADMOB_TEST_CONFIG.rewardedUnitId;
    }
    return adSettings.adMobRewardedUnitId || ADMOB_LIVE_CONFIG.rewardedUnitId;
  }, [adSettings]);

  // Fetch Settings on mount
  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/ads/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setAdSettings(prev => ({ ...prev, ...data.settings }));
        }
      }
    } catch {
      // fallback to initial state
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Fetch a banner ad with frequency capping and rotation
  const fetchNextBannerAd = useCallback(async (avoidId?: string): Promise<Ad | null> => {
    // Safety check: do not fetch new ads if window is in background
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return null;
    }

    try {
      const url = avoidId ? `/api/ads/banner?avoidAdId=${encodeURIComponent(avoidId)}` : '/api/ads/banner';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.ad) {
          setCurrentBannerAd(data.ad);
          recentAdsMapRef.current.set(data.ad.id, Date.now());
          return data.ad;
        }
      }
    } catch {
      // fallback
    }

    // Fallback rotation from local bundle
    const fallbackPool = INITIAL_BANNER_ADS.filter(a => a.id !== avoidId);
    const fallbackAd = fallbackPool.length > 0 ? fallbackPool[Math.floor(Math.random() * fallbackPool.length)] : INITIAL_BANNER_ADS[0];
    if (fallbackAd) {
      setCurrentBannerAd(fallbackAd);
    }
    return fallbackAd || null;
  }, []);

  // Fetch an initial banner on mount
  useEffect(() => {
    fetchNextBannerAd();
  }, [fetchNextBannerAd]);

  // Fetch full screen ad from API with fallback
  const fetchFullScreenAd = useCallback(async (avoidId?: string): Promise<Ad | null> => {
    try {
      const url = avoidId ? `/api/ads/fullscreen?avoidAdId=${encodeURIComponent(avoidId)}` : '/api/ads/fullscreen';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.ad) return data.ad;
      }
    } catch {
      // handle error gracefully without hanging the app
    }
    // Fallback ad
    const fallbackPool = INITIAL_FULLSCREEN_ADS.filter(a => a.id !== avoidId);
    return fallbackPool.length > 0 ? fallbackPool[0] : INITIAL_FULLSCREEN_ADS[0];
  }, []);

  // Track Impression (only when active in foreground)
  const trackAdImpression = async (adId: string, videoId?: string) => {
    if (!adId) return;
    // Safety Logic: Do not fire impressions if page is in background
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    try {
      await fetch(`/api/ads/${adId}/impression`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
    } catch {
      // silently handle
    }
  };

  // Track Click
  const trackAdClick = async (adId: string, destinationUrl: string, videoId?: string) => {
    if (!adId) return;
    try {
      await fetch(`/api/ads/${adId}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
    } catch {
      // silently handle
    }
    if (destinationUrl) {
      window.open(destinationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Cooldown countdown tick-down
  useEffect(() => {
    if (!isSecurityLockActive || securityCooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecurityCooldownRemaining(prev => {
        if (prev <= 1) {
          setIsSecurityLockActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSecurityLockActive, securityCooldownRemaining]);

  // Secure Video Reward Claim (Strict Full Watch rule with Anti-Cheat & Spam Prevention)
  const claimVideoReward = async (
    videoId: string,
    watchDurationSeconds: number,
    videoDurationSeconds?: number,
    isFullWatch: boolean = true
  ): Promise<{
    success: boolean;
    pointsAwarded?: number;
    error?: string;
    isCooldown?: boolean;
    cooldownRemainingSeconds?: number;
    securityLockActive?: boolean;
    newTotalPoints?: number;
  }> => {
    if (!videoId) return { success: false, error: 'भिडियो पहिचान हुन सकेन' };

    // 1. Client-side Visibility Check
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return {
        success: false,
        error: 'भिडियो ब्याकग्राउन्डमा हुँदा पोइन्ट पाइँदैन। स्क्रिनमा हेर्नुहोस्।',
      };
    }

    // 2. User Intent Enforcement: "प्रत्येक 5 sec १० Sec मा points दिने मा हैन vedo full watch गर्नु पर्छ"
    if (!isFullWatch) {
      return {
        success: false,
        error: '५ वा १० सेकेन्डमा होइन, भिडियो १००% पूरा (Full Watch) गरेपछि मात्र पोइन्ट पाइन्छ!',
      };
    }

    // Check genuine watch duration to block instant scrubber skip to end
    const expectedSec = videoDurationSeconds && videoDurationSeconds > 0 ? videoDurationSeconds : (adSettings.validViewThresholdSeconds || 10.0);
    const minRequiredWatch = Math.max(3.0, Math.min(expectedSec * 0.75, expectedSec - 0.5));
    if (watchDurationSeconds < minRequiredWatch) {
      return {
        success: false,
        error: `भिडियो स्किप नगरी अन्त्यसम्म पूरा (Full Watch) हेर्नुपर्छ। तपाईंले ${watchDurationSeconds.toFixed(1)}s मात्र हेर्नुभयो।`,
      };
    }

    // 3. Client-side Burst Protection
    const now = Date.now();
    clickBurstTimestampsRef.current = clickBurstTimestampsRef.current.filter(t => now - t < 10000);
    clickBurstTimestampsRef.current.push(now);

    if (clickBurstTimestampsRef.current.length > (adSettings.autoClickerMaxBurstPer10s || 3)) {
      setIsSecurityLockActive(true);
      setSecurityCooldownRemaining(adSettings.securityLockDurationSeconds || 15);
      return {
        success: false,
        securityLockActive: true,
        cooldownRemainingSeconds: adSettings.securityLockDurationSeconds || 15,
        error: `⚠️ तीव्र स्पाम वा अटो-क्लिकर पत्ता लाग्यो! सुरक्षाका लागि ${adSettings.securityLockDurationSeconds || 15} सेकेन्ड कुल्डाउन लगाइएको छ।`,
      };
    }

    // 4. Send secure verification request to backend
    try {
      const res = await fetch('/api/rewards/claim-video-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          watchDurationSeconds,
          videoDurationSeconds: expectedSec,
          isFullWatch: true,
          clientNonce: `nonce_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        })
      });

      const data = await res.json();

      if (res.status === 429 || data.securityLockActive) {
        setIsSecurityLockActive(true);
        setSecurityCooldownRemaining(data.cooldownRemainingSeconds || 15);
      }

      return data;
    } catch {
      return {
        success: false,
        error: 'सर्भरसँग सम्पर्क हुन सकेन। कृपया पुनः प्रयास गर्नुहोस्।'
      };
    }
  };

  // Register a valid video view (strictly when genuine watch duration >= 10.0s)
  const registerValidView = async (videoId: string, durationSeconds = 10.0): Promise<boolean> => {
    if (!videoId) return false;

    // Safety check: do not count if window is inactive
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return false;
    }

    // Anti-Cheat: Require at least 10 seconds of actual playback
    const minThreshold = adSettings.validViewThresholdSeconds || 10.0;
    if (durationSeconds < minThreshold) {
      return false;
    }

    // Check if video is already counted in this 10-video cycle
    if (countedVideoIdsRef.current.has(videoId)) {
      return false;
    }

    countedVideoIdsRef.current.add(videoId);

    // Track view on server
    try {
      await fetch(`/api/videos/${videoId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationSeconds }),
      });
    } catch {
      // ignore
    }

    const nextCount = validWatchedCount + 1;
    setValidWatchedCount(nextCount);

    // Check if we reached the full-screen ad threshold (10 genuine videos)
    if (adSettings.enableAds && nextCount >= (adSettings.fullscreenAdInterval || 10)) {
      try {
        const ad = await fetchFullScreenAd();
        if (ad) {
          setCurrentFullScreenAd(ad);
          setIsFullScreenAdVisible(true);
          trackAdImpression(ad.id);
        } else {
          // If no ad available, reset safely
          setValidWatchedCount(0);
          countedVideoIdsRef.current.clear();
        }
      } catch {
        // Safe fallback: reset counter so user is never stuck
        setValidWatchedCount(0);
        countedVideoIdsRef.current.clear();
      }
      return true;
    }

    return false;
  };

  // Dismiss Full-Screen Ad and reset counter after viewing
  const dismissFullScreenAd = (claimedReward = true) => {
    setIsFullScreenAdVisible(false);
    setCurrentFullScreenAd(null);
    if (claimedReward) {
      // Reset the counter back to 0 only after completing or dismissing
      setValidWatchedCount(0);
      countedVideoIdsRef.current.clear();
    }
  };

  // Manual trigger for testing/admin preview
  const triggerFullScreenAdManually = async () => {
    const ad = await fetchFullScreenAd();
    if (ad) {
      setCurrentFullScreenAd(ad);
      setIsFullScreenAdVisible(true);
      trackAdImpression(ad.id);
    }
  };

  const updateSettings = async (newSettings: Partial<AdSettings>) => {
    try {
      const res = await fetch('/api/ads/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        const data = await res.json();
        setAdSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch {
      // ignore
    }
  };

  return (
    <AdContext.Provider
      value={{
        adSettings,
        validWatchedCount,
        isFullScreenAdVisible,
        currentFullScreenAd,
        currentBannerAd,
        isAppVisible,
        isTestMode,
        isSecurityLockActive,
        securityCooldownRemaining,
        getActiveAdMobAppId,
        getActiveBannerUnitId,
        getActiveRewardedUnitId,
        claimVideoReward,
        registerValidView,
        dismissFullScreenAd,
        triggerFullScreenAdManually,
        trackAdImpression,
        trackAdClick,
        fetchNextBannerAd,
        updateSettings,
        refreshSettings,
      }}
    >
      {children}
    </AdContext.Provider>
  );
};

export const useAds = () => {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAds must be used within an AdProvider');
  }
  return context;
};
