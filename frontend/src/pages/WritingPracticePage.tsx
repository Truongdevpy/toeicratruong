import { useAuth } from '../context/AuthContext';
import { AuthRequiredGate } from '../components/AuthRequiredGate';
import React, { useState, useEffect } from 'react';
import {
  Clock,
  ChevronRight,
  ChevronLeft,
  Search,
  Sparkles,
  Award,
  HelpCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Copy,
  FileCheck,
  Bot,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';

interface WritingPracticePageProps {
  onNavigate: (path: string) => void;
  onFocusModeChange?: (active: boolean) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onOpenRBAC?: () => void;
}

interface SWQuestion {
  question_number: number;
  question_type: string;
  prompt: string;
  context: string;
  image_url?: string;
}

interface SWTest {
  id: string;
  name: string;
  slug: string;
  test_type: string;
  total_questions: number;
  duration_minutes: number;
}

const WritingPracticePageInner: React.FC<WritingPracticePageProps> = ({ onFocusModeChange }) => {


  const [tests, setTests] = useState<SWTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartFilter, setSelectedPartFilter] = useState<'all' | 'q1_5' | 'q6_7' | 'q8'>('all');

  // Active Runner State
  const [activeTest, setActiveTest] = useState<SWTest | null>(null);
  const [questions, setQuestions] = useState<SWQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  useEffect(() => {
    onFocusModeChange?.(Boolean(activeTest));
    return () => {
      onFocusModeChange?.(false);
    };
  }, [activeTest, onFocusModeChange]);

  // User Essay Answers Map: question_number -> text
  const [answersMap, setAnswersMap] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 mins for writing test

  // Model Answer & Rubric Toggle
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Gia sư AI Writing Evaluation State
  const [questionAIFeedback, setQuestionAIFeedback] = useState<Record<number, any>>({});
  const [gradingQuestionLoading, setGradingQuestionLoading] = useState(false);
  const [fullSessionAIFeedback, setFullSessionAIFeedback] = useState<any | null>(null);
  const [gradingSessionLoading, setGradingSessionLoading] = useState(false);

  const handleGradeCurrentQuestion = async () => {
    if (!currentQ) return;
    const ans = currentText.trim();
    setGradingQuestionLoading(true);
    try {
      const res = await api.gradeSWQuestion({
        test_type: 'writing',
        question_number: currentQ.question_number,
        prompt: currentQ.prompt,
        context: currentQ.context,
        user_answer: ans || 'Học viên chưa nhập câu trả lời hoàn chỉnh.'
      });
      if (res) {
        setQuestionAIFeedback((prev) => ({ ...prev, [currentQIndex]: res }));
      }
    } catch (err) {
      console.error('Error grading writing question:', err);
    } finally {
      setGradingQuestionLoading(false);
    }
  };

  const handleGradeFullSession = async () => {
    if (!activeTest || questions.length === 0) return;
    setGradingSessionLoading(true);
    try {
      const answersPayload = questions.map((q, idx) => ({
        question_number: q.question_number,
        prompt: q.prompt,
        context: q.context,
        user_answer: answersMap[idx]?.trim() || ''
      }));

      const res = await api.gradeSWTest({
        test_type: 'writing',
        test_name: activeTest.name,
        answers: answersPayload
      });
      if (res) {
        setFullSessionAIFeedback(res);
      }
    } catch (err) {
      console.error('Error grading full writing test:', err);
    } finally {
      setGradingSessionLoading(false);
    }
  };

  const loadWritingTests = async () => {
    try {
      setLoading(true);
      const res = await api.getSWTests({ test_type: 'writing' });
      if (res && res.tests && res.tests.length > 0) {
        setTests(res.tests);
      } else {
        const fallbacks: SWTest[] = Array.from({ length: 45 }, (_, i) => ({
          id: `sw_wr_${i + 1}`,
          name: `TOEIC SW Writing Test ${i + 1}`,
          slug: `toeic-sw-writing-test-${i + 1}`,
          test_type: 'sw_writing',
          total_questions: 8,
          duration_minutes: 60
        }));
        setTests(fallbacks);
      }
    } catch {
      const fallbacks: SWTest[] = Array.from({ length: 45 }, (_, i) => ({
        id: `sw_wr_${i + 1}`,
        name: `TOEIC SW Writing Test ${i + 1}`,
        slug: `toeic-sw-writing-test-${i + 1}`,
        test_type: 'sw_writing',
        total_questions: 8,
        duration_minutes: 60
      }));
      setTests(fallbacks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWritingTests();
  }, []);

  const handleStartTest = async (test: SWTest) => {
    try {
      setActiveTest(test);
      setCurrentQIndex(0);
      setAnswersMap({});
      setQuestionAIFeedback({});
      setFullSessionAIFeedback(null);
      setShowModelAnswer(false);
      setCompletedSummary(false);
      setTimeLeft(60 * 60);

      const res = await api.getSWTestDetail(test.id);
      if (res && res.questions && res.questions.length > 0) {
        setQuestions(res.questions);
      } else {
        setQuestions(generateSampleQuestions());
      }
    } catch {
      setQuestions(generateSampleQuestions());
    } finally {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const generateSampleQuestions = (): SWQuestion[] => [
    {
      question_number: 1,
      question_type: 'Writing',
      prompt: 'Viết một câu hoàn chỉnh dựa trên bức tranh và 2 từ gợi ý: [discuss / project]',
      context: 'Write a sentence based on a picture\\nKey words: discuss, project',
      image_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80'
    },
    {
      question_number: 2,
      question_type: 'Writing',
      prompt: 'Viết một câu hoàn chỉnh dựa trên bức tranh và 2 từ gợi ý: [review / document]',
      context: 'Write a sentence based on a picture\\nKey words: review, document',
      image_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80'
    },
    {
      question_number: 3,
      question_type: 'Writing',
      prompt: 'Viết một câu hoàn chỉnh dựa trên bức tranh và 2 từ gợi ý: [type / keyboard]',
      context: 'Write a sentence based on a picture\\nKey words: type, keyboard',
      image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80'
    },
    {
      question_number: 4,
      question_type: 'Writing',
      prompt: 'Viết một câu hoàn chỉnh dựa trên bức tranh và 2 từ gợi ý: [wait / counter]',
      context: 'Write a sentence based on a picture\\nKey words: wait, counter',
      image_url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80'
    },
    {
      question_number: 5,
      question_type: 'Writing',
      prompt: 'Viết một câu hoàn chỉnh dựa trên bức tranh và 2 từ gợi ý: [shake hands / agreement]',
      context: 'Write a sentence based on a picture\\nKey words: shake hands, agreement',
      image_url: 'https://images.unsplash.com/photo-1573497491208-6b1acb260507?auto=format&fit=crop&w=800&q=80'
    },
    {
      question_number: 6,
      question_type: 'Writing',
      prompt: 'Trả lời thư điện tử theo các yêu cầu cụ thể.',
      context: 'Respond to an email\\nFrom: recruitment@nexuscorp.com\\nTo: Applicant\\nSubject: Accounting Supervisor Opening\\nDear Applicant,\\nThank you for your interest in Nexus Corporation. We are currently seeking an experienced Accounting Supervisor to lead our financial reporting team. Please reply to this email outlining your relevant accounting background and asking TWO questions regarding the job responsibilities or company benefits.\\n\\nDirections: Make ONE statement about your experience and ask TWO questions about the position.',
      image_url: ''
    },
    {
      question_number: 7,
      question_type: 'Writing',
      prompt: 'Trả lời thư khiếu nại hoặc thông báo dịch vụ khách hàng.',
      context: 'Respond to an email\\nFrom: Carlos Mendez, Facilities Manager\\nTo: All Office Tenants\\nSubject: Air Conditioning Maintenance Notice\\nSent: July 12\\nDear Tenants,\\nWe will be conducting routine maintenance on the central air conditioning units this coming Saturday from 8:00 AM to 4:00 PM. During this period, the building cooling will be temporarily offline. Please let us know if your office plans to be open during this window and describe any specific accommodations needed.\\n\\nDirections: Respond as a tenant manager. Confirm your weekend plans and ask TWO questions about building access.',
      image_url: ''
    },
    {
      question_number: 8,
      question_type: 'Writing',
      prompt: 'Viết một bài luận hoàn chỉnh thể hiện quan điểm (ít nhất 300 từ).',
      context: 'Write an opinion essay\\nSome companies prefer to promote employees from within the company, while others prefer to hire experienced outsiders for senior management positions. Which approach do you think is more effective? Give specific reasons and examples to support your view.',
      image_url: ''
    }
  ];

  // Timer countdown
  useEffect(() => {
    let interval: any = null;
    if (activeTest && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTest, timeLeft]);

  const currentQ = questions[currentQIndex];
  const currentText = answersMap[currentQIndex] || '';

  const getQuestionTypeInfo = (q: SWQuestion) => {
    if (q.question_number <= 5) {
      return {
        badge: 'Questions 1-5',
        type: 'Viết câu theo tranh',
        targetWords: '10-25 từ',
        criteria: 'Ngữ pháp chính xác & Sử dụng đúng 2 từ cho trước'
      };
    }
    if (q.question_number <= 7) {
      return {
        badge: 'Questions 6-7',
        type: 'Trả lời Email công việc',
        targetWords: '80-120 từ',
        criteria: 'Trang trọng, đáp ứng đủ các yêu cầu đề bài'
      };
    }
    return {
      badge: 'Question 8',
      type: 'Bài luận quan điểm (Opinion Essay)',
      targetWords: '300+ từ',
      criteria: 'Bố cục 4 đoạn, luận điểm rõ ràng, ví dụ thuyết phục'
    };
  };

  const typeInfo = currentQ ? getQuestionTypeInfo(currentQ) : null;
  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;
  const charCount = currentText.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const filteredTests = tests.filter((t) => {
    return (
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });
  return (
    <div className="min-h-screen bg-slate-50 pb-16">


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTest && questions.length > 0 ? (
          <div className="space-y-6">
            {/* Top Navigation Bar */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveTest(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ← Danh sách đề
                </button>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {activeTest.name.replace(/^study4_|^dautoeic_/i, '')}
                  </h2>
                  <div className="text-xs text-slate-500">
                    Câu hỏi {currentQIndex + 1} / {questions.length} • {typeInfo?.type}
                  </div>
                </div>
              </div>

              {/* Timer & Question Navigator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:
                    {(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {questions.map((q, idx) => {
                    const isCurrent = idx === currentQIndex;
                    const hasAnswer = !!answersMap[idx]?.trim();
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCurrentQIndex(idx);
                          setShowModelAnswer(false);
                        }}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                          isCurrent
                            ? 'bg-blue-600 text-white shadow-xs'
                            : hasAnswer
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Split-Screen Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Pane: Question Prompt & Materials (6 Cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                      {typeInfo?.badge} • {typeInfo?.type}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Mục tiêu: <b>{typeInfo?.targetWords}</b>
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
                    💡 <b>Yêu cầu:</b> {currentQ.prompt || 'Hoàn thành câu trả lời theo chỉ dẫn bên dưới.'}
                  </div>

                  {currentQ.image_url && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center max-h-[380px]">
                      <img
                        src={currentQ.image_url}
                        alt="Writing prompt visual"
                        className="w-full h-full object-contain max-h-[380px]"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100 text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium">
                    {currentQ.context}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    <b>Tiêu chí chấm điểm ETS:</b> {typeInfo?.criteria}
                  </div>
                </div>

                {/* Model Answer Toggle */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <h3 className="font-bold text-sm sm:text-base text-slate-900">
                        Bài viết mẫu đạt điểm tối đa (Band 200)
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowModelAnswer(!showModelAnswer)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {showModelAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span>{showModelAnswer ? 'Ẩn câu mẫu' : 'Xem câu mẫu'}</span>
                    </button>
                  </div>

                  {showModelAnswer && (
                    <div className="space-y-3 pt-3 border-t border-slate-100 text-xs sm:text-sm">
                      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-950 space-y-2">
                        <div className="font-bold text-xs uppercase tracking-wider text-amber-800">
                          {currentQ.question_number <= 5
                            ? 'Câu mẫu đạt chuẩn ngữ pháp:'
                            : currentQ.question_number <= 7
                            ? 'Email mẫu tiêu chuẩn công sở:'
                            : 'Dàn ý & Đoạn mở bài mẫu:'}
                        </div>
                        <p className="leading-relaxed italic whitespace-pre-line">
                          {currentQ.question_number <= 5 &&
                            `"The colleagues are gathering around the conference table to discuss the new marketing project."`}
                          {currentQ.question_number > 5 && currentQ.question_number <= 7 &&
                            `Dear Hiring Team,\\n\\nI am writing to express my strong interest in the Accounting Supervisor position at your company. With over four years of auditing and financial reporting experience, I am confident in leading your accounting team effectively.\\n\\nCould you please let me know what the core day-to-day responsibilities will be during the first three months? Additionally, does the company offer support for professional CPA certification?\\n\\nSincerely,\\nAlex Morgan`}
                          {currentQ.question_number === 8 &&
                            `"In today's fast-paced corporate environment, the debate over internal promotion versus hiring external leaders is prominent. While hiring from the outside can bring fresh perspectives, I firmly believe that promoting employees from within is a far more effective strategy for long-term organizational success. First, internal promotions foster high motivation and loyalty. Second, internal candidates already possess deep familiarity with company culture and processes, minimizing onboarding disruption."`}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                        💡 <b>Mẹo làm bài:</b> Đảm bảo độ chính xác của thì động từ, sự hòa hợp chủ vị (subject-verb agreement) và sử dụng các liên từ chuyển ý phù hợp như <i>Furthermore</i>, <i>In addition</i>, <i>Consequently</i>.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Pane: Writing Textarea Editor (6 Cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-900">Khu vực làm bài</h3>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-mono font-bold">
                        {wordCount} từ
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono">
                        {charCount} ký tự
                      </span>
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="relative flex-1 min-h-[340px]">
                    <textarea
                      value={currentText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAnswersMap((prev) => ({ ...prev, [currentQIndex]: val }));
                      }}
                      placeholder={
                        currentQ.question_number <= 5
                          ? 'Nhập câu hoàn chỉnh của bạn tại đây (sử dụng 2 từ khóa đề bài yêu cầu)...'
                          : currentQ.question_number <= 7
                          ? 'Soạn thảo email phản hồi đầy đủ mở đầu, nội dung và lời kết...'
                          : 'Viết bài luận quan điểm hoàn chỉnh (khoảng 300 từ với luận điểm và ví dụ rõ ràng)...'
                      }
                      className="w-full h-full min-h-[340px] p-4 text-xs sm:text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-none font-sans"
                    />
                  </div>

                  {/* Editor Utility Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      disabled={!currentText.trim()}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copySuccess ? 'Đã sao chép!' : 'Sao chép bài viết'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">
                        {currentText.trim() ? '✓ Đã tự động lưu nháp' : 'Chưa nhập câu trả lời'}
                      </span>
                    </div>
                  </div>

                  {/* Gia sư AI Grader Trigger Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      disabled={gradingQuestionLoading}
                      onClick={handleGradeCurrentQuestion}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {gradingQuestionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Gia sư AI đang chấm điểm & sửa lỗi...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Gia sư AI Chấm điểm & Sửa bài câu này</span>
                        </>
                      )}
                    </button>

                    {questionAIFeedback[currentQIndex] && (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                        🎯 {questionAIFeedback[currentQIndex].score_estimate}/200 TOEIC • {questionAIFeedback[currentQIndex].level}
                      </span>
                    )}
                  </div>

                  {/* Gia sư AI Feedback Result Box */}
                  {questionAIFeedback[currentQIndex] && (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/80 border border-indigo-200/90 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                            AI
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-indigo-950">Gia sư AI Chấm Điểm & Sửa Bài</h4>
                            <p className="text-[10px] text-slate-500">Chuẩn khảo thí TOEIC Writing ETS</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Ngữ pháp: {questionAIFeedback[currentQIndex].grammar_score || 4.2}/5.0
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            Từ vựng: {questionAIFeedback[currentQIndex].vocabulary_score || 4.0}/5.0
                          </span>
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                            Bố cục: {questionAIFeedback[currentQIndex].organization_score || 4.5}/5.0
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Lời bình của Gia sư AI:</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-indigo-100">
                          {questionAIFeedback[currentQIndex].overall_comment}
                        </p>
                      </div>

                      {questionAIFeedback[currentQIndex].corrections && questionAIFeedback[currentQIndex].corrections.length > 0 && (
                        <div className="space-y-2 bg-white p-3 rounded-xl border border-indigo-100">
                          <span className="text-[11px] font-bold text-indigo-900 block">
                            📝 Sửa lỗi câu & cách diễn đạt chuẩn ETS:
                          </span>
                          <div className="space-y-2">
                            {questionAIFeedback[currentQIndex].corrections.map((corr: any, idx: number) => (
                              <div key={idx} className="text-xs space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                                {corr.original && (
                                  <div className="text-red-700 line-through">
                                    <span className="font-semibold text-slate-400 mr-1">Gốc:</span>
                                    {corr.original}
                                  </div>
                                )}
                                {corr.corrected && (
                                  <div className="text-emerald-700 font-medium">
                                    <span className="font-semibold text-slate-400 mr-1">Sửa lại:</span>
                                    {corr.corrected}
                                  </div>
                                )}
                                {corr.reason && (
                                  <div className="text-[11px] text-slate-500 italic">
                                    💡 {corr.reason}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {questionAIFeedback[currentQIndex].improved_answer && (
                        <div className="space-y-1 bg-white p-3 rounded-xl border border-indigo-100">
                          <span className="text-[11px] font-bold text-indigo-700">🎯 Bài viết tối ưu chuẩn ETS (Band 200):</span>
                          <p className="text-xs text-slate-700 italic leading-relaxed whitespace-pre-line">
                            "{questionAIFeedback[currentQIndex].improved_answer}"
                          </p>
                        </div>
                      )}

                      {questionAIFeedback[currentQIndex].actionable_tips && questionAIFeedback[currentQIndex].actionable_tips.length > 0 && (
                        <div className="space-y-1 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                          <span className="text-[11px] font-bold text-indigo-900">⚡ Mẹo nâng band từ Gia sư AI:</span>
                          <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4">
                            {questionAIFeedback[currentQIndex].actionable_tips.map((tip: string, idx: number) => (
                              <li key={idx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prev / Next Bottom Bar */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={currentQIndex === 0}
                      onClick={() => {
                        if (currentQIndex > 0) {
                          setCurrentQIndex(currentQIndex - 1);
                          setShowModelAnswer(false);
                        }
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Câu trước</span>
                    </button>

                    {currentQIndex < questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentQIndex(currentQIndex + 1);
                          setShowModelAnswer(false);
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Câu tiếp theo</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCompletedSummary(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Nộp bài viết</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Completed Modal */}
            {completedSummary && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
                  <div className="text-center space-y-1.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                      <Award className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">Chúc mừng bạn đã hoàn thành bài viết!</h3>
                    <p className="text-xs text-slate-500">
                      Đề thi: <b>{activeTest.name}</b>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-2xl font-black text-blue-600">
                        {Object.values(answersMap).filter((a) => a && a.trim()).length}/{questions.length}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">Số câu đã hoàn thành</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-2xl font-black text-emerald-600">
                        {fullSessionAIFeedback?.total_score_estimate ? `${fullSessionAIFeedback.total_score_estimate}/200` : 'Level 7-8'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">Điểm thi Writing ước tính</div>
                    </div>
                  </div>

                  {/* Full Session AI Grader Button & Report */}
                  {!fullSessionAIFeedback ? (
                    <button
                      type="button"
                      disabled={gradingSessionLoading}
                      onClick={handleGradeFullSession}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {gradingSessionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gia sư AI đang phân tích toàn bộ bài thi viết...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Nhận Đánh Giá & Lời Bình Toàn Bài Từ Gia Sư AI</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-3 text-left">
                      <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
                        <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-indigo-600" />
                          Báo cáo đánh giá tổng thể Gia sư AI
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-600 text-white">
                          {fullSessionAIFeedback.level}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-indigo-100">
                        {fullSessionAIFeedback.overall_comment}
                      </p>

                      {fullSessionAIFeedback.action_plan && fullSessionAIFeedback.action_plan.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-indigo-900">🎯 Lộ trình cải thiện điểm số:</span>
                          <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                            {fullSessionAIFeedback.action_plan.map((item: string, idx: number) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCompletedSummary(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Tiếp tục xem lại
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCompletedSummary(false);
                        setActiveTest(null);
                        setFullSessionAIFeedback(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Luyện đề khác
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Catalog view */
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm bài thi TOEIC Writing (Ví dụ: Test 1, Test 10...)"
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {[
                  { id: 'all', label: 'Tất cả (45 đề)' },
                  { id: 'q1_5', label: 'Q1-5: Viết câu theo tranh' },
                  { id: 'q6_7', label: 'Q6-7: Trả lời Email' },
                  { id: 'q8', label: 'Q8: Bài luận quan điểm' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedPartFilter(item.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      selectedPartFilter === item.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
                ))}
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700">Không tìm thấy bài thi phù hợp</h3>
                <p className="text-xs text-slate-400">Hãy thử tìm từ khóa khác như "Test 1" hoặc "Writing".</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTests.map((test, index) => {
                  const cleanTitle = test.name.replace(/^study4_|^dautoeic_/i, '');
                    

return (
                    <div
                      key={test.id}
                      className="bg-white border border-slate-200/90 hover:border-blue-400 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 text-[10px] font-bold">
                            ETS Writing #{(index + 1).toString().padStart(2, '0')}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> 60 phút
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {cleanTitle}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{test.total_questions || 8} câu hỏi</span>
                          <span>?</span>
                          <span>Chuẩn format ETS</span>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          Có đếm từ & bài mẫu
                        </span>

                        <button
                          type="button"
                          onClick={() => handleStartTest(test)}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Luyện ngay</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


export const WritingPracticePage: React.FC<WritingPracticePageProps> = (props) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Luyện viết (TOEIC Writing)"
        featureDesc="45 đề thi viết câu theo tranh, phản hồi email và bài luận 300+ từ với chấm điểm AI."
        onNavigate={props.onNavigate}
        onOpenAuth={props.onOpenAuth}
        onOpenRBAC={props.onOpenRBAC}
      />
    );
  }

  return <WritingPracticePageInner {...props} />;
};
