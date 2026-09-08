import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Play,
  UserCheck,
  UserX,
  Trash2,
  Clock,
  History,
  Scale,
  FileText,
  AlertOctagon,
  RefreshCw,
  Eye,
  Info,
  Check,
  X
} from 'lucide-react';
import { Report, Video, User, CopyrightViolationRecord } from '../types';

interface AdminCopyrightReportsProps {
  onRefreshStats?: () => void;
  getAuthHeaders: () => Record<string, string>;
  triggerToast: (msg: string) => void;
}

export const AdminCopyrightReports: React.FC<AdminCopyrightReportsProps> = ({
  onRefreshStats,
  getAuthHeaders,
  triggerToast,
}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'under_review' | 'resolved' | 'dismissed'>('all');
  const [claimTypeFilter, setClaimTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected report for deep inspection modal
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Creator violations history modal
  const [creatorHistoryUser, setCreatorHistoryUser] = useState<User | null>(null);
  const [creatorViolations, setCreatorViolations] = useState<CopyrightViolationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Action dialog state
  const [actionDialogConfig, setActionDialogConfig] = useState<{
    isOpen: boolean;
    report: Report | null;
    status: 'under_review' | 'resolved' | 'dismissed';
    action?: 'remove_video' | 'strike_issued' | 'video_removed_with_strike' | 'creator_banned' | 'dismissed';
    reason: string;
    adminNotes: string;
  }>({
    isOpen: false,
    report: null,
    status: 'resolved',
    reason: '',
    adminNotes: '',
  });
  const [actionSubmitting, setActionSubmitting] = useState<boolean>(false);

  // Manual strike state
  const [manualStrikeReason, setManualStrikeReason] = useState<string>('');
  const [issuingStrike, setIssuingStrike] = useState<boolean>(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/copyright-reports', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch {
      triggerToast('Failed to fetch copyright reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filtered list
  const filteredReports = reports.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (claimTypeFilter !== 'all' && r.copyrightData?.claimType !== claimTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchClaimant = r.copyrightData?.claimantName?.toLowerCase().includes(q) || false;
      const matchWork = r.copyrightData?.originalWorkTitle?.toLowerCase().includes(q) || false;
      const matchTarget = r.targetPreview?.toLowerCase().includes(q) || false;
      const matchTargetId = r.targetId.toLowerCase().includes(q);
      const matchReporter = r.reporterUsername.toLowerCase().includes(q);
      const matchId = r.id.toLowerCase().includes(q);
      return matchClaimant || matchWork || matchTarget || matchTargetId || matchReporter || matchId;
    }
    return true;
  });

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const underReviewCount = reports.filter(r => r.status === 'under_review').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const dismissedCount = reports.filter(r => r.status === 'dismissed').length;

  // Open Creator Violations modal
  const handleOpenCreatorHistory = async (creatorId: string) => {
    setLoadingHistory(true);
    setCreatorHistoryUser(null);
    setCreatorViolations([]);
    try {
      const res = await fetch(`/api/admin/creators/${creatorId}/violations`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatorViolations(data.violations || []);
        setCreatorHistoryUser(data.user || null);
      }
    } catch {
      triggerToast('Failed to load creator violation history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Submit action on report
  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionDialogConfig.report) return;

    if (!actionDialogConfig.reason.trim()) {
      triggerToast('Please provide a reason for this administrative moderation decision.');
      return;
    }

    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/admin/copyright-reports/${actionDialogConfig.report.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: actionDialogConfig.status,
          action: actionDialogConfig.action,
          reason: actionDialogConfig.reason.trim(),
          adminNotes: actionDialogConfig.adminNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        triggerToast(`Copyright report ${actionDialogConfig.report.id} updated: ${actionDialogConfig.status.toUpperCase()}`);
        setActionDialogConfig({
          isOpen: false,
          report: null,
          status: 'resolved',
          reason: '',
          adminNotes: '',
        });
        setSelectedReport(null);
        fetchReports();
        if (onRefreshStats) onRefreshStats();
      } else {
        const err = await res.json();
        triggerToast(err.error || 'Failed to update copyright report status');
      }
    } catch {
      triggerToast('Network error while processing moderation action');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Issue manual strike to creator
  const handleIssueManualStrike = async () => {
    if (!creatorHistoryUser) return;
    if (!manualStrikeReason.trim()) {
      triggerToast('Please specify the justification reason for issuing a copyright strike.');
      return;
    }

    setIssuingStrike(true);
    try {
      const res = await fetch(`/api/admin/creators/${creatorHistoryUser.id}/strike`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reason: manualStrikeReason.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast(`Copyright strike issued to @${creatorHistoryUser.username}. Total strikes: ${data.strikesCount}`);
        setManualStrikeReason('');
        handleOpenCreatorHistory(creatorHistoryUser.id);
        fetchReports();
        if (onRefreshStats) onRefreshStats();
      } else {
        const err = await res.json();
        triggerToast(err.error || 'Failed to issue strike');
      }
    } catch {
      triggerToast('Network error issuing copyright strike');
    } finally {
      setIssuingStrike(false);
    }
  };

  const getClaimTypeBadge = (claimType?: string) => {
    switch (claimType) {
      case 'unlicensed_music':
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Audio / Music</span>;
      case 'video_reupload':
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Video Re-upload</span>;
      case 'footage_clip':
        return <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Footage / B-Roll</span>;
      case 'artwork_logo':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Logo / Artwork</span>;
      default:
        return <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded text-[10px] font-bold">Proprietary IP</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"><Clock className="h-3 w-3" /> Pending Review</span>;
      case 'under_review':
        return <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"><Scale className="h-3 w-3" /> Under Legal Review</span>;
      case 'resolved':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Resolved</span>;
      case 'dismissed':
        return <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"><XCircle className="h-3 w-3" /> Dismissed</span>;
      default:
        return <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[10px]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Copyright Management & DMCA Takedowns</h2>
              <p className="text-xs text-zinc-400">
                Review intellectual property claims, inspect claimed audio/video evidence, and take administrative actions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchReports}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('pending')}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            statusFilter === 'pending'
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-white/10 bg-zinc-900/60 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Pending Claims</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-400">{pendingCount}</p>
          <span className="text-[10px] text-zinc-500">Requires review</span>
        </div>

        <div
          onClick={() => setStatusFilter('under_review')}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            statusFilter === 'under_review'
              ? 'border-sky-500 bg-sky-500/10'
              : 'border-white/10 bg-zinc-900/60 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Under Review</span>
            <Scale className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-sky-400">{underReviewCount}</p>
          <span className="text-[10px] text-zinc-500">Investigation active</span>
        </div>

        <div
          onClick={() => setStatusFilter('resolved')}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            statusFilter === 'resolved'
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-white/10 bg-zinc-900/60 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Resolved</span>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-400">{resolvedCount}</p>
          <span className="text-[10px] text-zinc-500">Action executed</span>
        </div>

        <div
          onClick={() => setStatusFilter('dismissed')}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            statusFilter === 'dismissed'
              ? 'border-zinc-500 bg-zinc-800/40'
              : 'border-white/10 bg-zinc-900/60 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Dismissed</span>
            <XCircle className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-zinc-300">{dismissedCount}</p>
          <span className="text-[10px] text-zinc-500">Rejected claims</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-2xl border border-white/10">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search original work, claimant, video..."
            className="w-full rounded-xl border border-white/10 bg-zinc-800 pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-white/10 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Statuses ({reports.length})</option>
            <option value="pending">Pending ({pendingCount})</option>
            <option value="under_review">Under Review ({underReviewCount})</option>
            <option value="resolved">Resolved ({resolvedCount})</option>
            <option value="dismissed">Dismissed ({dismissedCount})</option>
          </select>

          {/* Claim Type Filter */}
          <select
            value={claimTypeFilter}
            onChange={e => setClaimTypeFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Claim Types</option>
            <option value="unlicensed_music">Audio / Music Tracks</option>
            <option value="video_reupload">Video Re-uploads</option>
            <option value="footage_clip">Footage / B-Roll</option>
            <option value="artwork_logo">Logo / Artwork</option>
            <option value="other">Other IP</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mx-auto" />
          <p className="text-xs">Loading copyright claims repository...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="py-16 text-center text-zinc-400 rounded-2xl border border-white/10 bg-zinc-900/40 space-y-2">
          <ShieldAlert className="h-10 w-10 text-zinc-500 mx-auto" />
          <p className="text-sm font-bold text-white">No copyright reports found</p>
          <p className="text-xs text-zinc-500">All copyright notices have been processed or none match the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredReports.map(report => {
            const cp = report.copyrightData;
            const targetVideo = report.targetVideo;
            const targetCreator = report.targetCreator;

            return (
              <div
                key={report.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all space-y-4 ${
                  report.status === 'pending'
                    ? 'border-amber-500/40 bg-zinc-900 shadow-md'
                    : report.status === 'under_review'
                    ? 'border-sky-500/40 bg-zinc-900'
                    : 'border-white/10 bg-zinc-900/60 opacity-85'
                }`}
              >
                {/* Top Row: IDs, Badge, and Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-amber-400 font-bold">{report.id}</span>
                    {getClaimTypeBadge(cp?.claimType)}
                    {getStatusBadge(report.status)}
                  </div>
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-zinc-500" />
                    {new Date(report.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Main Content Grid: 2 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left Column (Claimant & Original Work Information) */}
                  <div className="md:col-span-7 space-y-3">
                    {/* Original Work Title & Claim Reason */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                        Claimed Original Work
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        {cp?.originalWorkTitle || report.reason}
                      </h4>
                      {cp?.originalWorkUrl && (
                        <a
                          href={cp.originalWorkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-0.5 underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>View Proof / Original Work Source</span>
                        </a>
                      )}
                    </div>

                    {/* Infringement Details Description */}
                    <div className="rounded-xl bg-zinc-800/70 p-3 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-zinc-400">Claimant Statement</span>
                        {cp?.infringementTimestamp && (
                          <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Timestamp: {cp.infringementTimestamp}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed">{report.details || cp?.notes || 'No extra notes provided.'}</p>
                    </div>

                    {/* Claimant Identity Card */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950/60 p-2.5 rounded-xl border border-white/5">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Claimant / Rights Holder</span>
                        <span className="font-bold text-zinc-200 block truncate">{cp?.claimantName || report.reporterUsername}</span>
                        {cp?.claimantOrganization && (
                          <span className="text-[10px] text-zinc-400 block truncate">{cp.claimantOrganization}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Contact & Authority</span>
                        <span className="text-zinc-300 block truncate">{cp?.claimantEmail || 'N/A'}</span>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                          <Check className="h-3 w-3" /> Legal Oath Confirmed
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (Reported Video Preview & Creator Info) */}
                  <div className="md:col-span-5 space-y-3 bg-zinc-950/40 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                      Target Content & Creator
                    </span>

                    {/* Video Box */}
                    {targetVideo ? (
                      <div className="flex gap-3 items-center">
                        <div className="relative h-20 w-14 shrink-0 rounded-lg overflow-hidden bg-black border border-white/10 group">
                          <img
                            src={targetVideo.thumbnailUrl}
                            alt={targetVideo.caption}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-4 w-4 text-white fill-white" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs font-semibold text-zinc-200 line-clamp-2">{targetVideo.caption}</p>
                          <div className="text-[10px] text-zinc-400 flex items-center gap-2">
                            <span>Status: {targetVideo.status}</span>
                            <span>•</span>
                            <span>{targetVideo.viewsCount} views</span>
                          </div>
                          <span className="text-[9px] font-mono text-zinc-500 block truncate">
                            Video ID: {targetVideo.id}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-zinc-800/80 p-2.5 text-xs text-zinc-300 border border-white/5">
                        <span className="font-semibold text-zinc-400">Target Preview: </span>
                        {report.targetPreview}
                      </div>
                    )}

                    {/* Creator Standing */}
                    {targetCreator && (
                      <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={targetCreator.avatarUrl}
                            alt={targetCreator.username}
                            className="h-7 w-7 rounded-full object-cover border border-white/10"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">@{targetCreator.username}</p>
                            <span className="text-[10px] text-zinc-400 truncate block">
                              {targetCreator.displayName || targetCreator.username}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              (targetCreator.copyrightStrikesCount || 0) >= 3
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : (targetCreator.copyrightStrikesCount || 0) > 0
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {targetCreator.copyrightStrikesCount || 0}/3 Strikes
                          </span>

                          <button
                            type="button"
                            onClick={() => handleOpenCreatorHistory(targetCreator.id)}
                            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
                            title="View Creator Infringement History"
                          >
                            <History className="h-3.5 w-3.5 text-sky-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Review Notes (if already acted upon) */}
                {report.reviewedBy && (
                  <div className="rounded-xl bg-zinc-800/40 p-3 border border-white/5 space-y-1 text-xs text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-zinc-500">Moderation Audit Record</span>
                      <span className="text-[10px] text-zinc-500">
                        Handled by @{report.reviewedBy} at {report.reviewedAt ? new Date(report.reviewedAt).toLocaleString() : ''}
                      </span>
                    </div>
                    {report.actionTaken && (
                      <p className="text-xs text-zinc-300 font-semibold">
                        Action Taken: <span className="text-amber-400">{report.actionTaken.replace(/_/g, ' ').toUpperCase()}</span>
                      </p>
                    )}
                    {report.adminNotes && <p className="text-[11px] text-zinc-400 italic">"{report.adminNotes}"</p>}
                  </div>
                )}

                {/* Enforcement Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Full Claim Details</span>
                    </button>

                    {targetCreator && (
                      <button
                        type="button"
                        onClick={() => handleOpenCreatorHistory(targetCreator.id)}
                        className="rounded-xl bg-zinc-800/80 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>Creator History ({targetCreator.copyrightStrikesCount || 0} strikes)</span>
                      </button>
                    )}
                  </div>

                  {/* Moderation Workflow Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {report.status !== 'under_review' && report.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={() =>
                          setActionDialogConfig({
                            isOpen: true,
                            report,
                            status: 'under_review',
                            reason: 'Claim placed under formal human legal review.',
                            adminNotes: '',
                          })
                        }
                        className="rounded-xl bg-sky-500/20 border border-sky-500/30 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/30 transition-colors"
                      >
                        Mark Under Review
                      </button>
                    )}

                    {report.status !== 'dismissed' && (
                      <button
                        type="button"
                        onClick={() =>
                          setActionDialogConfig({
                            isOpen: true,
                            report,
                            status: 'dismissed',
                            action: 'dismissed',
                            reason: 'Claim dismissed: Insufficient evidence of copyright infringement.',
                            adminNotes: '',
                          })
                        }
                        className="rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                      >
                        Dismiss Claim
                      </button>
                    )}

                    {/* Takedown & Enforcement */}
                    {report.status !== 'resolved' && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActionDialogConfig({
                              isOpen: true,
                              report,
                              status: 'resolved',
                              action: 'remove_video',
                              reason: 'Video removed due to verified copyright infringement claim.',
                              adminNotes: '',
                            })
                          }
                          className="rounded-xl bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove Video Only</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setActionDialogConfig({
                              isOpen: true,
                              report,
                              status: 'resolved',
                              action: 'video_removed_with_strike',
                              reason: 'Copyright infringement confirmed. Video removed and formal DMCA strike issued.',
                              adminNotes: '',
                            })
                          }
                          className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-500 shadow-md transition-colors flex items-center gap-1.5"
                        >
                          <AlertOctagon className="h-3.5 w-3.5" />
                          <span>Remove + Issue Strike</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          MODAL 1: ADMINISTRATIVE ACTION CONFIRMATION DIALOG
         ======================================================== */}
      {actionDialogConfig.isOpen && actionDialogConfig.report && (
        <div
          onClick={() => setActionDialogConfig(prev => ({ ...prev, isOpen: false }))}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold">Admin Moderation Enforcement</h3>
              </div>
              <button
                type="button"
                onClick={() => setActionDialogConfig(prev => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAction} className="space-y-4 text-xs">
              <div className="rounded-xl bg-zinc-800/80 p-3 border border-white/5 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-amber-400">Target Copyright Report</span>
                <p className="text-xs font-semibold text-white">ID: {actionDialogConfig.report.id}</p>
                <p className="text-xs text-zinc-300">{actionDialogConfig.report.reason}</p>
                <p className="text-[11px] text-zinc-400">Target: {actionDialogConfig.report.targetPreview}</p>
              </div>

              {/* Action Selection */}
              <div>
                <label className="block font-bold text-zinc-300 mb-1.5">Selected Enforcement Action</label>
                <select
                  value={actionDialogConfig.action || 'none'}
                  onChange={e => {
                    const val = e.target.value as any;
                    setActionDialogConfig(prev => ({
                      ...prev,
                      action: val === 'none' ? undefined : val,
                    }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="none">No Content Removal (Status Change Only)</option>
                  <option value="remove_video">Remove Video from Platform Feed</option>
                  <option value="video_removed_with_strike">Remove Video & Issue 1 Copyright Strike</option>
                  <option value="strike_issued">Issue 1 Copyright Strike (Keep Video)</option>
                  <option value="creator_banned">Ban / Suspend Creator Account</option>
                  <option value="dismissed">Dismiss Claim</option>
                </select>
              </div>

              {/* Reason Input (Audit Log) */}
              <div>
                <label className="block font-bold text-zinc-300 mb-1.5">
                  Action Reason / Justification <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={actionDialogConfig.reason}
                  onChange={e =>
                    setActionDialogConfig(prev => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="e.g. Unlicensed master audio match verified with label."
                  className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-1">
                  This reason will be logged in the permanent Admin Audit Log and notified to creator/claimant.
                </span>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block font-bold text-zinc-300 mb-1.5">Internal Admin Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={actionDialogConfig.adminNotes}
                  onChange={e =>
                    setActionDialogConfig(prev => ({
                      ...prev,
                      adminNotes: e.target.value,
                    }))
                  }
                  placeholder="Private legal case notes, external license ticket reference, etc."
                  className="w-full rounded-xl border border-white/10 bg-zinc-800 p-3 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActionDialogConfig(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 rounded-xl bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors shadow-md"
                >
                  {actionSubmitting ? 'Applying Action...' : 'Execute & Log Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: CREATOR VIOLATION HISTORY & STRIKE TOOL
         ======================================================== */}
      {creatorHistoryUser && (
        <div
          onClick={() => setCreatorHistoryUser(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-zinc-900 text-white shadow-2xl animate-fade-in overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 shrink-0 bg-zinc-900">
              <div className="flex items-center gap-3">
                <img
                  src={creatorHistoryUser.avatarUrl}
                  alt={creatorHistoryUser.username}
                  className="h-10 w-10 rounded-full object-cover border border-white/10"
                />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    @{creatorHistoryUser.username} Violation Record
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {creatorHistoryUser.displayName || creatorHistoryUser.username} • User ID: {creatorHistoryUser.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreatorHistoryUser(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Creator Status Overview Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-950">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Current Standing</span>
                  <p className="text-xs font-bold text-white">
                    {creatorHistoryUser.isBanned
                      ? 'Account Suspended / Banned'
                      : (creatorHistoryUser.copyrightStrikesCount || 0) >= 3
                      ? '3 Strikes - Eligible for Account Ban'
                      : (creatorHistoryUser.copyrightStrikesCount || 0) > 0
                      ? `${creatorHistoryUser.copyrightStrikesCount} Active Copyright Strike(s)`
                      : 'Good Standing (0 Strikes)'}
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    creatorHistoryUser.isBanned
                      ? 'bg-rose-500 text-white'
                      : (creatorHistoryUser.copyrightStrikesCount || 0) >= 3
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : (creatorHistoryUser.copyrightStrikesCount || 0) > 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {creatorHistoryUser.copyrightStrikesCount || 0} / 3 Strikes
                </span>
              </div>

              {/* Violations Log */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Infringement History ({creatorViolations.length})
                </span>

                {loadingHistory ? (
                  <div className="py-8 text-center text-zinc-400">Loading history...</div>
                ) : creatorViolations.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 rounded-xl border border-white/5 bg-zinc-950">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-1.5" />
                    <p className="font-semibold text-zinc-300">No prior recorded copyright violations.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {creatorViolations.map((v, i) => (
                      <div
                        key={v.id || i}
                        className="rounded-xl border border-white/10 bg-zinc-950/80 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-400 text-xs">
                            {v.actionTaken ? v.actionTaken.replace(/_/g, ' ').toUpperCase() : 'COPYRIGHT STRIKE'}
                          </span>
                          <span className="text-[10px] text-zinc-500">{new Date(v.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-zinc-200">{v.reason}</p>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-3 pt-1 border-t border-white/5">
                          <span>Issued by: @{v.adminUsername || v.adminId}</span>
                          {v.videoId && <span>Video: {v.videoId}</span>}
                          {v.reportId && <span>Report: {v.reportId}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Strike Tool */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5">
                <span className="font-bold text-amber-300 block text-xs flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Issue Manual Copyright Strike
                </span>
                <p className="text-[11px] text-zinc-400">
                  Manually increment creator strike count for external DMCA legal notices or repeated verified offenses.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualStrikeReason}
                    onChange={e => setManualStrikeReason(e.target.value)}
                    placeholder="Reason for manual copyright strike..."
                    className="flex-1 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={issuingStrike || !manualStrikeReason.trim()}
                    onClick={handleIssueManualStrike}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {issuingStrike ? 'Issuing...' : 'Issue Strike'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: FULL REPORT & CLAIM DETAILS MODAL
         ======================================================== */}
      {selectedReport && (
        <div
          onClick={() => setSelectedReport(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-zinc-900 text-white shadow-2xl animate-fade-in overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 shrink-0 bg-zinc-900">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold">Copyright Claim Dossier #{selectedReport.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-zinc-950 p-3 rounded-xl border border-white/5">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Submission Date</span>
                  <span className="text-zinc-300 block mt-1">{new Date(selectedReport.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Claim Details */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <h4 className="font-bold text-zinc-300">Infringement Claim & Work</h4>
                <div className="space-y-1.5 bg-zinc-800/50 p-3 rounded-xl border border-white/5">
                  <p><span className="text-zinc-400">Original Work:</span> <strong className="text-white">{selectedReport.copyrightData?.originalWorkTitle || selectedReport.reason}</strong></p>
                  <p><span className="text-zinc-400">Claim Category:</span> <strong className="text-amber-400">{selectedReport.copyrightData?.claimType || 'General'}</strong></p>
                  {selectedReport.copyrightData?.originalWorkUrl && (
                    <p>
                      <span className="text-zinc-400">Original URL:</span>{' '}
                      <a href={selectedReport.copyrightData.originalWorkUrl} target="_blank" rel="noreferrer" className="text-sky-400 underline">
                        {selectedReport.copyrightData.originalWorkUrl}
                      </a>
                    </p>
                  )}
                  {selectedReport.copyrightData?.infringementTimestamp && (
                    <p><span className="text-zinc-400">Timestamp:</span> <strong className="text-zinc-200">{selectedReport.copyrightData.infringementTimestamp}</strong></p>
                  )}
                  <div className="pt-2">
                    <span className="text-zinc-400 block mb-1">Claimant Detailed Statement:</span>
                    <p className="text-zinc-200 bg-zinc-900 p-2.5 rounded-lg border border-white/5 leading-relaxed">{selectedReport.details || 'None'}</p>
                  </div>
                </div>
              </div>

              {/* Claimant Contact Details */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <h4 className="font-bold text-zinc-300">Claimant Contact & Representation</h4>
                <div className="grid grid-cols-2 gap-2 bg-zinc-800/50 p-3 rounded-xl border border-white/5">
                  <p><span className="text-zinc-400 block text-[10px]">Legal Name:</span> <strong className="text-white">{selectedReport.copyrightData?.claimantName || selectedReport.reporterUsername}</strong></p>
                  <p><span className="text-zinc-400 block text-[10px]">Email:</span> <strong className="text-white">{selectedReport.copyrightData?.claimantEmail || 'N/A'}</strong></p>
                  <p><span className="text-zinc-400 block text-[10px]">Organization:</span> <span className="text-zinc-300">{selectedReport.copyrightData?.claimantOrganization || 'Individual'}</span></p>
                  <p><span className="text-zinc-400 block text-[10px]">Relationship:</span> <span className="text-zinc-300">{selectedReport.copyrightData?.relationshipToOwner || 'owner'}</span></p>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="rounded-xl bg-zinc-800 px-6 py-2 text-xs font-bold text-white hover:bg-zinc-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
