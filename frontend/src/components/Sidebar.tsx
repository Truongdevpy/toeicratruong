import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  Shield,
  Crown,
  Sparkles,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { getNavGroups, NavItemConfig, isRouteActive } from '../config/navConfig';
import { useSettings } from '../context/SettingsContext';
import { TRANSLATIONS } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentPath: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: (path: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onOpenRBAC?: () => void;
  onOpenSettings?: () => void;
  onOpenProfileModal?: () => void;
  // Mobile drawer support
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  isCollapsed,
  onToggleCollapse,
  onNavigate,
  onOpenAuth,
  onOpenRBAC,
  onOpenSettings,
  onOpenProfileModal,
  isMobileDrawer = false,
  onCloseMobileDrawer,
}) => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const lang = settings.language || (typeof window !== 'undefined' && localStorage.getItem('app_language') === 'en' ? 'en' : 'vi');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;
  const navGroups = React.useMemo(() => getNavGroups(lang), [lang]);

  // Accordion collapsed groups state (saved to localStorage)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('toeic_sidebar_groups');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem('toeic_sidebar_groups', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // User menu popup inside sidebar footer
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Close user menu when clicking outside
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClick = () => setIsUserMenuOpen(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isUserMenuOpen]);

  // Keyboard navigation: Escape key closes mobile drawer or user popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isUserMenuOpen) setIsUserMenuOpen(false);
        if (isMobileDrawer && onCloseMobileDrawer) onCloseMobileDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUserMenuOpen, isMobileDrawer, onCloseMobileDrawer]);

  // Accessibility: guest allowed routes
  const isGuestAllowed = (path?: string) => {
    if (!path) return true;
    if (path.startsWith('/dashboard') || path.startsWith('/history') || path.startsWith('/admin')) {
      return false;
    }
    return true;
  };

  const handleItemClick = (item: NavItemConfig) => {
    if (item.isAction) {
      if (item.actionType === 'settings') onOpenSettings?.();
      if (item.actionType === 'rbac') onOpenRBAC?.();
      if (isMobileDrawer) onCloseMobileDrawer?.();
      return;
    }

    if (item.path) {
      if (!user && !isGuestAllowed(item.path)) {
        onOpenAuth('login');
        if (isMobileDrawer) onCloseMobileDrawer?.();
        return;
      }
      onNavigate(item.path);
      if (isMobileDrawer) onCloseMobileDrawer?.();
    }
  };

  // Determine if collapsed mode is active (always false on mobile drawer)
  const collapsed = !isMobileDrawer && isCollapsed;

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-white border-r border-slate-200/90 flex flex-col transition-[width] duration-200 ease-in-out select-none shadow-xs font-sans ${
        isMobileDrawer ? 'w-[280px] max-w-[85vw]' : collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      aria-label={lang === "en" ? "Main Navigation" : "Thanh điều hướng chính"}
    >
      {/* 1. Header: Logo & Collapse Button */}
      <div className={`h-14 border-b border-slate-100 shrink-0 flex items-center ${
        collapsed ? 'px-2 justify-between gap-1' : 'px-3.5 justify-between'
      }`}>
        <div
          onClick={() => {
            onNavigate('/');
            if (isMobileDrawer) onCloseMobileDrawer?.();
          }}
          className={`flex items-center cursor-pointer select-none shrink-0 ${
            collapsed ? '' : 'gap-2.5 overflow-hidden min-w-0'
          }`}
          title="TOEIC Ra Trường AI"
        >
          <BrandLogo size={collapsed ? 'xs' : 'sm'} showText={!collapsed} />
        </div>

        {/* Toggle Collapse Button (Desktop only) */}
        {!isMobileDrawer && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer shrink-0 ${
              collapsed ? 'w-7 h-7 p-0' : 'p-1.5'
            }`}
            title={collapsed ? (lang === 'en' ? 'Expand sidebar' : 'Mở rộng thanh điều hướng') : (lang === 'en' ? 'Collapse sidebar' : 'Thu gọn thanh điều hướng')}
            aria-label={collapsed ? (lang === 'en' ? 'Expand sidebar' : 'Mở rộng thanh điều hướng') : (lang === 'en' ? 'Collapse sidebar' : 'Thu gọn thanh điều hướng')}
          >
            {collapsed ? <ChevronRight className="w-4 h-4 stroke-[2.5]" /> : <ChevronLeft className="w-4 h-4 stroke-[2]" />}
          </button>
        )}
      </div>

      {/* 2. Navigation List with Custom Scrollbar */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-4 custom-scrollbar">
        {navGroups.map((group) => {
          const isGroupCollapsed = !collapsed && Boolean(collapsedGroups[group.id]);

          return (
            <div key={group.id} className="space-y-1" role="group" aria-label={group.title}>
              {/* Group Header */}
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-xs font-bold text-slate-600 uppercase tracking-wider rounded-lg hover:text-slate-900 transition-colors cursor-pointer"
                  aria-expanded={!isGroupCollapsed}
                >
                  <span>{group.title}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isGroupCollapsed ? '-rotate-90 text-slate-400' : 'text-slate-400'
                    }`}
                  />
                </button>
              ) : (
                <div className="w-full h-px bg-slate-200/70 my-2" />
              )}

              {/* Group Items */}
              {(!isGroupCollapsed || collapsed) && (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isRouteActive(currentPath, item.path);

                    return (
                      <div key={item.id} className="relative group/navitem">
                        <button
                          type="button"
                          onClick={() => handleItemClick(item)}
                          aria-current={isActive ? 'page' : undefined}
                          className={`w-full flex items-center rounded-xl transition-all duration-150 cursor-pointer min-h-[42px] ${
                            collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                          } ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600 shadow-2xs ring-1 ring-blue-500/15'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium active:scale-[0.98] transition-transform duration-100'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-transform ${
                              isActive ? 'text-blue-600 scale-105' : 'text-slate-500 group-hover/navitem:text-slate-900'
                            }`}
                          />

                          {!collapsed && (
                            <div className="flex-1 text-left min-w-0">
                              <span className="text-xs font-semibold truncate block leading-tight">{item.label}</span>
                            </div>
                          )}
                        </button>

                        {/* Tooltip on Collapsed Desktop */}
                        {collapsed && (
                          <div className="fixed left-[76px] z-50 pointer-events-none hidden group-hover/navitem:flex flex-col bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap -translate-y-1/2 top-auto">
                            <span className="font-bold">{item.label}</span>
                            {item.desc && <span className="text-xs text-slate-300 font-normal">{item.desc}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 3. Footer: User Card / Login CTA */}
      <div className="p-2 border-t border-slate-100 shrink-0 bg-slate-50/60 relative">
        {user ? (
          <div>
            {/* User Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsUserMenuOpen(!isUserMenuOpen);
              }}
              className={`w-full flex items-center rounded-2xl hover:bg-white border border-transparent hover:border-slate-200 transition-all p-1.5 cursor-pointer ${
                collapsed ? 'justify-center' : 'gap-2.5'
              }`}
              title={collapsed ? `${user.full_name} (${user.email})` : undefined}
              aria-haspopup="true"
              aria-expanded={isUserMenuOpen}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                </div>
              )}

              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">{user.full_name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {user.role === 'admin' ? (
                      <span className="text-xs font-bold px-1.5 py-0.2 bg-slate-900 text-amber-300 rounded border border-slate-700">
                        Admin
                      </span>
                    ) : user.role === 'vip' || user.is_vip ? (
                      <span className="text-xs font-bold px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded border border-amber-300 flex items-center gap-0.5">
                        <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-600" /> VIP
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded">
                        Thường
                      </span>
                    )}
                  </div>
                </div>
              )}
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute bottom-full mb-2 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                  collapsed ? 'left-2 w-56' : 'left-2 right-2'
                }`}
              >
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900 truncate">{user.full_name}</div>
                  <div className="text-xs text-slate-500 truncate">{user.email}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenProfileModal?.();
                    if (isMobileDrawer) onCloseMobileDrawer?.();
                  }}
                  className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'en' ? 'Edit Profile & Avatar' : 'Chỉnh sửa hồ sơ & Avatar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenRBAC?.();
                    if (isMobileDrawer) onCloseMobileDrawer?.();
                  }}
                  className="w-full text-left px-3.5 py-2 text-amber-900 bg-amber-50/50 hover:bg-amber-100/70 flex items-center gap-2 font-bold cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-600/30" />
                  <span>{t.planBenefits}</span>
                </button>

                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('/admin');
                      if (isMobileDrawer) onCloseMobileDrawer?.();
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-800 hover:bg-slate-100 flex items-center gap-2 font-bold cursor-pointer border-t border-slate-100"
                  >
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span>{lang === 'en' ? 'Admin Portal' : 'Cổng Quản trị Admin'}</span>
                  </button>
                )}

                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                      onNavigate('/');
                      if (isMobileDrawer) onCloseMobileDrawer?.();
                    }}
                    className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.logout}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 p-1">
            {!collapsed ? (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onOpenAuth('login');
                    if (isMobileDrawer) onCloseMobileDrawer?.();
                  }}
                  className="w-full py-2 px-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-white text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenAuth('register');
                    if (isMobileDrawer) onCloseMobileDrawer?.();
                  }}
                  className="w-full py-2 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer text-center"
                >
                  Đăng ký
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="w-full py-2 flex items-center justify-center rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 cursor-pointer"
                title={t.login}
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
