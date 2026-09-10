import React, { useState } from 'react';
import { Radio, Mic, Video as VideoIcon, Users, Plus, Sparkles, Layers, Flame, RefreshCw } from 'lucide-react';
import { LiveRoom, LiveStreamType } from '../../types';
import { INITIAL_LIVE_ROOMS } from '../../data/liveData';
import { useAuth } from '../../context/AuthContext';

interface LiveDiscoveryViewProps {
  rooms: LiveRoom[];
  onSelectRoom: (room: LiveRoom) => void;
  onOpenGoLive: () => void;
  onDirectStartLive?: (type: 'video' | 'voice') => void;
}

export const LiveDiscoveryView: React.FC<LiveDiscoveryViewProps> = ({
  rooms,
  onSelectRoom,
  onOpenGoLive,
  onDirectStartLive,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const [filterType, setFilterType] = useState<'all' | 'voice' | 'video'>('all');

  const displayedRooms = rooms.filter(r => {
    if (filterType === 'voice') return r.type === 'voice';
    if (filterType === 'video') return r.type === 'video';
    return true;
  });

  return (
    <div className="relative h-full w-full bg-black text-white p-4 overflow-y-auto pb-24 font-sans select-none">
      
      {/* Header with Go Live CTA */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-1.5">
              <span>TikTok LIVE</span>
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                नेपाल 🇳🇵
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400">भिडियो र भ्वाइस लाइभ (४/६/९ सिट) स्ट्रिमहरू</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenGoLive}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-3.5 py-1.5 text-xs font-black text-white shadow-lg hover:from-rose-600 hover:to-pink-600 active:scale-95 transition-all cursor-pointer"
        >
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          <span>Go LIVE 🔴</span>
        </button>
      </div>

      {/* Prominent Go LIVE Action Card - User requested explicit Go Live option on Live tap */}
      <div className="relative my-3 overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/70 via-zinc-900 to-zinc-950 p-3.5 sm:p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                Go LIVE (लाइभ सुरु गर्ने विकल्प)
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white">
              तपाईं पनि दर्शकहरूसामु प्रत्यक्ष लाइभ आउनुहोस्
            </h2>
            <p className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
              भिडियो क्यामेरा वा भ्वाइस रुम (४/६/९ सिट) मार्फत प्रत्यक्ष प्रसारण गर्नुहोस् र लाइभ दर्शक काउन्ट तथा उपहार प्राप्त गर्नुहोस्।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onDirectStartLive) {
                  onDirectStartLive('video');
                } else {
                  onOpenGoLive();
                }
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-3.5 py-2 text-xs font-black text-white shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-rose-400/40"
              title="फेस लाइभ सुरु गर्नुहोस्"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>Face Live 🔴</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onDirectStartLive) {
                  onDirectStartLive('voice');
                } else {
                  onOpenGoLive();
                }
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-black text-white shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-purple-400/40"
              title="पार्टी लाइभ सुरु गर्नुहोस्"
            >
              <Mic className="h-3.5 w-3.5 text-amber-300" />
              <span>Party Live 🎉</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs (All / Voice Live (4/6/9 Seats) / Video Live) */}
      <div className="flex items-center gap-2 my-3 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'सबै लाइभ (All Live)', count: rooms.length },
          { id: 'voice', label: '🎙️ भ्वाइस लाइभ (४/६/९ सिट)', count: rooms.filter(r => r.type === 'voice').length },
          { id: 'video', label: '📹 भिडियो क्यामेरा लाइभ', count: rooms.filter(r => r.type === 'video').length },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id as any)}
            className={`rounded-full px-3.5 py-1.5 font-extrabold whitespace-nowrap transition-all ${
              filterType === tab.id
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Grid of Active Live Streams */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
        {displayedRooms.map(room => (
          <div
            key={room.id}
            onClick={() => onSelectRoom(room)}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 shadow-xl transition-all hover:border-rose-500/50 hover:shadow-rose-500/10 active:scale-[0.99] cursor-pointer"
          >
            {/* Cover / Preview Area */}
            <div className="relative h-44 w-full overflow-hidden bg-zinc-950">
              <img
                src={room.coverUrl}
                alt={room.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/50" />

              {/* Top Badges */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1 rounded-full bg-rose-600/90 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow backdrop-blur-xs">
                  <Radio className="h-3 w-3 animate-pulse" />
                  <span>{room.type === 'voice' ? `🎙️ भ्वाइस (${room.voiceSeatCount} सिट)` : '🔴 LIVE'}</span>
                </div>

                <div className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                  <Users className="h-3 w-3 text-rose-400" />
                  <span>{room.viewerCount}</span>
                </div>
              </div>

              {/* Voice Seat Indicator Preview */}
              {room.type === 'voice' && (
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                  <div className="flex items-center -space-x-1.5">
                    {(room.seats || [])
                      .filter(s => s.user)
                      .slice(0, 4)
                      .map((s, idx) => (
                        <img
                          key={idx}
                          src={s.user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={s.user?.displayName || 'User'}
                          className="h-6 w-6 rounded-full border border-zinc-900 object-cover"
                        />
                      ))}
                    {(room.seats || []).filter(s => s.user).length > 4 && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-bold text-white border border-zinc-900">
                        +{(room.seats || []).filter(s => s.user).length - 4}
                      </span>
                    )}
                  </div>

                  <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                    {room.voiceSeatCount || 6} Seats Available
                  </span>
                </div>
              )}
            </div>

            {/* Room Info Footer */}
            <div className="p-3 flex items-start gap-2.5">
              <img
                src={room.host?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt={room.host?.displayName || 'Host'}
                className="h-10 w-10 rounded-full object-cover border border-rose-500 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-extrabold text-white line-clamp-1 group-hover:text-rose-400 transition-colors">
                  {room.title}
                </h3>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                  @{room.host?.username || 'creator'} • {room.category}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                  <span className="text-amber-400 font-bold">✨ {room.diamondCount} Diamonds</span>
                  <span>•</span>
                  <span>❤️ {room.likesCount.toLocaleString()} Likes</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
