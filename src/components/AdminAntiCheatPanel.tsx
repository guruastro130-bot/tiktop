import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Clock,
  Coins,
  AlertTriangle,
  RotateCcw,
  UserX,
  Sliders,
  CheckCircle,
  Activity,
  Search,
  Lock,
  Unlock,
  Radio,
  FileText
} from 'lucide-react';
import { AdSettings, AntiCheatStats, SecurityIncidentRecord } from '../types';

interface AdminAntiCheatPanelProps {
  adSettings: AdSettings;
  onUpdateSettings: (newSettings: Partial<AdSettings>) => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
  triggerToast: (msg: string) => void;
}

export const AdminAntiCheatPanel: React.FC<AdminAntiCheatPanelProps> = ({
  adSettings,
  onUpdateSettings,
  getAuthHeaders,
  triggerToast,
}) => {
  const [stats, setStats] = useState<AntiCheatStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [resetUserId, setResetUserId] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Settings form state
  const [formSettings, setFormSettings] = useState({
    validViewThresholdSeconds: adSettings.validViewThresholdSeconds || 10.0,
    bannerRewardPoints: adSettings.bannerRewardPoints || 50,
    rewardCooldownSeconds: adSettings.rewardCooldownSeconds || 10.0,
    autoClickerMaxBurstPer10s: adSettings.autoClickerMaxBurstPer10s || 3,
    securityLockDurationSeconds: adSettings.securityLockDurationSeconds || 15,
    strictForegroundValidation: adSettings.strictForegroundValidation !== undefined ? adSettings.strictForegroundValidation : true,
  });

  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/anti-cheat/stats', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleResetCooldown = async (userIdToReset: string) => {
    if (!userIdToReset.trim()) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/anti-cheat/reset-user-cooldown', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: userIdToReset.trim() }),
      });
      if (res.ok) {
        triggerToast(`सुरक्षा लक सफलतापूर्वक हटाइयो: ${userIdToReset}`);
        setResetUserId('');
        fetchStats();
      } else {
        const err = await res.json();
        triggerToast(err.error || 'सुरक्षा लक हटाउन सकिएन');
      }
    } catch {
      triggerToast('सर्भर त्रुटि');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await onUpdateSettings({
        validViewThresholdSeconds: Number(formSettings.validViewThresholdSeconds),
        bannerRewardPoints: Number(formSettings.bannerRewardPoints),
        rewardCooldownSeconds: Number(formSettings.rewardCooldownSeconds),
        autoClickerMaxBurstPer10s: Number(formSettings.autoClickerMaxBurstPer10s),
        securityLockDurationSeconds: Number(formSettings.securityLockDurationSeconds),
        strictForegroundValidation: Boolean(formSettings.strictForegroundValidation),
      });
      triggerToast('🛡️ एन्टि-चिटिङ र सेक्युरिटी सेटिङहरू सुरक्षित गरियो!');
    } catch {
      triggerToast('सेटिङ सुरक्षित गर्न सकिएन');
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredIncidents = (stats?.recentIncidents || []).filter(inc => {
    if (filterType !== 'all' && inc.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inc.userId.toLowerCase().includes(q) ||
        inc.username.toLowerCase().includes(q) ||
        inc.reason.toLowerCase().includes(q) ||
        inc.videoId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-gradient-to-r from-rose-900/60 via-zinc-900 to-amber-950/40 p-5 border border-rose-500/30">
        <div>
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            <span>Anti-Cheat & Security Engine (एन्टि-चिटिङ र सेक्युरिटी)</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">सुरक्षा र पोइन्ट फ्रड रोकथाम प्रणाली</h2>
          <p className="text-xs text-zinc-300 mt-1 max-w-xl">
            ५ सेकेन्ड भिडियो हेर्ने टाइमर (Watch Time Cooldown), अटो-क्लिकर रोकथाम (Spam Click Detection),
            र १० भिडियो काउन्टर सेक्युरिटीको प्रत्यक्ष अनुगमन र व्यवस्थापन गर्नुहोस्।
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-700 transition-colors border border-white/10 shrink-0 self-start sm:self-auto"
        >
          <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>रिफ्रेस डाटा</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">वैध पोइन्ट दाबी</span>
            <div className="rounded-xl bg-emerald-500/20 p-2 text-emerald-400">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white">
            {(stats?.totalLegitimateRewardsGiven ?? 248).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            ५ सेकेन्ड पूरा गरी बाँडिएको: +{(stats?.totalPointsAwarded ?? 12400).toLocaleString()} Coins
          </div>
        </div>

        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400">रोकिएका फ्रड प्रयास</span>
            <div className="rounded-xl bg-rose-500/20 p-2 text-rose-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-rose-300">
            {((stats?.totalRapidSwipesBlocked ?? 0) + (stats?.totalAutoClickAttemptsBlocked ?? 0)).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            १ सेकेन्डभन्दा कममै स्वाइप / तीव्र स्पाम
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">अटो-क्लिकर स्पाम पत्ता</span>
            <div className="rounded-xl bg-amber-500/20 p-2 text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-300">
            {(stats?.totalAutoClickAttemptsBlocked ?? 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            १० सेकेन्डमा ३ पटकभन्दा बढी तीव्र क्लिक
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400">औसत वास्तविक हेराइ</span>
            <div className="rounded-xl bg-sky-500/20 p-2 text-sky-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-sky-300">
            {stats?.averageGenuineWatchTimeSec ?? 6.4}s
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            सक्रिय सुरक्षा कुल्डाउन: {stats?.activeCooldownsCount ?? 0}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Incident Logs & Configuration Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Security Incident Audit Logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/80 p-4 rounded-2xl border border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-rose-400" />
                <span>सुरक्षा अडिट लगहरू (Security Incident Audit Logs)</span>
              </h3>
              <p className="text-xs text-zinc-400">रोकिएका सबै स्पाम, सर्ट-वाच टाइम र फ्रड लगहरू</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: 'सबै' },
                { id: 'rapid_swipe', label: 'अधुरो वाच (No Full Watch)' },
                { id: 'auto_clicker_burst', label: 'अटो-क्लिकर' },
                { id: 'duplicate_claim', label: 'डुप्लिकेट' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterType === tab.id
                      ? 'bg-rose-500 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="प्रयोगकर्ता नाम, भिडियो ID वा विवरण खोजी गर्नुहोस्..."
              className="w-full rounded-xl bg-zinc-900/80 border border-white/10 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* Incidents Table / List */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden">
            {(stats?.incidents || []).filter(inc => {
              if (filterType !== 'all' && inc.type !== filterType) return false;
              if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                  inc.userId.toLowerCase().includes(q) ||
                  inc.username.toLowerCase().includes(q) ||
                  inc.details.toLowerCase().includes(q) ||
                  (inc.videoId && inc.videoId.toLowerCase().includes(q))
                );
              }
              return true;
            }).length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-sm font-bold text-white">कुनै सुरक्षा उल्लङ्घन फेला परेन</p>
                <p className="text-xs text-zinc-500 mt-1">सबै अनुरोधहरू सुरक्षित र सामान्य रूपमा चलिरहेका छन्।</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[450px] overflow-y-auto">
                {(stats?.incidents || [])
                  .filter(inc => {
                    if (filterType !== 'all' && inc.type !== filterType) return false;
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      return (
                        inc.userId.toLowerCase().includes(q) ||
                        inc.username.toLowerCase().includes(q) ||
                        inc.details.toLowerCase().includes(q) ||
                        (inc.videoId && inc.videoId.toLowerCase().includes(q))
                      );
                    }
                    return true;
                  })
                  .map(inc => (
                    <div key={inc.id} className="p-3.5 hover:bg-white/5 transition-colors flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inc.type === 'auto_clicker_burst'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : inc.type === 'rapid_swipe'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}>
                            {inc.type === 'auto_clicker_burst' ? '⚡ अटो-क्लिकर' : inc.type === 'rapid_swipe' ? '⏱ सर्ट वाच (<5s)' : '⚠️ डुप्लिकेट'}
                          </span>
                          <span className="font-bold text-white">@{inc.username}</span>
                          <span className="text-zinc-500 text-[11px]">({inc.userId})</span>
                        </div>
                        <p className="text-zinc-300 leading-snug">{inc.details}</p>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                          {inc.videoId && <span>भिडियो: {inc.videoId}</span>}
                          {inc.watchTimeSeconds !== undefined && (
                            <span>हेरेको समय: {inc.watchTimeSeconds.toFixed(1)}s</span>
                          )}
                          <span>{new Date(inc.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleResetCooldown(inc.userId)}
                        className="shrink-0 rounded-lg bg-zinc-800 px-2.5 py-1 text-[11px] font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white border border-white/10 flex items-center gap-1 transition-colors"
                        title="सुरक्षा कुल्डाउन अनलक गर्नुहोस्"
                      >
                        <Unlock className="h-3 w-3 text-emerald-400" />
                        <span>अनलक</span>
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Security Settings & Quick Unlock Box */}
        <div className="space-y-6">
          
          {/* Quick User Unlock Card */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Unlock className="h-4 w-4 text-emerald-400" />
              <span>प्रयोगकर्ता सुरक्षा अनलक (Quick Unlock)</span>
            </h3>
            <p className="text-xs text-zinc-400">
              यदि कुनै प्रयोगकर्ता अटो-क्लिकर लकमा परेका छन् भने यहाँबाट तुरुन्तै अनलक गर्नुहोस्।
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={resetUserId}
                onChange={e => setResetUserId(e.target.value)}
                placeholder="User ID (उदा: user_admin)"
                className="flex-1 rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleResetCooldown(resetUserId)}
                disabled={isResetting || !resetUserId.trim()}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shrink-0"
              >
                अनलक
              </button>
            </div>
          </div>

          {/* Security & Cooldown Form */}
          <form onSubmit={handleSaveSecuritySettings} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-rose-400" />
              <span>सुरक्षा नियम कन्फिगरेसन (Security Rules)</span>
            </h3>

            {/* Watch Threshold */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                १. न्यूनतम भिडियो हेराइ समय (Watch Threshold)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="2"
                  max="30"
                  value={formSettings.validViewThresholdSeconds}
                  onChange={e => setFormSettings({ ...formSettings, validViewThresholdSeconds: Number(e.target.value) })}
                  className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-zinc-500">सेकेन्ड</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">भिडियो १००% पूरा (Full Watch) भएपछि मात्र पोइन्ट दाबी हुन्छ।</p>
            </div>

            {/* Banner Reward Points */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                २. प्रति भिडियो ब्यानर एड पोइन्ट (Reward Coins)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="10"
                  max="500"
                  value={formSettings.bannerRewardPoints}
                  onChange={e => setFormSettings({ ...formSettings, bannerRewardPoints: Number(e.target.value) })}
                  className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-zinc-500">Coins</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">हालको नियम: ५० पोइन्ट प्रति भिडियो</p>
            </div>

            {/* Auto Clicker Burst Limit */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                ३. अटो-क्लिकर अधिकतम प्रयास (१० सेकेन्डमा)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formSettings.autoClickerMaxBurstPer10s}
                onChange={e => setFormSettings({ ...formSettings, autoClickerMaxBurstPer10s: Number(e.target.value) })}
                className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
              <p className="text-[11px] text-zinc-500 mt-0.5">१० सेकेन्डमा ३ पटकभन्दा बढी छिटो क्लिक गरेमा लकआउट हुन्छ।</p>
            </div>

            {/* Security Lockout Duration */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                ४. लकआउट अवधि (Security Lockout Duration)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={formSettings.securityLockDurationSeconds}
                  onChange={e => setFormSettings({ ...formSettings, securityLockDurationSeconds: Number(e.target.value) })}
                  className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-zinc-500">सेकेन्ड</span>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={savingSettings}
              className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors shadow-lg"
            >
              {savingSettings ? 'सुरक्षित गर्दै...' : 'सुरक्षा नियम सुरक्षित गर्नुहोस्'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
