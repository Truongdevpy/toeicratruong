import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Crown } from 'lucide-react';
import {
  Headphones,
  BookOpen,
  Mic,
  PenTool,
  Clock,
  Layers,
  Target,
  Sparkles,
  ArrowRight,
  Trophy,
  Video
} from 'lucide-react';

interface PracticeHubPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onOpenRBAC?: () => void;
}

export const PracticeHubPage: React.FC<PracticeHubPageProps> = ({ onNavigate, onOpenAuth, onOpenRBAC }) => {
  const { user } = useAuth();
  const modules = [
    {
      title: 'Luyện Nghe (Listening Parts 1-4)',
      desc: 'Kho đề nghe đa dạng tốc độ (0.75x, 1x, 1.25x), transcript song ngữ, phân tích bẫy âm thanh và từ vựng.',
      path: '/practice/listening',
      icon: Headphones,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      stats: '100 câu • Đầy đủ 4 Parts',
      badge: 'Listening',
      guestAllowed: false,
    },
    {
      title: 'Luyện Đọc (Reading Parts 5-7)',
      desc: 'Giao diện chia đôi màn hình chuẩn thi thật, tích hợp từ điển ngữ cảnh và phân tích bẫy từ vựng & ngữ pháp.',
      path: '/practice/reading',
      icon: BookOpen,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      stats: '100 câu • Parts 5, 6, 7',
      badge: 'Reading',
      guestAllowed: false,
    },
    {
      title: 'Chép chính tả (Dictation)',
      desc: 'Phương pháp nghe chép hiện đại theo từng câu, tự động so sánh transcript và chỉ ra lỗi thừa, thiếu, sai.',
      path: '/practice/dictation',
      icon: Clock,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      stats: '4 Parts • Xem danh sách',
      badge: 'Dictation',
      guestAllowed: true, // Guest can browse catalog
    },
    {
      title: 'Kho Video Bài giảng TOEIC',
      desc: 'Video bài giảng thực chiến từ chuyên gia 990: bóc tách chiến thuật 7 Parts và mẹo ngữ pháp 5 giây.',
      path: '/videos',
      icon: Video,
      color: 'text-violet-600 bg-violet-50 border-violet-200',
      stats: '6 chuyên đề • Độc quyền',
      badge: 'Video bài giảng',
      guestAllowed: false,
    },
    {
      title: 'Luyện Nói (TOEIC Speaking)',
      desc: '45 bài thi chuẩn ETS: Đọc to văn bản, Miêu tả tranh, Trả lời câu hỏi & Thể hiện quan điểm kèm phòng thu âm trực tiếp.',
      path: '/practice/speaking',
      icon: Mic,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      stats: '45 đề • Thu âm trực tiếp',
      badge: 'Speaking',
      guestAllowed: false,
    },
    {
      title: 'Luyện Viết (TOEIC Writing)',
      desc: '45 đề thi viết câu theo tranh, phản hồi email và viết bài luận 300+ từ với bộ đếm từ và bài mẫu điểm cao.',
      path: '/practice/writing',
      icon: PenTool,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      stats: '45 đề • Đếm từ & bài mẫu',
      badge: 'Writing',
      guestAllowed: false,
    },
    {
      title: 'Kho Từ vựng 5,000+ từ',
      desc: 'Bộ từ vựng chuẩn hóa phân chia theo thang điểm TOEIC và các chủ đề thương mại, tài chính, văn phòng.',
      path: '/practice/vocabulary',
      icon: Target,
      color: 'text-pink-600 bg-pink-50 border-pink-200',
      stats: '5,000+ từ • Collocations',
      badge: 'Vocabulary',
      guestAllowed: false,
    },
    {
      title: 'Flashcards Lặp lại ngắt quãng (SRS)',
      desc: 'Ghi nhớ từ vựng vĩnh viễn với thuật toán SuperMemo SM-2, phiên âm IPA chuẩn và luyện phản xạ từ.',
      path: '/practice/flashcards',
      icon: Layers,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      stats: 'Thuật toán SRS • Phát âm',
      badge: 'Flashcards',
      guestAllowed: false,
    },
    {
      title: 'Ngữ pháp TOEIC 38 chuyên đề',
      desc: 'Hệ thống hóa lý thuyết từ loại, thì, mệnh đề quan hệ rút gọn kèm công thức và bài tập phân tích bẫy ETS.',
      path: '/practice/grammar',
      icon: Sparkles,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      stats: '38 chuyên đề • Phân tích bẫy',
      badge: 'Grammar',
      guestAllowed: false,
    },
    {
      title: 'Bảng Xếp Hạng Thi Đua (BXH)',
      desc: 'Theo dõi thứ hạng tuần này, vinh danh Top học viên điểm số ETS cao nhất và chuỗi Streak học tập bền bỉ.',
      path: '/leaderboard',
      icon: Trophy,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      stats: 'Top 100 • Toàn hệ thống',
      badge: 'BXH Thi đua',
      guestAllowed: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Guest Notification Banner */}
        {!user && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Chế độ Khách:</strong> Bạn đang xem danh mục kỹ năng. Vui lòng đăng nhập để mở khóa luyện Nghe (Parts 1-4), Đọc (Parts 5-7), Viết, Nói và Từ vựng.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenRBAC}
                className="px-3 py-1.5 rounded-xl border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                Xem quyền lợi gói học
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth?.('login')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-xs cursor-pointer"
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        )}

        {/* Page Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Không gian Luyện tập Kỹ năng (Practice Hub)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Lựa chọn kỹ năng cần bứt phá điểm số với công cụ học tập thông minh và nguồn dữ liệu thi thật chuẩn ETS.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenRBAC}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Crown className="w-4 h-4 text-amber-600 fill-amber-600/20" />
            <span>Xem Quyền Lợi Các Gói Học</span>
          </button>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {modules.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                onClick={() => {
                  if (!user && !m.guestAllowed) {
                    onOpenAuth?.('login');
                    return;
                  }
                  onNavigate(m.path);
                }}
                className="bg-white border border-slate-200/90 hover:border-blue-400 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${m.color} group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {m.badge}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                    {m.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-3">{m.desc}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">{m.stats}</span>
                  <div className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                    <span>{!user && !m.guestAllowed ? 'Khóa 🔒' : 'Bắt đầu'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
