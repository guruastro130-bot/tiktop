import React, { useState } from 'react';
import { Mic, MicOff, Plus, Check, Lock, Crown, LogOut, ShieldAlert, X, Gift } from 'lucide-react';
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
  onGiftSeatUser?: (seatIndex: number, user?: any) => void;
  onLuckyGiftSeatUser?: (seatIndex: number, user?: any) => void;
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
  onGiftSeatUser,
  onLuckyGiftSeatUser,
}) => {
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);
  const [followedSeatUserIds, setFollowedSeatUserIds] = useState<Set<string>>(new Set());

  const handleToggleFollowSeatUser = (userId: string) => {
    setFollowedSeatUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const safeSeats = Array.isArray(seats) ? seats : [];
  const normalizedSeats: LiveSeat[] = Array.from({ length: seatCount }, (_, idx) => {
    const existing = safeSeats.find(s => s.seatIndex === idx);
    return existing || { seatIndex: idx, isLocked: false };
  });

  const getGridConfig = () => {
    switch (seatCount) {
      case 4:
        return {
          gridClass: 'grid-cols-2 gap-y-6 gap-x-8 max-w-[240px]',
          avatarClass: 'h-16 w-16',
        };
      case 6:
        return {
          gridClass: 'grid-cols-3 gap-y-5 gap-x-6 max-w-[310px]',
          avatarClass: 'h-14 w-14',
        };
      case 9:
      default:
        return {
          gridClass: 'grid-cols-3 gap-y-3.5 gap-x-4 max-w-[330px]',
          avatarClass: 'h-12 w-12',
        };
    }
  };

  const { gridClass, avatarClass } = getGridConfig();
  const activeSeatAction = selectedSeatIndex !== null ? normalizedSeats[selectedSeatIndex] : null;

  return (
    <div className="relative w-full flex flex-col items-center justify-center px-4 py-2 select-none">
      
      {/* Sleek Segmented Pill for Seat Layout (Host only) */}
      {isHost && onChangeSeatLayout && (
        <div className="mb-3 flex justify-center w-full">
          <div className="inline-flex items-center rounded-full bg-black/50 border border-white/10 p-0.5 backdrop-blur-md shadow-sm">
            {([4, 6, 9] as VoiceSeatCount[]).map(count => (
              <button
                key={count}
                type="button"
                onClick={() => onChangeSeatLayout(count)}
                className={`rounded-full px-3 py-0.5 text-[10.5px] font-semibold transition-all active:scale-95 cursor-pointer ${
                  seatCount === count
                    ? 'bg-rose-500 text-white font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {count} Seats
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Spacious Party Seat Grid */}
      <div className={`grid w-full mx-auto ${gridClass} transition-all duration-300`}>
        {normalizedSeats.map((seat, index) => {
          const isSeatHost = index === 0;
          const isOccupied = Boolean(seat.user);
          const isCurrentUserHere = currentUser && seat.user?.id === currentUser.id;

          return (
            <div
              key={index}
              className="relative flex flex-col items-center justify-center text-center group"
            >
              {/* Seat Circle Container */}
              <div className="relative flex items-center justify-center">
                {isOccupied ? (
                  <div
                    onClick={() => setSelectedSeatIndex(index)}
                    className="relative cursor-pointer group"
                    title={`${seat.user?.displayName || 'User'}`}
                  >
                    {/* Speaking Soundwave Pulse */}
                    {seat.isSpeaking && (
                      <span className="absolute -inset-1 rounded-full border border-emerald-400/70 animate-ping pointer-events-none" />
                    )}

                    {/* Avatar Image */}
                    <img
                      src={seat.user?.avatarUrl}
                      alt={seat.user?.displayName || 'User'}
                      className={`${avatarClass} rounded-full object-cover transition-transform duration-200 group-hover:scale-105 ${
                        isSeatHost
                          ? 'ring-2 ring-amber-400/80 ring-offset-2 ring-offset-zinc-950'
                          : seat.isSpeaking
                          ? 'ring-2 ring-emerald-400/90 ring-offset-2 ring-offset-zinc-950'
                          : 'border border-white/15'
                      }`}
                    />

                    {/* Host Crown Badge */}
                    {isSeatHost && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 p-0.5 shadow">
                        <Crown className="h-2.5 w-2.5 text-black stroke-[3]" />
                      </div>
                    )}

                    {/* Quick Gift Trigger Button */}
                    {!isCurrentUserHere && onGiftSeatUser && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (seat.user) onGiftSeatUser(index, seat.user);
                        }}
                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
                        title="उपहार दिनुहोस्"
                      >
                        <Gift className="h-2 w-2" />
                      </button>
                    )}

                    {/* Follow (+) Button */}
                    {!isCurrentUserHere && seat.user && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFollowSeatUser(seat.user?.id || `user_${index}`);
                        }}
                        className={`absolute -bottom-0.5 -left-0.5 flex h-4 w-4 items-center justify-center rounded-full shadow transition-all active:scale-90 cursor-pointer border border-zinc-950 z-10 ${
                          followedSeatUserIds.has(seat.user?.id || `user_${index}`)
                            ? 'bg-emerald-500 text-white'
                            : 'bg-rose-500 hover:bg-rose-600 text-white'
                        }`}
                        title="Follow"
                      >
                        {followedSeatUserIds.has(seat.user?.id || `user_${index}`) ? (
                          <Check className="h-2 w-2 stroke-[3]" />
                        ) : (
                          <Plus className="h-2 w-2 stroke-[3]" />
                        )}
                      </button>
                    )}

                    {/* Mic Status Icon */}
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full shadow text-white z-10 ${
                        seat.isMuted
                          ? 'bg-rose-600'
                          : seat.isSpeaking
                          ? 'bg-emerald-500'
                          : 'bg-black/60 border border-white/20'
                      }`}
                    >
                      {seat.isMuted ? (
                        <MicOff className="h-2 w-2" />
                      ) : (
                        <Mic className="h-2 w-2" />
                      )}
                    </div>
                  </div>
                ) : seat.isLocked ? (
                  /* Locked Seat */
                  <div
                    onClick={() => isHost && setSelectedSeatIndex(index)}
                    className={`${avatarClass} rounded-full border border-dashed border-zinc-700 bg-white/[0.02] flex items-center justify-center text-zinc-600 cursor-pointer`}
                  >
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                ) : (
                  /* Open Empty Seat */
                  <button
                    type="button"
                    onClick={() => onTakeSeat(index)}
                    className={`${avatarClass} rounded-full border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/40 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 cursor-pointer group`}
                    title={`Take Seat ${index + 1}`}
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.5] group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </div>

              {/* Name & Seat Label with Negative Space */}
              <div className="mt-1.5 w-full flex flex-col items-center">
                {isOccupied ? (
                  <>
                    <p className="text-[11px] font-medium text-zinc-200 truncate max-w-[75px] leading-tight">
                      {isCurrentUserHere ? 'म (You)' : seat.user?.displayName || seat.user?.username}
                    </p>
                    <span className="text-[9.5px] text-zinc-500 font-mono leading-tight">
                      {isSeatHost ? '👑 Host' : `Seat ${index + 1}`}
                    </span>
                  </>
                ) : (
                  <p className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors font-mono">
                    {seat.isLocked ? 'Locked' : `Seat ${index + 1}`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Poppo-Style Seat Action Floating Bottom Sheet / Modal */}
      {selectedSeatIndex !== null && activeSeatAction && (
        <div
          onClick={() => setSelectedSeatIndex(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-[28px] sm:rounded-3xl border-t sm:border border-white/10 bg-zinc-950/90 p-4 text-white shadow-2xl space-y-3 backdrop-blur-2xl"
          >
            {/* Sheet Handle */}
            <div className="h-1 w-10 rounded-full bg-white/20 mx-auto -mt-1 mb-2 sm:hidden" />

            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              {activeSeatAction.user ? (
                <img
                  src={activeSeatAction.user.avatarUrl}
                  alt={activeSeatAction.user.displayName}
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-white/10"
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-white/5 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-zinc-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  {activeSeatAction.user?.displayName || `Seat ${selectedSeatIndex + 1}`}
                </h4>
                <p className="text-xs text-zinc-400">
                  {selectedSeatIndex === 0 ? '👑 Room Host' : `Seat Position #${selectedSeatIndex + 1}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSeatIndex(null)}
                className="rounded-full bg-white/5 p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Gift Actions for Seated User (Standard & Lucky) */}
            {activeSeatAction.user && onGiftSeatUser && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onGiftSeatUser(selectedSeatIndex, activeSeatAction.user!);
                    setSelectedSeatIndex(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 py-2.5 text-xs font-bold text-white shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Gift className="h-4 w-4" />
                  <span>🎁 {activeSeatAction.user.displayName} लाई उपहार दिनुहोस्</span>
                </button>

                {onLuckyGiftSeatUser && (
                  <button
                    type="button"
                    onClick={() => {
                      onLuckyGiftSeatUser(selectedSeatIndex, activeSeatAction.user!);
                      setSelectedSeatIndex(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 py-2.5 text-xs font-black text-white shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-amber-300/60 shadow-amber-500/20"
                  >
                    <span>🎰</span>
                    <span>लक्की उपहार पठाउनुहोस् (क्यासब्याक सम्भावना)</span>
                  </button>
                )}
              </div>
            )}

            {/* Actions for current seated user */}
            {currentUser && activeSeatAction.user?.id === currentUser.id && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onToggleSeatMute(selectedSeatIndex);
                    setSelectedSeatIndex(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  {activeSeatAction.isMuted ? <Mic className="h-4 w-4 text-emerald-400" /> : <MicOff className="h-4 w-4 text-rose-400" />}
                  <span>{activeSeatAction.isMuted ? 'माइक अनम्यूट गर्नुहोस्' : 'माइक म्युट गर्नुहोस्'}</span>
                </button>

                {selectedSeatIndex !== 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onLeaveSeat(selectedSeatIndex);
                      setSelectedSeatIndex(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
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
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 transition-colors"
                  >
                    <MicOff className="h-4 w-4 text-amber-400" />
                    <span>{activeSeatAction.isMuted ? 'अतिथि अनम्यूट' : 'अतिथि म्युट'}</span>
                  </button>
                )}

                {onHostKickGuest && (
                  <button
                    type="button"
                    onClick={() => {
                      onHostKickGuest(selectedSeatIndex);
                      setSelectedSeatIndex(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose-500/15 border border-rose-500/30 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 transition-colors"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>सिटबाट हटाउनुहोस्</span>
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
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 transition-colors"
              >
                <Lock className="h-4 w-4 text-amber-400" />
                <span>{activeSeatAction.isLocked ? 'सिट अनलक गर्नुहोस्' : 'सिट लक गर्नुहोस्'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedSeatIndex(null)}
              className="w-full rounded-2xl bg-white/5 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              बन्द गर्नुहोस् (Close)
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
