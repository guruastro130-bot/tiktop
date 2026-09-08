import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  AlertTriangle,
  Lock,
  KeyRound,
  ShieldCheck,
  TrendingUp,
  Coins,
  DollarSign,
  UserCheck,
  ArrowDownRight,
  Info,
  Globe,
  Bell,
  Volume2
} from 'lucide-react';
import { WithdrawalRequest, SupportedCountryCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { AdminPanel } from './AdminPanel';
import { SUPPORTED_COUNTRIES, getCountryByCode } from '../data/countryWallets';

interface AdminWithdrawalsPanelProps {
  onClose?: () => void;
  isStandalone?: boolean;
  onTriggerToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const AdminWithdrawalsPanel: React.FC<AdminWithdrawalsPanelProps> = ({
  onClose,
  isStandalone = false,
  onTriggerToast
}) => {
  const { currentUser, isAdmin } = useAuth();

  // Security Unlock State (Pin: 7788 or TikTopAdmin@2026)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return (
      sessionStorage.getItem('tiktop_admin_payout_unlocked') === 'true' ||
      currentUser?.role === 'admin' ||
      currentUser?.id === 'user_admin'
    );
  });
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Data States
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Filters & Search
  const [viewMode, setViewMode] = useState<'full' | 'secret_compact'>('full');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'amount_high'>('newest');

  // Real-time Pending Alert State
  const [newWithdrawalAlert, setNewWithdrawalAlert] = useState<WithdrawalRequest | null>(null);
  const prevPendingCountRef = useRef<number>(0);

  // Action Modals
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [txnRefInput, setTxnRefInput] = useState<string>('');
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Points Adjustment Tool for Quick Testing
  const [showPointsAdjustModal, setShowPointsAdjustModal] = useState<boolean>(false);
  const [targetUsername, setTargetUsername] = useState<string>('sarah_dance');
  const [pointsDelta, setPointsDelta] = useState<number>(500000);
  const [adjustLoading, setAdjustLoading] = useState<boolean>(false);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    if (onTriggerToast) {
      onTriggerToast(msg, type);
    }
  };

  const playAlertChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // Audio context might require user gesture
    }
  };

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-user-id': currentUser?.id || 'user_admin',
    'x-admin-password': sessionStorage.getItem('tiktop_admin_password') || 'TikTopAdmin@2026',
  });

  // Load Withdrawal Requests from Server
  const fetchWithdrawals = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    try {
      const res = await fetch('/api/admin/withdrawals', {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const list: WithdrawalRequest[] = data.withdrawals || [];
        setWithdrawals(list);

        const currentPending = list.filter(w => String(w.status).toLowerCase() === 'pending');
        if (prevPendingCountRef.current > 0 && currentPending.length > prevPendingCountRef.current) {
          // A new withdrawal has arrived!
          playAlertChime();
          const newest = currentPending[0];
          setNewWithdrawalAlert(newest);
          notify(`🚨 नयाँ विथड्र अलर्ट! @${newest.username} ले ${newest.countryName || 'नेपाल'} बाट विथड्र माग गर्नुभयो।`, 'success');
        }
        prevPendingCountRef.current = currentPending.length;
      } else {
        // Fallback to my requests endpoint if admin endpoint returns 403
        const fallbackRes = await fetch('/api/withdrawals/my', {
          headers: getHeaders()
        });
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          setWithdrawals(fbData.withdrawals || []);
        }
      }
    } catch (err) {
      if (!isPoll) {
        console.error('Failed to fetch withdrawal requests:', err);
        notify('विथड्र लिस्ट लोड गर्न सकिएन', 'error');
      }
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchWithdrawals();
      // Periodic poll every 5 seconds for instant admin notifications
      const interval = setInterval(() => {
        fetchWithdrawals(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isUnlocked]);

  // Handle Admin Passcode Unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const cleanPin = adminPinInput.trim();
    
    if (cleanPin === 'TikTopAdmin@2026' || cleanPin === '7788' || cleanPin === 'admin123' || isAdmin) {
      setIsUnlocked(true);
      sessionStorage.setItem('tiktop_admin_payout_unlocked', 'true');
      sessionStorage.setItem('tiktop_admin_password', cleanPin);
      notify('एडमिन सेक्युरिटी अनलक भयो! स्वागत छ।', 'success');
      return;
    }

    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsUnlocked(true);
        sessionStorage.setItem('tiktop_admin_payout_unlocked', 'true');
        sessionStorage.setItem('tiktop_admin_password', cleanPin);
        notify('एडमिन सेक्युरिटी अनलक भयो! स्वागत छ।', 'success');
      } else {
        setPinError('गलत एडमिन पासवर्ड वा पिन! (Default: 7788 वा TikTopAdmin@2026)');
      }
    } catch {
      setPinError('प्रमाणीकरण गर्न सकिएन। पुनः प्रयास गर्नुहोस्।');
    }
  };

  const handleLockSession = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('tiktop_admin_payout_unlocked');
    notify('एडमिन सेसन लक गरियो।', 'success');
  };

  // Copy to clipboard helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(text);
    setCopiedId(id);
    notify(`कपी गरियो: ${text}`, 'success');
    setTimeout(() => {
      setCopiedPhone(null);
      setCopiedId(null);
    }, 2500);
  };

  // Open Approval / Rejection Dialog
  const openActionModal = (req: WithdrawalRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setActionType(type);
    setTxnRefInput('');
    setAdminNoteInput('');
  };

  // Process Approval or Rejection
  const handleProcessAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !actionType) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${selectedRequest.id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          status: actionType === 'approve' ? 'approved' : 'rejected',
          transactionReference: txnRefInput.trim() || undefined,
          adminNotes: adminNoteInput.trim() || (actionType === 'approve' ? 'भुक्तानी सम्पन्न भयो।' : 'अनुरोध अस्वीकृत गरियो।')
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        notify(
          actionType === 'approve'
            ? `सफलतापूर्वक स्वीकृत भयो! (रकम: ${selectedRequest.currencySymbol || 'रू'} ${selectedRequest.localNetPayout || selectedRequest.finalPayoutNpr || selectedRequest.amountNpr})`
            : 'अनुरोध अस्वीकृत गरियो र पोइन्ट फिर्ता भयो।',
          actionType === 'approve' ? 'success' : 'error'
        );

        setWithdrawals(prev =>
          prev.map(item => (item.id === selectedRequest.id ? data.withdrawal : item))
        );
        setSelectedRequest(null);
        setActionType(null);
      } else {
        notify(data.error || 'अपडेट गर्न सकिएन', 'error');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      notify('सर्भरमा समस्या आयो', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Points Adjustment (Add points to user for easy testing)
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustLoading(true);
    try {
      const res = await fetch(`/api/users/${targetUsername}/points/adjust`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ pointsDelta })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        notify(`@${targetUsername} को खातामा ${pointsDelta > 0 ? '+' : ''}${pointsDelta.toLocaleString()} पोइन्ट थपियो! (कुल: ${data.points.toLocaleString()})`, 'success');
        setShowPointsAdjustModal(false);
      } else {
        notify(data.error || 'पोइन्ट अपडेट गर्न सकिएन', 'error');
      }
    } catch (err) {
      console.error('Error adjusting points:', err);
      notify('सर्भरमा समस्या आयो', 'error');
    } finally {
      setAdjustLoading(false);
    }
  };

  // Filtered & Sorted Requests
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => {
      // Status filter
      if (statusFilter !== 'all' && String(w.status).toLowerCase() !== statusFilter.toLowerCase()) return false;
      
      // Country filter
      if (countryFilter !== 'all') {
        if (w.country && w.country !== countryFilter) return false;
        if (!w.country && countryFilter !== 'NP') return false; // Default older records to Nepal
      }

      // Method filter
      if (methodFilter !== 'all' && !String(w.paymentMethod).toLowerCase().includes(methodFilter.toLowerCase())) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = ((w.fullName || w.userName || w.accountHolderName) || '').toLowerCase().includes(q);
        const matchUser = (w.username || '').toLowerCase().includes(q);
        const matchPhone = ((w.mobileNumber || w.walletIdentifier || w.phone || w.accountNumber) || '').includes(q);
        const matchCountry = ((w.countryName || w.country) || '').toLowerCase().includes(q);
        const matchId = ((w.id || w.requestId) || '').toLowerCase().includes(q);
        const matchTxn = (w.transactionReference || '').toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchPhone && !matchCountry && !matchId && !matchTxn) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.requestedAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.requestedAt || b.timestamp || 0).getTime();
      if (sortOrder === 'newest') {
        return timeB - timeA;
      }
      if (sortOrder === 'oldest') {
        return timeA - timeB;
      }
      if (sortOrder === 'amount_high') {
        const amtA = a.amountNpr || a.requestedNPR || 0;
        const amtB = b.amountNpr || b.requestedNPR || 0;
        return amtB - amtA;
      }
      return 0;
    });
  }, [withdrawals, statusFilter, countryFilter, methodFilter, searchQuery, sortOrder]);

  // Calculated Stats
  const stats = useMemo(() => {
    const total = withdrawals.length;
    const pendingList = withdrawals.filter(w => String(w.status).toLowerCase() === 'pending');
    const approvedList = withdrawals.filter(w => String(w.status).toLowerCase() === 'approved');
    const rejectedList = withdrawals.filter(w => String(w.status).toLowerCase() === 'rejected');

    const pendingAmountNpr = pendingList.reduce((acc, w) => acc + (w.amountNpr || w.requestedNPR || 500), 0);
    const approvedAmountNpr = approvedList.reduce((acc, w) => acc + (w.amountNpr || w.requestedNPR || 500), 0);
    const totalPointsDeducted = approvedList.reduce((acc, w) => acc + (w.pointsDeducted || 500000), 0);

    const nepalCount = withdrawals.filter(w => !w.country || w.country === 'NP').length;
    const indiaCount = withdrawals.filter(w => w.country === 'IN').length;
    const pakistanCount = withdrawals.filter(w => w.country === 'PK').length;
    const phCount = withdrawals.filter(w => w.country === 'PH').length;
    const globalCount = withdrawals.filter(w => w.country === 'GLOBAL').length;

    return {
      total,
      pendingCount: pendingList.length,
      pendingAmountNpr,
      approvedCount: approvedList.length,
      approvedAmountNpr,
      rejectedCount: rejectedList.length,
      totalPointsDeducted,
      nepalCount,
      indiaCount,
      pakistanCount,
      phCount,
      globalCount
    };
  }, [withdrawals]);

  // ========================================================
  // SECURITY PIN LOCK SCREEN
  // ========================================================
  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] p-6 bg-zinc-950 text-white rounded-3xl border border-white/10 shadow-2xl animate-fade-in max-w-md mx-auto my-6">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 shadow-lg shadow-rose-500/20 mb-4 flex items-center justify-center">
          <div className="h-full w-full bg-zinc-900 rounded-[14px] flex items-center justify-center">
            <Lock className="h-8 w-8 text-amber-400 animate-pulse" />
          </div>
        </div>

        <h2 className="text-xl font-black text-white text-center">
          एडमिन सेक्युरिटी प्रमाणीकरण
        </h2>
        <p className="text-xs text-zinc-400 text-center mt-1 mb-6 leading-relaxed">
          बहु-देशीय स्थानीय वालेट विथड्र (नेपाल, भारत, पाकिस्तान, फिलिपिन्स, अन्तर्राष्ट्रिय) व्यवस्थापन गर्न एडमिन सुरक्षा पिन राख्नुहोस्।
        </p>

        <form onSubmit={handleUnlock} className="w-full space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>Admin PIN / Password</span>
              <span className="text-[10px] text-amber-400/90 font-mono">PIN: 7788 वा TikTopAdmin@2026</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                required
                autoFocus
                value={adminPinInput}
                onChange={e => setAdminPinInput(e.target.value)}
                placeholder="७७८८ वा TikTopAdmin@2026"
                className="w-full rounded-2xl border border-white/15 bg-zinc-900 pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none transition-all font-mono"
              />
            </div>
            {pinError && <p className="text-xs text-rose-400 mt-1 font-semibold">{pinError}</p>}
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-black py-3 text-sm shadow-xl shadow-rose-500/20 active:scale-98 transition-all"
          >
            अनलक गर्नुहोस् (Unlock Admin Panel)
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-white max-w-7xl mx-auto p-2 sm:p-4 animate-fade-in">
      {/* Real-time Alert Banner when a new withdrawal is received */}
      {newWithdrawalAlert && (
        <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-between text-xs text-amber-200 shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-amber-500 text-black font-black">
              <Bell className="w-4 h-4 animate-bounce" />
            </span>
            <div>
              <span className="font-bold text-white block">
                🚨 नयाँ विथड्र अनुरोध प्राप्त भयो!
              </span>
              <span>
                @{newWithdrawalAlert.username} ले {newWithdrawalAlert.countryName || 'नेपाल'} ({newWithdrawalAlert.paymentMethod}) बाट {newWithdrawalAlert.currencySymbol || 'रू.'} {newWithdrawalAlert.localNetPayout || newWithdrawalAlert.finalPayoutNpr} विथड्र माग गर्नुभयो।
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openActionModal(newWithdrawalAlert, 'approve')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
            >
              अहिले भुक्तानी गर्नुहोस्
            </button>
            <button
              type="button"
              onClick={() => setNewWithdrawalAlert(null)}
              className="p-1 text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 p-0.5 shadow-md shadow-emerald-500/20 flex items-center justify-center">
            <div className="h-full w-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
              <Globe className="h-6 w-6 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <span>अन्तर्राष्ट्रिय तथा स्थानीय विथड्र व्यवस्थापन</span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Global Gateways
                </span>
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              नेपाल (eSewa/Khalti), भारत (UPI/PhonePe), पाकिस्तान (Easypaisa), फिलिपिन्स (GCash), र विश्वव्यापी (USDT/PayPal) भुक्तानी व्यवस्थापन।
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowPointsAdjustModal(true)}
            className="rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all flex items-center gap-1.5"
            title="प्रयोगकर्ताको खातामा पोइन्ट थप्ने"
          >
            <Coins className="h-3.5 w-3.5" />
            <span>पोइन्ट परीक्षण टुल</span>
          </button>

          <button
            type="button"
            onClick={() => fetchWithdrawals()}
            disabled={loading}
            className="rounded-xl bg-zinc-800 border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all flex items-center gap-1.5"
            title="रिफ्रेस गर्नुहोस्"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
            <span>रिफ्रेस</span>
          </button>

          <button
            type="button"
            onClick={handleLockSession}
            className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition-all flex items-center gap-1.5"
            title="सेसन लक गर्नुहोस्"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>लक गर्नुहोस्</span>
          </button>

          {isStandalone && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {/* 4 Financial Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Pending Requests */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-300 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">विचाराधीन अनुरोध (Pending)</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-400">{stats.pendingCount}</span>
            <span className="text-xs font-bold text-amber-300/80">मागहरू</span>
          </div>
          <p className="text-[11px] font-bold text-amber-200 mt-1">
            कुल तिर्न बाँकी: रु. {stats.pendingAmountNpr.toLocaleString()} NPR
          </p>
        </div>

        {/* Card 2: Approved & Completed */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-300 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">भुक्तानी सम्पन्न (Approved)</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-400">{stats.approvedCount}</span>
            <span className="text-xs font-bold text-emerald-300/80">सफल</span>
          </div>
          <p className="text-[11px] font-bold text-emerald-200 mt-1">
            जम्मा भुक्तानी: रु. {stats.approvedAmountNpr.toLocaleString()} NPR
          </p>
        </div>

        {/* Card 3: Rejected & Refunded */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-rose-300 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">अस्वीकृत (Rejected)</span>
            <XCircle className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-400">{stats.rejectedCount}</span>
            <span className="text-xs font-bold text-rose-300/80">रद्द</span>
          </div>
          <p className="text-[11px] font-bold text-rose-300/80 mt-1">
            काटिएको पोइन्ट फिर्ता भयो
          </p>
        </div>

        {/* Card 4: Country Volume Breakdown */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">देशगत माग (By Country)</span>
            <Globe className="h-4 w-4 text-sky-400" />
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap text-xs font-bold">
            <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-200">🇳🇵 {stats.nepalCount}</span>
            <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-200">🇮🇳 {stats.indiaCount}</span>
            <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-200">🇵🇰 {stats.pakistanCount}</span>
            <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-200">🇵🇭 {stats.phCount}</span>
            <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-200">🌍 {stats.globalCount}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/90 p-4 space-y-3">
        {/* Row 1: Country Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-zinc-400 shrink-0 mr-1 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            देश (Country):
          </span>
          {[
            { code: 'all', label: 'सबै देश (All)' },
            { code: 'NP', label: '🇳🇵 नेपाल (Nepal)' },
            { code: 'IN', label: '🇮🇳 भारत (India)' },
            { code: 'PK', label: '🇵🇰 पाकिस्तान (Pakistan)' },
            { code: 'PH', label: '🇵🇭 फिलिपिन्स (Philippines)' },
            { code: 'GLOBAL', label: '🌍 विश्वव्यापी (Global)' }
          ].map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCountryFilter(c.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                countryFilter === c.code
                  ? 'bg-amber-500 text-black shadow-md font-black'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Row 2: Status tabs & Search box */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-white/10">
            {[
              { id: 'all', label: 'सबै (All)', count: withdrawals.length },
              { id: 'pending', label: 'विचाराधीन (Pending)', count: stats.pendingCount, highlight: stats.pendingCount > 0 },
              { id: 'approved', label: 'सम्पन्न (Approved)', count: stats.approvedCount },
              { id: 'rejected', label: 'अस्वीकृत (Rejected)', count: stats.rejectedCount }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    statusFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : tab.highlight
                      ? 'bg-amber-500 text-black font-black animate-pulse'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="नाम, खाता नम्बर, UPI ID, देश वा @username खोज्नुहोस्..."
              className="w-full rounded-xl border border-white/10 bg-zinc-950 pl-9 pr-8 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-12 text-center text-zinc-400 space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-rose-500" />
          <p className="text-sm font-bold text-white">विथड्र अनुरोधहरू लोड हुँदैछन्...</p>
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-12 text-center text-zinc-400 space-y-3">
          <Wallet className="h-10 w-10 mx-auto text-zinc-600" />
          <p className="text-sm font-bold text-white">कुनै पनि विथड्र अनुरोध भेटिएन</p>
          <p className="text-xs text-zinc-500">
            {searchQuery || statusFilter !== 'all' || countryFilter !== 'all'
              ? 'फिल्टर रिसेट गरेर पुनः प्रयास गर्नुहोस्।'
              : 'प्रयोगकर्ताहरूले विथड्र फारम भरेपछि यहाँ अनुरोधहरू देखिनेछन्।'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-950/80 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-4">देश (Country)</th>
                  <th className="py-3.5 px-4">प्रयोगकर्ता (User)</th>
                  <th className="py-3.5 px-4">माध्यम (Local Wallet)</th>
                  <th className="py-3.5 px-4">खाता / UPI / फोन</th>
                  <th className="py-3.5 px-4">रकम (Local & NPR)</th>
                  <th className="py-3.5 px-4">स्थिति (Status)</th>
                  <th className="py-3.5 px-4">मिति (Date)</th>
                  <th className="py-3.5 px-4 text-right">कार्य (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {filteredWithdrawals.map(req => {
                  const isPending = String(req.status).toLowerCase() === 'pending';
                  const isApproved = String(req.status).toLowerCase() === 'approved';
                  const isRejected = String(req.status).toLowerCase() === 'rejected';
                  const countryCode = (req.country || 'NP') as SupportedCountryCode;
                  const countryInfo = getCountryByCode(countryCode);

                  const identifier = req.walletIdentifier || req.mobileNumber || req.phone || req.accountNumber || '';

                  return (
                    <tr
                      key={req.id}
                      className={`hover:bg-zinc-800/50 transition-colors ${
                        isPending ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Country Flag & Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{req.country === 'IN' ? '🇮🇳' : req.country === 'PK' ? '🇵🇰' : req.country === 'PH' ? '🇵🇭' : req.country === 'GLOBAL' ? '🌍' : '🇳🇵'}</span>
                          <div>
                            <span className="font-bold text-white text-xs block">{req.countryName || countryInfo.name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{req.currency || countryInfo.currency}</span>
                          </div>
                        </div>
                      </td>

                      {/* User Details */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-white text-sm block">
                            {req.fullName || req.userName || req.accountHolderName}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                            <span className="text-rose-400 font-mono">@{req.username}</span>
                            <span>•</span>
                            <span className="text-[10px] text-zinc-500 font-mono">ID: {req.requestId || req.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Payment Method Badge */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 border border-white/10 px-2.5 py-1 text-xs font-black text-amber-300">
                          <span>{req.paymentMethod}</span>
                        </span>
                      </td>

                      {/* Wallet Identifier with 1-click Copy */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleCopyText(identifier, req.id)}
                          className="group flex items-center gap-1.5 rounded-lg bg-zinc-950 border border-white/10 px-2.5 py-1 font-mono font-bold text-white hover:border-amber-400 transition-all text-xs"
                          title="कपी गर्नुहोस्"
                        >
                          <span className="tracking-wide text-amber-300 font-black truncate max-w-[150px]">
                            {identifier}
                          </span>
                          {copiedId === req.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-zinc-500 group-hover:text-amber-400 shrink-0 transition-colors" />
                          )}
                        </button>
                      </td>

                      {/* Amount in Local Currency + NPR */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-black text-emerald-400 text-sm block">
                            {req.currencySymbol || countryInfo.currencySymbol} {req.localNetPayout || req.finalPayoutNpr || req.amountNpr} {req.currency || countryInfo.currency}
                          </span>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            रु. {req.amountNpr || req.requestedNPR || 500} NPR • {(req.pointsDeducted || 500000).toLocaleString()} Pts
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                            <Clock className="h-3 w-3 animate-spin" />
                            <span>विचाराधीन (Pending)</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>भुक्तानी सम्पन्न</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-[11px] font-bold text-rose-400">
                            <XCircle className="h-3 w-3" />
                            <span>अस्वीकृत</span>
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[11px] text-zinc-400 whitespace-nowrap">
                        {new Date(req.requestedAt || req.timestamp || 0).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openActionModal(req, 'approve')}
                              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold transition-all"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => openActionModal(req, 'reject')}
                              className="rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 px-3 py-1.5 text-xs font-bold transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">
                            {isApproved ? 'सम्पन्न' : 'रद्द'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedRequest && actionType && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`rounded-xl p-2 ${
                    actionType === 'approve'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {actionType === 'approve' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {actionType === 'approve'
                      ? 'विथड्र स्वीकृत गर्नुहोस् (Approve Payout)'
                      : 'विथड्र अस्वीकृत गर्नुहोस् (Reject Request)'}
                  </h3>
                  <p className="text-xs text-zinc-400">अनुरोध आईडी: {selectedRequest.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                }}
                className="rounded-full p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Payout Summary */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">देश र वालेट:</span>
                <span className="font-bold text-white">
                  {selectedRequest.countryName || 'नेपाल'} - {selectedRequest.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">खाता / वालेट आईडी:</span>
                <span className="font-mono text-amber-300 font-bold">
                  {selectedRequest.walletIdentifier || selectedRequest.mobileNumber || selectedRequest.phone}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">प्रयोगकर्ता:</span>
                <span className="font-semibold text-white">
                  {selectedRequest.fullName || selectedRequest.userName} (@{selectedRequest.username})
                </span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2">
                <span className="text-zinc-400">पठाउनुपर्ने खुद रकम (Net Payout):</span>
                <span className="font-black text-emerald-400 text-sm">
                  {selectedRequest.currencySymbol || 'रू.'} {selectedRequest.localNetPayout || selectedRequest.finalPayoutNpr || selectedRequest.amountNpr} {selectedRequest.currency || 'NPR'}
                </span>
              </div>
            </div>

            <form onSubmit={handleProcessAction} className="space-y-4 text-xs">
              {actionType === 'approve' && (
                <div>
                  <label className="block font-bold uppercase text-zinc-300 text-[10px] mb-1">
                    ट्रान्ज्याक्सन आइडी / भौचर नम्बर (Txn Reference)
                  </label>
                  <input
                    type="text"
                    required
                    value={txnRefInput}
                    onChange={e => setTxnRefInput(e.target.value)}
                    placeholder="उदा: TXN-9948201 वा UPI-REF-449"
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 font-mono text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold uppercase text-zinc-300 text-[10px] mb-1">
                  एडमिन नोट / टिप्पणी (Admin Notes)
                </label>
                <textarea
                  rows={2}
                  value={adminNoteInput}
                  onChange={e => setAdminNoteInput(e.target.value)}
                  placeholder={
                    actionType === 'approve'
                      ? 'तपाईंको वालेटमा रकम पठाइसकियो।'
                      : 'उदा: गलत वालेट नम्बर वा खाता फेला परेन।'
                  }
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    setActionType(null);
                  }}
                  className="flex-1 rounded-xl bg-zinc-800 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  रद्द गर्नुहोस्
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center gap-1.5 ${
                    actionType === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                  }`}
                >
                  {actionLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>
                    {actionType === 'approve' ? 'स्वीकृत गर्नुहोस् (Confirm Payout)' : 'अस्वीकृत गर्नुहोस् (Refund Points)'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Points Adjust Tool Modal */}
      {showPointsAdjustModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-amber-500/20 text-amber-400 p-2">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">पोइन्ट थप/घट टुल (Points Test)</h3>
                  <p className="text-xs text-zinc-400">विथड्र परीक्षणका लागि प्रयोगकर्ताको खातामा पोइन्ट थप्नुहोस्</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPointsAdjustModal(false)}
                className="rounded-full p-1 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustPoints} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-bold uppercase text-[10px] mb-1">
                  प्रयोगकर्ता (Username)
                </label>
                <input
                  type="text"
                  required
                  value={targetUsername}
                  onChange={e => setTargetUsername(e.target.value)}
                  placeholder="उदा: sarah_dance वा user_admin"
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold uppercase text-[10px] mb-1">
                  थप/घट गर्ने पोइन्ट संख्या (+ / - Points)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step={50000}
                    required
                    value={pointsDelta}
                    onChange={e => setPointsDelta(Number(e.target.value))}
                    className="flex-1 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setPointsDelta(500000)}
                    className="rounded-xl bg-zinc-800 border border-white/10 px-2.5 py-1 font-bold text-[10px] text-amber-300 hover:bg-zinc-700"
                  >
                    +५ लाख
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsDelta(1000000)}
                    className="rounded-xl bg-zinc-800 border border-white/10 px-2.5 py-1 font-bold text-[10px] text-amber-300 hover:bg-zinc-700"
                  >
                    +१० लाख
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPointsAdjustModal(false)}
                  className="flex-1 rounded-xl bg-zinc-800 py-2.5 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  रद्द
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black py-2.5 text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5"
                >
                  {adjustLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Coins className="h-3.5 w-3.5" />}
                  <span>पोइन्ट अपडेट गर्नुहोस्</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
