import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Crown,
  Trophy,
  Flame,
  ArrowRight,
  CheckCircle2,
  Bot,
  Headphones,
  BookOpen,
  Clock,
  Layers,
  BarChart3,
  GraduationCap,
  Video
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onOpenRBAC?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onOpenAuth, onOpenRBAC }) => {
  const { user } = useAuth();

  return (
    <div className="bg-[#F8FAFC] font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                Hệ thống luyện TOEIC thích ứng thế hệ mới
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] tracking-tight leading-[1.18]">
                Chinh phục TOEIC theo cách của riêng bạn
              </h1>

              <p className="text-base sm:text-lg text-[#64748B] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Luyện tập thông minh, hiểu rõ điểm yếu qua phân tích chuẩn xác và xây dựng lộ trình học thích ứng liên tục theo tiến độ thực tế của bạn.
              </p>

              {/* Call to Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => user ? onNavigate('/placement-test') : onOpenAuth('register')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4" />
                  Bắt đầu đánh giá trình độ miễn phí
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => user ? onNavigate('/practice/listening') : onOpenAuth('login')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-100 text-[#0F172A] border border-slate-200 font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Headphones className="w-4 h-4 text-blue-600" />
                  Luyện tập ngay
                </button>

                <button
                  type="button"
                  onClick={onOpenRBAC}
                  className="w-full sm:w-auto px-5 py-3.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-amber-600 fill-amber-600/20" />
                  Quyền lợi gói học
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>2,000+ câu hỏi thật ETS</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>5,000+ từ vựng có audio</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Không quảng cáo gây nhiễu</span>
                </div>
              </div>
            </div>

            {/* Hero Right Visual */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-6 space-y-5">
                {/* Student Mini Profile Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                      {user ? (user.full_name ? user.full_name[0].toUpperCase() : 'U') : 'T'}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">
                        {user ? user.full_name : 'Hồ sơ học tập TOEIC'}
                      </div>
                      <div className="text-xs text-slate-400">Cá nhân hóa theo năng lực</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                    Tiến độ: +150đ
                  </span>
                </div>

                {/* Score Comparison Display */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Trình độ hiện tại</span>
                    <div className="text-2xl font-black text-slate-800 mt-0.5">425 <span className="text-xs font-medium text-slate-400">/ 990</span></div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Mục tiêu cá nhân</span>
                    <div className="text-2xl font-black text-blue-600 mt-0.5">650 <span className="text-xs font-medium text-blue-400">/ 990</span></div>
                  </div>
                </div>

                {/* Skill Accuracy Bars */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-blue-600" /> Listening
                    </span>
                    <span className="font-bold text-slate-800">42% (Cần tăng trọng số)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '42%' }}></div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Reading
                    </span>
                    <span className="font-bold text-slate-800">76% (Vững nền tảng)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: '76%' }}></div>
                  </div>
                </div>

                {/* AI Adaptive Notice */}
                <div className="p-3.5 bg-blue-50/80 border border-blue-200/70 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
                  <Bot className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>AI tối ưu hóa:</strong> Tăng 35% bài tập Listening Part 3 & Word Form để bù điểm Reading vào mục tiêu 650.
                  </span>
                </div>

                {/* Card Button */}
                <button
                  type="button"
                  onClick={() => user ? onNavigate('/dashboard') : onOpenAuth('login')}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Khám phá bảng điều khiển học viên
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Hệ sinh thái học tập</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Đầy đủ mọi công cụ để chinh phục mục tiêu TOEIC
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Luyện Nghe Parts 1-4',
                desc: 'Audio tốc độ linh hoạt (0.75x, 1x, 1.25x), transcript song ngữ và bóc tách từ vựng ăn điểm.',
                path: '/practice/listening',
                icon: Headphones,
                badge: '1000+ câu',
                guestAllowed: false,
              },
              {
                title: 'Luyện Đọc Parts 5-7',
                desc: 'Giao diện chia đôi màn hình chuẩn thi thật, phân tích ngữ pháp và tra từ ngữ cảnh.',
                path: '/practice/reading',
                icon: BookOpen,
                badge: '1500+ câu',
                guestAllowed: false,
              },
              {
                title: 'Chép chính tả Daily Dictation',
                desc: 'Tự động bóc tách âm thanh, nhận diện lỗi sai và luyện nghe bắt âm chuẩn ETS.',
                path: '/practice/dictation',
                icon: Clock,
                badge: 'Mới ra mắt',
                guestAllowed: true, // Guest can view catalog
              },
              {
                title: 'Kho Video Bài giảng TOEIC',
                desc: 'Video bài giảng thực chiến từ chuyên gia 990: bóc tách chiến thuật 7 Parts và mẹo 5 giây.',
                path: '/videos',
                icon: Video,
                badge: 'Video bài giảng',
                guestAllowed: false,
              },
              {
                title: 'Đề thi Crack TOEIC Vol 2',
                desc: 'Format chuẩn phòng thi, đồng hồ đếm ngược và chấm điểm tự động tức thì.',
                path: '/mock-tests',
                icon: BarChart3,
                badge: 'ETS Crack Vol 2',
                guestAllowed: false,
              },
              {
                title: 'Kho 5,000+ Từ vựng',
                desc: 'Lặp lại ngắt quãng SRS, flashcards thông minh và phân loại theo chủ đề.',
                path: '/practice/vocabulary',
                icon: Layers,
                badge: 'Kho từ cốt lõi',
                guestAllowed: false,
              },
              {
                title: 'Bảng Xếp Hạng Thi Đua (BXH)',
                desc: 'Vinh danh Top học viên điểm cao ETS, thi đua chuỗi học tập Streak và tích lũy EXP cùng 12,000+ học viên.',
                path: '/leaderboard',
                icon: Trophy,
                badge: 'Thi đua BXH',
                guestAllowed: true,
              },
              {
                title: 'Trợ lý Gia sư AI TOEIC',
                desc: 'Hỏi đáp bài tập ngữ pháp, bóc tách lỗi sai chi tiết và gợi ý phương pháp giải nhanh chuẩn ETS 1-kèm-1.',
                path: '/ai-tutor',
                icon: Bot,
                badge: 'AI Tutor 24/7',
                guestAllowed: false,
              },
            ].map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (!user && !f.guestAllowed) {
                      onOpenAuth('login');
                      return;
                    }
                    onNavigate(f.path);
                  }}
                  className="bg-white border border-slate-200/90 hover:border-blue-400 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-blue-100">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                        {f.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                      {f.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">{f.desc}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      <span>{!user && !f.guestAllowed ? 'Khóa 🔒' : 'Luyện tập'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    {!user && !f.guestAllowed && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Đăng nhập
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Leaderboard & Achievement Highlight Section */}
      <section className="py-16 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden border-t border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wide">
                <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>BẢNG XẾP HẠNG THI ĐUA TOÀN HỆ THỐNG</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Vinh Danh Top Học Viên Bứt Phá Tuần Này
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Thi đua điểm số chuẩn ETS, duy trì chuỗi Streak kỷ luật và tích lũy EXP cùng cộng đồng hơn 12,000+ sinh viên FTU, NEU, HUST trên toàn quốc.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('/leaderboard')}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Trophy className="w-4 h-4 fill-slate-950 text-slate-950" />
                Xem Đầy Đủ Bảng Xếp Hạng (BXH)
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Podium Top 3 Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Rank 2 */}
            <div
              onClick={() => onNavigate('/leaderboard')}
              className="bg-white/5 hover:bg-white/10 border border-slate-700/60 rounded-3xl p-6 backdrop-blur-xs transition-all cursor-pointer flex flex-col justify-between order-2 md:order-1"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/30 text-xs font-bold flex items-center gap-1">
                  🥈 Hạng 2 • Á Quân
                </span>
                <span className="text-xs font-bold text-slate-400">Tuần thi đua 39</span>
              </div>
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-14 h-14 rounded-2xl ring-2 ring-slate-300/50 overflow-hidden shrink-0 bg-slate-800">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
                    alt="Trần Đức Anh"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white truncate">Trần Đức Anh</h4>
                  <p className="text-xs text-slate-400 truncate">ĐH Bách Khoa (HUST)</p>
                  <div className="inline-flex items-center gap-1 text-[11px] text-amber-300 mt-0.5">
                    <Flame className="w-3 h-3 fill-orange-400 text-orange-400" />
                    <span>Chuỗi 54 ngày</span>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Điểm thi ETS:</span>
                <span className="font-black text-amber-300 text-base">965 điểm</span>
              </div>
            </div>

            {/* Rank 1 - Champion */}
            <div
              onClick={() => onNavigate('/leaderboard')}
              className="bg-gradient-to-b from-amber-500/20 via-white/5 to-white/5 hover:bg-amber-500/25 border-2 border-amber-400/80 rounded-3xl p-6 backdrop-blur-xs transition-all shadow-xl shadow-amber-500/10 cursor-pointer flex flex-col justify-between order-1 md:order-2 md:-translate-y-2"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md">
                  👑 Quán Quân Tuần 39
                </span>
                <span className="text-xs font-bold text-amber-300">Xuất Sắc Nhất</span>
              </div>
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-16 h-16 rounded-2xl ring-4 ring-amber-400/80 overflow-hidden shrink-0 shadow-lg bg-slate-800">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                    alt="Nguyễn Hoàng Mai"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-base text-white truncate">Nguyễn Hoàng Mai</h4>
                  <p className="text-xs text-amber-200/80 truncate">ĐH Ngoại Thương (FTU)</p>
                  <div className="inline-flex items-center gap-1 text-xs text-amber-300 font-bold mt-0.5">
                    <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                    <span>Kỷ lục: Chuỗi 68 ngày</span>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-amber-400/20 flex items-center justify-between text-xs">
                <span className="text-slate-300">Điểm thi ETS:</span>
                <span className="font-black text-amber-400 text-xl">985 điểm</span>
              </div>
            </div>

            {/* Rank 3 */}
            <div
              onClick={() => onNavigate('/leaderboard')}
              className="bg-white/5 hover:bg-white/10 border border-amber-700/50 rounded-3xl p-6 backdrop-blur-xs transition-all cursor-pointer flex flex-col justify-between order-3"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full bg-amber-700/30 text-amber-200 border border-amber-600/40 text-xs font-bold flex items-center gap-1">
                  🥉 Hạng 3 • Quý Quân
                </span>
                <span className="text-xs font-bold text-slate-400">Tuần thi đua 39</span>
              </div>
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-14 h-14 rounded-2xl ring-2 ring-amber-600/50 overflow-hidden shrink-0 bg-slate-800">
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
                    alt="Lê Quỳnh Trang"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white truncate">Lê Quỳnh Trang</h4>
                  <p className="text-xs text-slate-400 truncate">ĐH Kinh Tế Quốc Dân (NEU)</p>
                  <div className="inline-flex items-center gap-1 text-[11px] text-amber-300 mt-0.5">
                    <Flame className="w-3 h-3 fill-orange-400 text-orange-400" />
                    <span>Chuỗi 49 ngày</span>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Điểm thi ETS:</span>
                <span className="font-black text-amber-300 text-base">940 điểm</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-black text-white">1,280+</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">Học viên tham gia</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-black text-amber-300">755 đ</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">Điểm TB toàn đoàn</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-black text-orange-400">68 ngày</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">Chuỗi Streak kỷ lục</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-black text-emerald-400">59,400+</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">Câu hỏi đã rèn luyện</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
