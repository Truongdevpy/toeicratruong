import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Trophy,
  Flame,
  Target,
  Sparkles,
  TrendingUp,
  Search,
  Clock,
  Award,
  Heart,
  Zap,
  Info,
  X,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Crown,
  Medal,
  Users,
  Shield
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { vocabDuoService } from '../services/vocabDuoService';
import { grammarProgressService } from '../services/grammarProgressService';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { usePagination } from '../hooks/usePagination';
import { Pagination } from '../components/common/Pagination';
import { LeaderboardEntry, LeaderboardResponse, LeaderboardRules } from '../types';
import { UserProfileModal } from '../components/UserProfileModal';

interface LeaderboardPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onViewProfile?: (userId: number) => void;
  onOpenChat?: (userId?: number | null) => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  onNavigate,
  onOpenAuth,
  onViewProfile,
  onOpenChat
}) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 6 Criteria categories
  const [activeCategory, setActiveCategory] = useState<
    'score' | 'progress' | 'streak' | 'practice' | 'vocab_exp' | 'grammar_exp'
  >(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const cat = p.get('metric') || p.get('category');
      if (cat && ['score', 'progress', 'streak', 'practice', 'vocab_exp', 'grammar_exp'].includes(cat)) {
        return cat as any;
      }
    }
    return 'score';
  });

  const [activePeriod, setActivePeriod] = useState<'weekly' | 'monthly' | 'all_time'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const per = p.get('period');
      if (per && ['weekly', 'monthly', 'all_time'].includes(per)) {
        return per as any;
      }
    }
    return 'weekly';
  });
  const [activeLeague, setActiveLeague] = useState<string>('all');
  const [leagueInitialized, setLeagueInitialized] = useState(false);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Cheer state & toast notification
  const [cheeredIds, setCheeredIds] = useState<Record<number, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Rules modal & profile modal
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [rules, setRules] = useState<LeaderboardRules | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);

  // Sticky bottom bar & my-rank ref
  const myRankRef = useRef<HTMLTableRowElement>(null);
  const [isMyRankInView, setIsMyRankInView] = useState(true);

  // 300ms search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Determine user's league based on score/target
  const getUserLeague = useCallback((score?: number, target?: number): string => {
    const val = score || target || 600;
    if (val >= 800) return 'master';
    if (val >= 650) return 'advanced';
    return 'starter';
  }, []);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res: LeaderboardResponse = await api.getLeaderboard({
        category: activeCategory,
        period: activePeriod,
        league: activeLeague,
        search: debouncedSearch
      });
      setData(res);

      if (res.cheered_today && Array.isArray(res.cheered_today)) {
        const cheerMap: Record<number, boolean> = {};
        res.cheered_today.forEach((id: number) => {
          cheerMap[id] = true;
        });
        setCheeredIds(prev => ({ ...prev, ...cheerMap }));
      }

      // Always show all learners by default
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err?.message || 'Không thể tải bảng xếp hạng');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, activePeriod, activeLeague, debouncedSearch, leagueInitialized, getUserLeague]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);


  // Sync Leaderboard URL params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('metric', activeCategory);
      url.searchParams.set('period', activePeriod);
      window.history.replaceState({}, '', url.toString());
      const catLabel = categories.find((c) => c.id === activeCategory)?.label || 'Thi đua';
      document.title = `Bảng Xếp Hạng - ${catLabel} | TOEIC Ra Trường`;
    } catch {}
  }, [activeCategory, activePeriod]);

    // Auto-sync real local study XP to leaderboard
  useEffect(() => {
    if (user?.id) {
      const vXp = vocabDuoService.getTotalXp(user.id);
      const gProgress = grammarProgressService.getProgress(user.id);
      const gXp = gProgress.totalXp || 0;
      if (vXp > 0 || gXp > 0) {
        api.syncLeaderboardExp({ vocab_exp: vXp, grammar_exp: gXp }).catch(() => {});
      }
    }
  }, [user?.id]);

  // Track if current user's table row is inside visible viewport
  useEffect(() => {
    const el = myRankRef.current;
    if (!el) {
      setIsMyRankInView(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMyRankInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [data, loading]);

  const openRulesModal = async () => {
    setIsRulesOpen(true);
    if (!rules) {
      try {
        const r = await api.getLeaderboardRules();
        setRules(r);
      } catch (err) {
        console.error('Error fetching rules:', err);
      }
    }
  };

  // Anti-cheat Cheer Handler
  const handleCheer = async (entry: LeaderboardEntry) => {
    if (entry.is_me) {
      setToastMessage('Bạn không thể tự cổ vũ chính mình!');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const isAlreadyCheered =
      entry.is_cheered || cheeredIds[entry.id] || (data?.cheered_today && data.cheered_today.includes(entry.id));

    if (isAlreadyCheered) {
      setToastMessage(`Bạn đã gửi lời cổ vũ đến ${entry.full_name} hôm nay rồi!`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    try {
      if (entry.rank === 1) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      }

      setCheeredIds(prev => ({ ...prev, [entry.id]: true }));
      setToastMessage(`Đã gửi tràng pháo tay cổ vũ đến ${entry.full_name}! ❤️`);
      setTimeout(() => setToastMessage(null), 3000);

      setData(prev => {
        if (!prev) return prev;
        const updateList = (list: LeaderboardEntry[]) =>
          list.map(item =>
            item.id === entry.id
              ? { ...item, cheer_count: item.cheer_count + 1, is_cheered: true }
              : item
          );

        return {
          ...prev,
          podium: updateList(prev.podium),
          rankings: updateList(prev.rankings),
          my_rank:
            prev.my_rank && prev.my_rank.id === entry.id
              ? { ...prev.my_rank, cheer_count: prev.my_rank.cheer_count + 1, is_cheered: true }
              : prev.my_rank,
          cheered_today: [...(prev.cheered_today || []), entry.id]
        };
      });

      await api.cheerLeaderboardUser(entry.id);
    } catch (err: any) {
      console.error('Cheer failed:', err);
      const msg = err?.message || 'Không thể gửi cổ vũ lúc này';
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const allDisplayRankings = useMemo<LeaderboardEntry[]>(() => {
    const list: LeaderboardEntry[] = debouncedSearch
      ? [...(data?.podium || []), ...(data?.rankings || [])]
      : data?.rankings || [];
    if (!debouncedSearch.trim()) return list;
    const q = debouncedSearch.toLowerCase().trim();
    return list.filter(
      (r: LeaderboardEntry) =>
        r.full_name.toLowerCase().includes(q) ||
        r.school_or_org.toLowerCase().includes(q) ||
        Boolean(r.target_score && r.target_score.toString().includes(q))
    );
  }, [data, debouncedSearch]);

  const lbPagination = usePagination<LeaderboardEntry>({
    data: allDisplayRankings,
    initialPage: 1,
    initialPageSize: 15,
    syncUrl: false,
    // scrollToTopOnPageChange: true,
    // scrollTargetId: 'leaderboard-table-top'
  });

  useEffect(() => {
    lbPagination.resetPage();
  }, [activeCategory, activePeriod, activeLeague, debouncedSearch]);

  const scrollToMyRank = () => {
    if (data?.my_rank) {
      const myIdx = allDisplayRankings.findIndex((r: LeaderboardEntry) => r.id === data.my_rank?.id);
      if (myIdx >= 0) {
        const targetPage = Math.floor(myIdx / (typeof lbPagination.pageSize === "number" ? lbPagination.pageSize : 15)) + 1;
        if (targetPage !== lbPagination.currentPage) {
          lbPagination.setPage(targetPage);
        }
      }
    }
    setTimeout(() => {
      myRankRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  };

  const categories = [
    { id: 'score', label: 'Điểm TOEIC', icon: Trophy, desc: 'Điểm thi ETS & Năng lực chuẩn hóa' },
    { id: 'vocab_exp', label: 'EXP Từ vựng', icon: BookOpen, desc: 'Điểm rèn luyện từ vựng' },
    { id: 'grammar_exp', label: 'EXP Ngữ pháp', icon: GraduationCap, desc: 'Điểm rèn luyện ngữ pháp' },
    { id: 'streak', label: 'Chuỗi ngày', icon: Flame, desc: 'Kỷ luật chuỗi ngày học liên tục' },
    { id: 'practice', label: 'Câu đã luyện', icon: Zap, desc: 'Tổng số câu hỏi hoàn thành' },
    { id: 'progress', label: 'Tiến bộ', icon: TrendingUp, desc: 'Tăng trưởng điểm số cao nhất' }
  ];

  const getDynamicColumnHeader = (cat: string) => {
    switch (cat) {
      case 'score':
        return 'Điểm TOEIC';
      case 'progress':
      case 'growth':
        return 'Điểm tăng';
      case 'streak':
        return 'Chuỗi ngày';
      case 'practice':
        return 'Câu đã luyện';
      case 'vocab_exp':
        return 'EXP Từ vựng';
      case 'grammar_exp':
        return 'EXP Ngữ pháp';
      default:
        return 'Điểm số';
    }
  };

  const userLeagueId = useMemo(
    () => getUserLeague(data?.my_rank?.current_score, data?.my_rank?.target_score),
    [data?.my_rank, getUserLeague]
  );

﻿  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Compact Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500 fill-amber-400 shrink-0" />
                <span>Bảng Xếp Hạng Thi Đua</span>
              </h1>
              {/* Data source label badge - GAMI-02 real data */}

                <span
                  title="Dữ liệu đồng bộ trực tiếp theo thời gian thực từ máy chủ."
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {data?.data_source_label || 'Dữ liệu thời gian thực'}
                </span>
              
            </div>
            <p className="text-xs text-slate-600 font-medium">
              <strong className="text-slate-800">{data?.period_label || 'Tuần thi đua hiện tại'}</strong> • Đếm ngược kết thúc: <strong className="text-blue-700">{data?.reset_countdown || '1 ngày 12 giờ'}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={openRulesModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <Info className="w-4 h-4 text-blue-600" />
            <span>Quy chế tính EXP & Phần thưởng</span>
          </button>
        </div>

        {/* Compact User Rank Status Card */}
        {user ? (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-4 sm:p-5 transition-all">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              {/* User Bio */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={data?.my_rank?.avatar_url || user.avatar_url || 'https://api.dicebear.com/9.x/avataaars/svg?seed=Me'}
                    alt={user.full_name}
                    onClick={() => setSelectedProfileId(data?.my_rank?.id || (user as any).id)}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-3 ring-blue-500/20 shadow-xs cursor-pointer hover:opacity-90 hover:ring-blue-500/40 transition-all"
                    title="Xem hồ sơ cá nhân"
                  />
                  <div className="absolute -bottom-1.5 -right-1.5 bg-blue-600 text-white font-black text-xs px-2 py-0.5 rounded-full shadow-md border-2 border-white">
                    #{data?.my_rank?.rank || 1}
                  </div>
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      onClick={() => setSelectedProfileId(data?.my_rank?.id || (user as any).id)}
                      className="text-base font-black text-slate-900 cursor-pointer hover:text-blue-600 transition-colors truncate"
                      title="Xem hồ sơ cá nhân"
                    >
                      {data?.my_rank?.full_name || user.full_name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                      <Award className="w-3 h-3" />
                      {data?.my_rank?.badge || 'Chiến Binh Chăm Chỉ'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium truncate">
                    {data?.my_rank?.school_or_org || 'Học viên TOEIC AI'} • Mục tiêu {data?.my_rank?.target_score || 650} điểm
                  </p>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 pt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{data?.my_rank?.percentile_label || 'Hạng đang cập nhật'}</span>
                  </div>
                </div>
              </div>

              {/* 4 Equal Stats Columns */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50/90 p-3 sm:p-4 rounded-xl border border-slate-200/80 flex-1 lg:max-w-xl">
                {/* Stat 1: Điểm TOEIC */}
                <div className="flex flex-col justify-between">
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                    <span>{data?.my_rank?.score_status === 'insufficient_data' ? 'Điểm TOEIC' : 'Điểm ước tính'}</span>
                    <span
                      title={data?.my_rank?.score_explanation || 'Điểm ước tính dựa trên kết quả thi thử ETS và độ chính xác làm bài.'}
                      className="cursor-help text-slate-500 hover:text-blue-600"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="mt-1">
                    {data?.my_rank?.score_status === 'insufficient_data' ? (
                      <div className="space-y-1">
                        <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                          Chưa đủ dữ liệu
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigate('/placement')}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 underline block cursor-pointer"
                        >
                          Làm bài đánh giá năng lực →
                        </button>
                      </div>
                    ) : (
                      <div className="text-base sm:text-lg font-black text-slate-900">
                        {data?.my_rank?.current_score || 0} <span className="text-xs font-bold text-slate-500">điểm</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stat 2: Chuỗi học tập */}
                <div className="flex flex-col justify-between">
                  <div className="text-xs font-semibold text-slate-600">Chuỗi học tập</div>
                  <div className="text-base sm:text-lg font-black text-orange-600 mt-1 flex items-center gap-1">
                    <Flame className="w-4 h-4 fill-orange-500 text-orange-500 shrink-0" />
                    <span>{data?.my_rank?.streak_days ?? 0} ngày</span>
                  </div>
                </div>

                {/* Stat 3: Câu hoàn thành */}
                <div className="flex flex-col justify-between">
                  <div className="text-xs font-semibold text-slate-600">Câu hoàn thành</div>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                    {data?.my_rank?.questions_count || 0} <span className="text-xs font-bold text-slate-500">câu</span>
                  </div>
                </div>

                {/* Stat 4: EXP */}
                <div className="flex flex-col justify-between">
                  <div className="text-xs font-semibold text-slate-600">EXP</div>
                  <div className="text-base sm:text-lg font-black text-blue-600 mt-1">
                    {data?.my_rank?.exp_points?.toLocaleString() || 0} <span className="text-xs font-bold text-blue-500">EXP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Motivation banner: Distance to next rank */}
            {data?.my_rank && data.my_rank.rank > 1 && data.my_rank.points_to_next && data.my_rank.next_user_name && (
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-ping"></span>
                  <span>
                    Chỉ còn <strong>{data.my_rank.points_to_next} {activeCategory === 'streak' ? 'ngày' : activeCategory === 'practice' ? 'câu' : activeCategory === 'vocab_exp' ? 'EXP Từ vựng' : activeCategory === 'grammar_exp' ? 'EXP Ngữ pháp' : activeCategory === 'progress' ? 'điểm tăng' : 'điểm'}</strong> nữa để vượt qua{' '}
                    <strong className="text-blue-600">{data.my_rank.next_user_name}</strong> và thăng lên{' '}
                    <strong>Hạng #{data.my_rank.rank - 1}</strong>!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={scrollToMyRank}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  Xem vị trí trong danh sách ↓
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Bạn chưa ghi danh vào Bảng Xếp Hạng tuần này!
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đăng nhập tài khoản để nhận thứ hạng, danh hiệu thi đua và tranh tài cùng cộng đồng.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              Đăng nhập ngay
            </button>
          </div>
        )}

﻿        {/* UNIFIED CONTROLS TOOLBAR: Criteria Tabs + Period Filters + League Filters + Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
          {/* Row 1: Criteria Tabs Pills */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span>Tiêu chí xếp hạng</span>
              <span className="text-[11px] font-normal text-slate-500 lowercase">
                chọn một mục để xem bảng vàng tương ứng
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id as any)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                    title={cat.desc}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Period + League + Search Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            {/* Period Filters */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit shrink-0">
              {[
                { id: 'weekly', label: 'Tuần này' },
                { id: 'monthly', label: 'Tháng này' },
                { id: 'all_time', label: 'Toàn thời gian' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePeriod(p.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activePeriod === p.id
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Debounced Search Input */}
            <div className="relative w-full lg:w-64 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm tên học viên hoặc CLB..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sub-strip info */}
          <div className="text-xs text-slate-600 font-medium flex items-center justify-between border-t border-slate-100 pt-2.5">
            <div>
              Đang hiển thị: <strong className="text-slate-800">{data?.period_label}</strong> • Tiêu chí:{' '}
              <strong className="text-blue-600">
                {categories.find((c) => c.id === activeCategory)?.label}
              </strong>
            </div>
            <div>
              Tổng số:{' '}
              <strong className="text-slate-800">
                {data?.total_participants || 0} học viên
              </strong>
            </div>
          </div>
        </div>

﻿        {/* TOP 3 PODIUM (BỤC VINH DANH) */}
        {data && data.podium && data.podium.length >= 3 && !debouncedSearch && (
          <div className="bg-gradient-to-b from-indigo-900/5 via-white to-white rounded-3xl border border-indigo-100/80 p-4 sm:p-6 shadow-xs">
            <div className="text-center max-w-md mx-auto mb-5 sm:mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                BỤC VINH DANH TOP 3
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Những Gương Mặt Dẫn Đầu
              </h2>
            </div>

            {/* Mobile View: Vertical Compact List (<640px) */}
            <div className="sm:hidden space-y-2.5 max-w-sm mx-auto">
              {/* Rank 1 */}
              <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-300 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    👑 #1
                  </div>
                  <img
                    src={data.podium[0].avatar_url}
                    alt={data.podium[0].full_name}
                    onClick={() => setSelectedProfileId(data.podium[0].id)}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-amber-400 shrink-0 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div onClick={() => setSelectedProfileId(data.podium[0].id)} className="text-xs font-black text-slate-900 truncate cursor-pointer hover:text-blue-600">
                      {data.podium[0].full_name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{data.podium[0].school_or_org}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-amber-900">{data.podium[0].primary_value}</div>
                  <button
                    type="button"
                    onClick={() => handleCheer(data.podium[0])}
                    className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 text-rose-600 text-[11px] font-bold border border-amber-200"
                  >
                    <Heart className={`w-3 h-3 ${cheeredIds[data.podium[0].id] || data.podium[0].is_cheered ? 'fill-rose-500' : ''}`} />
                    <span>{data.podium[0].cheer_count}</span>
                  </button>
                </div>
              </div>

              {/* Rank 2 */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-300 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                    🥈 #2
                  </div>
                  <img
                    src={data.podium[1].avatar_url}
                    alt={data.podium[1].full_name}
                    onClick={() => setSelectedProfileId(data.podium[1].id)}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-300 shrink-0 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div onClick={() => setSelectedProfileId(data.podium[1].id)} className="text-xs font-black text-slate-900 truncate cursor-pointer hover:text-blue-600">
                      {data.podium[1].full_name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{data.podium[1].school_or_org}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-slate-800">{data.podium[1].primary_value}</div>
                  <button
                    type="button"
                    onClick={() => handleCheer(data.podium[1])}
                    className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 text-rose-600 text-[11px] font-bold border border-slate-200"
                  >
                    <Heart className={`w-3 h-3 ${cheeredIds[data.podium[1].id] || data.podium[1].is_cheered ? 'fill-rose-500' : ''}`} />
                    <span>{data.podium[1].cheer_count}</span>
                  </button>
                </div>
              </div>

              {/* Rank 3 */}
              <div className="bg-gradient-to-r from-amber-50/50 to-orange-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                    🥉 #3
                  </div>
                  <img
                    src={data.podium[2].avatar_url}
                    alt={data.podium[2].full_name}
                    onClick={() => setSelectedProfileId(data.podium[2].id)}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-amber-600/40 shrink-0 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div onClick={() => setSelectedProfileId(data.podium[2].id)} className="text-xs font-black text-slate-900 truncate cursor-pointer hover:text-blue-600">
                      {data.podium[2].full_name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{data.podium[2].school_or_org}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-amber-900">{data.podium[2].primary_value}</div>
                  <button
                    type="button"
                    onClick={() => handleCheer(data.podium[2])}
                    className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 text-rose-600 text-[11px] font-bold border border-amber-200"
                  >
                    <Heart className={`w-3 h-3 ${cheeredIds[data.podium[2].id] || data.podium[2].is_cheered ? 'fill-rose-500' : ''}`} />
                    <span>{data.podium[2].cheer_count}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop View: Compact 3-Column Podium Stand (>=640px) */}
            <div className="hidden sm:grid grid-cols-3 gap-4 items-end max-w-3xl mx-auto pt-2">
              {/* Rank 2 (Silver) */}
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <img
                    src={data.podium[1].avatar_url}
                    alt={data.podium[1].full_name}
                    onClick={() => setSelectedProfileId(data.podium[1].id)}
                    className="w-16 h-16 rounded-2xl object-cover ring-4 ring-slate-300 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                  />
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-600 text-white font-black text-[11px] px-2 py-0.5 rounded-full shadow-md">
                    #2
                  </span>
                </div>
                <div className="text-center mt-2 space-y-0.5">
                  <div
                    onClick={() => setSelectedProfileId(data.podium[1].id)}
                    className="text-xs font-black text-slate-900 hover:text-blue-600 cursor-pointer truncate max-w-[140px]"
                  >
                    {data.podium[1].full_name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                    {data.podium[1].school_or_org}
                  </div>
                  <div className="text-xs font-black text-slate-800 pt-0.5">
                    {data.podium[1].primary_value}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheer(data.podium[1])}
                  className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  <Heart className={`w-3.5 h-3.5 ${cheeredIds[data.podium[1].id] || data.podium[1].is_cheered ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{data.podium[1].cheer_count}</span>
                </button>
                {/* Silver Stand */}
                <div className="w-full h-16 bg-gradient-to-t from-slate-300 to-slate-200 rounded-t-2xl mt-3 flex flex-col items-center justify-center text-slate-700 font-black text-sm shadow-inner">
                  <span>#2</span>
                  <span className="text-[10px] font-bold text-slate-600 tracking-wider">Á QUÂN 1</span>
                </div>
              </div>

              {/* Rank 1 (Gold - Center) */}
              <div className="flex flex-col items-center">
                <Crown className="w-6 h-6 text-amber-500 fill-amber-400 animate-bounce mb-1" />
                <div className="relative mb-2">
                  <img
                    src={data.podium[0].avatar_url}
                    alt={data.podium[0].full_name}
                    onClick={() => setSelectedProfileId(data.podium[0].id)}
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-amber-400 shadow-xl cursor-pointer hover:opacity-90 transition-opacity"
                  />
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white font-black text-xs px-2.5 py-0.5 rounded-full shadow-md">
                    #1
                  </span>
                </div>
                <div className="text-center mt-2 space-y-0.5">
                  <div
                    onClick={() => setSelectedProfileId(data.podium[0].id)}
                    className="text-sm font-black text-slate-900 hover:text-blue-600 cursor-pointer truncate max-w-[160px]"
                  >
                    {data.podium[0].full_name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                    {data.podium[0].school_or_org}
                  </div>
                  <div className="text-sm font-black text-amber-600 pt-0.5">
                    {data.podium[0].primary_value}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheer(data.podium[0])}
                  className="mt-1.5 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-50 hover:bg-rose-50 text-amber-800 hover:text-rose-600 text-xs font-bold border border-amber-200 transition-colors cursor-pointer"
                >
                  <Heart className={`w-3.5 h-3.5 ${cheeredIds[data.podium[0].id] || data.podium[0].is_cheered ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{data.podium[0].cheer_count}</span>
                </button>
                {/* Gold Stand */}
                <div className="w-full h-22 bg-gradient-to-t from-amber-400 to-amber-300 rounded-t-2xl mt-3 flex flex-col items-center justify-center text-amber-950 font-black text-base shadow-inner">
                  <span>#1</span>
                  <span className="text-[10px] font-bold text-amber-900 tracking-wider">QUÁN QUÂN</span>
                </div>
              </div>

              {/* Rank 3 (Bronze) */}
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <img
                    src={data.podium[2].avatar_url}
                    alt={data.podium[2].full_name}
                    onClick={() => setSelectedProfileId(data.podium[2].id)}
                    className="w-16 h-16 rounded-2xl object-cover ring-4 ring-amber-700/40 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                  />
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-800 text-white font-black text-[11px] px-2 py-0.5 rounded-full shadow-md">
                    #3
                  </span>
                </div>
                <div className="text-center mt-2 space-y-0.5">
                  <div
                    onClick={() => setSelectedProfileId(data.podium[2].id)}
                    className="text-xs font-black text-slate-900 hover:text-blue-600 cursor-pointer truncate max-w-[140px]"
                  >
                    {data.podium[2].full_name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                    {data.podium[2].school_or_org}
                  </div>
                  <div className="text-xs font-black text-amber-900 pt-0.5">
                    {data.podium[2].primary_value}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheer(data.podium[2])}
                  className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  <Heart className={`w-3.5 h-3.5 ${cheeredIds[data.podium[2].id] || data.podium[2].is_cheered ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{data.podium[2].cheer_count}</span>
                </button>
                {/* Bronze Stand */}
                <div className="w-full h-12 bg-gradient-to-t from-amber-600/60 to-amber-500/50 rounded-t-2xl mt-3 flex flex-col items-center justify-center text-amber-950 font-black text-sm shadow-inner">
                  <span>#3</span>
                  <span className="text-[10px] font-bold text-amber-950 tracking-wider">Á QUÂN 2</span>
                </div>
              </div>
            </div>
          </div>
        )}

﻿        {/* DETAILED RANKINGS TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Bảng Điểm Xếp Hạng Chi Tiết
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cập nhật tự động sau mỗi lượt nộp bài luyện tập và thi thử ETS
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Thời gian thực
                </span>
              
            </div>
          </div>

          <div id="leaderboard-table-top" />

          {error ? (
            <div className="py-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Không thể tải dữ liệu bảng xếp hạng</p>
              <p className="text-xs text-slate-500">{error}</p>
              <button
                type="button"
                onClick={fetchLeaderboard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : loading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-50/90 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200/70">
                      <th className="py-3.5 px-4 text-center w-20">Hạng</th>
                      <th className="py-3.5 px-4">Học viên</th>
                      <th className="py-3.5 px-4 text-center">Chuỗi ngày</th>
                      <th className="py-3.5 px-4 text-center">Câu đã luyện</th>
                      <th className="py-3.5 px-4 text-center">Độ chính xác</th>
                      <th className="py-3.5 px-4 text-right">
                        {getDynamicColumnHeader(activeCategory)}
                      </th>
                      <th className="py-3.5 px-4 text-center w-24">Cổ vũ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {lbPagination.paginatedData.map((entry: LeaderboardEntry) => {
                      const isMe = entry.is_me;
                      const isAlreadyCheered =
                        entry.is_cheered || cheeredIds[entry.id] || (data?.cheered_today && data.cheered_today.includes(entry.id));

                      return (
                        <tr
                          key={entry.id}
                          ref={isMe ? myRankRef : null}
                          className={`transition-all duration-200 ${
                            isMe
                              ? 'bg-blue-50/95 border-l-4 border-blue-600 font-semibold shadow-xs ring-1 ring-blue-500/20'
                              : 'hover:bg-slate-50/90'
                          }`}
                        >
                          {/* Rank Badge & Horizontal Change Arrow */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 font-bold">
                              <span
                                className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                                  entry.rank === 1
                                    ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-400'
                                    : entry.rank === 2
                                    ? 'bg-slate-200 text-slate-800'
                                    : entry.rank === 3
                                    ? 'bg-amber-50 text-amber-900 border border-amber-300'
                                    : entry.rank <= 10
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {entry.rank}
                              </span>
                              {entry.rank_change > 0 ? (
                                <span
                                  className="inline-flex items-center text-xs font-black text-emerald-600 gap-0.5 animate-slide-up duration-200"
                                  aria-label={`Tăng ${entry.rank_change} hạng`}
                                  title={`Tăng ${entry.rank_change} hạng`}
                                >
                                  <ArrowUp className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>{entry.rank_change}</span>
                                </span>
                              ) : entry.rank_change < 0 ? (
                                <span
                                  className="inline-flex items-center text-xs font-black text-rose-500 gap-0.5 animate-slide-down duration-200"
                                  aria-label={`Giảm ${Math.abs(entry.rank_change)} hạng`}
                                  title={`Giảm ${Math.abs(entry.rank_change)} hạng`}
                                >
                                  <ArrowDown className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>{Math.abs(entry.rank_change)}</span>
                                </span>
                              ) : (
                                <span
                                  className="text-slate-400 text-xs font-bold px-1"
                                  aria-label="Giữ nguyên hạng"
                                  title="Giữ nguyên hạng"
                                >
                                  -
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Student Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={entry.avatar_url}
                                alt={entry.full_name}
                                onClick={() => setSelectedProfileId(entry.id)}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 cursor-pointer hover:opacity-85 hover:ring-2 hover:ring-blue-400 transition-all"
                                title="Xem hồ sơ học viên"
                              />
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    onClick={() => setSelectedProfileId(entry.id)}
                                    className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer transition-colors truncate"
                                    title="Xem hồ sơ học viên"
                                  >
                                    {entry.full_name}
                                  </span>
                                  {isMe && (
                                    <span className="bg-blue-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-md shrink-0">
                                      Bạn
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-600 truncate">
                                  {entry.school_or_org}
                                </div>
                                <div className="text-[11px] font-semibold text-slate-500">
                                  {entry.badge}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Streak */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md text-xs">
                              <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500 shrink-0" />
                              <span>{entry.streak_days} ngày</span>
                            </div>
                          </td>

                          {/* Questions completed */}
                          <td className="py-3.5 px-4 text-center font-bold text-slate-800 text-xs">
                            {entry.questions_count} câu
                          </td>

                          {/* Accuracy */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="space-y-1 max-w-[90px] mx-auto">
                              <div className="text-xs font-bold text-slate-800">
                                {entry.accuracy_pct}%
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{ width: `${Math.min(100, entry.accuracy_pct)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Primary Metric based on active category */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="text-sm font-black text-blue-600">
                              {entry.primary_value}
                            </div>
                            {activeCategory !== 'vocab_exp' && activeCategory !== 'grammar_exp' && (
                              <div className="text-[11px] text-slate-400 font-medium">
                                {entry.exp_points.toLocaleString()} EXP tổng
                              </div>
                            )}
                          </td>

                          {/* Anti-cheat Cheer Button */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleCheer(entry)}
                              disabled={isMe || isAlreadyCheered}
                              aria-label={
                                isMe
                                  ? 'Không thể tự cổ vũ chính mình'
                                  : isAlreadyCheered
                                  ? 'Đã cổ vũ hôm nay'
                                  : `Cổ vũ ${entry.full_name}`
                              }
                              title={
                                isMe
                                  ? 'Không thể tự cổ vũ chính mình'
                                  : isAlreadyCheered
                                  ? 'Đã cổ vũ hôm nay'
                                  : `Cổ vũ ${entry.full_name}`
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isMe
                                  ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                                  : isAlreadyCheered
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200 cursor-default'
                                  : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 hover:scale-105 active:scale-95'
                              }`}
                            >
                              <Heart
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isAlreadyCheered ? 'fill-rose-500 text-rose-500' : ''
                                }`}
                              />
                              <span>{entry.cheer_count}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Empty State */}
                    {allDisplayRankings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center space-y-2">
                          <Users className="w-8 h-8 text-slate-400 mx-auto" />
                          <div className="text-sm font-bold text-slate-700">Chưa có ai trong nhóm này</div>
                          <p className="text-xs text-slate-500">
                            Hãy là người đầu tiên tham gia thi đua hoặc chuyển sang bảng tất cả học viên.
                          </p>
                          {activeLeague !== 'all' && (
                            <button
                              type="button"
                              onClick={() => setActiveLeague('all')}
                              className="mt-2 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Xem tất cả học viên</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Leaderboard Pagination */}
              {allDisplayRankings.length > 0 && (
                <Pagination
                  currentPage={lbPagination.currentPage}
                  totalPages={lbPagination.totalPages}
                  totalItems={lbPagination.totalItems}
                  pageSize={lbPagination.pageSize}
                  onPageChange={lbPagination.setPage}
                  onPageSizeChange={lbPagination.setPageSize}
                  pageSizeOptions={[15, 30, 50, 100, 200, 'all']}
                  itemLabel="học viên"
                  showPageSizeSelector={true}
                />
              )}
            </>
          )}
        </div>
      </div>

﻿      {/* STICKY BOTTOM BAR: user row quick access when row is not in viewport */}
      {data?.my_rank && !isMyRankInView && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
              #{data.my_rank.rank}
            </div>
            <img
              src={data.my_rank.avatar_url}
              alt={data.my_rank.full_name}
              className="w-8 h-8 rounded-xl object-cover border border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm truncate">{data.my_rank.full_name}</span>
                <span className="bg-blue-600/80 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0">Bạn</span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {data.my_rank.percentile_label} • {data.my_rank.primary_value}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={scrollToMyRank}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Vị trí của tôi</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Rules & Rewards Modal */}
      {isRulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Quy Chế Tính EXP & Cơ Cấu Giải Thưởng
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hệ thống điểm rèn luyện và chính sách thi đua học viên
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRulesOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6 text-xs text-slate-700 leading-relaxed">
              {/* Scoring System */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Cách Tính Điểm Rèn Luyện (EXP)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(rules?.scoring_system || [
                    { activity: 'Làm đề thi thử ETS (Full Test)', exp: '+100 EXP', desc: 'Hoàn thành 200 câu thi chuẩn' },
                    { activity: 'Luyện tập theo Part', exp: '+10 EXP / câu', desc: 'Làm đúng câu hỏi luyện tập' },
                    { activity: 'Học từ vựng theo Lộ trình Chinh phục', exp: '+15 EXP / bài', desc: 'Hoàn thành 1 bài thẻ từ vựng' },
                    { activity: 'Học ngữ pháp ETS', exp: '+20 EXP / bài', desc: 'Hoàn thành bài tập lý thuyết' },
                    { activity: 'Duy trì Streak mỗi ngày', exp: '+25 EXP / ngày', desc: 'Đăng nhập và luyện tập đều đặn' },
                    { activity: 'Đạt điểm tuyệt đối đề thi', exp: '+150 EXP thưởng', desc: 'Đạt độ chính xác 95% trở lên' },
                  ]).map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                      <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                        <span>{item.activity}</span>
                        <span className="text-blue-600 font-black">{item.exp}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rewards */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Phần Thưởng Thi Đua Hàng Tuần
                </h4>
                <div className="space-y-2">
                  {(rules?.rewards || [
                    { rank: 'Top 1 (Quán Quân)', reward: 'Kỷ Niệm Chương Vàng TOEIC + 1 Năm Trợ Lý AI Pro + 1000 Diamond' },
                    { rank: 'Top 2 (Á Quân 1)', reward: 'Huy Chương Bạc + 6 Tháng Trợ Lý AI Pro + 500 Diamond' },
                    { rank: 'Top 3 (Á Quân 2)', reward: 'Huy Chương Đồng + 3 Tháng Trợ Lý AI Pro + 300 Diamond' },
                    { rank: 'Top 4 - 10', reward: 'Huy hiệu Vinh Danh + 1 Tháng Trợ Lý AI Pro + 100 Diamond' },
                  ]).map((rew, idx) => (
                    <div key={idx} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 flex items-center justify-between gap-3">
                      <span className="font-bold text-amber-950 shrink-0">{rew.rank}</span>
                      <span className="text-slate-700 text-right">{rew.reward}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset Cycle */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/60 space-y-1">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Chu Kỳ Reset & Công Bố Giải Thưởng
                </div>
                <p className="text-[11px] text-slate-600">
                  {rules?.reset_cycle || 'Bảng xếp hạng tuần được reset vào đúng 23:59:59 Chủ Nhật hàng tuần theo múi giờ Việt Nam (UTC+7). Phần thưởng được tự động gửi vào hòm thư cá nhân trong vòng 24 giờ sau khi tổng kết.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Public Profile Modal */}
      {selectedProfileId && (
        <UserProfileModal
          isOpen={true}
          onClose={() => setSelectedProfileId(null)}
          userId={selectedProfileId}
          isLeaderboardProfile={true}
          onOpenChat={onOpenChat as any}
        />
      )}
    </div>
  );
};

