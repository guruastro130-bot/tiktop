import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Shield,
  User,
  Film,
  Flag,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Megaphone,
  Sliders,
  Calendar,
  Layers
} from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AdminAuditLogsProps {
  getAuthHeaders: () => Record<string, string>;
  triggerToast: (msg: string) => void;
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({
  getAuthHeaders,
  triggerToast,
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      triggerToast('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAdmin = log.adminUsername.toLowerCase().includes(q) || log.adminId.toLowerCase().includes(q);
      const matchReason = log.reason.toLowerCase().includes(q);
      const matchTargetId = log.targetId.toLowerCase().includes(q);
      const matchNotes = log.notes?.toLowerCase().includes(q) || false;
      const matchAction = log.action.toLowerCase().includes(q);
      return matchAdmin || matchReason || matchTargetId || matchNotes || matchAction;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('strike') || action.includes('ban')) {
      return (
        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
          {action.replace(/_/g, ' ')}
        </span>
      );
    }
    if (action.includes('remove') || action.includes('delete')) {
      return (
        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
          {action.replace(/_/g, ' ')}
        </span>
      );
    }
    if (action.includes('resolve') || action.includes('approve') || action.includes('create')) {
      return (
        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
          {action.replace(/_/g, ' ')}
        </span>
      );
    }
    return (
      <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case 'video':
        return <Film className="h-3.5 w-3.5 text-pink-400" />;
      case 'user':
        return <User className="h-3.5 w-3.5 text-sky-400" />;
      case 'report':
        return <Flag className="h-3.5 w-3.5 text-amber-400" />;
      case 'ad':
        return <Megaphone className="h-3.5 w-3.5 text-purple-400" />;
      default:
        return <Shield className="h-3.5 w-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Administrative Audit Log</h2>
              <p className="text-xs text-zinc-400">
                Immutable record of all administrative moderation actions, copyright takedowns, strikes, and system modifications.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Search & Action Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-2xl border border-white/10">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Admin, Reason, Target ID..."
            className="w-full rounded-xl border border-white/10 bg-zinc-800 pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Action Types ({logs.length})</option>
            <option value="video_removed_with_strike">Video Removed + Strike</option>
            <option value="remove_video">Video Removed</option>
            <option value="issue_strike">Strike Issued</option>
            <option value="creator_banned">Creator Banned</option>
            <option value="update_report_status">Report Status Update</option>
            <option value="dismiss_report">Report Dismissed</option>
            <option value="ban_user">User Suspended</option>
            <option value="create_ad">Ad Created</option>
            <option value="update_settings">Settings Updated</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table / Cards */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mx-auto" />
          <p className="text-xs">Loading audit trail...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-16 text-center text-zinc-400 rounded-2xl border border-white/10 bg-zinc-900/40 space-y-2">
          <FileText className="h-10 w-10 text-zinc-500 mx-auto" />
          <p className="text-sm font-bold text-white">No audit entries found</p>
          <p className="text-xs text-zinc-500">No administrative actions match your current search criteria.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map(log => (
            <div
              key={log.id}
              className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 transition-all hover:bg-zinc-900 space-y-2 text-xs"
            >
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-zinc-500 font-bold">{log.id}</span>
                  {getActionBadge(log.action)}
                  <div className="flex items-center gap-1 bg-zinc-800/80 px-2 py-0.5 rounded text-[10px] text-zinc-300">
                    {getTargetIcon(log.targetType)}
                    <span className="capitalize">{log.targetType}:</span>
                    <span className="font-mono text-zinc-400">{log.targetId}</span>
                  </div>
                </div>

                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-zinc-500" />
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>

              {/* Action Details & Reason */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-zinc-100">
                  Reason: <span className="text-zinc-300 font-normal">{log.reason}</span>
                </p>
                {log.notes && (
                  <p className="text-[11px] text-zinc-400 italic bg-zinc-950/60 p-2 rounded-lg border border-white/5">
                    Internal Note: "{log.notes}"
                  </p>
                )}
              </div>

              {/* Admin Identity Footer */}
              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-purple-400" />
                  <span>
                    Executed by: <strong className="text-zinc-300">@{log.adminUsername}</strong> (ID: {log.adminId})
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
