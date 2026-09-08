import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  Sliders,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  PlusCircle,
  MinusCircle,
  Eye,
  MousePointer,
  HelpCircle,
  FileCheck,
  Search,
  Filter,
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';
import { PlatformMonetizationStats, PayoutRequest, RevenueEvent, AdSettings, User } from '../types';

interface AdminMonetizationPanelProps {
  users: User[];
  onTriggerToast: (msg: string) => void;
}

export const AdminMonetizationPanel: React.FC<AdminMonetizationPanelProps> = ({
  users,
  onTriggerToast,
}) => {
  const [stats, setStats] = useState<PlatformMonetizationStats | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [revenueEvents, setRevenueEvents] = useState<RevenueEvent[]>([]);
  const [settings, setSettings] = useState<AdSettings>({
    bannerCpm: 2.50,
    bannerCpc: 0.15,
    fullscreenCpm: 8.00,
    fullscreenCpc: 0.45,
    creatorRevenueSharePercent: 55,
    platformRevenueSharePercent: 45,
    minPayoutThreshold: 20.00,
    enableMonetization: true,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'settings' | 'payouts' | 'adjustments' | 'ledger'>('overview');

  // Payout Status Update Modal State
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [newPayoutStatus, setNewPayoutStatus] = useState<'pending' | 'processing' | 'completed' | 'rejected'>('completed');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [updatingPayout, setUpdatingPayout] = useState<boolean>(false);

  // Manual Adjustment State
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(users[0]?.id || 'user_1');
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [submittingAdjustment, setSubmittingAdjustment] = useState<boolean>(false);

  const loadMonetizationData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats & Recent Events
      const monRes = await fetch('/api/admin/monetization', {
        headers: { 'x-user-id': 'user_admin' }
      });
      if (monRes.ok) {
        const monData = await monRes.json();
        if (monData.stats) setStats(monData.stats);
        if (monData.settings) setSettings(monData.settings);
        if (monData.recentRevenueEvents) setRevenueEvents(monData.recentRevenueEvents);
      }

      // 2. Fetch Payouts
      const payoutRes = await fetch('/api/admin/payouts', {
        headers: { 'x-user-id': 'user_admin' }
      });
      if (payoutRes.ok) {
        const pData = await payoutRes.json();
        if (pData.payouts) setPayouts(pData.payouts);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonetizationData();
  }, [loadMonetizationData]);

  // Handle Save Ad Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/ads/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user_admin'
        },
        body: JSON.stringify({
          bannerCpm: Number(settings.bannerCpm),
          bannerCpc: Number(settings.bannerCpc),
          fullscreenCpm: Number(settings.fullscreenCpm),
          fullscreenCpc: Number(settings.fullscreenCpc),
          creatorRevenueSharePercent: Number(settings.creatorRevenueSharePercent),
          platformRevenueSharePercent: Number(settings.platformRevenueSharePercent),
          minPayoutThreshold: Number(settings.minPayoutThreshold),
          enableMonetization: settings.enableMonetization,
          isTestMode: Boolean(settings.isTestMode),
          adFrequencyCooldownSeconds: Number(settings.adFrequencyCooldownSeconds || 45),
          adMobAppId: settings.adMobAppId,
          adMobBannerUnitId: settings.adMobBannerUnitId,
          adMobRewardedUnitId: settings.adMobRewardedUnitId,
          adMobTestAppId: settings.adMobTestAppId,
          adMobTestBannerUnitId: settings.adMobTestBannerUnitId,
          adMobTestRewardedUnitId: settings.adMobTestRewardedUnitId,
        })
      });

      if (res.ok) {
        onTriggerToast('Monetization & AdMob configuration updated successfully.');
        loadMonetizationData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update settings');
      }
    } catch {
      alert('Network error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Update Payout Status
  const handleUpdatePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout) return;
    setUpdatingPayout(true);

    try {
      const res = await fetch(`/api/admin/payouts/${selectedPayout.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user_admin'
        },
        body: JSON.stringify({
          status: newPayoutStatus,
          adminNotes: adminNotes.trim(),
          transactionReference: transactionRef.trim() || undefined
        })
      });

      if (res.ok) {
        onTriggerToast(`Payout #${selectedPayout.id} updated to ${newPayoutStatus.toUpperCase()}`);
        setSelectedPayout(null);
        setAdminNotes('');
        setTransactionRef('');
        loadMonetizationData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update payout');
      }
    } catch {
      alert('Network error updating payout');
    } finally {
      setUpdatingPayout(false);
    }
  };

  // Handle Manual Earnings Adjustment
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(adjustmentAmount);
    if (isNaN(amountNum) || amountNum === 0) {
      alert('Please enter a valid non-zero adjustment amount.');
      return;
    }
    if (!adjustmentReason.trim()) {
      alert('Please enter a reason for this adjustment.');
      return;
    }

    setSubmittingAdjustment(true);
    try {
      const res = await fetch(`/api/admin/creators/${selectedCreatorId}/adjust-earnings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user_admin'
        },
        body: JSON.stringify({
          amount: amountNum,
          reason: adjustmentReason.trim()
        })
      });

      if (res.ok) {
        onTriggerToast(`Adjusted earnings by $${amountNum.toFixed(2)} USD successfully.`);
        setAdjustmentAmount('');
        setAdjustmentReason('');
        loadMonetizationData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to adjust creator earnings');
      }
    } catch {
      alert('Network error submitting adjustment');
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  const filteredPayouts = payouts.filter((p) => {
    if (payoutStatusFilter === 'all') return true;
    return p.status === payoutStatusFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shadow-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Monetization & Payout Operations</h2>
            <p className="text-xs text-zinc-400">
              CPM/CPC rates, creator earnings splits, anti-fraud enforcement, and payout approvals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadMonetizationData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Top Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Ad Revenue */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Ad Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            ${(stats?.totalGrossRevenue ?? 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span>Verified Server Ads</span>
            <span className="font-mono text-zinc-300 font-bold">{stats?.totalValidImpressions ?? 0} Impr.</span>
          </div>
        </div>

        {/* Creator Share Total */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Creator Earnings Pool</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 tracking-tight">
            ${(stats?.totalCreatorEarnings ?? 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span>Creator Split: {settings.creatorRevenueSharePercent}%</span>
            <span className="text-emerald-400 font-mono font-bold">${(stats?.availableCreatorBalanceTotal ?? 0).toFixed(2)} Avail.</span>
          </div>
        </div>

        {/* Platform Share Net */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Platform Net Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-400 tracking-tight">
            ${(stats?.totalPlatformRevenue ?? 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span>Platform Split: {settings.platformRevenueSharePercent}%</span>
            <span className="font-mono text-blue-300 font-bold">{stats?.totalValidClicks ?? 0} Clicks</span>
          </div>
        </div>

        {/* Payouts Disbursed & Pending */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Payout Pipeline</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-300 tracking-tight">
            ${(stats?.pendingPayoutsAmount ?? 0).toFixed(2)} <span className="text-xs font-normal text-zinc-400">pending</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span>Disbursed: ${(stats?.totalPayoutsDisbursed ?? 0).toFixed(2)}</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-emerald-400" />
              {stats?.blockedFraudEventsCount ?? 0} Spam Filtered
            </span>
          </div>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('overview')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'overview'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Monetization Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'settings'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4" /> CPM / CPC & Revenue Share Configuration
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('payouts')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'payouts'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Payout Requests ({payouts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('adjustments')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'adjustments'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <PlusCircle className="w-4 h-4" /> Manual Earnings Adjustment
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('ledger')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'ledger'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileCheck className="w-4 h-4" /> Revenue Event Ledger
        </button>
      </div>

      {/* SubTab 1: Overview */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rates Summary Card */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" /> Active Monetization Parameters
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="text-zinc-400">Banner CPM</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">${settings.bannerCpm?.toFixed(2)}</div>
                  <div className="text-[10px] text-zinc-500">Per 1,000 banner impressions</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="text-zinc-400">Banner CPC</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">${settings.bannerCpc?.toFixed(2)}</div>
                  <div className="text-[10px] text-zinc-500">Per verified banner click</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="text-zinc-400">Fullscreen CPM</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">${settings.fullscreenCpm?.toFixed(2)}</div>
                  <div className="text-[10px] text-zinc-500">Per 1,000 interstitial views</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="text-zinc-400">Fullscreen CPC</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">${settings.fullscreenCpc?.toFixed(2)}</div>
                  <div className="text-[10px] text-zinc-500">Per verified interstitial click</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <span className="text-zinc-300">Creator Revenue Split:</span>
                <span className="text-emerald-400 font-bold">{settings.creatorRevenueSharePercent}% Creator / {settings.platformRevenueSharePercent}% Platform</span>
              </div>
            </div>

            {/* Anti-Fraud Enforcement Card */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" /> Fraud Protection & Verification
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                The revenue system applies strict server-side validation to prevent click fraud, duplicate impressions, and automated bot queries:
              </p>
              <ul className="text-xs text-zinc-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span><strong>Debouncing:</strong> Duplicate impressions from the same client within 4 seconds are filtered out.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span><strong>Rapid Click Limiting:</strong> Clicks faster than 2 seconds apart are categorized as spam.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span><strong>Isolated Creator Attribution:</strong> Revenue is credited only to the authentic owner of the viewed video.</span>
                </li>
              </ul>

              <div className="p-3 rounded-xl bg-zinc-950 border border-white/5 text-xs flex items-center justify-between">
                <span className="text-zinc-400">Total Filtered Suspicious Events:</span>
                <span className="text-emerald-400 font-bold font-mono">{stats?.blockedFraudEventsCount ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: Settings Configuration Form */}
      {activeSubTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white">Configurable Revenue Engine Settings</h3>
              <p className="text-xs text-zinc-400">All changes take effect immediately across all newly recorded ad events.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableMonetization ?? true}
                onChange={(e) => setSettings({ ...settings, enableMonetization: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400"
              />
              <span className="text-xs font-bold text-white">Enable Monetization</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Banner CPM */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Banner Ad CPM ($ / 1k impressions)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.10"
                  max="100.00"
                  value={settings.bannerCpm ?? 2.50}
                  onChange={(e) => setSettings({ ...settings, bannerCpm: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-7 pr-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Banner CPC */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Banner Ad CPC ($ / click)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="20.00"
                  value={settings.bannerCpc ?? 0.15}
                  onChange={(e) => setSettings({ ...settings, bannerCpc: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-7 pr-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Fullscreen CPM */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Fullscreen Ad CPM ($ / 1k impressions)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.50"
                  max="200.00"
                  value={settings.fullscreenCpm ?? 8.00}
                  onChange={(e) => setSettings({ ...settings, fullscreenCpm: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-7 pr-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Fullscreen CPC */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Fullscreen Ad CPC ($ / click)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.05"
                  max="50.00"
                  value={settings.fullscreenCpc ?? 0.45}
                  onChange={(e) => setSettings({ ...settings, fullscreenCpc: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-7 pr-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Creator Revenue Share % */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Creator Revenue Share (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="99"
                  value={settings.creatorRevenueSharePercent ?? 55}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 55;
                    setSettings({
                      ...settings,
                      creatorRevenueSharePercent: val,
                      platformRevenueSharePercent: 100 - val
                    });
                  }}
                  className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">%</span>
              </div>
            </div>

            {/* Minimum Payout Threshold */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Minimum Payout Threshold ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <input
                  type="number"
                  step="1"
                  min="5"
                  max="500"
                  value={settings.minPayoutThreshold ?? 20.00}
                  onChange={(e) => setSettings({ ...settings, minPayoutThreshold: parseFloat(e.target.value) || 20 })}
                  className="w-full pl-7 pr-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* AdMob Configuration & Safety Section */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> AdMob Integration & Test Mode
                </h4>
                <p className="text-[11px] text-zinc-400">Toggle Test Mode during development to protect your AdMob account from policy bans.</p>
              </div>

              {/* Test Mode Toggle Switch */}
              <label className="flex items-center gap-2 cursor-pointer bg-zinc-950 px-3 py-1.5 rounded-xl border border-white/10">
                <input
                  type="checkbox"
                  checked={settings.isTestMode ?? false}
                  onChange={(e) => setSettings({ ...settings, isTestMode: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
                <span className={`text-xs font-bold ${settings.isTestMode ? 'text-amber-400' : 'text-zinc-400'}`}>
                  {settings.isTestMode ? 'Test Mode Active (Google Test IDs)' : 'Live Production Mode'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Ad Frequency Capping Cooldown */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Ad Frequency Capping Cooldown (Seconds)
                </label>
                <input
                  type="number"
                  step="5"
                  min="10"
                  max="300"
                  value={settings.adFrequencyCooldownSeconds ?? 45}
                  onChange={(e) => setSettings({ ...settings, adFrequencyCooldownSeconds: parseInt(e.target.value) || 45 })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Prevents same user seeing same ad repeatedly</span>
              </div>

              {/* Fullscreen Video Interval */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Rewarded Ad Video Interval (Videos)
                </label>
                <input
                  type="number"
                  step="1"
                  min="3"
                  max="50"
                  value={settings.fullscreenAdInterval ?? 10}
                  onChange={(e) => setSettings({ ...settings, fullscreenAdInterval: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Shows rewarded ad after N valid video views</span>
              </div>
            </div>

            {/* AdMob IDs Grid */}
            <div className="space-y-3 rounded-xl bg-zinc-950 p-4 border border-white/5">
              <span className="text-xs font-bold text-zinc-300 block">Google AdMob Unit IDs ({settings.isTestMode ? 'Test IDs in effect' : 'Live IDs in effect'})</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Live App ID</label>
                  <input
                    type="text"
                    value={settings.adMobAppId || 'ca-app-pub-4934149666060133~4231693895'}
                    onChange={(e) => setSettings({ ...settings, adMobAppId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Live Banner Unit ID</label>
                  <input
                    type="text"
                    value={settings.adMobBannerUnitId || 'ca-app-pub-4934149666060133/9380962369'}
                    onChange={(e) => setSettings({ ...settings, adMobBannerUnitId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Live Rewarded Unit ID</label>
                  <input
                    type="text"
                    value={settings.adMobRewardedUnitId || 'ca-app-pub-4934149666060133/1932402127'}
                    onChange={(e) => setSettings({ ...settings, adMobRewardedUnitId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-amber-400/80 block mb-0.5">Google Official Test Rewarded ID</label>
                  <input
                    type="text"
                    value={settings.adMobTestRewardedUnitId || 'ca-app-pub-3940256099942544/5224354917'}
                    onChange={(e) => setSettings({ ...settings, adMobTestRewardedUnitId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-amber-300 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              id="save-monetization-settings-btn"
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
              Save Monetization Settings
            </button>
          </div>
        </form>
      )}

      {/* SubTab 3: Payout Requests Queue */}
      {activeSubTab === 'payouts' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Filter Status:</span>
              {['all', 'pending', 'processing', 'completed', 'rejected'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPayoutStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    payoutStatusFilter === st
                      ? 'bg-emerald-500 text-neutral-950 font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="text-xs text-zinc-400 font-mono">
              Total: <strong>{filteredPayouts.length}</strong> requests
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-3">Payout ID / Date</th>
                  <th className="p-3">Creator</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Method & Details</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-zinc-900/60">
                {filteredPayouts.length > 0 ? (
                  filteredPayouts.map((p) => {
                    const statusColors: Record<string, string> = {
                      completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                      processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                      rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                    };

                    return (
                      <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="p-3 font-mono">
                          <div className="font-bold text-white">{p.id}</div>
                          <div className="text-[10px] text-zinc-400">{new Date(p.requestedAt).toLocaleDateString()}</div>
                          {p.transactionReference && (
                            <div className="text-[10px] text-emerald-400 font-mono">Ref: {p.transactionReference}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">@{p.creatorUsername || p.creatorId}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">ID: {p.creatorId}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-white text-sm">
                          ${p.amount.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold uppercase text-zinc-300 text-[11px]">{p.method.replace('_', ' ')}</div>
                          <div className="text-[11px] font-mono text-zinc-400 max-w-[200px] truncate">{p.accountDetails}</div>
                          {p.adminNotes && (
                            <div className="text-[10px] text-zinc-400 italic mt-0.5">"{p.adminNotes}"</div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-semibold border rounded-full uppercase tracking-wider inline-block ${
                              statusColors[p.status] || 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayout(p);
                              setNewPayoutStatus(p.status === 'pending' ? 'processing' : 'completed');
                              setAdminNotes(p.adminNotes || '');
                              setTransactionRef(p.transactionReference || '');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-white/10 transition-colors"
                          >
                            Manage Status
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      No payout requests matching filter &quot;{payoutStatusFilter}&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 4: Manual Adjustment Tool */}
      {activeSubTab === 'adjustments' && (
        <form onSubmit={handleAdjustmentSubmit} className="max-w-xl bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Creator Earnings Manual Adjustment</h3>
            <p className="text-xs text-zinc-400">
              Credit creator bonuses, reconcile discrepancy adjustments, or apply clawbacks. All adjustments are permanently logged in the audit ledger.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Select Target Creator</label>
            <select
              value={selectedCreatorId}
              onChange={(e) => setSelectedCreatorId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  @{u.username} ({u.displayName}) - ID: {u.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Adjustment Amount ($ USD)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="+50.00 or -15.00"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              Positive values (e.g. 25.00) credit available balance; negative values (e.g. -10.00) deduct.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Reason / Admin Memo
            </label>
            <textarea
              rows={3}
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="e.g. Partnership creator bonus, campaign top-up, or billing correction"
              className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submittingAdjustment}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {submittingAdjustment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
              Apply Adjustment to Creator
            </button>
          </div>
        </form>
      )}

      {/* SubTab 5: Event Ledger */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-3">
          <div className="text-xs text-zinc-400">
            Real-time feed of server-calculated ad revenue transactions and platform splits:
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-white/10 sticky top-0">
                <tr>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">Campaign / Ad</th>
                  <th className="p-3">Creator</th>
                  <th className="p-3 text-right">Gross</th>
                  <th className="p-3 text-right font-bold text-rose-400">Creator Share</th>
                  <th className="p-3 text-right font-bold text-blue-400">Platform Share</th>
                  <th className="p-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-zinc-900/60">
                {revenueEvents.length > 0 ? (
                  revenueEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300">
                          {ev.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 max-w-[200px] truncate">
                        <div className="font-semibold text-white truncate">{ev.adTitle || 'Ad Campaign'}</div>
                        {ev.videoCaption && <div className="text-[10px] text-zinc-400 truncate">Video: {ev.videoCaption}</div>}
                      </td>
                      <td className="p-3 font-mono text-zinc-300">
                        @{ev.creatorUsername || ev.creatorId || 'Platform'}
                      </td>
                      <td className="p-3 text-right font-mono text-zinc-400">
                        ${(ev.grossRevenue || 0).toFixed(4)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-400">
                        ${(ev.creatorRevenue || 0).toFixed(4)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-blue-400">
                        ${(ev.platformRevenue || 0).toFixed(4)}
                      </td>
                      <td className="p-3 text-right font-mono text-[10px] text-zinc-400">
                        {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      No revenue transactions logged in current session yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout Status Update Modal */}
      {selectedPayout && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" /> Manage Payout #{selectedPayout.id}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPayout(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdatePayoutSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-zinc-950 border border-white/5 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Creator:</span>
                  <span className="text-white font-bold">@{selectedPayout.creatorUsername || selectedPayout.creatorId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Amount:</span>
                  <span className="text-emerald-400 font-bold text-sm">${selectedPayout.amount.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Method:</span>
                  <span className="text-zinc-200 uppercase">{selectedPayout.method.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Account:</span>
                  <span className="text-zinc-300 font-mono">{selectedPayout.accountDetails}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Set Payout Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['pending', 'processing', 'completed', 'rejected'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewPayoutStatus(st)}
                      className={`p-2 rounded-xl border text-xs font-bold capitalize transition-all ${
                        newPayoutStatus === st
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/10 bg-zinc-950 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Transaction Reference ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PP-938472910 or ACH-29384"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Admin Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched via PayPal on Aug 31"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayout(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPayout}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  {updatingPayout ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
