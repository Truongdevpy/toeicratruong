import React, { useState } from 'react';
import { Sparkles, CheckCircle2, RotateCcw, X, Brain } from 'lucide-react';
import { srsService } from '../../services/srsService';

interface DailyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | number;
  onCompleted?: () => void;
}

export const DailyReviewModal: React.FC<DailyReviewModalProps> = ({
  isOpen,
  onClose,
  userId,
  onCompleted
}) => {
  const [step, setStep] = useState<'prompt' | 'done'>('prompt');

  if (!isOpen) return null;

  const handleFinish = () => {
    srsService.markDailyReviewCompletedToday(userId);
    setStep('done');
    if (onCompleted) onCompleted();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
          <Brain className="w-7 h-7" />
        </div>

        {step === 'prompt' ? (
          <>
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-slate-800">Ôn tập SRS ngắt quãng</h3>
              <p className="text-xs text-slate-500">
                Củng cố ngữ pháp theo chu kỳ ghi nhớ 1, 3, 7, 14, 30 ngày để chống quên kiến thức.
              </p>
            </div>

            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-left text-xs space-y-2 text-slate-700">
              <div className="flex items-center gap-2 font-bold text-indigo-800">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Mục tiêu phiên ôn tập hôm nay:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                <li>Nhận diện các thì hay nhầm lẫn (Past Simple vs Present Perfect).</li>
                <li>Rà soát bẫy đại từ quan hệ và liên từ Part 5.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Hoàn thành ôn tập</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 py-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-800">Đã hoàn thành ôn tập hôm nay!</h3>
              <p className="text-xs text-slate-500">
                Bạn đã hoàn thành củng cố trí nhớ dài hạn. Chuỗi ngày ôn tập SRS đã được cập nhật.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
            >
              Đóng
            </button>
          </>
        )}
      </div>
    </div>
  );
};
