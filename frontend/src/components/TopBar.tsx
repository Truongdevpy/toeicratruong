import React, { useState } from 'react';
import {
  Crown,
  Flame,
  Bell,
  Settings,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { TRANSLATIONS } from '../i18n/translations';
import { NotificationsDrawer } from './NotificationsDrawer';

interface TopBarProps {
  onNavigate: (path: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onOpenRBAC?: () => void;
  onOpenSettings?: () => void;
  onOpenMobileDrawer: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onNavigate,
  onOpenAuth: _onOpenAuth,
  onOpenRBAC,
  onOpenSettings,
  onOpenMobileDrawer,
}) => {
  const { user, profile, unreadNotifications } = useAuth();
  const { settings } = useSettings();
  const lang = settings.language || (typeof window !== 'undefined' && localStorage.getItem('app_language') === 'en' ? 'en' : 'vi');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between px-3 sm:px-6 font-sans">
      {/* Left: Mobile hamburger menu (<1024px) & Page title/Search area */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer"
          aria-label={t.openMenu}
          title={t.openMenu}
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className="lg:hidden font-black text-sm text-slate-900 tracking-tight truncate">
          TOEIC Ra Trường AI
        </span>
      </div>

      {/* Right Utility Controls: VIP badge, Quyền lợi gói học, Streak, XP, Notifications, Settings */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Merged VIP & Perks Button */}
        <button
          type="button"
          onClick={onOpenRBAC}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs min-h-[36px] ${
            user && (user.is_vip || user.role === 'admin')
              ? 'border-amber-300 bg-gradient-to-r from-amber-100 to-amber-200/90 text-amber-950 hover:from-amber-200 hover:to-amber-300'
              : 'border-amber-400 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:from-amber-500 hover:to-amber-600'
          }`}
          title={lang === "en" ? "VIP & Plan Benefits" : "Gói VIP & Quyền lợi"}
        >
          <Crown className={`w-3.5 h-3.5 ${user && (user.is_vip || user.role === 'admin') ? 'fill-amber-600 text-amber-700' : 'fill-slate-950 text-slate-950'}`} />
          <span className="hidden sm:inline">{user && (user.is_vip || user.role === 'admin') ? 'VIP & Quyền lợi' : 'Gói VIP & Quyền lợi'}</span>
          <span className="sm:hidden">{user && (user.is_vip || user.role === 'admin') ? 'VIP' : 'Gói VIP'}</span>
        </button>

        {/* Streak & XP (Only when logged in) */}
        {user && (
          <div
            onClick={() => onNavigate('/statistics')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200/80 rounded-xl cursor-pointer hover:bg-amber-100/70 transition-colors"
            title={lang === "en" ? "Daily Study Streak" : "Chuỗi ngày học liên tục (Streak)"}
          >
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-flame-glow" />
            <span>{profile?.streak_days ?? 3}</span>
            <span className="hidden sm:inline">{t.daysStreak}</span>
          </div>
        )}

        {/* Notification Drawer */}
        {user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2.5 sm:p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title={t.studyNotifications}
              aria-label={t.studyNotifications}
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 px-1.5 py-0.2 bg-rose-500 text-white text-xs font-bold rounded-full min-w-4 text-center">
                  {unreadNotifications}
                </span>
              )}
            </button>
            <NotificationsDrawer
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
              onNavigate={onNavigate}
            />
          </div>
        )}

        {/* Quick Settings Gear Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2.5 sm:p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title={t.systemSettings}
          aria-label={t.systemSettings}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
