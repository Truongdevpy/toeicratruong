import { useAuth } from '../context/AuthContext';
import { AuthRequiredGate } from '../components/AuthRequiredGate';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  ArrowLeft,
  Search,
  Volume2,
  Bookmark,
  BookmarkCheck,
  Check,
  BookOpen,
  Sparkles,
  Trash2,
  Calendar,
  Layers,
  Tag,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { VocabWord } from '../types';

interface VocabularyPageProps {
  onNavigate: (path: string) => void;
  onFocusModeChange?: (active: boolean) => void;
}

const SAVED_VOCAB_STORAGE_KEY = 'toeic_saved_vocab_list_v2';

export const VocabularyPage: React.FC<VocabularyPageProps> = ({ onNavigate, onFocusModeChange }) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Kho Từ vựng theo lộ trình"
        featureDesc="5,000+ từ vựng cốt lõi phân theo band điểm, chủ đề thương mại và collocations thi thật."
        onNavigate={onNavigate}
      />
    );
  }


  const [activeTab, setActiveTab] = useState<'all' | 'saved' | 'review'>('all');
  const [level, setLevel] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [words, setWords] = useState<VocabWord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const [savedList, setSavedList] = useState<any[]>([]);
  const [savedSearch, setSavedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);
  const [isQuizAnswered, setIsQuizAnswered] = useState(false);

  // Spaced Repetition (SRS) Review State (Group D)
  const [srsDueCards, setSrsDueCards] = useState<any[]>([]);
  const [srsIndex, setSrsIndex] = useState(0);
  const [isMeaningRevealed, setIsMeaningRevealed] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('all');

  const VOCAB_TOPICS = [
    { id: 'all', label: 'Tất cả chủ đề' },
    { id: 'office', label: 'Văn phòng & Công sở' },
    { id: 'finance', label: 'Kinh doanh & Tài chính' },
    { id: 'personnel', label: 'Nhân sự & Tuyển dụng' },
    { id: 'travel', label: 'Du lịch & Khách sạn' },
    { id: 'dining', label: 'Nhà hàng & Sự kiện' },
    { id: 'contract', label: 'Hợp đồng & Đàm phán' },
    { id: 'technology', label: 'Kỹ thuật & Thiết bị' },
    { id: 'marketing', label: 'Marketing & Bán hàng' },
  ];

  const loadSrsDueCards = async () => {
    try {
      const res = await api.getVocabularyReviewDue();
      if (res && res.cards) {
        setSrsDueCards(res.cards);
      }
    } catch {}
  };

  const handleSrsReview = async (grade: number) => {
    if (srsIndex >= srsDueCards.length) return;
    const currentCard = srsDueCards[srsIndex];
    try {
      await api.submitVocabularyReview({
        word_id: currentCard.word_id || currentCard.id,
        grade
      });
      showToast(grade >= 3 ? '✓ Đã ghi nhớ! Lên lịch ôn tiếp theo.' : '↺ Đã lưu vào lịch ôn sớm nhất.');
    } catch {}

    if (srsIndex < srsDueCards.length - 1) {
      setSrsIndex((prev) => prev + 1);
      setIsMeaningRevealed(false);
    } else {
      setSrsDueCards([]);
      showToast('🎉 Chúc mừng! Bạn đã hoàn thành tất cả từ vựng cần ôn hôm nay.');
    }
  };

  useEffect(() => {
    onFocusModeChange?.(isPracticeMode);
    return () => {
      onFocusModeChange?.(false);
    };
  }, [isPracticeMode, onFocusModeChange]);

  const pageSize = 24;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load saved vocabulary from localStorage & backend
  const loadSavedVocab = async () => {
    try {
      let localWords: any[] = [];
      try {
        const raw = localStorage.getItem(SAVED_VOCAB_STORAGE_KEY);
        if (raw) localWords = JSON.parse(raw);
      } catch {}

      // Fetch from backend
      let backendWords: any[] = [];
      try {
        const res = await api.getFlashcards('all');
        if (res && res.deck) {
          backendWords = res.deck;
        }
      } catch {}

      // Merge and deduplicate by lowercased word
      const map = new Map<string, any>();
      for (const w of [...backendWords, ...localWords]) {
        const key = (w.word || '').trim().toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, {
            id: w.id || `local_${key}`,
            word: w.word,
            meaning: w.meaning || '',
            ipa: w.ipa || '',
            part_of_speech: w.part_of_speech || 'n',
            example: w.example || '',
            example_vi: w.example_vi || '',
            audio_url: w.audio_url || w.audio_us || w.audio_uk || '',
            source_context: w.source_context || w.category || 'Kho từ vựng TOEIC',
            created_at: w.created_at || new Date().toISOString()
          });
        }
      }

      const merged = Array.from(map.values());
      setSavedList(merged);

      const statusMap: Record<string, boolean> = {};
      merged.forEach((item) => {
        statusMap[item.word.toLowerCase()] = true;
      });
      setSavedStatus(statusMap);
    } catch (err) {
      console.error('Error loading saved vocab:', err);
    }
  };

  const loadVocab = async () => {
    setIsLoading(true);
    try {
      const data = await api.getVocabulary({
        level,
        category,
        search,
        limit: pageSize,
        offset: page * pageSize,
      });
      setWords(data.words || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSavedVocab();
    loadSrsDueCards();
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      loadVocab();
    }
  }, [activeTab, level, category, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadVocab();
  };

  const playAudio = (url?: string, text?: string) => {
    if (url) {
      const audio = new Audio(url);
      audio.play().catch(() => {
        speakFallback(text);
      });
    } else {
      speakFallback(text);
    }
  };

  const speakFallback = (text?: string) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    window.speechSynthesis.speak(utt);
  };

  // Toggle Save / Unsave vocabulary
  const handleToggleSave = async (wordItem: any) => {
    const wordKey = (wordItem.word || '').trim().toLowerCase();
    const isCurrentlySaved = Boolean(savedStatus[wordKey]);

    if (isCurrentlySaved) {
      // Unsave
      try {
        await api.removeFromFlashcards({ word: wordItem.word, card_id: wordItem.id });
      } catch {}

      // Update state and localStorage
      setSavedStatus((prev) => {
        const next = { ...prev };
        delete next[wordKey];
        return next;
      });

      const updatedList = savedList.filter((item) => item.word.toLowerCase() !== wordKey);
      setSavedList(updatedList);
      try {
        localStorage.setItem(SAVED_VOCAB_STORAGE_KEY, JSON.stringify(updatedList));
      } catch {}

      showToast(`Đã bỏ lưu từ "${wordItem.word}" khỏi danh sách.`);
    } else {
      // Save (Prevent duplicate)
      const newItem = {
        id: `local_${Date.now()}`,
        word: wordItem.word,
        meaning: wordItem.meaning,
        ipa: wordItem.ipa || '',
        part_of_speech: wordItem.part_of_speech || 'n',
        example: wordItem.example || '',
        example_vi: wordItem.example_vi || '',
        audio_url: wordItem.audio_us || wordItem.audio_uk || wordItem.audio_url || '',
        source_context: wordItem.category || wordItem.source_context || 'Kho từ vựng TOEIC',
        created_at: new Date().toISOString()
      };

      try {
        await api.addToFlashcards({
          word: wordItem.word,
          meaning: wordItem.meaning,
          ipa: wordItem.ipa,
          part_of_speech: wordItem.part_of_speech,
          example: wordItem.example,
          audio_url: wordItem.audio_us || wordItem.audio_uk || wordItem.audio_url,
          source_context: newItem.source_context
        });
      } catch {}

      setSavedStatus((prev) => ({ ...prev, [wordKey]: true }));
      const updatedList = [newItem, ...savedList.filter((item) => item.word.toLowerCase() !== wordKey)];
      setSavedList(updatedList);
      try {
        localStorage.setItem(SAVED_VOCAB_STORAGE_KEY, JSON.stringify(updatedList));
      } catch {}

      showToast(`Đã lưu từ "${wordItem.word}" vào sổ từ vựng Flashcard!`);
    }
  };

  // Filtered saved list for search
  const filteredSavedList = useMemo(() => {
    if (!savedSearch.trim()) return savedList;
    const q = savedSearch.toLowerCase().trim();
    return savedList.filter((w) =>
      w.word.toLowerCase().includes(q) ||
      (w.meaning && w.meaning.toLowerCase().includes(q)) ||
      (w.example && w.example.toLowerCase().includes(q)) ||
      (w.source_context && w.source_context.toLowerCase().includes(q))
    );
  }, [savedList, savedSearch]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {isPracticeMode ? (
          <div className="max-w-3xl mx-auto space-y-6 py-4 animate-in fade-in duration-200">
            {/* Focus Top Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPracticeMode(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại kho từ vựng</span>
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500">
                  Câu {quizIndex + 1} / {Math.min(words.length || 10, 10)}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  Đúng {quizScore} câu
                </span>
              </div>
            </div>

            {/* Quiz Question Card */}
            {words.length > 0 && words[quizIndex] && (() => {
              const currentW = words[quizIndex];
              const distractors = words.filter((w) => w.word !== currentW.word).slice(0, 3).map((w) => w.meaning);
              const allOptions = [currentW.meaning, ...distractors].sort(() => 0.5 - Math.random());

              return (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 text-center">
                  <div className="space-y-2">
                    <span className="px-3 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200 text-xs font-bold uppercase">
                      {currentW.part_of_speech || 'noun'} • {currentW.category || 'TOEIC'}
                    </span>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                      {currentW.word}
                    </h2>
                    {currentW.ipa && (
                      <div className="text-sm font-mono text-slate-500 font-medium">
                        /{currentW.ipa}/
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">Chọn nghĩa tiếng Việt chính xác nhất cho từ trên:</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
                    {allOptions.map((opt, idx) => {
                      const isCorrect = opt === currentW.meaning;
                      const isSelected = selectedQuizOption === opt;
                      let btnStyle = 'border-slate-200 hover:border-slate-300 bg-slate-50/60 text-slate-800';

                      if (isQuizAnswered) {
                        if (isCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold';
                        } else if (isSelected && !isCorrect) {
                          btnStyle = 'border-red-500 bg-red-50 text-red-950 font-medium';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isQuizAnswered}
                          onClick={() => {
                            setSelectedQuizOption(opt);
                            setIsQuizAnswered(true);
                            if (opt === currentW.meaning) {
                              setQuizScore((prev) => prev + 1);
                            }
                          }}
                          className={`p-4 rounded-2xl border-2 text-sm transition-all cursor-pointer ${btnStyle}`}
                        >
                          <span className="font-semibold">{String.fromCharCode(65 + idx)}.</span> {opt}
                        </button>
                      );
                    })}
                  </div>

                  {isQuizAnswered && (
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between animate-in fade-in duration-150">
                      <div className="text-left text-xs text-slate-600">
                        {currentW.example && (
                          <div><b>Ví dụ:</b> <i>"{currentW.example}"</i></div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (quizIndex < Math.min(words.length || 10, 10) - 1) {
                            setQuizIndex((prev) => prev + 1);
                            setSelectedQuizOption(null);
                            setIsQuizAnswered(false);
                          } else {
                            alert(`Chúc mừng! Bạn đã hoàn thành bài luyện tập với ${quizScore + (selectedQuizOption === currentW.meaning ? 0 : 0)} điểm!`);
                            setIsPracticeMode(false);
                          }
                        }}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                      >
                        {quizIndex < Math.min(words.length || 10, 10) - 1 ? 'Câu tiếp theo →' : 'Hoàn thành 🎉'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (<>
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => onNavigate('/practice')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Practice Hub
            </button>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <Target className="w-6 h-6 text-pink-600" />
              Kho Từ vựng TOEIC Chuẩn Hóa
            </h1>
          </div>

          {/* Primary View Switcher: All Words vs Saved Words */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-2xl border border-slate-300/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-pink-600" />
              <span>Tất cả từ vựng (5,000+)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPracticeMode(true);
                setQuizIndex(0);
                setQuizScore(0);
                setSelectedQuizOption(null);
                setIsQuizAnswered(false);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xs hover:opacity-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Luyện tập trắc nghiệm</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('review');
                loadSrsDueCards();
                setSrsIndex(0);
                setIsMeaningRevealed(false);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'review'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Ôn tập SRS</span>
              {srsDueCards.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black">
                  {srsDueCards.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bookmark className="w-4 h-4 text-amber-500" />
              <span>Từ vựng đã lưu</span>
              <span className="px-1.5 py-0.2 rounded-full bg-pink-100 text-pink-700 text-[10px] font-black">
                {savedList.length}
              </span>
            </button>
          </div>
        </div>

        {/* --- VIEW 1: ALL VOCABULARY --- */}
        {activeTab === 'all' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Search Bar & Filters */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
              {/* Topic Pills Filter (Group D) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Chủ đề:
                </span>
                {VOCAB_TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTopic(t.id);
                      setCategory(t.id);
                      setPage(0);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedTopic === t.id
                        ? 'bg-pink-600 text-white shadow-2xs font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo từ vựng tiếng Anh, nghĩa tiếng Việt, hoặc ví dụ câu..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all"
                  />
                </form>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setLevel('all');
                      setCategory('all');
                      setSelectedTopic('all');
                      setPage(0);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Đặt lại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPage(0);
                      loadVocab();
                    }}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Tìm kiếm
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Cấp độ:</span>
                {['all', 'TOEIC 500', 'TOEIC 650', 'TOEIC 750+'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setLevel(lvl);
                      setPage(0);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      level === lvl
                        ? 'bg-pink-600 text-white shadow-xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {lvl === 'all' ? 'Tất cả cấp độ' : lvl}
                  </button>
                ))}

                <div className="text-xs text-slate-500 font-medium ml-auto hidden sm:block">
                  Hiển thị <strong className="text-pink-600 font-bold">{total.toLocaleString()}</strong> từ vựng phù hợp
                </div>
              </div>
            </div>

            {/* Words Grid */}
            {isLoading ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-slate-200">
                <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-semibold text-slate-500">Đang tải kho từ vựng...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {words.map((w) => {
                  const isSaved = Boolean(savedStatus[w.word.toLowerCase()]);
                  return (
                    <div
                      key={w.id}
                      className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-extrabold text-slate-900 tracking-wide uppercase">
                                {w.word}
                              </h3>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                                {w.part_of_speech}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-slate-400 mt-0.5 block">{w.ipa}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => playAudio(w.audio_url || w.audio_us || w.audio_uk, w.word)}
                              className="p-1.5 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors cursor-pointer"
                              title="Phát âm tiếng Anh"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleSave(w)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                                isSaved
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                  : 'border-slate-200 text-slate-400 hover:text-pink-600 hover:border-pink-200 bg-white'
                              }`}
                              title={isSaved ? 'Nhấn để bỏ lưu (Unsave)' : 'Lưu từ vựng'}
                            >
                              {isSaved ? (
                                <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 text-sm font-bold text-pink-700">{w.meaning}</div>

                        {w.example && (
                          <p className="mt-2 text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                            "{w.example}"
                          </p>
                        )}

                        {w.collocations && w.collocations.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {w.collocations.slice(0, 2).map((c, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{w.category || 'TOEIC Core'}</span>
                        <span className="font-semibold text-slate-600">{w.level || 'TOEIC 650+'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-500">
                Hiển thị <strong>{words.length}</strong> / <strong>{total}</strong> từ vựng
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Trang trước
                </button>
                <span className="text-xs font-bold text-slate-700">Trang {page + 1}</span>
                <button
                  type="button"
                  disabled={(page + 1) * pageSize >= total}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Trang sau
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW 2: SAVED VOCABULARY PAGE ("Từ vựng đã lưu") --- */}
        {activeTab === 'saved' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Toolbar for Saved Words */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={savedSearch}
                  onChange={(e) => setSavedSearch(e.target.value)}
                  placeholder="Tìm trong danh sách từ đã lưu..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-xs text-slate-500">
                  Tổng cộng: <strong className="text-slate-900 font-bold">{filteredSavedList.length}</strong> từ đã lưu
                </span>

                <button
                  type="button"
                  onClick={() => onNavigate('/practice/flashcards')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-4 h-4" /> Ôn thẻ SRS
                </button>
              </div>
            </div>

            {/* Saved Words Empty State */}
            {filteredSavedList.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 space-y-3">
                <Bookmark className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">Chưa có từ vựng nào trong danh sách đã lưu</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Bạn có thể nhấn vào biểu tượng Bookmark trên các thẻ từ vựng hoặc khi bôi đen tra từ trên đề thi để lưu lại ôn tập.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Khám phá kho từ vựng TOEIC
                </button>
              </div>
            ) : (
              /* Saved Words Cards Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSavedList.map((item) => (
                  <div
                    key={item.id || item.word}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      {/* Header with Word, Part of Speech, Audio, and Unsave Button */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-slate-900 tracking-wide uppercase">
                              {item.word}
                            </h3>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                              {item.part_of_speech || 'n'}
                            </span>
                          </div>
                          {item.ipa && (
                            <span className="text-xs font-mono text-slate-400 mt-0.5 block">{item.ipa}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => playAudio(item.audio_url, item.word)}
                            className="p-1.5 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors cursor-pointer"
                            title="Phát âm từ vựng"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleSave(item)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Bỏ lưu từ này (Unsave)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Meaning */}
                      <div className="mt-3 text-sm font-bold text-amber-900 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
                        {item.meaning || 'Nghĩa từ vựng TOEIC'}
                      </div>

                      {/* Example sentence */}
                      {item.example && (
                        <div className="mt-2 text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                          "{item.example}"
                        </div>
                      )}
                    </div>

                    {/* Metadata Footer: Source Context & Created At */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 truncate max-w-[150px]">
                        <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                        {item.source_context || 'Kho từ vựng'}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        {item.created_at ? item.created_at.slice(0, 10) : 'Gần đây'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
              </>
      )}
      </div>
    </div>
  );
};
