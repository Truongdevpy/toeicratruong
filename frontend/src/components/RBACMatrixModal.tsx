import React, { useState, useEffect } from 'react';
import { X, Check, Crown, User, Sparkles, Zap, ArrowRight, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface RBACMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onNavigate?: (path: string) => void;
}

interface MatrixRow {
  feature: string;
  guest: string | boolean;
  free: string | boolean;
  vip: string | boolean;
}

interface MatrixSection {
  title: string;
  rows: MatrixRow[];
}

const BENEFIT_SECTIONS: MatrixSection[] = [
  {
    title: 'Truy cập chung',
    rows: [
      {
        feature: 'Xem trang chủ, menu, trang login/đăng ký',
        guest: true,
        free: true,
        vip: true
      },
      {
        feature: 'Xem danh sách đề nghe chép (chỉ xem, bấm luyện tập thì hiện popup đăng nhập)',
        guest: 'Chỉ xem',
        free: true,
        vip: true
      }
    ]
  },
  {
    title: 'Luyện nghe',
    rows: [
      {
        feature: 'Nghe chép, Part 1-4',
        guest: false,
        free: true,
        vip: true
      },
      {
        feature: 'Level nâng cao',
        guest: false,
        free: 'Giới hạn',
        vip: true
      }
    ]
  },
  {
    title: 'Luyện đọc',
    rows: [
      {
        feature: 'Ngữ pháp, Part 5-7',
        guest: false,
        free: true,
        vip: true
      },
      {
        feature: 'Level nâng cao',
        guest: false,
        free: 'Giới hạn',
        vip: true
      }
    ]
  },
  {
    title: 'Từ vựng',
    rows: [
      {
        feature: 'Học từ vựng theo lộ trình',
        guest: false,
        free: true,
        vip: true
      },
      {
        feature: 'Giỏ từ (lưu từ)',
        guest: false,
        free: '30 từ',
        vip: 'Không giới hạn'
      }
    ]
  },
  {
    title: 'Đề thi',
    rows: [
      {
        feature: 'Thi thử TOEIC',
        guest: false,
        free: 'Đề cơ bản',
        vip: 'Toàn bộ đề'
      }
    ]
  },
  {
    title: 'Video',
    rows: [
      {
        feature: 'Xem video bài giảng',
        guest: false,
        free: true,
        vip: true
      }
    ]
  },
  {
    title: 'Trong trang làm bài',
    rows: [
      {
        feature: 'Điền từ, Auto, SFX, Tra từ',
        guest: false,
        free: true,
        vip: true
      },
      {
        feature: 'Ghi chú, Đánh dấu sao, Báo lỗi',
        guest: false,
        free: true,
        vip: true
      },
      {
        feature: 'Xem giải thích đáp án',
        guest: false,
        free: 'Cơ bản',
        vip: 'Đầy đủ'
      },
      {
        feature: 'Hỏi bài (AI)',
        guest: false,
        free: '3 lượt/ngày',
        vip: 'Không giới hạn'
      },
      {
        feature: 'Song ngữ 👑',
        guest: false,
        free: false,
        vip: true
      },
      {
        feature: 'Dẫn chứng đáp án 👑 (Part 3, 4, 6, 7)',
        guest: false,
        free: false,
        vip: true
      },
      {
        feature: 'Annotator (vẽ & highlight)',
        guest: false,
        free: false,
        vip: true
      }
    ]
  },
  {
    title: 'Tiến độ',
    rows: [
      {
        feature: 'Lưu tiến độ, streak, XP',
        guest: false,
        free: true,
        vip: true
      },
      {
        feature: 'Thống kê, phân tích điểm mạnh/yếu',
        guest: false,
        free: 'Cơ bản',
        vip: 'Đầy đủ'
      }
    ]
  }
];

