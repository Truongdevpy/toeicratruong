import { useAuth } from '../context/AuthContext';
import { AuthRequiredGate } from '../components/AuthRequiredGate';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  ArrowLeft,
  Volume2,
  Star,
  RotateCw,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  BookmarkCheck,
  Check,
  X,
  HelpCircle,
  Keyboard,
  ListFilter,
  Eye,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { Flashcard } from '../types';
import { practiceProgressStore } from '../services/practiceProgressStore';

interface FlashcardsPageProps {
  onNavigate: (path: string) => void;
  onFocusModeChange?: (active: boolean) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onOpenRBAC?: () => void;
}

interface TopicOption {
  id: string;
  name: string;
  icon: string;
  count?: number;
}


interface PartOption {
  id: string;
  name: string;
  shortLabel: string;
  color: string;
}

const PART_OPTIONS: PartOption[] = [
  { id: 'all', name: 'Tất cả nguồn bài', shortLabel: 'Tất cả Part', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'part1', name: 'Part 1: Hình ảnh', shortLabel: 'Part 1', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'part2', name: 'Part 2: Hỏi - Đáp', shortLabel: 'Part 2', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'part3', name: 'Part 3: Hội thoại', shortLabel: 'Part 3', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'part4', name: 'Part 4: Bài nói ngắn', shortLabel: 'Part 4', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'part5', name: 'Part 5: Hoàn thành câu', shortLabel: 'Part 5', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'part6', name: 'Part 6: Điền đoạn văn', shortLabel: 'Part 6', color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  { id: 'part7', name: 'Part 7: Đọc hiểu đoạn', shortLabel: 'Part 7', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'dictation', name: 'Dictation: Chép chính tả', shortLabel: 'Dictation', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'saved', name: 'Giỏ từ TOEIC đã lưu', shortLabel: 'Giỏ từ lưu', color: 'bg-teal-50 text-teal-700 border-teal-200' },
];

const POS_BADGES: Record<string, { label: string; badgeClass: string }> = {
  n: { label: 'Danh từ', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  noun: { label: 'Danh từ', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  v: { label: 'Động từ', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  verb: { label: 'Động từ', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  adj: { label: 'Tính từ', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  adjective: { label: 'Tính từ', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  adv: { label: 'Phó từ', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  adverb: { label: 'Phó từ', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  prep: { label: 'Giới từ', badgeClass: 'bg-pink-50 text-pink-700 border-pink-200' },
  conj: { label: 'Liên từ', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  phrase: { label: 'Cụm từ', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  idiom: { label: 'Thành ngữ', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200' }
};

const DEFAULT_TOPICS: TopicOption[] = [
  { id: 'all', name: 'Tất cả chủ đề', icon: '🌟' },
  { id: 'office', name: 'Văn phòng & Công sở', icon: '🏢' },
  { id: 'personnel', name: 'Nhân sự & Tuyển dụng', icon: '👔' },
  { id: 'finance', name: 'Tài chính & Ngân hàng', icon: '💰' },
  { id: 'marketing', name: 'Marketing & Bán hàng', icon: '📢' },
  { id: 'contract', name: 'Hợp đồng & Đàm phán', icon: '📝' },
  { id: 'travel', name: 'Du lịch & Khách sạn', icon: '✈️' },
  { id: 'dining', name: 'Nhà hàng & Sự kiện', icon: '🍽️' },
  { id: 'technology', name: 'Kỹ thuật & Công nghệ', icon: '💻' },
  { id: 'general', name: 'Giao tiếp đời sống', icon: '🌐' },
];

export const FlashcardsPage: React.FC<FlashcardsPageProps> = ({ onNavigate, onFocusModeChange }) => {
  const { user } = useAuth();

  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'learned' | 'due' | 'mastered'>('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedPart, setSelectedPart] = useState('all');
  const [studyMode, setStudyMode] = useState<'srs' | 'quiz' | 'spelling'>('srs');
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<string | null>(null);
  const [isQuizAnswerSubmitted, setIsQuizAnswerSubmitted] = useState<boolean>(false);
  const [spellingInput, setSpellingInput] = useState<string>('');
  const [isSpellingSubmitted, setIsSpellingSubmitted] = useState<boolean>(false);
  const [isSpellingCorrect, setIsSpellingCorrect] = useState<boolean | null>(null);
  const [hasSyncedLocalVocabs, setHasSyncedLocalVocabs] = useState<boolean>(false);
  const [topics, setTopics] = useState<TopicOption[]>(DEFAULT_TOPICS);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    learned: 0,
    due: 0,
    mastered: 0,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    onFocusModeChange?.(true);
    return () => {
      onFocusModeChange?.(false);
    };
  }, [onFocusModeChange]);

  // Auto sync local basket vocabs to DB on first render
  useEffect(() => {
    if (hasSyncedLocalVocabs) return;
    const syncLocal = async () => {
      try {
        const localVocabs = practiceProgressStore.getSavedVocabs();
        if (localVocabs && localVocabs.length > 0) {
          const itemsToSync = localVocabs.map((v) => ({
            word: v.word,
            meaning: v.meaning,
            context: v.context || '',
            part: v.part || 'saved',
            level: v.level || '',
          }));
          await api.syncFlashcards(itemsToSync);
        }
      } catch (err) {
        console.warn('Auto sync local vocabs:', err);
      } finally {
        setHasSyncedLocalVocabs(true);
      }
    };
    syncLocal();
  }, [hasSyncedLocalVocabs]);

  const loadDeck = useCallback(async (overrideFilter?: string, overrideTopic?: string, overridePart?: string) => {
    setIsLoading(true);
    const fType = overrideFilter !== undefined ? overrideFilter : filterType;
    const tTopic = overrideTopic !== undefined ? overrideTopic : selectedTopic;
    const pPart = overridePart !== undefined ? overridePart : selectedPart;
    try {
      const data = await api.getFlashcards(fType, tTopic, pPart);
      let loadedDeck: Flashcard[] = data.deck || [];

      // If user selected "saved", ensure local basket items are also reflected
      if (pPart === 'saved' || fType === 'learned') {
        const localItems = practiceProgressStore.getSavedVocabs();
        const existingWords = new Set(loadedDeck.map((c) => c.word.toLowerCase()));
        localItems.forEach((lv, idx) => {
          if (!existingWords.has(lv.word.toLowerCase())) {
            loadedDeck.push({
              id: 990000 + idx,
              word: lv.word,
              ipa: '/toeic-basket/',
              meaning: lv.meaning,
              part_of_speech: 'noun',
              example: lv.context || '',
              example_vi: '',
              srs_stage: 1,
              interval_days: 1,
              repetitions: 0,
              is_favorite: true,
              part: 'saved',
              source_context: lv.part ? `Part ${lv.part}` : 'Giỏ từ đã lưu',
              topic: 'general',
              topic_name: 'Giỏ từ lưu trữ',
              topic_icon: '📦',
              is_learned: true,
              is_due: true,
              is_mastered: false,
            });
            existingWords.add(lv.word.toLowerCase());
          }
        });
      }

      setDeck(loadedDeck);

      if (data.topics && Array.isArray(data.topics) && data.topics.length > 0) {
        setTopics(data.topics);
      }

      setStats({
        total: data.total_cards || loadedDeck.length,
        learned: data.learned_cards || data.total_learned || loadedDeck.filter((c) => c.is_learned).length,
        due: data.cards_due_today || loadedDeck.filter((c) => c.is_due).length,
        mastered: data.mastered_cards || loadedDeck.filter((c) => c.is_mastered).length,
      });

      setCurrentIndex(0);
      setIsFlipped(false);
      setSelectedQuizAnswer(null);
      setIsQuizAnswerSubmitted(false);
      setSpellingInput('');
      setIsSpellingSubmitted(false);
      setIsSpellingCorrect(null);
    } catch (err) {
      console.error('Error loading flashcards deck:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterType, selectedTopic, selectedPart]);

  useEffect(() => {
    loadDeck(filterType, selectedTopic, selectedPart);
  }, [loadDeck, filterType, selectedTopic, selectedPart]);

  const currentCard = deck[currentIndex];
  // Prepare Quiz options when card changes
  useEffect(() => {
    if (!currentCard || deck.length === 0) return;
    const correctMeaning = currentCard.meaning;
    const distractors = deck
      .filter((c) => c.word.toLowerCase() !== currentCard.word.toLowerCase() && c.meaning)
      .map((c) => c.meaning);

    // Shuffle distractors
    const shuffledDistractors = [...distractors].sort(() => Math.random() - 0.5).slice(0, 3);
    const allOpts = [correctMeaning, ...shuffledDistractors];
    // Fill up to 4 if deck is small
    const genericDistractors = [
      'thông báo chính thức, biên bản',
      'người tham gia buổi hội thảo',
      'đáp ứng đầy đủ yêu cầu',
      'hoàn trả các chi phí công tác',
      'tiến hành điều chỉnh hợp đồng'
    ];
    while (allOpts.length < 4) {
      const fallback = genericDistractors.pop();
      if (fallback && !allOpts.includes(fallback)) {
        allOpts.push(fallback);
      } else {
        allOpts.push(`Lựa chọn bổ sung ${allOpts.length + 1}`);
      }
    }
    setQuizOptions(allOpts.sort(() => Math.random() - 0.5));
    setSelectedQuizAnswer(null);
    setIsQuizAnswerSubmitted(false);
    setSpellingInput('');
    setIsSpellingSubmitted(false);
    setIsSpellingCorrect(null);
  }, [currentIndex, currentCard, deck]);

  const handleSelectQuizOption = (option: string) => {
    if (isQuizAnswerSubmitted || !currentCard) return;
    setSelectedQuizAnswer(option);
    setIsQuizAnswerSubmitted(true);
    const isCorrect = option.trim().toLowerCase() === currentCard.meaning.trim().toLowerCase();
    if (isCorrect) {
      showToast(`✓ Chính xác! "${currentCard.word}" = ${currentCard.meaning}`);
      handleRating('good');
    } else {
      showToast(`✗ Chưa đúng! Đáp án đúng là: ${currentCard.meaning}`);
      handleRating('again');
    }
  };

  const handleCheckSpelling = () => {
    if (!currentCard || isSpellingSubmitted) return;
    const cleanInput = spellingInput.trim().toLowerCase();
    const cleanWord = currentCard.word.trim().toLowerCase();
    const isCorrect = cleanInput === cleanWord;
    setIsSpellingSubmitted(true);
    setIsSpellingCorrect(isCorrect);
    if (isCorrect) {
      showToast(`✓ Xuất sắc! Bạn đã gõ đúng từ "${currentCard.word}"`);
      handleRating('easy');
    } else {
      showToast(`✗ Sai rồi! Từ đúng là: "${currentCard.word}"`);
      handleRating('again');
    }
  };

  const getPartBadge = (partCode?: string, sourceContext?: string) => {
    const raw = `${partCode || ''} ${sourceContext || ''}`.toLowerCase();
    for (let i = 1; i <= 7; i++) {
      if (raw.includes(`part ${i}`) || raw.includes(`part${i}`)) {
        const item = PART_OPTIONS.find((p) => p.id === `part${i}`);
        return item || { id: `part${i}`, name: `Part ${i}`, shortLabel: `Part ${i}`, color: 'bg-blue-50 text-blue-700 border-blue-200' };
      }
    }
    if (raw.includes('dictation') || raw.includes('chép chính tả')) {
      return PART_OPTIONS.find((p) => p.id === 'dictation')!;
    }
    return PART_OPTIONS.find((p) => p.id === 'saved') || PART_OPTIONS[0];
  };

  const getPosBadge = (pos?: string) => {
    const clean = (pos || '').toLowerCase().trim();
    return POS_BADGES[clean] || { label: clean || 'Từ vựng', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
  };


  const speakFallback = (text?: string) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    window.speechSynthesis.speak(utt);
  };

  const playAudio = useCallback((url?: string, text?: string) => {
    if (url) {
      const audio = new Audio(url);
      audio.play().catch(() => {
        speakFallback(text);
      });
    } else {
      speakFallback(text);
    }
  }, []);

  const handleRating = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard) return;

    try {
      const res = await api.reviewFlashcard({
        word_id: String(currentCard.word_id || currentCard.id),
        word: currentCard.word,
        rating,
        meaning: currentCard.meaning,
        ipa: currentCard.ipa,
        part_of_speech: currentCard.part_of_speech,
        example: currentCard.example,
        audio_url: currentCard.audio_url,
        topic: currentCard.topic,
        topic_name: currentCard.topic_name,
      });

      const dayText = res.next_review_days === 1 ? '1 ngày' : `${res.next_review_days} ngày`;
      showToast(
        rating === 'again'
          ? `✓ Sẽ ôn lại "${currentCard.word}" sớm nhất`
          : `✓ Đã ghi nhận "${currentCard.word}" — Ôn lại sau ${dayText}`
      );

      // Optimistically update card status in deck
      setStats((prev) => ({
        ...prev,
        learned: Math.max(prev.learned, prev.learned + (currentCard.repetitions === 0 ? 1 : 0)),
      }));

      setIsFlipped(false);
      if (currentIndex < deck.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Finished deck
        loadDeck();
      }
    } catch (err) {
      console.error('Error rating flashcard:', err);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;

    const newFav = !currentCard.is_favorite;
    try {
      if (newFav) {
        await api.addToFlashcards({
          word: currentCard.word,
          meaning: currentCard.meaning,
          ipa: currentCard.ipa,
          part_of_speech: currentCard.part_of_speech,
          example: currentCard.example,
          audio_url: currentCard.audio_url,
          source_context: currentCard.topic_name || 'Flashcard SRS',
        });
        showToast(`Đã lưu "${currentCard.word}" vào danh sách yêu thích!`);
      } else {
        await api.removeFromFlashcards({
          word: currentCard.word,
          card_id: currentCard.id,
        });
        showToast(`Đã bỏ lưu "${currentCard.word}"`);
      }

      setDeck((prev) =>
        prev.map((c, i) => (i === currentIndex ? { ...c, is_favorite: newFav } : c))
      );
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleShuffle = () => {
    if (deck.length <= 1) return;
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    showToast('Đã xáo trộn thứ tự các thẻ từ vựng!');
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === '1') {
        e.preventDefault();
        handleRating('again');
      } else if (e.key === '2') {
        e.preventDefault();
        handleRating('hard');
      } else if (e.key === '3') {
        e.preventDefault();
        handleRating('easy');
      } else if (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (currentCard) playAudio(currentCard.audio_url, currentCard.word);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIndex < deck.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setIsFlipped(false);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
          setIsFlipped(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCard, currentIndex, deck.length]);

  

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles className="w-4 h-4 text-amber-400" />
          {toastMessage}
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => onNavigate('/practice')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Practice Hub
            </button>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-amber-500" />
              Flashcards Lặp lại ngắt quãng (SRS)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Luyện từ vựng TOEIC với thuật toán Spaced Repetition khoa học
            </p>
          </div>

          {/* Mode & Review Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-2xl overflow-x-auto shadow-inner">
            {[
              { id: 'all', label: 'Tất cả thẻ' },
              {
                id: 'learned',
                label: 'Ôn lại từ đã học',
                count: stats.learned,
                highlight: true,
              },
              { id: 'due', label: 'Cần ôn hôm nay', count: stats.due },
              { id: 'mastered', label: 'Đã thuộc' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  filterType === f.id
                    ? 'bg-white text-amber-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{f.label}</span>
                {f.count !== undefined && f.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      filterType === f.id
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-300/80 text-slate-700'
                    }`}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

                {/* Nguồn bài & Ngữ cảnh Part 1 - Part 7 */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
            <span className="flex items-center gap-1.5">
              <ListFilter className="w-4 h-4 text-blue-600" />
              Lọc theo nguồn bài đã lưu (Part 1 - Part 7 & Giỏ từ)
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              Nguồn: <strong>{PART_OPTIONS.find((p) => p.id === selectedPart)?.name || 'Tất cả nguồn'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {PART_OPTIONS.map((p) => {
              const isSelected = selectedPart === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPart(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs scale-[1.02]'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span>{p.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Study Mode Selector (Lật thẻ SRS / Trắc nghiệm / Gõ từ) */}
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Chế độ học từ vựng:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStudyMode('srs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                studyMode === 'srs'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Lật thẻ SRS</span>
            </button>
            <button
              type="button"
              onClick={() => setStudyMode('quiz')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                studyMode === 'quiz'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Trắc nghiệm 4 đáp án</span>
            </button>
            <button
              type="button"
              onClick={() => setStudyMode('spelling')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                studyMode === 'spelling'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Luyện gõ từ</span>
            </button>
          </div>
        </div>

        {/* Topic Classification Pills (Phân loại chủ đề để học) */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-amber-500" />
              Chọn chủ đề ôn luyện TOEIC
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              Đang chọn: <strong>{topics.find((t) => t.id === selectedTopic)?.name || 'Tất cả'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {topics.map((t) => {
              const isSelected = selectedTopic === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTopic(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs scale-[1.02]'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="text-sm">{t.icon}</span>
                  <span>{t.name}</span>
                  {t.count !== undefined && t.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SRS Stats Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Tổng số thẻ
            </span>
            <span className="text-lg font-black text-slate-800">{stats.total}</span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-amber-200 text-center shadow-xs bg-amber-50/30">
            <span className="text-[11px] font-bold text-amber-700 block uppercase tracking-wider">
              Đã học (SRS)
            </span>
            <span className="text-lg font-black text-amber-700">{stats.learned}</span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-rose-200 text-center shadow-xs bg-rose-50/20">
            <span className="text-[11px] font-bold text-rose-600 block uppercase tracking-wider">
              Đến hạn ôn
            </span>
            <span className="text-lg font-black text-rose-600">{stats.due}</span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-emerald-200 text-center shadow-xs bg-emerald-50/20">
            <span className="text-[11px] font-bold text-emerald-600 block uppercase tracking-wider">
              Đã nắm vững
            </span>
            <span className="text-lg font-black text-emerald-600">{stats.mastered}</span>
          </div>
        </div>

        {/* Main 3D Flip Card */}
        {isLoading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-semibold text-slate-500">Đang chuẩn bị bộ thẻ từ vựng...</p>
          </div>
        ) : currentCard ? (
          <div className="space-y-6">
            {/* Card Progress counter & Controls */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  THẺ {currentIndex + 1} / {deck.length}
                </span>
                <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className="bg-amber-500 h-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShuffle}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200 cursor-pointer shadow-xs"
                  title="Xáo trộn ngẫu nhiên"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  Xáo thẻ
                </button>
                <span className="text-amber-600 hidden md:inline">
                  Nhấn [Space] hoặc click để lật
                </span>
              </div>
            </div>

            {/* Interactive Card Section based on Study Mode */}
            {studyMode === 'quiz' ? (
              /* ================= QUIZ MODE (Trắc nghiệm 4 đáp án) ================= */
              <div className="bg-white border-2 border-blue-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(() => {
                      const pBadge = getPartBadge(currentCard.part, currentCard.source_context);
                      return (
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${pBadge.color} flex items-center gap-1`}>
                          <span>📍</span>
                          <span>{pBadge.name}</span>
                        </span>
                      );
                    })()}
                    {(() => {
                      const pos = getPosBadge(currentCard.part_of_speech);
                      return (
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${pos.badgeClass}`}>
                          {pos.label}
                        </span>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playAudio(currentCard.audio_url, currentCard.word);
                    }}
                    className="p-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                    title="Phát âm từ vựng"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-center py-4 space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                    Chọn nghĩa tiếng Việt chính xác của từ:
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-wide uppercase">
                    {currentCard.word}
                  </h2>
                  <div className="text-sm font-mono text-slate-500 font-medium">
                    {currentCard.ipa || '/pronunciation/'}
                  </div>
                </div>

                {/* 4 Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {quizOptions.map((opt, idx) => {
                    const isSelected = selectedQuizAnswer === opt;
                    const isCorrect = opt.trim().toLowerCase() === currentCard.meaning.trim().toLowerCase();
                    let btnStyle = 'bg-slate-50 hover:bg-blue-50/70 border-slate-200 text-slate-800';

                    if (isQuizAnswerSubmitted) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400 font-bold';
                      } else if (isSelected) {
                        btnStyle = 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-400 font-bold';
                      } else {
                        btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isQuizAnswerSubmitted}
                        onClick={() => handleSelectQuizOption(opt)}
                        className={`p-4 rounded-2xl border-2 text-left text-sm transition-all flex items-start gap-3 cursor-pointer ${btnStyle}`}
                      >
                        <span className="w-6 h-6 rounded-lg bg-white border border-slate-300 font-black text-xs flex items-center justify-center shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1 font-medium">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Example sentence hint */}
                {currentCard.example && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <span className="font-bold text-slate-500 block mb-0.5">💡 Câu ví dụ ngữ cảnh:</span>
                    <span className="italic">"{currentCard.example}"</span>
                  </div>
                )}
              </div>
            ) : studyMode === 'spelling' ? (
              /* ================= SPELLING MODE (Luyện gõ từ vựng) ================= */
              <div className="bg-white border-2 border-purple-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(() => {
                      const pBadge = getPartBadge(currentCard.part, currentCard.source_context);
                      return (
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${pBadge.color} flex items-center gap-1`}>
                          <span>📍</span>
                          <span>{pBadge.name}</span>
                        </span>
                      );
                    })()}
                    {(() => {
                      const pos = getPosBadge(currentCard.part_of_speech);
                      return (
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${pos.badgeClass}`}>
                          {pos.label}
                        </span>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playAudio(currentCard.audio_url, currentCard.word);
                    }}
                    className="p-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
                    title="Nghe phát âm gợi ý"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-center py-4 space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                    Nghĩa của từ cần gõ:
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-purple-700">
                    {currentCard.meaning}
                  </h2>
                  <div className="text-xs text-slate-400 font-mono">
                    Gợi ý: từ gồm {currentCard.word.length} chữ cái • Bắt đầu bằng chữ "{currentCard.word[0]?.toUpperCase()}"
                  </div>
                </div>

                {/* Input box */}
                <div className="max-w-md mx-auto space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      disabled={isSpellingSubmitted}
                      value={spellingInput}
                      onChange={(e) => setSpellingInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCheckSpelling();
                        }
                      }}
                      placeholder={`Gõ từ tiếng Anh tại đây...`}
                      className="w-full text-center text-xl font-bold tracking-wider py-3.5 px-4 rounded-2xl border-2 border-purple-200 focus:border-purple-600 focus:outline-hidden transition-all bg-purple-50/20"
                      autoFocus
                    />
                  </div>

                  {!isSpellingSubmitted ? (
                    <button
                      type="button"
                      disabled={!spellingInput.trim()}
                      onClick={handleCheckSpelling}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Kiểm tra chính tả (Enter)
                    </button>
                  ) : (
                    <div className="p-4 rounded-2xl text-center space-y-1.5 border animate-in fade-in">
                      {isSpellingCorrect ? (
                        <div className="text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-bold text-sm flex items-center justify-center gap-1.5">
                          <Check className="w-5 h-5" />
                          <span>Chính xác tuyệt đối! Từ đúng là: {currentCard.word}</span>
                        </div>
                      ) : (
                        <div className="text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 font-bold text-sm space-y-1">
                          <div className="flex items-center justify-center gap-1.5">
                            <X className="w-5 h-5" />
                            <span>Chưa chính xác!</span>
                          </div>
                          <div className="text-xs font-semibold text-rose-600">
                            Đáp án chuẩn: <strong className="text-base text-slate-900 tracking-wider uppercase underline">{currentCard.word}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ================= 3D FLIP SRS CARD MODE ================= */
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                style={{
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 360ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="relative min-h-[380px] bg-white border-2 border-slate-200 hover:border-amber-400 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between items-center text-center select-none perspective-1000"
              >
                {/* Top Card Controls */}
                <div className="w-full flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Part Source Badge */}
                    {(() => {
                      const pBadge = getPartBadge(currentCard.part, currentCard.source_context);
                      return (
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${pBadge.color} flex items-center gap-1`}>
                          <span>📍</span>
                          <span>{pBadge.name}</span>
                        </span>
                      );
                    })()}

                    {/* Part of Speech Badge */}
                    {(() => {
                      const pos = getPosBadge(currentCard.part_of_speech);
                      return (
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${pos.badgeClass}`}>
                          {pos.label}
                        </span>
                      );
                    })()}

                    {currentCard.topic_name && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hidden sm:inline-flex items-center gap-1">
                        <span>{currentCard.topic_icon || '🏷️'}</span>
                        <span>{currentCard.topic_name}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Star / Bookmark */}
                    <button
                      type="button"
                      onClick={handleToggleFavorite}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        currentCard.is_favorite
                          ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-400 hover:text-amber-500 hover:bg-slate-200'
                      }`}
                      title={currentCard.is_favorite ? 'Đã lưu trong sổ từ' : 'Lưu vào sổ từ vựng'}
                    >
                      <Star className={`w-4 h-4 ${currentCard.is_favorite ? 'fill-amber-500' : ''}`} />
                    </button>

                    {/* Audio */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playAudio(currentCard.audio_url, currentCard.word);
                      }}
                      className="p-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                      title="Phát âm từ vựng (Phím A hoặc R)"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Front Side vs Back Side Content */}
                {!isFlipped ? (
                  <div className="space-y-4 py-8 my-auto">
                    <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-wider uppercase">
                      {currentCard.word}
                    </h2>
                    <div className="text-lg text-slate-500 font-mono font-medium">
                      {currentCard.ipa || '/pronunciation/'}
                    </div>

                    {/* Cloze test / example hint on front side */}
                    {currentCard.example && (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 max-w-md mx-auto text-xs text-slate-600 italic">
                        "{currentCard.example.replace(new RegExp(`\\b${currentCard.word}\\b`, 'gi'), '_____')}"
                      </div>
                    )}

                    <span className="text-xs text-amber-600 font-semibold inline-flex items-center gap-1.5 pt-1">
                      <RotateCw className="w-3.5 h-3.5" />
                      Chạm hoặc nhấn phím Space để xem nghĩa & ví dụ
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 py-2 my-auto animate-in fade-in zoom-in-95 duration-150 w-full max-w-lg text-left">
                    <div className="text-2xl font-black text-amber-600 text-center">
                      {currentCard.meaning}
                    </div>

                    {currentCard.example && (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 italic">
                        <div className="font-semibold text-slate-800">"{currentCard.example}"</div>
                        {currentCard.example_vi && (
                          <div className="text-[11px] text-slate-500 font-sans not-italic mt-1.5 border-t border-slate-200/50 pt-1.5">
                            {currentCard.example_vi}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Word Family */}
                    {currentCard.word_family && currentCard.word_family.length > 0 && (
                      <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                          Gia đình từ (Word Family):
                        </span>
                        <div className="flex flex-wrap gap-1.5 text-xs text-blue-900 font-medium">
                          {currentCard.word_family.map((wf, idx) => (
                            <span key={idx} className="bg-white px-2 py-0.5 rounded border border-blue-200">
                              {wf}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Collocations */}
                    {currentCard.collocations && currentCard.collocations.length > 0 && (
                      <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                          Cụm từ đi kèm (Collocations):
                        </span>
                        <div className="flex flex-wrap gap-1.5 text-xs text-emerald-900 font-medium">
                          {currentCard.collocations.map((col, idx) => (
                            <span key={idx} className="bg-white px-2 py-0.5 rounded border border-emerald-200">
                              {typeof col === 'string' ? col : (col as any)?.phrase || (col as any)?.meaning || ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TOEIC Tip */}
                    {currentCard.toeic_tip && (
                      <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5">
                          💡 Mẹo thi TOEIC ETS:
                        </span>
                        {currentCard.toeic_tip}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-400 font-medium text-center pt-1">
                      Khoảng cách ôn tập: <strong>{currentCard.interval_days} ngày</strong> • Đã ôn:{' '}
                      <strong>{currentCard.repetitions || 0} lần</strong>
                    </div>
                  </div>
                )}

                {/* Bottom Card Footer */}
                <div className="w-full flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
                  <span>
                    SRS Stage: {currentCard.srs_stage || 1}/5
                    {currentCard.repetitions ? ` (${currentCard.repetitions} lượt)` : ' (Mới)'}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-600">
                    <RotateCw className="w-3.5 h-3.5" />
                    Lật thẻ <span className="hidden md:inline">[Space]</span>
                  </span>
                </div>
              </div>
            )}

            {/* Spaced Repetition Rating Buttons */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-center">
                Đánh giá mức độ ghi nhớ (SRS)
              </span>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleRating('again')}
                  className="py-3 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.96] duration-150 cursor-pointer flex flex-col items-center shadow-xs focus:ring-2 focus:ring-offset-2"
                >
                  <span className="text-sm font-black">Quên <span className="hidden sm:inline">[1]</span></span>
                  <span className="text-[11px] font-medium text-rose-600/90 mt-0.5">
                    Học lại ngay (1 ngày)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRating('hard')}
                  className="py-3 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.96] duration-150 cursor-pointer flex flex-col items-center shadow-xs focus:ring-2 focus:ring-offset-2"
                >
                  <span className="text-sm font-black">Nhớ mang máng <span className="hidden sm:inline">[2]</span></span>
                  <span className="text-[11px] font-medium text-amber-600/90 mt-0.5">
                    Ôn lại sau 3 ngày
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRating('easy')}
                  className="py-3 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.96] duration-150 cursor-pointer flex flex-col items-center shadow-xs focus:ring-2 focus:ring-offset-2"
                >
                  <span className="text-sm font-black">Đã thuộc <span className="hidden sm:inline">[3]</span></span>
                  <span className="text-[11px] font-medium text-emerald-600/90 mt-0.5">
                    Ôn lại sau 7 ngày
                  </span>
                </button>
              </div>
            </div>

            {/* Bottom Card Navigation */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => {
                  if (currentIndex > 0) {
                    setCurrentIndex((prev) => prev - 1);
                    setIsFlipped(false);
                  }
                }}
                className="inline-flex items-center gap-1 font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                Thẻ trước <span className="hidden sm:inline">[←]</span>
              </button>

              <span className="text-[11px] text-slate-400 hidden md:inline">
                Phím tắt: [Space] Lật • [1, 2, 3] Đánh giá • [A/R] Nghe
              </span>

              <button
                type="button"
                disabled={currentIndex >= deck.length - 1}
                onClick={() => {
                  if (currentIndex < deck.length - 1) {
                    setCurrentIndex((prev) => prev + 1);
                    setIsFlipped(false);
                  }
                }}
                className="inline-flex items-center gap-1 font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Thẻ sau <span className="hidden sm:inline">[→]</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : filterType === 'learned' ? (
          /* Empty State for Learned Words */
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">
                Chưa có từ vựng nào trong danh sách Đã học
              </h3>
              <p className="text-xs text-slate-500">
                Khi bạn ôn tập từ vựng hoặc đánh dấu Đã thuộc / Nhớ mang máng, từ vựng sẽ tự động được
                lưu vào đây để ôn luyện ngắt quãng (Spaced Repetition)!
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Học từ mới ngay
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/practice/vocabulary')}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Khám phá Kho từ vựng 5,000+
              </button>
            </div>
          </div>
        ) : (
          /* Empty State for Other Filters (Due / Mastered / All) */
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">
                {filterType === 'due'
                  ? 'Tuyệt vời! Bạn không còn thẻ nào cần ôn hôm nay.'
                  : 'Không có thẻ từ vựng nào trong mục này.'}
              </h3>
              <p className="text-xs text-slate-500">
                {filterType === 'due'
                  ? 'Hãy quay lại vào ngày mai hoặc ôn lại các từ đã học để duy trì phản xạ tốt nhất.'
                  : 'Hãy đổi chủ đề hoặc chọn chế độ Tất cả thẻ để bắt đầu học bộ từ mới.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFilterType('learned')}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Ôn lại từ đã học ({stats.learned})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTopic('all');
                  setFilterType('all');
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Xem tất cả chủ đề
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
