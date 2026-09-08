import React, { useState } from 'react';
import { Mic, MicOff, Plus, Lock, Crown, MoreVertical, LogOut, Volume2, ShieldAlert, Clock, X } from 'lucide-react';
import { LiveSeat, VoiceSeatCount, User } from '../../types';

interface VoiceSeatGridProps {
  seatCount: VoiceSeatCount; // 4, 6, or 9
  seats: LiveSeat[];
  currentUser: User | null;
  isHost: boolean;
  onTakeSeat: (seatIndex: number) => void;
  onLeaveSeat: (seatIndex: number) => void;
  onToggleSeatMute: (seatIndex: number) => void;
  onHostMuteGuest?: (seatIndex: number) => void;
  onHostKickGuest?: (seatIndex: number) => void;
  onHostLockSeat?: (seatIndex: number) => void;
  onChangeSeatLayout?: (newCount: VoiceSeatCount) => void;
  onDirectEndPartyLive?: () => void;
  liveDurationText?: string;
}

export const VoiceSeatGrid: React.FC<VoiceSeatGridProps> = ({
  seatCount,
  seats,
  currentUser,
  isHost,
  onTakeSeat,
  onLeaveSeat,
  onToggleSeatMute,
  onHostMuteGuest,
  onHostKickGuest,
  onHostLockSeat,
  onChangeSeatLayout,
  onDirectEndPartyLive,
  liveDurationText,
}) => {
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);

  // Normalize seats array to match the requested seatCount (4, 6, or 9)
  const normalizedSeats: LiveSeat[] = Array.from({ length: seatCount }, (_, idx) => {
    const existing = seats.find(s => s.seatIndex === idx);
    return existing || { seatIndex: idx, isLocked: false };
  });

  const getGridColsClass = () => {
    switch (seatCount) {
      case 4:
        return 'grid-cols-2 gap-4 max-w-xs';
      case 6:
        return 'grid-cols-3 gap-2.5 max-w-sm';
      case 9:
        return 'grid-cols-3 gap-2 max-w-sm';
      default:
        return 'grid-cols-3 gap-2.5 max-w-sm';
    }
  };

  const getAvatarSizeClass = () => {
    switch (seatCount) {
      case 4:
        return 'h-18 w-18 text-base';
      case 6:
        return 'h-14 w-14 text-sm';
      case 9:
        return 'h-12 w-12 text-xs';
    }
  };

  const activeSeatAction = selectedSeatIndex !== null ? normalizedSeats[selectedSeatIndex] : null;

  return (
    <div className="relative w-full flex flex-col items-center justify-center p-3 select-none">
      
      {/* Host Layout Selector & Direct Cross End Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {isHost && onChangeSeatLayout && (
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1 backdrop-blur-md">
            <span className="text-[10px] font-bold text-zinc-400">सिट सङ्ख्या:</span>
            {([4, 6, 9] as VoiceSeatCount[]).map(count => (
              <button
                key={count}
                type="button"
                onClick={() => onChangeSeatLayout(count)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold transition-all active:scale-95 ${
                  seatCount === count
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {count} Seats
              </button>
            ))}
          </div>
        )}

        {/* Live Duration Clock for Party Live */}
        {liveDurationText && (
          <div className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-black/70 px-2.5 py-1 text-xs font-mono font-bold text-white shadow">
            <Clock className="h-3 w-3 text-rose-400 animate-pulse" />
            <span className="text-zinc-300 text-[10px]">पार्टी:</span>
            <span>{liveDurationText}</span>
          </div>
        )}

        {/* Direct End Party Live Cross Button */}
        {isHost && onDirectEndPartyLive && (
          <button
            type="button"
            onClick={onDirectEndPartyLive}
            className="flex items-center gap-1 rounded-full bg-red-600 hover:bg-red-500 px-3 py-1 text-[11px] font-black text-white shadow-lg active:scale-95 transition-all border border-red-400"
            title="पार्टी लाइभ अन्त्य गर्नुहोस् (End Party LIVE ✕)"
          >
            <X className="h-3.5 w-3.5 stroke-[3]" />
            <span>Party End ✕</span>
          </button>
        )}
      </div>

      {/* Dynamic Grid Seats Container */}
      <div className={`grid w-full mx-auto ${getGridColsClass()} transition-all duration-300`}>
        {normalizedSeats.map((seat, index) => {
          const isSeatHost = index === 0;
          const isOccupied = Boolean(seat.user);
          const isCurrentUserHere = currentUser && seat.user?.id === currentUser.id;

          return (
            <div
              key={index}
              className="relative flex flex-col items-center justify-center text-center p-1.5 group"
            >
              {/* Seat Circle Area */}
              <div className="relative flex items-center justify-center">
                {isOccupied ? (
                  <div
                    onClick={() => {
                      if (isCurrentUserHere || isHost) {
                        setSelectedSeatIndex(index);
                      }
                    }}
                    className="relative cursor-pointer"
                  >
                    {/* Active Voice Speaking Ripple Wave */}
                    {seat.isSpeaking && (
                      <span className="absolute -inset-2 rounded-full border-2 border-emerald-400/80 animate-ping pointer-events-none" />
                    )}
                    {seat.isSpeaking && (
                      <span className="absolute -inset-1 rounded-full bg-emerald-500/20 pointer-events-none" />
                    )}

                    {/* Avatar Image */}
                    <img
                      src={seat.user?.avatarUrl}
                      alt={seat.user?.displayName || 'User'}
                      className={`${getAvatarSizeClass()} rounded-full object-cover border-2 shadow-lg transition-transform group-hover:scale-105 ${
                        isSeatHost
                          ? 'border-amber-400 ring-2 ring-amber-400/30'
                          : seat.isSpeaking
                          ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                          : 'border-white/20'
                      }`}
                    />

                    {/* Host Crown Badge */}
                    {isSeatHost && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 p-0.5 shadow-md">
                        <Crown className="h-3 w-3 text-black stroke-[3]" />
                      </div>
                    )}

                    {/* Mic Status Icon Badge */}
                    <div
                      className={`absolute -bottom-1 -right-1 rounded-full p-1 shadow-md text-white ${
                        seat.isMuted
                          ? 'bg-rose-600'
                          : seat.isSpeaking
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-zinc-800 border border-white/20'
                      }`}
                    >
                      {seat.isMuted ? (
                        <MicOff className="h-2.5 w-2.5" />
                      ) : (
                        <Mic className="h-2.5 w-2.5" />
                      )}
                    </div>
                  </div>
                ) : seat.isLocked ? (
                  /* Locked Seat */
                  <div
                    onClick={() => isHost && setSelectedSeatIndex(index)}
                    className={`${getAvatarSizeClass()} rounded-full border-2 border-dashed border-zinc-700 bg-zinc-900/60 flex flex-col items-center justify-center text-zinc-500 shadow cursor-pointer`}
                  >
                    <Lock className="h-4 w-4 text-zinc-500" />
                  </div>
                ) : (
                  /* Open / Empty Seat Button */
                  <button
                    type="button"
                    onClick={() => onTakeSeat(index)}
                    className={`${getAvatarSizeClass()} rounded-full border-2 border-dashed border-white/25 bg-black/40 hover:bg-rose-500/20 hover:border-rose-400 flex flex-col items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 shadow group cursor-pointer`}
                    title={`Take Seat ${index + 1}`}
                  >
                    <Plus className="h-4 w-4 stroke-[3] group-hover:scale-125 transition-transform" />
                  </button>
                )}
              </div>

              {/* Name & Seat Tag */}
              <div className="mt-1 w-full flex flex-col items-center">
                {isOccupied ? (
                  <>
                    <p className="text-[11px] font-bold text-white truncate max-w-[85px]">
                      {isCurrentUserHere ? 'म (You)' : seat.user?.displayName || seat.user?.username}
                    </p>
                    <span className="text-[9px] font-medium text-zinc-400">
                      {isSeatHost ? '👑 Host' : `सिट ${index + 1}`}
                    </span>
                  </>
                ) : (
                  <p className="text-[10px] font-bold text-zinc-400 group-hover:text-rose-400 transition-colors">
                    {seat.isLocked ? 'सिट बन्द' : `सिट ${index + 1}`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seat Management Drawer / Popover for Seated User or Host */}
      {selectedSeatIndex !== null && activeSeatAction && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xs rounded-2xl border border-white/15 bg-zinc-900 p-4 text-white shadow-2xl space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-white/10">
              {activeSeatAction.user ? (
                <img
                  src={activeSeatAction.user.avatarUrl}
                  alt={activeSeatAction.user.displayName}
                  className="h-10 w-10 rounded-full object-cover border border-rose-500"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-zinc-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white truncate">
                  {activeSeatAction.user?.displayName || `Seat ${selectedSeatIndex + 1}`}
                </h4>
                <p className="text-[10px] text-zinc-400">
                  {selectedSeatIndex === 0 ? '👑 Room Host' : `Seat Position #${selectedSeatIndex + 1}`}
                </p>
              </div>
            </div>

            {/* Actions for current seated user */}
            {currentUser && activeSeatAction.user?.id === currentUser.id && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onToggleSeatMute(selectedSeatIndex);
                    setSelectedSeatIndex(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 p-2.5 text-xs font-bold text-white hover:bg-zinc-700 transition-colors"
                >
                  {activeSeatAction.isMuted ? <Mic className="h-4 w-4 text-emerald-400" /> : <MicOff className="h-4 w-4 text-rose-400" />}
                  <span>{activeSeatAction.isMuted ? 'माइक अनम्यूट गर्नुहोस् (Unmute Mic)' : 'माइक म्युट गर्नुहोस् (Mute Mic)'}</span>
                </button>

                {selectedSeatIndex !== 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onLeaveSeat(selectedSeatIndex);
                      setSelectedSeatIndex(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/40 p-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>सिट छोड्नुहोस् (Leave Seat)</span>
                  </button>
                )}
              </div>
            )}

            {/* Host Administration Actions */}
            {isHost && activeSeatAction.user && activeSeatAction.user.id !== currentUser?.id && (
              <div className="space-y-2">
                {onHostMuteGuest && (
                  <button
                    type="button"
                    onClick={() => {
                      onHostMuteGuest(selectedSeatIndex);
                      setSelectedSeatIndex(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 p-2.5 text-xs font-bold text-white hover:bg-zinc-700 transition-colors"
                  >
                    <MicOff className="h-4 w-4 text-amber-400" />
                    <span>{activeSeatAction.isMuted ? 'अतिथि अनम्यूट (Unmute Guest)' : 'अतिथि म्युट (Mute Guest)'}</span>
                  </button>
                )}

                {onHostKickGuest && (
                  <button
                    type="button"
                    onClick={() => {
                      onHostKickGuest(selectedSeatIndex);
                      setSelectedSeatIndex(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600/80 p-2.5 text-xs font-bold text-white hover:bg-rose-600 transition-colors"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>सिटबाट हटाउनुहोस् (Kick from Seat)</span>
                  </button>
                )}
              </div>
            )}

            {/* Host Lock Seat Action */}
            {isHost && !activeSeatAction.user && onHostLockSeat && (
              <button
                type="button"
                onClick={() => {
                  onHostLockSeat(selectedSeatIndex);
                  setSelectedSeatIndex(null);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 p-2.5 text-xs font-bold text-white hover:bg-zinc-700 transition-colors"
              >
                <Lock className="h-4 w-4 text-amber-400" />
                <span>{activeSeatAction.isLocked ? 'सिट अनलक गर्नुहोस् (Unlock Seat)' : 'सिट लक गर्नुहोस् (Lock Seat)'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedSeatIndex(null)}
              className="w-full rounded-xl bg-zinc-800/60 p-2 text-xs font-bold text-zinc-400 hover:text-white"
            >
              बन्द गर्नुहोस् (Close)
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
