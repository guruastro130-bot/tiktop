import React, { useState } from 'react';
import { X, Copy, Check, Share2, Send, MessageSquare, Twitter, Facebook, Flag, UserX, VolumeX, ShieldAlert } from 'lucide-react';
import { Video } from '../types';
import { useAuth } from '../context/AuthContext';

interface ShareModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  onShareCompleted?: () => void;
  onOpenReport?: () => void;
  onOpenCopyrightReport?: () => void;
  onBlockCreator?: (user: { id: string; username: string; displayName?: string; avatarUrl?: string }) => void;
  onMuteCreator?: (user: { id: string; username: string; displayName?: string; avatarUrl?: string }) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  video,
  isOpen,
  onClose,
  onShareCompleted,
  onOpenReport,
  onOpenCopyrightReport,
  onBlockCreator,
  onMuteCreator,
}) => {
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !video) return null;

  const isOwnVideo = currentUser && currentUser.id === video.userId;
  const shareUrl = `${window.location.origin}/video/${video.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onShareCompleted) onShareCompleted();
  };

  const handleSocialShare = (platform: string) => {
    const text = encodeURIComponent(`Watch this on TikTok: "${video.caption}"`);
    let url = '';
    if (platform === 'twitter') {
      url = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`;
    } else if (platform === 'facebook') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    } else if (platform === 'whatsapp') {
      url = `https://api.whatsapp.com/send?text=${text}%20${encodeURIComponent(shareUrl)}`;
    }
    if (url) {
      window.open(url, '_blank');
      if (onShareCompleted) onShareCompleted();
    }
  };

  return (
    <div
      id="share-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs"
    >
      <div
        id="share-modal-container"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 p-5 text-white shadow-2xl animate-slide-up"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-bold">Share Video</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Social Grid */}
        <div className="grid grid-cols-4 gap-3 py-4 text-center">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 border border-white/10 text-white group-hover:bg-zinc-700 transition-colors">
              {copied ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
            </div>
            <span className="text-[11px] text-zinc-300">{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialShare('whatsapp')}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white group-hover:bg-emerald-500 transition-colors">
              <Send className="h-5 w-5" />
            </div>
            <span className="text-[11px] text-zinc-300">WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialShare('twitter')}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white group-hover:bg-sky-400 transition-colors">
              <Twitter className="h-5 w-5" />
            </div>
            <span className="text-[11px] text-zinc-300">X / Twitter</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialShare('facebook')}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white group-hover:bg-blue-500 transition-colors">
              <Facebook className="h-5 w-5" />
            </div>
            <span className="text-[11px] text-zinc-300">Facebook</span>
          </button>
        </div>

        {/* Creator Controls & Safety Options */}
        <div className="mt-2 space-y-2 border-t border-white/10 pt-3">
          {!isOwnVideo && (
            <div className="grid grid-cols-2 gap-2">
              {onBlockCreator && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onBlockCreator(video.user);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 py-2 text-xs font-semibold text-rose-400 transition-colors cursor-pointer"
                >
                  <UserX className="h-3.5 w-3.5" />
                  <span>Block @{video.user.username}</span>
                </button>
              )}

              {onMuteCreator && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onMuteCreator(video.user);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 py-2 text-xs font-semibold text-amber-400 transition-colors cursor-pointer"
                >
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>Mute @{video.user.username}</span>
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {onOpenReport && (
              <button
                type="button"
                id="share-report-video-btn"
                onClick={() => {
                  onClose();
                  onOpenReport();
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 py-2 text-xs text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Flag className="h-3.5 w-3.5" />
                <span>Report Video</span>
              </button>
            )}

            {onOpenCopyrightReport && (
              <button
                type="button"
                id="share-copyright-video-btn"
                onClick={() => {
                  onClose();
                  onOpenCopyrightReport();
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 py-2 text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Copyright Claim</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
