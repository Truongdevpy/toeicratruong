import { useAuth } from '../context/AuthContext';
import { AuthRequiredGate } from '../components/AuthRequiredGate';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Clock,
  GraduationCap,
  Flag,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  X,
  Send
} from 'lucide-react';
import { api } from '../services/api';
import { Question } from '../types';
import { AudioPlayer } from '../components/AudioPlayer';
import { QuestionImage } from '../components/QuestionImage';
import { sanitizeHtml } from '../utils/sanitize';

interface PlacementTestPageProps {
  onNavigate: (path: string) => void;
  onFocusModeChange?: (active: boolean) => void;
}


const cleanDisplayQuestionText = (text?: string, part?: number, qNum?: number | string): string => {
  if (!text) return '';
  let clean = text.trim();
  if (part === 1 || part === 2) {
    return '';
  }
  if (part === 6) {
    if (/^[A-D][.)]/i.test(clean) || !clean || /^[A-D.\s]+$/.test(clean) || clean.toLowerCase().startsWith('câu hỏi')) {
      return `Chọn từ hoặc câu thích hợp nhất để điền vào vị trí [${qNum || ''}].`;
    }
  }
  clean = clean.replace(/\s+[A-D][.)]\s+.*$/i, '').trim();
  return clean;
};

const cleanOptionText = (text?: string, letter?: string): string => {
  if (!text) return '';
  let clean = text.trim();
  if (letter) {
    clean = clean.replace(new RegExp(`^\\(?${letter}[\\.\\)\\:\\-]?\\s*`, 'i'), '').trim();
  }
  return clean;
};