export const RBACMatrixModal: React.FC<RBACMatrixModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  onNavigate
}) => {
  const { user } = useAuth();
  // Expanded sections state for mobile accordion (default expand all or key ones)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    BENEFIT_SECTIONS.forEach((s, idx) => {
      init[s.title] = idx < 4; // expand first 4 by default
    });
    return init;
  });

  // ESC key support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const renderBadge = (val: string | boolean, colType: 'guest' | 'free' | 'vip') => {
    if (val === true) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> Có
        </span>
      );
    }
    if (val === false) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 text-rose-500 font-bold text-xs border border-rose-200" title="Không hỗ trợ">
          ✕
        </span>
      );
    }
    if (colType === 'vip' || (typeof val === 'string' && (val.includes('Toàn bộ') || val.includes('Không giới hạn')))) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
          <Crown className="w-3 h-3 text-amber-600 fill-amber-500/30" /> {val}
        </span>
      );
    }
    if (val === 'Giới hạn' || val === '30 từ' || val === '3 lượt/ngày' || val === 'Đề cơ bản' || val === 'Cơ bản' || val === 'Chỉ xem') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          {val}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
        {val}
      </span>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rbac-modal-title"
      className="fixed inset-0 z-50 flex items-center sm:items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
    >
      <div
        className="relative w-full max-w-[calc(100vw-16px)] sm:max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-amber-950 flex items-center gap-1 shadow-xs">
              <Crown className="w-3 h-3 fill-amber-950" /> QUYỀN LỢI GÓI HỌC
            </span>
            <span className="text-[11px] text-slate-300 font-mono hidden sm:inline">TOEIC AI Platform</span>
          </div>

          <h2 id="rbac-modal-title" className="text-lg sm:text-2xl font-black tracking-tight text-white pr-8">
            Bảng so sánh quyền lợi & Đặc quyền gói học
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl hidden sm:block">
            Hệ thống phân quyền minh bạch: Trải nghiệm miễn phí không giới hạn thời gian, hoặc nâng cấp VIP Pro để mở khóa 100% tài nguyên ETS và AI chấm điểm chuyên sâu.
          </p>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 overscroll-contain">
          {/* DESKTOP TABLE VIEW (>= 768px) */}
          <div className="hidden md:block overflow-hidden border border-slate-200/90 rounded-2xl shadow-xs bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-700">
                  <th className="p-3.5 pl-5 w-2/5">Tính năng & Nội dung</th>
                  <th className="p-3.5 text-center w-1/5 bg-slate-50 border-l border-r border-slate-200">
                    <div className="font-extrabold text-slate-800">Khách</div>
                    <div className="text-[10px] text-slate-500 font-normal">Chưa đăng nhập</div>
                  </th>
                  <th className="p-3.5 text-center w-1/5 bg-blue-50/50 border-r border-slate-200">
                    <div className="font-extrabold text-blue-900 flex items-center justify-center gap-1">
                      <User className="w-3.5 h-3.5 text-blue-600" /> Gói Thường
                    </div>
                    <div className="text-[10px] text-blue-700 font-normal">Đã đăng nhập</div>
                  </th>
                  <th className="p-3.5 text-center w-1/5 bg-amber-50/60">
                    <div className="font-extrabold text-amber-900 flex items-center justify-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500/30" /> Gói VIP
                    </div>
                    <div className="text-[10px] text-amber-700 font-normal">Mở toàn bộ</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {BENEFIT_SECTIONS.map((section, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <tr className="bg-slate-50/90 font-bold text-slate-900 border-t border-b border-slate-200/80">
                      <td colSpan={4} className="py-2.5 px-3.5 text-xs text-slate-800 uppercase tracking-wider bg-slate-100/70">
                        {section.title}
                      </td>
                    </tr>
                    {section.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-medium text-slate-800 pl-6 border-r border-slate-100">
                          {row.feature}
                        </td>
                        <td className="p-3 text-center border-r border-slate-100">
                          {renderBadge(row.guest, 'guest')}
                        </td>
                        <td className="p-3 text-center border-r border-slate-100 bg-blue-50/15">
                          {renderBadge(row.free, 'free')}
                        </td>
                        <td className="p-3 text-center bg-amber-50/25">
                          {renderBadge(row.vip, 'vip')}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE ACCORDION / CARD VIEW (< 768px) - NO HORIZONTAL SCROLL! */}
          <div className="block md:hidden space-y-3">
            <div className="text-[11px] text-slate-500 pb-1 flex items-center justify-between">
              <span>Bấm vào từng nhóm để xem chi tiết quyền lợi:</span>
              <button
                type="button"
                onClick={() => {
                  const allOpen = Object.values(expandedSections).every(Boolean);
                  const next: Record<string, boolean> = {};
                  BENEFIT_SECTIONS.forEach((s) => {
                    next[s.title] = !allOpen;
                  });
                  setExpandedSections(next);
                }}
                className="text-blue-600 font-bold hover:underline cursor-pointer"
              >
                {Object.values(expandedSections).every(Boolean) ? 'Thu gọn tất cả' : 'Mở tất cả'}
              </button>
            </div>

            {BENEFIT_SECTIONS.map((section) => {
              const isExpanded = !!expandedSections[section.title];
              return (
                <div
                  key={section.title}
                  className="rounded-2xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs transition-all"
                >
                  {/* Category Header Accordion Trigger */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      {section.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {section.rows.length} tính năng
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {/* Feature Cards inside Accordion */}
                  {isExpanded && (
                    <div className="p-2.5 divide-y divide-slate-100 space-y-2">
                      {section.rows.map((row, idx) => (
                        <div key={idx} className="pt-2 first:pt-0 space-y-2">
                          {/* Feature Name */}
                          <div className="text-xs font-semibold text-slate-800 leading-snug">
                            {row.feature}
                          </div>

                          {/* 3 Tier Badge Comparison Pill Row */}
                          <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50/70 rounded-xl border border-slate-100 text-center">
                            {/* Tier 1: Khách */}
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Khách</span>
                              <div className="flex items-center justify-center min-h-[26px]">
                                {renderBadge(row.guest, 'guest')}
                              </div>
                            </div>

                            {/* Tier 2: Thường */}
                            <div className="flex flex-col items-center gap-1 border-l border-r border-slate-200/60 px-1">
                              <span className="text-[10px] font-bold text-blue-700 uppercase">Thường</span>
                              <div className="flex items-center justify-center min-h-[26px]">
                                {renderBadge(row.free, 'free')}
                              </div>
                            </div>

                            {/* Tier 3: VIP */}
                            <div className="flex flex-col items-center gap-1 bg-amber-50/40 rounded-lg py-0.5">
                              <span className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-500" /> VIP
                              </span>
                              <div className="flex items-center justify-center min-h-[26px]">
                                {renderBadge(row.vip, 'vip')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Upgrade or Demo CTA Box */}
          <div className="mt-4 sm:mt-5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-transparent border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Crown className="w-5 h-5 fill-white/20" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {user ? (user.role === 'vip' ? 'Bạn đang sử dụng Gói VIP Pro' : user.role === 'admin' ? 'Tài khoản Quản trị viên' : 'Nâng cấp Gói VIP Pro để mở khóa 100%') : 'Đăng nhập ngay để bắt đầu luyện tập'}
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Mở khóa Song ngữ 👑, Dẫn chứng 👑, Annotator, Level nâng cao không giới hạn và gia sư AI Gemini hỏi đáp thoải mái.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate?.('/payment');
                }}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
                <span>Nâng cấp VIP Pro ngay</span>
              </button>
              {!user && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth?.('login');
                  }}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer text-center"
                >
                  Đăng nhập học viên
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer text-center"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
