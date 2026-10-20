import { AuthRequiredGate } from '../components/AuthRequiredGate';
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  BarChart3,
  FileText,
  ShoppingBag,
  Trash2
} from 'lucide-react';
import { FocusedPracticeRoom } from '../components/FocusedPracticeRoom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Question } from '../types';
import { practiceProgressStore } from '../services/practiceProgressStore';
import { historyStore } from '../services/historyStore';
import { VocabBasketModal } from '../components/VocabBasketModal';
import { LevelTheoryModal } from '../components/LevelTheoryModal';

interface ReadingPracticePageProps {
  onNavigate: (path: string) => void;
  onFocusModeChange?: (active: boolean) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onOpenRBAC?: () => void;
}

type TabType = 'grammar' | 'part5' | 'part6' | 'part7';
type GrammarFilter = 'all' | 'word_type' | 'verbs' | 'others';

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

interface GrammarTopicDef {
  key: string;
  group: 'Từ loại' | 'Động từ' | 'Ngữ pháp khác';
  title: string;
  subtitle: string;
  lessonsCount: number;
  questionsCount: number;
}

const GRAMMAR_TOPICS: GrammarTopicDef[] = [
  // Từ loại (3 topics)
  { key: 'noun', group: 'Từ loại', title: 'Danh từ', subtitle: 'Vị trí, phân loại, đuôi danh từ đếm được/không đếm được', lessonsCount: 12, questionsCount: 145 },
  { key: 'adj', group: 'Từ loại', title: 'Tính từ', subtitle: 'Vị trí tính từ, đuôi tính từ, tính từ phân từ -ing/-ed', lessonsCount: 10, questionsCount: 120 },
  { key: 'adv', group: 'Từ loại', title: 'Trạng từ', subtitle: 'Vị trí trạng từ, cấu tạo trạng từ, các trạng từ đặc biệt', lessonsCount: 8, questionsCount: 95 },

  // Động từ (6 topics)
  { key: 'tense', group: 'Động từ', title: 'Thì', subtitle: 'Hiện tại đơn, tiếp diễn, hoàn thành, quá khứ, tương lai', lessonsCount: 14, questionsCount: 180 },
  { key: 'sv_agree', group: 'Động từ', title: 'Hòa hợp chủ ngữ – động từ', subtitle: 'Quy tắc số ít/số nhiều, chủ ngữ kép, đại từ bất định', lessonsCount: 9, questionsCount: 110 },
  { key: 'passive', group: 'Động từ', title: 'Chủ động – bị động', subtitle: 'Cấu trúc bị động, bị động đặc biệt, khiếm khuyết', lessonsCount: 11, questionsCount: 135 },
  { key: 'gerund', group: 'Động từ', title: 'Danh động từ', subtitle: 'Gerund & To-Infinitive, động từ đi kèm V-ing / To V', lessonsCount: 8, questionsCount: 95 },
  { key: 'imperative', group: 'Động từ', title: 'Câu mệnh lệnh', subtitle: 'Câu cầu khiến, mệnh lệnh thức, câu giả định subjunctive', lessonsCount: 6, questionsCount: 70 },
  { key: 'verb_form', group: 'Động từ', title: 'Dạng động từ', subtitle: 'Phân từ hiện tại, quá khứ phân từ, rút gọn mệnh đề', lessonsCount: 10, questionsCount: 125 },

  // Ngữ pháp khác (6 topics)
  { key: 'pronoun', group: 'Ngữ pháp khác', title: 'Đại từ', subtitle: 'Đại từ nhân xưng, sở hữu, phản thân, chỉ định', lessonsCount: 8, questionsCount: 90 },
  { key: 'comparison', group: 'Ngữ pháp khác', title: 'So sánh', subtitle: 'So sánh bằng, hơn, nhất, so sánh kép càng... càng...', lessonsCount: 7, questionsCount: 85 },
  { key: 'conjunction', group: 'Ngữ pháp khác', title: 'Liên từ giới từ', subtitle: 'Phân biệt liên từ & giới từ chỉ thời gian, lý do, nhượng bộ', lessonsCount: 12, questionsCount: 150 },
  { key: 'relative', group: 'Ngữ pháp khác', title: 'Mệnh đề quan hệ', subtitle: 'Who, Whom, Whose, Which, That, rút gọn MĐQH', lessonsCount: 10, questionsCount: 130 },
  { key: 'conditional', group: 'Ngữ pháp khác', title: 'Câu điều kiện', subtitle: 'Loại 1, Loại 2, Loại 3, đảo ngữ câu điều kiện', lessonsCount: 8, questionsCount: 95 },
  { key: 'adverb_clause', group: 'Ngữ pháp khác', title: 'Mệnh đề trạng ngữ', subtitle: 'MĐ chỉ thời gian, nguyên nhân, mục đích, kết quả', lessonsCount: 7, questionsCount: 85 },
];