export const PlacementTestPage: React.FC<PlacementTestPageProps> = ({ onNavigate, onFocusModeChange }) => {
  const { user } = useAuth();

  const [testMode, setTestMode] = useState<'intro' | 'testing'>('intro');
  const [assessmentType, setAssessmentType] = useState<'full' | 'custom'>('full');
  const [customSkills, setCustomSkills] = useState<string[]>(['Listening', 'Reading', 'Grammar']);

  useEffect(() => {
    onFocusModeChange?.(testMode === 'testing');
    return () => {
      onFocusModeChange?.(false);
    };
  }, [testMode, onFocusModeChange]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitTestRef = useRef<() => void>(() => {});

  // Helper to group Part 3 & Part 4 questions belonging to the same audio conversation / talk
  const getAudioGroup = useCallback((targetIndex: number) => {
    const targetQ = questions[targetIndex];
    if (!targetQ) return [];
    if (targetQ.part !== 3 && targetQ.part !== 4) {
      return [targetQ];
    }

    const pid = (targetQ as any).passage_id;
    if (pid) {
      let start = targetIndex;
      while (start > 0 && questions[start - 1].part === targetQ.part && (questions[start - 1] as any).passage_id === pid) {
        start--;
      }
      let end = targetIndex;
      while (end < questions.length - 1 && questions[end + 1].part === targetQ.part && (questions[end + 1] as any).passage_id === pid) {
        end++;
      }
      if (end >= start) {
        return questions.slice(start, end + 1);
      }
    }

    if (targetQ.audio_url) {
      let start = targetIndex;
      while (start > 0 && questions[start - 1].part === targetQ.part && questions[start - 1].audio_url === targetQ.audio_url) {
        start--;
      }
      let end = targetIndex;
      while (end < questions.length - 1 && questions[end + 1].part === targetQ.part && questions[end + 1].audio_url === targetQ.audio_url) {
        end++;
      }
      if (end >= start) {
        return questions.slice(start, end + 1);
      }
    }

    return [targetQ];
  }, [questions]);

  // Helper to group Part 6 & Part 7 questions belonging to the same reading passage
  const getPassageGroup = useCallback((targetIndex: number) => {
    const targetQ = questions[targetIndex];
    if (!targetQ) return [];
    if (targetQ.part !== 6 && targetQ.part !== 7) {
      return [targetQ];
    }

    if ((targetQ as any).passage_id) {
      const pid = (targetQ as any).passage_id;
      let start = targetIndex;
      while (
        start > 0 &&
        questions[start - 1].part === targetQ.part &&
        (questions[start - 1] as any).passage_id === pid
      ) {
        start--;
      }
      let end = targetIndex;
      while (
        end < questions.length - 1 &&
        questions[end + 1].part === targetQ.part &&
        (questions[end + 1] as any).passage_id === pid
      ) {
        end++;
      }
      if (end >= start) {
        return questions.slice(start, end + 1);
      }
    }

    if (targetQ.passage_text && targetQ.passage_text.trim().length > 0) {
      const norm = targetQ.passage_text.trim();
      let start = targetIndex;
      while (
        start > 0 &&
        questions[start - 1].part === targetQ.part &&
        questions[start - 1].passage_text &&
        questions[start - 1].passage_text!.trim() === norm
      ) {
        start--;
      }
      let end = targetIndex;
      while (
        end < questions.length - 1 &&
        questions[end + 1].part === targetQ.part &&
        questions[end + 1].passage_text &&
        questions[end + 1].passage_text!.trim() === norm
      ) {
        end++;
      }
      if (end >= start) {
        return questions.slice(start, end + 1);
      }
    }

    return [targetQ];
  }, [questions]);


  // Timer countdown
  useEffect(() => {
    if (testMode !== 'testing') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTestRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [testMode]);

  const startTest = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPlacementQuestions(assessmentType);
      setQuestions(data.questions || []);
      setTimeLeft((data.duration_minutes || 25) * 60);
      setTestMode('testing');
      setCurrentIndex(0);
      setAnswers({});
      setFlagged({});
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAnswer = (choice: string, questionId?: string) => {
    const targetQId = questionId || questions[currentIndex]?.id;
    if (!targetQId) return;
    setAnswers((prev) => ({
      ...prev,
      [targetQId]: choice,
    }));
  };

  const toggleFlag = (questionId?: string) => {
    const targetQId = questionId || questions[currentIndex]?.id;
    if (!targetQId) return;
    setFlagged((prev) => ({
      ...prev,
      [targetQId]: !prev[targetQId],
    }));
  };

  const handleSubmitTest = async () => {
    setIsSubmitting(true);
    try {
      await api.submitPlacementTest({
        test_type: assessmentType,
        answers,
        time_spent_seconds: 25 * 60 - timeLeft,
      });
      onNavigate('/placement-test/result');
    } catch (err) {
      console.error('Error submitting placement test:', err);
      onNavigate('/placement-test/result');
    } finally {
      setIsSubmitting(false);
      setIsSubmitModalOpen(false);
    }
  };
  useEffect(() => {
    handleSubmitTestRef.current = handleSubmitTest;
  });

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const currentAudioGroup = useMemo(() => {
    return questions.length > 0 ? getAudioGroup(currentIndex) : [];
  }, [questions.length, currentIndex, getAudioGroup]);

  const currentPassageGroup = useMemo(() => {
    return questions.length > 0 ? getPassageGroup(currentIndex) : [];
  }, [questions.length, currentIndex, getPassageGroup]);

  const isGroupView = Boolean(
    currentQ && (
      ((currentQ.part === 3 || currentQ.part === 4) && currentAudioGroup.length > 1) ||
      ((currentQ.part === 6 || currentQ.part === 7) && currentPassageGroup.length > 1)
    )
  );

  const activeGroup = useMemo(() => {
    if (!currentQ) return [];
    if ((currentQ.part === 3 || currentQ.part === 4) && currentAudioGroup.length > 1) {
      return currentAudioGroup;
    }
    if ((currentQ.part === 6 || currentQ.part === 7) && currentPassageGroup.length > 1) {
      return currentPassageGroup;
    }
    return [currentQ];
  }, [currentQ, currentAudioGroup, currentPassageGroup]);


  // INTRO SCREEN: Choose Full vs Custom Assessment
  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Đánh giá năng lực TOEIC"
        featureDesc="Kiểm tra trình độ nhanh 20-30 phút để AI chẩn đoán điểm số và xếp lớp lộ trình chuẩn."
        onNavigate={onNavigate}
      />
    );
  }

  if (testMode === 'intro') {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-8 sm:p-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Đánh giá trình độ tiếng Anh
            </h1>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              Bài kiểm tra giúp hệ thống hiểu chính xác trình độ hiện tại của bạn và tự động xây dựng lộ trình học phù hợp nhất.
            </p>
          </div>

          {/* Assessment Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div
              onClick={() => setAssessmentType('full')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                assessmentType === 'full'
                  ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900">Đánh giá toàn diện</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                    Khuyên dùng
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Bao gồm đầy đủ Listening (Parts 1-4), Reading (Parts 5-7), Ngữ pháp và Từ vựng.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>28 câu hỏi</span>
                <span className="font-semibold text-blue-600">25 phút</span>
              </div>
            </div>

            <div
              onClick={() => setAssessmentType('custom')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                assessmentType === 'custom'
                  ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900">Tự chọn kỹ năng</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    Linh hoạt
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Chủ động chọn các kỹ năng bạn muốn hệ thống tập trung chẩn đoán ngay bây giờ.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Tùy chỉnh</span>
                <span className="font-semibold text-slate-700">15-20 phút</span>
              </div>
            </div>
          </div>

          {assessmentType === 'custom' && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 mb-2">Chọn kỹ năng cần đánh giá:</div>
              <div className="grid grid-cols-2 gap-2">
                {['Listening', 'Reading', 'Grammar', 'Vocabulary'].map((sk) => {
                  const isChecked = customSkills.includes(sk);
                  return (
                    <button
                      key={sk}
                      type="button"
                      onClick={() =>
                        setCustomSkills((prev) =>
                          prev.includes(sk) ? prev.filter((x) => x !== sk) : [...prev, sk]
                        )
                      }
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                        isChecked
                          ? 'border-blue-600 bg-white text-blue-700 shadow-xs'
                          : 'border-slate-200 bg-slate-100/70 text-slate-500'
                      }`}
                    >
                      <span>{sk}</span>
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-4 bg-blue-50/60 border border-blue-200/70 rounded-2xl text-xs text-blue-800 leading-relaxed">
            <p className="font-semibold mb-1">Quy tắc làm bài:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-blue-700">
              <li>Không sử dụng tài liệu tra cứu ngoài để đảm bảo tính chính xác của lộ trình.</li>
              <li>Có thể đánh dấu cờ (Flag) để xem lại câu hỏi chưa chắc chắn.</li>
              <li>Thời gian làm bài sẽ tự động đếm ngược; bạn có thể nộp bài bất kỳ lúc nào.</li>
            </ul>
          </div>

          <button
            type="button"
            disabled={isLoading || (assessmentType === 'custom' && customSkills.length === 0)}
            onClick={startTest}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Đang chuẩn bị đề thi...' : 'Bắt đầu làm bài thi'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE TEST ENGINE SCREEN
  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col overflow-y-auto">
      {/* Test Engine Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn thoát? Kết quả hiện tại sẽ không được lưu.')) {
                onNavigate('/dashboard');
              }
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Thoát bài kiểm tra"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Bài đánh giá năng lực TOEIC</h2>
            <span className="text-xs text-slate-500">
              {isGroupView && activeGroup.length > 1
                ? `Câu ${activeGroup[0]?.question_number} - ${activeGroup[activeGroup.length - 1]?.question_number} / ${questions.length} (${answeredCount} đã trả lời)`
                : `Câu hỏi ${currentIndex + 1} / ${questions.length} (${answeredCount} đã trả lời)`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer Display */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono font-bold">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className={timeLeft < 300 ? 'text-red-600 animate-pulse' : ''}>
              {formatTimer(timeLeft)}
            </span>
          </div>

          {/* Submit Action */}
          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Nộp bài
          </button>
        </div>
      </header>

      {/* Test Engine Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Question & Content View */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          {currentQ ? (
            <>
              {/* Question Meta Label */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200/60">
                  Part {currentQ.part} - {currentQ.section === 'listening' ? 'Listening' : 'Reading'}
                  {isGroupView && ` (Cụm ${activeGroup.length} câu: Câu ${activeGroup[0]?.question_number} - ${activeGroup[activeGroup.length - 1]?.question_number})`}
                </span>
                {!isGroupView && (
                  <button
                    type="button"
                    onClick={() => toggleFlag(currentQ.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      flagged[currentQ.id]
                        ? 'bg-amber-100 text-amber-800 font-bold'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Flag className={`w-3.5 h-3.5 ${flagged[currentQ.id] ? 'fill-amber-600 text-amber-600' : ''}`} />
                    {flagged[currentQ.id] ? 'Đã đánh dấu' : 'Đánh dấu câu'}
                  </button>
                )}
              </div>

              {/* Listening Audio Player */}
              {(() => {
                const audioSrc = (isGroupView ? activeGroup[0]?.audio_url : currentQ.audio_url) || currentQ.audio_url;
                if (!audioSrc) return null;
                return (
                  <AudioPlayer
                    key={`audio-${isGroupView ? (activeGroup[0]?.id || currentQ.id) : currentQ.id}`}
                    src={audioSrc}
                    title={`Audio bài nghe Part ${currentQ.part}`}
                    autoPlay={true}
                  />
                );
              })()}

              {/* Question Image (Part 1, 3, 4, 7) */}
              {(() => {
                const groupImgQ = isGroupView ? activeGroup.find((q) => !!q.image_url) || (currentQ.image_url ? currentQ : null) : (currentQ.image_url ? currentQ : null);
                if (!groupImgQ || !groupImgQ.image_url) return null;
                return (
                  <div className="my-3 max-w-2xl mx-auto">
                    <QuestionImage
                      src={groupImgQ.image_url}
                      alt={`Hình ảnh câu hỏi ${isGroupView ? `${activeGroup[0]?.question_number}-${activeGroup[activeGroup.length - 1]?.question_number}` : currentIndex + 1}`}
                      part={currentQ.part}
                      questionNumber={groupImgQ.question_number || currentIndex + 1}
                      maxHeight={currentQ.part === 3 || currentQ.part === 4 || currentQ.part === 7 ? "max-h-[220px] sm:max-h-[380px] lg:max-h-[600px]" : "max-h-[180px] sm:max-h-80"}
                    />
                  </div>
                );
              })()}

              {/* Reading Passage (Part 6 & 7) */}
              {(() => {
                const passage = (isGroupView ? activeGroup.find((q) => !!q.passage_text)?.passage_text : currentQ.passage_text) || currentQ.passage_text;
                if (!passage || (currentQ.part < 6 && currentQ.part !== undefined)) return null;
                return (
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 leading-relaxed font-serif max-h-80 overflow-y-auto shadow-inner">
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(passage) }} />
                  </div>
                );
              })()}

              {/* Multi-question View for Part 3, 4, 6, 7 Groups */}
              {isGroupView ? (
                <div className="space-y-6 pt-2">
                  {activeGroup.map((subQ) => {
                    const prompt = cleanDisplayQuestionText(subQ.question_text, subQ.part, subQ.question_number);
                    const isFlag = Boolean(flagged[subQ.id]);

                    return (
                      <div key={subQ.id} className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                            <span className="text-blue-600 mr-2">Câu {subQ.question_number}.</span>
                            {prompt || (subQ.part === 6 ? `Chọn từ hoặc câu thích hợp nhất để điền vào vị trí [${subQ.question_number}].` : '')}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleFlag(subQ.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                              isFlag ? 'bg-amber-100 text-amber-800 font-bold' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            <Flag className={`w-3.5 h-3.5 ${isFlag ? 'fill-amber-600 text-amber-600' : ''}`} />
                          </button>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 gap-2.5">
                          {[
                            { key: 'A', text: subQ.option_a },
                            { key: 'B', text: subQ.option_b },
                            { key: 'C', text: subQ.option_c },
                            { key: 'D', text: subQ.option_d },
                          ]
                            .filter((opt) => opt.text !== null && opt.text !== undefined && !(subQ.part === 2 && opt.key === 'D'))
                            .map((opt) => {
                              const isSelected = answers[subQ.id] === opt.key;
                              const displayOption = cleanOptionText(opt.text, opt.key) || `(${opt.key})`;
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => handleSelectAnswer(opt.key, subQ.id)}
                                  className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? 'border-blue-600 bg-blue-50/80 shadow-xs'
                                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span
                                      className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {opt.key}
                                    </span>
                                    <span className={`text-xs sm:text-sm ${isSelected ? 'font-bold text-slate-900' : 'text-slate-800'}`}>
                                      {displayOption}
                                    </span>
                                  </div>
                                  <div
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                      isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                                    }`}
                                  >
                                    {isSelected && <CheckCircle2 className="w-3 h-3 fill-white text-blue-600" />}
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Single Question View (Part 1, 2, 5) */
                <>
                  {/* Question Text */}
                  {currentQ.part !== 1 && currentQ.part !== 2 && (
                    <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      <span className="text-blue-600 mr-2">Câu {currentIndex + 1}.</span>
                      {cleanDisplayQuestionText(currentQ.question_text, currentQ.part, currentIndex + 1)}
                    </div>
                  )}

                  {/* Header prompt for Part 1 & 2 */}
                  {(currentQ.part === 1 || currentQ.part === 2) && (
                    <div className="text-sm font-bold text-slate-500">
                      <span className="text-blue-600 font-extrabold mr-2">Câu {currentIndex + 1}.</span>
                      {currentQ.part === 1
                        ? 'Nghe các phương án và chọn câu miêu tả đúng nhất cho bức tranh.'
                        : 'Nghe câu hỏi và chọn câu trả lời phù hợp nhất.'}
                    </div>
                  )}

                  {/* Choices A, B, C, D */}
                  <div className="space-y-3 pt-2">
                    {[
                      { key: 'A', text: currentQ.option_a },
                      { key: 'B', text: currentQ.option_b },
                      { key: 'C', text: currentQ.option_c },
                      { key: 'D', text: currentQ.option_d },
                    ]
                      .filter((opt) => opt.text !== null && opt.text !== undefined && !(currentQ.part === 2 && opt.key === 'D'))
                      .map((opt) => {
                        const isSelected = answers[currentQ.id] === opt.key;
                        const isPart1or2 = currentQ.part === 1 || currentQ.part === 2;
                        const displayOption = isPart1or2 ? `(${opt.key})` : cleanOptionText(opt.text, opt.key) || `(${opt.key})`;

                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleSelectAnswer(opt.key)}
                            className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {opt.key}
                              </span>
                              <span className={`text-sm ${isSelected ? 'font-bold text-slate-900' : 'text-slate-800'}`}>
                                {displayOption}
                              </span>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 fill-white text-blue-600" />}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </>
              )}

              {/* Prev / Next Bottom Action Controls */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => {
                    if (isGroupView && activeGroup.length > 1) {
                      const firstInGroup = activeGroup[0];
                      const firstIdx = questions.findIndex((q) => q.id === firstInGroup.id);
                      setCurrentIndex(Math.max(0, (firstIdx >= 0 ? firstIdx : currentIndex) - 1));
                    } else {
                      setCurrentIndex((prev) => Math.max(0, prev - 1));
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {isGroupView && activeGroup.length > 1 ? 'Cụm câu trước' : 'Câu trước'}
                </button>

                <button
                  type="button"
                  disabled={
                    isGroupView && activeGroup.length > 1
                      ? questions.findIndex((q) => q.id === activeGroup[activeGroup.length - 1].id) >= questions.length - 1
                      : currentIndex === questions.length - 1
                  }
                  onClick={() => {
                    if (isGroupView && activeGroup.length > 1) {
                      const lastInGroup = activeGroup[activeGroup.length - 1];
                      const lastIdx = questions.findIndex((q) => q.id === lastInGroup.id);
                      setCurrentIndex(Math.min(questions.length - 1, (lastIdx >= 0 ? lastIdx : currentIndex) + 1));
                    } else {
                      setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {isGroupView && activeGroup.length > 1 ? 'Cụm câu tiếp theo' : 'Câu tiếp theo'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">Đang tải câu hỏi...</div>
          )}
        </div>

        {/* Right Sidebar Question Navigator Grid */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Danh sách câu hỏi</h3>
            <span className="text-xs text-slate-500 font-semibold">
              {answeredCount}/{questions.length} Đã làm
            </span>
          </div>

          {/* Status Legend */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-medium pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-blue-600"></span>
              <span>Đã trả lời</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200"></span>
              <span>Chưa trả lời</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-400"></span>
              <span>Đã gắn cờ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md ring-2 ring-blue-600 bg-white"></span>
              <span>Đang chọn</span>
            </div>
          </div>

          {/* Navigator Grid Buttons */}
          <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-5 gap-2 max-h-80 overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]);
              const isFlag = Boolean(flagged[q.id]);
              const isCurrent = currentIndex === idx;
              const isInActiveCluster = isGroupView && activeGroup.some((gq) => gq.id === q.id);

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center cursor-pointer ${
                    isCurrent
                      ? 'ring-2 ring-blue-600 ring-offset-1 scale-105 z-10'
                      : isInActiveCluster
                      ? 'ring-2 ring-blue-400 ring-offset-1 font-extrabold'
                      : ''
                  } ${
                    isAnswered
                      ? isInActiveCluster
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'bg-blue-600 text-white shadow-xs'
                      : isFlag
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : isInActiveCluster
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                  {isFlag && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500"></span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Nộp bài & Nhận lộ trình AI
          </button>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">Xác nhận nộp bài thi?</h3>
              <p className="text-xs text-slate-500">
                Bạn đã hoàn thành <strong>{answeredCount}</strong> / {questions.length} câu hỏi.
                {answeredCount < questions.length && (
                  <span className="text-amber-600 block mt-1 font-medium">
                    Còn {questions.length - answeredCount} câu chưa trả lời. Bạn vẫn muốn nộp bài?
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Làm tiếp
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitTest}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Đang chấm điểm...' : 'Đồng ý nộp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

