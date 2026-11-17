import { useSettings } from '../../context/SettingsContext';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Heart,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  AlertTriangle,
  Volume2,
  Bot,
  Lightbulb,
  ChevronRight,
  Flame,
  ShieldCheck,
  Zap,
  TrendingUp,
  Bookmark,
  Save,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GrammarTopic } from '../../types';
import {
  GrammarLessonNode,
  GrammarUserProgress,
  grammarProgressService
} from '../../services/grammarProgressService';
import { srsService } from '../../services/srsService';
import { NOUN_LESSONS_DATA } from '../../data/nounLessonsData';
import { TheoryCardSwiper } from './TheoryCardSwiper';
import { DuolingoInteractiveExercise } from './DuolingoInteractiveExercise';
import { InteractiveDuoQuestion, TheoryCard } from '../../types/grammarDuo';

export interface DuolingoPracticeModalProps {
  node: GrammarLessonNode;
  topic: GrammarTopic;
  allTopicNodes: GrammarLessonNode[];
  progress: GrammarUserProgress;
  isVip: boolean;
  userId?: string | number;
  onClose: () => void;
  onComplete: (earnedXp: number, stars: number) => void;
  onAskAI?: (promptText: string) => void;
}

export const DuolingoPracticeModal: React.FC<DuolingoPracticeModalProps> = ({
  node,
  topic,
  progress,
  isVip,
  userId,
  onClose,
  onComplete,
  onAskAI
}) => {
  const { settings } = useSettings();
  // Check if topic is Nouns (Unit 1 Vertical Slice)
  const isNounTopic = topic.id === 'd62945da-345b-4dad-bc21-bc9f1f07cd74' || topic.title_vi.toLowerCase().includes('danh từ');

  // Match the node with corresponding lesson in NOUN_LESSONS_DATA if available
  const currentLessonDef = useMemo(() => {
    if (isNounTopic) {
      const idx = Math.min(node.nodeIndex, NOUN_LESSONS_DATA.length - 1);
      return NOUN_LESSONS_DATA[idx];
    }
    return null;
  }, [isNounTopic, node.nodeIndex]);

  // Mode: Theory swiper vs Exercise
  const hasTheoryCards = Boolean(currentLessonDef?.theoryCards && currentLessonDef.theoryCards.length > 0);
  const existingCheckpoint = progress.nodes[node.id]?.checkpoint;

  const [inTheoryMode, setInTheoryMode] = useState<boolean>(() => {
    if (existingCheckpoint) {
      return existingCheckpoint.mode === 'theory';
    }
    return hasTheoryCards;
  });

  const [theoryCardIdx, setTheoryCardIdx] = useState<number>(() => {
    if (existingCheckpoint?.mode === 'theory' && typeof existingCheckpoint.theoryCardIdx === 'number') {
      return existingCheckpoint.theoryCardIdx;
    }
    return 0;
  });

  // Questions queue
  const questionsList: InteractiveDuoQuestion[] = useMemo(() => {
    if (currentLessonDef && currentLessonDef.questions.length > 0) {
      return currentLessonDef.questions;
    }

    // Fallback: Generate from topic practice questions
    const rawList = topic.practice_questions || [];
    return rawList.map((q, idx) => ({
      id: q.id || `${topic.id}-${idx}`,
      type: 'multiple_choice' as const,
      difficulty: 1 as const,
      conceptTags: [topic.category || 'grammar'],
      question: q.question_text || q.question || '',
      options: q.options && q.options.length === 4 ? q.options : [
        `A. ${q.option_a || ''}`,
        `B. ${q.option_b || ''}`,
        `C. ${q.option_c || ''}`,
        `D. ${q.option_d || ''}`
      ],
      correct: (q.correct_answer || q.correct || 'A').trim().toUpperCase().charAt(0),
      explanation: q.explanation_vi || q.explanation || 'Xem lại quy tắc và vị trí từ trong câu.',
      translation: q.translation_vi || q.translation || ''
    }));
  }, [currentLessonDef, topic]);

  // Practice state
  const [qQueue, setQQueue] = useState<InteractiveDuoQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [hearts, setHearts] = useState(isVip ? 999 : progress.hearts ?? 5);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [wrongQueue, setWrongQueue] = useState<InteractiveDuoQuestion[]>([]);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [earnedStars, setEarnedStars] = useState(3);
  const [usedHint, setUsedHint] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize questions and restore checkpoint if present
  useEffect(() => {
    setQQueue(questionsList);
    const cp = progress.nodes[node.id]?.checkpoint;
    if (cp) {
      if (cp.mode === 'theory') {
        setInTheoryMode(true);
        setTheoryCardIdx(cp.theoryCardIdx ?? 0);
        setCurrentIndex(0);
        setCorrectCount(0);
        setTotalAttempts(0);
      } else {
        setInTheoryMode(false);
        const restoredIdx = Math.min(cp.questionIndex ?? 0, Math.max(0, questionsList.length - 1));
        setCurrentIndex(restoredIdx);
        setCorrectCount(cp.correctCount ?? 0);
        setTotalAttempts(cp.totalAttempts ?? 0);
      }
    } else {
      setCurrentIndex(0);
      setCorrectCount(0);
      setTotalAttempts(0);
      setInTheoryMode(hasTheoryCards);
      setTheoryCardIdx(0);
    }
    setSelectedOption(null);
    setStatus('idle');
    setWrongQueue([]);
    setConsecutiveCorrect(0);
    setIsCompleted(false);
  }, [questionsList, hasTheoryCards, node.id]);

  // Sound effects
  const playSound = (isWin: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isWin) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.setValueAtTime(190, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {}
  };

  const currentQ = qQueue[currentIndex];

  const handleCheckAnswer = () => {
    if (!currentQ || !selectedOption || status !== 'idle') return;
    const chosenLetter = selectedOption.trim().toUpperCase().charAt(0);
    const isRight = chosenLetter === currentQ.correct;

    setTotalAttempts((prev) => prev + 1);

    // Ghi nhận vào thuật toán Spaced Repetition (SRS)
    srsService.processItemReview(userId, currentQ.id, topic.id, currentQ.conceptTags || [], {
      isCorrect: isRight,
      usedHint
    });

    if (isRight) {
      setStatus('correct');
      setCorrectCount((prev) => prev + 1);
      setConsecutiveCorrect((prev) => prev + 1);
      playSound(true);
    } else {
      setStatus('wrong');
      setConsecutiveCorrect(0);
      playSound(false);

      if (!isVip) {
        const nextHearts = grammarProgressService.consumeHeart(userId, isVip);
        setHearts(nextHearts);
      }

      // Đưa vào hàng đợi câu sai để lặp lại
      setWrongQueue((prev) => [...prev, currentQ]);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setStatus('idle');
    setUsedHint(false);

    if (currentIndex + 1 < qQueue.length) {
      setCurrentIndex((prev) => prev + 1);
    } else if (wrongQueue.length > 0) {
      // Làm lại các câu sai
      setQQueue(wrongQueue);
      setWrongQueue([]);
      setCurrentIndex(0);
    } else {
      finishLesson();
    }
  };

  const finishLesson = () => {
    setIsCompleted(true);
    const pct = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 100;
    const { stars, earnedXp } = grammarProgressService.completeNode(
      userId,
      node,
      pct,
      wrongQueue.map((q) => q.id),
      isVip
    );
    setEarnedStars(stars);

    try {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    } catch {}

    onComplete(earnedXp, stars);
  };

  const handleAskAITutor = (q: InteractiveDuoQuestion) => {
    if (!onAskAI) return;
    const prompt = `Em đang học ngữ pháp TOEIC chuyên đề "${topic.title_vi}" (${topic.title_en}):\n` +
      `Câu hỏi: "${q.question}"\n` +
      `Các đáp án: ${(q.options || []).join(' | ')}\n` +
      `Đáp án đúng là ${q.correct}. Em đã chọn "${selectedOption}".\n` +
      `Thầy/cô phân tích chi tiết vì sao đáp án này đúng và chỉ ra dấu hiệu bẫy giúp em!`;
    onAskAI(prompt);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 select-none overflow-hidden">
      <div className="w-full max-w-4xl mx-auto h-full flex flex-col bg-white sm:border-x sm:border-slate-200/80 shadow-2xl">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-4 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress Bar */}
          <div className="flex-1 max-w-md">
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300 shadow-xs"
                style={{
                  width: `${inTheoryMode ? 100 : Math.max(8, Math.min(100, ((currentIndex + 1) / Math.max(1, qQueue.length)) * 100))}%`
                }}
              />
            </div>
          </div>

          {/* Combo Flame Indicator */}
          {consecutiveCorrect >= 3 && !inTheoryMode && !isCompleted && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black animate-pulse">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>x{consecutiveCorrect}</span>
            </div>
          )}

          {/* Hearts counter */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
            <span className="text-xs font-black text-rose-600">
              {isVip ? '∞' : hearts}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {/* Out of Hearts */}
          {!isVip && hearts <= 0 && !isCompleted && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2 text-center animate-in fade-in">
              <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto" />
              <h4 className="font-bold text-sm">Bạn đã hết tim rồi!</h4>
              <p className="text-xs text-rose-700">
                Hãy hồi phục tim miễn phí để tiếp tục học.
              </p>
              <button
                type="button"
                onClick={() => {
                  const refilled = grammarProgressService.refillHearts(userId);
                  setHearts(refilled);
                }}
                className="mt-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Hồi phục 5 tim ngay
              </button>
            </div>
          )}

          {/* Completion Screen */}
          {isCompleted ? (
            <div className="py-8 text-center space-y-6 animate-in zoom-in-95">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-300/40 mx-auto">
                  <Award className="w-12 h-12 text-white stroke-[2.2]" />
                </div>
                <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs">
                  +{node.xpReward} XP
                </div>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Hoàn thành xuất sắc bài học!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
                  Bạn đã ghi nhớ thêm các kiến thức trọng điểm cho chuyên đề <strong>{topic.title_vi}</strong>.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3].map((starIdx) => (
                  <div
                    key={starIdx}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg ${
                      starIdx <= earnedStars
                        ? 'bg-amber-400 text-white shadow-md shadow-amber-300/40'
                        : 'bg-slate-100 text-slate-300'
                    }`}
                  >
                    ★
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Độ chính xác</span>
                  <span className="font-black text-slate-800 text-sm">
                    {totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 100}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Thưởng XP</span>
                  <span className="font-black text-amber-600 text-sm flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> +{node.xpReward} XP
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full max-w-sm py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-500/25 active:translate-y-0.5 cursor-pointer"
              >
                Tiếp tục lộ trình
              </button>
            </div>
          ) : inTheoryMode && currentLessonDef?.theoryCards ? (
            /* 1. Theory Card Swiper Mode (5 Micro Cards) */
            <TheoryCardSwiper
              cards={currentLessonDef.theoryCards}
              initialCardIdx={theoryCardIdx}
              onCardChange={(idx) => setTheoryCardIdx(idx)}
              onFinish={() => {
                setInTheoryMode(false);
                setTheoryCardIdx(0);
              }}
            />
          ) : currentQ ? (
            /* 2. Interactive Exercise Mode */
            <div className="space-y-5">
              <DuolingoInteractiveExercise
                question={currentQ}
                selectedAnswer={selectedOption}
                onSelectAnswer={(ans) => setSelectedOption(ans)}
                status={status}
                onUseHint={() => setUsedHint(true)}
              />

              {/* Feedback Alert Sheet */}
              {status !== 'idle' && (
                <div
                  className={`p-4 sm:p-5 rounded-2xl border space-y-3 animate-in slide-in-from-bottom duration-150 ${
                    status === 'correct'
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/90 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {status === 'correct' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600" />
                      )}
                      <span className="font-black text-sm sm:text-base">
                        {status === 'correct' ? 'Chính xác! Làm tốt lắm!' : 'Chưa chính xác!'}
                      </span>
                    </div>

                    {onAskAI && (
                      <button
                        type="button"
                        onClick={() => handleAskAITutor(currentQ)}
                        className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <Bot className="w-3.5 h-3.5 text-blue-600" />
                        Hỏi AI Tutor
                      </button>
                    )}
                  </div>

                  {settings.showTranslation && currentQ.translation && (
                    <div className="text-xs space-y-0.5 pt-1">
                      <span className="font-bold text-slate-700 block">Dịch nghĩa câu:</span>
                      <p className="text-slate-600 italic">{currentQ.translation}</p>
                    </div>
                  )}

                  {settings.showExplanation && currentQ.explanation && (
                    <div className="text-xs space-y-0.5 pt-1">
                    <span className="font-bold text-slate-700 block">Giải thích chi tiết:</span>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">{currentQ.explanation}</p>
                  </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Đang chuẩn bị câu hỏi...
            </div>
          )}
        </div>

        {/* Bottom Actions Sticky Bar */}
        {!isCompleted && !inTheoryMode && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
            {status === 'idle' ? (
              <button
                type="button"
                onClick={handleCheckAnswer}
                disabled={!selectedOption || (!isVip && hearts <= 0)}
                className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md ${
                  !selectedOption || (!isVip && hearts <= 0)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25 active:translate-y-0.5 cursor-pointer'
                }`}
              >
                Kiểm tra
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextQuestion}
                className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-md active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  status === 'correct'
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
                    : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'
                }`}
              >
                Tiếp tục
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

      </div>

      {/* Exit Confirmation with Save Progress Option */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-100">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <Bookmark className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-slate-900">Bạn có muốn lưu tiến độ không?</h4>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                {inTheoryMode ? (
                  <span>
                    Vị trí hiện tại: <strong className="text-blue-600 font-bold">Thẻ lý thuyết {theoryCardIdx + 1}/{currentLessonDef?.theoryCards?.length || 5}</strong>. Nếu lưu, lần sau mở bài học bạn sẽ tiếp tục ngay tại thẻ này.
                  </span>
                ) : (
                  <span>
                    Vị trí hiện tại: <strong className="text-blue-600 font-bold">Câu hỏi {currentIndex + 1}/{qQueue.length}</strong> (đúng {correctCount} câu). Nếu lưu, bạn sẽ tiếp tục làm từ câu này.
                  </span>
                )}
              </p>
            </div>

            {/* Quick checkpoint badge */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs flex items-center justify-between text-slate-700">
              <span className="font-semibold text-slate-500">Tiến độ đang học:</span>
              <span className="font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {inTheoryMode
                  ? `Lý thuyết (Thẻ ${theoryCardIdx + 1})`
                  : `Bài tập (Câu ${currentIndex + 1}/${qQueue.length})`}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {/* Option Có: Lưu và thoát */}
              <button
                type="button"
                onClick={() => {
                  grammarProgressService.saveNodeCheckpoint(
                    userId,
                    node.id,
                    {
                      mode: inTheoryMode ? 'theory' : 'exercise',
                      theoryCardIdx: inTheoryMode ? theoryCardIdx : undefined,
                      questionIndex: inTheoryMode ? undefined : currentIndex,
                      correctCount: inTheoryMode ? undefined : correctCount,
                      totalAttempts: inTheoryMode ? undefined : totalAttempts,
                      updatedAt: new Date().toISOString()
                    },
                    isVip
                  );
                  setShowExitConfirm(false);
                  onClose();
                }}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:translate-y-0.5 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Có, lưu tiến độ và thoát</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Option Không: Thoát không lưu */}
                <button
                  type="button"
                  onClick={() => {
                    grammarProgressService.clearNodeCheckpoint(userId, node.id, isVip);
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  Không, thoát bỏ qua
                </button>

                {/* Option Học tiếp: Đóng popup quay lại bài học */}
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Ở lại học tiếp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