const ReadingPracticePageInner: React.FC<ReadingPracticePageProps> = ({
  onNavigate,
  onFocusModeChange,
  onOpenAuth,
  onOpenRBAC: _onOpenRBAC,
}) => {
  const { user } = useAuth();


  const [activeTab, setActiveTab] = useState<TabType>('part5');
  const [viewMode, setViewMode] = useState<'catalog' | 'runner'>('catalog');

  useEffect(() => {
    onFocusModeChange?.(viewMode === "runner");
    return () => {
      onFocusModeChange?.(false);
    };
  }, [viewMode, onFocusModeChange]);

  const [activeFilterName, setActiveFilterName] = useState<string>('');
  const [activeLevelKey, setActiveLevelKey] = useState<string>('part5_Level 1');
  const [grammarFilter, setGrammarFilter] = useState<GrammarFilter>('all');

  const [partMeta, setPartMeta] = useState<{
    by_level: Record<string, number>;
    by_topic: Record<string, number>;
  }>({
    by_level: {},
    by_topic: {},
  });

  const [runnerQuestions, setRunnerQuestions] = useState<Question[]>([]);
  const [runnerPassages, setRunnerPassages] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRunnerLoading, setIsRunnerLoading] = useState(false);

  // Modals state
  const [isVocabBasketOpen, setIsVocabBasketOpen] = useState(false);
  const [theoryModalData, setTheoryModalData] = useState<{
    isOpen: boolean;
    title: string;
    levelKey?: string;
  } | null>(null);
  const [resetConfirmModal, setResetConfirmModal] = useState<{
    isOpen: boolean;
    levelKey: string;
    title: string;
  } | null>(null);

  // Track progress store updates
  const [, setProgressVersion] = useState(0);
  useEffect(() => {
    const unsub = practiceProgressStore.subscribe(() => {
      setProgressVersion((v) => v + 1);
    });
    return unsub;
  }, []);



  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const getPartNumber = (tab: TabType): number => {
    switch (tab) {
      case 'part5': return 5;
      case 'part6': return 6;
      case 'part7': return 7;
      default: return 5;
    }
  };

  const loadCatalogMeta = async (tab: TabType) => {
    if (tab === 'grammar') return;
    const partNum = getPartNumber(tab);
    try {
      const res = await api.getPracticeByPart(partNum, { limit: 1 });
      setPartMeta({
        by_level: res.by_level || {},
        by_topic: res.by_topic || {},
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

  // Start practicing a level or topic: skips questions already answered correctly
  const handleStartPractice = async (filterType: 'level' | 'topic', filterValue: string, titleLabel: string) => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }
    const partNum = getPartNumber(activeTab);
    const fullKey = filterType === 'level' ? `${activeTab}_${filterValue}` : `${activeTab}_topic_${filterValue}`;
    setActiveLevelKey(fullKey);
    setIsRunnerLoading(true);
    setViewMode('runner');
    setActiveFilterName(titleLabel);
    setCurrentIndex(0);

    try {
      const params: any = { limit: 500 };
      if (filterType === 'level') {
        params.level = filterValue;
      } else {
        params.category = filterValue;
      }
      const res = await api.getPracticeByPart(partNum, params);
      const allQs: Question[] = res.questions || [];
      practiceProgressStore.updateTotalQuestions(fullKey, allQs.length);
      const stats = practiceProgressStore.getLevelStats(fullKey, allQs.length);

      // Skip questions already answered correctly
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
        showToast('Bạn đã làm đúng tất cả các câu trong phần này! Đang mở ôn tập lại toàn bộ.');
      }
      setRunnerPassages(res.passages || []);
    } catch (err) {
      console.error('Failed to load reading questions', err);
      showToast('Không thể tải câu hỏi luyện đọc. Vui lòng thử lại!');
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

    try {
      const partNum = getPartNumber(activeTab);
      const res = await api.getPracticeByPart(partNum, { level: levelKey, limit: 500 });
      const allQs: Question[] = res.questions || [];

      let wrongQs = allQs.filter((q) => stats.wrongIds.includes(String(q.id)));
      if (wrongQs.length === 0) {
        const fromHistory = allQs.filter((q) => historyStore.isQuestionMarkedIncorrect(String(q.id)));
        wrongQs = fromHistory.length > 0 ? fromHistory : allQs.slice(0, Math.min(stats.wrong, allQs.length));
      }

      setRunnerQuestions(wrongQs);
      setRunnerPassages(res.passages || []);
      showToast(`Bắt đầu làm lại ${wrongQs.length} câu sai! Cố lên nhé!`);
    } catch (err) {
      console.error(err);
      showToast('Không thể tải danh sách câu sai. Vui lòng thử lại!');
    } finally {
      setIsRunnerLoading(false);
    }
  };

  const handleStartGrammarPractice = async (topic: GrammarTopicDef) => {
    setIsRunnerLoading(true);
    setViewMode('runner');
    setActiveLevelKey(`grammar_${topic.key}`);
    setActiveFilterName(`Ngữ pháp · ${topic.title}`);
    setCurrentIndex(0);

    try {
      const res = await api.getPracticeByPart(5, { category: topic.title, limit: 100 });
      let qs = res.questions || [];
      if (!qs || qs.length === 0) {
        const fallback = await api.getPracticeByPart(5, { limit: 100 });
        qs = fallback.questions || [];
      }
      setRunnerQuestions(qs);
      setRunnerPassages([]);
    } catch (err) {
      console.error('Failed to load grammar questions', err);
      showToast('Không thể tải câu hỏi ngữ pháp. Vui lòng thử lại!');
    } finally {
      setIsRunnerLoading(false);
    }
  };

  const filteredGrammarTopics = GRAMMAR_TOPICS.filter((t) => {
    if (grammarFilter === 'all') return true;
    if (grammarFilter === 'word_type') return t.group === 'Từ loại';
    if (grammarFilter === 'verbs') return t.group === 'Động từ';
    if (grammarFilter === 'others') return t.group === 'Ngữ pháp khác';
    return true;
  });

    

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
        title={activeFilterName || `Luyện đọc TOEIC Part ${getPartNumber(activeTab)}`}
        levelBadge={activeFilterName?.includes('Level') ? activeFilterName.split('–')[0].trim() : `Part ${getPartNumber(activeTab)}`}
        levelKey={activeLevelKey}
        partNumber={Number(runnerQuestions[0]?.part || runnerPassages[0]?.part || getPartNumber(activeTab) || 5)}
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

      <div className="max-w-7xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => onNavigate('/practice')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Practice Hub
        </button>



        {/* TOP MODE TABS (Ngữ pháp, Part 5, Part 6, Part 7) */}
        {viewMode === 'catalog' && (
          <div className="flex items-center gap-2 p-1.5 bg-slate-200/60 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar">
            {[
              { id: 'grammar', label: 'Ngữ pháp' },
              { id: 'part5', label: 'Part 5' },
              { id: 'part6', label: 'Part 6' },
              { id: 'part7', label: 'Part 7' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex-1 min-w-[100px] py-2.5 px-4 min-h-[44px] text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer text-center whitespace-nowrap flex items-center justify-center ${
                    isActive
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: NGỮ PHÁP                                                           */}
        {/* ========================================================================= */}
        {viewMode === 'catalog' && activeTab === 'grammar' && (
          <div className="space-y-6">
            {/* Sub-filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'word_type', label: 'Từ loại' },
                { id: 'verbs', label: 'Động từ' },
                { id: 'others', label: 'Ngữ pháp khác' },
              ].map((pill) => {
                const isActive = grammarFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setGrammarFilter(pill.id as GrammarFilter)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {/* Sections: Từ loại, Động từ, Ngữ pháp khác */}
            {['Từ loại', 'Động từ', 'Ngữ pháp khác'].map((groupName) => {
              const items = filteredGrammarTopics.filter((t) => t.group === groupName);
              if (items.length === 0) return null;

              return (
                <div key={groupName} className="space-y-4">
                  <div className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                    <span className="text-emerald-600 font-black text-lg">|</span>
                    <span>{groupName}</span>
                    <span className="text-xs font-normal text-slate-400">({items.length} chủ điểm)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((topic) => (
                      <div
                        key={topic.key}
                        className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group hover:shadow-sm"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              {topic.group}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">
                              Chưa học
                            </span>
                          </div>

                          <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {topic.title}
                          </h3>

                          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                            {topic.subtitle}
                          </p>

                          <div className="text-[11px] font-semibold text-slate-400 pt-1">
                            {topic.lessonsCount} bài học · {topic.questionsCount} câu hỏi
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleStartGrammarPractice(topic)}
                            className="px-4 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
                          >
                            Học ngay
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TABS 2-4: PART 5, 6, 7 CATALOG VIEW                                       */}
        {/* ========================================================================= */}
        {viewMode === 'catalog' && activeTab !== 'grammar' && (
          <div className="space-y-8">
            {/* Top Row: 4 Level Cards in a 4-Col Grid (Screenshot 2 Design) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Luyện theo 4 cấp độ
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsVocabBasketOpen(true)}
                    className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                    <span>Giỏ từ ({practiceProgressStore.getSavedVocabs().length})</span>
                  </button>
                  <span className="text-xs text-slate-400 hidden sm:inline">Chọn cấp độ phù hợp mục tiêu</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {LEVEL_CONFIGS.map((lvl) => {
                  const fullKey = `${activeTab}_${lvl.levelKey}`;
                  const levelCount = partMeta.by_level?.[lvl.levelKey] ?? partMeta.by_level?.[lvl.levelKey.toLowerCase()];
                  const defaultTotal = (typeof levelCount === 'number' && levelCount > 0) ? levelCount : 0;
                  const stats = practiceProgressStore.getLevelStats(fullKey, defaultTotal);
                  const savedVocabsCount = practiceProgressStore.getSavedVocabs().length;
                  const progressPct = Math.min(100, Math.round((stats.answered / (stats.total || 1)) * 100));

                  return (
                    <div
                      key={lvl.levelKey}
                      className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-3xl p-5 shadow-xs transition-all flex flex-col justify-between group hover:shadow-sm"
                    >
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {lvl.title}
                            </h3>
                            <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                              Mục tiêu {lvl.badge}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-full shrink-0">
                            {lvl.badge}
                          </span>
                        </div>

                        {/* Stats line matching Screenshot 2: 171/272   ✓ 164   ✕ 7 */}
                        <div className="flex items-center justify-between text-xs font-bold pt-0.5">
                          <span className="text-slate-700 font-extrabold">
                            {stats.answered}/{stats.total}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              ✓ {stats.correct}
                            </span>
                            <span className="text-rose-600 font-bold flex items-center gap-1">
                              ✕ {stats.wrong}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
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

                          {/* 4. Xóa dữ liệu tiến độ để làm lại từ đầu */}
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
                          className="w-full py-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
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

            {/* Part 5: Luyện theo chủ điểm */}
            {activeTab === 'part5' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                  <span className="text-emerald-600 font-black text-lg">|</span>
                  <span>Luyện theo chủ điểm</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { key: 'Từ vựng', label: 'Từ vựng', subtitle: 'Danh · động · tính · trạng · giới từ', defaultCount: 397 },
                    { key: 'Từ loại', label: 'Từ loại', subtitle: 'Cùng gốc, khác hậu tố', defaultCount: 68 },
                    { key: 'Động từ', label: 'Động từ', subtitle: 'Thì · dạng động từ · bị động', defaultCount: 319 },
                    { key: 'Ngữ pháp khác', label: 'Ngữ pháp khác', subtitle: 'Liên từ · đại từ · mệnh đề · so sánh', defaultCount: 146 },
                  ].map((topic) => {
                    const count = partMeta.by_topic[topic.key] || topic.defaultCount;
                    return (
                      <div
                        key={topic.key}
                        className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group hover:shadow-sm"
                      >
                        <div className="space-y-2">
                          <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {topic.label}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {topic.subtitle}
                          </p>
                          <div className="text-[11px] text-slate-400 font-medium pt-1">
                            {count} câu hỏi · Chưa luyện tập
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleStartPractice('topic', topic.key, `Part 5 · ${topic.label}`)}
                            className="px-4 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
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

export const ReadingPracticePage: React.FC<ReadingPracticePageProps> = (props) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Luyện đọc (Reading Parts 5-7)"
        featureDesc="Luyện đọc chia đôi màn hình chuẩn thi thật, phân tích ngữ pháp và tra từ ngữ cảnh."
        onNavigate={props.onNavigate}
        onOpenAuth={props.onOpenAuth}
        onOpenRBAC={props.onOpenRBAC}
      />
    );
  }

  return <ReadingPracticePageInner {...props} />;
};
