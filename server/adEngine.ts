import { db } from './db';
import { Ad, AdSettings } from '../src/types';
import { ADMOB_LIVE_CONFIG, ADMOB_TEST_CONFIG } from './data';

export class AdEngine {
  // Frequency capping tracking: Map<clientId:adId, lastShownTimestamp>
  private clientAdHistory: Map<string, number> = new Map();
  private rotationIndex: number = 0;

  /**
   * Helper to resolve active unit ID and badge based on Test Mode vs Live Mode
   */
  private formatAdForClient(ad: Ad): Ad {
    const isTestMode = db.adSettings.isTestMode ?? false;
    const testBannerId = db.adSettings.adMobTestBannerUnitId || ADMOB_TEST_CONFIG.bannerUnitId;
    const testRewardedId = db.adSettings.adMobTestRewardedUnitId || ADMOB_TEST_CONFIG.rewardedUnitId;
    const liveBannerId = db.adSettings.adMobBannerUnitId || ADMOB_LIVE_CONFIG.bannerUnitId;
    const liveRewardedId = db.adSettings.adMobRewardedUnitId || ADMOB_LIVE_CONFIG.rewardedUnitId;

    if (ad.type === 'fullscreen') {
      return {
        ...ad,
        adMobUnitId: isTestMode ? testRewardedId : (ad.adMobUnitId || liveRewardedId),
        badgeText: isTestMode ? 'AdMob Test Rewarded' : (ad.badgeText || 'AdMob Rewarded')
      };
    }

    return {
      ...ad,
      adMobUnitId: isTestMode ? testBannerId : (ad.adMobUnitId || liveBannerId),
      badgeText: isTestMode ? 'AdMob Test Banner' : (ad.badgeText || 'AdMob Banner')
    };
  }

  /**
   * Selects an active banner ad with weighted priority, frequency capping, and rotation.
   * Avoids repeating the same ad to the same user within the cooldown period (default 45s).
   */
  getBannerAd(currentAdIdToAvoid?: string, clientId?: string): Ad | null {
    if (!db.adSettings.enableAds || db.adSettings.bannerAdsEnabled === false) return null;

    const now = new Date();
    const activeBanners = db.getAds('banner').filter(ad => {
      if (!ad.isActive) return false;
      if (ad.startDate && new Date(ad.startDate) > now) return false;
      if (ad.endDate && new Date(ad.endDate) < now) return false;
      return true;
    });

    if (activeBanners.length === 0) return null;

    const cooldownMs = (db.adSettings.adFrequencyCooldownSeconds ?? 45) * 1000;
    const cId = clientId || 'guest_user';

    // 1. Filter out candidate ads that are currently on cooldown for this specific client
    let candidatePool = activeBanners.filter(ad => {
      // Avoid currently displayed ad
      if (currentAdIdToAvoid && activeBanners.length > 1 && ad.id === currentAdIdToAvoid) {
        return false;
      }
      // Check frequency capping cooldown
      const key = `${cId}:${ad.id}`;
      const lastShown = this.clientAdHistory.get(key) || 0;
      if (Date.now() - lastShown < cooldownMs && activeBanners.length > 1) {
        return false;
      }
      return true;
    });

    // Fallback: If all ads are on cooldown, fallback to any active banner except current if possible
    if (candidatePool.length === 0) {
      candidatePool = currentAdIdToAvoid && activeBanners.length > 1
        ? activeBanners.filter(ad => ad.id !== currentAdIdToAvoid)
        : activeBanners;
    }

    // Weighted random selection or round-robin rotation
    this.rotationIndex = (this.rotationIndex + 1) % candidatePool.length;
    const selectedAd = candidatePool[this.rotationIndex] || candidatePool[0];

    // Record client exposure timestamp
    this.clientAdHistory.set(`${cId}:${selectedAd.id}`, Date.now());

    return this.formatAdForClient(selectedAd);
  }

