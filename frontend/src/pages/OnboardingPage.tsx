import { AuthRequiredGate } from '../components/AuthRequiredGate';
import React, { useState } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface OnboardingPageProps {
  onNavigate: (path: string) => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onNavigate }) => {
  const { user, refreshMe } = useAuth();


  const [currentStep, setCurrentStep] = useState(1);
  const [purpose, setPurpose] = useState('TOEIC');
  const [targetScore, setTargetScore] = useState(650);
  const [dailyMinutes, setDailyMinutes] = useState(45);
  const [focusSkills, setFocusSkills] = useState<string[]>([
    'Listening',
    'Reading',
    'Grammar',
    'Vocabulary',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const purposeOptions = [
    { id: 'TOEIC', title: 'Chứng chỉ TOEIC', desc: 'Đạt chuẩn đầu ra đại học hoặc xin việc' },
    { id: 'IELTS', title: 'Luyện thi IELTS', desc: 'Du học hoặc định cư quốc tế' },
    { id: 'Giao tiếp', title: 'Giao tiếp công sở', desc: 'Tự tin đàm phán, họp và thuyết trình' },
    { id: 'Công việc', title: 'Ứng dụng công việc', desc: 'Soạn thảo email, báo cáo chuyên nghiệp' },
    { id: 'Mất gốc', title: 'Lấy lại nền tảng', desc: 'Xây dựng lại ngữ pháp và từ vựng từ đầu' },
  ];

  const scoreOptions = [
    { score: 450, label: 'TOEIC 450', desc: 'Căn bản - Đủ điều kiện tốt nghiệp' },
    { score: 550, label: 'TOEIC 550', desc: 'Trung cấp - Giao tiếp hàng ngày' },
    { score: 650, label: 'TOEIC 650 (Khuyên dùng)', desc: 'Tiêu chuẩn vàng cho doanh nghiệp & tập đoàn' },
    { score: 750, label: 'TOEIC 750+', desc: 'Nâng cao - Thành thạo xử lý công việc' },
    { score: 850, label: 'TOEIC 850+', desc: 'Chuyên gia - Tự tin làm việc môi trường đa quốc gia' },
  ];

  const timeOptions = [
    { mins: 15, label: '15 phút/ngày', desc: 'Duy trì thói quen học nhẹ nhàng' },
    { mins: 30, label: '30 phút/ngày', desc: 'Phù hợp người đi làm bận rộn' },
    { mins: 45, label: '45 phút/ngày (Tối ưu)', desc: 'Cân bằng giữa tiếp thu lý thuyết & luyện đề' },
    { mins: 60, label: '60 phút/ngày', desc: 'Tiến độ nhanh, bứt phá sau 8 tuần' },
    { mins: 90, label: '90 phút/ngày', desc: 'Cấp tốc trước kỳ thi chính thức' },
  ];

  const skillOptions = [
    { id: 'Listening', label: 'Listening (Kỹ năng Nghe)' },
    { id: 'Reading', label: 'Reading (Kỹ năng Đọc hiểu)' },
    { id: 'Grammar', label: 'Ngữ pháp thực chiến (Word Form, Thì)' },
    { id: 'Vocabulary', label: 'Từ vựng trọng tâm (Office & Business)' },
  ];

  const toggleSkill = (id: string) => {
    setFocusSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSelectAllSkills = () => {
    setFocusSkills(['Listening', 'Reading', 'Grammar', 'Vocabulary']);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await api.submitOnboarding({
        study_purpose: purpose,
        target_score: targetScore,
        daily_minutes: dailyMinutes,
        focus_skills: focusSkills,
      });
      await refreshMe();
      onNavigate('/placement-test');
    } catch (err) {
      console.error(err);
      onNavigate('/placement-test');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Cài đặt mục tiêu học tập"
        featureDesc="Cá nhân hóa mục tiêu điểm TOEIC và thời gian học mỗi ngày."
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-8 sm:p-10 relative overflow-hidden">
        {/* Stepper Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span className="text-blue-600">BƯỚC {currentStep} / 4</span>
            <span>{Math.round((currentStep / 4) * 100)}% HOÀN THÀNH</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* STEP 1: Study Purpose */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Thiết lập mục tiêu</span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                Bạn muốn cải thiện tiếng Anh để làm gì?
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Hệ thống sẽ tối ưu hóa ngân hàng bài giảng và từ vựng phù hợp nhất với định hướng của bạn.
              </p>
            </div>

            <div className="space-y-3">
              {purposeOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setPurpose(opt.id)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    purpose === opt.id
                      ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{opt.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      purpose === opt.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                    }`}
                  >
                    {purpose === opt.id && <CheckCircle2 className="w-4 h-4 fill-white text-blue-600" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Target Score */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Cột mốc kỳ vọng</span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                Mục tiêu điểm số TOEIC của bạn?
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Lộ trình học tập sẽ được tính toán khoảng thời gian và số lượng chuyên đề cần hoàn thành.
              </p>
            </div>

            <div className="space-y-3">
              {scoreOptions.map((opt) => (
                <div
                  key={opt.score}
                  onClick={() => setTargetScore(opt.score)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    targetScore === opt.score
                      ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{opt.label}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      targetScore === opt.score ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                    }`}
                  >
                    {targetScore === opt.score && <CheckCircle2 className="w-4 h-4 fill-white text-blue-600" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Daily Time Commitment */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Quản lý thời gian</span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                Bạn có thể học bao nhiêu thời gian mỗi ngày?
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Mục tiêu hàng ngày sẽ tự động nhắc nhở bạn duy trì chuỗi học tập đều đặn.
              </p>
            </div>

            <div className="space-y-3">
              {timeOptions.map((opt) => (
                <div
                  key={opt.mins}
                  onClick={() => setDailyMinutes(opt.mins)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    dailyMinutes === opt.mins
                      ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{opt.label}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      dailyMinutes === opt.mins ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                    }`}
                  >
                    {dailyMinutes === opt.mins && <CheckCircle2 className="w-4 h-4 fill-white text-blue-600" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Focus Skills */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Kỹ năng ưu tiên</span>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                  Bạn muốn cải thiện kỹ năng nào?
                </h2>
              </div>
              <button
                type="button"
                onClick={handleSelectAllSkills}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              >
                Đánh giá toàn diện
              </button>
            </div>

            <div className="space-y-3">
              {skillOptions.map((opt) => {
                const isChecked = focusSkills.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleSkill(opt.id)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      isChecked
                        ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                        isChecked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="w-4 h-4 fill-white text-blue-600" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
              <span>
                Ngay sau bước này, hệ thống sẽ đưa bạn đến bài <strong>Đánh giá năng lực đầu vào</strong> để chẩn đoán điểm số hiện tại và vẽ lộ trình thích ứng.
              </span>
            </div>
          </div>
        )}

        {/* Bottom Navigation Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              Tiếp tục
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting || focusSkills.length === 0}
              onClick={handleFinish}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Đang tạo lộ trình...' : 'Hoàn tất & Bắt đầu đánh giá'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
