import React from 'react';
import { Film, Radio, Headphones, X, Sparkles, Users, ChevronRight } from 'lucide-react';

export type CreateOptionType = 'video' | 'live' | 'voice_room';

interface CreateActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: CreateOptionType) => void;
}

export const CreateActionSheet: React.FC<CreateActionSheetProps> = ({
  isOpen,
  onClose,
  onSelectOption,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="create-action-sheet-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 select-none animate-fade-in"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[32px] sm:rounded-3xl border-t sm:border border-white/15 bg-zinc-950/95 p-5 text-white shadow-2xl backdrop-blur-2xl animate-slide-up space-y-4"
      >
        {/* Top Sheet Drag Handle (Mobile only) */}
        <div className="h-1.5 w-12 rounded-full bg-white/20 mx-auto -mt-1 mb-2 sm:hidden" />

        {/* Header with Title & Close Button */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-rose-500" />
              <span>सिर्जना गर्नुहोस् (Create & Go Live)</span>
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              तपाईं के सुरु गर्न चाहनुहुन्छ? तलको एउटा विकल्प छान्नुहोस्
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/10"
            title="रद्द (Close)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3 Pure, Clean, Beautiful Options */}
        <div className="space-y-2.5 py-1">
          {/* 1. Video Post (भिडियो पोस्ट) */}
          <button
            type="button"
            id="create-option-video-post"
            onClick={() => {
              onSelectOption('video');
              onClose();
            }}
            className="group w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-white/[0.07] to-white/[0.03] hover:from-rose-500/15 hover:to-pink-500/10 border border-white/10 hover:border-rose-500/40 transition-all duration-200 active:scale-[0.98] cursor-pointer text-left shadow-sm"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-transform">
                <Film className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-black text-rose-400 ring-1 ring-rose-500">
                  ★
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white group-hover:text-rose-300 transition-colors">
                    Video Post (भिडियो पोस्ट)
                  </span>
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] font-black text-rose-400 border border-rose-500/30 uppercase tracking-wider">
                    POST
                  </span>
                </div>
                <p className="text-[11.5px] text-zinc-400 mt-0.5 leading-snug truncate">
                  सर्ट भिडियो अपलोड, क्याप्सन, म्युजिक, इफेक्ट्स र ह्यासट्याग
                </p>
              </div>
            </div>
            <div className="flex items-center text-zinc-500 group-hover:text-rose-400 transition-colors pl-2 shrink-0">
              <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* 2. Face Live (फेस लाइभ) */}
          <button
            type="button"
            id="create-option-face-live"
            onClick={() => {
              onSelectOption('live');
              onClose();
            }}
            className="group w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-white/[0.07] to-white/[0.03] hover:from-red-500/15 hover:to-rose-500/10 border border-white/10 hover:border-red-500/40 transition-all duration-200 active:scale-[0.98] cursor-pointer text-left shadow-sm"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 text-white shadow-lg shadow-red-500/25 group-hover:scale-105 transition-transform">
                <Radio className="h-6 w-6 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white group-hover:text-red-300 transition-colors">
                    Face Live (फेस लाइभ)
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-black text-red-400 border border-red-500/30 uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>LIVE</span>
                  </span>
                </div>
                <p className="text-[11.5px] text-zinc-400 mt-0.5 leading-snug truncate">
                  क्यामेरा प्रत्यक्ष प्रसारण, फेस डिटेक्सन, ब्युटी फिल्टर र उपहार
                </p>
              </div>
            </div>
            <div className="flex items-center text-zinc-500 group-hover:text-red-400 transition-colors pl-2 shrink-0">
              <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* 3. Party Live (पार्टी लाइभ) */}
          <button
            type="button"
            id="create-option-party-live"
            onClick={() => {
              onSelectOption('voice_room');
              onClose();
            }}
            className="group w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-white/[0.07] to-white/[0.03] hover:from-purple-500/15 hover:to-pink-500/10 border border-white/10 hover:border-purple-500/40 transition-all duration-200 active:scale-[0.98] cursor-pointer text-left shadow-sm"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
                <Headphones className="h-6 w-6" />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-black text-purple-400 ring-1 ring-purple-500">
                  <Users className="h-2.5 w-2.5" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white group-hover:text-purple-300 transition-colors">
                    Party Live (पार्टी लाइभ)
                  </span>
                  <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-black text-purple-400 border border-purple-500/30 uppercase tracking-wider">
                    ४/६/९ सिट
                  </span>
                </div>
                <p className="text-[11.5px] text-zinc-400 mt-0.5 leading-snug truncate">
                  बहु-सिट भ्वाइस पार्टी रुम, अडियो इफेक्ट्स, ताली र रमाइलो
                </p>
              </div>
            </div>
            <div className="flex items-center text-zinc-500 group-hover:text-purple-400 transition-colors pl-2 shrink-0">
              <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>

        {/* Bottom Clean Cancel Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 py-3 text-xs font-bold text-zinc-300 hover:text-white transition-all active:scale-[0.99] cursor-pointer text-center"
          >
            बन्द गर्नुहोस् (Cancel)
          </button>
        </div>
      </div>
    </div>
  );
};
