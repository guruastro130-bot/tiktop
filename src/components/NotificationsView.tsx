import React, { useState } from 'react';
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Sparkles,
  Check,
  CheckCheck,
  Reply,
  Trash2,
  Filter,
  ArrowRight,
  Clock,
  Eye
} from 'lucide-react';
import { NotificationItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

interface NotificationsViewProps {
  onSelectVideo?: (videoId: string, commentId?: string) => void;
  onSelectCreator?: (userId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onSelectVideo,
  onSelectCreator,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'likes' | 'comments' | 'followers'>('all');

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'likes') return n.type === 'like';
    if (filter === 'comments') return n.type === 'comment' || n.type === 'reply';
    if (filter === 'followers') return n.type === 'follow';
    return true;
  });

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />;
      case 'comment':
        return <MessageCircle className="h-3.5 w-3.5 fill-sky-400 text-sky-400" />;
      case 'reply':
        return <Reply className="h-3.5 w-3.5 text-amber-400" />;
      case 'follow':
        return <UserPlus className="h-3.5 w-3.5 text-emerald-400" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-purple-400" />;
    }
  };

  const getTypeBadgeLabel = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return 'Like';
      case 'comment':
        return 'Comment';
      case 'reply':
        return 'Reply';
      case 'follow':
        return 'Follow';
      default:
        return 'System';
    }
  };

  const formatNotificationTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    // 1. Mark as read immediately when user taps notification
    if (!n.read) {
      markAsRead(n.id);
    }

    // 2. Navigate to target destination
    if (n.type === 'follow') {
      if (onSelectCreator) {
        onSelectCreator(n.actorId);
      }
    } else if (n.videoId && onSelectVideo) {
      onSelectVideo(n.videoId, n.commentId);
    }
  };

  return (
    <div id="notifications-screen" className="h-full w-full bg-zinc-950 text-white overflow-y-auto pb-24 select-none">
      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-zinc-950 animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Notifications</h1>
              <p className="text-[11px] text-zinc-400">
                {currentUser ? (
                  unreadCount > 0 ? (
                    <span className="text-rose-400 font-semibold">{unreadCount} unread update{unreadCount === 1 ? '' : 's'}</span>
                  ) : (
                    'All caught up'
                  )
                ) : (
                  'Sign in to see activity'
                )}
              </p>
            </div>
          </div>

          {currentUser && unreadCount > 0 && (
            <button
              id="mark-all-read-btn"
              type="button"
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors active:scale-95"
            >
              <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        {currentUser && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'unread', label: unreadCount > 0 ? `Unread (${unreadCount})` : 'Unread' },
                { id: 'likes', label: 'Likes' },
                { id: 'comments', label: 'Comments' },
                { id: 'followers', label: 'Followers' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  filter === tab.id
                    ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                    : 'bg-zinc-900 text-zinc-400 border border-white/10 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* State Views */}
        {!currentUser ? (
          <div className="py-20 text-center space-y-4 bg-zinc-900/40 rounded-2xl border border-white/5 p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-zinc-500 border border-white/10">
              <Bell className="h-7 w-7 stroke-1" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-200">Log in to view your activity</p>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Track who likes your videos, leaves comments, replies to you, and follows your profile.
              </p>
            </div>
            <button
              id="login-notifications-prompt-btn"
              type="button"
              onClick={openAuthModal}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-rose-500 px-6 py-2.5 text-xs font-bold text-white hover:bg-rose-600 active:scale-95 transition-all shadow-lg shadow-rose-500/20"
            >
              <span>Log In or Sign Up</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : loading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            <span className="text-xs text-zinc-500 font-medium">Loading activity...</span>
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-zinc-900/30 rounded-2xl border border-white/5 p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/80 text-emerald-400 border border-emerald-500/20">
              <Check className="h-6 w-6 stroke-2" />
            </div>
            <p className="text-sm font-semibold text-zinc-300">All caught up!</p>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              {filter === 'unread'
                ? 'You have read all your notifications.'
                : 'No activity found in this category yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifs.map(n => {
              const isUnread = !n.read;

              return (
                <div
                  key={n.id}
                  id={`notification-item-${n.id}`}
                  onClick={() => handleNotificationClick(n)}
                  className={`group relative flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                    isUnread
                      ? 'bg-zinc-900/90 border-rose-500/30 hover:border-rose-500/50 hover:bg-zinc-850 shadow-sm'
                      : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/70'
                  }`}
                >
                  {/* Unread Indicator Bar / Dot */}
                  {isUnread && (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-rose-500" />
                  )}

                  {/* Left Side: Avatar + Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
                    {/* User Profile Picture with Type Badge */}
                    <div className="relative shrink-0">
                      <img
                        src={n.actor?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${n.actorId}`}
                        alt={n.actor?.username || 'User'}
                        className="h-11 w-11 rounded-full object-cover border border-white/10 shadow-xs"
                      />
                      <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 border border-white/15 shadow-sm">
                        {getIcon(n.type)}
                      </div>
                    </div>

                    {/* Notification Text and Meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs truncate ${isUnread ? 'font-bold text-white' : 'font-semibold text-zinc-200'}`}>
                          {n.actor?.displayName || `@${n.actor?.username}`}
                        </span>
                        <span className="inline-block rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400 border border-white/5 uppercase">
                          {getTypeBadgeLabel(n.type)}
                        </span>
                      </div>

                      {/* Short Message */}
                      <p className={`text-xs mt-0.5 line-clamp-2 leading-snug ${isUnread ? 'text-zinc-100 font-medium' : 'text-zinc-400'}`}>
                        {n.text}
                      </p>

                      {/* Time/Date & Read Status */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatNotificationTime(n.createdAt)}
                        </span>
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400">
                            • New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Media Preview or Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Video Thumbnail Preview */}
                    {n.videoThumbnail ? (
                      <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-800 group-hover:scale-105 transition-transform shadow-xs">
                        <img
                          src={n.videoThumbnail}
                          alt="Video thumbnail preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : n.type === 'follow' ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleNotificationClick(n);
                        }}
                        className="rounded-xl bg-zinc-800 hover:bg-rose-500 text-zinc-200 hover:text-white px-3 py-1 text-xs font-bold transition-colors border border-white/10"
                      >
                        Profile
                      </button>
                    ) : null}

                    {/* Mark as Read / Delete Action Menu */}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => markAsRead(n.id)}
                          title="Mark as read"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700 transition-colors border border-white/5"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteNotification(n.id)}
                        title="Delete notification"
                        className="opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-500 hover:text-rose-400 hover:bg-zinc-700 transition-all border border-white/5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
