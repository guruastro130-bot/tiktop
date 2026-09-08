import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  MousePointer,
  RefreshCw,
  X,
  CreditCard,
  Building,
  Send,
  HelpCircle,
  Award,
  Video as VideoIcon
} from 'lucide-react';
import { CreatorEarningsSummary, PayoutRequest } from '../types';

interface CreatorEarningsDashboardProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CreatorEarningsDashboard: React.FC<CreatorEarningsDashboardProps> = ({
  userId,
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<CreatorEarningsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'payouts' | 'ledger'>('overview');

  // Payout Request Modal
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState<boolean>(false);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [payoutMethod, setPayoutMethod] = useState<'paypal' | 'bank_transfer' | 'stripe' | 'wire'>('paypal');
  const [accountDetails, setAccountDetails] = useState<string>('');
  const [submittingPayout, setSubmittingPayout] = useState<boolean>(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

  const fetchEarnings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/creators/${userId}/earnings`, {
        headers: { 'x-user-id': userId }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to load earnings data');
      }
      const json = await res.json();
      setData(json.earnings);
    } catch (err: any) {
      setError(err.message || 'Error connecting to earnings service');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      fetchEarnings();
    }
  }, [isOpen, fetchEarnings]);

  const handleRequestPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    const numAmount = parseFloat(payoutAmount);
    if (isNaN(numAmount) || numAmount < (data.minPayoutThreshold || 20)) {
      setPayoutError(`Minimum payout request is $${(data.minPayoutThreshold || 20).toFixed(2)} USD.`);
      return;
    }
    if (numAmount > data.availableBalance) {
      setPayoutError(`Amount exceeds your available balance ($${data.availableBalance.toFixed(2)} USD).`);
      return;
    }
    if (!accountDetails.trim()) {
      setPayoutError('Please provide your payment account information.');
      return;
    }

    setSubmittingPayout(true);
    setPayoutError(null);
    setPayoutSuccess(null);

    try {
      const res = await fetch(`/api/creators/${userId}/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          amount: numAmount,
          method: payoutMethod,
          accountDetails: accountDetails.trim()
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to request payout');
      }

      setPayoutSuccess(`Payout request for $${numAmount.toFixed(2)} USD successfully submitted!`);
      setPayoutAmount('');
      setAccountDetails('');
      setTimeout(() => {
        setIsPayoutModalOpen(false);
        setPayoutSuccess(null);
      }, 2000);
      fetchEarnings();
    } catch (err: any) {
      setPayoutError(err.message || 'An error occurred submitting your payout');
    } finally {
      setSubmittingPayout(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div
        id="creator-monetization-modal"
        className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl text-white overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Creator Earnings & Monetization</h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Partner
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {data ? `@${data.username} • ${data.creatorSharePercent}% Creator Revenue Share` : 'Loading creator ledger...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="refresh-earnings-btn"
              onClick={fetchEarnings}
              disabled={loading}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
              title="Refresh earnings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="close-earnings-modal-btn"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Available Balance */}
            <div className="p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-emerald-500/40 transition-colors relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Available Balance</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mb-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                  ${loading ? '...' : (data?.availableBalance ?? 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Ready for instant payout withdrawal</div>
              </div>
              <button
                id="request-payout-btn"
                onClick={() => {
                  setPayoutAmount((data?.availableBalance || 0).toString());
                  setIsPayoutModalOpen(true);
                }}
                disabled={loading || (data?.availableBalance || 0) < (data?.minPayoutThreshold || 20)}
                className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> Request Payout
              </button>
            </div>

            {/* Total Estimated Earnings */}
            <div className="p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-rose-500/40 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Total Earnings</span>
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  ${loading ? '...' : (data?.estimatedEarnings ?? 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" /> Lifetime gross credited
                </div>
              </div>
              <div className="text-[11px] text-neutral-400 pt-3 border-t border-neutral-900 mt-3">
                Calculated from verified server ads
              </div>
            </div>

            {/* Pending Payouts */}
            <div className="p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Pending Payouts</span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-tight">
                  ${loading ? '...' : (data?.pendingBalance ?? 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">In clearing / processing queue</div>
              </div>
              <div className="text-[11px] text-neutral-400 pt-3 border-t border-neutral-900 mt-3">
                Settles within 1-2 business days
              </div>
            </div>

            {/* Total Paid Out */}
            <div className="p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-blue-500/40 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Total Paid Out</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-blue-300 tracking-tight">
                  ${loading ? '...' : (data?.totalPaidOut ?? 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Completed withdrawals</div>
              </div>
              <div className="text-[11px] text-neutral-400 pt-3 border-t border-neutral-900 mt-3">
                Transferred to payment methods
              </div>
            </div>
          </div>

          {/* Ad Verification & Anti-Fraud Bar */}
          <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-400">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-neutral-400" />
                <span>
                  <strong className="text-white">{data?.totalValidImpressions ?? 0}</strong> Verified Impressions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-neutral-400" />
                <span>
                  <strong className="text-white">{data?.totalValidClicks ?? 0}</strong> Verified Ad Clicks
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{data?.totalFilteredFraudEvents ?? 0} Invalid/spam events filtered</span>
              </div>
            </div>
            <div className="text-neutral-400">
              Min payout: <span className="text-white font-medium">${(data?.minPayoutThreshold || 20).toFixed(2)} USD</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-neutral-800 gap-2">
            <button
              id="tab-overview"
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-3 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'border-rose-500 text-rose-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Overview & Breakdown
            </button>
            <button
              id="tab-videos"
              onClick={() => setActiveTab('videos')}
              className={`pb-3 px-3 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'videos'
                  ? 'border-rose-500 text-rose-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <VideoIcon className="w-4 h-4" /> Video Earnings ({data?.revenueByVideo?.length || 0})
            </button>
            <button
              id="tab-payouts"
              onClick={() => setActiveTab('payouts')}
              className={`pb-3 px-3 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'payouts'
                  ? 'border-rose-500 text-rose-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Payout History ({data?.payouts?.length || 0})
            </button>
            <button
              id="tab-ledger"
              onClick={() => setActiveTab('ledger')}
              className={`pb-3 px-3 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'ledger'
                  ? 'border-rose-500 text-rose-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <DollarSign className="w-4 h-4" /> Transaction Ledger
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* How Revenue is Calculated */}
                <div className="p-5 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-rose-400" /> Revenue Calculation Rules
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Earnings are computed purely from legitimate, server-verified advertising interactions delivered across your published videos:
                  </p>
                  <ul className="text-xs text-neutral-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span><strong>Banner Impressions:</strong> Credited at CPM rates when viewability threshold is reached.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span><strong>Verified Clicks:</strong> CPC credited when unique users click sponsor banners or full-screen ads.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span><strong>{data?.creatorSharePercent}% Creator Share:</strong> Direct deposit to your available creator balance with no hidden deductions.</span>
                    </li>
                  </ul>
                </div>

                {/* Payout Channels */}
                <div className="p-5 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-400" /> Supported Payout Methods
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">P</div>
                      <div>
                        <div className="font-semibold text-white">PayPal</div>
                        <div className="text-[10px] text-neutral-400">Instant / 24h</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">ACH</div>
                      <div>
                        <div className="font-semibold text-white">Bank Transfer</div>
                        <div className="text-[10px] text-neutral-400">1-3 days</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">S</div>
                      <div>
                        <div className="font-semibold text-white">Stripe</div>
                        <div className="text-[10px] text-neutral-400">Connected account</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">W</div>
                      <div>
                        <div className="font-semibold text-white">Wire Transfer</div>
                        <div className="text-[10px] text-neutral-400">Global SWIFT</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Videos Breakdown */}
          {activeTab === 'videos' && (
            <div className="space-y-3">
              <div className="text-xs text-neutral-400">
                Individual earnings and engagement performance for each of your active videos:
              </div>

              <div className="overflow-x-auto rounded-xl border border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Video</th>
                      <th className="p-3 text-right">Views</th>
                      <th className="p-3 text-right">Ad Impr.</th>
                      <th className="p-3 text-right">Clicks</th>
                      <th className="p-3 text-right font-bold text-white">Earnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 bg-neutral-900/40">
                    {data?.revenueByVideo && data.revenueByVideo.length > 0 ? (
                      data.revenueByVideo.map((v) => (
                        <tr key={v.videoId} className="hover:bg-neutral-800/40 transition-colors">
                          <td className="p-3 flex items-center gap-3 max-w-[280px]">
                            {v.thumbnailUrl ? (
                              <img
                                src={v.thumbnailUrl}
                                alt="Thumb"
                                className="w-10 h-14 object-cover rounded-md bg-neutral-800 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-14 rounded-md bg-neutral-800 flex items-center justify-center text-neutral-500 shrink-0">
                                <VideoIcon className="w-4 h-4" />
                              </div>
                            )}
                            <div className="truncate">
                              <div className="font-medium text-white truncate">{v.videoCaption || 'Untitled Short'}</div>
                              <div className="text-[10px] text-neutral-400 font-mono">ID: {v.videoId}</div>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-neutral-300">{(v.viewsCount || 0).toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-neutral-300">{(v.impressions || 0).toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-neutral-300">{(v.clicks || 0).toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400">
                            ${(v.earnings || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-neutral-500">
                          No videos recorded for this creator yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Payout History */}
          {activeTab === 'payouts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">All requested and completed payout disbursements:</span>
                <button
                  onClick={() => {
                    setPayoutAmount((data?.availableBalance || 0).toString());
                    setIsPayoutModalOpen(true);
                  }}
                  disabled={loading || (data?.availableBalance || 0) < (data?.minPayoutThreshold || 20)}
                  className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> Request New Payout
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Payout ID / Date</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Account</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 bg-neutral-900/40">
                    {data?.payouts && data.payouts.length > 0 ? (
                      data.payouts.map((p) => {
                        const statusColors: Record<string, string> = {
                          completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                          processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                          pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                          rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                        };

                        return (
                          <tr key={p.id} className="hover:bg-neutral-800/40 transition-colors">
                            <td className="p-3">
                              <div className="font-mono text-neutral-300 font-medium">{p.id}</div>
                              <div className="text-[10px] text-neutral-400">{new Date(p.requestedAt).toLocaleDateString()}</div>
                              {p.transactionReference && (
                                <div className="text-[10px] text-emerald-400 font-mono">Ref: {p.transactionReference}</div>
                              )}
                            </td>
                            <td className="p-3 font-medium uppercase text-white tracking-wider text-[11px]">
                              {p.method.replace('_', ' ')}
                            </td>
                            <td className="p-3 font-mono text-neutral-300 text-[11px] truncate max-w-[200px]">
                              {p.accountDetails}
                              {p.adminNotes && (
                                <div className="text-[10px] text-neutral-400 italic mt-0.5">"{p.adminNotes}"</div>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-white text-sm">
                              ${p.amount.toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2.5 py-1 text-[10px] font-semibold border rounded-full uppercase tracking-wider inline-block ${
                                  statusColors[p.status] || 'bg-neutral-800 text-neutral-400'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-neutral-500">
                          No payout requests yet. Once your balance reaches $20.00, you can request a withdrawal.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Transaction Ledger */}
          {activeTab === 'ledger' && (
            <div className="space-y-3">
              <div className="text-xs text-neutral-400">
                Live verified revenue event logs credited to your creator balance:
              </div>

              <div className="overflow-x-auto rounded-xl border border-neutral-800 max-h-[380px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800 sticky top-0">
                    <tr>
                      <th className="p-3">Event Type</th>
                      <th className="p-3">Ad Title / Target</th>
                      <th className="p-3 text-right">Gross Ad Rate</th>
                      <th className="p-3 text-right font-bold text-emerald-400">Your Share ({data?.creatorSharePercent}%)</th>
                      <th className="p-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 bg-neutral-900/40">
                    {data?.recentTransactions && data.recentTransactions.length > 0 ? (
                      data.recentTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-neutral-800/40 transition-colors">
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-neutral-800 text-neutral-300">
                              {t.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 max-w-[240px] truncate">
                            <div className="font-medium text-white truncate">{t.adTitle || 'Ad Campaign'}</div>
                            {t.videoCaption && (
                              <div className="text-[10px] text-neutral-400 truncate">On video: {t.videoCaption}</div>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono text-neutral-400">
                            ${(t.grossRevenue || 0).toFixed(4)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400">
                            +${(t.creatorRevenue || 0).toFixed(4)}
                          </td>
                          <td className="p-3 text-right font-mono text-[10px] text-neutral-400">
                            {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-neutral-500">
                          No revenue events logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Bank-grade 256-bit encrypted payout pipeline</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Payout Request Modal Popup */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            id="payout-form-container"
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4 text-white"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-400" /> Request Payout
              </h3>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {payoutError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{payoutError}</span>
              </div>
            )}

            {payoutSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{payoutSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRequestPayoutSubmit} className="space-y-4">
              {/* Available balance badge */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Available to Withdraw:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  ${(data?.availableBalance || 0).toFixed(2)} USD
                </span>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Payout Amount ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                  <input
                    id="payout-amount-input"
                    type="number"
                    step="0.01"
                    min={data?.minPayoutThreshold || 20}
                    max={data?.availableBalance || 0}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder={(data?.minPayoutThreshold || 20).toFixed(2)}
                    className="w-full pl-8 pr-16 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono focus:border-emerald-500 focus:outline-none text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPayoutAmount((data?.availableBalance || 0).toString())}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-bold rounded-md"
                  >
                    MAX
                  </button>
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">
                  Minimum threshold: ${(data?.minPayoutThreshold || 20).toFixed(2)} USD
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Select Payout Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'paypal', label: 'PayPal', icon: 'P' },
                    { id: 'bank_transfer', label: 'Bank Transfer (ACH)', icon: 'ACH' },
                    { id: 'stripe', label: 'Stripe Express', icon: 'S' },
                    { id: 'wire', label: 'Wire Transfer', icon: 'W' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayoutMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                        payoutMethod === m.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold">
                        {m.icon}
                      </span>
                      <span className="truncate">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Details */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  {payoutMethod === 'paypal' && 'PayPal Email Address'}
                  {payoutMethod === 'bank_transfer' && 'Bank Account & Routing / IBAN'}
                  {payoutMethod === 'stripe' && 'Stripe Account Email / ID'}
                  {payoutMethod === 'wire' && 'SWIFT Code & Account Details'}
                </label>
                <input
                  id="payout-account-details-input"
                  type="text"
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                  placeholder={
                    payoutMethod === 'paypal'
                      ? 'your.email@example.com'
                      : payoutMethod === 'bank_transfer'
                      ? 'Account # & Routing Number'
                      : 'Account identifier'
                  }
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  id="submit-payout-request-btn"
                  type="submit"
                  disabled={submittingPayout}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {submittingPayout ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
