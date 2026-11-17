import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  X,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Target,
  ArrowRight,
  BookOpen,
  ShoppingBag,
  MessageSquare,
  Bookmark,
  Calendar,
  Layers,
  HelpCircle,
  Play,
  Loader2,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { practiceProgressStore } from '../services/practiceProgressStore';
import { historyStore } from '../services/historyStore';
import { AIAssessmentResponse, AIAssessmentResult, AIAssessmentStats } from '../types';

interface AIAssessmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scope: string; // e.g. "part5", "reading", "listening", "part1"
  defaultTimeRange?: '7d' | '30d' | 'all';
  onNavigate?: (path: string) => void;
  onOpenAITutorChat?: (contextPrompt?: string) => void;
  onPracticeTopic?: (topic: string, part: number) => void;
}

export const AIAssessmentDrawer: React.FC<AIAssessmentDrawerProps> = ({
  isOpen,
  onClose,
  scope,
  defaultTimeRange = 'all',
  onNavigate,
  onOpenAITutorChat,
  onPracticeTopic
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>(defaultTimeRange);
  const [analysisScope, setAnalysisScope] = useState<string>(scope);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('Khởi tạo phân tích...');
  const [progressPct, setProgressPct] = useState(0);
  const [data, setData] = useState<AIAssessmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'history'>('report');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  // Sync analysisScope when scope prop changes
  useEffect(() => {
    setAnalysisScope(scope);
  }, [scope]);

  // Load analysis
  const runAnalysis = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    setProgressPct(10);
    setLoadingStep('Đang tổng hợp dữ liệu luyện tập & xác minh số liệu...');

    const stepTimer1 = setTimeout(() => {
      setProgressPct(45);
      setLoadingStep('Đang kiểm tra các ngưỡng dữ liệu và phát hiện mẫu lỗi...');
    }, 400);

    const stepTimer2 = setTimeout(() => {
      setProgressPct(80);
      setLoadingStep('Gia sư AI đang viết nhận xét & xây dựng kế hoạch 7 ngày...');
    }, 1200);

    try {
      // Gather all client-side recorded attempts from historyStore and practiceProgressStore
      const historyAttempts = historyStore.getQuestionAttempts();
      const levelAttempts = practiceProgressStore.getAllLevelAttempts();
      const mergedLocalAttempts = [...historyAttempts, ...levelAttempts];

      const res = await api.analyzeAIAssessment({
        scope: analysisScope,
        time_range: timeRange,
        force_refresh: forceRefresh,
        local_attempts: mergedLocalAttempts
      });
      setProgressPct(100);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo bản đánh giá AI. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsLoading(false);
    }
  }, [analysisScope, timeRange]);

  // Load history list
  const loadHistory = useCallback(async () => {
    try {
      const res = await api.getAIAssessmentHistory({ scope: analysisScope, limit: 15 });
      setHistoryList(res?.items || []);
    } catch {}
  }, [analysisScope]);

  // Auto-fetch when opened
  useEffect(() => {
    if (isOpen) {
      runAnalysis(false);
      loadHistory();
    }
  }, [isOpen, runAnalysis, loadHistory]);

  // Save vocab to Flashcard/SRS helper
  const handleSaveVocabFromError = (word: string, meaning: string) => {
    practiceProgressStore.addSavedVocab({
      word,
      meaning: meaning || 'Từ vựng cần ôn tập từ đánh giá AI',
      context: `AI Assessment (${analysisScope})`
    });
    setSavedSuccessMessage(`Đã thêm "${word}" vào Giỏ từ vựng & Flashcards SRS!`);
    setTimeout(() => setSavedSuccessMessage(null), 3000);
  };

  // Ask AI Tutor about this assessment
  const handleAskAITutor = () => {
    if (!data) return;
    const stats = data.stats;
    const contextPrompt = `Tôi vừa nhận được Đánh giá Luyện tập AI cho phần ${data.scope_name} (Tổng câu: ${stats.total_count}, Độ chính xác: ${stats.accuracy}%, Thời gian TB: ${stats.avg_time_sec}s/câu).
Tóm tắt tình hình: "${data.assessment.summary_vi}".
Điểm yếu chính: ${data.assessment.weaknesses.map(w => w.topic).join(', ') || 'Chưa rõ'}.
Mẫu lỗi: ${data.assessment.patterns_vi.join('; ') || 'Không có'}.
Hãy hướng dẫn cụ thể cách khắc phục các điểm yếu này trong 3 ngày tới.`;

    if (onOpenAITutorChat) {
      onOpenAITutorChat(contextPrompt);
      onClose();
    } else if (onNavigate) {
      onNavigate(`/ai-tutor?prompt=${encodeURIComponent(contextPrompt)}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  const stats = data?.stats;
  const assessment = data?.assessment;
  const isInsufficient = stats?.data_confidence === 'insufficient' || (stats && stats.total_count < 15);
  const isLowConfidence = stats?.data_confidence === 'low' || (stats && stats.total_count >= 15 && stats.total_count < 50);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Đánh giá kết quả luyện tập bằng AI"
    >
      {/* Drawer panel */}
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Gia sư AI Đánh giá Năng lực</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                  Gemini 2.5 AI
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Phân tích chuẩn xác theo số liệu đã xác minh · {data?.scope_name || 'Đang tải...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Đóng panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast notification message */}
        {savedSuccessMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-800 flex items-center justify-between animate-in slide-in-from-top-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {savedSuccessMessage}
            </span>
            <button type="button" onClick={() => setSavedSuccessMessage(null)} className="text-emerald-600 font-normal hover:underline">
              Đóng
            </button>
          </div>
        )}

        {/* Filter Controls Row: Scope & Time Range */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Scope selection */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Phạm vi:</span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-200/80 rounded-lg">
              <button
                type="button"
                onClick={() => setAnalysisScope(scope)}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  analysisScope === scope
                    ? 'bg-white text-purple-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {scope.toUpperCase()}
              </button>
              <button
                type="button"
                onClick={() => setAnalysisScope(scope.startsWith('part1') || scope.startsWith('part2') || scope.startsWith('part3') || scope.startsWith('part4') ? 'listening' : 'reading')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  analysisScope === 'reading' || analysisScope === 'listening'
                    ? 'bg-white text-purple-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cả kỹ năng
              </button>
              <button
                type="button"
                onClick={() => setAnalysisScope('overall')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  analysisScope === 'overall'
                    ? 'bg-white text-purple-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Toàn bộ
              </button>
            </div>
          </div>

          {/* Time range selection */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Thời gian:</span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-200/80 rounded-lg">
              <button
                type="button"
                onClick={() => setTimeRange('7d')}
                className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  timeRange === '7d' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                7 ngày
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('30d')}
                className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  timeRange === '30d' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                30 ngày
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('all')}
                className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  timeRange === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Toàn bộ
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Loading State */}
          {isLoading && (
            <div className="p-8 text-center space-y-4 my-8">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
                <Sparkles className="w-6 h-6 text-purple-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h4 className="text-sm font-bold text-slate-800">{loadingStep}</h4>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Gemini AI đang đối chiếu dữ liệu với tiêu chuẩn TOEIC ETS 990...
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                Không thể tải kết quả phân tích
              </div>
              <p className="text-xs text-rose-600">{error}</p>
              <button
                type="button"
                onClick={() => runAnalysis(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* Insufficient Data State (< 15 questions) */}
          {!isLoading && !error && isInsufficient && stats && (
            <div className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
                <Info className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  Chưa đủ dữ liệu để phân tích chuyên sâu
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Bạn mới làm <strong className="text-amber-800">{stats.total_count}/15 câu hỏi</strong> trong phạm vi này. Để đảm bảo tính chính xác và không đưa ra kết luận vội vàng, hệ thống yêu cầu tối thiểu 15 câu đã luyện.
                </p>
              </div>

              {/* Progress counter */}
              <div className="p-4 bg-white rounded-2xl border border-amber-200 max-w-sm mx-auto space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500">Tiến độ thu thập dữ liệu</span>
                  <span className="text-amber-700">{stats.total_count} / 15 câu ({Math.round(stats.total_count / 15 * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round(stats.total_count / 15 * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Cần làm thêm ít nhất <strong className="text-amber-700 font-bold">{Math.max(1, 15 - stats.total_count)} câu</strong> nữa.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onPracticeTopic) {
                      onPracticeTopic('Luyện tập tổng hợp', 5);
                    }
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Làm tiếp ngay {Math.max(5, 15 - stats.total_count)} câu</span>
                </button>
              </div>
            </div>
          )}

          {/* Full or Low-Confidence Report Display */}
          {!isLoading && !error && !isInsufficient && stats && assessment && (
            <div className="space-y-6">
              {/* Notice for Low Confidence (15 - 49 questions) */}
              {isLowConfidence && (
                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex items-start gap-2.5 text-xs text-sky-800">
                  <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Dữ liệu còn ít ({stats.total_count} câu):</span> Kết luận dưới đây chỉ mang tính chất tham khảo sơ bộ. Khi đạt trên 50 câu, AI sẽ phân tích mẫu lỗi sâu hơn.
                  </div>
                </div>
              )}

              {/* 1. Summary Header Card */}
              <div className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl shadow-md space-y-4">
                <div className="flex items-center justify-between text-xs text-indigo-200">
                  <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Target className="w-4 h-4 text-purple-400" />
                    Tổng quan hiệu suất · {data.scope_name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white font-semibold">
                    Độ tin cậy: {stats.data_confidence.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
                    <div className="text-[11px] text-indigo-200">Tổng câu</div>
                    <div className="text-xl sm:text-2xl font-black mt-0.5">{stats.total_count}</div>
                    <div className="text-[10px] text-indigo-300 mt-0.5">{stats.correct_count} đúng · {stats.wrong_count} sai</div>
                  </div>

                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
                    <div className="text-[11px] text-indigo-200">Độ chính xác</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">{stats.accuracy}%</div>
                    <div className="text-[10px] text-indigo-300 mt-0.5">{stats.accuracy >= 70 ? 'Khá tốt' : 'Cần cải thiện'}</div>
                  </div>

                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
                    <div className="text-[11px] text-indigo-200">Thời gian TB</div>
                    <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{stats.avg_time_sec}s</div>
                    <div className="text-[10px] text-indigo-300 mt-0.5">mỗi câu hỏi</div>
                  </div>
                </div>

                {/* AI Summary Text */}
                <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 text-xs sm:text-sm text-indigo-100 leading-relaxed">
                  <p>{assessment.summary_vi}</p>
                </div>
              </div>

              {/* 2. Strengths & Weaknesses Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Điểm mạnh */}
                <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Điểm mạnh ({assessment.strengths.length})
                  </div>

                  {assessment.strengths.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">
                      Chưa có chủ điểm nào đạt ngưỡng chính xác cao (≥ 75%). Hãy luyện tập thêm!
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {assessment.strengths.map((st, i) => (
                        <div key={i} className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{st.topic}</span>
                            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {st.evidence}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{st.comment_vi}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Điểm yếu & Cần khắc phục */}
                <div className="p-4 sm:p-5 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-3">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Điểm yếu cần ưu tiên ({assessment.weaknesses.length})
                  </div>

                  {assessment.weaknesses.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">
                      Tuyệt vời! Không phát hiện chủ điểm nào dưới mức kỳ vọng rõ rệt.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {assessment.weaknesses.map((wk, i) => (
                        <div key={i} className="p-3 bg-white rounded-xl border border-rose-100 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                                {wk.priority || i + 1}
                              </span>
                              {wk.topic}
                            </span>
                            <span className="text-[11px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              {wk.evidence}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 space-y-1">
                            <span className="font-semibold text-slate-700">Nguyên nhân có thể:</span>
                            <p className="text-slate-600 leading-relaxed">{wk.likely_cause_vi}</p>
                          </div>

                          {/* Action Buttons for this weakness */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                            {onPracticeTopic && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onPracticeTopic(wk.topic, 5);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Luyện 10 câu này</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenAITutorChat) {
                                  onOpenAITutorChat(`Giải thích chi tiết ngữ pháp và cách làm dạng bài: "${wk.topic}"`);
                                  onClose();
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Hỏi Gia sư AI</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Error Patterns & Behavioral Habits */}
              {assessment.patterns_vi && assessment.patterns_vi.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Mẫu lỗi & Thói quen làm bài phát hiện được
                  </h4>

                  <ul className="space-y-2 text-xs text-slate-700">
                    {assessment.patterns_vi.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 4. 7-Day Action Plan */}
              {assessment.study_plan && assessment.study_plan.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      Kế hoạch hành động 7 ngày gợi ý
                    </h4>
                    <span className="text-[11px] text-indigo-600 font-semibold">Từng bước cải thiện</span>
                  </div>

                  <div className="space-y-2">
                    {assessment.study_plan.map((step, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl border border-indigo-100 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-black text-indigo-700 uppercase">{step.day_or_step}</span>
                          <p className="text-xs font-semibold text-slate-800">{step.action_vi}</p>
                        </div>

                        {step.link_target && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              if (step.link_target.type === 'practice' && onNavigate) {
                                onNavigate(`/practice/reading`);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <span>Thực hiện</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Encouragement */}
              {assessment.encouragement_vi && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-indigo-50 border border-purple-200 text-center space-y-1">
                  <Sparkles className="w-5 h-5 text-purple-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed italic">
                    "{assessment.encouragement_vi}"
                  </p>
                </div>
              )}

              {/* Disclaimer */}
              <div className="text-[11px] text-slate-400 text-center py-2">
                Đánh giá do AI tạo từ dữ liệu luyện tập của bạn, chỉ mang tính tham khảo · Bảo mật và riêng tư 100%
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => runAnalysis(true)}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Phân tích lại</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleAskAITutor}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Hỏi Gia sư AI về kết quả này</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
