import React from 'react';
import { UserX, VolumeX, ShieldAlert, AlertCircle, X } from 'lucide-react';
import { User } from '../types';

interface BlockConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: 'block' | 'mute';
  targetUser: User | { id: string; username: string; displayName?: string; avatarUrl?: string } | null;
  loading?: boolean;
}

export const BlockConfirmModal: React.FC<BlockConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  targetUser,
  loading = false,
}) => {
  if (!isOpen || !targetUser) return null;

  const isBlock = type === 'block';

  return (
    <div
      id="block-confirm-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
    >
      <div
        id="block-confirm-modal-container"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-5 text-white shadow-2xl animate-scale-up"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            {isBlock ? (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                <UserX className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                <VolumeX className="h-4 w-4" />
              </div>
            )}
            <h3 className="text-sm font-bold text-white">
              {isBlock ? `Block @${targetUser.username}?` : `Mute @${targetUser.username}?`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          {targetUser.avatarUrl && (
            <div className="flex items-center gap-3 rounded-xl bg-zinc-950/60 p-2.5 border border-white/5">
              <img
                src={targetUser.avatarUrl}
                alt={targetUser.username}
                className="h-10 w-10 rounded-full object-cover border border-white/10"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {targetUser.displayName || targetUser.username}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">@{targetUser.username}</p>
              </div>
            </div>
          )}

          {isBlock ? (
            <div className="space-y-2 text-xs text-zinc-300">
              <p>When you block this user:</p>
              <ul className="space-y-1.5 pl-4 text-[11px] text-zinc-400 list-disc">
                <li>Their videos and comments will be hidden from your feed and search.</li>
                <li>They cannot follow you, comment on your videos, or message you.</li>
                <li>Existing follow connections will be removed.</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-2 text-xs text-zinc-300">
              <p>When you mute this user:</p>
              <ul className="space-y-1.5 pl-4 text-[11px] text-zinc-400 list-disc">
                <li>Their videos will no longer appear in your feed and recommendations.</li>
                <li>They will NOT be notified that they were muted.</li>
                <li>You can unmute them at any time in Privacy Settings.</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white shadow transition-all ${
              isBlock
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-amber-600 hover:bg-amber-500'
            } disabled:opacity-50`}
          >
            {loading ? 'Processing...' : isBlock ? 'Block User' : 'Mute User'}
          </button>
        </div>
      </div>
    </div>
  );
};
