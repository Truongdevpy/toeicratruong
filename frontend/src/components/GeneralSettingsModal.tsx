import React from 'react';
import {
  X,
  Settings,
  Bot,
  MessageSquare,
  Sparkles,
  Volume2,
  Zap,
  Crown,
  Lightbulb,
  BookOpen,
  RotateCcw,
  Check
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

interface GeneralSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRBAC?: () => void;
}

export const GeneralSettingsModal: React.FC<GeneralSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenRBAC
}) => {
  const {
    settings,
    updateSettings,
    toggleFloatingAITutor,
    toggleFloatingChat,
    toggleSfx,
    toggleAutoAdvance,
    toggleSongNgu,
    toggleDanChung,
    toggleMeoLamBai,
    toggleTuVung,
    setPlaybackSpeed,
    resetSettings
  } = useSettings();

  const { user } = useAuth();
  const isVipUser = Boolean(user?.is_vip || user?.role === 'vip' || user?.role === 'admin');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-100 text-[#1E4E9E] flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Cài đặt & Tùy chỉnh hiển thị</h2>
              <p className="text-xs text-slate-500">Tùy biến nút nổi, âm thanh và trải nghiệm học</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Đóng cài đặt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* SECTION 1: NÚT NỔI TIỆN ÍCH (FLOATING BUTTONS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Nút nổi tiện ích góc màn hình
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Mặc định bật</span>
            </div>

            {/* Visual preview strip */}
            <div className="p-3 bg-gradient-to-r from-slate-100 via-indigo-50/50 to-blue-50/50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 text-[11px] font-medium hidden sm:inline">
                Xem trước vị trí góc phải màn hình:
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all shadow-xs ${
                    settings.showFloatingAITutor
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white opacity-100 scale-100'
                      : 'bg-slate-200 text-slate-400 opacity-40 line-through'
                  }`}
                >
                  <Bot className="w-3 h-3" />
                  <span>Gia sư AI</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all shadow-xs ${
                    settings.showFloatingChat
                      ? 'bg-blue-600 text-white opacity-100 scale-100'
                      : 'bg-slate-200 text-slate-400 opacity-40 line-through'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Tin nhắn</span>
                </div>
              </div>
            </div>

            {/* Toggle 1: Nút nổi Gia sư AI */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition-all">
              <div className="flex items-start gap-3 min-w-0 pr-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      Nút nổi Gia sư AI cá nhân hóa
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-bold">
                      Mặc định bật
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Nút màu tím ở góc dưới màn hình. Cho phép mở nhanh cửa sổ trò chuyện và hỏi đáp bài tập 1-1 với Gia sư AI Socratic.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleFloatingAITutor}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.showFloatingAITutor ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : 'bg-slate-200'
                }`}
                title={settings.showFloatingAITutor ? 'Đang bật - Nhấn để ẩn' : 'Đang tắt - Nhấn để hiện'}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.showFloatingAITutor ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Nút nổi Tin nhắn */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all">
              <div className="flex items-start gap-3 min-w-0 pr-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      Nút nổi Tin nhắn cộng đồng
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                      Mặc định bật
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Nút màu xanh ở góc dưới màn hình. Cho phép mở nhanh danh sách bạn bè, tin nhắn riêng và trò chuyện trực tiếp.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleFloatingChat}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.showFloatingChat ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                title={settings.showFloatingChat ? 'Đang bật - Nhấn để ẩn' : 'Đang tắt - Nhấn để hiện'}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.showFloatingChat ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* SECTION 2: TRẢI NGHIỆM HỌC TẬP & LÀM BÀI */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Trải nghiệm học tập & Làm bài
            </span>

            {/* Hiệu ứng âm thanh (SFX) */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-slate-600" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Hiệu ứng âm thanh (SFX)</div>
                  <p className="text-[10px] text-slate-500">Phát âm thanh thông báo khi trả lời đúng / sai</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSfx}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.sfx ? 'bg-[#1E4E9E]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.sfx ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Tự động chuyển câu */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Tự động chuyển câu</div>
                  <p className="text-[10px] text-slate-500">Tự động chuyển sang câu tiếp theo khi chọn đáp án</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleAutoAdvance}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.autoAdvance ? 'bg-[#1E4E9E]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.autoAdvance ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Song ngữ (VIP) */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Crown className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Song ngữ (Anh - Việt)
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">
                      VIP
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">Hiện bản dịch tiếng Việt cho câu hỏi và đáp án</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isVipUser) {
                    onOpenRBAC?.();
                    return;
                  }
                  toggleSongNgu();
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.songNgu ? 'bg-amber-400' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.songNgu ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Dẫn chứng đáp án 👑 (Part 3, 4, 6, 7) */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Crown className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Dẫn chứng đáp án (Part 3, 4, 6, 7)
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">
                      VIP
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">Tô sáng câu dẫn chứng trong bài đọc và lời thoại transcript</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isVipUser) {
                    onOpenRBAC?.();
                    return;
                  }
                  toggleDanChung();
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.danChung ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.danChung ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Mẹo làm bài Part 5 */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Mẹo làm bài Part 5</div>
                  <p className="text-[10px] text-slate-500">Hiển thị mẹo phân tích ngữ cảnh và loại từ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleMeoLamBai}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.meoLamBai ? 'bg-[#1E4E9E]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.meoLamBai ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Từ vựng quan trọng */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Từ vựng quan trọng</div>
                  <p className="text-[10px] text-slate-500">Gợi ý từ vựng cốt lõi và cho phép lưu vào Giỏ từ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTuVung}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.tuVung ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.tuVung ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* SECTION 3: TỐC ĐỘ PHÁT ÂM THANH MẶC ĐỊNH */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Tốc độ nghe audio mặc định
            </span>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {[0.75, 1.0, 1.25].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    settings.playbackSpeed === spd
                      ? 'bg-white text-[#1E4E9E] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {spd}x {spd === 1.0 && '(Chuẩn ETS)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={resetSettings}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="Khôi phục cài đặt gốc"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1E4E9E] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Hoàn tất</span>
          </button>
        </div>
      </div>
    </div>
  );
};
