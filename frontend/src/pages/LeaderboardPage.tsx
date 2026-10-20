import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LeaderboardEntry, LeaderboardResponse, LeaderboardRules } from '../types';
import { UserProfileModal } from '../components/UserProfileModal';

interface LeaderboardPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onViewProfile?: (userId: number) => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ onNavigate, onOpenAuth, onViewProfile }) => {
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'score' | 'streak' | 'practice' | 'growth'>('score');
  const [activePeriod, setActivePeriod] = useState<'weekly' | 'monthly' | 'all_time'>('weekly');
  const [activeLeague, setActiveLeague] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cheeredIds, setCheeredIds] = useState<Record<number, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [rules, setRules] = useState<LeaderboardRules | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);

  const myRankRef = useRef<HTMLTableRowElement>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getLeaderboard({
        category: activeCategory,
        period: activePeriod,
        league: activeLeague,
        search: searchQuery
      });
      setData(res);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, activePeriod, activeLeague, searchQuery]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

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

  const handleCheer = async (entry: LeaderboardEntry) => {
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
          list.map(item => item.id === entry.id ? { ...item, cheer_count: item.cheer_count + 1 } : item);

        return {
          ...prev,
          podium: updateList(prev.podium),
          rankings: updateList(prev.rankings),
          my_rank: prev.my_rank && prev.my_rank.id === entry.id
            ? { ...prev.my_rank, cheer_count: prev.my_rank.cheer_count + 1 }
            : prev.my_rank
        };
      });

      await api.cheerLeaderboardUser(entry.id);
    } catch (err) {
      console.error('Cheer failed:', err);
    }
  };

  const scrollToMyRank = () => {
    if (myRankRef.current) {
      myRankRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const categories = [
    { id: 'score', label: 'Điểm số TOEIC', icon: Trophy, desc: 'Điểm thi ETS & Năng lực chuẩn hóa' },
    { id: 'streak', label: 'Chuỗi Chăm Chỉ', icon: Flame, desc: 'Kỷ luật chuỗi ngày học liên tục' },
    { id: 'practice', label: 'Siêu Luyện Câu', icon: Zap, desc: 'Tổng số câu hỏi & EXP rèn luyện' },
    { id: 'growth', label: 'Bứt Phá Điểm', icon: TrendingUp, desc: 'Tăng trưởng điểm số cao nhất' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Compact Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500 fill-amber-400" />
              <span>Bảng Xếp Hạng Thi Đua</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Đua top tuần chuẩn ETS • Đếm ngược kết thúc: <strong className="text-slate-700">{data?.reset_countdown || '1 ngày 14 giờ'}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={openRulesModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <Info className="w-4 h-4 text-blue-600" />
            Quy chế tính EXP & Phần thưởng
          </button>
        </div>
        {/* User Rank Status Card */}
        {user ? (
          <div className="bg-white rounded-2xl border border-blue-200/80 shadow-xl p-5 sm:p-6 transition-all hover:shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="relative shrink-0">
                  <img
                    src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={user.full_name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-blue-500/20 shadow-md"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white font-black text-xs px-2 py-0.5 rounded-full shadow-md border-2 border-white">
                    #{data?.my_rank?.rank || 17}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base sm:text-lg font-black text-slate-900">
                      {user.full_name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                      <Award className="w-3 h-3" />
                      {data?.my_rank?.badge || 'Chiến Binh Chăm Chỉ'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {data?.my_rank?.school_or_org || 'Học viên TOEIC AI'} • Mục tiêu {data?.my_rank?.target_score || 650} điểm
                  </p>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 pt-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>{data?.my_rank?.percentile_label || 'Top 19% học viên toàn quốc'}</span>
                  </div>
                </div>
              </div>

              {/* Stats & Next Rank Challenge */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/80">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Điểm thi TOEIC</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {data?.my_rank?.current_score || 620}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Chuỗi học tập</div>
                  <div className="text-base font-black text-orange-600 mt-0.5 flex items-center gap-1">
                    <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
                    {data?.my_rank?.streak_days ?? 0} ngày
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Câu hoàn thành</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {data?.my_rank?.questions_count || 348}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Điểm rèn luyện EXP</div>
                  <div className="text-base font-black text-blue-600 mt-0.5">
                    {data?.my_rank?.exp_points?.toLocaleString() || '3,425'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate('/mock-tests')}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Target className="w-4 h-4" />
                  Luyện đề ETS bứt phá
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/practice')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                  Luyện câu tích lũy EXP
                </button>
              </div>
            </div>

            {/* Distance to next rank alert */}
            {data?.my_rank && data.my_rank.rank > 1 && data.my_rank.next_user_name && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>
                    Chỉ còn <strong>{data.my_rank.points_to_next} điểm</strong> nữa để vượt qua{' '}
                    <strong className="text-blue-600">{data.my_rank.next_user_name}</strong> và thăng lên{' '}
                    <strong>Hạng #{data.my_rank.rank - 1}</strong>!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={scrollToMyRank}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                >
                  Xem vị trí trong danh sách ↓
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
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

        {/* Category Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 ring-2 ring-blue-500/30'
                    : 'bg-white text-slate-800 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-black tracking-tight">{cat.label}</div>
                  <div className={`text-[11px] line-clamp-1 mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                    {cat.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters Bar: Period + League + Search */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Period Filters */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setActivePeriod('weekly')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activePeriod === 'weekly'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tuần này
              </button>
              <button
                type="button"
                onClick={() => setActivePeriod('monthly')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activePeriod === 'monthly'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tháng này
              </button>
              <button
                type="button"
                onClick={() => setActivePeriod('all_time')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activePeriod === 'all_time'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Toàn thời gian
              </button>
            </div>

            {/* League Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Phân hạng:
              </span>
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'master', label: 'CLB Master 800+' },
                { id: 'advanced', label: 'CLB Bứt Phá 650+' },
                { id: 'starter', label: 'CLB Khởi Động <650' },
              ].map((lg) => (
                <button
                  key={lg.id}
                  type="button"
                  onClick={() => setActiveLeague(lg.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    activeLeague === lg.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lg.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm học viên hoặc trường..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium flex items-center justify-between border-t border-slate-100 pt-3">
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

        {/* Top 3 Podium (Bục Vinh Danh) */}
        {data && data.podium && data.podium.length >= 3 && !searchQuery && (
          <div className="bg-gradient-to-b from-indigo-900/10 via-white to-white rounded-3xl border border-indigo-100 p-6 sm:p-8 shadow-xs">
            <div className="text-center max-w-md mx-auto mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                BỤC VINH DANH TOP 3
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Những Gương Mặt Dẫn Đầu
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Thành tích xuất sắc nhất trong chặng thi đua hiện tại
              </p>
            </div>

            {/* Podium Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto pt-4">
              
              {/* Rank 2 (Silver) */}
              <div className="order-2 md:order-1 flex flex-col items-center">
                <div className="relative group">
                  <div className="relative">
                    <img
                      src={data.podium[1].avatar_url}
                      alt={data.podium[1].full_name}
                      onClick={() => setSelectedProfileId(data.podium[1].id)}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-slate-300 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute -top-3 -right-2 w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-slate-700 font-black text-sm shadow-md">
                      2
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-center space-y-1">
                  <div className="font-bold text-sm text-slate-900 flex items-center justify-center gap-1">
                    {data.podium[1].full_name}
                    {data.podium[1].is_me && (
                      <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-sm">Bạn</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 max-w-[180px]">
                    {data.podium[1].school_or_org}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                    {data.podium[1].badge}
                  </div>
                  <div className="text-lg font-black text-slate-800 pt-1">
                    {data.podium[1].primary_value}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCheer(data.podium[1])}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  <Heart className={`w-3.5 h-3.5 ${cheeredIds[data.podium[1].id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{data.podium[1].cheer_count}</span>
                </button>

                {/* Podium Stand */}
                <div className="w-full mt-4 h-24 sm:h-28 bg-gradient-to-b from-slate-200 to-slate-300 rounded-t-2xl flex flex-col items-center justify-center text-slate-600 font-black text-2xl shadow-inner">
                  <span>#2</span>
                  <span className="text-[11px] font-bold text-slate-500 tracking-wider">Á QUÂN 1</span>
                </div>
              </div>

              {/* Rank 1 (Gold - Center) */}
              <div className="order-1 md:order-2 flex flex-col items-center -mt-6">
                <div className="relative group">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce">
                    <span className="text-2xl font-bold">🏆</span>
                  </div>
                  <div className="relative">
                    <img
                      src={data.podium[0].avatar_url}
                      alt={data.podium[0].full_name}
                      onClick={() => setSelectedProfileId(data.podium[0].id)}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-amber-400 shadow-2xl ring-offset-2 cursor-pointer hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute -top-3 -right-2 w-9 h-9 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 border-2 border-white flex items-center justify-center text-amber-950 font-black text-base shadow-lg">
                      1
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center space-y-1">
                  <div className="font-black text-base text-slate-900 flex items-center justify-center gap-1">
                    {data.podium[0].full_name}
                    {data.podium[0].is_me && (
                      <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-sm">Bạn</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-medium line-clamp-1 max-w-[200px]">
                    {data.podium[0].school_or_org}
                  </div>
                  <div className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full inline-block">
                    {data.podium[0].badge}
                  </div>
                  <div className="text-2xl font-black text-amber-600 pt-1">
                    {data.podium[0].primary_value}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCheer(data.podium[0])}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-50 hover:bg-rose-50 text-amber-800 hover:text-rose-600 text-xs font-black rounded-xl transition-all cursor-pointer border border-amber-200 shadow-xs"
                >
                  <Heart className={`w-4 h-4 ${cheeredIds[data.podium[0].id] ? 'fill-rose-500 text-rose-500' : 'text-amber-600'}`} />
                  <span>{data.podium[0].cheer_count} Cổ vũ</span>
                </button>

                {/* Podium Stand */}
                <div className="w-full mt-4 h-32 sm:h-36 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 rounded-t-2xl flex flex-col items-center justify-center text-amber-950 font-black text-3xl shadow-lg border-t-2 border-yellow-200">
                  <span>#1</span>
                  <span className="text-xs font-black tracking-wider uppercase">QUÁN QUÂN</span>
                </div>
              </div>

              {/* Rank 3 (Bronze) */}
              <div className="order-3 md:order-3 flex flex-col items-center">
                <div className="relative group">
                  <div className="relative">
                    <img
                      src={data.podium[2].avatar_url}
                      alt={data.podium[2].full_name}
                      onClick={() => setSelectedProfileId(data.podium[2].id)}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-amber-700/40 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute -top-3 -right-2 w-8 h-8 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-amber-800 font-black text-sm shadow-md">
                      3
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-center space-y-1">
                  <div className="font-bold text-sm text-slate-900 flex items-center justify-center gap-1">
                    {data.podium[2].full_name}
                    {data.podium[2].is_me && (
                      <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-sm">Bạn</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 max-w-[180px]">
                    {data.podium[2].school_or_org}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                    {data.podium[2].badge}
                  </div>
                  <div className="text-lg font-black text-slate-800 pt-1">
                    {data.podium[2].primary_value}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCheer(data.podium[2])}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  <Heart className={`w-3.5 h-3.5 ${cheeredIds[data.podium[2].id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{data.podium[2].cheer_count}</span>
                </button>

                {/* Podium Stand */}
                <div className="w-full mt-4 h-20 sm:h-24 bg-gradient-to-b from-amber-200 to-amber-300 rounded-t-2xl flex flex-col items-center justify-center text-amber-900 font-black text-2xl shadow-inner">
                  <span>#3</span>
                  <span className="text-[11px] font-bold text-amber-800 tracking-wider">Á QUÂN 2</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Detailed Leaderboard Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Bảng Điểm Xếp Hạng Chi Tiết
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cập nhật tự động sau mỗi lượt nộp bài luyện tập và thi thử ETS
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Dữ liệu thời gian thực</span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Đang tải bảng xếp hạng học viên...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-200/70">
                    <th className="py-3.5 px-4 text-center w-16">Hạng</th>
                    <th className="py-3.5 px-4">Học viên</th>
                    <th className="py-3.5 px-4 text-center">Chuỗi ngày</th>
                    <th className="py-3.5 px-4 text-center">Câu đã luyện</th>
                    <th className="py-3.5 px-4 text-center">Độ chính xác</th>
                    <th className="py-3.5 px-4 text-right">
                      {categories.find((c) => c.id === activeCategory)?.label || 'Điểm'}
                    </th>
                    <th className="py-3.5 px-4 text-center w-24">Cổ vũ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(searchQuery ? [...(data?.podium || []), ...(data?.rankings || [])] : (data?.rankings || [])).map((entry) => {
                    const isMe = entry.is_me;
                    return (
                      <tr
                        key={entry.id}
                        ref={isMe ? myRankRef : null}
                        className={`transition-colors ${
                          isMe
                            ? 'bg-blue-50/80 border-l-4 border-blue-600 font-semibold'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <span
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                                entry.rank <= 3
                                  ? 'bg-amber-100 text-amber-800'
                                  : entry.rank <= 10
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {entry.rank}
                            </span>
                            {/* Rank Change Indicator */}
                            {entry.rank_change > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center mt-0.5">
                                ▲{entry.rank_change}
                              </span>
                            ) : entry.rank_change < 0 ? (
                              <span className="text-[10px] font-bold text-rose-500 flex items-center mt-0.5">
                                ▼{Math.abs(entry.rank_change)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 mt-0.5">-</span>
                            )}
                          </div>
                        </td>

                        {/* Student Info */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={entry.avatar_url}
                              alt={entry.full_name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer">
                                  {entry.full_name}
                                </span>
                                {isMe && (
                                  <span className="bg-blue-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-md">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 line-clamp-1">
                                {entry.school_or_org}
                              </div>
                              <div className="text-[10px] font-semibold text-slate-400">
                                {entry.badge}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Streak */}
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                            <span>{entry.streak_days}d</span>
                          </div>
                        </td>

                        {/* Questions */}
                        <td className="py-4 px-4 text-center font-bold text-slate-700">
                          {entry.questions_count} câu
                        </td>

                        {/* Accuracy */}
                        <td className="py-4 px-4 text-center">
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

                        {/* Primary Metric */}
                        <td className="py-4 px-4 text-right">
                          <div className="text-sm font-black text-slate-900">
                            {entry.primary_value}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {entry.exp_points.toLocaleString()} EXP
                          </div>
                        </td>

                        {/* Cheer Action */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleCheer(entry)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                            title="Thả tim cổ vũ"
                          >
                            <Heart className={`w-3.5 h-3.5 ${cheeredIds[entry.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                            <span>{entry.cheer_count}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {data && data.rankings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        Không tìm thấy học viên nào khớp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Rules & Rewards Modal */}
      {isRulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2">
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

            <div className="p-6 space-y-6 text-xs text-slate-700 leading-relaxed">
              {/* Scoring System */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Cách Tính Điểm Rèn Luyện (EXP)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(rules?.scoring_system || [
                    { activity: 'Làm đúng 1 câu hỏi luyện tập', exp: '+5 EXP', desc: 'Áp dụng cho Parts 1 đến 7.' },
                    { activity: 'Hoàn thành 1 bài Mini-Test', exp: '+50 EXP', desc: 'Rèn luyện phản xạ và tốc độ.' },
                    { activity: 'Hoàn thành Full Test 200 câu', exp: '+200 EXP', desc: 'Đề thi chuẩn ETS có tính giờ thật.' },
                    { activity: 'Duy trì chuỗi học liên tục (Streak)', exp: '+30 EXP/ngày', desc: 'Học ít nhất 1 bài mỗi ngày.' },
                    { activity: 'Chép chính tả đạt >90%', exp: '+40 EXP', desc: 'Luyện nghe sâu từ vựng & âm đuôi.' },
                    { activity: 'Nhận lời cổ vũ từ bạn bè', exp: '+2 EXP/lượt', desc: 'Khích lệ tinh thần thi đua.' }
                  ]).map((sc, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">{sc.activity}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{sc.desc}</div>
                      </div>
                      <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md shrink-0">
                        {sc.exp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leagues Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Các Phân Hạng Thi Đua (Leagues)
                </h4>
                <div className="space-y-2">
                  {(rules?.leagues_info || [
                    { league: 'CLB Master 800+', criteria: 'Điểm TOEIC từ 800 trở lên', perk: 'Huy hiệu Vương Miện & Kho câu hỏi phân hóa 900+.' },
                    { league: 'CLB Bứt Phá 650-795', criteria: 'Chuẩn đầu ra ĐH & Đề thi ETS', perk: 'Huy hiệu Tia Chớp & Phân tích bẫy thường gặp Part 7.' },
                    { league: 'CLB Khởi Động <650', criteria: 'Củng cố ngữ pháp & từ vựng', perk: 'Huy hiệu Mầm Xanh & Lộ trình thích ứng vá lỗ hổng.' }
                  ]).map((lg, i) => (
                    <div key={i} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-indigo-950">{lg.league}</span>: {lg.criteria}
                      </div>
                      <span className="text-[11px] text-indigo-700 font-semibold bg-white px-2 py-0.5 rounded-md border border-indigo-200/50 shrink-0">
                        {lg.perk}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rewards */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Cơ Cấu Phần Thưởng Tuần & Tháng
                </h4>
                <div className="space-y-2">
                  {(rules?.rewards || [
                    { rank: 'Top 1 Quán Quân Tuần', reward: 'Kỷ niệm chương vàng Vinh Danh + 1 Năm Trợ lý AI Pro + Voucher 500k.' },
                    { rank: 'Top 2 & Top 3 Á Quân', reward: 'Huy hiệu Bạc/Đồng độc quyền trên hồ sơ + 6 Tháng Trợ lý AI Pro.' },
                    { rank: 'Top 10 Tuần', reward: 'Danh hiệu "Chiến Thần Tuần" + 1 Tháng Trợ lý AI Pro.' },
                    { rank: 'Chuỗi Streak 30 Ngày', reward: 'Huy hiệu Kỷ Luật Thép + Tặng 100 Bộ Flashcard từ vựng độc quyền.' }
                  ]).map((rw, i) => (
                    <div key={i} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <span className="font-bold text-amber-950">{rw.rank}</span>
                      <span className="text-xs text-amber-800 font-medium">{rw.reward}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset Cycle */}
              <div className="p-3.5 bg-slate-100 rounded-xl text-slate-600 text-[11px] flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  Bảng Xếp Hạng Tuần được kết toán và làm mới vào <strong>23:59 Chủ Nhật hàng tuần</strong>. Thành tích tuần cũ được lưu vĩnh viễn trong Bảng Vinh Danh Toàn Thời Gian.
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsRulesOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Public Profile Modal */}
      <UserProfileModal
        isOpen={Boolean(selectedProfileId)}
        userId={selectedProfileId}
        isLeaderboardProfile={true}
        onClose={() => setSelectedProfileId(null)}
        onOpenChat={(uid) => {
          setSelectedProfileId(null);
          if (onViewProfile) onViewProfile(uid);
        }}
      />
    </div>
  );
};
