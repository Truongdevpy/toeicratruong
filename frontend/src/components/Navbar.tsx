import { BrandLogo } from './BrandLogo';
import { MorphMenuClose } from './MorphIcon';
import React, { useState, useRef, useEffect } from 'react';
import {
  Crown,
  Flame,
  Bell,
  LogOut,
  Compass,
  BookOpen,
  FileText,
  Bot,
  BarChart3,
  Users,
  Shield,
  ChevronDown,
  Clock,
  Layers,
  Award,
  Trophy,
  Headphones,
  Mic,
  PenTool,
  SpellCheck,
  MoreHorizontal,
  Bookmark,
  Sparkles,
  GraduationCap,
  Video,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationsDrawer } from './NotificationsDrawer';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onOpenChat?: (userId?: number | null) => void;
  onOpenRBAC?: () => void;
  onOpenSettings?: () => void;
  unreadMessagesCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  onNavigate,
  onOpenAuth,
  onOpenChat: _onOpenChat,
  onOpenRBAC,
  onOpenSettings,
  unreadMessagesCount: _unreadMessagesCount = 0
}) => {
  const { user, profile, unreadNotifications, logout } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary direct skill and practice tabs requested by user
  const primaryLinks = [
    { path: '/practice/listening', label: 'Nghe', icon: Headphones },
    { path: '/practice/reading', label: 'Đọc', icon: BookOpen },
    { path: '/practice/writing', label: 'Viết', icon: PenTool },
    { path: '/practice/speaking', label: 'Nói', icon: Mic },
    { path: '/practice/dictation', label: 'Chép chính tả', icon: SpellCheck },
    { path: '/mock-tests', label: 'Đề thi', icon: FileText },
    { path: '/videos', label: 'Video', icon: Video },
    { path: '/leaderboard', label: 'BXH', icon: Trophy },
    { path: '/community', label: 'Cộng đồng', icon: Users },
  ];

  // Secondary modules accessible via the '...' (More) menu
  const secondaryLinks = [
    { path: '/history', label: 'Lịch sử làm bài', desc: 'Xem lại đề thi đã nộp, câu hỏi và tiến độ luyện tập', icon: Clock },
    { path: '/practice/vocabulary', label: 'Kho từ vựng 5,000+', desc: 'Từ vựng cốt lõi phân theo chủ đề & band điểm', icon: Bookmark },
    { path: '/practice/flashcards', label: 'Flashcards SRS', desc: 'Lặp lại ngắt quãng & phát âm IPA chuẩn', icon: Layers },
    { path: '/practice/grammar', label: 'Ngữ pháp 38 chuyên đề', desc: 'Trọng tâm đề thi, công thức & phân tích bẫy', icon: Sparkles },
    { path: '/learning-path', label: 'Lộ trình học AI', desc: 'Kế hoạch học cá nhân hóa theo mục tiêu', icon: Layers },
    { path: '/ai-tutor', label: 'Gia sư AI cá nhân hóa', desc: 'Hỏi đáp bài tập, ngữ pháp & giải thích Socratic 1-1', icon: Bot },
    { path: '/placement-test', label: 'Đánh giá năng lực', desc: 'Kiểm tra trình độ nhanh và gợi ý lộ trình', icon: GraduationCap },
    { path: '/dashboard', label: 'Tổng quan cá nhân', desc: 'Dashboard theo dõi tiến độ và mục tiêu học', icon: Compass },
    { path: '/statistics', label: 'Thống kê & Phân tích', desc: 'Biểu đồ phân tích độ chính xác và lịch sử', icon: BarChart3 },
    { path: '/achievements', label: 'Huy hiệu & Thành tích', desc: 'Bộ sưu tập danh hiệu và chuỗi học tập', icon: Award },
  ];

  const isMoreActive = secondaryLinks.some((item) => currentPath === item.path);

  // RBAC Matrix Guard: Paths accessible by unauthenticated guests
  const isGuestAllowed = (path: string) => {
    return path === '/' || path === '/practice/dictation' || path === '/leaderboard' || path === '/community';
  };

  const handleNavClick = (path: string) => {
    if (!user && !isGuestAllowed(path)) {
      onOpenAuth('login');
      return;
    }
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] font-sans">
      <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between h-14 gap-2 xl:gap-4">
          {/* Brand Logo & Main Nav */}
          <div className="flex items-center gap-3 xl:gap-5 min-w-0">
            <BrandLogo
              size="sm"
              showText={true}
              onClick={() => onNavigate('/')}
              className="shrink-0"
            />

            {/* Desktop Navigation - Direct Skill Tabs */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 shrink-0">
              {primaryLinks.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNavClick(item.path)}
                    className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}

              {/* 'More' (...) Dropdown */}
              <div className="relative shrink-0" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={`flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isMoreActive || isMoreMenuOpen
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                  title="Tính năng mở rộng"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Công cụ & Lộ trình mở rộng
                    </div>
                    <div className="py-1">
                      {secondaryLinks.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = currentPath === sub.path;
                        return (
                          <button
                            key={sub.path}
                            type="button"
                            onClick={() => {
                              setIsMoreMenuOpen(false);
                              handleNavClick(sub.path);
                            }}
                            className={`w-full text-left px-3.5 py-2 flex items-start gap-2.5 transition-colors cursor-pointer hover:bg-slate-50 ${
                              isSubActive ? 'bg-blue-50/80 text-blue-700' : 'text-slate-700'
                            }`}
                          >
                            <SubIcon className={`w-4 h-4 mt-0.5 shrink-0 ${isSubActive ? 'text-blue-600' : 'text-slate-400'}`} />
                            <div className="min-w-0">
                              <div className="text-xs font-bold leading-tight">{sub.label}</div>
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">{sub.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          onOpenSettings?.();
                        }}
                        className="w-full text-left px-3.5 py-2 flex items-start gap-2.5 transition-colors cursor-pointer hover:bg-slate-50 text-slate-700"
                      >
                        <Settings className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight">Cài đặt hệ thống & Nút nổi</div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">Bật/tắt nút nổi AI, tin nhắn & âm thanh</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right Action Controls: Streak, Community Chat, Notification, VIP & Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* VIP Upgrade / Buy Button */}
            {(!user || (!user.is_vip && user.role !== 'admin')) ? (
              <button
                type="button"
                onClick={() => onNavigate('/payment')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl border border-amber-400 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 shadow-xs hover:shadow-md transition-all cursor-pointer"
                title="Mua gói VIP - Mở khóa 100% đề thi & gia sư AI"
              >
                <Crown className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                <span>Nâng cấp VIP</span>
              </button>
            ) : (
              <div
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-xl border border-amber-300 bg-amber-50 text-amber-900"
                title="Tài khoản VIP đang kích hoạt"
              >
                <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                <span>VIP</span>
              </div>
            )}

            {/* VIP RBAC Matrix Button */}
            <button
              type="button"
              onClick={onOpenRBAC}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-amber-300/90 bg-gradient-to-r from-amber-50 to-amber-100/70 hover:from-amber-100 hover:to-amber-200/80 text-amber-900 shadow-2xs transition-all cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-600/30" />
              <span>Quyền lợi gói học</span>
            </button>

            {/* Streak & XP (Only when logged in) */}
            {user && (
              <div
                onClick={() => onNavigate('/statistics')}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200/80 rounded-xl cursor-pointer hover:bg-amber-100/70 transition-colors"
                title="Chuỗi ngày học liên tục (Streak)"
              >
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{profile?.streak_days ?? 3} ngày</span>
              </div>
            )}

            {/* Notification Drawer */}
            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="relative p-2.5 sm:p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Thông báo học tập"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full min-w-4 text-center">
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
              title="Cài đặt hệ thống & Tùy chỉnh nút nổi"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Auth Actions (Login/Register or User Avatar Menu) */}
            {user ? (
              <div className="relative hidden sm:block" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200/80"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-blue-500/20"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="hidden md:inline max-w-[120px] truncate text-slate-800">
                    {user.full_name}
                  </span>
                  {user.role === 'admin' ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-800 text-amber-300 rounded border border-slate-700">Admin</span>
                  ) : user.role === 'vip' || user.is_vip ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded border border-amber-300 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-600" /> VIP
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">Thường</span>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="font-bold text-slate-900 truncate">{user.full_name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onNavigate('/dashboard');
                      }}
                      className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tổng quan cá nhân</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onNavigate('/statistics');
                      }}
                      className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Thống kê & Điểm số</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenRBAC?.();
                      }}
                      className="w-full text-left px-4 py-2 text-amber-900 bg-amber-50/50 hover:bg-amber-100/70 flex items-center gap-2 font-bold cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-600/30" />
                      <span>Quyền lợi gói học & VIP</span>
                    </button>

                    {user.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('/admin');
                        }}
                        className="w-full text-left px-4 py-2 text-slate-800 hover:bg-slate-100 flex items-center gap-2 font-bold cursor-pointer border-t border-slate-100"
                      >
                        <Shield className="w-3.5 h-3.5 text-blue-600" />
                        <span>Cổng Quản trị Admin</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSettings?.();
                      }}
                      className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-t border-slate-100 font-medium"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Cài đặt hệ thống & Nút nổi</span>
                    </button>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                          onNavigate('/');
                        }}
                        className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Bắt đầu ngay
                </button>
              </div>
            )}

            {/* Mobile menu hamburger button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2.5 sm:p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer"
              aria-label="Mở menu điều hướng"
            >
              <MorphMenuClose isOpen={isMobileMenuOpen} size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-top-2 duration-150">
          {/* User Profile Card on Mobile */}
          {user ? (
            <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-11 h-11 rounded-2xl object-cover ring-2 ring-blue-500/20"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-slate-900 truncate">{user.full_name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {user.role === 'admin' ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-900 text-amber-300 rounded border border-slate-700">Admin</span>
                    ) : user.role === 'vip' || user.is_vip ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded border border-amber-300 flex items-center gap-0.5">
                        <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-600" /> VIP
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">Học viên Thường</span>
                    )}
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80 flex items-center gap-0.5">
                      <Flame className="w-3 h-3 fill-amber-500 text-amber-500" /> {profile?.streak_days ?? 3} ngày
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Profile Nav Links */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200/70 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onNavigate('/dashboard');
                  }}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <Compass className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Tổng quan</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onNavigate('/statistics');
                  }}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Thống kê</span>
                </button>
                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onNavigate('/admin');
                    }}
                    className="col-span-2 px-3 py-2 rounded-xl bg-slate-900 text-amber-300 font-bold flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                  >
                    <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Cổng Quản trị Admin</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                    onNavigate('/');
                  }}
                  className="col-span-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 hover:bg-rose-100 font-semibold flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Đăng xuất tài khoản</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2.5">
              <div className="text-xs font-bold text-slate-800">Chào mừng bạn đến với TOEIC Ra Trường</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer min-h-[44px] flex items-center justify-center"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth('register');
                  }}
                  className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer min-h-[44px] flex items-center justify-center shadow-xs"
                >
                  Bắt đầu ngay
                </button>
              </div>
            </div>
          )}

          {/* Cài đặt hệ thống on Mobile */}
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenSettings?.();
            }}
            className="w-full text-left p-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1E4E9E] flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <div>Cài đặt hệ thống & Nút nổi</div>
                <div className="text-[10px] text-slate-400 font-normal">Bật/tắt nút Gia sư AI, Tin nhắn & âm thanh</div>
              </div>
            </div>
          </button>

          {/* VIP Upgrade Banner in Mobile */}
          <div className="p-3 bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-transparent border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Crown className="w-4 h-4 fill-white/20" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Quyền lợi gói học & VIP</div>
                <div className="text-[10px] text-slate-500 truncate">Học viên thường, VIP & Admin</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigate('/payment');
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black transition-colors shadow-xs cursor-pointer"
              >
                Nâng cấp VIP
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenRBAC?.();
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Chi tiết
              </button>
            </div>
          </div>

          {/* Main Direct Skills */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
              Kỹ năng & Luyện đề
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {primaryLinks.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      handleNavClick(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200/60'
                        : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Features */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
              Mở rộng & Cá nhân hóa
            </div>
            <div className="grid grid-cols-1 gap-1">
              {secondaryLinks.map((sub) => {
                const SubIcon = sub.icon;
                return (
                  <button
                    key={sub.path}
                    type="button"
                    onClick={() => {
                      handleNavClick(sub.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <SubIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{sub.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
