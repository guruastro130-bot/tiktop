import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Check,
  Sparkles,
  Image as ImageIcon,
  Link as LinkIcon,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { PRESET_AVATARS, compressAvatarImage } from '../utils/mediaStore';

interface AvatarPickerModalProps {
  isOpen: boolean;
  currentAvatarUrl: string;
  onClose: () => void;
  onSaveAvatar: (newAvatarUrl: string) => Promise<void> | void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  currentAvatarUrl,
  onClose,
  onSaveAvatar,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatarUrl);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'presets' | 'url'>('upload');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    if (!file.type.startsWith('image/')) {
      setErrorMessage('कृपया मान्य फोटो फाइल (JPG, PNG, WebP) छान्नुहोस्।');
      return;
    }

    try {
      setIsProcessing(true);
      const compressedDataUrl = await compressAvatarImage(file, 450);
      setSelectedAvatar(compressedDataUrl);
    } catch {
      setErrorMessage('फोटो प्रशोधन गर्न सकिएन। अर्को फोटो प्रयास गर्नुहोस्।');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    setSelectedAvatar(customUrlInput.trim());
    setCustomUrlInput('');
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      await onSaveAvatar(selectedAvatar);
      onClose();
    } catch {
      setErrorMessage('अवतार सेभ गर्न सकिएन।');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-5 text-white shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-md">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">प्रोफाइल फोटो परिवर्तन गर्नुहोस्</h3>
              <p className="text-[11px] text-zinc-400">Change Your Profile Picture</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current / Selected Avatar Preview */}
        <div className="flex flex-col items-center justify-center py-2 space-y-2">
          <div className="relative group">
            <img
              src={selectedAvatar || currentAvatarUrl}
              alt="Avatar Preview"
              className="h-28 w-28 rounded-full object-cover border-4 border-rose-500 shadow-xl bg-zinc-800"
            />
            {isProcessing && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-rose-400 animate-spin" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 rounded-full bg-rose-500 p-2 text-white shadow-lg hover:bg-rose-600 transition-transform active:scale-90"
              title="Upload new image"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-zinc-400 font-medium">तपाईंको नयाँ प्रोफाइल फोटो</p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-zinc-800/80 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-colors ${
              activeTab === 'upload' ? 'bg-rose-500 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>फोटो छान्नुहोस्</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-colors ${
              activeTab === 'presets' ? 'bg-rose-500 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>अवतारहरू</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-colors ${
              activeTab === 'url' ? 'bg-rose-500 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span>वेब लिंक</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="rounded-xl bg-rose-500/20 border border-rose-500/40 p-2.5 text-center text-xs text-rose-300 font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Tab 1: Upload from Device */}
        {activeTab === 'upload' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-800/50 p-6 text-center hover:border-rose-500 hover:bg-zinc-800/80 transition-all cursor-pointer group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400 group-hover:scale-110 transition-transform">
                <ImageIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">ग्यालरी वा क्यामेराबाट फोटो छान्नुहोस्</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">JPG, PNG, WebP (कुनै पनि साइज)</p>
              </div>
            </button>
          </div>
        )}

        {/* Tab 2: Curated Presets */}
        {activeTab === 'presets' && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-400 font-medium">कुनै एक अवतारमा ट्याप गर्नुहोस्:</p>
            <div className="grid grid-cols-5 gap-2.5 max-h-48 overflow-y-auto p-1">
              {PRESET_AVATARS.map((avatar) => {
                const isSelected = selectedAvatar === avatar.url;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.url)}
                    className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all group ${
                      isSelected ? 'border-rose-500 scale-105 shadow-lg ring-2 ring-rose-500/40' : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.label}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-rose-500/40 flex items-center justify-center">
                        <Check className="h-4 w-4 text-white font-bold" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Custom URL */}
        {activeTab === 'url' && (
          <form onSubmit={handleApplyUrl} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                फोटोको इमेज लिंक (Direct Image URL)
              </label>
              <input
                type="url"
                value={customUrlInput}
                onChange={e => setCustomUrlInput(e.target.value)}
                placeholder="https://example.com/my-photo.jpg"
                className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!customUrlInput.trim()}
              className="w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50"
            >
              फोटो लोड गर्नुहोस्
            </button>
          </form>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-800 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            रद्द गर्नुहोस् (Cancel)
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isProcessing || !selectedAvatar}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 py-2.5 text-xs font-bold text-white shadow-lg hover:brightness-110 transition-all disabled:opacity-50"
          >
            <UserCheck className="h-4 w-4" />
            <span>{isProcessing ? 'सेभ हुँदैछ...' : 'फोटो सेभ गर्नुहोस्'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
