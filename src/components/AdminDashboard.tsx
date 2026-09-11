import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  Megaphone,
  Users,
  Film,
  Flag,
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Sliders,
  TrendingUp,
  X,
  Play,
  Search,
  Filter,
  BarChart3,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Check,
  Ban,
  UserX,
  Upload,
  Image as ImageIcon,
  Link,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  FileText,
  Percent,
  DollarSign,
  Wallet,
  Send,
  Lock,
  KeyRound
} from 'lucide-react';
import { AdminStats, Ad, User, Video, Report, AdSettings } from '../types';
import { INITIAL_AD_SETTINGS } from '../data/initialData';
import { useAds } from '../context/AdContext';
import { useAuth } from '../context/AuthContext';
import { AdminCopyrightReports } from './AdminCopyrightReports';
import { AdminAuditLogs } from './AdminAuditLogs';
import { AdminMonetizationPanel } from './AdminMonetizationPanel';
import { AdminWithdrawalsPanel } from './AdminWithdrawalsPanel';
import { AdminAntiCheatPanel } from './AdminAntiCheatPanel';
import { AdminLoginGuard } from './AdminLoginGuard';
import { AdminTelegramAlertsPanel } from './AdminTelegramAlertsPanel';

interface AdminDashboardProps {
  onClose: () => void;
}

