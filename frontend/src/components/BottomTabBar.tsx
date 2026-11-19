import React from 'react';
import { getBottomTabs, isRouteActive } from '../config/navConfig';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

interface BottomTabBarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onOpenMoreDrawer: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentPath,
  onNavigate,
  onOpenAuth,
  onOpenMoreDrawer,
}) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const lang = settings.language || (typeof window !== 'undefined' && localStorage.getItem('app_language') === 'en' ? 'en' : 'vi');
  const tabs = React.useMemo(() => getBottomTabs(lang), [lang]);

  const isGuestAllowed = (path?: string) => {
    if (!path) return true;
    return path === '/' || path === '/practice/dictation' || path === '/leaderboard' || path === '/community';
  };

  const handleTabClick = (path?: string, isMore?: boolean) => {
    if (isMore) {
      onOpenMoreDrawer();
      return;
    }
    if (path) {
      if (!user && !isGuestAllowed(path)) {
        onOpenAuth('login');
        return;
      }
      onNavigate(path);
    }
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)] select-none font-sans"
      aria-label={lang === "en" ? "Mobile bottom navigation" : "Thanh điều hướng dưới di động"}
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = !tab.isMore && isRouteActive(currentPath, tab.path);

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.path, tab.isMore)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-xs leading-tight mt-1 truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
