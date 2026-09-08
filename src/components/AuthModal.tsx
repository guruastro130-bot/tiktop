import React, { useState } from 'react';
import {
  X,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Globe,
  User as UserIcon,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { INITIAL_USERS } from '../data/initialData';

type AuthTab = 'phone' | 'email' | 'social';

const COUNTRY_CODES = [
  { code: '+977', country: 'Nepal 🇳🇵', flag: '🇳🇵' },
  { code: '+1', country: 'US / Canada 🇺🇸', flag: '🇺🇸' },
  { code: '+91', country: 'India 🇮🇳', flag: '🇮🇳' },
  { code: '+44', country: 'UK 🇬🇧', flag: '🇬🇧' },
  { code: '+61', country: 'Australia 🇦🇺', flag: '🇦🇺' },
  { code: '+971', country: 'UAE 🇦🇪', flag: '🇦🇪' },
  { code: '+81', country: 'Japan 🇯🇵', flag: '🇯🇵' },
  { code: '+49', country: 'Germany 🇩🇪', flag: '🇩🇪' },
  { code: '+33', country: 'France 🇫🇷', flag: '🇫🇷' },
  { code: '+82', country: 'South Korea 🇰🇷', flag: '🇰🇷' },
];

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    login,
    loginWithOAuth,
    loginWithPhone,
    register,
    switchUser,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>('phone');
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Phone Form States
  const [countryCode, setCountryCode] = useState<string>('+977');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [phonePassword, setPhonePassword] = useState<string>('');
  const [phoneDisplayName, setPhoneDisplayName] = useState<string>('');

  // Email / Username Form States
  const [identifier, setIdentifier] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [emailPassword, setEmailPassword] = useState<string>('');
  const [bio, setBio] = useState<string>('');

  // Social Custom Inputs modal state (optional custom email)
  const [socialCustomEmail, setSocialCustomEmail] = useState<string>('');

  if (!isAuthModalOpen) return null;

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 7) {
      setError('Please enter a valid phone number (at least 7 digits).');
      setLoading(false);
      return;
    }

    if (phonePassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      setLoading(false);
      return;
    }

    const res = await loginWithPhone({
      phoneNumber: cleanPhone,
      countryCode,
      password: phonePassword,
      displayName: phoneDisplayName || undefined,
      mode: isRegisterMode ? 'register' : 'login',
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Phone authentication failed.');
    } else {
      setSuccessMsg(isRegisterMode ? 'Phone ID created successfully!' : 'Signed in successfully!');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (isRegisterMode) {
      const res = await register({
        username: identifier,
        displayName: displayName || identifier,
        email,
        bio,
      });
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Registration failed');
      } else {
        setSuccessMsg('Account created successfully!');
      }
    } else {
      const res = await login(identifier);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Login failed');
      } else {
        setSuccessMsg('Signed in successfully!');
      }
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const emailToUse = socialCustomEmail.trim() || undefined;
    const res = await loginWithOAuth(provider, emailToUse);
    setLoading(false);

    if (!res.success) {
      setError(res.error || `Failed to sign in with ${provider}`);
    } else {
      setSuccessMsg(`Signed in with ${provider === 'google' ? 'Google' : 'Facebook'}!`);
    }
  };

  const handleQuickDemoUser = (user: any) => {
    switchUser(user);
    closeAuthModal();
  };

  return (
    <div
      id="auth-modal-backdrop"
      onClick={closeAuthModal}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="auth-modal-container"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl animate-fade-in my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 via-pink-500 to-rose-400 font-black text-white text-xs shadow-md">
              TT
            </div>
            <div>
              <h3 className="text-base font-black leading-tight">
                {isRegisterMode ? 'Create TikTok ID' : 'Sign In to TikTok'}
              </h3>
              <p className="text-[11px] text-zinc-400">Join creators, watch & post viral shorts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1-Tap Quick Social Login Buttons (Google / Gmail & Facebook) */}
        <div className="mb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Google / Gmail 1-Tap */}
            <button
              id="oauth-google-btn"
              type="button"
              disabled={loading}
              onClick={() => handleOAuthLogin('google')}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white text-zinc-900 px-3 py-2.5 text-xs font-bold shadow hover:bg-zinc-100 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Gmail / Google</span>
            </button>

            {/* Facebook 1-Tap */}
            <button
              id="oauth-facebook-btn"
              type="button"
              disabled={loading}
              onClick={() => handleOAuthLogin('facebook')}
              className="flex items-center justify-center gap-2 rounded-xl border border-blue-600 bg-[#1877F2] text-white px-3 py-2.5 text-xs font-bold shadow hover:bg-[#166fe5] active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
            >
              <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-3 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative bg-zinc-900 px-2 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Or login with phone / email
          </span>
        </div>

        {/* Tabs: Phone Number vs Email / Username */}
        <div className="flex rounded-xl bg-zinc-800 p-1 mb-4 border border-white/5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('phone');
              setError('');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'phone'
                ? 'bg-rose-500 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Phone Number</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('email');
              setError('');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'email'
                ? 'bg-rose-500 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email / Username</span>
          </button>
        </div>

        {/* Tab 1: Phone Number Auth */}
        {activeTab === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-3 text-xs">
            {isRegisterMode && (
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Full Name / Display Name</label>
                <div className="relative flex items-center">
                  <UserIcon className="absolute left-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={phoneDisplayName}
                    onChange={e => setPhoneDisplayName(e.target.value)}
                    placeholder="e.g. Roshan Sharma ✨"
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 py-2.5 pl-9 pr-3 text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Phone Number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="rounded-xl border border-white/10 bg-zinc-800 px-2.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none font-mono"
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code} className="bg-zinc-900 text-white">
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1 flex items-center">
                  <Phone className="absolute left-3 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="98XXXXXXXX / Phone #"
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 py-2.5 pl-9 pr-3 text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                {isRegisterMode ? 'Create Password' : 'Password'}
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={phonePassword}
                  onChange={e => setPhonePassword(e.target.value)}
                  placeholder={isRegisterMode ? 'At least 4 characters' : 'Enter your password'}
                  className="w-full rounded-xl border border-white/10 bg-zinc-800 py-2.5 pl-9 pr-9 text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <button
              id="phone-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 py-3 font-bold text-white shadow-lg hover:brightness-110 disabled:opacity-50 transition-all mt-3 cursor-pointer"
            >
              <span>{loading ? 'Processing...' : isRegisterMode ? 'Create ID with Phone' : 'Sign In with Phone'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Tab 2: Email / Username Auth */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                {isRegisterMode ? 'Choose Username' : 'Username or Email'}
              </label>
              <div className="relative flex items-center">
                <UserIcon className="absolute left-3 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder={isRegisterMode ? 'e.g. alex_vids' : 'admin, username or email'}
                  className="w-full rounded-xl border border-white/10 bg-zinc-800 py-2.5 pl-9 pr-3 text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {isRegisterMode && (
              <>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Rivera ✨"
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-white/10 bg-zinc-800 py-2.5 pl-9 pr-3 text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Short Bio</label>
                  <input
                    type="text"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Creator bio..."
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            <button
              id="email-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 py-3 font-bold text-white shadow-lg hover:brightness-110 disabled:opacity-50 transition-all mt-3 cursor-pointer"
            >
              <span>{loading ? 'Processing...' : isRegisterMode ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Toggle Mode: Sign In vs Create Account */}
        <div className="mt-4 text-center text-xs text-zinc-400 border-t border-white/10 pt-3">
          {isRegisterMode ? (
            <p>
              Already have an ID?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setError('');
                }}
                className="font-bold text-rose-400 hover:underline"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an ID yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  setError('');
                }}
                className="font-bold text-rose-400 hover:underline"
              >
                Create TikTok ID
              </button>
            </p>
          )}
        </div>

        {/* Quick Demo Switcher (Instant testing convenience) */}
        <div className="mt-4 rounded-xl bg-zinc-800/60 p-3 border border-white/5 space-y-2">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>Instant Demo Accounts (1-Click)</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoUser(INITIAL_USERS[0])} // Admin
              className="flex flex-col items-center rounded-lg bg-zinc-900/90 p-2 text-center border border-amber-400/30 hover:border-amber-400 transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-amber-400 mb-1" />
              <span className="text-[11px] font-bold text-white">Admin</span>
              <span className="text-[9px] text-zinc-400">@admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoUser(INITIAL_USERS[1])} // Sarah Creator
              className="flex flex-col items-center rounded-lg bg-zinc-900/90 p-2 text-center border border-white/10 hover:border-rose-400 transition-colors"
            >
              <img src={INITIAL_USERS[1].avatarUrl} alt="Sarah" className="h-4 w-4 rounded-full mb-1 object-cover" />
              <span className="text-[11px] font-bold text-white truncate">Sarah</span>
              <span className="text-[9px] text-zinc-400">@sarah_dance</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoUser(INITIAL_USERS[2])} // Marco Creator
              className="flex flex-col items-center rounded-lg bg-zinc-900/90 p-2 text-center border border-white/10 hover:border-rose-400 transition-colors"
            >
              <img src={INITIAL_USERS[2].avatarUrl} alt="Marco" className="h-4 w-4 rounded-full mb-1 object-cover" />
              <span className="text-[11px] font-bold text-white truncate">Marco</span>
              <span className="text-[9px] text-zinc-400">@chef_marco</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