type AdminTab =
  | 'dashboard'
  | 'users'
  | 'videos'
  | 'reports'
  | 'copyright_reports'
  | 'banner_ads'
  | 'fullscreen_ads'
  | 'ad_analytics'
  | 'audit_logs'
  | 'monetization'
  | 'withdrawals'
  | 'anti_cheat'
  | 'telegram_alerts'
  | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const { triggerFullScreenAdManually } = useAds();
  const { currentUser, isAdmin } = useAuth();

  // Admin Password Guard state
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('tiktop_admin_authenticated') === 'true';
  });
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return sessionStorage.getItem('tiktop_admin_password') || '';
  });

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [adSettings, setAdSettings] = useState<AdSettings>(INITIAL_AD_SETTINGS);

  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Admin Password Change state
  const [newAdminPasswordInput, setNewAdminPasswordInput] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Modals & Sub-views
  const [selectedUserModal, setSelectedUserModal] = useState<User | null>(null);
  const [selectedVideoModal, setSelectedVideoModal] = useState<Video | null>(null);
  const [isCreatingAd, setIsCreatingAd] = useState<boolean>(false);
  const [createAdType, setCreateAdType] = useState<'banner' | 'fullscreen'>('banner');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filter States
  const [userSearch, setUserSearch] = useState<string>('');
  const [videoSearch, setVideoSearch] = useState<string>('');
  const [videoStatusFilter, setVideoStatusFilter] = useState<'all' | 'active' | 'removed'>('all');
  const [reportTypeFilter, setReportTypeFilter] = useState<'all' | 'video' | 'user' | 'comment'>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');

  // Real-time Pending Withdrawals Alert State
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState<number>(0);
  const [latestPendingWithdrawal, setLatestPendingWithdrawal] = useState<any>(null);

  // New Ad Form State
  const [newAd, setNewAd] = useState<{
    title: string;
    description: string;
    ctaText: string;
    mediaUrl: string;
    destinationUrl: string;
    sponsorName: string;
    sponsorLogo: string;
    badgeText: string;
    priority: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>({
    title: '',
    description: '',
    ctaText: 'Learn More',
    mediaUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    destinationUrl: 'https://example.com',
    sponsorName: 'Brand Sponsor',
    sponsorLogo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    badgeText: 'Promoted',
    priority: 8,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '2026-12-31',
    isActive: true,
  });

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'x-user-id': currentUser?.id || 'user_admin',
    'x-admin-password': adminPassword || sessionStorage.getItem('tiktop_admin_password') || 'TikTopAdmin@2026',
  });

  const handleLockAdmin = () => {
    sessionStorage.removeItem('tiktop_admin_authenticated');
    sessionStorage.removeItem('tiktop_admin_password');
    setIsAdminUnlocked(false);
    setAdminPassword('');
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPasswordInput || newAdminPasswordInput.trim().length < 6) {
      triggerToast('❌ पासवर्ड कम्तीमा ६ अक्षरको हुनुपर्दछ।');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newPassword: newAdminPasswordInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminPassword(newAdminPasswordInput.trim());
        sessionStorage.setItem('tiktop_admin_password', newAdminPasswordInput.trim());
        setAdSettings(prev => ({ ...prev, adminPassword: newAdminPasswordInput.trim() }));
        setNewAdminPasswordInput('');
        triggerToast('✅ एडमिन पासवर्ड सफलतापूर्वक परिवर्तन गरियो!');
      } else {
        triggerToast(data.error || '❌ पासवर्ड परिवर्तन गर्न सकिएन।');
      }
    } catch {
      triggerToast('❌ सर्भरमा जडान गर्दा त्रुटि भयो।');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeaders();
      const [statsRes, adsRes, usersRes, videosRes, reportsRes, settingsRes, withdrawalsSummaryRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }).then(r => (r.ok ? r.json() : null)),
        fetch('/api/admin/ads', { headers }).then(r => (r.ok ? r.json() : null)),
        fetch('/api/admin/users', { headers }).then(r => (r.ok ? r.json() : null)),
        fetch('/api/admin/videos', { headers }).then(r => (r.ok ? r.json() : null)),
        fetch('/api/admin/reports', { headers }).then(r => (r.ok ? r.json() : null)),
        fetch('/api/ads/settings', { headers }).then(r => (r.ok ? r.json() : null)),
        fetch('/api/admin/withdrawals/summary', { headers }).then(r => (r.ok ? r.json() : null)),
      ]);

      if (statsRes?.stats) setStats(statsRes.stats);
      if (adsRes?.ads) setAds(adsRes.ads);
      if (usersRes?.users) setUsers(usersRes.users);
      if (videosRes?.videos) setVideos(videosRes.videos);
      if (reportsRes?.reports) setReports(reportsRes.reports);
      if (settingsRes?.settings) setAdSettings(settingsRes.settings);
      if (withdrawalsSummaryRes) {
        setPendingWithdrawalsCount(withdrawalsSummaryRes.pendingCount || 0);
        if (withdrawalsSummaryRes.latestPending) {
          setLatestPendingWithdrawal(withdrawalsSummaryRes.latestPending);
        }
      }
    } catch {
      setErrorMsg('Failed to load administration data. Please check authentication.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      fetch('/api/admin/withdrawals/summary', { headers: getAuthHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setPendingWithdrawalsCount(data.pendingCount || 0);
            if (data.latestPending) setLatestPendingWithdrawal(data.latestPending);
          }
        })
        .catch(() => {});
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 3500);
  };

  // --- ACTIONS ---

  const handleToggleAdActive = async (ad: Ad) => {
    const nextStatus = !ad.isActive;
    try {
      const res = await fetch(`/api/admin/ads/${ad.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: nextStatus }),
      });
      if (res.ok) {
        setAds(prev => prev.map(a => (a.id === ad.id ? { ...a, isActive: nextStatus } : a)));
        triggerToast(`Ad campaign ${nextStatus ? 'activated' : 'paused'}.`);
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Are you sure you want to permanently delete this ad campaign?')) return;
    try {
      const res = await fetch(`/api/admin/ads/${adId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setAds(prev => prev.filter(a => a.id !== adId));
        triggerToast('Ad campaign removed.');
      }
    } catch {
      // ignore
    }
  };

  const handleCreateAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newAd,
        type: createAdType,
        badgeText: newAd.badgeText || (createAdType === 'banner' ? 'Promoted' : 'Sponsored Ad'),
      };
      const res = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setAds(prev => [data.ad, ...prev]);
        setIsCreatingAd(false);
        triggerToast(`New ${createAdType === 'banner' ? 'Banner' : 'Fullscreen'} Ad created successfully!`);
        // Reset form
        setNewAd({
          title: '',
          description: '',
          ctaText: 'Learn More',
          mediaUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
          destinationUrl: 'https://example.com',
          sponsorName: 'Brand Sponsor',
          sponsorLogo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
          badgeText: createAdType === 'banner' ? 'Promoted' : 'Sponsored Ad',
          priority: 8,
          startDate: new Date().toISOString().split('T')[0],
          endDate: '2026-12-31',
          isActive: true,
        });
      }
    } catch {
      // ignore
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ads/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(adSettings),
      });
      if (res.ok) {
        triggerToast('Ad Engine settings saved successfully.');
      } else {
        const d = await res.json();
        setErrorMsg(d.error || 'Failed to save settings.');
      }
    } catch {
      setErrorMsg('Network error saving settings.');
    }
  };

  const handleToggleBanUser = async (user: User) => {
    const nextBanned = !user.isBanned;
    try {
      const res = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isBanned: nextBanned }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, isBanned: nextBanned } : u)));
        if (selectedUserModal?.id === user.id) {
          setSelectedUserModal(prev => (prev ? { ...prev, isBanned: nextBanned } : null));
        }
        triggerToast(`User @${user.username} is now ${nextBanned ? 'SUSPENDED/BANNED' : 'UNBANNED & ACTIVE'}.`);
      }
    } catch {
      // ignore
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    try {
      const res = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setVideos(prev => prev.map(v => (v.id === videoId ? { ...v, status: 'removed' } : v)));
        if (selectedVideoModal?.id === videoId) {
          setSelectedVideoModal(prev => (prev ? { ...prev, status: 'removed' } : null));
        }
        triggerToast('Video marked as REMOVED from feed.');
      }
    } catch {
      // ignore
    }
  };

  const handleRestoreVideo = async (videoId: string) => {
    try {
      const res = await fetch(`/api/admin/videos/${videoId}/restore`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setVideos(prev => prev.map(v => (v.id === videoId ? { ...v, status: 'active' } : v)));
        if (selectedVideoModal?.id === videoId) {
          setSelectedVideoModal(prev => (prev ? { ...prev, status: 'active' } : null));
        }
        triggerToast('Video RESTORED to active feed.');
      }
    } catch {
      // ignore
    }
  };

  const handleResolveReport = async (
    reportId: string,
    status: 'pending' | 'resolved' | 'dismissed',
    action?: 'ban_user' | 'remove_video'
  ) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, action }),
      });
      if (res.ok) {
        setReports(prev => prev.map(r => (r.id === reportId ? { ...r, status } : r)));
        if (action === 'ban_user') {
          const report = reports.find(r => r.id === reportId);
          if (report) {
            setUsers(prev => prev.map(u => (u.id === report.targetId ? { ...u, isBanned: true } : u)));
          }
          triggerToast('Report resolved: User suspended.');
        } else if (action === 'remove_video') {
          const report = reports.find(r => r.id === reportId);
          if (report) {
            setVideos(prev => prev.map(v => (v.id === report.targetId ? { ...v, status: 'removed' } : v)));
          }
          triggerToast('Report resolved: Video removed.');
        } else {
          triggerToast(`Report marked as ${status}.`);
        }
      }
    } catch {
      // ignore
    }
  };

  const calcCtr = (clicks: number, impressions: number) => {
    if (!impressions || impressions === 0) return '0.00%';
    return ((clicks / impressions) * 100).toFixed(2) + '%';
  };

  // Filtered lists
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      u =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const filteredVideos = useMemo(() => {
    let list = [...videos];
    if (videoStatusFilter !== 'all') {
      list = list.filter(v => v.status === videoStatusFilter);
    }
    const q = videoSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(
        v =>
          v.caption.toLowerCase().includes(q) ||
          v.user.username.toLowerCase().includes(q) ||
          v.hashtags.some(h => h.toLowerCase().includes(q))
      );
    }
    return list;
  }, [videos, videoSearch, videoStatusFilter]);

  const filteredReports = useMemo(() => {
    let list = [...reports];
    if (reportTypeFilter !== 'all') {
      list = list.filter(r => r.type === reportTypeFilter);
    }
    if (reportStatusFilter !== 'all') {
      list = list.filter(r => r.status === reportStatusFilter);
    }
    return list;
  }, [reports, reportTypeFilter, reportStatusFilter]);

  const bannerAdsList = useMemo(() => ads.filter(a => a.type === 'banner'), [ads]);
  const fullscreenAdsList = useMemo(() => ads.filter(a => a.type === 'fullscreen'), [ads]);

  // Ad Analytics Calculations
  const analyticsData = useMemo(() => {
    const totalBannerImp = bannerAdsList.reduce((acc, a) => acc + (a.impressions || 0), 0);
    const totalBannerClk = bannerAdsList.reduce((acc, a) => acc + (a.clicks || 0), 0);
    const totalFsImp = fullscreenAdsList.reduce((acc, a) => acc + (a.impressions || 0), 0);
    const totalFsClk = fullscreenAdsList.reduce((acc, a) => acc + (a.clicks || 0), 0);

    const totalValidImpressions = totalBannerImp + totalFsImp;
    const totalClicks = totalBannerClk + totalFsClk;
    const overallCtr = calcCtr(totalClicks, totalValidImpressions);

    const activeAdsCount = ads.filter(a => a.isActive).length;

    // Sort ads by CTR and total performance
    const topPerforming = [...ads].sort((a, b) => {
      const ctrA = a.impressions ? a.clicks / a.impressions : 0;
      const ctrB = b.impressions ? b.clicks / b.impressions : 0;
      return ctrB - ctrA;
    });

    return {
      totalValidImpressions,
      totalClicks,
      overallCtr,
      activeAdsCount,
      totalBannerImp,
      totalBannerClk,
      totalFsImp,
      totalFsClk,
      topPerforming,
    };
  }, [ads, bannerAdsList, fullscreenAdsList]);

  // If admin is locked with password protection, show AdminLoginGuard
  if (!isAdminUnlocked) {
    return (
      <AdminLoginGuard
        onSuccess={(pwd) => {
          setAdminPassword(pwd);
          setIsAdminUnlocked(true);
          loadData();
        }}
        onCancel={onClose}
      />
    );
  }

  return (
    <div
      id="admin-dashboard-modal"
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white overflow-hidden"
    >
      {/* Top Admin Navigation Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500 text-white font-black shadow-lg">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white">TikTop Administration Suite</h1>
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                Password Protected
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Moderation, Ads Engine, Nepal Rewards & Telegram Alerts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLockAdmin}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors"
            title="एडमिन प्यानल लक गर्नुहोस्"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lock Admin</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Exit</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {saveSuccessMsg && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-4 py-2 text-center text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 animate-fade-in">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-2 text-center text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5 animate-fade-in">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Real-time Withdrawal Pending Notice Banner */}
      {pendingWithdrawalsCount > 0 && activeTab !== 'withdrawals' && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs font-bold text-amber-200 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black">
              {pendingWithdrawalsCount} PENDING
            </span>
            <span>
              🚨 नयाँ विथड्र अनुरोध! {latestPendingWithdrawal ? `@${latestPendingWithdrawal.username} (${latestPendingWithdrawal.countryName || 'नेपाल'} - ${latestPendingWithdrawal.paymentMethod}) ले भुक्तानी माग गर्नुभएको छ।` : 'भुक्तानी गर्नुपर्ने नयाँ विथड्र अनुरोधहरू छन्।'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('withdrawals')}
            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors"
          >
            अहिले समीक्षा र भुक्तानी गर्नुहोस् →
          </button>
        </div>
      )}

      {/* Main Admin Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation */}
        <div className="w-48 sm:w-60 shrink-0 border-r border-white/10 bg-zinc-900/70 p-3 space-y-1 overflow-y-auto">
          <div className="px-2 py-1 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Core Sections</span>
          </div>

          {[
            { id: 'dashboard', label: '1. Dashboard', icon: TrendingUp },
            { id: 'users', label: '2. Users', icon: Users, count: users.length },
            { id: 'videos', label: '3. Videos', icon: Film, count: videos.length },
            {
              id: 'reports',
              label: '4. Community Reports',
              icon: Flag,
              count: reports.filter(r => r.type !== 'copyright' && r.status === 'pending').length,
              highlight: reports.filter(r => r.type !== 'copyright' && r.status === 'pending').length > 0,
            },
            {
              id: 'copyright_reports',
              label: '5. Copyright Reports',
              icon: ShieldAlert,
              count: reports.filter(r => r.type === 'copyright' && (r.status === 'pending' || r.status === 'under_review')).length,
              highlight: reports.filter(r => r.type === 'copyright' && r.status === 'pending').length > 0,
            },
            { id: 'banner_ads', label: '6. Banner Ads', icon: Layers, count: bannerAdsList.length },
            { id: 'fullscreen_ads', label: '7. Fullscreen Ads', icon: Megaphone, count: fullscreenAdsList.length },
            { id: 'ad_analytics', label: '8. Ad Analytics', icon: BarChart3 },
            { id: 'audit_logs', label: '9. Audit Logs', icon: FileText },
            {
              id: 'monetization',
              label: '10. Global Ad Payouts',
              icon: DollarSign,
              highlight: (stats?.monetization?.pendingPayoutsAmount ?? 0) > 0,
            },
            {
              id: 'withdrawals',
              label: '11. स्थानीय विथड्र (Local Wallets)',
              icon: Wallet,
              count: pendingWithdrawalsCount,
              highlight: pendingWithdrawalsCount > 0,
            },
            {
              id: 'anti_cheat',
              label: '12. Anti-Cheat & Security (एन्टि-चिटिङ)',
              icon: ShieldCheck,
              highlight: true,
            },
            {
              id: 'telegram_alerts',
              label: '13. Telegram Alerts (टेलिग्राम नोटिफिकेसन)',
              icon: Send,
              highlight: true,
            },
            { id: 'settings', label: '14. Settings & Master Password', icon: Sliders },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`admin-nav-${tab.id}`}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : tab.highlight
                        ? 'bg-rose-500 text-white'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-6 border-t border-white/10 mt-6 px-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Ad Engine Test</p>
            <button
              type="button"
              onClick={triggerFullScreenAdManually}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 p-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Simulate 10-Vid Ad</span>
            </button>
          </div>
        </div>

        {/* Content View Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950">
          {/* ========================================================
              SECTION 1: DASHBOARD (Overview & Core Metrics)
             ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h2 className="text-xl font-black text-white">1. Dashboard Overview</h2>
                <p className="text-xs text-zinc-400">Live platform totals across engagement, content, and advertising metrics.</p>
              </div>

              {/* 7 Required Dashboard Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Total Users */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
                    <Users className="h-4 w-4 text-sky-400" />
                  </div>
                  <span className="text-2xl font-black text-white">{stats?.totalUsers ?? users.length}</span>
                  <span className="text-[10px] text-zinc-500 block mt-1">Registered accounts</span>
                </div>

                {/* 2. Total Videos */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Videos</span>
                    <Film className="h-4 w-4 text-pink-400" />
                  </div>
                  <span className="text-2xl font-black text-white">{stats?.totalVideos ?? videos.length}</span>
                  <span className="text-[10px] text-zinc-500 block mt-1">Uploaded feed posts</span>
                </div>

                {/* 3. Total Views */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Views</span>
                    <Eye className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-2xl font-black text-emerald-400">
                    {(stats?.totalViews ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-1">Valid playback sessions</span>
                </div>

                {/* 4. Total Likes */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Likes</span>
                    <span className="text-rose-500 font-bold">♥</span>
                  </div>
                  <span className="text-2xl font-black text-rose-400">
                    {(stats?.totalLikes ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-1">Video likes received</span>
                </div>

                {/* 5. Total Comments */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Comments</span>
                    <span className="text-amber-400 font-bold">💬</span>
                  </div>
                  <span className="text-2xl font-black text-amber-400">
                    {(stats?.totalComments ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-1">Community comments</span>
                </div>

                {/* 6. Total Ad Impressions */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Ad Impressions</span>
                    <Layers className="h-4 w-4 text-indigo-400" />
                  </div>
                  <span className="text-2xl font-black text-indigo-300">
                    {((stats?.totalBannerImpressions ?? 0) + (stats?.totalFullscreenImpressions ?? 0)).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-1">
                    {stats?.totalBannerImpressions ?? 0} banner • {stats?.totalFullscreenImpressions ?? 0} fullscreen
                  </span>
                </div>

                {/* 7. Total Ad Clicks */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Ad Clicks</span>
                    <MousePointer className="h-4 w-4 text-teal-400" />
                  </div>
                  <span className="text-2xl font-black text-teal-300">
                    {((stats?.totalBannerClicks ?? 0) + (stats?.totalFullscreenClicks ?? 0)).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-1">
                    CTR: {calcCtr(
                      (stats?.totalBannerClicks ?? 0) + (stats?.totalFullscreenClicks ?? 0),
                      (stats?.totalBannerImpressions ?? 0) + (stats?.totalFullscreenImpressions ?? 0)
                    )}
                  </span>
                </div>

                {/* Active Campaigns */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Active Campaigns</span>
                    <Megaphone className="h-4 w-4 text-rose-400" />
                  </div>
                  <span className="text-2xl font-black text-rose-400">
                    {(stats?.activeBannerAds ?? 0) + (stats?.activeFullscreenAds ?? 0)}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-1">Currently live on platform</span>
                </div>

                {/* Copyright Claims */}
                <div
                  onClick={() => setActiveTab('copyright_reports')}
                  className="cursor-pointer rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors p-4"
                >
                  <div className="flex items-center justify-between text-amber-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Copyright Claims</span>
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                  </div>
                  <span className="text-2xl font-black text-amber-400">
                    {reports.filter(r => r.type === 'copyright' && (r.status === 'pending' || r.status === 'under_review')).length}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-1">Requires DMCA review</span>
                </div>

                {/* Creator Strikes */}
                <div
                  onClick={() => setActiveTab('copyright_reports')}
                  className="cursor-pointer rounded-2xl border border-white/10 bg-zinc-900 hover:bg-zinc-850 transition-colors p-4"
                >
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Creator Strikes</span>
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                  </div>
                  <span className="text-2xl font-black text-rose-400">
                    {users.reduce((acc, u) => acc + (u.copyrightStrikesCount || 0), 0)}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-1">Total active strikes issued</span>
                </div>
              </div>

              {/* Status Summary Banner */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-rose-500" />
                  <span>Configured Ad Engine Thresholds</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-xl bg-zinc-800/80 p-3 border border-white/5">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Fullscreen Frequency</span>
                    <span className="font-black text-white text-base mt-0.5 block">{adSettings.fullscreenAdInterval} Valid Videos</span>
                    <span className="text-[11px] text-zinc-400 mt-1 block">Triggered after milestone</span>
                  </div>
                  <div className="rounded-xl bg-zinc-800/80 p-3 border border-white/5">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Valid Watch Duration</span>
                    <span className="font-black text-white text-base mt-0.5 block">{adSettings.validViewThresholdSeconds}s Playback</span>
                    <span className="text-[11px] text-zinc-400 mt-1 block">Required to count video view</span>
                  </div>
                  <div className="rounded-xl bg-zinc-800/80 p-3 border border-white/5">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Banner Engine</span>
                    <span className="font-black text-emerald-400 text-base mt-0.5 block">
                      {adSettings.bannerAdsEnabled && adSettings.enableAds ? 'Active on Every Video' : 'Disabled'}
                    </span>
                    <span className="text-[11px] text-zinc-400 mt-1 block">Auto-renders without user request</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              SECTION 2: USERS (View, Search, Profile, Ban/Unban)
             ======================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-4 max-w-5xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">2. User Account Management</h2>
                  <p className="text-xs text-zinc-400">View users, search accounts, inspect creator profiles, and suspend/unban access.</p>
                </div>

                {/* User Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    id="admin-user-search-input"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search by username or email..."
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-800/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Followers</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-zinc-500">
                            No users found matching "{userSearch}"
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => (
                          <tr key={u.id} className="hover:bg-zinc-800/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={u.avatarUrl}
                                  alt={u.username}
                                  className="h-8 w-8 rounded-full object-cover border border-white/10"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-white">{u.displayName}</p>
                                    {u.isVerified && <CheckCircle className="h-3 w-3 text-sky-400" />}
                                  </div>
                                  <p className="text-[10px] text-zinc-400">@{u.username}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-zinc-300 font-mono text-[11px]">{u.email}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                  u.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-zinc-300 font-semibold">{u.followersCount.toLocaleString()}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  u.isBanned
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {u.isBanned ? 'Suspended / Banned' : 'Active'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserModal(u)}
                                  className="rounded-lg bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white"
                                  title="View User Profile"
                                >
                                  View Profile
                                </button>

                                {u.role !== 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBanUser(u)}
                                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                      u.isBanned
                                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                                        : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                                    }`}
                                  >
                                    {u.isBanned ? 'Unban User' : 'Suspend User'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              SECTION 3: VIDEOS (View Uploaded, Search/Filter, Details, Remove/Restore)
             ======================================================== */}
          {activeTab === 'videos' && (
            <div className="space-y-4 max-w-5xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">3. Video Content Moderation</h2>
                  <p className="text-xs text-zinc-400">Inspect uploaded videos, search by captions or creators, view details, remove or restore content.</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Filter */}
                  <select
                    value={videoStatusFilter}
                    onChange={e => setVideoStatusFilter(e.target.value as any)}
                    className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="all">All Videos ({videos.length})</option>
                    <option value="active">Active Feed ({videos.filter(v => v.status === 'active').length})</option>
                    <option value="removed">Removed Content ({videos.filter(v => v.status === 'removed').length})</option>
                  </select>

                  {/* Video Search */}
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="text"
                      value={videoSearch}
                      onChange={e => setVideoSearch(e.target.value)}
                      placeholder="Search caption, user, tag..."
                      className="w-full rounded-xl border border-white/10 bg-zinc-900 pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Videos Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredVideos.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-zinc-500">
                    No videos found matching your filter criteria.
                  </div>
                ) : (
                  filteredVideos.map(v => (
                    <div
                      key={v.id}
                      className={`rounded-2xl border bg-zinc-900 p-3 space-y-2.5 transition-all ${
                        v.status === 'removed' ? 'border-rose-500/30 opacity-70' : 'border-white/10'
                      }`}
                    >
                      {/* Video Thumbnail Box */}
                      <div className="relative aspect-16/9 w-full overflow-hidden rounded-xl bg-black group">
                        <img src={v.thumbnailUrl} alt={v.caption} className="h-full w-full object-cover" />
                        <div className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white flex items-center gap-1">
                          <span>@{v.user.username}</span>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              v.status === 'removed' ? 'bg-rose-500 text-white' : 'bg-emerald-500/80 text-white'
                            }`}
                          >
                            {v.status}
                          </span>
                        </div>
                        <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">
                          {v.viewsCount} views
                        </div>
                      </div>

                      <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">{v.caption}</p>

                      <div className="flex flex-wrap gap-1">
                        {v.hashtags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] text-rose-400 font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Video Stats & Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-zinc-400">
                        <span>{v.likesCount} likes • {v.commentsCount} comments</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedVideoModal(v)}
                            className="rounded-lg bg-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-300 hover:bg-zinc-700"
                            title="View Full Video Details"
                          >
                            Details
                          </button>
                          {v.status === 'removed' ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreVideo(v.id)}
                              className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/30"
                              title="Restore to Feed"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveVideo(v.id)}
                              className="rounded-lg bg-rose-500/20 border border-rose-500/30 px-2 py-1 text-[10px] font-bold text-rose-300 hover:bg-rose-500/30"
                              title="Remove Video"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              SECTION 4: REPORTS (Reported Videos, Users, Comments, Reason, Dismiss, Action)
             ======================================================== */}
          {activeTab === 'reports' && (
            <div className="space-y-4 max-w-5xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">4. Community Reports & Moderation</h2>
                  <p className="text-xs text-zinc-400">
                    Review reported videos, users, and comments. Inspect violation reasons, dismiss false flags, or take direct enforcement action.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <select
                    value={reportTypeFilter}
                    onChange={e => setReportTypeFilter(e.target.value as any)}
                    className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="all">All Report Types</option>
                    <option value="video">Reported Videos</option>
                    <option value="user">Reported Users</option>
                    <option value="comment">Reported Comments</option>
                  </select>

                  <select
                    value={reportStatusFilter}
                    onChange={e => setReportStatusFilter(e.target.value as any)}
                    className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>
              </div>

              {/* Reports List */}
              {filteredReports.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 rounded-2xl border border-white/10 bg-zinc-900">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-bold text-white">No reports matching filter!</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Platform is clean and safe.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReports.map(r => (
                    <div
                      key={r.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 transition-all ${
                        r.status === 'pending'
                          ? 'border-amber-500/30 bg-zinc-900'
                          : 'border-white/10 bg-zinc-900/60 opacity-80'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              r.type === 'video'
                                ? 'bg-pink-500/20 text-pink-300'
                                : r.type === 'user'
                                ? 'bg-sky-500/20 text-sky-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            Reported {r.type}
                          </span>
                          <span className="text-xs font-bold text-white">{r.reason}</span>
                          <span
                            className={`rounded-full px-2 py-0.2 text-[9px] font-semibold ${
                              r.status === 'pending'
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                : r.status === 'resolved'
                                ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-300 font-medium">{r.targetPreview}</p>
                        {r.details && (
                          <p className="text-[11px] text-zinc-400 italic bg-zinc-800/60 rounded-lg p-2 border border-white/5">
                            "{r.details}"
                          </p>
                        )}
                        <span className="text-[10px] text-zinc-500 block">
                          Reported by @{r.reporterUsername} • Target ID: {r.targetId}
                        </span>
                      </div>

                      {/* Moderation Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {r.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleResolveReport(r.id, 'dismissed')}
                              className="rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                            >
                              Dismiss
                            </button>

                            {r.type === 'video' && (
                              <button
                                type="button"
                                onClick={() => handleResolveReport(r.id, 'resolved', 'remove_video')}
                                className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 shadow"
                              >
                                Take Action: Remove Video
                              </button>
                            )}

                            {r.type === 'user' && (
                              <button
                                type="button"
                                onClick={() => handleResolveReport(r.id, 'resolved', 'ban_user')}
                                className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 shadow"
                              >
                                Take Action: Suspend User
                              </button>
                            )}

                            {r.type === 'comment' && (
                              <button
                                type="button"
                                onClick={() => handleResolveReport(r.id, 'resolved')}
                                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow"
                              >
                                Mark Resolved
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleResolveReport(r.id, 'pending')}
                            className="rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              SECTION 5: COPYRIGHT REPORTS & DMCA ENFORCEMENT
             ======================================================== */}
          {activeTab === 'copyright_reports' && (
            <AdminCopyrightReports
              onRefreshStats={loadData}
              getAuthHeaders={getAuthHeaders}
              triggerToast={triggerToast}
            />
          )}

          {/* ========================================================
              SECTION 6: BANNER ADS (Add, Upload Media, Destination URL, Active/Inactive, Dates, Priority, Impressions, Clicks)
             ======================================================== */}
          {activeTab === 'banner_ads' && (
            <div className="space-y-4 max-w-5xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">5. Banner Advertisements</h2>
                  <p className="text-xs text-zinc-400">
                    Manage bottom banner campaigns automatically displayed on every short video in the feed.
                  </p>
                </div>

                <button
                  type="button"
                  id="admin-create-banner-btn"
                  onClick={() => {
                    setCreateAdType('banner');
                    setIsCreatingAd(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 shadow transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Banner Ad</span>
                </button>
              </div>

              {/* Banner Ads Table */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-800/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                      <tr>
                        <th className="py-3 px-4">Banner / Sponsor</th>
                        <th className="py-3 px-4">Destination URL</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Schedule</th>
                        <th className="py-3 px-4">Impressions</th>
                        <th className="py-3 px-4">Clicks (CTR)</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {bannerAdsList.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-zinc-500">
                            No banner advertisements configured. Click "Add Banner Ad" to create one.
                          </td>
                        </tr>
                      ) : (
                        bannerAdsList.map(ad => (
                          <tr key={ad.id} className="hover:bg-zinc-800/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={ad.mediaUrl || ad.sponsorLogo}
                                  alt={ad.title}
                                  className="h-10 w-10 rounded-lg object-cover bg-zinc-800 border border-white/10"
                                />
                                <div className="min-w-0 max-w-xs">
                                  <p className="font-bold text-white truncate">{ad.title}</p>
                                  <p className="text-[10px] text-zinc-400 truncate">
                                    {ad.sponsorName} • CTA: <span className="text-amber-300 font-semibold">{ad.ctaText}</span>
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <a
                                href={ad.destinationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-400 hover:underline max-w-[180px] truncate block flex items-center gap-1"
                              >
                                <span className="truncate">{ad.destinationUrl}</span>
                                <ArrowUpRight className="h-3 w-3 shrink-0" />
                              </a>
                            </td>
                            <td className="py-3 px-4 font-bold text-zinc-300">{ad.priority}/10</td>
                            <td className="py-3 px-4 text-zinc-400 text-[10px]">
                              {ad.startDate || 'Immediate'} → {ad.endDate || 'Ongoing'}
                            </td>
                            <td className="py-3 px-4 font-bold text-white">{ad.impressions.toLocaleString()}</td>
                            <td className="py-3 px-4 font-semibold text-white">
                              {ad.clicks.toLocaleString()}{' '}
                              <span className="text-zinc-400 text-[10px]">({calcCtr(ad.clicks, ad.impressions)})</span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => handleToggleAdActive(ad)}
                                className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
                                  ad.isActive
                                    ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                                }`}
                              >
                                {ad.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                <span>{ad.isActive ? 'Active' : 'Inactive'}</span>
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteAd(ad.id)}
                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-400"
                                title="Delete Ad"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              SECTION 6: FULLSCREEN ADS (Add, Upload Media, Destination URL, Active/Inactive, Dates, Priority, Impressions, Clicks)
             ======================================================== */}
          {activeTab === 'fullscreen_ads' && (
            <div className="space-y-4 max-w-5xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">6. Fullscreen Milestone Advertisements</h2>
                  <p className="text-xs text-zinc-400">
                    Manage full-screen interstitial campaigns displayed automatically after users watch {adSettings.fullscreenAdInterval} valid videos.
                  </p>
                </div>

                <button
                  type="button"
                  id="admin-create-fullscreen-btn"
                  onClick={() => {
                    setCreateAdType('fullscreen');
                    setIsCreatingAd(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-600 shadow transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Fullscreen Ad</span>
                </button>
              </div>

              {/* Fullscreen Ads Table */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-800/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                      <tr>
                        <th className="py-3 px-4">Fullscreen Ad / Media</th>
                        <th className="py-3 px-4">Destination URL</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Schedule</th>
                        <th className="py-3 px-4">Impressions</th>
                        <th className="py-3 px-4">Clicks (CTR)</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {fullscreenAdsList.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-zinc-500">
                            No full-screen advertisements configured. Click "Add Fullscreen Ad" to create one.
                          </td>
                        </tr>
                      ) : (
                        fullscreenAdsList.map(ad => (
                          <tr key={ad.id} className="hover:bg-zinc-800/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={ad.mediaUrl || ad.sponsorLogo}
                                  alt={ad.title}
                                  className="h-12 w-9 rounded-lg object-cover bg-zinc-800 border border-white/10"
                                />
                                <div className="min-w-0 max-w-xs">
                                  <p className="font-bold text-white truncate">{ad.title}</p>
                                  <p className="text-[10px] text-zinc-400 line-clamp-1">{ad.description}</p>
                                  <p className="text-[10px] text-rose-300 font-semibold mt-0.5">
                                    {ad.sponsorName} • {ad.ctaText}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <a
                                href={ad.destinationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-400 hover:underline max-w-[180px] truncate block flex items-center gap-1"
                              >
                                <span className="truncate">{ad.destinationUrl}</span>
                                <ArrowUpRight className="h-3 w-3 shrink-0" />
                              </a>
                            </td>
                            <td className="py-3 px-4 font-bold text-zinc-300">{ad.priority}/10</td>
                            <td className="py-3 px-4 text-zinc-400 text-[10px]">
                              {ad.startDate || 'Immediate'} → {ad.endDate || 'Ongoing'}
                            </td>
                            <td className="py-3 px-4 font-bold text-white">{ad.impressions.toLocaleString()}</td>
                            <td className="py-3 px-4 font-semibold text-white">
                              {ad.clicks.toLocaleString()}{' '}
                              <span className="text-zinc-400 text-[10px]">({calcCtr(ad.clicks, ad.impressions)})</span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => handleToggleAdActive(ad)}
                                className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
                                  ad.isActive
                                    ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                                }`}
                              >
                                {ad.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                <span>{ad.isActive ? 'Active' : 'Inactive'}</span>
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteAd(ad.id)}
                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-400"
                                title="Delete Ad"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              SECTION 7: AD ANALYTICS (Valid Impressions, Clicks, CTR, Active Ads, Top-performing Ads)
             ======================================================== */}
          {activeTab === 'ad_analytics' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h2 className="text-xl font-black text-white">7. Ad Analytics & Performance</h2>
                <p className="text-xs text-zinc-400">
                  Comprehensive performance breakdown of valid impressions, clicks, click-through rates (CTR), and top-performing campaigns.
                </p>
              </div>

              {/* 5 Core Analytics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Valid Impressions */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Valid Impressions
                  </span>
                  <span className="text-2xl font-black text-white mt-1 block">
                    {analyticsData.totalValidImpressions.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    {analyticsData.totalBannerImp} banner • {analyticsData.totalFsImp} fullscreen
                  </span>
                </div>

                {/* 2. Total Clicks */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Total Clicks
                  </span>
                  <span className="text-2xl font-black text-amber-400 mt-1 block">
                    {analyticsData.totalClicks.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-amber-300/80 mt-1 block">Direct advertiser conversions</span>
                </div>

                {/* 3. Overall CTR */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Average CTR
                  </span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">
                    {analyticsData.overallCtr}
                  </span>
                  <span className="text-[10px] text-emerald-300/80 mt-1 block">Industry benchmark: 1.5 - 3.0%</span>
                </div>

                {/* 4. Active Ads */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Active Ads
                  </span>
                  <span className="text-2xl font-black text-sky-400 mt-1 block">
                    {analyticsData.activeAdsCount} / {ads.length}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 block">Running in rotational pool</span>
                </div>
              </div>

              {/* 5. Top-Performing Ads Ranking */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span>Top-Performing Campaigns Ranked by CTR & Engagement</span>
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Sorted by Performance</span>
                </div>

                <div className="space-y-2.5">
                  {analyticsData.topPerforming.map((ad, idx) => {
                    const ctrVal = ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : '0.00';
                    return (
                      <div
                        key={ad.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/5 bg-zinc-800/60 p-3.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 font-black text-[11px] text-zinc-300">
                            #{idx + 1}
                          </span>
                          <img
                            src={ad.mediaUrl || ad.sponsorLogo}
                            alt={ad.title}
                            className="h-10 w-10 shrink-0 rounded-lg object-cover bg-zinc-900 border border-white/10"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white truncate text-xs">{ad.title}</p>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                                  ad.type === 'banner' ? 'bg-amber-400/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {ad.type}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400">{ad.sponsorName} • CTA: {ad.ctaText}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-5 shrink-0 text-right">
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase font-bold block">Impressions</span>
                            <span className="text-xs font-bold text-white">{ad.impressions.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase font-bold block">Clicks</span>
                            <span className="text-xs font-bold text-amber-300">{ad.clicks.toLocaleString()}</span>
                          </div>
                          <div className="w-16">
                            <span className="text-[10px] text-zinc-400 uppercase font-bold block">CTR</span>
                            <span className="text-xs font-black text-emerald-400">{ctrVal}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              SECTION 9: AUDIT LOGS (Immutable admin action tracking)
             ======================================================== */}
          {activeTab === 'audit_logs' && (
            <AdminAuditLogs
              getAuthHeaders={getAuthHeaders}
              triggerToast={triggerToast}
            />
          )}

          {/* ========================================================
              SECTION 10: MONETIZATION & PAYOUT OPERATIONS
             ======================================================== */}
          {activeTab === 'monetization' && (
            <AdminMonetizationPanel
              users={users}
              onTriggerToast={triggerToast}
            />
          )}

          {/* ========================================================
              SECTION 11: NEPAL ESEWA & KHALTI WITHDRAWAL OPERATIONS
             ======================================================== */}
          {activeTab === 'withdrawals' && (
            <AdminWithdrawalsPanel
              onTriggerToast={triggerToast}
            />
          )}

          {/* ========================================================
              SECTION 12: ANTI-CHEAT & SECURITY OPERATIONS
             ======================================================== */}
          {activeTab === 'anti_cheat' && (
            <AdminAntiCheatPanel
              adSettings={adSettings}
              onUpdateSettings={async (newSettings) => {
                const updated = { ...adSettings, ...newSettings };
                setAdSettings(updated);
                await fetch('/api/ads/settings', {
                  method: 'PUT',
                  headers: getAuthHeaders(),
                  body: JSON.stringify(updated),
                });
              }}
              getAuthHeaders={getAuthHeaders}
              triggerToast={triggerToast}
            />
          )}

          {/* ========================================================
              SECTION 13: TELEGRAM INSTANT ALERTS
             ======================================================== */}
          {activeTab === 'telegram_alerts' && (
            <AdminTelegramAlertsPanel
              adSettings={adSettings}
              onUpdateSettings={async (newSettings) => {
                const updated = { ...adSettings, ...newSettings };
                setAdSettings(updated);
                await fetch('/api/ads/settings', {
                  method: 'PUT',
                  headers: getAuthHeaders(),
                  body: JSON.stringify(updated),
                });
              }}
              getAuthHeaders={getAuthHeaders}
              triggerToast={triggerToast}
            />
          )}

          {/* ========================================================
              SECTION 14: SETTINGS & MASTER PASSWORD
             ======================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              {/* Master Password Change Card */}
              <div className="rounded-2xl border border-rose-500/30 bg-zinc-900/90 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">एडमिन मास्टर पासवर्ड परिवर्तन गर्नुहोस् (Change Admin Password)</h3>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      एडमिन ड्यासबोर्ड खोल्न प्रयोग हुने गुप्त पासवर्ड यहाँबाट बदल्न सकिन्छ।
                    </p>
                  </div>
                </div>

                <form onSubmit={handleChangeAdminPassword} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-zinc-300 font-semibold text-xs mb-1">
                      नयाँ एडमिन पासवर्ड (New Password)
                    </label>
                    <input
                      type="password"
                      value={newAdminPasswordInput}
                      onChange={e => setNewAdminPasswordInput(e.target.value)}
                      placeholder="नयाँ गोप्य पासवर्ड हाल्नुहोस् (कम्तीमा ६ अक्षर)..."
                      className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[11px] text-zinc-400">
                      हालको पासवर्ड: <code className="text-amber-300 font-mono font-bold">{adSettings.adminPassword || 'TikTopAdmin@2026'}</code>
                    </span>
                    <button
                      type="submit"
                      disabled={isChangingPassword || !newAdminPasswordInput.trim()}
                      className="rounded-xl bg-rose-500 hover:bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-all disabled:opacity-50"
                    >
                      {isChangingPassword ? 'परिवर्तन हुँदैछ...' : 'पासवर्ड बदल्नुहोस्'}
                    </button>
                  </div>
                </form>
              </div>

              <div>
                <h2 className="text-xl font-black text-white">Ad Engine & Feed Settings</h2>
                <p className="text-xs text-zinc-400">
                  Configure the 10-video fullscreen threshold, valid watch duration, ad visibility requirements, and switches for banner & fullscreen ads.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="rounded-2xl border border-white/10 bg-zinc-900 p-6 space-y-6 text-xs">
                {/* 1. Number of valid videos before fullscreen ad */}
                <div>
                  <label className="block font-bold text-white text-sm mb-1">
                    1. Videos Before Fullscreen Ad (Threshold)
                  </label>
                  <p className="text-zinc-400 text-[11px] mb-2 leading-relaxed">
                    The exact count of valid video views a user must manually swipe through before the fullscreen interstitial ad appears automatically.
                    <span className="text-rose-400 font-bold ml-1">Default: 10 valid videos.</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      id="admin-settings-fullscreen-interval"
                      min={1}
                      max={50}
                      value={adSettings.fullscreenAdInterval}
                      onChange={e => setAdSettings(prev => ({ ...prev, fullscreenAdInterval: Number(e.target.value) }))}
                      className="w-32 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 font-bold text-white text-sm focus:border-rose-500 focus:outline-none"
                    />
                    <span className="text-zinc-400 font-medium">Valid videos watched per interstitial ad</span>
                  </div>
                </div>

                {/* 2. Minimum watch duration required for a valid video view */}
                <div className="border-t border-white/10 pt-5">
                  <label className="block font-bold text-white text-sm mb-1">
                    2. Minimum Watch Duration for Valid Video View (Seconds)
                  </label>
                  <p className="text-zinc-400 text-[11px] mb-2 leading-relaxed">
                    Continuous playback duration required before a video is considered genuinely watched. Quick swipes under this duration do not increment the 10-video quota.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.5"
                      min={0.5}
                      max={15}
                      value={adSettings.validViewThresholdSeconds}
                      onChange={e => setAdSettings(prev => ({ ...prev, validViewThresholdSeconds: Number(e.target.value) }))}
                      className="w-32 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 font-bold text-white text-sm focus:border-rose-500 focus:outline-none"
                    />
                    <span className="text-zinc-400 font-medium">Seconds of active continuous playback</span>
                  </div>
                </div>

                {/* 3. Minimum ad visibility duration for a valid impression */}
                <div className="border-t border-white/10 pt-5">
                  <label className="block font-bold text-white text-sm mb-1">
                    3. Minimum Ad Visibility Duration for Valid Impression (Seconds)
                  </label>
                  <p className="text-zinc-400 text-[11px] mb-2 leading-relaxed">
                    Minimum on-screen rendering time required to register a verified advertisement impression in analytics.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.5"
                      min={0.5}
                      max={10}
                      value={adSettings.minAdVisibilitySeconds ?? 1.0}
                      onChange={e => setAdSettings(prev => ({ ...prev, minAdVisibilitySeconds: Number(e.target.value) }))}
                      className="w-32 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 font-bold text-white text-sm focus:border-rose-500 focus:outline-none"
                    />
                    <span className="text-zinc-400 font-medium">Seconds of continuous ad view visibility</span>
                  </div>
                </div>

                {/* 4. Banner ads on/off */}
                <div className="border-t border-white/10 pt-5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="admin-settings-banner-toggle"
                      checked={adSettings.bannerAdsEnabled}
                      onChange={e => setAdSettings(prev => ({ ...prev, bannerAdsEnabled: e.target.checked }))}
                      className="h-4 w-4 mt-0.5 rounded text-amber-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-bold text-white text-sm block">4. Banner Ads (On / Off)</span>
                      <span className="text-[11px] text-zinc-400">
                        When enabled, small bottom banner ads automatically appear on every video in the feed.
                      </span>
                    </div>
                  </label>
                </div>

                {/* 5. Fullscreen ads on/off */}
                <div className="border-t border-white/10 pt-5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="admin-settings-fullscreen-toggle"
                      checked={adSettings.fullscreenAdsEnabled}
                      onChange={e => setAdSettings(prev => ({ ...prev, fullscreenAdsEnabled: e.target.checked }))}
                      className="h-4 w-4 mt-0.5 rounded text-rose-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-bold text-white text-sm block">5. Fullscreen Ads (On / Off)</span>
                      <span className="text-[11px] text-zinc-400">
                        When enabled, full-screen interstitial ads trigger automatically after {adSettings.fullscreenAdInterval} valid videos.
                      </span>
                    </div>
                  </label>
                </div>

                {/* AdMob Official Units Configuration */}
                <div className="border-t border-white/10 pt-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      Official Google AdMob Units
                    </span>
                    <span className="text-[11px] text-zinc-400">Integrated Ad Network</span>
                  </div>

                  <div>
                    <label className="block font-bold text-white text-xs mb-1">
                      AdMob App ID
                    </label>
                    <input
                      type="text"
                      id="admin-settings-admob-app-id"
                      value={adSettings.adMobAppId || 'ca-app-pub-977092633792186~7605665418'}
                      onChange={e => setAdSettings(prev => ({ ...prev, adMobAppId: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 font-mono text-zinc-200 text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-white text-xs mb-1">
                        AdMob Banner Unit ID
                      </label>
                      <input
                        type="text"
                        id="admin-settings-admob-banner-id"
                        value={adSettings.adMobBannerUnitId || 'ca-app-pub-977092633792186/4461566677'}
                        onChange={e => setAdSettings(prev => ({ ...prev, adMobBannerUnitId: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 font-mono text-zinc-200 text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-white text-xs mb-1">
                        AdMob Rewarded / Interstitial Unit ID
                      </label>
                      <input
                        type="text"
                        id="admin-settings-admob-rewarded-id"
                        value={adSettings.adMobRewardedUnitId || 'ca-app-pub-977092633792186/526899383'}
                        onChange={e => setAdSettings(prev => ({ ...prev, adMobRewardedUnitId: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 font-mono text-zinc-200 text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Master Switch */}
                <div className="border-t border-white/10 pt-5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adSettings.enableAds}
                      onChange={e => setAdSettings(prev => ({ ...prev, enableAds: e.target.checked }))}
                      className="h-4 w-4 mt-0.5 rounded text-rose-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-bold text-white block">Master Ad Engine Switch</span>
                      <span className="text-[11px] text-zinc-400">Global kill-switch for all advertisements across the platform.</span>
                    </div>
                  </label>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    id="admin-save-settings-btn"
                    className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-3 font-bold text-white text-xs hover:brightness-110 shadow-lg transition-all"
                  >
                    Save & Apply Ad Engine Settings
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          MODAL: USER PROFILE INSPECTION
         ======================================================== */}
      {selectedUserModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">User Profile Record</h3>
              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                className="rounded-full p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <img
                src={selectedUserModal.avatarUrl}
                alt={selectedUserModal.username}
                className="h-14 w-14 rounded-full object-cover border-2 border-rose-500"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-base font-bold text-white">{selectedUserModal.displayName}</h4>
                  {selectedUserModal.isVerified && <CheckCircle className="h-3.5 w-3.5 text-sky-400" />}
                </div>
                <p className="text-xs text-zinc-400">@{selectedUserModal.username}</p>
                <span
                  className={`inline-block rounded px-2 py-0.2 text-[9px] font-bold uppercase mt-1 ${
                    selectedUserModal.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  Role: {selectedUserModal.role}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-300 mb-5">
              <div className="rounded-xl bg-zinc-800/80 p-3 border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Biography</span>
                <p className="leading-relaxed">{selectedUserModal.bio || 'No bio provided'}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-zinc-800/80 p-2.5 border border-white/5">
                  <span className="text-[10px] text-zinc-400 block font-bold">Followers</span>
                  <span className="text-sm font-black text-white">{selectedUserModal.followersCount.toLocaleString()}</span>
                </div>
                <div className="rounded-xl bg-zinc-800/80 p-2.5 border border-white/5">
                  <span className="text-[10px] text-zinc-400 block font-bold">Following</span>
                  <span className="text-sm font-black text-white">{selectedUserModal.followingCount.toLocaleString()}</span>
                </div>
                <div className="rounded-xl bg-zinc-800/80 p-2.5 border border-white/5">
                  <span className="text-[10px] text-zinc-400 block font-bold">Likes</span>
                  <span className="text-sm font-black text-rose-400">
                    {selectedUserModal.likesReceivedCount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 pt-1">
                <span>Email: </span>
                <span className="text-zinc-200 font-mono">{selectedUserModal.email}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                className="flex-1 rounded-xl bg-zinc-800 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-700"
              >
                Close
              </button>
              {selectedUserModal.role !== 'admin' && (
                <button
                  type="button"
                  onClick={() => handleToggleBanUser(selectedUserModal)}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${
                    selectedUserModal.isBanned
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-rose-600 text-white hover:bg-rose-500'
                  }`}
                >
                  {selectedUserModal.isBanned ? 'Unban User' : 'Suspend / Ban User'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: VIDEO DETAILS INSPECTION
         ======================================================== */}
      {selectedVideoModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Video Content Details</h3>
              <button
                type="button"
                onClick={() => setSelectedVideoModal(null)}
                className="rounded-full p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="aspect-16/9 w-full rounded-xl overflow-hidden bg-black border border-white/10">
                <video
                  src={selectedVideoModal.videoUrl}
                  poster={selectedVideoModal.thumbnailUrl}
                  controls
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Caption</span>
                <p className="text-zinc-200 text-sm leading-relaxed">{selectedVideoModal.caption}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-zinc-300">
                <div className="rounded-xl bg-zinc-800 p-3">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Creator</span>
                  <p className="font-bold text-white mt-0.5">@{selectedVideoModal.user.username}</p>
                  <p className="text-[10px] text-zinc-400">{selectedVideoModal.user.displayName}</p>
                </div>

                <div className="rounded-xl bg-zinc-800 p-3">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Status</span>
                  <p
                    className={`font-black uppercase mt-0.5 ${
                      selectedVideoModal.status === 'removed' ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {selectedVideoModal.status}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl bg-zinc-800 p-2">
                  <span className="text-[10px] text-zinc-400 block">Views</span>
                  <span className="text-xs font-bold text-white">{selectedVideoModal.viewsCount}</span>
                </div>
                <div className="rounded-xl bg-zinc-800 p-2">
                  <span className="text-[10px] text-zinc-400 block">Likes</span>
                  <span className="text-xs font-bold text-rose-400">{selectedVideoModal.likesCount}</span>
                </div>
                <div className="rounded-xl bg-zinc-800 p-2">
                  <span className="text-[10px] text-zinc-400 block">Comments</span>
                  <span className="text-xs font-bold text-amber-400">{selectedVideoModal.commentsCount}</span>
                </div>
                <div className="rounded-xl bg-zinc-800 p-2">
                  <span className="text-[10px] text-zinc-400 block">Shares</span>
                  <span className="text-xs font-bold text-sky-400">{selectedVideoModal.sharesCount}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVideoModal(null)}
                  className="flex-1 rounded-xl bg-zinc-800 py-2.5 font-bold text-zinc-300 hover:bg-zinc-700"
                >
                  Close
                </button>
                {selectedVideoModal.status === 'removed' ? (
                  <button
                    type="button"
                    onClick={() => handleRestoreVideo(selectedVideoModal.id)}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-500 shadow"
                  >
                    Restore Video to Feed
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRemoveVideo(selectedVideoModal.id)}
                    className="flex-1 rounded-xl bg-rose-600 py-2.5 font-bold text-white hover:bg-rose-500 shadow"
                  >
                    Remove Video from Feed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD BANNER / FULLSCREEN AD (Upload Media, URL, Active, Dates, Priority)
         ======================================================== */}
      {isCreatingAd && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <h3 className="text-base font-black">
                  Create {createAdType === 'banner' ? 'Banner' : 'Fullscreen Milestone'} Ad
                </h3>
                <p className="text-[11px] text-zinc-400">
                  {createAdType === 'banner'
                    ? 'Banner ads appear automatically on every feed video.'
                    : `Fullscreen ads appear automatically after ${adSettings.fullscreenAdInterval} valid video views.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingAd(false)}
                className="rounded-full p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdSubmit} className="space-y-4 text-xs">
              {/* Campaign Title */}
              <div>
                <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  value={newAd.title}
                  onChange={e => setNewAd(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. CyberDrive GT or SuperGlow Serum"
                  className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Pitch / Description */}
              <div>
                <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">
                  Description / Value Pitch
                </label>
                <textarea
                  rows={2}
                  value={newAd.description}
                  onChange={e => setNewAd(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Exclusive 20% discount on first orders..."
                  className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Destination URL & CTA Text */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">
                    Destination URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={newAd.destinationUrl}
                    onChange={e => setNewAd(prev => ({ ...prev, destinationUrl: e.target.value }))}
                    placeholder="https://example.com/shop"
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">
                    CTA Button Text *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAd.ctaText}
                    onChange={e => setNewAd(prev => ({ ...prev, ctaText: e.target.value }))}
                    placeholder="Shop Now, Install Now..."
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sponsor Name & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">
                    Sponsor Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAd.sponsorName}
                    onChange={e => setNewAd(prev => ({ ...prev, sponsorName: e.target.value }))}
                    placeholder="e.g. BrandName Inc."
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">
                    Priority (1 to 10) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newAd.priority}
                    onChange={e => setNewAd(prev => ({ ...prev, priority: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Schedule: Start & End Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newAd.startDate}
                    onChange={e => setNewAd(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newAd.endDate}
                    onChange={e => setNewAd(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Media URL / Upload Image */}
              <div>
                <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">
                  Ad Media Image URL *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={newAd.mediaUrl}
                    onChange={e => setNewAd(prev => ({ ...prev, mediaUrl: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-zinc-300 hover:bg-zinc-700 flex items-center gap-1 shrink-0"
                    title="Upload local image file"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = ev => {
                          if (ev.target?.result) {
                            setNewAd(prev => ({ ...prev, mediaUrl: String(ev.target?.result) }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>

                {newAd.mediaUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={newAd.mediaUrl}
                      alt="Preview"
                      className="h-12 w-20 rounded-lg object-cover bg-black border border-white/10"
                    />
                    <span className="text-[11px] text-zinc-400">Media Preview Loaded</span>
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="border-t border-white/10 pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAd.isActive}
                    onChange={e => setNewAd(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded text-rose-500 focus:ring-0"
                  />
                  <span className="font-bold text-white">Publish as Active Campaign Immediately</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingAd(false)}
                  className="flex-1 rounded-xl bg-zinc-800 py-2.5 font-bold text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-rose-500 py-2.5 font-bold text-white hover:bg-rose-600 shadow"
                >
                  Publish Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
