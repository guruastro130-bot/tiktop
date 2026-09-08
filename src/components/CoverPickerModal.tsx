import React, { useState, useEffect } from 'react';
import { X, Check, Upload, RefreshCw, Sparkles } from 'lucide-react';
import { Video } from '../types';

interface CoverPickerModalProps {
  isOpen: boolean;
  video: Video | null;
  onClose: () => void;
  onSelectCover: (videoId: string, newCoverUrl: string) => void;
}

export const CoverPickerModal: React.FC<CoverPickerModalProps> = ({
  isOpen,
  video,
  onClose,
  onSelectCover,
}) => {
  const [frames, setFrames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCover, setSelectedCover] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !video) {
      setFrames([]);
      setIsLoading(false);
      return;
    }

    setSelectedCover(video.thumbnailUrl);
    setIsLoading(true);

    const vid = document.createElement('video');
    vid.crossOrigin = 'anonymous';
    vid.src = video.videoUrl;
    vid.muted = true;
    vid.playsInline = true;

    vid.onloadeddata = async () => {
      try {
        const dur = vid.duration && !isNaN(vid.duration) && vid.duration > 0 ? vid.duration : (video.duration || 10);
        const count = 8;
        const step = dur / (count + 1);
        const extracted: string[] = [];
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 854;
        const ctx = canvas.getContext('2d');

        for (let i = 1; i <= count; i++) {
          const targetTime = Math.min(dur - 0.2, Math.max(0.2, step * i));
          vid.currentTime = targetTime;
          await new Promise<void>(resolve => {
            const onSeek = () => {
              vid.removeEventListener('seeked', onSeek);
              if (ctx) {
                ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                try {
                  const uri = canvas.toDataURL('image/jpeg', 0.88);
                  extracted.push(uri);
                } catch {
                  // cross origin fallback
                }
              }
              resolve();
            };
            vid.addEventListener('seeked', onSeek);
            setTimeout(resolve, 400);
          });
        }

        if (extracted.length > 0) {
          setFrames(extracted);
        } else if (video.thumbnailUrl) {
          setFrames([video.thumbnailUrl]);
        }
      } catch {
        if (video.thumbnailUrl) setFrames([video.thumbnailUrl]);
      } finally {
        setIsLoading(false);
      }
    };

    vid.onerror = () => {
      if (video.thumbnailUrl) setFrames([video.thumbnailUrl]);
      setIsLoading(false);
    };

    return () => {
      vid.src = '';
    };
  }, [isOpen, video]);

  if (!isOpen || !video) return null;

  const handleFrameTap = (frame: string) => {
    setSelectedCover(frame);
    onSelectCover(video.id, frame);
    onClose();
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedCover(reader.result);
        onSelectCover(video.id, reader.result);
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Cover</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Frames Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400 space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin text-rose-500" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-[340px] overflow-y-auto no-scrollbar p-1">
            {frames.map((f, idx) => {
              const isCurrent = selectedCover === f;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleFrameTap(f)}
                  className={`group relative aspect-9/16 overflow-hidden rounded-xl border transition-all active:scale-95 cursor-pointer ${
                    isCurrent
                      ? 'border-rose-500 ring-2 ring-rose-500/70 scale-102'
                      : 'border-white/10 hover:border-white/40 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img
                    src={f}
                    alt={`Frame ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {isCurrent && (
                    <div className="absolute top-1 right-1 rounded-full bg-rose-500 p-0.5 text-white shadow">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}

            {/* Upload Custom Cover option */}
            <label className="group relative aspect-9/16 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-zinc-800/60 hover:bg-zinc-800 hover:border-rose-400 transition-all cursor-pointer active:scale-95">
              <Upload className="h-4 w-4 text-zinc-400 group-hover:text-rose-400 transition-colors" />
              <input
                type="file"
                accept="image/*"
                onChange={handleCustomImageUpload}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
