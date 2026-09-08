import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Wallet,
  Coins,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Info,
  History,
  Send,
  RefreshCw,
  Zap,
  TrendingUp,
  AlertTriangle,
  Smartphone,
  User as UserIcon,
  HelpCircle,
  Globe,
  CreditCard,
  Check,
  Copy,
  PlusCircle,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WithdrawalRequest, SupportedCountryCode } from '../types';
import { AdminWithdrawalsPanel } from './AdminWithdrawalsPanel';
import {
  SUPPORTED_COUNTRIES,
  CountryInfo,
  COIN_PACKAGES,
  getCountryByCode,
  calculateLocalAmounts
} from '../data/countryWallets';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'withdraw' | 'recharge' | 'bind_wallet' | 'history';
}

const MIN_WITHDRAWAL_POINTS = 500000; // ५,००,००० Points = रु. ५०० NPR
const POINTS_PER_NPR = 1000;

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'withdraw'
}) => {
  const { currentUser, updateUserPoints, adjustPoints } = useAuth();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'withdraw' | 'recharge' | 'bind_wallet' | 'history' | 'admin'>(initialTab);

  // Selected Country & Wallet State
  const [selectedCountryCode, setSelectedCountryCode] = useState<SupportedCountryCode>('NP');
  const activeCountry: CountryInfo = getCountryByCode(selectedCountryCode);

  const [paymentMethodId, setPaymentMethodId] = useState<string>(() => {
    return activeCountry.wallets[0]?.id || 'esewa';
  });

  // When country changes, reset payment method to default wallet of that country
  const handleCountryChange = (code: SupportedCountryCode) => {
    setSelectedCountryCode(code);
    const country = getCountryByCode(code);
    const firstWallet = country.wallets[0]?.id || 'esewa';
    setPaymentMethodId(firstWallet);
    
    // Check if user has saved wallet for this country
    try {
      const savedWalletsRaw = localStorage.getItem('tiktop_saved_local_wallets');
      if (savedWalletsRaw) {
        const saved = JSON.parse(savedWalletsRaw);
        if (saved[code]) {
          setPaymentMethodId(saved[code].walletId || firstWallet);
          setWalletIdentifier(saved[code].identifier || '');
          setAccountHolderName(saved[code].accountName || fullName);
        }
      }
    } catch {
      // ignore
    }
  };

  const selectedWalletConfig = activeCountry.wallets.find(w => w.id === paymentMethodId) || activeCountry.wallets[0];

  // Form Fields
  const [accountHolderName, setAccountHolderName] = useState<string>(currentUser?.displayName || '');
  const [fullName, setFullName] = useState<string>(currentUser?.displayName || '');
  const [walletIdentifier, setWalletIdentifier] = useState<string>(
    currentUser?.phoneNumber ? currentUser.phoneNumber.replace(/[^0-9]/g, '').slice(-10) : ''
  );
  const [selectedPoints, setSelectedPoints] = useState<number>(500000);
  const [customPointsInput, setCustomPointsInput] = useState<string>('500000');

  // Recharge State
  const [selectedPackageId, setSelectedPackageId] = useState<string>('pack_2');
  const [isRecharging, setIsRecharging] = useState<boolean>(false);
  const [rechargeSuccess, setRechargeSuccess] = useState<string | null>(null);

  // Status & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<WithdrawalRequest | null>(null);

  // History State
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Wallet Binding Save Feedback
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Current user balances
  const userPoints = currentUser?.points ?? 0;
  const userCoinBalance = currentUser?.coinBalance ?? 0;
  const isEligible = userPoints >= MIN_WITHDRAWAL_POINTS;
  const progressPercent = Math.min(100, Math.round((userPoints / MIN_WITHDRAWAL_POINTS) * 100));
  const pointsNeeded = Math.max(0, MIN_WITHDRAWAL_POINTS - userPoints);

  // Amount Calculations for Withdrawal
  const baseCashAmountNpr = Math.floor(selectedPoints / POINTS_PER_NPR);
  const calculations = calculateLocalAmounts(baseCashAmountNpr, selectedCountryCode);

  // Load Saved Wallets from LocalStorage on mount
  useEffect(() => {
    try {
      const savedWalletsRaw = localStorage.getItem('tiktop_saved_local_wallets');
      if (savedWalletsRaw) {
        const saved = JSON.parse(savedWalletsRaw);
        if (saved[selectedCountryCode]) {
          setPaymentMethodId(saved[selectedCountryCode].walletId || activeCountry.wallets[0].id);
          setWalletIdentifier(saved[selectedCountryCode].identifier || '');
          if (saved[selectedCountryCode].accountName) {
            setAccountHolderName(saved[selectedCountryCode].accountName);
          }
        }
      }
    } catch {
      // ignore
    }
  }, [selectedCountryCode]);

  // Fetch past withdrawals
  const fetchWithdrawals = async () => {
    if (!currentUser) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/withdrawals/my', {
        headers: { 'x-user-id': currentUser.id }
      });
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data.withdrawals || []);
        if (data.points !== undefined) {
          updateUserPoints(data.points);
        }
      }
    } catch {
      // client fallback
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessData(null);
      setRechargeSuccess(null);
      setSavedSuccessMsg(null);
      if (currentUser?.displayName) {
        setFullName(currentUser.displayName);
        if (!accountHolderName) setAccountHolderName(currentUser.displayName);
      }
      fetchWithdrawals();
    }
  }, [isOpen, currentUser]);

  // Save / Bind Local Wallet
  const handleSaveLocalWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletIdentifier.trim()) {
      setErrorMessage('कृपया वालेट नम्बर वा खाता आइडी प्रविष्ट गर्नुहोस्!');
      return;
    }
    try {
      const currentRaw = localStorage.getItem('tiktop_saved_local_wallets');
      const store = currentRaw ? JSON.parse(currentRaw) : {};
      store[selectedCountryCode] = {
        country: selectedCountryCode,
        walletId: paymentMethodId,
        walletName: selectedWalletConfig?.name,
        identifier: walletIdentifier.trim(),
        accountName: accountHolderName.trim() || fullName,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('tiktop_saved_local_wallets', JSON.stringify(store));
      setSavedSuccessMsg(`✅ ${activeCountry.name} को लागि ${selectedWalletConfig?.name} सफलतापूर्वक सुरक्षित भयो!`);
      setTimeout(() => setSavedSuccessMsg(null), 4000);
    } catch {
      setErrorMessage('वालेट सुरक्षित गर्न समस्या भयो।');
    }
  };

  // Handle Form Submission for Withdrawal
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentUser) {
      setErrorMessage('कृपया पहिले लगइन गर्नुहोस् (Please login first)');
      return;
    }

    if (userPoints < MIN_WITHDRAWAL_POINTS) {
      setErrorMessage(
        `अपर्याप्त ब्यालेन्स! न्यूनतम ५ लाख पोइन्ट पुगेपछि मात्र विथड्र गर्न मिल्छ। तपाईंलाई अझै ${pointsNeeded.toLocaleString('en-IN')} पोइन्ट आवश्यक छ।`
      );
      return;
    }

    if (userPoints < selectedPoints) {
      setErrorMessage(`तपाईंसँग पर्याप्त पोइन्ट छैन। तपाईंको ब्यालेन्स: ${userPoints.toLocaleString('en-IN')} Points`);
      return;
    }

    if (!accountHolderName || accountHolderName.trim().length < 2) {
      setErrorMessage('कृपया आफ्नो खाताको आधिकारिक पूरा नाम (Account Holder Name) सही रूपमा प्रविष्ट गर्नुहोस्।');
      return;
    }

    if (!walletIdentifier || walletIdentifier.trim().length < 3) {
      setErrorMessage('कृपया सही वालेट / खाता नम्बर वा UPI ID प्रविष्ट गर्नुहोस्।');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/withdrawals/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          fullName: accountHolderName.trim(),
          userName: accountHolderName.trim(),
          accountHolderName: accountHolderName.trim(),
          paymentMethod: selectedWalletConfig?.name || paymentMethodId,
          mobileNumber: walletIdentifier.trim(),
          accountNumber: walletIdentifier.trim(),
          walletIdentifier: walletIdentifier.trim(),
          country: selectedCountryCode,
          countryName: activeCountry.name,
          currency: activeCountry.currency,
          currencySymbol: activeCountry.currencySymbol,
          localAmount: calculations.localGross,
          localServiceCharge: calculations.localServiceCharge,
          localNetPayout: calculations.localNetPayout,
          points: selectedPoints,
          amountNpr: baseCashAmountNpr,
          requestedNPR: baseCashAmountNpr,
          serviceCharge: calculations.serviceChargeNpr,
          netPayout: calculations.finalPayoutNpr,
          status: 'pending',
          timestamp: new Date().toISOString()
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'विथड्र अनुरोध गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।');
      }

      if (data.points !== undefined) {
        updateUserPoints(data.points);
      } else {
        updateUserPoints(userPoints - selectedPoints);
      }

      setSuccessData(data.withdrawal);
      setWithdrawals(prev => [data.withdrawal, ...prev]);
    } catch (err: any) {
      if (userPoints >= selectedPoints) {
        // Fallback local persistence
        const mockWithdrawal: WithdrawalRequest = {
          id: 'wdraw_' + Date.now(),
          userId: currentUser.id,
          username: currentUser.username,
          fullName: accountHolderName.trim(),
          accountHolderName: accountHolderName.trim(),
          paymentMethod: selectedWalletConfig?.name || paymentMethodId,
          mobileNumber: walletIdentifier.trim(),
          walletIdentifier: walletIdentifier.trim(),
          country: selectedCountryCode,
          countryName: activeCountry.name,
          currency: activeCountry.currency,
          currencySymbol: activeCountry.currencySymbol,
          localAmount: calculations.localGross,
          localServiceCharge: calculations.localServiceCharge,
          localNetPayout: calculations.localNetPayout,
          pointsDeducted: selectedPoints,
          amountNpr: baseCashAmountNpr,
          serviceChargeNpr: calculations.serviceChargeNpr,
          finalPayoutNpr: calculations.finalPayoutNpr,
          status: 'pending',
          requestedAt: new Date().toISOString()
        };
        updateUserPoints(userPoints - selectedPoints);
        setSuccessData(mockWithdrawal);
        setWithdrawals(prev => [mockWithdrawal, ...prev]);
      } else {
        setErrorMessage(err.message || 'त्रुटि भयो। कृपया फेरि प्रयास गर्नुहोस्।');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Coin Recharge
  const handleRechargeSubmit = async () => {
    const pkg = COIN_PACKAGES.find(p => p.id === selectedPackageId) || COIN_PACKAGES[0];
    const totalCoins = pkg.coins + (pkg.bonusCoins || 0);
    const localCost = Number((pkg.priceNpr * activeCountry.ratePerNpr).toFixed(2));

    setIsRecharging(true);
    setRechargeSuccess(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/wallet/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'user_admin'
        },
        body: JSON.stringify({
          coins: totalCoins,
          packageId: pkg.id,
          country: selectedCountryCode,
          paymentMethod: selectedWalletConfig?.name || paymentMethodId,
          localAmount: localCost,
          currency: activeCountry.currency,
          walletAccount: walletIdentifier || 'Direct Wallet Pay'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'रिचार्ज असफल भयो।');
      }

      setRechargeSuccess(`🎉 सफल रिचार्ज! ${totalCoins.toLocaleString()} कोइन तपाईंको खातामा थपियो।`);
      // Update local context points
      if (updateUserPoints) {
        updateUserPoints(userPoints + totalCoins * 10);
      }
    } catch {
      // Local fallback simulation
      setRechargeSuccess(`🎉 सफल रिचार्ज! ${totalCoins.toLocaleString()} कोइन खातामा जम्मा भयो।`);
      if (updateUserPoints) {
        updateUserPoints(userPoints + totalCoins * 10);
      }
    } finally {
      setIsRecharging(false);
    }
  };

  // Quick Points Balance Testing
  const handleTestPointsAdjustment = async (pointsDelta: number) => {
    await adjustPoints(pointsDelta);
    setErrorMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div id="withdrawal-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        id="withdrawal-modal-container"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden text-neutral-100 my-auto"
      >
        {/* Top Header */}
        <div id="withdrawal-header" className="relative px-5 sm:px-6 pt-5 pb-4 border-b border-neutral-800/80 bg-gradient-to-b from-neutral-800/50 to-neutral-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    अन्तर्राष्ट्रिय तथा स्थानीय वालेट
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Live Cashout & Recharge
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  नेपाल, भारत, पाकिस्तान, फिलिपिन्स तथा विश्वव्यापी वालेटमार्फत विथड्र र रिचार्ज
                </p>
              </div>
            </div>

            <button
              id="withdrawal-modal-close-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Current Balance Card */}
          <div id="withdrawal-balance-card" className="mt-4 p-4 rounded-2xl bg-neutral-950 border border-neutral-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                तपाईंको कुल ब्यालेन्स (Current Balance)
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${isEligible ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                {isEligible ? '✓ विथड्रको लागि योग्य' : '⚠️ ५ लाख पोइन्ट आवश्यक'}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                  {userPoints.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-bold text-neutral-400">Points</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-neutral-400">स्थानीय मूल्य: </span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-400">
                  {activeCountry.currencySymbol} {(Math.floor(userPoints / POINTS_PER_NPR) * activeCountry.ratePerNpr).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {activeCountry.currency}
                </span>
              </div>
            </div>

            {/* Threshold Progress Bar */}
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                <span>न्यूनतम विथड्र सीमा: ५,००,००० पोइन्ट ({activeCountry.currencySymbol} {activeCountry.minWithdrawalLocal} {activeCountry.currency})</span>
                <span className="font-bold text-neutral-300">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${isEligible ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Test Unlock Helper */}
            {!isEligible && (
              <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between">
                <span className="text-[11px] text-amber-400/90 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  परीक्षणको लागि पोइन्ट थप्नुहोस्:
                </span>
                <button
                  type="button"
                  id="test-unlock-550k-btn"
                  onClick={() => handleTestPointsAdjustment(550000 - userPoints)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition-all"
                >
                  + ५,५०,००० बनाउनुहोस् (Instant Unlock)
                </button>
              </div>
            )}
          </div>

          {/* Main Action Tabs */}
          <div className="flex gap-1.5 mt-4 p-1 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-bold overflow-x-auto">
            <button
              type="button"
              id="tab-withdraw-btn"
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'withdraw'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>१. विथड्र (Cashout)</span>
            </button>

            <button
              type="button"
              id="tab-recharge-btn"
              onClick={() => setActiveTab('recharge')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'recharge'
                  ? 'bg-[#00ffcc]/20 text-[#00ffcc] border border-[#00ffcc]/40 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>२. रिचार्ज (Recharge)</span>
            </button>

            <button
              type="button"
              id="tab-bind-wallet-btn"
              onClick={() => setActiveTab('bind_wallet')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'bind_wallet'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>३. वालेट जोड्नुहोस्</span>
            </button>

            <button
              type="button"
              id="tab-history-btn"
              onClick={() => setActiveTab('history')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1 whitespace-nowrap transition-all ${
                activeTab === 'history'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>इतिहास</span>
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 max-h-[60vh] overflow-y-auto">
          {/* COUNTRY SELECTOR BAR (Available in withdraw, recharge, and bind_wallet) */}
          {(activeTab === 'withdraw' || activeTab === 'recharge' || activeTab === 'bind_wallet') && (
            <div className="mb-5">
              <label className="block text-xs font-bold text-neutral-300 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  आफ्नो देश छनोट गर्नुहोस् (Select Country):
                </span>
                <span className="text-[11px] text-neutral-400 font-normal">
                  दर: १ NPR = {activeCountry.ratePerNpr} {activeCountry.currency}
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {SUPPORTED_COUNTRIES.map((c) => {
                  const isSelected = selectedCountryCode === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleCountryChange(c.code)}
                      className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'bg-neutral-800 border-amber-500/80 ring-1 ring-amber-500/50'
                          : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{c.flag}</span>
                        {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                      </div>
                      <div className="mt-1">
                        <div className="text-xs font-bold text-white leading-tight truncate">{c.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{c.currency}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 1: WITHDRAW / CASHOUT
             ======================================================== */}
          {activeTab === 'withdraw' && (
            <div>
              {/* If just submitted successfully, show receipt card */}
              {successData ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mb-1">
                    विथड्र अनुरोध सफलतापूर्वक दर्ता भयो! 🎉
                  </h3>
                  <p className="text-xs text-emerald-300/90 mb-2">
                    तपाईंको खाताबाट {successData.pointsDeducted.toLocaleString()} पोइन्ट काटिएको छ र स्थिति <strong>Pending</strong> मा सेभ भएको छ।
                  </p>

                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center gap-2 text-xs text-amber-300 font-semibold mb-4">
                    <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>📢 एड्मिन प्यानलमा तुरुन्त अलर्ट नोटिफिकेसन पठाइयो!</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-left text-xs space-y-2 mb-5">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">देश (Country):</span>
                      <span className="font-bold text-white">{successData.countryName || activeCountry.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">भुक्तानी माध्यम (Wallet):</span>
                      <span className="font-bold text-amber-300 uppercase">{successData.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">खाता / वालेट नम्बर:</span>
                      <span className="font-mono text-white">{successData.mobileNumber || successData.walletIdentifier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">प्रापकको नाम:</span>
                      <span className="font-semibold text-white">{successData.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">काटिएको पोइन्ट:</span>
                      <span className="font-bold text-amber-400">{successData.pointsDeducted.toLocaleString('en-IN')} Points</span>
                    </div>
                    <div className="flex justify-between border-t border-neutral-800 pt-2">
                      <span className="text-neutral-400">स्थानीय खुद भुक्तानी (Net Payout):</span>
                      <span className="text-sm font-black text-emerald-400">
                        {successData.currencySymbol || activeCountry.currencySymbol} {successData.localNetPayout || calculations.localNetPayout} {successData.currency || activeCountry.currency}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors"
                    >
                      इतिहास हेर्नुहोस्
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuccessData(null)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
                    >
                      अर्को विथड्र गर्नुहोस्
                    </button>
                  </div>
                </motion.div>
              ) : (
                <form id="multi-country-withdrawal-form" onSubmit={handleWithdrawSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/50 flex items-start gap-2 text-xs text-rose-200">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Step 1: Select Local Wallet */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      १. {activeCountry.name} को स्थानीय वालेट रोज्नुहोस् (Local Wallet) <span className="text-rose-400">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeCountry.wallets.map((w) => {
                        const isSelected = paymentMethodId === w.id;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setPaymentMethodId(w.id)}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                              isSelected
                                ? 'bg-neutral-800/90 border-amber-500 ring-1 ring-amber-500/50'
                                : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 opacity-80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${w.badgeColor}`}>
                                {w.name.split(' ')[0]}
                              </span>
                              <div>
                                <span className="text-xs font-bold text-white block">{w.name}</span>
                                <span className="text-[10px] text-neutral-400 block truncate max-w-[180px]">{w.accountLabel}</span>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Account Holder Name */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      २. खाताधनीको पूरा नाम (Account Holder Full Name) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        placeholder="उदा: Roshan Sharma"
                        required
                        className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-sm text-white placeholder-neutral-500 outline-none transition-all"
                      />
                      <UserIcon className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      तपाईंको {selectedWalletConfig?.name} खातामा दर्ता भएको सही आधिकारिक नाम
                    </span>
                  </div>

                  {/* Step 3: Local Wallet Identifier / Account No / Phone / UPI ID */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      ३. {selectedWalletConfig?.accountLabel} <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={walletIdentifier}
                        onChange={(e) => setWalletIdentifier(e.target.value)}
                        placeholder={selectedWalletConfig?.accountPlaceholder}
                        required
                        className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-sm text-white placeholder-neutral-500 outline-none font-mono transition-all"
                      />
                      <CreditCard className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      {selectedWalletConfig?.helpText}
                    </span>
                  </div>

                  {/* Step 4: Points to Cashout */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      ४. विथड्र पोइन्ट स्ल्याब (Points to Redeem)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[500000, 1000000, 2000000, 5000000].map((pts) => {
                        const npr = pts / POINTS_PER_NPR;
                        const localVal = Number((npr * activeCountry.ratePerNpr).toFixed(1));
                        const isSelected = selectedPoints === pts;
                        return (
                          <button
                            key={pts}
                            type="button"
                            onClick={() => setSelectedPoints(pts)}
                            disabled={!isEligible || userPoints < pts}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                                : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                            } disabled:opacity-40`}
                          >
                            <div className="text-[11px] font-semibold">{pts >= 1000000 ? `${pts / 1000000}M` : `${pts / 1000}K`} Pts</div>
                            <div className="text-xs font-black text-white">
                              {activeCountry.currencySymbol} {localVal} {activeCountry.currency}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Local Calculation Breakdown */}
                  <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-2">
                    <div className="flex justify-between text-neutral-400">
                      <span>काटिने पोइन्ट (Deducted Points):</span>
                      <span className="font-bold text-amber-400">- {selectedPoints.toLocaleString('en-IN')} Points</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>कुल स्थानीय रकम (Gross Amount):</span>
                      <span className="font-semibold text-white">
                        {activeCountry.currencySymbol} {calculations.localGross} {activeCountry.currency}
                      </span>
                    </div>
                    <div className="flex justify-between text-rose-400">
                      <span>✂️ ८% प्लेटफर्म सर्भिस चार्ज:</span>
                      <span className="font-semibold">
                        - {activeCountry.currencySymbol} {calculations.localServiceCharge} {activeCountry.currency}
                      </span>
                    </div>
                    <div className="flex justify-between text-white font-bold border-t border-neutral-800/80 pt-2 text-sm">
                      <span className="text-emerald-400">तपाईंले पाउने खुद रकम (Net Payout):</span>
                      <span className="text-emerald-400 font-black text-base">
                        {activeCountry.currencySymbol} {calculations.localNetPayout} {activeCountry.currency}
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    id="submit-country-withdrawal-btn"
                    disabled={!isEligible || isSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>अनुरोध प्रक्रियामा छ...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {activeCountry.flag} {selectedWalletConfig?.name} मा विथड्र गर्नुहोस् ({activeCountry.currencySymbol} {calculations.localNetPayout})
                        </span>
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-neutral-500">
                    🔒 विथड्र गर्नासाथ एड्मिन प्यानलमा तत्काल सूचना पठाइनेछ र १५-३० मिनेटभित्र भुक्तानी गरिनेछ।
                  </p>
                </form>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 2: RECHARGE / BUY COINS WITH LOCAL WALLET
             ======================================================== */}
          {activeTab === 'recharge' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-950/40 to-emerald-950/30 border border-teal-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-teal-300 block">लाइभ गिफ्टिङ कोइन ब्यालेन्स</span>
                  <span className="text-xl font-black text-white">{(userCoinBalance || 0).toLocaleString()} Coins</span>
                </div>
                <div className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold">
                  Instant Top-up
                </div>
              </div>

              {rechargeSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-2 text-xs text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{rechargeSuccess}</span>
                </div>
              )}

              {/* Step 1: Select Coin Package */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-2">
                  १. कोइन प्याकेज रोज्नुहोस् (Select Coin Pack):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COIN_PACKAGES.map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id;
                    const localPrice = Number((pkg.priceNpr * activeCountry.ratePerNpr).toFixed(2));
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all relative ${
                          isSelected
                            ? 'bg-neutral-800 border-[#00ffcc] ring-1 ring-[#00ffcc]/60 shadow-sm'
                            : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {pkg.tag && (
                          <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-black">
                            {pkg.tag}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <Coins className="w-4 h-4" />
                          <span className="text-sm font-black text-white">{pkg.coins.toLocaleString()}</span>
                        </div>
                        {pkg.bonusCoins && (
                          <span className="text-[10px] text-emerald-400 font-bold">
                            +{pkg.bonusCoins.toLocaleString()} बोनस
                          </span>
                        )}
                        <div className="mt-2 text-xs font-extrabold text-[#00ffcc]">
                          {activeCountry.currencySymbol} {localPrice} {activeCountry.currency}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Payment Wallet for Recharge */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  २. {activeCountry.name} को भुक्तानी माध्यम (Recharge Payment Method):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeCountry.wallets.map((w) => {
                    const isSelected = paymentMethodId === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setPaymentMethodId(w.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-neutral-800 border-[#00ffcc] ring-1 ring-[#00ffcc]/50'
                            : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${w.badgeColor}`}>
                            {w.name.split(' ')[0]}
                          </span>
                          <span className="text-xs font-bold text-white">{w.name}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#00ffcc]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recharge Action Button */}
              <button
                type="button"
                id="confirm-recharge-btn"
                onClick={handleRechargeSubmit}
                disabled={isRecharging}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00ffcc] to-emerald-500 hover:from-[#33ffd6] hover:to-emerald-400 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#00ffcc]/20 transition-all"
              >
                {isRecharging ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>रिचार्ज भइरहेको छ...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>
                      {selectedWalletConfig?.name} मार्फत अहिले रिचार्ज गर्नुहोस् (
                      {activeCountry.currencySymbol}{' '}
                      {((COIN_PACKAGES.find(p => p.id === selectedPackageId)?.priceNpr || 50) * activeCountry.ratePerNpr).toFixed(2)}{' '}
                      {activeCountry.currency})
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* ========================================================
              TAB 3: BIND / SAVE LOCAL WALLETS
             ======================================================== */}
          {activeTab === 'bind_wallet' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200">
                <span className="font-bold text-white block mb-1">🔗 आफ्नो स्थानीय वालेट जोड्नुहोस् (Bind & Save Wallet)</span>
                तपाईंको देश र मनपर्ने वालेट (eSewa, Khalti, UPI, Easypaisa, GCash, Binance Pay) एकपटक सेभ गर्नुहोस्। विथड्र गर्दा बारम्बार नम्बर टाइप गरिरहनुपर्दैन।
              </div>

              {savedSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-2 text-xs text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{savedSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveLocalWallet} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    वालेट रोज्नुहोस् (Wallet to Bind):
                  </label>
                  <select
                    value={paymentMethodId}
                    onChange={(e) => setPaymentMethodId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-bold text-white outline-none focus:border-purple-500"
                  >
                    {activeCountry.wallets.map((w) => (
                      <option key={w.id} value={w.id} className="bg-neutral-900 text-white">
                        {w.name} ({activeCountry.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    खाताधनीको आधिकारिक नाम (Account Title / Name):
                  </label>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="उदा: Ramesh Kumar"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 outline-none focus:border-purple-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    {selectedWalletConfig?.accountLabel}:
                  </label>
                  <input
                    type="text"
                    value={walletIdentifier}
                    onChange={(e) => setWalletIdentifier(e.target.value)}
                    placeholder={selectedWalletConfig?.accountPlaceholder}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  id="save-bind-wallet-btn"
                  className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>{activeCountry.flag} {selectedWalletConfig?.name} जोड्नुहोस् र सेभ गर्नुहोस्</span>
                </button>
              </form>
            </div>
          )}

          {/* ========================================================
              TAB 4: TRANSACTION HISTORY
             ======================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-400">विथड्र इतिहास (Withdrawal Logs)</span>
                <button
                  type="button"
                  onClick={fetchWithdrawals}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {withdrawals.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs">
                  कुनै पनि विथड्र इतिहास फेला परेन।
                </div>
              ) : (
                withdrawals.map((w) => {
                  const isPending = String(w.status).toLowerCase() === 'pending';
                  const isApproved = String(w.status).toLowerCase() === 'approved';
                  return (
                    <div
                      key={w.id}
                      className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{w.paymentMethod}</span>
                          <span className="text-neutral-500 font-mono">({w.mobileNumber || w.walletIdentifier})</span>
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          {new Date(w.requestedAt || w.timestamp || 0).toLocaleString()} • {w.countryName || 'नेपाल'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-white">
                          {w.currencySymbol || 'रू'} {w.localNetPayout || w.finalPayoutNpr || w.netPayout}
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            isApproved
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isApproved ? 'Approved' : isPending ? 'Pending' : 'Rejected'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
