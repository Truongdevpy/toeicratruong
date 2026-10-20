import { useAuth } from '../context/AuthContext';
import { AuthRequiredGate } from '../components/AuthRequiredGate';
import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Bot,
  ArrowRight,
  HelpCircle,
  Check,
  X,
  RotateCcw,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { sanitizeHtml } from '../utils/sanitize';
import { GrammarTopic } from '../types';

interface GrammarPageProps {
  onNavigate: (path: string) => void;
  onFocusModeChange?: (active: boolean) => void;
}

export const GrammarPage: React.FC<GrammarPageProps> = ({ onNavigate, onFocusModeChange }) => {
  const { user } = useAuth();

  const [topics, setTopics] = useState<GrammarTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Interactive quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizBatchIndex, setQuizBatchIndex] = useState(0);

  const BATCH_SIZE = 5;

  useEffect(() => {
    onFocusModeChange?.(Boolean(selectedTopicId));
    return () => {
      onFocusModeChange?.(false);
    };
  }, [selectedTopicId, onFocusModeChange]);


  const loadTopics = async () => {
    try {
      setLoading(true);
      const res = await api.getGrammarTopics();
      if (res && res.topics && res.topics.length > 0) {
        setTopics(res.topics);
        setSelectedTopicId(res.topics[0].id);
      } else {
        const fallback: GrammarTopic[] = [
          {
            id: 'tenses-present-perfect',
            title_en: 'Verb Tenses',
            title_vi: 'Thì động từ',
            description_vi: '12 thì tiếng Anh trọng điểm trong TOEIC Part 5 & 6.',
            category: 'Động từ',
            theory_html: '<p>Trong bài thi TOEIC, bẫy thường gặp nhất là sự nhầm lẫn giữa <strong>Quá khứ đơn</strong> và <strong>Hiện tại hoàn thành</strong>.</p>',
            formula: 'S + have/has + V3/ed | S + V2/ed | S + will + V',
            examples: [
              { en: 'Ms. Carter has managed the marketing team since 2021.', vi: 'Bà Carter đã quản lý đội ngũ marketing từ năm 2021.' }
            ],
            tips: ['Khi thấy "since", "for + khoảng thời gian" -> Chọn Hiện tại hoàn thành.'],
            questions_count: 2,
            practice_questions: [
              {
                id: 'fb-t-1',
                question_text: 'Ms. Clara ________ as the regional sales director for the past five years.',
                options: ['A. served', 'B. has served', 'C. serves', 'D. is serving'],
                correct_answer: 'B',
                explanation_vi: 'Dấu hiệu "for the past five years" -> Dùng thì Hiện tại hoàn thành (has served).',
                translation_vi: 'Cô Clara đã giữ chức vụ giám đốc bán hàng khu vực được 5 năm qua.'
              },
              {
                id: 'fb-t-2',
                question_text: 'The financial report ________ ready as soon as the audit is completed.',
                options: ['A. will be', 'B. was', 'C. has been', 'D. being'],
                correct_answer: 'A',
                explanation_vi: 'Mệnh đề trạng ngữ thời gian với as soon as + hiện tại, mệnh đề chính chia tương lai đơn (will be).',
                translation_vi: 'Báo cáo tài chính sẽ sẵn sàng ngay khi cuộc kiểm toán hoàn thành.'
              }
            ]
          }
        ];
        setTopics(fallback);
        setSelectedTopicId(fallback[0].id);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadTopics();
  }, [user]);

  const categories = ['all', ...Array.from(new Set(topics.map((t) => t.category)))];

  const filteredTopics = topics.filter((t) => {
    const matchCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchSearch =
      t.title_vi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });
  const currentTopic = topics.find((t) => t.id === selectedTopicId) || topics[0];

  // Derive mini-quiz dynamically from the current topic questions
  const allTopicQuestions = useMemo(() => {
    return currentTopic?.practice_questions || [];
  }, [currentTopic]);

  const totalBatches = Math.max(1, Math.ceil(allTopicQuestions.length / BATCH_SIZE));

  const miniQuiz = useMemo(() => {
    if (!allTopicQuestions || allTopicQuestions.length === 0) {
      return [];
    }
    const start = quizBatchIndex * BATCH_SIZE;
    return allTopicQuestions.slice(start, start + BATCH_SIZE).map((q: any, idx: number) => {
      const options = q.options && q.options.length === 4
        ? q.options
        : [
            `A. ${q.option_a || ''}`,
            `B. ${q.option_b || ''}`,
            `C. ${q.option_c || ''}`,
            `D. ${q.option_d || ''}`,
          ];
      return {
        id: q.id || `${selectedTopicId}-${quizBatchIndex}-${idx}`,
        question: q.question_text || q.question || '',
        options,
        correct: (q.correct_answer || q.correct || 'A').trim().toUpperCase().charAt(0),
        explanation: q.explanation_vi || q.explanation || 'Xem lại lý thuyết và công thức ở phần trên để nắm vững dạng bài này.',
        translation: q.translation_vi || q.translation || ''
      };
    });
  }, [allTopicQuestions, quizBatchIndex, selectedTopicId]);

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizBatchIndex(0);
  };

  const handleSelectAnswer = (qIndex: number, optionLetter: string) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [qIndex]: optionLetter }));
  };

  const handleResetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const handleNextBatch = () => {
    if (quizBatchIndex + 1 < totalBatches) {
      setQuizBatchIndex((prev) => prev + 1);
      setQuizAnswers({});
      setQuizSubmitted(false);
    }
  };

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Ngữ pháp TOEIC 38 chuyên đề"
        featureDesc="Lý thuyết từ loại, thì, mệnh đề quan hệ và bài tập phân tích bẫy đề thi ETS."
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <BookOpen className="w-3.5 h-3.5" /> {topics.length || 15} Chuyên đề trọng điểm
              </span>
              <span className="text-xs text-slate-500 font-medium">Bám sát cấu trúc đề ETS TOEIC 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Kho Ngữ Pháp Thực Chiến TOEIC
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Học lý thuyết cô đọng, công thức vàng, nhận diện bẫy đề thi và làm bài tập củng cố riêng biệt cho từng chuyên đề.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/ai-tutor')}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-xl shadow-xs hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            Hỏi AI Tutor về ngữ pháp
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Topics Navigation */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm chuyên đề ngữ pháp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {cat === 'all' ? 'Tất cả' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Đang tải chuyên đề...</div>
              ) : filteredTopics.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Không tìm thấy chuyên đề phù hợp</div>
              ) : (
                filteredTopics.map((topic, index) => {
                  const isSelected = topic.id === selectedTopicId;
                  const qCount = topic.questions_count ?? topic.practice_questions?.length ?? 0;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => handleSelectTopic(topic.id)}
                      className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/70 border-l-4 border-blue-600'
                          : 'hover:bg-slate-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 truncate max-w-[120px]">
                            {topic.category}
                          </span>
                          {qCount > 0 && (
                            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded">
                              {qCount} câu
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 truncate">{topic.title_vi}</h4>
                        <p className="text-[11px] text-slate-500 truncate">{topic.title_en}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          {/* Right Column: Topic Detail Content */}
          <div className="lg:col-span-8 space-y-6">
            {currentTopic ? (
              <>
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      {currentTopic.category}
                    </span>
                    <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Xuất hiện 95% đề thi ETS
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      {currentTopic.title_vi}
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">{currentTopic.title_en}</p>
                  </div>

                  {currentTopic.description_vi && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-700 leading-relaxed">
                      {currentTopic.description_vi}
                    </div>
                  )}

                  {currentTopic.formula && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60">
                      <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-blue-600" />
                        Công thức cốt lõi (Formula)
                      </div>
                      <code className="text-xs sm:text-sm font-bold text-blue-950 font-mono tracking-wide">
                        {currentTopic.formula}
                      </code>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    Lý thuyết & Quy tắc nhận diện
                  </h3>

                  <div
                    className="prose prose-sm max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentTopic.theory_html) }}
                  />

                  {currentTopic.tips && currentTopic.tips.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200/70 space-y-2">
                      <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Mẹo làm bài & Cảnh giác bẫy ETS (Exam Tips)
                      </div>
                      <ul className="space-y-1.5">
                        {currentTopic.tips.map((tip, idx) => (
                          <li key={idx} className="text-xs text-amber-900/90 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {currentTopic.examples && currentTopic.examples.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Ví dụ thực tế trong đề thi (Authentic Examples)
                    </h3>

                    <div className="space-y-3">
                      {currentTopic.examples.map((ex, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900">{ex.en}</p>
                          <p className="text-xs text-slate-600 italic">👉 {ex.vi}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Instant Mini-Quiz */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-purple-600" />
                        Bài tập vận dụng tức thì: {currentTopic.title_vi}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Luyện tập {miniQuiz.length} câu hỏi trọng điểm chuyên đề này
                        {totalBatches > 1 && ` (Bộ ${quizBatchIndex + 1}/${totalBatches})`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {quizSubmitted && (
                        <button
                          onClick={handleResetQuiz}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Làm lại
                        </button>
                      )}
                      {totalBatches > 1 && quizBatchIndex + 1 < totalBatches && (
                        <button
                          onClick={handleNextBatch}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          Bộ tiếp theo <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {miniQuiz.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Chuyên đề đang được cập nhật câu hỏi bài tập.
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {miniQuiz.map((q, idx) => {
                        const selected = quizAnswers[idx];
                        const isCorrect = selected === q.correct;
                        return (
                          <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
                            <p className="text-xs sm:text-sm font-bold text-slate-900">
                              <span className="text-blue-600 font-black mr-1.5">
                                Câu {quizBatchIndex * BATCH_SIZE + idx + 1}:
                              </span>
                              {q.question}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt: string) => {
                                const letter = opt.substring(0, 1).toUpperCase();
                                const isChoice = selected === letter;
                                let btnClass = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';

                                if (quizSubmitted) {
                                  if (letter === q.correct) {
                                    btnClass = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                                  } else if (isChoice && !isCorrect) {
                                    btnClass = 'bg-rose-50 border-rose-400 text-rose-900';
                                  }
                                } else if (isChoice) {
                                  btnClass = 'bg-blue-50 border-blue-500 text-blue-700 font-semibold ring-1 ring-blue-500';
                                }

                                return (
                                  <button
                                    key={opt}
                                    onClick={() => handleSelectAnswer(idx, letter)}
                                    disabled={quizSubmitted}
                                    className={`p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${btnClass}`}
                                  >
                                    <span>{opt}</span>
                                    {quizSubmitted && letter === q.correct && (
                                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    )}
                                    {quizSubmitted && isChoice && !isCorrect && (
                                      <X className="w-4 h-4 text-rose-600 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {quizSubmitted && (
                              <div className="space-y-2 mt-2">
                                {q.translation && (
                                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-950 space-y-1">
                                    <span className="font-bold flex items-center gap-1 text-emerald-800">
                                      👉 Dịch nghĩa câu:
                                    </span>
                                    <p className="text-slate-700 italic">{q.translation}</p>
                                  </div>
                                )}
                                <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-900 space-y-1.5">
                                  <span className="font-bold flex items-center gap-1 text-blue-800">
                                    💡 Phân tích & Giải thích chi tiết:
                                  </span>
                                  <p className="text-slate-700 whitespace-pre-line leading-relaxed">{q.explanation}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {miniQuiz.length > 0 && (
                    !quizSubmitted ? (
                      <button
                        onClick={() => setQuizSubmitted(true)}
                        disabled={Object.keys(quizAnswers).length < miniQuiz.length}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all ${
                          Object.keys(quizAnswers).length < miniQuiz.length
                            ? 'bg-slate-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                        }`}
                      >
                        Kiểm tra đáp án ({Object.keys(quizAnswers).length}/{miniQuiz.length} câu)
                      </button>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-400">Kết quả bài tập chuyên đề: {currentTopic.title_vi}</div>
                          <div className="text-base font-bold text-emerald-400">
                            Đúng {Object.entries(quizAnswers).filter(([idx, ans]) => ans === miniQuiz[Number(idx)].correct).length}/{miniQuiz.length} câu
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {totalBatches > 1 && quizBatchIndex + 1 < totalBatches && (
                            <button
                              onClick={handleNextBatch}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              Làm 5 câu tiếp theo
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onNavigate('/practice/reading')}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Luyện thêm Part 5
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