  /**
   * Selects an active full-screen ad for the 10-video interstitial pause.
   */
  getFullscreenAd(currentAdIdToAvoid?: string, clientId?: string): Ad | null {
    if (!db.adSettings.enableAds || db.adSettings.fullscreenAdsEnabled === false) return null;

    const now = new Date();
    const activeFullscreen = db.getAds('fullscreen').filter(ad => {
      if (!ad.isActive) return false;
      if (ad.startDate && new Date(ad.startDate) > now) return false;
      if (ad.endDate && new Date(ad.endDate) < now) return false;
      return true;
    });

    if (activeFullscreen.length === 0) return null;

    const cooldownMs = (db.adSettings.adFrequencyCooldownSeconds ?? 45) * 1000;
    const cId = clientId || 'guest_user';

    let candidatePool = activeFullscreen.filter(ad => {
      if (currentAdIdToAvoid && activeFullscreen.length > 1 && ad.id === currentAdIdToAvoid) {
        return false;
      }
      const key = `${cId}:${ad.id}`;
      const lastShown = this.clientAdHistory.get(key) || 0;
      if (Date.now() - lastShown < cooldownMs && activeFullscreen.length > 1) {
        return false;
      }
      return true;
    });

    if (candidatePool.length === 0) {
      candidatePool = currentAdIdToAvoid && activeFullscreen.length > 1
        ? activeFullscreen.filter(ad => ad.id !== currentAdIdToAvoid)
        : activeFullscreen;
    }

    const totalWeight = candidatePool.reduce((sum, ad) => sum + (ad.priority || 1), 0);
    let randomWeight = Math.random() * totalWeight;

    let chosen = candidatePool[0];
    for (const ad of candidatePool) {
      randomWeight -= (ad.priority || 1);
      if (randomWeight <= 0) {
        chosen = ad;
        break;
      }
    }

    this.clientAdHistory.set(`${cId}:${chosen.id}`, Date.now());

    return this.formatAdForClient(chosen);
  }

  private impressionTimestamps: Map<string, number> = new Map();
  private clickTimestamps: Map<string, number> = new Map();

  /**
   * Tracks a valid impression for a banner or full-screen ad.
   * Protects against fraud/burst spamming.
   */
  recordImpression(
    adId: string,
    clientId?: string,
    videoId?: string
  ): { success: boolean; impressions: number; fraudPrevented?: boolean; revenueCredited?: boolean } {
    const ad = db.getAdById(adId);
    if (!ad || !ad.isActive) return { success: false, impressions: 0 };

    const key = `${clientId || 'client'}:${adId}`;
    const now = Date.now();
    const lastTime = this.impressionTimestamps.get(key) || 0;

    // Minimum 3-second debounce per client/ad impression
    if (now - lastTime < 3000) {
      db.blockedFraudEventsCount += 1;
      return { success: true, impressions: ad.impressions, fraudPrevented: true };
    }

    this.impressionTimestamps.set(key, now);
    ad.impressions += 1;

    // Record legitimate revenue event
    const revResult = db.recordAdRevenueEvent({
      adId,
      videoId,
      type: ad.type === 'fullscreen' ? 'fullscreen_impression' : 'banner_impression',
      clientId
    });

    return {
      success: true,
      impressions: ad.impressions,
      revenueCredited: revResult.success
    };
  }

  /**
   * Tracks a genuine user click for a banner or full-screen ad.
   * Protects against artificial/rapid-fire click spamming.
   */
  recordClick(
    adId: string,
    clientId?: string,
    videoId?: string
  ): { success: boolean; clicks: number; fraudPrevented?: boolean; revenueCredited?: boolean } {
    const ad = db.getAdById(adId);
    if (!ad || !ad.isActive) return { success: false, clicks: 0 };

    const key = `${clientId || 'client'}:${adId}`;
    const now = Date.now();
    const lastTime = this.clickTimestamps.get(key) || 0;

    // Minimum 2-second debounce per click
    if (now - lastTime < 2000) {
      db.blockedFraudEventsCount += 1;
      return { success: true, clicks: ad.clicks, fraudPrevented: true };
    }

    this.clickTimestamps.set(key, now);
    ad.clicks += 1;

    // Record legitimate revenue event
    const revResult = db.recordAdRevenueEvent({
      adId,
      videoId,
      type: ad.type === 'fullscreen' ? 'fullscreen_click' : 'banner_click',
      clientId
    });

    return {
      success: true,
      clicks: ad.clicks,
      revenueCredited: revResult.success
    };
  }

  getSettings(): AdSettings {
    return db.adSettings;
  }

  updateSettings(updates: Partial<AdSettings>): AdSettings {
    db.adSettings = { ...db.adSettings, ...updates };
    return db.adSettings;
  }
}

export const adEngine = new AdEngine();
