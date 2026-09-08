import React, { useState, useEffect } from 'react';
import { X, UserX, VolumeX, Search, Shield, ShieldOff, Volume2, UserCheck, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';

interface BlockMuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'blocked' | 'muted';
  onRelationshipChanged?: () => void;
}

export const BlockMuteModal: React.FC<BlockMuteModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'blocked',
  onRelationshipChanged,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'blocked' | 'muted'>(initialTab);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [mutedUsers, setMutedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      fetchLists();
    }
  }, [isOpen, initialTab, currentUser]);

  const fetchLists = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [blockedRes, mutedRes] = await Promise.all([
        fetch('/api/users/blocked', {
          headers: { 'x-user-id': currentUser.id },
        }),
        fetch('/api/users/muted', {
          headers: { 'x-user-id': currentUser.id },
        }),
      ]);

      const blockedData = await blockedRes.json();
      const mutedData = await mutedRes.json();

      setBlockedUsers(blockedData.blockedUsers || []);
      setMutedUsers(mutedData.mutedUsers || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (targetUser: User) => {
    if (!currentUser) return;
    setActionLoadingId(targetUser.id);
    try {
      const res = await fetch(`/api/users/${targetUser.id}/unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
      });
      if (res.ok) {
        setBlockedUsers(prev => prev.filter(u => u.id !== targetUser.id));
        if (onRelationshipChanged) onRelationshipChanged();
      }
    } catch {
      // ignore
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnmute = async (targetUser: User) => {
    if (!currentUser) return;
    setActionLoadingId(targetUser.id);
    try {
      const res = await fetch(`/api/users/${targetUser.id}/unmute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
      });
      if (res.ok) {
        setMutedUsers(prev => prev.filter(u => u.id !== targetUser.id));
        if (onRelationshipChanged) onRelationshipChanged();
      }
    } catch {
      // ignore
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  const currentList = activeTab === 'blocked' ? blockedUsers : mutedUsers;
  const filteredList = currentList.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      (u.bio && u.bio.toLowerCase().includes(q))
    );
  });

  return (
    <div
      id="block-mute-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
    >
      <div
        id="block-mute-modal-container"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 text-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-rose-500" />
            <div>
              <h2 className="text-sm font-bold text-white">Privacy & Safety Settings</h2>
              <p className="text-[11px] text-zinc-400">Manage accounts you have blocked or muted</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-zinc-950/40 px-4">
          <button
            type="button"
            onClick={() => setActiveTab('blocked')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'blocked'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserX className="h-4 w-4" />
            <span>Blocked Accounts</span>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
              {blockedUsers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('muted')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'muted'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <VolumeX className="h-4 w-4" />
            <span>Muted Accounts</span>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
              {mutedUsers.length}
            </span>
          </button>
        </div>

        {/* Informational Guidance Banner */}
        <div className="bg-zinc-950/60 px-5 py-2.5 border-b border-white/5 flex items-start gap-2 text-[11px] text-zinc-400 leading-relaxed">
          <AlertCircle className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
          {activeTab === 'blocked' ? (
            <span>
              Blocked users cannot view your profile, videos, or send comments. Their content and comments are completely hidden from your feeds and search.
            </span>
          ) : (
            <span>
              Muting hides a user&apos;s videos from your feeds and recommendations. Muted users are not notified and can still view your public videos.
            </span>
          )}
        </div>

        {/* Search Input */}
        {currentList.length > 0 && (
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab} accounts...`}
                className="w-full rounded-xl bg-zinc-800/80 pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 outline-hidden border border-white/10 focus:border-rose-500/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Accounts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            </div>
          ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-500">
              {activeTab === 'blocked' ? (
                <>
                  <ShieldOff className="h-10 w-10 text-zinc-600 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-zinc-400">No Blocked Accounts</p>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                    {searchQuery ? 'No blocked users match your search.' : 'You have not blocked any accounts.'}
                  </p>
                </>
              ) : (
                <>
                  <Volume2 className="h-10 w-10 text-zinc-600 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-zinc-400">No Muted Accounts</p>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                    {searchQuery ? 'No muted users match your search.' : 'You have not muted any accounts.'}
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredList.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-zinc-800/40 p-3 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="h-10 w-10 rounded-full object-cover border border-white/10 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white truncate">{user.displayName}</span>
                      {user.isVerified && (
                        <span className="rounded-full bg-sky-500 p-0.5 text-[7px] text-white">✓</span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 truncate block">@{user.username}</span>
                    {user.bio && (
                      <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{user.bio}</p>
                    )}
                  </div>
                </div>

                {activeTab === 'blocked' ? (
                  <button
                    type="button"
                    onClick={() => handleUnblock(user)}
                    disabled={actionLoadingId === user.id}
                    className="flex items-center gap-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors shrink-0 disabled:opacity-50"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{actionLoadingId === user.id ? 'Unblocking...' : 'Unblock'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUnmute(user)}
                    disabled={actionLoadingId === user.id}
                    className="flex items-center gap-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors shrink-0 disabled:opacity-50"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>{actionLoadingId === user.id ? 'Unmuting...' : 'Unmute'}</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-3.5 bg-zinc-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
