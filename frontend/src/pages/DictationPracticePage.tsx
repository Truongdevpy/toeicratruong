import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Headphones,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Keyboard,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  Send,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Check,
  Flame,
  ArrowRight,
  ArrowLeft,
  Filter,
  Search,
  SlidersHorizontal,
  Layers,
  Award,
  Trophy,
  Eye,
  Lock,
  FileText,
  BookmarkCheck,
  RefreshCw,
  Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MorphPlayPause } from '../components/MorphIcon';
import { api } from '../services/api';
import { DictationChallenge, DictationCheckResponse, DictationWordDiff, DictationLineDiff } from '../types';
import { useAuth } from '../context/AuthContext';
import { AuthRequiredGate } from '../components/AuthRequiredGate';

interface DictationPracticePageProps {
  onNavigate: (path: string) => void;
  onFocusModeChange?: (active: boolean) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onOpenRBAC?: () => void;
}

const DICTATION_HISTORY_KEY = 'toeic_dictation_history_v2';

interface ChallengeHistoryRecord {
  challengeId: string;
  bestAccuracy: number;
  lastAccuracy: number;
  completedAt: string;
  isCorrect: boolean;
}

export const DictationPracticePage: React.FC<DictationPracticePageProps> = ({
  onNavigate,
  onFocusModeChange,
  onOpenAuth,
  onOpenRBAC,
}) => {
  const { user } = useAuth();

  // Mode: 'catalog' (Danh sách đề nghe chép) vs 'runner' (Phòng luyện nghe chép)
  const [viewMode, setViewMode] = useState<'catalog' | 'runner'>('catalog');

  // Activate focus mode only in runner mode
  useEffect(() => {
    onFocusModeChange?.(viewMode === 'runner');
    return () => {
      onFocusModeChange?.(false);
    };
  }, [viewMode, onFocusModeChange]);

  // Catalog Filter State
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'listening' | 'reading' | 'full'>('listening');
  const [partFilter, setPartFilter] = useState<number | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [lengthFilter, setLengthFilter] = useState<string>('all');
  const [durationFilter, setDurationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'uncompleted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Challenges data
  const [allChallenges, setAllChallenges] = useState<DictationChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User History State from localStorage
  const [historyMap, setHistoryMap] = useState<Record<string, ChallengeHistoryRecord>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DICTATION_HISTORY_KEY);
      if (raw) {
        setHistoryMap(JSON.parse(raw));
      }
    } catch {
      setHistoryMap({});
    }
  }, []);

  const saveHistory = (challengeId: string, accuracy: number, isCorrect: boolean) => {
    setHistoryMap((prev) => {
      const existing = prev[challengeId];
      const updated: ChallengeHistoryRecord = {
        challengeId,
        bestAccuracy: existing ? Math.max(existing.bestAccuracy, accuracy) : accuracy,
        lastAccuracy: accuracy,
        completedAt: new Date().toISOString(),
        isCorrect: isCorrect || (existing?.isCorrect ?? false),
      };
      const nextMap = { ...prev, [challengeId]: updated };
      try {
        localStorage.setItem(DICTATION_HISTORY_KEY, JSON.stringify(nextMap));
      } catch {}
      return nextMap;
    });
  };

  // Load Challenges
  const loadChallenges = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDictationChallenges({ limit: 100, page: 1 });
      const list = data.challenges || [];
      setAllChallenges(list);
    } catch (err) {
      console.error('Error loading dictation challenges:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  // Runner State
  const [activeChallengeIndex, setActiveChallengeIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState<DictationCheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showFirstLetterHint, setShowFirstLetterHint] = useState(false);
  const [listenCount, setListenCount] = useState<number>(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [autoPlayOnNext, setAutoPlayOnNext] = useState<boolean>(true);

  // Saved Vocab & Toast State
  const [savedVocabWords, setSavedVocabWords] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtered Challenges for Catalog
  const filteredChallenges = useMemo(() => {
    return allChallenges.filter((item) => {
      // 1. Category Filter
      // Dictation is STRICTLY for TOEIC Listening (Part 1 - 4)
      if (item.part > 4) return false;

      // 2. Part Filter
      if (partFilter !== 'all' && item.part !== partFilter) return false;

      // 3. Difficulty Filter
      if (difficultyFilter !== 'all' && (item.difficulty || '').toLowerCase() !== difficultyFilter.toLowerCase()) {
        return false;
      }

      // 4. Sentences count
      const lineCount = item.lines?.length || 1;
      if (lengthFilter === 'short' && lineCount > 2) return false;
      if (lengthFilter === 'medium' && (lineCount <= 2 || lineCount > 5)) return false;
      if (lengthFilter === 'long' && lineCount <= 5) return false;

      // 5. Duration filter
      const durEst = lineCount * 1.5;
      if (durationFilter === 'quick' && durEst > 3) return false;
      if (durationFilter === 'standard' && (durEst <= 3 || durEst > 8)) return false;
      if (durationFilter === 'extended' && durEst <= 8) return false;

      // 6. Status filter
      const hist = historyMap[item.id];
      if (statusFilter === 'completed' && !hist) return false;
      if (statusFilter === 'uncompleted' && hist) return false;

      // 7. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = item.title?.toLowerCase().includes(q);
        const textMatch = item.full_sentence?.toLowerCase().includes(q);
        const idMatch = item.id?.toLowerCase().includes(q);
        const partMatch = `part ${item.part}`.includes(q);
        if (!titleMatch && !textMatch && !idMatch && !partMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOption === 'newest') return b.id.localeCompare(a.id);
      if (sortOption === 'oldest') return a.id.localeCompare(b.id);
      if (sortOption === 'high_score') {
        const scoreA = historyMap[a.id]?.bestAccuracy || 0;
        const scoreB = historyMap[b.id]?.bestAccuracy || 0;
        return scoreB - scoreA;
      }
      if (sortOption === 'uncompleted') {
        const histA = historyMap[a.id] ? 1 : 0;
        const histB = historyMap[b.id] ? 1 : 0;
        return histA - histB;
      }
      return 0;
    });
  }, [allChallenges, categoryFilter, partFilter, difficultyFilter, lengthFilter, durationFilter, statusFilter, searchQuery, sortOption, historyMap]);

  // Paginated Catalog items
  const PAGE_SIZE = 12;
  const totalCatalogPages = Math.max(1, Math.ceil(filteredChallenges.length / PAGE_SIZE));
  const pagedChallenges = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredChallenges.slice(start, start + PAGE_SIZE);
  }, [filteredChallenges, currentPage]);

  const currentChallenge = allChallenges[activeChallengeIndex] || filteredChallenges[0];

  // Handler: Start practicing from Catalog
  const handleStartChallenge = (challengeId: string) => {
    // RBAC: Guest MUST be prompted to log in when clicking practice
    if (!user) {
      if (onOpenAuth) {
        onOpenAuth('login');
      } else {
        onNavigate('/');
      }
      return;
    }

    const idx = allChallenges.findIndex((c) => c.id === challengeId);
    if (idx !== -1) {
      setActiveChallengeIndex(idx);
    }
    setViewMode('runner');
    setUserInput('');
    setResult(null);
    setShowFirstLetterHint(false);
    setListenCount(0);
    setActiveSegmentIndex(null);
  };

  // Switch challenge in runner
  useEffect(() => {
    if (viewMode === 'runner') {
      setUserInput('');
      setResult(null);
      setShowFirstLetterHint(false);
      setListenCount(0);
      setActiveSegmentIndex(null);
      if (inputRef.current) inputRef.current.focus();

      if (autoPlayOnNext && currentChallenge?.audio_url) {
        const timer = setTimeout(() => {
          handlePlayAudio();
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [activeChallengeIndex, viewMode]);

  // Audio Controls
  const handlePlayAudio = () => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setListenCount((prev) => prev + 1);
      })
      .catch(() => {});
  };

  const handlePauseAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    if (isPlaying) handlePauseAudio();
    else handlePlayAudio();
  };

  const handleReplayFull = () => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.playbackRate = playbackRate;
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setListenCount((prev) => prev + 1);
      })
      .catch(() => {});
  };

  const handleReplayBack3s = () => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 3);
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {});
  };

  const handleChangeSpeed = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleReplaySegment = (segIndex: number) => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }
    if (!audioRef.current || !currentChallenge) return;
    const segs = currentChallenge.segments || currentChallenge.lines || [currentChallenge.full_sentence];
    const totalSegs = segs.length;
    const dur = audioRef.current.duration || 5.0;
    const segDuration = dur / totalSegs;
    const startTime = segIndex * segDuration;

    setActiveSegmentIndex(segIndex);
    audioRef.current.currentTime = startTime;
    audioRef.current.playbackRate = playbackRate;
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setListenCount((prev) => prev + 1);
      })
      .catch(() => {});
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setActiveSegmentIndex(null);
  };

  // Submit & Check Dictation
  const handleCheck = async () => {
    if (!userInput.trim() || !currentChallenge || isChecking) return;
    try {
      setIsChecking(true);
      const res: DictationCheckResponse = await api.checkDictation({
        challenge_id: currentChallenge.id,
        target_text: currentChallenge.full_sentence,
        user_text: userInput
      });

      setResult(res);
      saveHistory(currentChallenge.id, res.accuracy_pct || 0, res.is_correct || false);

      if (res.is_correct) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      }
    } catch (err) {
      console.error('Error checking dictation:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleGiveUp = async () => {
    if (!currentChallenge || isChecking) return;
    setIsChecking(true);
    try {
      const res: DictationCheckResponse = await api.checkDictation({
        challenge_id: currentChallenge.id,
        target_text: currentChallenge.full_sentence,
        user_text: userInput.trim() || '(Chưa điền đáp án)'
      });
      setResult(res);
      saveHistory(currentChallenge.id, 0, false);
    } catch (err) {
      console.error('Error revealing answer:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleNextChallenge = () => {
    if (activeChallengeIndex < allChallenges.length - 1) {
      setActiveChallengeIndex((prev) => prev + 1);
    }
  };

  const handlePrevChallenge = () => {
    if (activeChallengeIndex > 0) {
      setActiveChallengeIndex((prev) => prev - 1);
    }
  };

  // Insert Template for Multi-line Options / Dialogue
  const handleInsertTemplate = () => {
    if (!currentChallenge) return;
    let template = '';
    if (currentChallenge.part === 1) {
      template = "(A) \n(B) \n(C) \n(D) ";
    } else if (currentChallenge.part === 2) {
      template = "Câu hỏi:\n(A) \n(B) \n(C) ";
    } else if (currentChallenge.part === 3) {
      template = "M: \nW: \nM: \nW: ";
    } else {
      template = "Dòng 1:\nDòng 2:\nDòng 3: ";
    }
    setUserInput(template);
    if (inputRef.current) inputRef.current.focus();
  };

  // Save Vocab Word into Flashcards
  const handleSaveWord = async (wordItem: { word: string; meaning: string; ipa?: string; part_of_speech?: string }) => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }
    try {
      await api.addToFlashcards({
        word: wordItem.word,
        meaning: wordItem.meaning,
        ipa: wordItem.ipa,
        part_of_speech: wordItem.part_of_speech,
        example: currentChallenge?.full_sentence || ''
      });
      setSavedVocabWords((prev) => ({ ...prev, [wordItem.word.toLowerCase()]: true }));
      setToastMessage(`Đã lưu từ "${wordItem.word}" vào giỏ từ / Flashcards!`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setSavedVocabWords((prev) => ({ ...prev, [wordItem.word.toLowerCase()]: true }));
      setToastMessage(`Đã lưu từ "${wordItem.word}" vào giỏ từ / Flashcards!`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // First letter hint
  const getInitialLetterHint = (sentenceText: string) => {
    if (!sentenceText) return '';
    return sentenceText
      .split('\n')
      .map((line) => {
        return line
          .split(/\s+/)
          .map((word) => {
            const match = word.match(/^([a-zA-Z0-9()]+)(.*)$/);
            if (!match) return word;
            if (word.startsWith('(') && word.endsWith(')')) return word;
            const first = word[0];
            const rest = word.slice(1).replace(/[a-zA-Z0-9]/g, '_');
            return first + rest;
          })
          .join(' ');
      })
      .join('\n');
  };

  // Format time mm:ss
  const formatTime = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Keyboard Shortcuts in Runner
  useEffect(() => {
    if (viewMode !== 'runner') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || (e.ctrlKey && e.code === 'Space')) {
        e.preventDefault();
        handleReplayFull();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleReplayFull();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!result) {
          handleCheck();
        } else {
          handleNextChallenge();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (!result) {
          handleGiveUp();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowFirstLetterHint((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, result, userInput, currentChallenge]);

  // Guidance subtitle based on Part
  const getPartInstruction = () => {
    if (!currentChallenge) return 'Nghe và chép lại toàn bộ bài nghe:';
    if (currentChallenge.part === 1) {
      return 'Nghe và chép toàn bộ 4 phương án (A, B, C, D) - mỗi phương án trên 1 dòng:';
    }
    if (currentChallenge.part === 2) {
      return 'Nghe và chép câu hỏi và toàn bộ 3 câu trả lời (A, B, C) - cách dòng để phân biệt:';
    }
    if (currentChallenge.part === 3) {
      return 'Nghe và chép toàn bộ bài hội thoại (mỗi lượt người nói trên 1 dòng):';
    }
    return 'Nghe và chép toàn bộ bài nói ngắn (mỗi câu hoặc ý trên 1 dòng):';
  };

  // ==========================================
  // RENDER VIEW: RUNNER MODE (Phòng nghe chép)
  // ==========================================
  if (viewMode === 'runner') {
    if (!user) {
      return (
        <AuthRequiredGate
          featureName="Luyện nghe chép chính tả (Daily Dictation)"
          featureDesc="Khách trải nghiệm chỉ xem danh sách đề nghe chép. Vui lòng đăng nhập để nghe audio và nộp bài."
          onNavigate={() => setViewMode('catalog')}
          onOpenAuth={onOpenAuth}
          onOpenRBAC={onOpenRBAC}
        />
      );
    }

    return (
      <div className="min-h-screen bg-slate-50/80 py-6 px-4 sm:px-6 lg:px-8 font-sans">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-150">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Hidden Audio Element */}
        {currentChallenge?.audio_url && (
          <audio
            ref={audioRef}
            src={currentChallenge.audio_url}
            preload="auto"
            onTimeUpdate={() => {
              if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
            }}
            onLoadedMetadata={() => {
              if (audioRef.current) setDuration(audioRef.current.duration);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleAudioEnded}
          />
        )}

        <div className="max-w-4xl mx-auto space-y-5">
          {/* Top Return Bar & Challenge Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('catalog')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại danh sách đề</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                  Part {currentChallenge?.part || 1}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs">
                  {currentChallenge?.difficulty || 'Medium'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>Đề: <strong>{currentChallenge?.title || `Bài nghe #${activeChallengeIndex + 1}`}</strong></span>
              <span>•</span>
              <span>Câu <strong>{activeChallengeIndex + 1}</strong> / {allChallenges.length}</span>
            </div>
          </div>

          {/* Audio Player Control Deck */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              {/* Play / Pause / Replay Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md transition-all cursor-pointer ${
                    isPlaying
                      ? 'bg-amber-500 hover:bg-amber-600 ring-4 ring-amber-500/20'
                      : 'bg-blue-600 hover:bg-blue-700 ring-4 ring-blue-600/20'
                  }`}
                  title={isPlaying ? 'Tạm dừng (Space / Tab)' : 'Phát audio (Space / Tab)'}
                >
                  <MorphPlayPause isPlaying={isPlaying} size={22} className="fill-current text-white" />
                </button>

                <button
                  type="button"
                  onClick={handleReplayFull}
                  className="px-4 py-2.5 min-h-[44px] bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Nghe lại từ đầu (Tab hoặc Ctrl+R)"
                >
                  <RotateCcw className="w-4 h-4 text-blue-600" />
                  <span>Nghe lại</span>
                  <kbd className="hidden md:inline-block text-[10px] bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded border border-slate-300 font-mono">
                    Tab
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={handleReplayBack3s}
                  className="px-3.5 py-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                  title="Lùi lại 3 giây"
                >
                  -3s
                </button>
              </div>

              {/* Speed Pills & Listen Counter */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {[0.75, 1.0, 1.25].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => handleChangeSpeed(speed)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        playbackRate === speed
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-blue-600" />
                  <span>Đã nghe: <strong>{listenCount}</strong> lần</span>
                </div>
              </div>
            </div>

            {/* Audio Timeline Scrubber */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                  if (audioRef.current) audioRef.current.currentTime = val;
                }}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Segment by Segment Replay */}
            {currentChallenge && (currentChallenge.segments || currentChallenge.lines) && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nghe lại từng đoạn / phương án:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {(currentChallenge.segments || currentChallenge.lines || []).map((seg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleReplaySegment(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeSegmentIndex === idx
                          ? 'bg-blue-600 text-white shadow-xs font-bold'
                          : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Đoạn {idx + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Typing Input Workspace */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>{getPartInstruction()}</span>
              </label>

              <button
                type="button"
                onClick={handleInsertTemplate}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                + Chèn mẫu (A, B, C, D)
              </button>
            </div>

            <textarea
              ref={inputRef}
              rows={4}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Gõ toàn bộ câu hỏi và các phương án bạn nghe được vào đây (xuống dòng cho mỗi câu/lựa chọn)..."
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all leading-relaxed"
            />

            {/* Hint Box (if enabled) */}
            {showFirstLetterHint && currentChallenge && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-mono whitespace-pre-wrap leading-relaxed">
                <span className="font-bold block mb-1">💡 Gợi ý chữ cái đầu:</span>
                {getInitialLetterHint(currentChallenge.full_sentence)}
              </div>
            )}

            {/* Action Buttons Deck */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFirstLetterHint((prev) => !prev)}
                  className="px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{showFirstLetterHint ? 'Ẩn gợi ý' : 'Gợi ý chữ cái đầu'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGiveUp}
                  className="px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Xem đáp án chuẩn
                </button>
              </div>

              <button
                type="button"
                onClick={handleCheck}
                disabled={isChecking || !userInput.trim()}
                className="px-6 py-3 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isChecking ? (
                  <span>Đang chấm...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Nộp bài & So sánh (Ctrl+Enter)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Comparison & Diff Highlight Deck */}
          {result && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-md space-y-6 animate-in fade-in duration-200">
              {/* Accuracy Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-xs ${
                    result.accuracy_pct >= 90 ? 'bg-emerald-600' : result.accuracy_pct >= 60 ? 'bg-amber-500' : 'bg-rose-600'
                  }`}>
                    {Math.round(result.accuracy_pct)}%
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {result.accuracy_pct >= 90 ? 'Xuất sắc! Tai nghe cực nhạy' : result.accuracy_pct >= 60 ? 'Khá tốt! Đã nắm bắt được ý chính' : 'Cần cố gắng hơn'}
                    </h3>
                    <p className="text-xs text-slate-500">{result.feedback}</p>
                  </div>
                </div>

                {/* Diff Legend Pills */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Đúng: {result.stats?.correct_words || 0}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                    Sai: {result.stats?.wrong_words || 0}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                    Thiếu: {result.stats?.missing_words || 0}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                    Thừa: {result.stats?.extra_words || 0}
                  </span>
                </div>
              </div>

              {/* Detailed Diff Highlighting */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Chi tiết so khớp từng từ (Diff Highlights):
                </h4>

                {result.line_diffs && result.line_diffs.length > 0 ? (
                  <div className="space-y-3">
                    {result.line_diffs.map((ld, lIdx) => (
                      <div key={lIdx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200/80 pb-1.5">
                          <span>{ld.label}</span>
                          <span className={ld.accuracy_pct >= 85 ? 'text-emerald-700' : 'text-slate-500'}>
                            {ld.accuracy_pct}%
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium leading-relaxed">
                          {ld.diff.map((token, tIdx) => {
                            if (token.status === 'correct') {
                              return (
                                <span key={tIdx} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                                  {token.word}
                                </span>
                              );
                            }
                            if (token.status === 'wrong') {
                              return (
                                <span key={tIdx} className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 line-through border border-rose-300" title={`Đáp án chuẩn: ${token.target}`}>
                                  {token.word} ({token.target})
                                </span>
                              );
                            }
                            if (token.status === 'missing') {
                              return (
                                <span key={tIdx} className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                  [Thiếu: {token.word}]
                                </span>
                              );
                            }
                            return (
                              <span key={tIdx} className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300">
                                [Thừa: {token.word}]
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-1.5 text-xs">
                    {result.diff?.map((token, idx) => {
                      if (token.status === 'correct') {
                        return <span key={idx} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">{token.word}</span>;
                      }
                      if (token.status === 'wrong') {
                        return <span key={idx} className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 line-through">{token.word} ({token.target})</span>;
                      }
                      if (token.status === 'missing') {
                        return <span key={idx} className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">[Thiếu: {token.word}]</span>;
                      }
                      return <span key={idx} className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">[Thừa: {token.word}]</span>;
                    })}
                  </div>
                )}
              </div>

              {/* Standard Transcript & Vietnamese Translation */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                  Transcript chuẩn thi thật ETS:
                </span>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 whitespace-pre-wrap leading-relaxed">
                  {currentChallenge?.full_sentence}
                </p>
                {currentChallenge?.vietnamese_translation && (
                  <p className="text-xs text-slate-600 pt-1 border-t border-blue-200/50 italic whitespace-pre-wrap">
                    Dịch nghĩa: {currentChallenge.vietnamese_translation}
                  </p>
                )}
              </div>

              {/* Key Vocabulary with Save Button */}
              {currentChallenge?.key_vocab && currentChallenge.key_vocab.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Từ vựng trọng tâm trong bài:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentChallenge.key_vocab.map((v, idx) => {
                      const isSaved = savedVocabWords[v.word.toLowerCase()];
                      return (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900">{v.word}</span>
                            {v.ipa && <span className="text-[11px] text-slate-400 font-mono ml-1.5">{v.ipa}</span>}
                            <p className="text-[11px] text-slate-600 truncate">{v.meaning}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveWord(v)}
                            className={`p-1.5 rounded-lg border text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                              isSaved
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                            }`}
                            title={isSaved ? 'Đã lưu' : 'Lưu từ vào giỏ từ'}
                          >
                            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation for Next Challenge */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  disabled={activeChallengeIndex <= 0}
                  onClick={handlePrevChallenge}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                >
                  ← Câu trước
                </button>

                <button
                  type="button"
                  onClick={handleNextChallenge}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Câu tiếp theo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER VIEW: CATALOG MODE (Danh sách đề)
  // Accessible to Khách (view only) & Logged in users
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Guest Banner if not logged in */}
        {!user && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-black text-amber-950 uppercase tracking-wide">
                  Chế độ Khách: Xem danh sách đề nghe chép
                </div>
                <p className="text-xs text-amber-900/80">
                  Bạn có thể tự do xem danh sách, lọc và tìm kiếm đề. Vui lòng đăng nhập để bấm <strong>Luyện tập</strong> và làm bài.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenAuth?.('login')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              Đăng nhập ngay
            </button>
          </div>
        )}



        {/* Filter Controls Suite */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          
          {/* 1. Skill Category Tabs - Exclusively TOEIC Listening */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-slate-100">
            {[
              { id: 'all', label: '🎧 Tất cả bài nghe (Part 1-4)' },
              { id: 'p1', label: '🖼️ Part 1 (Mô tả tranh)' },
              { id: 'p2', label: '❓ Part 2 (Hỏi & Đáp)' },
              { id: 'p3', label: '💬 Part 3 (Hội thoại)' },
              { id: 'p4', label: '📢 Part 4 (Bài nói ngắn)' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (cat.id === 'p1') setPartFilter(1);
                  else if (cat.id === 'p2') setPartFilter(2);
                  else if (cat.id === 'p3') setPartFilter(3);
                  else if (cat.id === 'p4') setPartFilter(4);
                  else setPartFilter('all');
                  setCategoryFilter(cat.id as any);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                  categoryFilter === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* 2. Parts Quick Filter Chips - Listening Parts Only */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Part:</span>
            {[
              { id: 'all', label: 'Tất cả Part 1-4' },
              { id: 1, label: 'Part 1 (Tranh)' },
              { id: 2, label: 'Part 2 (Hỏi & Đáp)' },
              { id: 3, label: 'Part 3 (Hội thoại)' },
              { id: 4, label: 'Part 4 (Bài nói ngắn)' },
            ].map((p) => (
              <button
                key={String(p.id)}
                type="button"
                onClick={() => {
                  setPartFilter(p.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  partFilter === p.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 3. Difficulty, Length, Duration, Status Dropdowns / Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {/* Độ khó */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Độ khó:
              </label>
              <select
                value={difficultyFilter}
                onChange={(e) => {
                  setDifficultyFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả độ khó</option>
                <option value="easy">Dễ (Easy)</option>
                <option value="medium">Trung bình (Medium)</option>
                <option value="hard">Khó (Hard)</option>
              </select>
            </div>

            {/* Số câu */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Số câu / Độ dài:
              </label>
              <select
                value={lengthFilter}
                onChange={(e) => {
                  setLengthFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả độ dài</option>
                <option value="short">Ngắn (1-2 câu)</option>
                <option value="medium">Vừa (3-5 câu)</option>
                <option value="long">Dài (&gt; 5 câu)</option>
              </select>
            </div>

            {/* Thời lượng */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Thời lượng:
              </label>
              <select
                value={durationFilter}
                onChange={(e) => {
                  setDurationFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả thời lượng</option>
                <option value="quick">&lt; 3 phút</option>
                <option value="standard">3 - 8 phút</option>
                <option value="extended">&gt; 8 phút</option>
              </select>
            </div>

            {/* Trạng thái làm */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Trạng thái:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả</option>
                <option value="uncompleted">Chưa làm</option>
                <option value="completed">Đã làm</option>
              </select>
            </div>
          </div>

          {/* 4. Search & Sort Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm theo tên đề, mã đề (DICT-01), part, chủ đề (văn phòng, hội thoại...)..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="high_score">Điểm cao nhất</option>
                <option value="uncompleted">Chưa làm trước</option>
              </select>

              {(searchQuery || difficultyFilter !== 'all' || partFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDifficultyFilter('all');
                    setPartFilter('all');
                    setLengthFilter('all');
                    setDurationFilter('all');
                    setStatusFilter('all');
                    setCategoryFilter('all');
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Đặt lại lọc
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Catalog Grid Cards */}
        {isLoading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/90 shadow-xs space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Đang tải kho bài nghe chép chính tả...</p>
          </div>
        ) : filteredChallenges.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/90 shadow-xs space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy bài nghe chép phù hợp</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hãy thử chọn bộ lọc khác hoặc từ khóa tìm kiếm rộng hơn.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedChallenges.map((item, idx) => {
              const hist = historyMap[item.id];
              const lineCount = item.lines?.length || 1;
              const durMinutes = Math.max(2, Math.round(lineCount * 1.5));

              return (
                <div
                  key={item.id}
                  onClick={() => handleStartChallenge(item.id)}
                  className="bg-white border border-slate-200/90 hover:border-blue-400 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                          Part {item.part}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                          item.difficulty === 'Easy'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.difficulty === 'Hard'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.difficulty}
                        </span>
                      </div>

                      {hist ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{Math.round(hist.bestAccuracy)}%</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Chưa làm</span>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {item.title || `Bài luyện nghe Part ${item.part} #${idx + 1}`}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Mã: {item.id.slice(0, 16)}...
                      </p>
                    </div>

                    {/* Metadata summary */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {lineCount} câu/dòng
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        ~{durMinutes} phút
                      </span>
                    </div>
                  </div>

                  {/* Card Action Button */}
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {item.segments ? `${item.segments.length} đoạn audio` : 'Audio chuẩn ETS'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleStartChallenge(item.id); }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        !user
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs group-hover:translate-x-0.5'
                      }`}
                    >
                      {!user ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Luyện tập 🔒</span>
                        </>
                      ) : (
                        <>
                          <span>Luyện tập</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Catalog Pagination */}
        {totalCatalogPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              ← Trang trước
            </button>
            <span className="text-xs font-bold text-slate-700 px-3">
              Trang {currentPage} / {totalCatalogPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalCatalogPages}
              onClick={() => setCurrentPage((p) => Math.min(totalCatalogPages, p + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Trang sau →
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
