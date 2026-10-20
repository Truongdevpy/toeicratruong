import React from 'react';
import { BookOpen, X, Sparkles, Target, ArrowRight } from 'lucide-react';

interface LevelTheoryModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onStartPractice?: () => void;
}

export const LevelTheoryModal: React.FC<LevelTheoryModalProps> = ({
  isOpen,
  title,
  onClose,
  onStartPractice
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Tóm tắt kiến thức trọng tâm
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 sm:p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700 leading-relaxed">
          {/* Card 1 */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-extrabold text-sm">
              <Target className="w-4 h-4 text-blue-600" />
              Mục tiêu & Đặc điểm cấp độ
            </div>
            <p className="text-slate-700 leading-relaxed">
              Cấp độ này tập trung vào các câu hỏi nền tảng giúp bạn lấy trọn vẹn điểm ở các câu hỏi nhận biết:
              cấu trúc câu chuẩn (S + V + O), trật tự từ tính từ trước danh từ, trạng từ bổ nghĩa cho động từ/tính từ,
              và phân biệt đuôi từ loại phổ biến.
            </p>
          </div>

          {/* Card 2: 3 bước làm bài */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Chiến lược làm bài 3 bước tối ưu thời gian (30s/câu)
            </h4>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-slate-900 block font-bold mb-0.5">Quan sát 4 phương án trước khi đọc đề:</strong>
                  <span>Nếu 4 đáp án cùng gốc từ (khác đuôi), đây là câu hỏi từ loại. Nếu 4 đáp án khác hẳn nghĩa, đây là câu hỏi từ vựng.</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-slate-900 block font-bold mb-0.5">Nhìn ngay từ phía trước và phía sau chỗ trống:</strong>
                  <span>Xác định vai trò ngữ pháp của khoảng trống (ví dụ: sau &quot;more&quot; và trước danh từ &quot;copy machine&quot; cần một tính từ &quot;reliable&quot;).</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-slate-900 block font-bold mb-0.5">Loại trừ nhanh và chốt đáp án:</strong>
                  <span>Loại ngay các phương án sai ngữ pháp, chọn đáp án đúng trong vòng 15-20 giây để dành thời gian cho bài đọc dài Part 7.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Bẫy thường gặp */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 space-y-1.5">
            <span className="font-extrabold text-amber-900 block text-xs">
              ⚠️ Bẫy thường gặp cần lưu ý:
            </span>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li>Bẫy tính từ phân từ: phân biệt tính từ đuôi -ed (chỉ cảm xúc/bị tác động) và đuôi -ing (chỉ tính chất sự vật).</li>
              <li>Bẫy trạng từ đứng giữa trợ động từ và động từ chính (have + adv + V3/ed).</li>
              <li>Bẫy từ vừa là danh từ vừa là động từ (request, order, schedule, review).</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center"
          >
            Đóng
          </button>
          {onStartPractice && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartPractice();
              }}
              className="px-6 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <span>Vào luyện ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
