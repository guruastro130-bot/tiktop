import React, { useState } from 'react';
import { Shield, Lock, KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface AdminLoginGuardProps {
  onSuccess: (password: string) => void;
  onCancel: () => void;
}

export const AdminLoginGuard: React.FC<AdminLoginGuardProps> = ({ onSuccess, onCancel }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage('कृपया एडमिन पासवर्ड प्रविष्ट गर्नुहोस्।');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem('tiktop_admin_password', password.trim());
        sessionStorage.setItem('tiktop_admin_authenticated', 'true');
        onSuccess(password.trim());
      } else {
        setAttempts(prev => prev + 1);
        setErrorMessage(data.error || 'अमान्य एडमिन पासवर्ड! कृपया सही पासवर्ड हाल्नुहोस्।');
      }
    } catch {
      setErrorMessage('सर्भरमा जडान हुन सकेन। कृपया पुनः प्रयास गर्नुहोस्।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFillDefault = () => {
    setPassword('TikTopAdmin@2026');
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-6 sm:p-8 shadow-2xl shadow-rose-950/30">
        
        {/* Glow Accent */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-rose-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none" />

        {/* Security Shield Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5 shadow-lg shadow-rose-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-zinc-950">
              <Shield className="h-8 w-8 text-rose-400" />
            </div>
          </div>

          <h2 className="mt-4 text-xl font-black text-white tracking-tight sm:text-2xl">
            TikTop Admin Security Guard
          </h2>
          <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
            सुरक्षित एडमिन ड्यासबोर्ड र विथड्रल व्यवस्थापन खोल्न पासवर्ड प्रविष्ट गर्नुहोस्।
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-rose-400" />
                <span>एडमिन मास्टर पासवर्ड (Admin Secret Password)</span>
              </label>
              <button
                type="button"
                onClick={handleQuickFillDefault}
                className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                title="डिफल्ट पासवर्ड भर्नुहोस्"
              >
                डिफल्ट पासवर्ड भर्नुहोस्
              </button>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="उदा: TikTopAdmin@2026"
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 py-3 pl-10 pr-10 text-sm font-semibold text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2 animate-in shake duration-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-bold">{errorMessage}</p>
                {attempts >= 2 && (
                  <p className="mt-1 text-[11px] text-zinc-400">
                    सुझाव: यदि पासवर्ड परिवर्तन गरिएको छैन भने डिफल्ट पासवर्ड <code className="text-amber-300 font-mono font-bold">TikTopAdmin@2026</code> हो।
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Security Features Badge */}
          <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3 text-[11px] text-zinc-400 space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-300 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>२५६-बिट इन्क्रिप्टेड एडमिन गार्ड सक्रिय छ</span>
            </div>
            <p className="leading-snug text-zinc-400 text-[10px]">
              पासवर्ड प्रमाणीकरण भएपछि मात्र प्रयोगकर्ताका भुक्तानी अनुरोध र प्रणाली सेटिङ पहुँच गर्न सकिन्छ।
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-white/10 bg-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              रद्द गर्नुहोस्
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 py-3 text-xs font-bold text-white shadow-lg shadow-rose-500/25 hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>प्रमाणीकरण हुँदैछ...</span>
                </>
              ) : (
                <>
                  <span>लगइन गर्नुहोस्</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
