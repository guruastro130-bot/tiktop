import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { INITIAL_USERS } from '../data/initialData';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  login: (identifier: string) => Promise<{ success: boolean; error?: string }>;
  loginWithOAuth: (provider: 'google' | 'facebook', email?: string, displayName?: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPhone: (params: { phoneNumber: string; countryCode?: string; password?: string; displayName?: string; mode?: 'login' | 'register' }) => Promise<{ success: boolean; error?: string }>;
  register: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchUser: (user: User) => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  updateUserPoints: (newPoints: number) => void;
  adjustPoints: (delta: number) => Promise<number>;
  updateUserCoins: (newCoins: number) => void;
  adjustCoins: (delta: number) => Promise<number>;
  rechargeCoins: (coinsToAdd: number) => Promise<number>;
  banUserLive: (durationHours?: number, reason?: string) => Promise<User | null>;
  banUserAccount: (durationDays?: number, reason?: string) => Promise<User | null>;
  resetUserBans: () => Promise<User | null>;
  claimLiveReward: (milestone: 1 | 2, liveDurationSeconds: number) => Promise<{ success: boolean; pointsAwarded?: number; newTotalPoints?: number; error?: string }>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'tiktok_app_user';
const LOCAL_STORAGE_CUSTOM_USERS_KEY = 'tiktok_custom_users';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.coinBalance === undefined) {
          parsed.coinBalance = 5000;
        }
        return parsed;
      } catch {
        return null;
      }
    }
    // Default to admin user for rich initial access
    const defaultUser = INITIAL_USERS[0];
    if (defaultUser && defaultUser.coinBalance === undefined) {
      defaultUser.coinBalance = 5000;
    }
    return defaultUser;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  }, [currentUser]);

  // Helper to save custom created users locally for seamless standalone deployment
  const saveCustomUserLocally = (user: User) => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOM_USERS_KEY);
      const list: User[] = stored ? JSON.parse(stored) : [];
      const updated = [user, ...list.filter(u => u.id !== user.id)];
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_USERS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const getLocalUsers = (): User[] => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOM_USERS_KEY);
      const list: User[] = stored ? JSON.parse(stored) : [];
      return [...list, ...INITIAL_USERS];
    } catch {
      return [...INITIAL_USERS];
    }
  };

  const login = async (identifier: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        saveCustomUserLocally(data.user);
        setIsAuthModalOpen(false);
        return { success: true };
      }
    } catch {
      // Backend not reached (e.g. Vercel static hosting) - proceed with fail-safe local login
    }

    // Client-side fallback authentication
    const users = getLocalUsers();
    const cleanId = identifier.toLowerCase().trim();
    const cleanPhone = identifier.replace(/[^0-9+]/g, '');
    const found = users.find(u =>
      u.username.toLowerCase() === cleanId ||
      u.email.toLowerCase() === cleanId ||
      (u.phoneNumber && cleanPhone && u.phoneNumber.replace(/[^0-9+]/g, '') === cleanPhone)
    );

    if (found) {
      setCurrentUser(found);
      setIsAuthModalOpen(false);
      return { success: true };
    }

    // Auto-create user if not found
    const newUser: User = {
      id: `user_${Date.now()}`,
      username: cleanId.replace(/[^a-zA-Z0-9_]/g, '_') || `user_${Math.floor(Math.random() * 10000)}`,
      displayName: identifier.includes('@') ? identifier.split('@')[0] : identifier,
      email: identifier.includes('@') ? identifier : `${cleanId}@tiktok.app`,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80`,
      bio: 'TikTok Creator 🚀',
      followersCount: 0,
      followingCount: 0,
      likesReceivedCount: 0,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    saveCustomUserLocally(newUser);
    setCurrentUser(newUser);
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const loginWithOAuth = async (
    provider: 'google' | 'facebook',
    email?: string,
    displayName?: string,
    avatarUrl?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, email, displayName, avatarUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        saveCustomUserLocally(data.user);
        setIsAuthModalOpen(false);
        return { success: true };
      }
    } catch {
      // Backend not reached - fallback
    }

    // Client-side fallback OAuth login
    const cleanEmail = email || (provider === 'google' ? 'google_user@gmail.com' : 'fb_user@facebook.com');
    const name = displayName || (provider === 'google' ? 'Google User' : 'Facebook User');
    const avatar =
      avatarUrl ||
      (provider === 'google'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80');

    const users = getLocalUsers();
    let existing = users.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());

    if (!existing) {
      existing = {
        id: `user_${provider}_${Date.now()}`,
        username: `${provider}_${Math.floor(1000 + Math.random() * 9000)}`,
        displayName: name,
        email: cleanEmail,
        authProvider: provider,
        avatarUrl: avatar,
        bio: `Connected with ${provider === 'google' ? 'Google / Gmail' : 'Facebook'} ✨`,
        followersCount: 12,
        followingCount: 5,
        likesReceivedCount: 140,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      saveCustomUserLocally(existing);
    }

    setCurrentUser(existing);
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const loginWithPhone = async (params: {
    phoneNumber: string;
    countryCode?: string;
    password?: string;
    displayName?: string;
    mode?: 'login' | 'register';
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        saveCustomUserLocally(data.user);
        setIsAuthModalOpen(false);
        return { success: true };
      }
    } catch {
      // Backend not reached - fallback
    }

    // Client-side fallback phone auth
    const fullPhone = `${params.countryCode || '+977'}${params.phoneNumber}`;
    const cleanPhone = fullPhone.replace(/[^0-9+]/g, '');
    const users = getLocalUsers();

    let existing = users.find(
      u => u.phoneNumber && u.phoneNumber.replace(/[^0-9+]/g, '') === cleanPhone
    );

    if (params.mode === 'register' || !existing) {
      existing = {
        id: `user_phone_${Date.now()}`,
        username: `user_${params.phoneNumber.slice(-4) || Math.floor(1000 + Math.random() * 9000)}`,
        displayName: params.displayName || `Phone User (${params.phoneNumber.slice(-4)})`,
        email: `${params.phoneNumber}@tiktok.phone`,
        phoneNumber: fullPhone,
        authProvider: 'phone',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        bio: 'Phone Verified User 📱',
        followersCount: 0,
        followingCount: 0,
        likesReceivedCount: 0,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      saveCustomUserLocally(existing);
    }

    setCurrentUser(existing);
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const register = async (userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        saveCustomUserLocally(data.user);
        setIsAuthModalOpen(false);
        return { success: true };
      }
    } catch {
      // Backend not reached - fallback
    }

    // Client-side fallback register
    const newUser: User = {
      id: `user_${Date.now()}`,
      username: userData.username || `creator_${Math.floor(1000 + Math.random() * 9000)}`,
      displayName: userData.displayName || userData.username || 'New Creator',
      email: userData.email || `${userData.username || 'user'}@tiktok.app`,
      phoneNumber: userData.phoneNumber,
      avatarUrl: userData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      bio: userData.bio || 'New TikTok creator! Check out my videos 🎥',
      followersCount: 0,
      followingCount: 0,
      likesReceivedCount: 0,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    saveCustomUserLocally(newUser);
    setCurrentUser(newUser);
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchUser = (user: User) => {
    setCurrentUser(user);
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        setCurrentUser(result.user);
        saveCustomUserLocally(result.user);
        return true;
      }
    } catch {
      // fallback
    }

    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    saveCustomUserLocally(updated);
    return true;
  };

  const updateUserPoints = (newPoints: number) => {
    if (!currentUser) return;
    const updated = { ...currentUser, points: Math.max(0, newPoints) };
    setCurrentUser(updated);
    saveCustomUserLocally(updated);
  };

  const adjustPoints = async (delta: number): Promise<number> => {
    if (!currentUser) return 0;
    const fallbackPoints = Math.max(0, (currentUser.points || 0) + delta);
    try {
      const res = await fetch(`/api/users/${currentUser.id}/points/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointsDelta: delta })
      });
      if (res.ok) {
        const data = await res.json();
        updateUserPoints(data.points);
        return data.points;
      }
    } catch {
      // ignore
    }
    updateUserPoints(fallbackPoints);
    return fallbackPoints;
  };

  const updateUserCoins = (newCoins: number) => {
    if (!currentUser) return;
    const updated = { ...currentUser, coinBalance: Math.max(0, newCoins) };
    setCurrentUser(updated);
    saveCustomUserLocally(updated);
  };

  const adjustCoins = async (delta: number): Promise<number> => {
    if (!currentUser) return 0;
    const currentCoins = currentUser.coinBalance ?? 5000;
    const fallbackCoins = Math.max(0, currentCoins + delta);
    updateUserCoins(fallbackCoins);
    return fallbackCoins;
  };

  const rechargeCoins = async (coinsToAdd: number): Promise<number> => {
    if (!currentUser) return 0;
    const currentCoins = currentUser.coinBalance ?? 5000;
    const newCoins = currentCoins + coinsToAdd;
    updateUserCoins(newCoins);
    return newCoins;
  };

  const banUserLive = async (durationHours: number = 24, reason?: string): Promise<User | null> => {
    if (!currentUser) return null;
    const banUntil = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
    const updatedViolations = (currentUser.liveViolationsCount || 0) + 1;
    const updated: User = {
      ...currentUser,
      liveBannedUntil: banUntil,
      liveViolationsCount: updatedViolations,
    };
    setCurrentUser(updated);
    saveCustomUserLocally(updated);
    try {
      await fetch(`/api/users/${currentUser.id}/live-ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationHours, reason, violationsCount: updatedViolations })
      });
    } catch {
      // client fallback
    }
    return updated;
  };

  const banUserAccount = async (durationDays: number = 3, reason?: string): Promise<User | null> => {
    if (!currentUser) return null;
    const banUntil = new Date(Date.now() + durationDays * 24 * 3600 * 1000).toISOString();
    const updatedViolations = (currentUser.liveViolationsCount || 0) + 1;
    const updated: User = {
      ...currentUser,
      accountBannedUntil: banUntil,
      accountBanReason: reason || 'लाइभमा बारम्बार क्यामेरा छोडेको उल्लङ्घनका कारण ३ दिनको लागि खाता प्रतिबन्ध।',
      isBanned: true,
      liveViolationsCount: updatedViolations,
    };
    setCurrentUser(updated);
    saveCustomUserLocally(updated);
    try {
      await fetch(`/api/users/${currentUser.id}/account-ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationDays, reason, violationsCount: updatedViolations })
      });
    } catch {
      // client fallback
    }
    return updated;
  };

  const resetUserBans = async (): Promise<User | null> => {
    if (!currentUser) return null;
    const updated: User = {
      ...currentUser,
      liveBannedUntil: null,
      accountBannedUntil: null,
      accountBanReason: undefined,
      isBanned: false,
    };
    setCurrentUser(updated);
    saveCustomUserLocally(updated);
    try {
      await fetch(`/api/users/${currentUser.id}/reset-bans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // client fallback
    }
    return updated;
  };

  const claimLiveReward = async (
    milestone: 1 | 2,
    liveDurationSeconds: number
  ): Promise<{ success: boolean; pointsAwarded?: number; newTotalPoints?: number; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Authentication required' };
    }
    const pointsAwarded = 1000;
    const fallbackNewTotal = (currentUser.points || 0) + pointsAwarded;
    try {
      const res = await fetch('/api/rewards/claim-live-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          milestone,
          liveDurationSeconds,
        })
      });
      if (res.ok) {
        const data = await res.json();
        updateUserPoints(data.newTotalPoints);
        return {
          success: true,
          pointsAwarded: data.pointsAwarded,
          newTotalPoints: data.newTotalPoints,
        };
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.error) return { success: false, error: err.error };
      }
    } catch {
      // client fallback
    }
    updateUserPoints(fallbackNewTotal);
    return {
      success: true,
      pointsAwarded,
      newTotalPoints: fallbackNewTotal,
    };
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        login,
        loginWithOAuth,
        loginWithPhone,
        register,
        logout,
        switchUser,
        updateProfile,
        updateUserPoints,
        adjustPoints,
        updateUserCoins,
        adjustCoins,
        rechargeCoins,
        banUserLive,
        banUserAccount,
        resetUserBans,
        claimLiveReward,
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

