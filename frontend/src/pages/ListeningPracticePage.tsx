import { AuthRequiredGate } from '../components/AuthRequiredGate';
import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  BarChart3,
  ShoppingBag,
  FileText,
  Trash2
} from 'lucide-react';
import { practiceProgressStore } from '../services/practiceProgressStore';
import { VocabBasketModal } from '../components/VocabBasketModal';
import { LevelTheoryModal } from '../components/LevelTheoryModal';
import { historyStore } from '../services/historyStore';
import { api } from '../services/api';
import { Question } from '../types';
import { FocusedPracticeRoom } from '../components/FocusedPracticeRoom';
import { useAuth } from '../context/AuthContext';

interface ListeningPracticePageProps {
  onNavigate: (path: string) => void;
  onFocusModeChange?: (active: boolean) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onOpenRBAC?: () => void;
}

type TabType = 'dictation' | 'part1' | 'part2' | 'part3' | 'part4';
type YearFilter = '2026' | '2024' | '2023' | 'retry';

interface LevelCardInfo {
  levelKey: string;
  title: string;
  badge: string;
  scoreRange: string;
}

const LEVEL_CONFIGS: LevelCardInfo[] = [
  { levelKey: 'Level 1', title: 'Level 1 – Dưới 200', badge: '< 200', scoreRange: 'Dưới 200' },
  { levelKey: 'Level 2', title: 'Level 2 – 200–300', badge: '200–300', scoreRange: '200–300' },
  { levelKey: 'Level 3', title: 'Level 3 – 300–400', badge: '300–400', scoreRange: '300–400' },
  { levelKey: 'Level 4', title: 'Level 4 – 400–495', badge: '400–495', scoreRange: '400–495' },
];

