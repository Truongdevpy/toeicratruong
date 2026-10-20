import { useAuth } from '../context/AuthContext';
import { AuthRequiredGate } from '../components/AuthRequiredGate';
import React, { useEffect, useState } from 'react';
import {
  Clock,
  Target,
  ArrowRight,
  Headphones,
  BookOpen,
  Play,
  Bot,
  FileText,
  Layers,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Trophy
} from 'lucide-react';
import { api } from '../services/api';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchDashboard = async () => {
      try {
        const data = await api.getDashboardOverview();
        setOverview(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, [user]);

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Bảng điều khiển học viên"
        featureDesc="Theo dõi mục tiêu điểm số, thời gian học tập hôm nay, chuỗi streak và lộ trình bài học."
        onNavigate={onNavigate}
      />
    );
  }

  if (isLoading || !overview) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Đang tải bảng điều khiển...</p>
        </div>
      </div>
    );
  }

  const currentGoal = overview.current_goal || { current_score: 425, target_score: 650, progress_pct: 64 };
  const continueLearning = overview.continue_learning || {
    title: 'Listening Part 3',
    progress_pct: 65,
    skill: 'Listening',
    link: '/practice/listening',
  };
  const dailyGoal = overview.daily_goal || { completed_minutes: 0, target_minutes: 45, remaining_minutes: 45 };
  const skills = overview.skill_overview || { listening: 42, reading: 76, grammar: 48, vocabulary: 62 };
  const weakAreas = overview.weak_areas || ['Part 3 (Hội thoại có biểu đồ)', 'Word Form (Hậu tố từ loại)', 'Part 7 (Đoạn kép & suy luận)'];

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Greeting Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {overview.greeting}
            </h1>
            <p className="text-sm text-[#64748B] mt-0.5">{overview.subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/placement-test')}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              Đánh giá lại năng lực
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/mock-tests')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Làm bài thi thử Full 200 câu
            </button>
          </div>
        </div>

        {/* Top 3 Core Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Current Goal */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mục tiêu hiện tại</span>
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-black text-slate-900">
                TOEIC {currentGoal.target_score}
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Hiện tại: <strong>{currentGoal.current_score}</strong>
              </span>
            </div>
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Tiến độ mục tiêu</span>
                <span className="text-blue-600 font-bold">{currentGoal.progress_pct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${currentGoal.progress_pct}%` }}></div>
              </div>
            </div>
          </div>

          {/* 2. Continue Learning Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Học tiếp tục</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  {continueLearning.progress_pct}% Hoàn thành
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 line-clamp-1">{continueLearning.title}</h3>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">Tiếp tục bài tập theo lộ trình gợi ý</p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate(continueLearning.link || '/practice/listening')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Tiếp tục học
            </button>
          </div>

          {/* 3. Daily Goal */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mục tiêu hôm nay</span>
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-black text-slate-900">
                {dailyGoal.completed_minutes} <span className="text-xs font-normal text-slate-400">/ {dailyGoal.target_minutes} phút</span>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Còn {dailyGoal.remaining_minutes} phút
              </span>
            </div>
            <div className="space-y-1 pt-1">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${Math.min(100, (dailyGoal.completed_minutes / dailyGoal.target_minutes) * 100)}%` }}
                ></div>
              </div>
              <span className="text-[11px] text-slate-400 block pt-0.5">
                Duy trì chuỗi học 7 ngày liên tiếp để nhận huy hiệu
              </span>
            </div>
          </div>
        </div>

        {/* Skill Overview & Weak Areas Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Skill Overview Bars */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Tổng quan kỹ năng (Skill Overview)
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('/statistics')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Xem chi tiết
              </button>
            </div>

            <div className="space-y-3.5 pt-1">
              {[
                { label: 'Listening', pct: skills.listening, icon: Headphones, color: 'bg-blue-600' },
                { label: 'Reading', pct: skills.reading, icon: BookOpen, color: 'bg-emerald-600' },
                { label: 'Grammar', pct: skills.grammar, icon: Layers, color: 'bg-indigo-600' },
                { label: 'Vocabulary', pct: skills.vocabulary, icon: Target, color: 'bg-amber-500' },
              ].map((sk, idx) => {
                const Icon = sk.icon;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                        {sk.label}
                      </span>
                      <span className="font-bold text-slate-800">{sk.pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${sk.color} rounded-full`} style={{ width: `${sk.pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weak Areas Quick Practice */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Điểm yếu cần khắc phục (Weak Areas)
                </h3>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  AI Đề xuất
                </span>
              </div>

              <div className="space-y-2.5">
                {weakAreas.map((wa: string, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (wa.includes('Part 3')) onNavigate('/practice/listening');
                      else if (wa.includes('Word Form')) onNavigate('/practice/grammar');
                      else onNavigate('/practice/reading');
                    }}
                    className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-300 rounded-2xl transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">{wa}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('/ai-tutor')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-3"
            >
              <Bot className="w-4 h-4 text-blue-600" />
              Nhờ Trợ lý AI giải thích điểm yếu
            </button>
          </div>
        </div>

        {/* Leaderboard Teaser Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-6 shadow-md border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2 relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> BẢNG XẾP HẠNG THI ĐUA TUẦN 39
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Bạn đang đứng thứ #17 • Top 19% học viên toàn quốc
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Thi đua cùng các học viên từ FTU, NEU, HUST, ĐHQG. Làm bài tập và giải đề ETS để tích lũy EXP thăng hạng ngay hôm nay!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('/leaderboard')}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4 fill-slate-950 text-slate-950" />
              Xem Bảng Xếp Hạng
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/mock-tests')}
              className="w-full sm:w-auto px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Luyện đề cày EXP
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Practice Hub Quick Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Không gian Luyện tập (Practice Hub)</h2>
            <button
              type="button"
              onClick={() => onNavigate('/practice')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Xem tất cả
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              { title: 'Luyện Nghe', path: '/practice/listening', icon: Headphones, color: 'text-blue-600 bg-blue-50' },
              { title: 'Luyện Đọc', path: '/practice/reading', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50' },
              { title: 'Chép chính tả', path: '/practice/dictation', icon: Clock, color: 'text-purple-600 bg-purple-50' },
              { title: 'Flashcards SRS', path: '/practice/flashcards', icon: Layers, color: 'text-amber-600 bg-amber-50' },
              { title: 'Từ vựng 5000+', path: '/practice/vocabulary', icon: Target, color: 'text-pink-600 bg-pink-50' },
              { title: 'Ngữ pháp 38', path: '/practice/grammar', icon: Sparkles, color: 'text-indigo-600 bg-indigo-50' },
            ].map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  onClick={() => onNavigate(p.path)}
                  className="p-4 bg-white border border-slate-200/90 hover:border-blue-400 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col items-center text-center gap-2.5 group"
                >
                  <div className={`w-10 h-10 rounded-xl ${p.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {p.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
