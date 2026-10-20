import { useAuth } from '../context/AuthContext';
import { AuthRequiredGate } from '../components/AuthRequiredGate';
﻿import React, { useState, useEffect } from 'react';
import {
  Award,
  Flame,
  BookOpen,
  FileText,
  Lock,
  CheckCircle2,
  Sparkles,
  Trophy,
  Star,
  Target,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { AchievementItem } from '../types';

interface AchievementsPageProps {
  onNavigate: (path: string) => void;
}

export const AchievementsPage: React.FC<AchievementsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Bộ sưu tập Huy hiệu & Thành tích"
        featureDesc="Ghi nhận nỗ lực học tập, chuỗi ngày liên tục và các cột mốc bứt phá điểm số."
        onNavigate={onNavigate}
      />
    );
  }


  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const res = await api.getAchievements();
      if (res && res.achievements) {
        setAchievements(res.achievements);
      }
    } catch {
      // Fallback
      setAchievements([
        {
          id: 1,
          code: 'streak_3',
          title: 'Chiến binh 3 ngày',
          description: 'Duy trì chuỗi học tập liên tục trong 3 ngày.',
          icon: 'flame',
          unlocked: true,
          progress: 3,
          max_progress: 3,
          unlocked_at: '24/09/2026'
        },
        {
          id: 2,
          code: 'streak_7',
          title: 'Ý chí kiên định',
          description: 'Học tập không gián đoạn suốt 7 ngày liên tiếp.',
          icon: 'flame',
          unlocked: true,
          progress: 7,
          max_progress: 7,
          unlocked_at: '26/09/2026'
        },
        {
          id: 3,
          code: 'streak_30',
          title: 'Bậc thầy kỷ luật',
          description: 'Chuỗi học tập thần tốc chạm mốc 30 ngày.',
          icon: 'trophy',
          unlocked: false,
          progress: 7,
          max_progress: 30
        },
        {
          id: 4,
          code: 'vocab_50',
          title: 'Nhập môn từ vựng',
          description: 'Thuộc và ghi nhớ 50 từ vựng TOEIC với Flashcards.',
          icon: 'book',
          unlocked: true,
          progress: 50,
          max_progress: 50,
          unlocked_at: '22/09/2026'
        },
        {
          id: 5,
          code: 'vocab_200',
          title: 'Kho từ phong phú',
          description: 'Vượt mốc 200 từ vựng chuyên ngành kinh tế.',
          icon: 'book',
          unlocked: false,
          progress: 142,
          max_progress: 200
        },
        {
          id: 6,
          code: 'first_mock_test',
          title: 'Xuất trận đầu tiên',
          description: 'Hoàn thành bài thi thử ETS full 120 phút.',
          icon: 'file',
          unlocked: true,
          progress: 1,
          max_progress: 1,
          unlocked_at: '25/09/2026'
        },
        {
          id: 7,
          code: 'score_700',
          title: 'Chiến binh 700+',
          description: 'Đạt điểm thi thử trên 700 điểm trong Crack TOEIC.',
          icon: 'star',
          unlocked: true,
          progress: 710,
          max_progress: 700,
          unlocked_at: '26/09/2026'
        },
        {
          id: 8,
          code: 'dictation_master',
          title: 'Đôi tai vàng',
          description: 'Chinh phục 20 bài chép chính tả Dictation với độ chính xác > 85%.',
          icon: 'sparkles',
          unlocked: false,
          progress: 12,
          max_progress: 20
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length || 8;
  const completionPct = Math.round((unlockedCount / totalCount) * 100);
  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'flame': return Flame;
      case 'trophy': return Trophy;
      case 'book': return BookOpen;
      case 'file': return FileText;
      case 'star': return Star;
      default: return Sparkles;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs">
              <Trophy className="w-3.5 h-3.5" /> Hệ thống Vinh danh & Cột mốc
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">
              Huy Hiệu & Thành Tích Cá Nhân
            </h1>
            <p className="text-xs sm:text-sm text-amber-50 max-w-xl leading-relaxed">
              Mỗi bài tập hoàn thành, mỗi từ vựng được ghi nhớ đều đưa bạn gần hơn tới mục tiêu TOEIC ra trường với tấm bằng loại Giỏi.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex items-center gap-5 shrink-0">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-white">{unlockedCount}/{totalCount}</div>
              <div className="text-[10px] uppercase font-bold text-amber-100">Đã mở khóa</div>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-white">{completionPct}%</div>
              <div className="text-[10px] uppercase font-bold text-amber-100">Tiến độ huy hiệu</div>
            </div>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((item) => {
            const Icon = getBadgeIcon(item.icon);
            const isUnlocked = item.unlocked;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-5 transition-all flex flex-col justify-between space-y-4 ${
                  isUnlocked
                    ? 'bg-white border-amber-200/80 shadow-xs hover:shadow-md'
                    : 'bg-slate-50/80 border-slate-200 opacity-80'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                        isUnlocked
                          ? 'bg-gradient-to-tr from-amber-400 to-orange-500 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isUnlocked ? <Icon className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                    </div>

                    {isUnlocked ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã đạt
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600">
                        Chưa mở
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Tiến độ</span>
                    <span className="font-bold text-slate-700">
                      {item.progress} / {item.max_progress}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isUnlocked ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((item.progress / item.max_progress) * 100))}%`
                      }}
                    />
                  </div>

                  {item.unlocked_at && (
                    <div className="text-[10px] text-slate-400 text-right">
                      Đạt ngày {item.unlocked_at}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Motivational Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Sẵn sàng mở khóa huy hiệu tiếp theo?</h4>
              <p className="text-xs text-slate-500">
                Chỉ cần hoàn thành 8 bài Dictation nữa để nhận danh hiệu "Đôi tai vàng"!
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('/practice/dictation')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            Luyện Dictation ngay <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