const ListeningPracticePageInner: React.FC<ListeningPracticePageProps> = ({
  onNavigate,
  onFocusModeChange,
  onOpenAuth,
  onOpenRBAC: _onOpenRBAC,
}) => {
  const { user } = useAuth();


  const [activeTab, setActiveTab] = useState<TabType>('part1');
  const [viewMode, setViewMode] = useState<'catalog' | 'runner'>('catalog');

  useEffect(() => {
    onFocusModeChange?.(viewMode === "runner");
    return () => {
      onFocusModeChange?.(false);
    };
  }, [viewMode, onFocusModeChange]);
  const [activeFilterName, setActiveFilterName] = useState<string>('');

  const [, setStoreVersion] = useState(0);
  const [isVocabBasketOpen, setIsVocabBasketOpen] = useState(false);
  const [theoryModalData, setTheoryModalData] = useState<{ isOpen: boolean; title: string; levelKey: string } | null>(null);
  const [resetConfirmModal, setResetConfirmModal] = useState<{ isOpen: boolean; levelKey: string; title: string } | null>(null);
  const [_activeLevelKey, setActiveLevelKey] = useState<string>('part1_Level 1');

  useEffect(() => {
    const unsub = practiceProgressStore.subscribe(() => {
      setStoreVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  const [dictationYear, setDictationYear] = useState<YearFilter>('2026');

  const [partMeta, setPartMeta] = useState<{
    by_level: Record<string, number>;
    by_photo_type: Record<string, number>;
    by_question_type: Record<string, number>;
    by_special_type: Record<string, number>;
  }>({
    by_level: {},
    by_photo_type: {},
    by_question_type: {},
    by_special_type: {},
  });

  const [runnerQuestions, setRunnerQuestions] = useState<Question[]>([]);
  const [runnerPassages, setRunnerPassages] = useState<any[]>([]);
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [_passageAnswers, setPassageAnswers] = useState<Record<string, string>>({});
  const [_submittedPassages, setSubmittedPassages] = useState<Record<number, boolean>>({});
  const [_showPassageTranscript, setShowPassageTranscript] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<number, boolean>>({});
  const [_flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [_showTranscript, setShowTranscript] = useState(false);
  const [_hideChoicesWhileListening, _setHideChoicesWhileListening] = useState(false);
  const [_savedVocabs, setSavedVocabs] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRunnerLoading, setIsRunnerLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [_audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [_audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [_listenCount, setListenCount] = useState<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const getPartNumber = (tab: TabType): number => {
    switch (tab) {
      case 'part1': return 1;
      case 'part2': return 2;
      case 'part3': return 3;
      case 'part4': return 4;
      default: return 1;
    }
  };

  const loadCatalogMeta = async (tab: TabType) => {
    if (tab === 'dictation') return;
    const partNum = getPartNumber(tab);
    try {
      const res = await api.getPracticeByPart(partNum, { limit: 1 });
      setPartMeta({
        by_level: res.by_level || {},
        by_photo_type: res.by_photo_type || {},
        by_question_type: res.by_question_type || {},
        by_special_type: res.by_special_type || {},
      });
    } catch (err) {
      console.error('Failed to load part metadata', err);
    }
  };

  useEffect(() => {
    if (viewMode === 'catalog') {
      loadCatalogMeta(activeTab);
    }
  }, [activeTab, viewMode]);

  const handleStartPractice = async (filterType: 'level' | 'category', filterValue: string, titleLabel: string) => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }
    const partNum = getPartNumber(activeTab);
    const fullKey = filterType === 'level' ? `${activeTab}_${filterValue}` : `${activeTab}_${filterValue}`;
    setActiveLevelKey(fullKey);
    setIsRunnerLoading(true);
    setViewMode('runner');
    setActiveFilterName(titleLabel);
    setCurrentIndex(0);
    setUserAnswers({});
    setSubmittedQuestions({});
    setFlaggedQuestions({});
    setShowTranscript(false);
    setListenCount(0);
    setIsPlaying(false);

    try {
      const params: any = { limit: 50 };
      if (filterType === 'level') {
        params.level = filterValue;
      } else {
        params.category = filterValue;
      }
      const res = await api.getPracticeByPart(partNum, params);
      const allQs: Question[] = res.questions || [];
      practiceProgressStore.updateTotalQuestions(fullKey, allQs.length);
      const stats = practiceProgressStore.getLevelStats(fullKey, allQs.length);

      // Filter out questions already answered correctly
      const uncompleted = allQs.filter((q) => !stats.correctIds.includes(String(q.id)));

      if (uncompleted.length > 0) {
        let finalQs = uncompleted;
        if (filterType === 'level' && (filterValue === 'Level 3' || filterValue === 'Level 4') && user?.role !== 'vip' && user?.role !== 'admin') {
          finalQs = uncompleted.slice(0, 5);
          showToast('👑 Gói Thường: Giới hạn 5 câu luyện tập ở Level nâng cao. Nâng cấp VIP để mở toàn bộ câu hỏi!');
        }
        setRunnerQuestions(finalQs);
        if (allQs.length - uncompleted.length > 0) {
          showToast(`Đã bỏ qua ${allQs.length - uncompleted.length} câu đã làm đúng. Đang làm ${uncompleted.length} câu chưa xong!`);
        }
      } else {
        setRunnerQuestions(allQs);
        if (allQs.length > 0) {
          showToast('Bạn đã làm đúng tất cả các câu trong phần này! Đang mở ôn tập lại toàn bộ.');
        }
      }

      setRunnerPassages(res.passages || []);
      setCurrentPassageIndex(0);
      setPassageAnswers({});
      setSubmittedPassages({});
      setShowPassageTranscript(false);
    } catch (err) {
      console.error('Failed to load runner questions', err);
      showToast('Không thể tải danh sách câu hỏi. Vui lòng thử lại!');
    } finally {
      setIsRunnerLoading(false);
    }
  };

  // Retry ONLY wrong questions in a level
  const handleRetryWrong = async (levelKey: string, titleLabel: string) => {
    const fullKey = `${activeTab}_${levelKey}`;
    const stats = practiceProgressStore.getLevelStats(fullKey);

    if (stats.wrong === 0) {
      showToast('Chưa có câu sai nào trong cấp độ này! Bạn đang làm rất tốt.');
      return;
    }

    setIsRunnerLoading(true);
    setViewMode('runner');
    setActiveLevelKey(fullKey);
    setActiveFilterName(`Làm lại câu sai · ${titleLabel}`);
    setCurrentIndex(0);
    setUserAnswers({});
    setSubmittedQuestions({});
    setFlaggedQuestions({});
    setShowTranscript(false);
    setListenCount(0);
    setIsPlaying(false);

    try {
      const partNum = getPartNumber(activeTab);
      const res = await api.getPracticeByPart(partNum, { level: levelKey, limit: 60 });
      const allQs: Question[] = res.questions || [];

      let wrongQs = allQs.filter((q) => stats.wrongIds.includes(String(q.id)));
      if (wrongQs.length === 0) {
        const fromHistory = allQs.filter((q) => historyStore.isQuestionMarkedIncorrect(String(q.id)));
        wrongQs = fromHistory.length > 0 ? fromHistory : allQs.slice(0, Math.min(stats.wrong, allQs.length));
      }

      if (wrongQs.length === 0 && allQs.length > 0) {
        wrongQs = allQs.slice(0, Math.min(5, allQs.length));
      }

      setRunnerQuestions(wrongQs);
      setRunnerPassages(res.passages || []);
      setCurrentPassageIndex(0);
      setPassageAnswers({});
      setSubmittedPassages({});
      setShowPassageTranscript(false);
      showToast(`Bắt đầu làm lại ${wrongQs.length} câu sai! Cố lên nhé!`);
    } catch (err) {
      console.error('Failed to load wrong questions', err);
      showToast('Không thể tải câu hỏi làm lại. Vui lòng thử lại!');
    } finally {
      setIsRunnerLoading(false);
    }
  };

  const currentQ = runnerQuestions[currentIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    setIsPlaying(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setShowTranscript(false);
  }, [currentIndex]);

  useEffect(() => {
    setIsPlaying(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setShowPassageTranscript(false);
  }, [currentPassageIndex]);

  const handleToggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setListenCount((prev) => prev + 1);
      }).catch((e) => console.log('Audio play error:', e));
    }
  };

  const _handleReplay5s = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
    if (!isPlaying) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const _handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleCheckAnswer = async () => {
    if (!userAnswers[currentIndex] || !currentQ) return;
    setSubmittedQuestions((prev) => ({ ...prev, [currentIndex]: true }));
    try {
      await api.submitPracticeAnswer({
        question_id: currentQ.id,
        selected_option: userAnswers[currentIndex],
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < runnerQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowTranscript(false);
    }
  };

  const toggleFlagCurrent = () => {
    setFlaggedQuestions((prev) => {
      const next = !prev[currentIndex];
      showToast(next ? `Đã đánh dấu câu ${currentIndex + 1}` : `Bỏ đánh dấu câu ${currentIndex + 1}`);
      return { ...prev, [currentIndex]: next };
    });
  };

  useEffect(() => {
    if (viewMode !== 'runner' || !currentQ) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleAudio();
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
        return;
      }

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        if (!submittedQuestions[currentIndex]) {
          setUserAnswers((prev) => ({ ...prev, [currentIndex]: key }));
        }
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const mapNumToOpt: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
        if (!submittedQuestions[currentIndex]) {
          setUserAnswers((prev) => ({ ...prev, [currentIndex]: mapNumToOpt[e.key] }));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!submittedQuestions[currentIndex] && userAnswers[currentIndex]) {
          handleCheckAnswer();
        } else if (submittedQuestions[currentIndex] && currentIndex < runnerQuestions.length - 1) {
          handleNextQuestion();
        }
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < runnerQuestions.length - 1) {
          handleNextQuestion();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFlagCurrent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentIndex, userAnswers, submittedQuestions, runnerQuestions.length]);



  const _handleSaveVocab = async (word: string, meaning: string) => {
    try {
      await api.addToFlashcards({ word, meaning });
      setSavedVocabs((prev) => ({ ...prev, [word]: true }));
      showToast(`Đã lưu "${word}" vào sổ từ vựng!`);
    } catch (err) {
      console.error(err);
    }
  };

  const _handleCopyLink = (label: string) => {
    const url = window.location.origin + `/practice/listening?tab=${activeTab}`;
    navigator.clipboard?.writeText(url);
    showToast(`Đã sao chép liên kết ${label}!`);
  };

  const DICTATION_TESTS = Array.from({ length: 10 }, (_, i) => ({
    testNum: i + 1,
    name: `Test ${i + 1}`,
    parts: [
      { part: 1, name: 'Part 1', questions: 24, status: 'Chưa bắt đầu' },
      { part: 2, name: 'Part 2', questions: 100, status: 'Chưa bắt đầu' },
      { part: 3, name: 'Part 3', questions: 120, status: 'Chưa bắt đầu' },
      { part: 4, name: 'Part 4', questions: 75, status: 'Chưa bắt đầu' },
    ],
  }));

    

if (viewMode === 'runner') {
    if (isRunnerLoading) {
      return (
        <div className="fixed inset-0 z-50 bg-[#F4F6F8] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#1E4E9E] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-700">Đang chuẩn bị phòng luyện tập...</p>
        </div>
      );
    }
    return (
      <FocusedPracticeRoom
        title={activeFilterName || `Luyện nghe TOEIC Part ${getPartNumber(activeTab)}`}
        levelBadge={activeFilterName?.includes('Level') ? activeFilterName.split('–')[0].trim() : `Part ${getPartNumber(activeTab)}`}
        partNumber={getPartNumber(activeTab)}
        questions={runnerQuestions}
        passages={runnerPassages}
        initialIndex={currentIndex}
        onExit={() => setViewMode('catalog')}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 px-4 sm:px-6 lg:px-8">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/90 text-white px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-xs text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <button
          type="button"
          onClick={() => onNavigate('/practice')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Practice Hub
        </button>

        {/* TOP MODE TABS (Nghe chép, Part 1, Part 2, Part 3, Part 4) */}
        {viewMode === 'catalog' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 p-1.5 bg-slate-200/60 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar flex-1">
              {[
                { id: 'dictation', label: 'Nghe chép' },
                { id: 'part1', label: 'Part 1' },
                { id: 'part2', label: 'Part 2' },
                { id: 'part3', label: 'Part 3' },
                { id: 'part4', label: 'Part 4' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as TabType);
                      setCurrentIndex(0);
                    }}
                    className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}



        {viewMode === 'catalog' && activeTab === 'dictation' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: '2026', label: '2026' },
                { id: '2024', label: '2024' },
                { id: '2023', label: '2023' },
                { id: 'retry', label: '🔖 Câu cần luyện lại' },
              ].map((pill) => {
                const isActive = dictationYear === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setDictationYear(pill.id as YearFilter)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-8">
              {DICTATION_TESTS.map((test) => (
                <div key={test.testNum} className="space-y-3">
                  <div className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                    <span className="text-blue-600 font-black text-lg">|</span>
                    <span>{test.name}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {test.parts.map((p) => (
                      <div
                        key={p.part}
                        className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group hover:shadow-sm"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-extrabold text-slate-900">{p.name}</h3>
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {p.questions} câu
                            </span>
                          </div>
                          <span className="inline-block text-[11px] font-medium text-slate-400">
                            {p.status}
                          </span>
                        </div>

                        <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => onNavigate(`/practice/dictation?part=${p.part}&collection=${dictationYear}&chapter=Test%20${test.testNum}`)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer group-hover:bg-blue-600 group-hover:text-white"
                          >
                            <span>Luyện tập</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'catalog' && activeTab !== 'dictation' && (
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  Luyện theo 4 cấp độ
                </h2>
                <span className="text-xs text-slate-400">Chọn cấp độ phù hợp mục tiêu</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {LEVEL_CONFIGS.map((lvl) => {
                  const levelCount = partMeta.by_level?.[lvl.levelKey] ?? partMeta.by_level?.[lvl.levelKey.toLowerCase()];
                  const defaultTotal = (typeof levelCount === 'number' && levelCount > 0)
                    ? levelCount
                    : (activeTab === 'part1' ? 22 : activeTab === 'part2' ? 75 : activeTab === 'part3' ? 130 : 100);
                  const fullKey = `${activeTab}_${lvl.levelKey}`;
                  const stats = practiceProgressStore.getLevelStats(fullKey, defaultTotal);
                  const savedVocabsCount = practiceProgressStore.getSavedVocabs().length;
                  const progressPct = Math.min(100, Math.round((stats.answered / (stats.total || 1)) * 100));

                  return (
                    <div
                      key={lvl.levelKey}
                      className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-3xl p-5 shadow-xs transition-all flex flex-col justify-between group hover:shadow-sm"
                    >
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {lvl.title}
                            </h3>
                            <p className="text-[11px] font-semibold text-blue-600 mt-0.5">
                              Mục tiêu {lvl.badge}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 rounded-full shrink-0">
                            {lvl.badge}
                          </span>
                        </div>

                        {/* Stats line matching Screenshot 2: 171/272   ? 164   ? 7 */}
                        <div className="flex items-center justify-between text-xs font-bold pt-0.5">
                          <span className="text-slate-700 font-extrabold">
                            {stats.answered}/{stats.total}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {stats.correct}
                            </span>
                            <span className="text-rose-500 font-bold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              {stats.wrong}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>

                        {/* Control Pill with 4 action buttons (Screenshot 2 design) */}
                        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-600 shadow-2xs">
                          {/* 1. Giỏ từ vựng */}
                          <button
                            type="button"
                            title="Giỏ từ vựng đã lưu"
                            aria-label="Giỏ từ vựng đã lưu"
                            onClick={() => setIsVocabBasketOpen(true)}
                            className="min-h-[40px] flex items-center justify-center gap-1 p-1.5 rounded-xl hover:bg-white hover:text-amber-600 hover:shadow-2xs transition-all cursor-pointer relative"
                          >
                            <ShoppingBag className="w-4 h-4 text-amber-500" />
                            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center shadow-2xs">
                              {savedVocabsCount}
                            </span>
                          </button>

                          {/* 2. Tóm tắt lý thuyết & Mẹo */}
                          <button
                            type="button"
                            title="Tóm tắt lý thuyết & Mẹo thi"
                            aria-label="Tóm tắt lý thuyết & Mẹo thi"
                            onClick={() =>
                              setTheoryModalData({
                                isOpen: true,
                                title: `${activeTab.toUpperCase()} · ${lvl.title}`,
                                levelKey: lvl.levelKey
                              })
                            }
                            className="min-h-[40px] flex items-center justify-center p-1.5 rounded-xl hover:bg-white hover:text-blue-600 hover:shadow-2xs transition-all cursor-pointer"
                          >
                            <FileText className="w-4 h-4 text-blue-500" />
                          </button>

                          {/* 3. Làm lại các câu sai */}
                          <button
                            type="button"
                            title="Làm lại các câu sai"
                            aria-label="Làm lại các câu sai"
                            onClick={() => handleRetryWrong(lvl.levelKey, lvl.title)}
                            className="min-h-[40px] flex items-center justify-center gap-1 p-1.5 rounded-xl hover:bg-white hover:text-rose-600 hover:shadow-2xs transition-all cursor-pointer relative"
                          >
                            <RotateCcw className="w-4 h-4 text-rose-500" />
                            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-2xs">
                              {stats.wrong}
                            </span>
                          </button>

                          {/* 4. Xóa dữ liệu tiến độ (Làm lại từ đầu) */}
                          <button
                            type="button"
                            title="Xóa dữ liệu tiến độ (Làm lại từ đầu)"
                            aria-label="Xóa dữ liệu tiến độ (Làm lại từ đầu)"
                            onClick={() =>
                              setResetConfirmModal({
                                isOpen: true,
                                levelKey: fullKey,
                                title: `${activeTab.toUpperCase()} · ${lvl.title}`
                              })
                            }
                            className="min-h-[40px] flex items-center justify-center p-1.5 rounded-xl hover:bg-white hover:text-rose-600 hover:shadow-2xs transition-all cursor-pointer text-slate-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Action Button: Học ngay */}
                      <div className="pt-4 border-t border-slate-100 mt-4">
                        <button
                          type="button"
                          onClick={() => handleStartPractice('level', lvl.levelKey, `${activeTab.toUpperCase()} · ${lvl.title}`)}
                          className="w-full py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                        >
                          <span>Học ngay</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {activeTab === 'part1' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                  <span className="text-blue-600 font-black text-lg">|</span>
                  <span>Theo dạng tranh</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { key: 'Tranh một người', label: 'Tranh một người', defaultCount: 26 },
                    { key: 'Tranh nhiều người', label: 'Tranh nhiều người', defaultCount: 17 },
                    { key: 'Tranh tả cảnh', label: 'Tranh tả cảnh', defaultCount: 2 },
                    { key: 'Tranh tả vật', label: 'Tranh tả vật', defaultCount: 21 },
                  ].map((cat) => {
                    const count = partMeta.by_photo_type[cat.key] || cat.defaultCount;
                    return (
                      <div
                        key={cat.key}
                        className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group hover:shadow-sm"
                      >
                        <div className="space-y-2">
                          <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {cat.label}
                          </h3>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {count} câu hỏi
                          </div>
                          <span className="inline-block text-[11px] font-medium text-slate-400">
                            Chưa luyện tập
                          </span>
                        </div>

                        <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleStartPractice('category', cat.key, `Part 1 · ${cat.label}`)}
                            className="px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Học ngay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'part2' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                  <span className="text-blue-600 font-black text-lg">|</span>
                  <span>Theo dạng câu hỏi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[
                    { key: 'Câu hỏi Who', label: 'Who', defaultCount: 19 },
                    { key: 'Câu hỏi When', label: 'When', defaultCount: 30 },
                    { key: 'Câu hỏi Where', label: 'Where', defaultCount: 20 },
                    { key: 'Câu hỏi Why', label: 'Why', defaultCount: 19 },
                    { key: 'Câu hỏi What / Which', label: 'What / Which', defaultCount: 15 },
                    { key: 'Câu hỏi How', label: 'How', defaultCount: 32 },
                    { key: 'Câu hỏi Be/Do/Have', label: 'Be/Do/Have', defaultCount: 31 },
                    { key: 'Câu hỏi Modal verb', label: 'Modal verb', defaultCount: 24 },
                    { key: 'Câu hỏi lựa chọn', label: 'Câu hỏi lựa chọn', defaultCount: 19 },
                    { key: 'Câu hỏi đuôi', label: 'Câu hỏi đuôi', defaultCount: 10 },
                    { key: 'Câu hỏi phủ định', label: 'Câu hỏi phủ định', defaultCount: 26 },
                    { key: 'Câu khẳng định', label: 'Câu khẳng định', defaultCount: 30 },
                  ].map((item) => {
                    const count = partMeta.by_question_type[item.key] || item.defaultCount;
                    return (
                      <div
                        key={item.key}
                        className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-4 shadow-xs transition-all flex flex-col justify-between group hover:shadow-sm"
                      >
                        <div className="space-y-1.5">
                          <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {item.label}
                          </h3>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {count} câu hỏi
                          </div>
                          <span className="inline-block text-[10px] font-medium text-slate-400">
                            Chưa luyện tập
                          </span>
                        </div>

                        <div className="pt-3 border-t border-slate-100 mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleStartPractice('category', item.key, `Part 2 · ${item.label}`)}
                            className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Học ngay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'part3' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                  <span className="text-blue-600 font-black text-lg">|</span>
                  <span>Dạng đặc biệt</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { key: 'Có hình / bảng biểu', label: 'Có hình / bảng biểu', defaultCount: 33 },
                    { key: 'Hội thoại 3 người nói', label: 'Hội thoại 3 người nói', defaultCount: 41 },
                    { key: 'Câu hỏi hàm ý người nói', label: 'Câu hỏi hàm ý người nói', defaultCount: 80 },
                  ].map((item) => {
                    const count = partMeta.by_special_type[item.key] || item.defaultCount;
                    return (
                      <div
                        key={item.key}
                        className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group hover:shadow-sm"
                      >
                        <div className="space-y-2">
                          <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {item.label}
                          </h3>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {count} câu hỏi
                          </div>
                          <span className="inline-block text-[11px] font-medium text-slate-400">
                            Chưa luyện tập
                          </span>
                        </div>

                        <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleStartPractice('category', item.key, `Part 3 · ${item.label}`)}
                            className="px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Học ngay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'part4' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                  <span className="text-blue-600 font-black text-lg">|</span>
                  <span>Dạng đặc biệt</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'Có hình / bảng biểu', label: 'Có hình / bảng biểu', defaultCount: 21 },
                    { key: 'Câu hỏi hàm ý người nói', label: 'Câu hỏi hàm ý người nói', defaultCount: 50 },
                  ].map((item) => {
                    const count = partMeta.by_special_type[item.key] || item.defaultCount;
                    return (
                      <div
                        key={item.key}
                        className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group hover:shadow-sm"
                      >
                        <div className="space-y-2">
                          <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {item.label}
                          </h3>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {count} câu hỏi
                          </div>
                          <span className="inline-block text-[11px] font-medium text-slate-400">
                            Chưa luyện tập
                          </span>
                        </div>

                        <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleStartPractice('category', item.key, `Part 4 · ${item.label}`)}
                            className="px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Học ngay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vocab Basket Modal */}
      <VocabBasketModal
        isOpen={isVocabBasketOpen}
        onClose={() => setIsVocabBasketOpen(false)}
        onNavigate={onNavigate}
      />

      {/* Level Theory & Tips Modal */}
      <LevelTheoryModal
        isOpen={Boolean(theoryModalData?.isOpen)}
        title={theoryModalData?.title || ''}
        onClose={() => setTheoryModalData(null)}
        onStartPractice={() => {
          if (theoryModalData?.levelKey) {
            handleStartPractice('level', theoryModalData.levelKey, theoryModalData.title);
          }
        }}
      />

      {/* Reset Level Progress Confirmation Modal */}
      {resetConfirmModal && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Xóa dữ liệu tiến độ?
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Bạn có chắc muốn đặt lại toàn bộ tiến độ cho <strong>{resetConfirmModal.title}</strong>? Lịch sử câu làm đúng và câu sai của cấp độ này sẽ được xóa để bạn có thể học lại từ đầu.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setResetConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  practiceProgressStore.resetLevel(resetConfirmModal.levelKey);
                  showToast(`Đã xóa dữ liệu tiến độ cho ${resetConfirmModal.title}. Bạn có thể bắt đầu lại từ đầu!`);
                  setResetConfirmModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ListeningPracticePage: React.FC<ListeningPracticePageProps> = (props) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Luyện nghe (Listening Parts 1-4)"
        featureDesc="Luyện nghe 4 Parts chuẩn ETS với audio phòng thi, transcript song ngữ và chấm điểm AI."
        onNavigate={props.onNavigate}
        onOpenAuth={props.onOpenAuth}
        onOpenRBAC={props.onOpenRBAC}
      />
    );
  }

  return <ListeningPracticePageInner {...props} />;
};
