import { useAuth } from '../context/AuthContext';
import { AuthRequiredGate } from '../components/AuthRequiredGate';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  ArrowLeft,
  Volume2,
  Star,
  RotateCw,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Clock,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  BookmarkCheck,
  Award,
  GraduationCap
} from 'lucide-react';
import { api } from '../services/api';
import { Flashcard } from '../types';

interface FlashcardsPageProps {
  onNavigate: (path: string) => void;
  onFocusModeChange?: (active: boolean) => void;
}

interface TopicOption {
  id: string;
  name: string;
  icon: string;
  count?: number;
}

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

  const loadDeck = async (overrideFilter?: string, overrideTopic?: string) => {
    setIsLoading(true);
    const fType = overrideFilter !== undefined ? overrideFilter : filterType;
    const tTopic = overrideTopic !== undefined ? overrideTopic : selectedTopic;
    try {
      const data = await api.getFlashcards(fType, tTopic);
      const loadedDeck: Flashcard[] = data.deck || [];
      setDeck(loadedDeck);

      if (data.topics && Array.isArray(data.topics) && data.topics.length > 0) {
        setTopics(data.topics);
      }

      setStats({
        total: data.total_cards || loadedDeck.length,
        learned: data.learned_cards || data.total_learned || 0,
        due: data.cards_due_today || 0,
        mastered: data.mastered_cards || 0,
      });

      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err) {
      console.error('Error loading flashcards deck:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeck(filterType, selectedTopic);
  }, [filterType, selectedTopic]);

  const currentCard = deck[currentIndex];

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

  const speakFallback = (text?: string) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    window.speechSynthesis.speak(utt);
  };

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

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Flashcards SRS Lặp lại ngắt quãng"
        featureDesc="Ghi nhớ từ vựng vĩnh viễn với thuật toán SuperMemo SM-2 và phát âm chuẩn IPA."
        onNavigate={onNavigate}
      />
    );
  }

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

            {/* Interactive Flip Card Box */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative min-h-[360px] bg-white border-2 border-slate-200 hover:border-amber-300 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between items-center text-center select-none"
            >
              {/* Top Card Controls */}
              <div className="w-full flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {currentCard.topic_name && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1">
                      <span>{currentCard.topic_icon || '🏷️'}</span>
                      <span>{currentCard.topic_name}</span>
                    </span>
                  )}
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                    {currentCard.part_of_speech || 'noun'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Star / Bookmark */}
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className={`p-2 rounded-xl transition-colors ${
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
                    className="p-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                    title="Phát âm từ vựng (Phím A hoặc R)"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Front Side vs Back Side Content */}
              {!isFlipped ? (
                <div className="space-y-3 py-8 my-auto">
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-wider uppercase">
                    {currentCard.word}
                  </h2>
                  <div className="text-base text-slate-500 font-mono font-medium">
                    {currentCard.ipa || '/pronunciation/'}
                  </div>
                  <span className="text-xs text-amber-600 font-semibold inline-flex items-center gap-1.5 pt-2">
                    <RotateCw className="w-3.5 h-3.5" />
                    Chạm hoặc nhấn phím Space để xem nghĩa tiếng Việt & ví dụ
                  </span>
                </div>
              ) : (
                <div className="space-y-3 py-2 my-auto animate-in fade-in zoom-in-95 duration-150 w-full max-w-lg text-left">
                  <div className="text-2xl font-bold text-amber-600 text-center">
                    {currentCard.meaning}
                  </div>

                  {currentCard.example && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 italic">
                      <div>"{currentCard.example}"</div>
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
                            {col}
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

            {/* Spaced Repetition Rating Buttons */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-center">
                Đánh giá mức độ ghi nhớ (SRS)
              </span>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleRating('again')}
                  className="py-3 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex flex-col items-center shadow-xs"
                >
                  <span className="text-sm font-black">Quên <span className="hidden sm:inline">[1]</span></span>
                  <span className="text-[11px] font-medium text-rose-600/90 mt-0.5">
                    Học lại ngay (1 ngày)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRating('hard')}
                  className="py-3 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex flex-col items-center shadow-xs"
                >
                  <span className="text-sm font-black">Nhớ mang máng <span className="hidden sm:inline">[2]</span></span>
                  <span className="text-[11px] font-medium text-amber-600/90 mt-0.5">
                    Ôn lại sau 3 ngày
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRating('easy')}
                  className="py-3 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex flex-col items-center shadow-xs"
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
