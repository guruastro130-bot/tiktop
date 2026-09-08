import React from 'react';
import { Home, Compass, Plus, MessageSquare, User as UserIcon, Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export type NavTab = 'home' | 'discover' | 'live' | 'upload' | 'notifications' | 'profile';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange }) => {
  const { currentUser, openAuthModal } = useAuth();
  const { unreadCount } = useNotifications();

  const handleProfileClick = () => {
    if (!currentUser) {
      openAuthModal();
    } else {
      onTabChange('profile');
    }
  };

  const handleUploadClick = () => {
    if (!currentUser) {
      openAuthModal();
    } else {
      onTabChange('upload');
    }
  };

  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/90 backdrop-blur-xl py-2 px-3 sm:px-6 flex items-center justify-around select-none max-w-lg mx-auto"
    >
      {/* Home Tab */}
      <button
        id="nav-home-btn"
        type="button"
        onClick={() => onTabChange('home')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          currentTab === 'home' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <Home className="h-5 w-5" />
        <span className="text-[10px] font-bold">Home</span>
      </button>

      {/* Discover Tab */}
      <button
        id="nav-discover-btn"
        type="button"
        onClick={() => onTabChange('discover')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          currentTab === 'discover' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <Compass className="h-5 w-5" />
        <span className="text-[10px] font-bold">Discover</span>
      </button>

      {/* Live Tab */}
      <button
        id="nav-live-btn"
        type="button"
        onClick={() => onTabChange('live')}
        className={`relative flex flex-col items-center gap-1 transition-colors ${
          currentTab === 'live' ? 'text-rose-500' : 'text-zinc-500 hover:text-zinc-300'
        }`}
        title="TikTok LIVE"
      >
        <div className="relative">
          <Radio className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
        </div>
        <span className="text-[10px] font-bold">LIVE</span>
      </button>

      {/* Create / Upload (+) Center Button */}
      <button
        id="nav-create-btn"
        type="button"
        onClick={handleUploadClick}
        className="group relative flex items-center justify-center -my-1 px-1 focus:outline-none"
        title="Create Video"
      >
        <div className="relative flex h-8 w-11 items-center justify-center rounded-lg bg-white text-black shadow-md transition-transform group-hover:scale-105 active:scale-95">
          {/* Cyan Left Border / Red Right Border Classic TikTok Button Aesthetic */}
          <div className="absolute -left-1 h-8 w-8 rounded-lg bg-sky-400 -z-10" />
          <div className="absolute -right-1 h-8 w-8 rounded-lg bg-rose-500 -z-10" />
          <Plus className="h-5 w-5 stroke-[3]" />
        </div>
      </button>

      {/* Inbox / Notifications Tab */}
      <button
        id="nav-inbox-btn"
        type="button"
        onClick={() => onTabChange('notifications')}
        className={`relative flex flex-col items-center gap-1 transition-colors ${
          currentTab === 'notifications' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <div className="relative">
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              id="nav-inbox-unread-badge"
              className="absolute -top-1.5 -right-2.5 flex min-w-4 h-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-black animate-pulse"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold">Inbox</span>
      </button>

      {/* Profile Tab */}
      <button
        id="nav-profile-btn"
        type="button"
        onClick={handleProfileClick}
        className={`flex flex-col items-center gap-1 transition-colors ${
          currentTab === 'profile' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        {currentUser?.avatarUrl ? (
          <img
            src={currentUser.avatarUrl}
            alt="Profile"
            className={`h-5 w-5 rounded-full object-cover border ${
              currentTab === 'profile' ? 'border-white' : 'border-zinc-700'
            }`}
          />
        ) : (
          <UserIcon className="h-5 w-5" />
        )}
        <span className="text-[10px] font-bold">Profile</span>
      </button>
    </nav>
  );
};
