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
  Eye,
  MessageSquare,
  Gift,
  Coins,
  PlusCircle,
  Search
} from 'lucide-react';
import { NotificationItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { InboxChatModal } from './InboxChatModal';
import { CoinRechargeModal } from './CoinRechargeModal';

interface NotificationsViewProps {
  onSelectVideo?: (videoId: string, commentId?: string) => void;
  onSelectCreator?: (userId: string) => void;
}

interface ConversationItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

const INITIAL_CONVERSATIONS: ConversationItem[] = [
  {
    id: 'user_sarah',
    username: 'sarah_dance',
    displayName: 'Sarah Jenkins ✨',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    lastMessage: 'हजुरको नयाँ भिडियो ज्यादै मन पर्यो! सधैं अगाडि बढ्नुहोस् 💃',
    time: '2m ago',
    unread: 1,
    online: true,
  },
  {
    id: 'user_aarav',
    username: 'aarav_vlogs',
    displayName: 'Aarav Sharma 🇳🇵',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    lastMessage: 'भोलि लाइभ बसौँ है ब्रो! उपहार र पीके ब्याटल गरौँ ⚔️',
    time: '15m ago',
    unread: 0,
    online: true,
  },
  {
    id: 'user_pooja',
    username: 'pooja_singh',
    displayName: 'Pooja Thapa 🎤',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    lastMessage: 'लाइभमा उपहार पठाउनुभएकोमा मुरी मुरी धन्यवाद! 🌹🥰',
    time: '1h ago',
    unread: 0,
    online: false,
  },
  {
    id: 'user_alex',
    username: 'alex_comedy',
    displayName: 'Alex Rivers 😂',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    lastMessage: 'Haha त्यो कमेडी भिडियो ओपी थियो ब्रो! 🚀',
    time: 'Yesterday',
    unread: 0,
    online: false,
  },
];

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

  // Top Tab toggle: Direct Messages (SMS) vs Activity (Alerts)
  const [activeMainTab, setActiveMainTab] = useState<'messages' | 'activity'>('messages');
  const [filter, setFilter] = useState<'all' | 'unread' | 'likes' | 'comments' | 'followers'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inbox Chat Modal state
  const [selectedRecipient, setSelectedRecipient] = useState<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);

  const coinBalance = currentUser?.coinBalance ?? 5000;

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'likes') return n.type === 'like';
    if (filter === 'comments') return n.type === 'comment' || n.type === 'reply';
    if (filter === 'followers') return n.type === 'follow';
    return true;
  });

  const filteredConversations = INITIAL_CONVERSATIONS.filter(c =>
    c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    if (!n.read) {
      markAsRead(n.id);
    }
    if (n.type === 'follow') {
      if (onSelectCreator) {
        onSelectCreator(n.actorId);
      }
    } else if (n.videoId && onSelectVideo) {
      onSelectVideo(n.videoId, n.commentId);
    }
  };

  const handleOpenChat = (user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  }) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    setSelectedRecipient(user);
    setIsChatOpen(true);
  };

  return (
    <div id="notifications-screen" className="h-full w-full bg-zinc-950 text-white overflow-y-auto pb-24 select-none">
      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        
        {/* Main Header with Real-time Coin Balance Display and Recharge CTA */}
        <div className="flex flex-col gap-3 border-b border-white/10 pb-3">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <MessageSquare className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-zinc-950 animate-pulse" />
                )}
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight">
                  इनबक्स र सन्देश (Inbox)
                </h1>
                <p className="text-[10px] text-zinc-400">
                  प्रत्यक्ष कुराकानी र उपहार आदानप्रदान
                </p>
              </div>
            </div>

            {/* Recharged Coin Display (Poppo / TikTok Style) */}
            {currentUser && (
              <div className="flex items-center gap-1.5">
                <div
                  onClick={() => setIsRechargeModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-amber-500/40 px-3 py-1 text-xs font-mono font-bold text-amber-300 shadow-sm cursor-pointer hover:border-amber-400 transition-colors"
                  title="रिचार्ज गरिएको कोइन ब्यालेन्स"
                >
                  <Coins className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                  <span>{coinBalance.toLocaleString()} Coins</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRechargeModalOpen(true)}
                  className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-2.5 py-1 text-xs font-black shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  title="कोइन किन्नुहोस्"
                >
                  <PlusCircle className="h-3 w-3 stroke-[2.5]" />
                  <span>रिचार्ज</span>
                </button>
              </div>
            )}
          </div>

          {/* Tab Switcher: Direct SMS / Messages vs Notifications / Activity */}
          <div className="flex rounded-xl bg-zinc-900 p-1 border border-white/5">
            <button
              type="button"
              onClick={() => setActiveMainTab('messages')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'messages'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>प्रत्यक्ष सन्देश (SMS Messages)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('activity')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'activity'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>गतिविधि (Activity)</span>
              {unreadCount > 0 && (
                <span className="h-4 min-w-4 px-1 rounded-full bg-white text-rose-600 text-[10px] font-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* -------------------- TAB 1: SMS / DIRECT MESSAGES -------------------- */}
        {activeMainTab === 'messages' && (
          <div className="space-y-3">
            
            {/* Search Filter */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="साथीहरू खोज्नुहोस् वा नयाँ उपहार पठाउनुहोस्..."
                className="w-full rounded-xl bg-zinc-900 border border-white/10 pl-9 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            {/* Hint Banner: In-Chat Gifting */}
            <div className="rounded-2xl bg-gradient-to-r from-rose-500/15 via-pink-500/10 to-amber-500/15 border border-rose-500/25 p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                <div>
                  <h4 className="text-xs font-extrabold text-white">
                    इनबक्स उपहार प्रणाली (Inbox SMS Gifting)
                  </h4>
                  <p className="text-[10px] text-zinc-300">
                    कुनै पनि प्रयोगकर्तालाई व्यक्तिगत सन्देश खोल्दै सीधै उपहार पठाउनुहोस्!
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[9px] font-mono text-amber-300 font-bold bg-zinc-900/90 px-2 py-0.5 rounded-full border border-amber-500/30">
                  🪙 {coinBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Conversations List */}
            <div className="space-y-2">
              {filteredConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => handleOpenChat(conv)}
                  className="group relative flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-rose-500/40 hover:bg-zinc-850 transition-all cursor-pointer shadow-sm"
                >
                  {/* Avatar with Online Indicator */}
                  <div className="relative shrink-0">
                    <img
                      src={conv.avatarUrl}
                      alt={conv.displayName}
                      className="h-12 w-12 rounded-full object-cover border border-white/10"
                    />
                    {conv.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                    )}
                  </div>

                  {/* Name & Last Message */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-xs font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                        {conv.displayName}
                      </h3>
                      <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                        {conv.time}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">
                      {conv.lastMessage}
                    </p>
                  </div>

                  {/* Action Buttons: Direct Gift Button & Chat Indicator */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenChat(conv)}
                      className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white px-2.5 py-1.5 text-xs font-black shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-rose-400/40"
                      title="उपहार पठाउनुहोस् (Send Gift)"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">उपहार</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* -------------------- TAB 2: ACTIVITY & NOTIFICATIONS -------------------- */}
        {activeMainTab === 'activity' && (
          <div className="space-y-3">
            {/* Filter Tabs */}
            {currentUser && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {(
                  [
                    { id: 'all', label: 'सबै (All)' },
                    { id: 'unread', label: unreadCount > 0 ? `नपढिएका (${unreadCount})` : 'नपढिएका' },
                    { id: 'likes', label: 'लाइक (Likes)' },
                    { id: 'comments', label: 'कमेन्ट (Comments)' },
                    { id: 'followers', label: 'फलोअर (Followers)' },
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
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
                  <p className="text-sm font-bold text-zinc-200">गतिविधि हेर्न लग इन गर्नुहोस्</p>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                    भिडियो लाइक, कमेन्ट, फलो र सन्देश सूचनाहरू हेर्नुहोस्।
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
                <span className="text-xs text-zinc-500 font-medium">लोड हुँदैछ...</span>
              </div>
            ) : filteredNotifs.length === 0 ? (
              <div className="py-20 text-center space-y-3 bg-zinc-900/30 rounded-2xl border border-white/5 p-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/80 text-emerald-400 border border-emerald-500/20">
                  <Check className="h-6 w-6 stroke-2" />
                </div>
                <p className="text-sm font-semibold text-zinc-300">सबै अपडेटहरू पढिसकियो!</p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  {filter === 'unread'
                    ? 'कुनै नयाँ सूचना बाँकी छैन।'
                    : 'यस विधामा कुनै सूचना फेला परेन।'}
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
                      {/* Unread Indicator Bar */}
                      {isUnread && (
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-rose-500" />
                      )}

                      {/* Left Side: Avatar + Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
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

                          <p className={`text-xs mt-0.5 line-clamp-2 leading-snug ${isUnread ? 'text-zinc-100 font-medium' : 'text-zinc-400'}`}>
                            {n.text}
                          </p>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
                              <Clock className="h-2.5 w-2.5" />
                              {formatNotificationTime(n.createdAt)}
                            </span>
                            {isUnread && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400">
                                • नयाँ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Quick Gift Button + Media Preview */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quick Gift Trigger for any actor */}
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenChat({
                              id: n.actorId,
                              username: n.actor?.username || 'user',
                              displayName: n.actor?.displayName || 'User',
                              avatarUrl: n.actor?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${n.actorId}`,
                            });
                          }}
                          className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/30 text-rose-400 hover:text-white hover:bg-rose-500 px-2 py-1 text-xs font-bold transition-all shadow-xs cursor-pointer"
                          title="यस प्रयोगकर्तालाई उपहार पठाउनुहोस्"
                        >
                          <Gift className="h-3.5 w-3.5" />
                          <span className="text-[10px]">उपहार</span>
                        </button>

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
                            className="rounded-xl bg-zinc-800 hover:bg-rose-500 text-zinc-200 hover:text-white px-2.5 py-1 text-xs font-bold transition-colors border border-white/10"
                          >
                            Profile
                          </button>
                        ) : null}

                        {/* Mark as Read / Delete */}
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
        )}

      </div>

      {/* Direct Messaging SMS Modal with Gifting & Real-time Coin Counter */}
      <InboxChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        recipient={selectedRecipient}
      />

      {/* Coin Recharge Modal */}
      <CoinRechargeModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
      />
    </div>
  );
};
