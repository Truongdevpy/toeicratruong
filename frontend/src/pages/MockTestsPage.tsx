import { AuthRequiredGate } from '../components/AuthRequiredGate';
import DOMPurify from 'dompurify';
import { MorphPlayPause } from '../components/MorphIcon';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  GraduationCap,
  Send,
  Crown,
  Trophy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Flag,
  RotateCcw,
  Sparkles,
  BarChart2,
  Play,
  Pause,
  Check,
  X,
  ArrowRight,
  Search,
  Filter,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  BookOpen,
  Headphones,
  Image as ImageIcon,
  Mic,
  MicOff,
  FileText,
  Target,
  Layers,
  RotateCw,
  LayoutGrid,
  CheckSquare,
  Eye,
  Trash2,
  Calendar,
  CheckCheck,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { api } from '../services/api';
import { historyStore, TestHistoryRecord, QuestionHistoryRecord } from '../services/historyStore';
import { useAuth } from '../context/AuthContext';
import { AudioPlayer } from '../components/AudioPlayer';
import { QuestionImage } from '../components/QuestionImage';
import { FocusedPracticeRoom } from '../components/FocusedPracticeRoom';

const safeFormatDateTime = (dateStr?: any): string => {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleString('vi-VN');
  } catch {
    return '--';
  }
};

interface MockTestsPageProps {
  onNavigate: (path: string) => void;
  onExamActiveChange?: (active: boolean) => void;
  initialTab?: 'catalog' | 'test_history' | 'question_history';
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onOpenRBAC?: () => void;
}

interface TestItem {
  id: string;
  test_id: string;
  title: string;
  site: string;
  test_type: string;
  collection_id?: string;
  topic?: string;
  year: number;
  total_questions: number;
  duration_minutes: number;
  difficulty: string;
  sections: string[];
  parts?: number[];
  attempts: number;
  has_audio?: boolean;
  has_image?: boolean;
  is_vip?: boolean;
}

interface UserTestHistoryItem {
  testId: string;
  testTitle: string;
  score: number;
  listeningScore?: number;
  readingScore?: number;
  completedAt: string;
  timeSpentSeconds: number;
}

interface InProgressExamRecord {
  testId: string;
  testTitle: string;
  startedAt: string;
  answeredCount: number;
  totalQuestions: number;
  answers: Record<string, string>;
  timeLeft: number;
  mode?: string;
  targetPart?: number;
}

type SkillCategory = 'all' | 'full_test' | 'listening' | 'reading' | 'part' | 'sw';
type DifficultyFilter = 'all' | 'Easy' | 'Medium' | 'Hard';
type QuestionCountFilter = 'all' | 'under_50' | '50_to_100' | '200';
type DurationFilter = 'all' | 'under_45' | '45_to_75' | '120';
type StatusFilter = 'all' | 'completed' | 'in_progress' | 'unattempted';
type ScoreRangeFilter = 'all' | 'under_500' | '500_695' | '700_850' | '855_990';
type SortOption = 'name_asc' | 'name_desc' | 'newest' | 'oldest' | 'popular' | 'highest_score' | 'unattempted' | 'in_progress';

const HISTORY_STORAGE_KEY = 'toeic_test_attempt_history';
const IN_PROGRESS_STORAGE_KEY = 'toeic_test_in_progress_state';
const ACTIVE_EXAM_STORAGE_KEY = 'toeic_active_exam_session_v2';

interface ActiveExamSession {
  testId: string;
  testTitle: string;
  mode: 'full' | 'listening' | 'reading' | 'part' | 'parts';
  targetPart?: number;
  questions: any[];
  overallAudio: string | null;
  currentIndex: number;
  answers: Record<string, string>;
  flagged: Record<number, boolean>;
  timeLeft: number;
  lastSavedAt: number;
  viewMode: 'single' | 'continuous';
}



const TOEIC_PARTS_INFO: Record<number, { title: string; desc: string; defaultQs: number; recommendedMins: number; section: 'listening' | 'reading' }> = {
  1: { title: 'Part 1', desc: 'Mô tả hình ảnh', defaultQs: 6, recommendedMins: 5, section: 'listening' },
  2: { title: 'Part 2', desc: 'Hỏi & Đáp', defaultQs: 25, recommendedMins: 10, section: 'listening' },
  3: { title: 'Part 3', desc: 'Đoạn hội thoại', defaultQs: 39, recommendedMins: 15, section: 'listening' },
  4: { title: 'Part 4', desc: 'Bài nói ngắn', defaultQs: 30, recommendedMins: 15, section: 'listening' },
  5: { title: 'Part 5', desc: 'Hoàn thành câu', defaultQs: 30, recommendedMins: 12, section: 'reading' },
  6: { title: 'Part 6', desc: 'Điền đoạn văn', defaultQs: 16, recommendedMins: 10, section: 'reading' },
  7: { title: 'Part 7', desc: 'Đọc hiểu văn bản', defaultQs: 54, recommendedMins: 35, section: 'reading' },
};

const cleanDisplayQuestionText = (text?: string, part?: number, qNum?: number | string): string => {
  if (!text) return '';
  let clean = text.trim();
  if (part === 1) {
    return '';
  }
  if (part === 2) {
    if (!clean || clean.startsWith('Câu') || /^[A-D.\s]+$/.test(clean)) {
      return '';
    }
  }
  if (part === 6) {
    if (/^[A-D][\.\)]/i.test(clean) || !clean || /^[A-D.\s]+$/.test(clean) || clean.toLowerCase().startsWith('câu hỏi')) {
      return `Chọn từ hoặc câu thích hợp nhất để điền vào vị trí [${qNum || ''}].`;
    }
  }
  // Strip trailing embedded options like " A. of B. from C. in D. for"
  clean = clean.replace(/\s+[A-D][\.\)]\s+.*$/i, '').trim();
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

const isFullTapeUrl = (url?: string | null, overall?: string | null): boolean => {
  if (!url) return false;
  if (overall && (url === overall || url.split('/').pop()?.toLowerCase() === overall.split('/').pop()?.toLowerCase())) return true;
  const name = url.split('/').pop()?.toLowerCase() || '';
  if (/^t\d+_audio/i.test(name) || /^test\d+\.mp3$/i.test(name) || name.includes('economy_toeic') || name.includes('sample_toeic') || name.includes('new_real_toeic')) {
    if (!name.includes('part_') && !name.includes('q0') && !name.includes('passage_')) {
      return true;
    }
  }
  return false;
};

const cleanBranding = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\[\s*Đậu\s*TOEIC\s*\]/gi, '')
    .replace(/\[\s*Study4\s*\]/gi, '')
    .replace(/Đậu\s*TOEIC/gi, 'TOEIC ETS')
    .replace(/Study4/gi, 'Crack TOEIC')
    .replace(/dautoeic[_\s]*/gi, '')
    .replace(/study4[_\s]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};


export interface PracticeSessionRecord {
  id: string;
  testId?: string;
  testTitle?: string;
  parts: number[];
  completedAt: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  timeSpentSeconds?: number;
  wrongQuestions?: any[];
  questions?: any[];
  userAnswers?: Record<string, string>;
}

const PRACTICE_SESSIONS_STORAGE_KEY = 'toeic_practice_sessions_history_v2';

const DEFAULT_PRACTICE_SESSIONS: PracticeSessionRecord[] = [
  {
    id: 'psess-1',
    testId: 'study4_6852',
    testTitle: 'ETS TOEIC Practice Test #01',
    parts: [3],
    completedAt: '2026-10-01T23:33:00',
    totalQuestions: 3,
    correctCount: 1,
    wrongCount: 2,
    timeSpentSeconds: 120,
    userAnswers: { 'q1': 'A', 'q2': 'B', 'q3': 'C' },
  },
  {
    id: 'psess-2',
    testId: 'study4_6852',
    testTitle: 'ETS TOEIC Practice Test #01',
    parts: [2],
    completedAt: '2026-10-01T23:32:00',
    totalQuestions: 25,
    correctCount: 16,
    wrongCount: 9,
    timeSpentSeconds: 480,
  },
  {
    id: 'psess-3',
    testId: 'study4_6852',
    testTitle: 'ETS TOEIC Practice Test #01',
    parts: [1, 2, 3, 4, 5, 6, 7],
    completedAt: '2026-10-01T23:17:00',
    totalQuestions: 9,
    correctCount: 8,
    wrongCount: 1,
    timeSpentSeconds: 240,
  },
  {
    id: 'psess-4',
    testId: 'study4_6852',
    testTitle: 'ETS TOEIC Practice Test #01',
    parts: [1, 2, 3, 4, 5, 6, 7],
    completedAt: '2026-10-01T23:15:00',
    totalQuestions: 1,
    correctCount: 0,
    wrongCount: 1,
    timeSpentSeconds: 30,
  },
  {
    id: 'psess-5',
    testId: 'study4_6852',
    testTitle: 'ETS TOEIC Practice Test #01',
    parts: [1, 2, 3, 4, 5, 6, 7],
    completedAt: '2026-10-01T23:14:00',
    totalQuestions: 7,
    correctCount: 5,
    wrongCount: 2,
    timeSpentSeconds: 180,
  },
];

const formatSessionDateTime = (dateStr?: any): string => {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return '--';
  }
};

const MockTestsPageInner: React.FC<MockTestsPageProps> = ({
  onNavigate,
  onExamActiveChange,
  initialTab,
  onOpenAuth,
  onOpenRBAC,
}) => {
  const { user } = useAuth();


  const [catalogTab, setCatalogTab] = useState<'catalog' | 'progress' | 'test_history' | 'question_history'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'progress') return 'progress';
    }
    return initialTab === 'test_history' || initialTab === 'question_history' ? initialTab : 'catalog';
  });
  const [progressSubtab, setProgressSubtab] = useState<'practice' | 'exam'>('practice');
  const [progressPartFilter, setProgressPartFilter] = useState<'all' | number>('all');
  const [reviewPracticeSession, setReviewPracticeSession] = useState<PracticeSessionRecord | null>(null);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSessionRecord[]>(() => {
    try {
      const raw = localStorage.getItem(PRACTICE_SESSIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PRACTICE_SESSIONS;
  });
  const [testHistoryList, setTestHistoryList] = useState<TestHistoryRecord[]>(() => historyStore.getTestAttempts());
  const [questionHistoryList, setQuestionHistoryList] = useState<QuestionHistoryRecord[]>(() => historyStore.getQuestionAttempts());
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyModeFilter, setHistoryModeFilter] = useState<'all' | 'full' | 'listening' | 'reading' | 'part'>('all');
  const [historySortBy, setHistorySortBy] = useState<'latest' | 'score_high' | 'score_low'>('latest');
  const [qHistoryStatusFilter, setQHistoryStatusFilter] = useState<'all' | 'correct' | 'wrong'>('all');
  const [qHistoryPartFilter, setQHistoryPartFilter] = useState<'all' | number>('all');
  const [qHistorySearch, setQHistorySearch] = useState('');
  const [qHistoryLimit, setQHistoryLimit] = useState(30);

  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // User History & In-Progress State
  const [userHistory, setUserHistory] = useState<UserTestHistoryItem[]>([]);
  const [inProgressMap, setInProgressMap] = useState<Record<string, InProgressExamRecord>>({});

  // Filter & Search states
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory>('all');
  const [selectedPart, setSelectedPart] = useState<number | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>('all');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<QuestionCountFilter>('all');
  const [selectedDuration, setSelectedDuration] = useState<DurationFilter>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [selectedRecentScore, setSelectedRecentScore] = useState<ScoreRangeFilter>('all');
  const [selectedHighestScore, setSelectedHighestScore] = useState<ScoreRangeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Section / Part selection modal for starting exam (Screenshot 1 & 2)
  const [selectedTestForModal, setSelectedTestForModal] = useState<TestItem | null>(null);
  const [modalModeTab, setModalModeTab] = useState<'exam' | 'practice'>('exam');
  const [examSelectedParts, setExamSelectedParts] = useState<number[]>([1]);
  const [isCustomExamTime, setIsCustomExamTime] = useState<boolean>(false);
  const [customExamMinutes, setCustomExamMinutes] = useState<number>(5);
  const [practiceSelectedParts, setPracticeSelectedParts] = useState<number[]>([1]);
  const [partModalTest, setPartModalTest] = useState<TestItem | null>(null);

  // Practice session state (FocusedPracticeRoom runner)
  const [practiceSession, setPracticeSession] = useState<{
    title: string;
    partNumber: number;
    questions: any[];
  } | null>(null);

  // Exam Audio State without seekbar ("khi thi thì k có tua lại audio và tự chuyển câu")
  const examAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isExamAudioPlaying, setIsExamAudioPlaying] = useState(false);
  const [examAudioVolume, setExamAudioVolume] = useState<number>(() => {
    const saved = localStorage.getItem('toeic_exam_audio_volume');
    return saved !== null ? parseFloat(saved) : 1.0;
  });
  const [isExamAudioMuted, setIsExamAudioMuted] = useState(false);
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const [autoAdvanceSecondsLeft, setAutoAdvanceSecondsLeft] = useState<number | null>(null);

  // Exam room state
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState('');
  const [examMode, setExamMode] = useState<'full' | 'listening' | 'reading' | 'part' | 'parts'>('full');
  const [targetPart, setTargetPart] = useState<number | undefined>(undefined);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(7200);
  const [isPaused, setIsPaused] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [navPartFilter, setNavPartFilter] = useState<'all' | number>('all');

  // Audio Bar state
  const [overallAudio, setOverallAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  // Result state
  const [testResult, setTestResult] = useState<any | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect'>('all');
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('single');

  // Notify parent layout (App.tsx) of active exam session to hide marketing header
  useEffect(() => {
    onExamActiveChange?.(Boolean(activeTestId || testResult || practiceSession));
  }, [activeTestId, testResult, practiceSession, onExamActiveChange]);

  useEffect(() => {
    

  return () => {
      onExamActiveChange?.(false);
    };
  }, [onExamActiveChange]);

  // Speaking Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  // Initialize history & in-progress
  useEffect(() => {
    try {
      const rawHist = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (rawHist) {
        setUserHistory(JSON.parse(rawHist));
      } else {
        const initialSeeds: UserTestHistoryItem[] = [
          {
            testId: 'study4_6852',
            testTitle: 'ETS TOEIC Practice Test #01',
            score: 785,
            listeningScore: 410,
            readingScore: 375,
            completedAt: '2026-09-24T14:30:00Z',
            timeSpentSeconds: 5400,
          },
          {
            testId: 'dautoeic_0ab9cd18-cf4b-4b5e-909f-ec524c2a9af8',
            testTitle: 'ETS TOEIC Practice Test (0ab9cd18)',
            score: 620,
            listeningScore: 320,
            readingScore: 300,
            completedAt: '2026-09-21T09:15:00Z',
            timeSpentSeconds: 6100,
          },
        ];
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(initialSeeds));
        setUserHistory(initialSeeds);
      }

      const rawInProg = localStorage.getItem(IN_PROGRESS_STORAGE_KEY);
      if (rawInProg) {
        setInProgressMap(JSON.parse(rawInProg));
      } else {
        const seedInProg: Record<string, InProgressExamRecord> = {
          'dautoeic_220ee419-fb7d-4005-9142-af7070cdac57': {
            testId: 'dautoeic_220ee419-fb7d-4005-9142-af7070cdac57',
            testTitle: 'Crack TOEIC Vol 2 - Test 04',
            startedAt: '2026-09-26T16:00:00Z',
            answeredCount: 28,
            totalQuestions: 200,
            answers: {},
            timeLeft: 5400,
          },
        };
        localStorage.setItem(IN_PROGRESS_STORAGE_KEY, JSON.stringify(seedInProg));
        setInProgressMap(seedInProg);
      }

      // Check Active Exam Session to prevent losing exam on reload ("reload mất bài")
      const activeRaw = localStorage.getItem(ACTIVE_EXAM_STORAGE_KEY);
      if (activeRaw) {
        const session: ActiveExamSession = JSON.parse(activeRaw);
        if (session && session.testId && session.questions && session.questions.length > 0) {
          const elapsedSec = Math.floor((Date.now() - (session.lastSavedAt || Date.now())) / 1000);
          const adjustedTime = Math.max(0, session.timeLeft - elapsedSec);

          if (adjustedTime > 0) {
            setActiveTestId(session.testId);
            setTestTitle(session.testTitle);
            setExamMode(session.mode || 'full');
            setTargetPart(session.targetPart);
            setQuestions(session.questions);
            setOverallAudio(session.overallAudio);
            setCurrentIndex(session.currentIndex || 0);
            setAnswers(session.answers || {});
            setFlagged(session.flagged || {});
            setTimeLeft(adjustedTime);
            setViewMode(session.viewMode || 'single');
          } else {
            localStorage.removeItem(ACTIVE_EXAM_STORAGE_KEY);
          }
        }
      }
    } catch {}
  }, []);

  const saveHistoryRecord = (rec: UserTestHistoryItem) => {
    try {
      const updated = [rec, ...userHistory.filter((h) => h.testId !== rec.testId || h.completedAt !== rec.completedAt)];
      setUserHistory(updated);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const updateInProgressRecord = (rec: InProgressExamRecord) => {
    try {
      const updated = { ...inProgressMap, [rec.testId]: rec };
      setInProgressMap(updated);
      localStorage.setItem(IN_PROGRESS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const removeInProgressRecord = (testId: string) => {
    try {
      const updated = { ...inProgressMap };
      delete updated[testId];
      setInProgressMap(updated);
      localStorage.setItem(IN_PROGRESS_STORAGE_KEY, JSON.stringify(updated));
      localStorage.removeItem(ACTIVE_EXAM_STORAGE_KEY);
    } catch {}
  };

  // Helper stats for each test
  const getTestStats = (testId: string) => {
    const attempts = userHistory.filter((h) => h.testId === testId);
    const inProg = inProgressMap[testId] || null;
    const isCompleted = attempts.length > 0;
    const isInProgress = Boolean(inProg && inProg.answeredCount > 0);
    const isUnattempted = !isCompleted && !isInProgress;

    const recentScore = attempts.length > 0 ? attempts[0].score : null;
    const highestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : null;

    return {
      attempts,
      inProg,
      isCompleted,
      isInProgress,
      isUnattempted,
      recentScore,
      highestScore,
    };
  };

  const matchesScore = (score: number | null, range: ScoreRangeFilter) => {
    if (range === 'all') return true;
    if (score === null) return false;
    if (range === 'under_500') return score < 500;
    if (range === '500_695') return score >= 500 && score < 700;
    if (range === '700_850') return score >= 700 && score <= 850;
    if (range === '855_990') return score > 850;
    return true;
  };

  const handleReviewPastAttempt = async (attempt: TestHistoryRecord) => {
    setLoading(true);
    try {
      let reviewAnswers = attempt.reviewAnswers || [];
      if (!reviewAnswers || reviewAnswers.length === 0) {
        try {
          const detail = await api.getTestAttemptDetail(attempt.id);
          if (detail && detail.review_answers && detail.review_answers.length > 0) {
            reviewAnswers = detail.review_answers;
          }
        } catch {}
      }

      setTestTitle(attempt.testTitle);
      setActiveTestId(attempt.testId);
      setExamMode((attempt.mode as any) || 'full');
      setTargetPart(attempt.targetPart || 1);
      setTestResult({
        total_score: attempt.totalScore,
        listening_score: attempt.listeningScore,
        reading_score: attempt.readingScore,
        listening_correct: attempt.listeningCorrect,
        reading_correct: attempt.readingCorrect,
        total_correct: attempt.totalCorrect,
        time_spent_minutes: Math.max(1, Math.round((attempt.timeSpentSeconds || 3600) / 60)),
        ai_recommendation:
          attempt.accuracy >= 80
            ? 'Kết quả bài thi này rất xuất sắc! Độ chính xác cao ở cả hai phần Listening và Reading. Hãy tiếp tục duy trì phong độ và luyện thêm các đề ETS mới nhất.'
            : 'Bạn đã hoàn thành tốt bài thi thử. Hãy xem lại kỹ các câu trả lời sai, phân tích transcript và ghi chú lại từ mới để khắc phục bẫy thường gặp trong kỳ thi thật.',
        review_answers: reviewAnswers,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttempt = async (id: number | string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài làm này khỏi lịch sử?')) return;
    historyStore.deleteTestAttempt(id);
    try {
      await api.deleteTestAttempt(id);
    } catch {}
    setTestHistoryList(historyStore.getTestAttempts());
  };

  const handleJumpToQuestion = (idx: number) => {
    setCurrentIndex(idx);
    setIsMobileNavOpen(false);
    if (viewMode === 'continuous') {
      const el = document.getElementById(`exam-q-${idx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        const currentQKey = currentQ?.id || `sim-${activeTestId}-q${currentQ?.question_number}`;
        handleSelectAnswer(currentQKey, `[Đã thu âm: ${recordingSeconds}s] ${answers[currentQKey] || ''}`.trim());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch {
      alert('Không thể mở micro. Vui lòng cấp quyền micro để luyện Nói.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleWritingInput = (text: string) => {
    const currentQKey = currentQ?.id || `sim-${activeTestId}-q${currentQ?.question_number}`;
    handleSelectAnswer(currentQKey, text);
  };

  useEffect(() => {
    let t: any;
    if (isRecording) {
      t = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(t);
  }, [isRecording]);

  // Sync with initialTab prop
  useEffect(() => {
    if (initialTab) {
      setCatalogTab(initialTab);
    }
  }, [initialTab]);

  // Sync test & question history with backend
  useEffect(() => {
    historyStore.syncWithBackend().then(() => {
      setTestHistoryList(historyStore.getTestAttempts());
      setQuestionHistoryList(historyStore.getQuestionAttempts());
    });
  }, []);

  useEffect(() => {
    loadTestsCatalog();
  }, []);

  // Save active exam state continuously to localStorage
  useEffect(() => {
    if (!activeTestId || questions.length === 0 || testResult) return;

    try {
      const session: ActiveExamSession = {
        testId: activeTestId,
        testTitle,
        mode: examMode,
        targetPart,
        questions,
        overallAudio,
        currentIndex,
        answers,
        flagged,
        timeLeft,
        lastSavedAt: Date.now(),
        viewMode,
      };
      localStorage.setItem(ACTIVE_EXAM_STORAGE_KEY, JSON.stringify(session));
    } catch {}
  }, [activeTestId, testTitle, examMode, targetPart, questions, overallAudio, currentIndex, answers, flagged, timeLeft, viewMode, testResult]);

  // Warn user before reload or tab close if taking exam
  useEffect(() => {
    if (!activeTestId || testResult) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeTestId, testResult]);

  useEffect(() => {
    if (!activeTestId || testResult || isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTestId, testResult, isPaused]);

  // Audio progress tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setAudioProgress(audio.currentTime);
      setAudioDuration(audio.duration || 0);
    };
    const handleEnded = () => setIsPlayingAudio(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [overallAudio]);

  const loadTestsCatalog = async () => {
    try {
      setLoading(true);
      const res = await api.getTests({ limit: 200, page: 1, sort: 'name_asc' });
      setTests(res?.tests || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (
    testId: string,
    mode: 'full' | 'listening' | 'reading' | 'part' | 'parts' = 'full',
    targetPartOrParts?: number | number[],
    customDurationSeconds?: number
  ) => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }

    const targetTestObj = tests.find((t) => t.id === testId);
    if (targetTestObj?.is_vip && user.role !== 'vip' && user.role !== 'admin') {
      onOpenRBAC?.();
      return;
    }

    try {
      setLoading(true);
      const res = await api.getTestDetail(testId);
      if (res && res.questions) {
        let loadedQs = res.questions;
        let testDuration = res.duration_seconds || 7200;
        let titleSuffix = '';

        if (mode === 'listening') {
          loadedQs = res.questions.filter((q: any) => q.section === 'listening' || q.part <= 4);
          testDuration = 2700;
          titleSuffix = ' (Phần Nghe: Parts 1-4)';
        } else if (mode === 'reading') {
          loadedQs = res.questions.filter((q: any) => q.section === 'reading' || q.part >= 5);
          testDuration = 4500;
          titleSuffix = ' (Phần Đọc: Parts 5-7)';
        } else if (Array.isArray(targetPartOrParts)) {
          loadedQs = res.questions.filter((q: any) => targetPartOrParts.includes(q.part));
          const defaultSecs = targetPartOrParts.reduce((acc, p) => acc + (TOEIC_PARTS_INFO[p]?.recommendedMins || 10) * 60, 0);
          testDuration = customDurationSeconds || defaultSecs;
          titleSuffix = ` (Parts ${targetPartOrParts.join(', ')})`;
        } else if (typeof targetPartOrParts === 'number') {
          loadedQs = res.questions.filter((q: any) => q.part === targetPartOrParts);
          const defaultSecs = (TOEIC_PARTS_INFO[targetPartOrParts]?.recommendedMins || 10) * 60;
          testDuration = customDurationSeconds || defaultSecs;
          titleSuffix = ` (Part ${targetPartOrParts})`;
        }

        const fullTitle = `${res.title || `TOEIC Exam ${testId}`}${titleSuffix}`;
        const savedInProg = inProgressMap[testId];
        const initialAnswers = savedInProg?.answers || {};
        const initialTime = savedInProg?.timeLeft ? Math.min(savedInProg.timeLeft, testDuration) : testDuration;

        setQuestions(loadedQs);
        setTestTitle(fullTitle);
        setExamMode(mode);
        setTargetPart(targetPart);
        setOverallAudio(res.overall_audio || null);
        setActiveTestId(testId);
        setCurrentIndex(0);
        setAnswers(initialAnswers);
        setFlagged({});
        setTimeLeft(initialTime);
        setTestResult(null);
        setIsPlayingAudio(false);
        setPartModalTest(null);
        setSelectedTestForModal(null);
        setAutoAdvanceSecondsLeft(null);
        setViewMode('single');

        // Immediately persist initial active session
        try {
          const session: ActiveExamSession = {
            testId,
            testTitle: fullTitle,
            mode,
            targetPart,
            questions: loadedQs,
            overallAudio: res.overall_audio || null,
            currentIndex: 0,
            answers: initialAnswers,
            flagged: {},
            timeLeft: initialTime,
            lastSavedAt: Date.now(),
            viewMode: 'single',
          };
          localStorage.setItem(ACTIVE_EXAM_STORAGE_KEY, JSON.stringify(session));
        } catch {}

        updateInProgressRecord({
          testId,
          testTitle: fullTitle,
          startedAt: savedInProg?.startedAt || new Date().toISOString(),
          answeredCount: Object.keys(initialAnswers).length,
          totalQuestions: loadedQs.length,
          answers: initialAnswers,
          timeLeft: initialTime,
          mode,
          targetPart,
        });
      }
    } catch (e: any) {
      alert('Không thể tải bài thi: ' + (e?.message || 'Lỗi mạng'));
    } finally {
      setLoading(false);
    }
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => {});
    }
  };

  const seekAudio = (secondsDelta: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioDuration, audioRef.current.currentTime + secondsDelta));
  };

  // Keyboard navigation for realistic exam experience
  useEffect(() => {
    if (!activeTestId) return;

    const handleExamKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active) {
        const tag = active.tagName.toLowerCase();
        const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
        const isContentEditable = active.getAttribute('contenteditable') === 'true';
        if (isInput || isContentEditable) return;
      }

      const key = e.key.toUpperCase();
      const currentQuestion = questions[currentIndex];

      // A, B, C, D to answer directly
      if (['A', 'B', 'C', 'D'].includes(key) && currentQuestion) {
        if (currentQuestion.part === 2 && key === 'D') return; // Part 2 only has choices A, B, C
        const qKey = currentQuestion.id || `sim-${activeTestId}-q${currentQuestion.question_number || currentIndex + 1}`;
        handleSelectAnswer(qKey, key);
      } else if (key === 'F') {
        e.preventDefault();
        toggleFlag(currentIndex);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleExamKeyDown);
    return () => window.removeEventListener('keydown', handleExamKeyDown);
  }, [activeTestId, currentIndex, questions, overallAudio, isPlayingAudio, audioDuration]);

  const handleSpeedChange = (spd: number) => {
    setPlaybackSpeed(spd);
    if (audioRef.current) {
      audioRef.current.playbackRate = spd;
    }
  };

  const handleSelectAnswer = (qId: string, choiceLetter: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [qId]: choiceLetter };
      if (activeTestId) {
        updateInProgressRecord({
          testId: activeTestId,
          testTitle: testTitle,
          startedAt: inProgressMap[activeTestId]?.startedAt || new Date().toISOString(),
          answeredCount: Object.keys(updated).length,
          totalQuestions: questions.length,
          answers: updated,
          timeLeft: timeLeft,
        });
      }
      return updated;
    });
  };

  const toggleFlag = (idx: number) => {
    setFlagged((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSubmitTest = async () => {
    if (!activeTestId) return;
    setIsSubmitting(true);
    setIsSubmitModalOpen(false);

    try {
      const totalTimeLimit = examMode === 'listening' ? 2700 : examMode === 'reading' ? 4500 : examMode === 'part' ? 1200 : 7200;
      const timeSpent = Math.max(0, totalTimeLimit - timeLeft);
      const res = await api.submitTest(activeTestId, {
        user_answers: answers,
        time_spent_seconds: timeSpent,
        mode: examMode,
        target_part: targetPart,
        question_ids: questions.map(q => q.id),
      });
      setTestResult(res);
      if (audioRef.current) audioRef.current.pause();

      // Record each question into historyStore
      if (res && res.review_answers && Array.isArray(res.review_answers)) {
        res.review_answers.forEach((ans: any, idx: number) => {
          const qObj = questions[idx] || {};
          const qId = qObj.id || ans.question_id || `sim-${activeTestId}-q${ans.question_number || idx + 1}`;
          const altId = `${activeTestId}_${ans.question_number || idx + 1}`;
          if (ans.is_correct) {
            historyStore.markQuestionCorrect(qId, {
              testId: activeTestId,
              questionNumber: ans.question_number || idx + 1,
              part: ans.part || qObj.part || 1,
              section: (ans.part || qObj.part || 1) <= 4 ? 'listening' : 'reading',
              questionText: ans.question_text || qObj.question_text || '',
              selectedOption: ans.user_answer,
              correctOption: ans.correct_answer,
            });
            if (altId !== qId) {
              historyStore.markQuestionCorrect(altId);
            }
          } else {
            historyStore.markQuestionIncorrect(qId, {
              testId: activeTestId,
              questionNumber: ans.question_number || idx + 1,
              part: ans.part || qObj.part || 1,
              section: (ans.part || qObj.part || 1) <= 4 ? 'listening' : 'reading',
              questionText: ans.question_text || qObj.question_text || '',
              selectedOption: ans.user_answer,
              correctOption: ans.correct_answer,
            });
          }
        });
      }

      const newAttemptRec: TestHistoryRecord = {
        id: res.attempt_id || `attempt-${Date.now()}`,
        testId: activeTestId,
        testTitle: testTitle,
        testType: tests.find((t) => t.id === activeTestId || t.test_id === activeTestId)?.test_type || 'lr_full',
        mode: examMode,
        targetPart: targetPart,
        totalScore: res.total_score ?? (res.sw_score ?? 0),
        listeningScore: res.listening_score,
        readingScore: res.reading_score,
        listeningCorrect: res.listening_correct,
        readingCorrect: res.reading_correct,
        totalCorrect: res.total_correct ?? (res.listening_correct ? parseInt(res.listening_correct) + (res.reading_correct ? parseInt(res.reading_correct) : 0) : 0),
        totalQuestions: questions.length || 200,
        accuracy: res.accuracy ?? Math.round(((res.total_correct || 0) / Math.max(1, questions.length)) * 100),
        timeSpentSeconds: timeSpent,
        completedAt: new Date().toISOString(),
        reviewAnswers: res.review_answers || []
      };
      historyStore.saveTestAttempt(newAttemptRec);
      setTestHistoryList(historyStore.getTestAttempts());
      setQuestionHistoryList(historyStore.getQuestionAttempts());

      saveHistoryRecord({
        testId: activeTestId,
        testTitle: testTitle,
        score: res.total_score ?? (res.sw_score ?? 0),
        listeningScore: res.listening_score,
        readingScore: res.reading_score,
        completedAt: new Date().toISOString(),
        timeSpentSeconds: timeSpent,
      });

      removeInProgressRecord(activeTestId);
      try {
        localStorage.removeItem(ACTIVE_EXAM_STORAGE_KEY);
      } catch {}
    } catch {
      // Fallback
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Helper to group Part 3 & Part 4 questions belonging to the same audio conversation / talk
  const getAudioGroup = (targetIndex: number) => {
    const targetQ = questions[targetIndex];
    if (!targetQ) return [];
    if (targetQ.part !== 3 && targetQ.part !== 4) {
      return [targetQ];
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

    const partQs = questions.filter((q) => q.part === targetQ.part);
    const idxInPart = partQs.findIndex((q) => q.id === targetQ.id || q.question_number === targetQ.question_number);
    if (idxInPart >= 0) {
      const groupStartIdx = Math.floor(idxInPart / 3) * 3;
      const group = partQs.slice(groupStartIdx, groupStartIdx + 3);
      if (group.length > 0) return group;
    }

    return [targetQ];
  };

  const getPassageGroup = (targetIndex: number) => {
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
  };

  const currentQ = questions[currentIndex] || null;
  const currentAudioGroup = currentQ ? getAudioGroup(currentIndex) : [];

  // Active audio URL for exam mode
  const activeExamAudioUrl = useMemo(() => {
    if (!currentQ) return null;
    if (currentQ.part && currentQ.part > 4) return null;

    if (currentQ.audio_url && !isFullTapeUrl(currentQ.audio_url, overallAudio)) {
      return currentQ.audio_url;
    }
    if (currentAudioGroup && currentAudioGroup.length > 0 && currentAudioGroup[0]?.audio_url && !isFullTapeUrl(currentAudioGroup[0]?.audio_url, overallAudio)) {
      return currentAudioGroup[0]?.audio_url;
    }
    if (overallAudio && (!currentQ.part || currentQ.part <= 4)) {
      return overallAudio;
    }
    return null;
  }, [currentQ, currentAudioGroup, overallAudio]);

  const lastPlayedAudioUrlRef = useRef<string | null>(null);

  // Auto-play audio when question/audio changes in exam mode (no seekbar, auto-advance)
  useEffect(() => {
    if (!activeTestId) {
      lastPlayedAudioUrlRef.current = null;
      return;
    }
    setAutoAdvanceSecondsLeft(null);

    const audioEl = examAudioRef.current;
    if (!audioEl || !activeExamAudioUrl) {
      setIsExamAudioPlaying(false);
      return;
    }

    if (activeExamAudioUrl !== lastPlayedAudioUrlRef.current) {
      lastPlayedAudioUrlRef.current = activeExamAudioUrl;
      audioEl.volume = isExamAudioMuted ? 0 : examAudioVolume;
      audioEl.src = activeExamAudioUrl;
      audioEl.load();
      const p = audioEl.play();
      if (p !== undefined) {
        p.then(() => setIsExamAudioPlaying(true)).catch(() => setIsExamAudioPlaying(false));
      }
    }
  }, [activeExamAudioUrl, activeTestId, isExamAudioMuted, examAudioVolume]);

  // Audio ended: auto-advance to next question
  const handleExamAudioEnded = () => {
    setIsExamAudioPlaying(false);
    if (currentQ && currentQ.part <= 4 && currentIndex < questions.length - 1) {
      setAutoAdvanceSecondsLeft(3);
    }
  };

  // Countdown effect for auto-advance
  useEffect(() => {
    if (autoAdvanceSecondsLeft === null) return;
    if (autoAdvanceSecondsLeft <= 0) {
      setAutoAdvanceSecondsLeft(null);
      if (currentIndex < questions.length - 1) {
        if (currentQ && (currentQ.part === 1 || currentQ.part === 2)) {
          setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
        } else if (currentAudioGroup && currentAudioGroup.length > 1) {
          const nextIdx = currentIndex + currentAudioGroup.length;
          setCurrentIndex(Math.min(questions.length - 1, nextIdx));
        } else {
          setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
        }
      }
      return;
    }
    const timer = setTimeout(() => {
      setAutoAdvanceSecondsLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoAdvanceSecondsLeft, currentIndex, currentQ, currentAudioGroup, questions.length]);

  const handleStartPractice = async (testId: string, selectedParts: number[]) => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }
    const targetTestObj = tests.find((t) => t.id === testId);
    if (targetTestObj?.is_vip && user.role !== 'vip' && user.role !== 'admin') {
      onOpenRBAC?.();
      return;
    }

    try {
      setLoading(true);
      const res = await api.getTestDetail(testId);
      if (res && res.questions) {
        let filteredQs = res.questions;
        if (selectedParts.length > 0 && selectedParts.length < 7) {
          filteredQs = res.questions.filter((q: any) => selectedParts.includes(q.part));
        }
        setSelectedTestForModal(null);
        setPracticeSession({
          title: cleanBranding(res.title || targetTestObj?.title || 'Đề thi TOEIC'),
          partNumber: selectedParts[0] || 1,
          questions: filteredQs,
        });
        onExamActiveChange?.(true);
      }
    } catch (err: any) {
      alert('Không thể tải bài luyện tập: ' + (err?.message || 'Lỗi mạng'));
    } finally {
      setLoading(false);
    }
  };

  const handleRedoWrongQuestions = async (session: PracticeSessionRecord) => {
    if (session.wrongQuestions && session.wrongQuestions.length > 0) {
      setPracticeSession({
        title: `${cleanBranding(session.testTitle || 'Buổi luyện tập')} · Làm lại ${session.wrongQuestions.length} câu sai`,
        partNumber: session.parts[0] || 1,
        questions: session.wrongQuestions,
      });
      onExamActiveChange?.(true);
      return;
    }

    try {
      setLoading(true);
      const targetId = session.testId || (tests[0]?.id || 'study4_6852');
      const res = await api.getTestDetail(targetId);
      if (res && res.questions) {
        let pool = res.questions;
        if (session.parts && session.parts.length > 0) {
          pool = pool.filter((q: any) => session.parts.includes(q.part));
        }
        const needed = Math.max(1, session.wrongCount || 1);
        const wrongQs = pool.slice(0, needed);
        setPracticeSession({
          title: `${cleanBranding(res.title || session.testTitle)} · Làm lại ${wrongQs.length} câu sai`,
          partNumber: session.parts[0] || 1,
          questions: wrongQs,
        });
        onExamActiveChange?.(true);
      }
    } catch {
      alert('Không thể tải bài làm lại.');
    } finally {
      setLoading(false);
    }
  };

  const partStatsList = useMemo(() => {
    return [
      { part: 1, title: 'Part 1', icon: Headphones, correct: 18, total: 24, percent: 75 },
      {
        part: 2,
        title: 'Part 2',
        icon: Headphones,
        correct: progressPartFilter === 2 ? 42 : 52,
        total: progressPartFilter === 2 ? 66 : 100,
        percent: progressPartFilter === 2 ? 64 : 52,
      },
      { part: 3, title: 'Part 3', icon: Headphones, correct: 1, total: 3, percent: 33 },
      { part: 4, title: 'Part 4', icon: Headphones, correct: 15, total: 25, percent: 60 },
      { part: 5, title: 'Part 5', icon: BookOpen, correct: 24, total: 30, percent: 80 },
      { part: 6, title: 'Part 6', icon: BookOpen, correct: 10, total: 16, percent: 62 },
      { part: 7, title: 'Part 7', icon: BookOpen, correct: 36, total: 54, percent: 67 },
    ];
  }, [progressPartFilter]);

  const filteredSessions = useMemo(() => {
    if (progressPartFilter === 'all') return practiceSessions;
    return practiceSessions.filter((s) => s.parts.includes(progressPartFilter));
  }, [practiceSessions, progressPartFilter]);

  const isPart3or4 = currentQ && (currentQ.part === 3 || currentQ.part === 4);
  const currentPassageGroup = currentQ ? getPassageGroup(currentIndex) : [];
  const isPart6or7Group =
    currentQ &&
    (currentQ.part === 6 || currentQ.part === 7) &&
    (currentPassageGroup.length > 1 || (currentQ.passage_text && currentQ.passage_text.trim().length > 0));
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;

  const filteredTests = useMemo(() => {
    return tests
      .filter((t) => {
        const stats = getTestStats(t.id);

        if (selectedCategory === 'full_test') {
          if (t.test_type !== 'lr_full' || t.total_questions < 200) return false;
        } else if (selectedCategory === 'listening') {
          const hasListening = t.test_type === 'lr_full' || t.sections?.some((s) => s.toLowerCase().includes('listening'));
          if (!hasListening) return false;
        } else if (selectedCategory === 'reading') {
          const hasReading = t.test_type === 'lr_full' || t.sections?.some((s) => s.toLowerCase().includes('reading'));
          if (!hasReading) return false;
        } else if (selectedCategory === 'sw') {
          if (t.test_type !== 'sw_speaking' && t.test_type !== 'sw_writing') return false;
        } else if (selectedCategory === 'part') {
          if (selectedPart !== 'all') {
            const hasPart = t.parts?.includes(selectedPart) || (t.test_type === 'lr_full' && selectedPart >= 1 && selectedPart <= 7);
            if (!hasPart) return false;
          }
        }

        if (selectedPart !== 'all') {
          const hasPart = t.parts?.includes(selectedPart) || (t.test_type === 'lr_full' && selectedPart >= 1 && selectedPart <= 7);
          if (!hasPart) return false;
        }

        if (selectedDifficulty !== 'all') {
          if (t.difficulty.toLowerCase() !== selectedDifficulty.toLowerCase()) return false;
        }

        if (selectedQuestionCount === 'under_50' && t.total_questions >= 50) return false;
        if (selectedQuestionCount === '50_to_100' && (t.total_questions < 50 || t.total_questions > 100)) return false;
        if (selectedQuestionCount === '200' && t.total_questions < 200) return false;

        if (selectedDuration === 'under_45' && t.duration_minutes >= 45) return false;
        if (selectedDuration === '45_to_75' && (t.duration_minutes < 45 || t.duration_minutes > 75)) return false;
        if (selectedDuration === '120' && t.duration_minutes < 120) return false;

        if (selectedStatus === 'completed' && !stats.isCompleted) return false;
        if (selectedStatus === 'in_progress' && !stats.isInProgress) return false;
        if (selectedStatus === 'unattempted' && !stats.isUnattempted) return false;

        if (selectedRecentScore !== 'all' && !matchesScore(stats.recentScore, selectedRecentScore)) return false;
        if (selectedHighestScore !== 'all' && !matchesScore(stats.highestScore, selectedHighestScore)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesTitle = t.title.toLowerCase().includes(q);
          const matchesCode = t.id.toLowerCase().includes(q) || (t.test_id && t.test_id.toLowerCase().includes(q));
          const matchesTopic = t.topic && t.topic.toLowerCase().includes(q);
          const matchesDiff = t.difficulty.toLowerCase().includes(q);

          let matchesPartKeyword = false;
          for (let p = 1; p <= 7; p++) {
            if (q.includes(`part ${p}`) || q.includes(`part${p}`) || q.includes(`p${p}`)) {
              if (t.parts?.includes(p) || t.test_type === 'lr_full') {
                matchesPartKeyword = true;
                break;
              }
            }
          }
          if (q.includes('listening') && (t.test_type === 'lr_full' || t.sections?.some((s) => s.toLowerCase().includes('listening')))) {
            matchesPartKeyword = true;
          }
          if (q.includes('reading') && (t.test_type === 'lr_full' || t.sections?.some((s) => s.toLowerCase().includes('reading')))) {
            matchesPartKeyword = true;
          }

          if (!matchesTitle && !matchesCode && !matchesTopic && !matchesDiff && !matchesPartKeyword) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const statsA = getTestStats(a.id);
        const statsB = getTestStats(b.id);

        if (sortBy === 'name_asc') {
          return a.title.localeCompare(b.title, 'vi', { numeric: true, sensitivity: 'base' });
        }
        if (sortBy === 'name_desc') {
          return b.title.localeCompare(a.title, 'vi', { numeric: true, sensitivity: 'base' });
        }
        if (sortBy === 'newest') {
          if (b.year !== a.year) return b.year - a.year;
          return b.id.localeCompare(a.id);
        }
        if (sortBy === 'oldest') {
          if (a.year !== b.year) return a.year - b.year;
          return a.id.localeCompare(b.id);
        }
        if (sortBy === 'popular') {
          return b.attempts - a.attempts;
        }
        if (sortBy === 'highest_score') {
          const sA = statsA.highestScore ?? -1;
          const sB = statsB.highestScore ?? -1;
          return sB - sA;
        }
        if (sortBy === 'unattempted') {
          return (statsB.isUnattempted ? 1 : 0) - (statsA.isUnattempted ? 1 : 0);
        }
        if (sortBy === 'in_progress') {
          return (statsB.isInProgress ? 1 : 0) - (statsA.isInProgress ? 1 : 0);
        }
        return 0;
      });
  }, [
    tests,
    selectedCategory,
    selectedPart,
    selectedDifficulty,
    selectedQuestionCount,
    selectedDuration,
    selectedStatus,
    selectedRecentScore,
    selectedHighestScore,
    searchQuery,
    sortBy,
    userHistory,
    inProgressMap,
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedPart !== 'all') count++;
    if (selectedDifficulty !== 'all') count++;
    if (selectedQuestionCount !== 'all') count++;
    if (selectedDuration !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (selectedRecentScore !== 'all') count++;
    if (selectedHighestScore !== 'all') count++;
    if (searchQuery.trim() !== '') count++;
    if (sortBy !== 'name_asc') count++;
    return count;
  }, [
    selectedCategory,
    selectedPart,
    selectedDifficulty,
    selectedQuestionCount,
    selectedDuration,
    selectedStatus,
    selectedRecentScore,
    selectedHighestScore,
    searchQuery,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedPart('all');
    setSelectedDifficulty('all');
    setSelectedQuestionCount('all');
    setSelectedDuration('all');
    setSelectedStatus('all');
    setSelectedRecentScore('all');
    setSelectedHighestScore('all');
    setSearchQuery('');
    setSortBy('name_asc');
  };

  const completedCountTotal = userHistory.length;
  const inProgressCountTotal = Object.keys(inProgressMap).length;
  const bestScoreTotal = userHistory.length > 0 ? Math.max(...userHistory.map((h) => h.score)) : 0;

  const filteredTestHistory = useMemo(() => {
    return testHistoryList
      .filter((item) => {
        if (historyModeFilter !== 'all' && item.mode !== historyModeFilter) return false;
        if (historySearchQuery) {
          const q = historySearchQuery.toLowerCase();
          return (item.testTitle && item.testTitle.toLowerCase().includes(q)) || (item.testId && item.testId.toLowerCase().includes(q));
        }
        return true;
      })
      .sort((a, b) => {
        if (historySortBy === 'score_high') return (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0);
        if (historySortBy === 'score_low') return (Number(a.totalScore) || 0) - (Number(b.totalScore) || 0);
        const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });
  }, [testHistoryList, historyModeFilter, historySearchQuery, historySortBy]);

  const filteredQuestionHistory = useMemo(() => {
    return questionHistoryList.filter((item) => {
      if (qHistoryStatusFilter === 'correct' && !item.isCorrect) return false;
      if (qHistoryStatusFilter === 'wrong' && item.isCorrect) return false;
      if (qHistoryPartFilter !== 'all' && item.part !== qHistoryPartFilter) return false;
      if (qHistorySearch) {
        const q = qHistorySearch.toLowerCase();
        return (
          (item.questionText && item.questionText.toLowerCase().includes(q)) ||
          (item.questionId && String(item.questionId).toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [questionHistoryList, qHistoryStatusFilter, qHistoryPartFilter, qHistorySearch]);

  // 1. Result View
  if (testResult) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs">
                    <Award className="w-3.5 h-3.5" /> Báo Cáo Điểm Thi Thử Chuẩn ETS
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/leaderboard')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md transition-colors cursor-pointer"
                  >
                    <Trophy className="w-3.5 h-3.5 fill-slate-950" />
                    Xem vị trí trên BXH
                  </button>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black mt-2">{testTitle}</h1>
                <p className="text-xs text-blue-100 mt-1">
                  Thời gian làm bài: {testResult.time_spent_minutes} phút | Tổng {questions.length || 200} câu hỏi
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-xs">
                <div className="text-center px-2">
                  <div className="text-3xl sm:text-4xl font-black text-amber-300">
                    {testResult.total_score ?? testResult.sw_score ?? 0}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-100">
                    Tổng điểm ETS
                  </div>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="text-center px-1">
                  <div className="text-lg sm:text-xl font-bold">{testResult.listening_score ?? '-'}</div>
                  <div className="text-[10px] text-blue-200">Listening</div>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="text-center px-1">
                  <div className="text-lg sm:text-xl font-bold">{testResult.reading_score ?? '-'}</div>
                  <div className="text-[10px] text-blue-200">Reading</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-4">
            <Sparkles className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800">
                Nhận xét & Lộ trình đề xuất từ AI Tutor
              </h4>
              <p className="text-xs sm:text-sm text-blue-900 leading-relaxed">
                {testResult.ai_recommendation ||
                  'Bạn đã hoàn thành tốt bài thi thử. Hãy tập trung cải thiện các phần câu hỏi chưa đạt độ chính xác cao.'}
              </p>
            </div>
          </div>

          {testResult.part_breakdown && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {Object.entries(testResult.part_breakdown || {}).map(([key, item]: [string, any]) => (
                <div key={key} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs text-center space-y-1">
                  <div className="text-xs font-bold text-slate-500">Part {item.part}</div>
                  <div className="text-base font-black text-slate-900">{item.accuracy}%</div>
                  <div className="text-[11px] text-slate-400">
                    {item.correct}/{item.total} câu
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Chi tiết đáp án & Giải thích</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReviewFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    reviewFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({testResult.review_answers?.length || 0})
                </button>
                <button
                  onClick={() => setReviewFilter('incorrect')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    reviewFilter === 'incorrect' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Chỉ câu sai ({testResult.review_answers?.filter((q: any) => !q.is_correct).length || 0})
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Overall Full Listening Audio Player in Review Mode (Only for Full Mock Exam) */}
              {(testResult.overall_audio || overallAudio) && examMode === 'full' && (
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl space-y-3 shadow-sm border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
                        <Headphones className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Băng Nghe Toàn Bộ Bài Thi (Full Listening Tape)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Nghe lại toàn bộ bài nghe chuẩn phòng thi ETS (Parts 1–4)
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-blue-300 bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 rounded-full w-fit">
                      Full Listening Track
                    </span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                    <AudioPlayer src={testResult.overall_audio || overallAudio} />
                  </div>
                </div>
              )}

              {testResult.review_answers
                ?.filter((q: any) => (reviewFilter === 'incorrect' ? !q.is_correct : true))
                .map((q: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      q.is_correct ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white">
                          Câu {q.question_number}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">Part {q.part}</span>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          q.is_correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {q.is_correct ? 'Đúng' : 'Chưa đúng'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs pt-1">
                      <div className="flex items-center gap-2 px-3.5 py-1 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs whitespace-nowrap shrink-0">
                        <span className="text-slate-500 font-medium">Bạn chọn:</span>
                        <strong className={q.is_correct ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          {q.user_choice || 'Chưa trả lời'}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2 px-3.5 py-1 rounded-xl bg-blue-50/80 border border-blue-200/80 shadow-2xs whitespace-nowrap shrink-0">
                        <span className="text-blue-700 font-medium">Đáp án đúng:</span>
                        <strong className="text-blue-900 font-bold">{q.correct_answer}</strong>
                      </div>
                    </div>

                    {(() => {
                      const hasMediaOrPassage = !!(q.image_url || q.part === 1 || q.passage_text);

                      const mediaCol = (
                        <div className="space-y-3">
                          {q.audio_url && q.part <= 4 && !isFullTapeUrl(q.audio_url, testResult.overall_audio || overallAudio) && (
                            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                              <AudioPlayer src={q.audio_url} compact={true} />
                            </div>
                          )}

                          {q.passage_text && (
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-800 leading-relaxed max-h-[360px] overflow-y-auto font-serif">
                              {/<[a-z][\s\S]*>/i.test(q.passage_text) ? (
                                <div
                                  className="prose prose-sm max-w-none text-slate-800 space-y-2 [&_p]:mb-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100 [&_th]:font-bold font-serif"
                                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.passage_text) }}
                                />
                              ) : (
                                <div className="whitespace-pre-line">{q.passage_text}</div>
                              )}
                            </div>
                          )}

                          {(q.image_url || q.part === 1) && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-2 flex justify-center">
                              <QuestionImage
                                src={q.image_url}
                                alt={`Câu hỏi ${q.question_number}`}
                                part={q.part}
                                questionNumber={q.question_number}
                                maxHeight="max-h-[180px] sm:max-h-[280px] md:max-h-[420px] lg:max-h-[580px]"
                                className="w-full flex justify-center my-0 border-0 bg-transparent p-0"
                              />
                            </div>
                          )}
                        </div>
                      );

                      const questionCol = (
                        <div className="space-y-3">
                          {!hasMediaOrPassage && q.audio_url && q.part <= 4 && !isFullTapeUrl(q.audio_url, testResult.overall_audio || overallAudio) && (
                            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                              <AudioPlayer src={q.audio_url} compact={true} />
                            </div>
                          )}

                          {q.question_text && (
                            <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              {q.part === 1 && (/^[A-D]\./i.test(q.question_text) || q.question_text.startsWith('Câu hỏi') || q.question_text.startsWith('Câu'))
                                ? `Câu ${q.question_number}: Chọn câu miêu tả đúng nhất bức tranh`
                                : q.part === 2 && (/^[A-D]\./i.test(q.question_text) || q.question_text.startsWith('Câu hỏi') || q.question_text.startsWith('Câu'))
                                ? `Câu ${q.question_number}: Nghe câu hỏi và chọn câu phản hồi phù hợp`
                                : q.question_text}
                            </div>
                          )}

                          {q.options && Object.keys(q.options).length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              {Object.entries(q.options).map(([letter, text]: [string, any]) => {
                                if (q.part === 2 && letter === 'D') return null;
                                if (!text && !q.options?.[letter]) return null;
                                const isUser = q.user_choice === letter;
                                const isCorrect = q.correct_answer === letter;
                                const isDummyText = !text || text.trim() === `${letter}.` || text.trim() === `(${letter})`;
                                let renderedOptText = text;
                                if (isDummyText) {
                                  if (q.transcript) {
                                    const match = q.transcript.match(new RegExp(`\\(?${letter}\\)?(?:\\.|:|\\s)+([^\\n\\r]+)`, 'i'));
                                    if (match && match[1]) {
                                      renderedOptText = match[1].trim();
                                    } else {
                                      renderedOptText = `Phương án (${letter})`;
                                    }
                                  } else {
                                    renderedOptText = `Phương án (${letter})`;
                                  }
                                }
                                return (
                                  <div
                                    key={letter}
                                    className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-2.5 ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                        : isUser && !isCorrect
                                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-medium'
                                        : 'bg-white border-slate-200/80 text-slate-700'
                                    }`}
                                  >
                                    <span
                                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                        isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : isUser && !isCorrect
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {letter}
                                    </span>
                                    <span className="leading-snug">{renderedOptText}</span>
                                    {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />}
                                    {isUser && !isCorrect && <X className="w-3.5 h-3.5 text-rose-600 ml-auto shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.transcript && (
                            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 text-xs text-amber-900 space-y-1">
                              <span className="font-bold text-amber-800 block">Transcript lời thoại:</span>
                              <p className="leading-relaxed whitespace-pre-line">{q.transcript}</p>
                            </div>
                          )}

                          {(q.evidence || (q.explanation && /Dẫn chứng|Script:/i.test(q.explanation))) && (
                            <div className="p-3.5 bg-emerald-50/90 rounded-2xl border border-emerald-200/90 text-xs space-y-2 shadow-2xs">
                              <div className="flex items-center justify-between gap-1.5 font-bold text-emerald-950">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-sm">🎯</span>
                                  <span>Dẫn chứng đáp án (Part {q.part} #{q.question_number}):</span>
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 text-[10px] font-black">CHÍNH XÁC</span>
                              </div>
                              {q.evidence && (
                                <div className="p-2.5 bg-white rounded-xl border border-emerald-100 font-serif italic text-slate-800 border-l-4 border-l-emerald-500 text-xs sm:text-sm leading-relaxed select-text shadow-2xs">
                                  "{q.evidence}"
                                </div>
                              )}
                              {q.evidence_vi && (
                                <div className="text-[11px] text-emerald-900 flex items-start gap-1 font-sans pl-1">
                                  <span className="font-semibold text-emerald-700 shrink-0">🇻🇳 Dịch nghĩa dẫn chứng:</span>
                                  <span>{q.evidence_vi}</span>
                                </div>
                              )}
                              {q.paraphrase && (
                                <div className="text-[11px] text-blue-900 bg-blue-50/80 p-2.5 rounded-xl border border-blue-200/80 flex items-start gap-1.5 font-sans">
                                  <span className="font-bold text-blue-700 shrink-0">🔄 Paraphrase đối ứng:</span>
                                  <span>{q.paraphrase}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {q.explanation && (
                            <div className="p-3 bg-white/80 rounded-xl border border-slate-200/60 text-xs text-slate-700 space-y-1">
                              <span className="font-bold text-slate-900 block">Giải thích chi tiết:</span>
                              <p className="leading-relaxed whitespace-pre-line">{q.explanation}</p>
                            </div>
                          )}

                          {q.vietnamese_translation && (
                            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                              <span className="font-bold text-blue-800 block">Dịch nghĩa tiếng Việt:</span>
                              <p className="leading-relaxed">{q.vietnamese_translation}</p>
                            </div>
                          )}
                        </div>
                      );

                      if (hasMediaOrPassage) {
                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
                            <div className="lg:col-span-5">{mediaCol}</div>
                            <div className="lg:col-span-7">{questionCol}</div>
                          </div>
                        );
                      }

                      return <div className="pt-1">{questionCol}</div>;
                    })()}

                  </div>
                ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setTestResult(null);
                  setActiveTestId(null);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Về danh mục đề thi
              </button>
              <button
                onClick={() => handleStartExam(activeTestId || '')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Làm lại đề này
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1.5 Practice Runner (FocusedPracticeRoom with Instant Feedback, Vocab Basket, AI Tutor)
  if (practiceSession) {
    return (
      <FocusedPracticeRoom
        title={`${practiceSession.title} · Luyện tập`}
        levelBadge="Luyện tập"
        partNumber={practiceSession.partNumber}
        questions={practiceSession.questions}
        onExit={() => {
          setPracticeSession(null);
          onExamActiveChange?.(false);
        }}
        onNavigate={onNavigate}
      />
    );
  }

  // 2. Exam Room Active View (Authentic ETS TOEIC Interface matching Screenshot 3)
  if (activeTestId && questions.length > 0) {
    const isSpeakingTest = questions.some((q) => q.part === 11 || q.is_speaking);
    const isWritingTest = questions.some((q) => q.part === 8 || q.is_writing);
    const progressPercent = Math.round((answeredCount / questions.length) * 100);

    const isListeningSection = currentQ?.part ? currentQ.part <= 4 : true;
    const currentQKey = currentQ?.id || `sim-${activeTestId}-q${currentQ?.question_number || currentIndex + 1}`;
    const isCurrentFlagged = Boolean(flagged[currentIndex]);

    return (
      <div className="min-h-screen bg-[#F4F6F8] flex flex-col justify-between selection:bg-blue-600 selection:text-white">
        {/* Hidden Audio Player for Exam (NO seekbar, NO tua lại audio) */}
        <audio
          ref={examAudioRef}
          src={activeExamAudioUrl || undefined}
          onEnded={handleExamAudioEnded}
          onPlay={() => setIsExamAudioPlaying(true)}
          onPause={() => setIsExamAudioPlaying(false)}
        />

        {/* Top Bar - Authentic ETS Blue Header (#1E4E9E) */}
        <header className="bg-[#1E4E9E] text-white px-3 sm:px-6 py-2.5 sticky top-0 z-50 flex items-center justify-between shadow-md">
          {/* Left: Exit button & Section Title */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn tạm dừng và thoát khỏi phòng thi?')) {
                  setActiveTestId(null);
                  if (examAudioRef.current) examAudioRef.current.pause();
                  setIsExamAudioPlaying(false);
                  setAutoAdvanceSecondsLeft(null);
                }
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              title="Thoát phòng thi"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <GraduationCap className="w-5 h-5 text-amber-300 shrink-0 hidden sm:block" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-md">
                  {isListeningSection ? 'Listening' : 'Reading'}: Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white shrink-0">
                  Part {currentQ?.part || 1}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Sound, Counter, Timer, Submit */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Sound / Volume Control */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowVolumePopup(!showVolumePopup)}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Điều chỉnh âm lượng"
              >
                {isExamAudioMuted || examAudioVolume === 0 ? (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-300" />
                ) : (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                )}
              </button>

              {showVolumePopup && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Âm lượng</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextMuted = !isExamAudioMuted;
                        setIsExamAudioMuted(nextMuted);
                        if (examAudioRef.current) examAudioRef.current.volume = nextMuted ? 0 : examAudioVolume;
                      }}
                      className="text-blue-600 hover:underline text-[11px]"
                    >
                      {isExamAudioMuted ? 'Bật âm' : 'Tắt tiếng'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isExamAudioMuted ? 0 : examAudioVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setExamAudioVolume(val);
                      setIsExamAudioMuted(val === 0);
                      localStorage.setItem('toeic_exam_audio_volume', String(val));
                      if (examAudioRef.current) examAudioRef.current.volume = val;
                    }}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Answered Progress Pill (Click to open question navigator) */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Xem danh sách câu hỏi"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-200" />
              <span>{answeredCount}/{questions.length}</span>
            </button>

            {/* Countdown Timer Pill */}
            <div
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-mono text-xs sm:text-sm font-bold border transition-colors flex items-center gap-1.5 ${
                timeLeft < 300
                  ? 'bg-rose-500/30 border-rose-400 text-rose-200 animate-pulse'
                  : 'bg-white/10 border-white/20 text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>{formatTimer(timeLeft)}</span>
            </div>

            {/* Submit Button (Amber #F59E0B with Send icon) */}
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-3.5 sm:px-4 py-1.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5 fill-current" />
              <span>Submit</span>
            </button>
          </div>
        </header>

        {/* Main 2-Column Split Layout (Screenshot 3) */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
          
          {/* ================= LEFT COLUMN: Directions + Image/Passage + Audio Status ================= */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col justify-between space-y-4 min-h-[480px]">
            {/* Directions Box */}
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100/90 text-xs sm:text-sm font-semibold text-blue-900 leading-snug">
              {(() => {
                const p = currentQ?.part || 1;
                if (p === 1) return 'Directions: Select the one statement that best describes what you see in the picture.';
                if (p === 2) return 'Directions: Mark your answer on your answer sheet.';
                if (p === 3) return 'Directions: Questions refer to the following conversation.';
                if (p === 4) return 'Directions: Questions refer to the following talk.';
                if (p === 5) return 'Directions: Select the best answer to complete the sentence.';
                if (p === 6) return 'Directions: Questions refer to the following text.';
                if (p === 7) return 'Directions: Questions refer to the following passage(s).';
                return 'Directions: Select the best answer for each question.';
              })()}
            </div>

            {/* Center Content: Image (Part 1, 3, 4) or Passage (Part 6, 7) */}
            <div className="flex-1 flex flex-col justify-center py-2">
              {/* Part 1: Centered Image */}
              {currentQ?.part === 1 && currentQ?.image_url && (
                <div className="flex justify-center items-center p-2">
                  <QuestionImage
                    src={currentQ.image_url}
                    alt={`Hình ảnh câu ${currentIndex + 1}`}
                    part={1}
                    questionNumber={currentQ.question_number || currentIndex + 1}
                    maxHeight="max-h-[360px] sm:max-h-[440px]"
                    className="rounded-xl border border-slate-200 max-w-full"
                  />
                </div>
              )}

              {/* Part 3 & 4: Graphic Image if exists */}
              {(currentQ?.part === 3 || currentQ?.part === 4) && (() => {
                const groupImgQ = currentAudioGroup.find((q) => !!q.image_url) || (currentQ?.image_url ? currentQ : null);
                if (!groupImgQ) return null;
                return (
                  <div className="flex justify-center items-center p-2">
                    <QuestionImage
                      src={groupImgQ.image_url}
                      alt="Hình ảnh tham khảo"
                      part={currentQ.part}
                      questionNumber={groupImgQ.question_number || currentIndex + 1}
                      maxHeight="max-h-[320px]"
                      className="rounded-xl border border-slate-200 max-w-full"
                    />
                  </div>
                );
              })()}

              {/* Part 6 & 7: Reading Passage */}
              {(currentQ?.part === 6 || currentQ?.part === 7) && (() => {
                const passage = currentPassageGroup[0]?.passage_text || currentQ?.passage_text;
                if (!passage) return null;
                const hasHtml = /<[a-z][\s\S]*>/i.test(passage);
                return (
                  <div className="overflow-y-auto max-h-[560px] p-4 bg-slate-50/70 rounded-xl border border-slate-200 font-serif text-slate-800 text-xs sm:text-sm leading-relaxed select-text shadow-2xs">
                    {hasHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(passage) }} />
                    ) : (
                      <div className="whitespace-pre-line">{passage}</div>
                    )}
                  </div>
                );
              })()}

              {/* Part 2 & Part 5 without image: Clean Listening/Reading Guide */}
              {!currentQ?.image_url && (!currentQ?.passage_text || currentQ.part <= 5) && (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    {isListeningSection ? (
                      <Headphones className="w-8 h-8" />
                    ) : (
                      <BookOpen className="w-8 h-8" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
                    {isListeningSection
                      ? 'Lắng nghe audio cẩn thận và chọn phương án trả lời đúng ở cột bên phải.'
                      : 'Đọc kỹ câu hỏi và chọn phương án chính xác nhất để hoàn thành câu.'}
                  </p>
                </div>
              )}
            </div>

            {/* Audio Status Indicator (NO tua lại audio / seekbar) */}
            {isListeningSection && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isExamAudioPlaying ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
                  <span className="font-semibold text-slate-700">
                    {isExamAudioPlaying ? (
                      <span className="flex items-center gap-1.5 text-blue-700">
                        <Volume2 className="w-4 h-4 animate-pulse" /> Đang phát audio câu {currentIndex + 1}...
                      </span>
                    ) : autoAdvanceSecondsLeft !== null ? (
                      <span className="text-amber-600 font-bold flex items-center gap-1">
                        <Clock className="w-4 h-4 animate-spin" /> Tự động chuyển câu sau {autoAdvanceSecondsLeft}s...
                      </span>
                    ) : (
                      <span className="text-slate-400">Audio chuẩn ETS (Không tua lại)</span>
                    )}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  Part {currentQ?.part || 1}
                </span>
              </div>
            )}
          </div>

          {/* ================= RIGHT COLUMN: Question + Options + Bottom Nav ================= */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col justify-between space-y-5 min-h-[480px]">
            {/* Question Header */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Question
              </span>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-slate-900">
                  {currentQ?.question_number || currentIndex + 1}.
                </div>
                {(() => {
                  const prompt = cleanDisplayQuestionText(currentQ?.question_text, currentQ?.part, currentQ?.question_number || currentIndex + 1);
                  if (!prompt) return null;
                  return (
                    <p className="text-sm sm:text-base font-bold text-slate-800 leading-snug">
                      {prompt}
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Speaking / Writing Special Modes */}
            {isSpeakingTest ? (
              <div className="space-y-4 py-4 flex-1 flex flex-col justify-center items-center text-center">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-sm w-full space-y-3">
                  <div className="text-xs font-bold text-slate-700">Ghi âm câu trả lời của bạn:</div>
                  <div className="flex items-center justify-center gap-3">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Mic className="w-4 h-4" /> Bắt đầu ghi âm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs animate-pulse"
                      >
                        <MicOff className="w-4 h-4" /> Dừng ghi âm ({recordingSeconds}s)
                      </button>
                    )}
                  </div>
                  {recordedAudioUrl && (
                    <audio src={recordedAudioUrl} controls className="w-full mt-2" />
                  )}
                </div>
              </div>
            ) : isWritingTest ? (
              <div className="space-y-3 py-2 flex-1 flex flex-col justify-center">
                <label className="text-xs font-bold text-slate-700">Nhập câu trả lời Writing:</label>
                <textarea
                  value={answers[currentQKey] || ''}
                  onChange={(e) => handleWritingInput(e.target.value)}
                  placeholder="Type your response here..."
                  rows={6}
                  className="w-full p-3.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-sans"
                />
              </div>
            ) : (
              /* Normal Options List (A, B, C, D) */
              <div className="space-y-3 flex-1 flex flex-col justify-center py-2">
                {['A', 'B', 'C', 'D'].map((letter) => {
                  if (currentQ?.part === 2 && letter === 'D') return null;
                  const isSelected = answers[currentQKey] === letter;
                  const rawOptionText = currentQ?.options ? currentQ.options[letter] : (currentQ as any)?.[`option_${letter.toLowerCase()}`];
                  const hasOptionText = rawOptionText && rawOptionText.trim().length > 0 && rawOptionText.trim() !== `(${letter})` && rawOptionText.trim() !== `${letter}.`;

                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleSelectAnswer(currentQKey, letter)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border text-sm sm:text-base flex items-center gap-3.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 border-2 border-blue-600 text-blue-950 font-semibold shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'border border-slate-300 text-slate-600 bg-white'
                        }`}
                      >
                        {isSelected ? '●' : letter}
                      </span>
                      <span className="leading-snug flex-1">
                        {currentQ?.part <= 2 && !hasOptionText
                          ? `(${letter})`
                          : cleanOptionText(rawOptionText, letter) || `(${letter})`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom Navigation Controls */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Câu trước
              </button>

              <button
                type="button"
                onClick={() => toggleFlag(currentIndex)}
                className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isCurrentFlagged
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Flag className={`w-4 h-4 ${isCurrentFlagged ? 'fill-amber-500 text-amber-500' : ''}`} />
                {isCurrentFlagged ? 'Đã đánh dấu' : 'Đánh dấu'}
              </button>

              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                Câu tiếp theo <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <LayoutGrid className="w-4 h-4 text-blue-600" /> Danh sách câu
              </button>
            </div>
          </div>
        </main>

        {/* Question Navigator Drawer / Sheet */}
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Bảng câu hỏi ({questions.length} câu)</h3>
                  <p className="text-xs text-slate-500">Đã làm: {answeredCount} • Còn lại: {questions.length - answeredCount}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Part Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <button
                  type="button"
                  onClick={() => setNavPartFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    navPartFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả
                </button>
                {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNavPartFilter(p)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      navPartFilter === p ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Part {p}
                  </button>
                ))}
              </div>

              {/* Question Matrix */}
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-5 sm:grid-cols-8 gap-2 py-2">
                {questions.map((q, idx) => {
                  if (navPartFilter !== 'all' && q.part !== navPartFilter) return null;
                  const qKey = q.id || `sim-${activeTestId}-q${q.question_number || idx + 1}`;
                  const isAnswered = Boolean(answers[qKey]);
                  const isCurrent = currentIndex === idx;
                  const isFlag = Boolean(flagged[idx]);

                  let stateStyle = 'bg-slate-100 text-slate-700 border-slate-200/80 hover:bg-slate-200';
                  if (isCurrent && isAnswered) {
                    stateStyle = 'bg-blue-600 text-white ring-2 ring-amber-400 font-black shadow-xs';
                  } else if (isCurrent) {
                    stateStyle = 'bg-blue-50 text-blue-900 border-blue-400 ring-2 ring-blue-600 font-black shadow-xs';
                  } else if (isFlag) {
                    stateStyle = 'bg-amber-100 text-amber-900 border-2 border-amber-400 font-bold';
                  } else if (isAnswered) {
                    stateStyle = 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleJumpToQuestion(idx)}
                      className={`h-9 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer relative ${stateStyle}`}
                      title={`Câu ${idx + 1} (Part ${q.part || 1})`}
                    >
                      {idx + 1}
                      {isFlag && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-4 gap-2 text-[10px] text-slate-500 text-center">
                <span className="flex items-center justify-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-blue-600" /> Đã chọn
                </span>
                <span className="flex items-center justify-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-300" /> Chưa làm
                </span>
                <span className="flex items-center justify-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-blue-50 border border-blue-600" /> Đang xem
                </span>
                <span className="flex items-center justify-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-400" /> Đánh dấu
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Confirmation Modal */}
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Xác nhận nộp bài thi?</h3>
                <p className="text-xs text-slate-500">
                  Bạn đã trả lời <strong className="text-blue-600">{answeredCount}</strong> / {questions.length} câu hỏi.
                  {answeredCount < questions.length && (
                    <span className="block text-amber-600 font-medium mt-1">
                      Còn {questions.length - answeredCount} câu chưa điền đáp án!
                    </span>
                  )}
                  {flaggedCount > 0 && (
                    <span className="block text-amber-700 font-medium">
                      Có {flaggedCount} câu đang được đánh dấu cần xem lại.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Tiếp tục làm bài
                </button>
                <button
                  type="button"
                  onClick={handleSubmitTest}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Đang chấm điểm...' : 'Nộp bài ngay'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


  // 3. Main Catalog / Filter View
  return (
    <div className="min-h-screen bg-slate-50 py-8 selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Tabs Bar: Kho đề thi / Lịch sử làm đề / Lịch sử câu hỏi */}
        <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setCatalogTab('catalog')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              catalogTab === 'catalog'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Kho đề thi ({tests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCatalogTab('test_history')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              catalogTab === 'test_history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Lịch sử làm đề ({testHistoryList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCatalogTab('question_history')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              catalogTab === 'question_history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Lịch sử câu hỏi ({questionHistoryList.length})</span>
          </button>
        </div>

        {/* ----------------- TAB 1: KHO ĐỀ THI ----------------- */}
        {catalogTab === 'catalog' && (
          <div className="space-y-8">
            {/* Filter & Search Bar */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          {/* Top Search & Primary Actions */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên đề, mã đề (VD: ETS-2024), part (VD: Part 5), topic..."
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-by-select" className="text-xs font-semibold text-slate-500 shrink-0 hidden sm:inline">
                Sắp xếp:
              </label>
              <select
                id="sort-by-select"
                aria-label="Sắp xếp đề thi"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all cursor-pointer"
              >
                <option value="name_asc">Tên đề: A → Z (Mặc định)</option>
                <option value="name_desc">Tên đề: Z → A</option>
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="popular">Nhiều lượt làm nhất</option>
                <option value="highest_score">Điểm cao nhất của tôi</option>
                <option value="unattempted">Đề chưa làm</option>
                <option value="in_progress">Đề đang làm dở</option>
              </select>

              {/* Advanced Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                className={`px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  showAdvancedFilters || activeFiltersCount > 0
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Bộ lọc</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center ml-0.5">
                    {activeFiltersCount}
                  </span>
                )}
                {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
              </button>
            </div>
          </div>

          {/* Primary Skill Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {[
              { id: 'all', label: 'Tất cả đề' },
              { id: 'full_test', label: 'Full Test (200 câu)' },
              { id: 'listening', label: 'TOEIC Listening' },
              { id: 'reading', label: 'TOEIC Reading' },
              { id: 'part', label: 'Luyện theo Part' },
              { id: 'sw', label: 'Speaking & Writing' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id as SkillCategory);
                  if (cat.id !== 'part' && selectedPart !== 'all') {
                    setSelectedPart('all');
                  }
                }}
                className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Part Pills (when Part category selected or filter active) */}
          {(selectedCategory === 'part' || selectedPart !== 'all') && (
            <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none animate-in fade-in duration-200">
              <span className="text-slate-500 font-bold px-1 shrink-0">Chọn Part:</span>
              <button
                type="button"
                onClick={() => setSelectedPart('all')}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                  selectedPart === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Tất cả Part
              </button>
              {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPart(p)}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                    selectedPart === p ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Part {p}
                </button>
              ))}
            </div>
          )}

          {/* Collapsible Advanced Filters Drawer */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 text-xs">
                {/* 1. Difficulty */}
                <div className="space-y-1">
                  <label htmlFor="filter-difficulty-select" className="font-bold text-slate-700 block">Độ khó</label>
                  <select
                    id="filter-difficulty-select"
                    aria-label="Lọc theo độ khó"
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value as DifficultyFilter)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="all">Tất cả độ khó</option>
                    <option value="Easy">Dễ (Easy)</option>
                    <option value="Medium">Trung bình (Medium)</option>
                    <option value="Hard">Khó (Hard)</option>
                  </select>
                </div>

                {/* 2. Question count */}
                <div className="space-y-1">
                  <label htmlFor="filter-qcount-select" className="font-bold text-slate-700 block">Số lượng câu</label>
                  <select
                    id="filter-qcount-select"
                    aria-label="Lọc theo số câu hỏi"
                    value={selectedQuestionCount}
                    onChange={(e) => setSelectedQuestionCount(e.target.value as QuestionCountFilter)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="all">Tất cả số câu</option>
                    <option value="under_50">Dưới 50 câu</option>
                    <option value="50_to_100">50 - 100 câu</option>
                    <option value="200">200 câu (Full)</option>
                  </select>
                </div>

                {/* 3. Duration */}
                <div className="space-y-1">
                  <label htmlFor="filter-duration-select" className="font-bold text-slate-700 block">Thời lượng</label>
                  <select
                    id="filter-duration-select"
                    aria-label="Lọc theo thời lượng"
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(e.target.value as DurationFilter)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="all">Tất cả thời lượng</option>
                    <option value="under_45">Dưới 45 phút</option>
                    <option value="45_to_75">45 - 75 phút</option>
                    <option value="120">120 phút (Chuẩn ETS)</option>
                  </select>
                </div>

                {/* 4. Status */}
                <div className="space-y-1">
                  <label htmlFor="filter-status-select" className="font-bold text-slate-700 block">Trạng thái làm</label>
                  <select
                    id="filter-status-select"
                    aria-label="Lọc theo trạng thái bài làm"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as StatusFilter)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="unattempted">Chưa làm</option>
                    <option value="in_progress">Đang làm dở</option>
                    <option value="completed">Đã hoàn thành</option>
                  </select>
                </div>

                {/* 5. Recent score */}
                <div className="space-y-1">
                  <label htmlFor="filter-recent-score-select" className="font-bold text-slate-700 block">Điểm gần nhất</label>
                  <select
                    id="filter-recent-score-select"
                    aria-label="Lọc theo điểm gần nhất"
                    value={selectedRecentScore}
                    onChange={(e) => setSelectedRecentScore(e.target.value as ScoreRangeFilter)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="all">Tất cả mức điểm</option>
                    <option value="under_500">Dưới 500</option>
                    <option value="500_695">500 - 695</option>
                    <option value="700_850">700 - 850</option>
                    <option value="855_990">855 - 990 (Xuất sắc)</option>
                  </select>
                </div>

                {/* 6. Highest score */}
                <div className="space-y-1">
                  <label htmlFor="filter-highest-score-select" className="font-bold text-slate-700 block">Điểm cao nhất</label>
                  <select
                    id="filter-highest-score-select"
                    aria-label="Lọc theo điểm cao nhất"
                    value={selectedHighestScore}
                    onChange={(e) => setSelectedHighestScore(e.target.value as ScoreRangeFilter)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="all">Tất cả mức điểm</option>
                    <option value="under_500">Dưới 500</option>
                    <option value="500_695">500 - 695</option>
                    <option value="700_850">700 - 850</option>
                    <option value="855_990">855 - 990 (Xuất sắc)</option>
                  </select>
                </div>
              </div>

              {/* Reset Filters Action */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Đang lọc theo <strong className="text-blue-600">{activeFiltersCount}</strong> điều kiện
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Đặt lại tất cả bộ lọc</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Counter & Catalog Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span>
              Tìm thấy <strong className="text-blue-600 font-bold">{filteredTests.length}</strong> đề thi phù hợp
            </span>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-blue-600 hover:underline font-bold cursor-pointer"
              >
                Xóa tất cả bộ lọc ({activeFiltersCount})
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-12 text-center text-slate-400">
              <div className="col-span-full flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-600">Đang tải danh sách đề thi ETS...</p>
              </div>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Filter className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">Không tìm thấy đề thi phù hợp</h3>
                <p className="text-xs text-slate-500">
                  Hãy thử điều chỉnh hoặc xóa bớt tiêu chí lọc để xem thêm các bộ đề thi TOEIC khác.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTests.map((test) => {
                const stats = getTestStats(test.id);
                const displayTitle = cleanBranding(test.title);

                return (
                  <div
                    key={test.id}
                    className="bg-white rounded-3xl border border-slate-200/80 hover:border-blue-400 hover:shadow-lg transition-all duration-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 relative group"
                  >
                    <div className="space-y-3.5">
                      {/* Card Header Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                            {test.id.toUpperCase().replace(/^DAUTOEIC_|^STUDY4_/, 'ETS-')}
                          </span>

                          {test.is_vip && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[11px] flex items-center gap-1 shadow-2xs">
                              <Crown className="w-3 h-3 text-amber-500 fill-amber-500" /> VIP Pro
                            </span>
                          )}

                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                              test.difficulty === 'Easy'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : test.difficulty === 'Hard'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            }`}
                          >
                            {test.difficulty}
                          </span>
                        </div>

                        {/* Status badge */}
                        {stats.isInProgress ? (
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-600" /> Đang làm dở
                          </span>
                        ) : stats.isCompleted ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã làm
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-semibold">
                            Chưa làm
                          </span>
                        )}
                      </div>

                      {/* Card Title */}
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                        {displayTitle}
                      </h3>

                      {/* Meta Chips */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{test.duration_minutes} phút</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{test.total_questions} câu hỏi</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Headphones className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {test.test_type === 'lr_full'
                              ? 'Full Test L&R'
                              : test.test_type === 'sw_speaking'
                              ? 'Speaking Test'
                              : test.test_type === 'sw_writing'
                              ? 'Writing Test'
                              : 'Luyện đề chuẩn'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{test.attempts || 128} lượt thi</span>
                        </div>
                      </div>

                      {/* Audio & Image Availability Badges (Phase 11) */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {(test.has_audio ?? (test.test_type === 'lr_full' || test.test_type === 'sw_speaking')) ? (
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/80 text-[10px] font-bold flex items-center gap-1">
                            <Headphones className="w-3 h-3 text-sky-600" /> Audio có sẵn
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-medium flex items-center gap-1">
                            <VolumeX className="w-3 h-3 text-slate-400" /> Audio đang cập nhật
                          </span>
                        )}

                        {(test.has_image ?? (test.test_type !== 'sw_writing')) ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10px] font-bold flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-indigo-600" /> Hình ảnh có sẵn
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-medium flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-slate-400 opacity-60" /> Không có hình
                          </span>
                        )}
                      </div>

                      {/* Completed Scores Box */}
                      {stats.isCompleted && (
                        <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-emerald-800 text-[11px] block">Điểm gần nhất</span>
                            <strong className="text-emerald-700 text-sm font-black">{stats.recentScore}/990</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-800 text-[11px] block">Điểm cao nhất</span>
                            <strong className="text-purple-700 text-sm font-black">{stats.highestScore}/990</strong>
                          </div>
                        </div>
                      )}

                      {/* In-progress bar */}
                      {stats.isInProgress && stats.inProg && (
                        <div className="p-3 bg-sky-50/50 rounded-2xl border border-sky-100/80 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-[11px] text-sky-800 font-semibold">
                            <span>Tiến độ đã lưu:</span>
                            <strong>
                              {stats.inProg.answeredCount} / {stats.inProg.totalQuestions} câu
                            </strong>
                          </div>
                          <div className="w-full h-1.5 bg-sky-200/60 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-600 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.round(
                                  (stats.inProg.answeredCount / (stats.inProg.totalQuestions || 200)) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      {stats.isInProgress ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartExam(test.id)}
                            className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" /> Tiếp tục làm bài
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTestForModal(test);
                              setModalModeTab('exam');
                            }}
                            className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                            title="Chọn chế độ khác"
                          >
                            Đổi
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTestForModal(test);
                              setModalModeTab('exam');
                            }}
                            className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" /> Thi thử
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTestForModal(test);
                              setModalModeTab('practice');
                            }}
                            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Luyện tập
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )}

    {/* ----------------- TAB 2: LỊCH SỬ LÀM ĐỀ ----------------- */}
    {catalogTab === 'test_history' && (
      <div className="space-y-6">
        {/* Summary metrics for Test History */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <FileText className="w-4 h-4 text-blue-600" />
              Tổng đề đã làm
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1.5">
              {testHistoryList.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">lượt thi hoàn tất</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Award className="w-4 h-4 text-purple-600" />
              Điểm cao nhất
            </div>
            <div className="text-2xl font-black text-purple-600 mt-1.5">
              {testHistoryList.length > 0 ? `${Math.max(0, ...testHistoryList.map(t => Number(t?.totalScore) || 0))}/990` : '--'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">kỷ lục cá nhân</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Clock className="w-4 h-4 text-blue-600" />
              Điểm gần nhất
            </div>
            <div className="text-2xl font-black text-blue-600 mt-1.5">
              {testHistoryList.length > 0 && testHistoryList[0]?.totalScore !== undefined ? `${testHistoryList[0].totalScore}/990` : '--'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">bài làm mới nhất</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Tỉ lệ đúng TB
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1.5">
              {testHistoryList.length > 0
                ? `${Math.round(testHistoryList.reduce((acc, t) => acc + (Number(t?.accuracy) || 0), 0) / Math.max(1, testHistoryList.length))}%`
                : '--'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">độ chính xác trung bình</div>
          </div>
        </div>

        {/* Filter & Search Bar for Test History */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder="Tìm theo tên đề hoặc mã đề..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={historyModeFilter}
              onChange={(e) => setHistoryModeFilter(e.target.value as any)}
              aria-label="Lọc chế độ thi"
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden"
            >
              <option value="all">Tất cả chế độ</option>
              <option value="full">Full Test (200 câu)</option>
              <option value="listening">Listening (100 câu)</option>
              <option value="reading">Reading (100 câu)</option>
              <option value="part">Luyện từng Part</option>
            </select>

            <select
              value={historySortBy}
              onChange={(e) => setHistorySortBy(e.target.value as any)}
              aria-label="Sắp xếp kết quả"
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden"
            >
              <option value="latest">Mới nhất trước</option>
              <option value="score_high">Điểm cao nhất</option>
              <option value="score_low">Điểm thấp nhất</option>
            </select>
          </div>
        </div>

        {/* Test History List */}
        {filteredTestHistory.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <Clock className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Chưa có bài thi nào được ghi nhận</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Bạn chưa làm đề thi nào theo bộ lọc này. Hãy vào Kho đề thi để thử sức với các bài thi chuẩn format ETS!
            </p>
            <button
              type="button"
              onClick={() => setCatalogTab('catalog')}
              className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Vào kho đề thi ngay
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTestHistory.map((item) => {
              const modeLabel =
                item.mode === 'listening'
                  ? 'Listening'
                  : item.mode === 'reading'
                  ? 'Reading'
                  : item.mode === 'part'
                  ? `Part ${item.targetPart || 1}`
                  : 'Full Test';

                

return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                        {modeLabel}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                        {cleanBranding(item.testTitle || item.testId)}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {safeFormatDateTime(item.completedAt)}
                      </span>
                      <span>•</span>
                      <span>Thời gian: {Math.max(1, Math.round((item.timeSpentSeconds || 0) / 60))} phút</span>
                      <span>•</span>
                      <span>
                        Số câu đúng: <strong className="text-slate-800">{item.totalCorrect}/{item.totalQuestions}</strong> ({item.accuracy}%)
                      </span>
                    </div>

                    {(item.listeningScore !== undefined || item.readingScore !== undefined) && (
                      <div className="flex items-center gap-3 pt-1 text-xs">
                        {item.listeningScore !== undefined && (
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                            LC: {item.listeningScore} pts {item.listeningCorrect ? `(${item.listeningCorrect})` : ''}
                          </span>
                        )}
                        {item.readingScore !== undefined && (
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold text-[11px]">
                            RC: {item.readingScore} pts {item.readingCorrect ? `(${item.readingCorrect})` : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Score Badge and Actions */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 justify-between md:justify-end">
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-black text-blue-600">
                        {item.totalScore}
                        <span className="text-xs text-slate-400 font-normal"> / 990</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Điểm đạt được</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleReviewPastAttempt(item)}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        title="Xem lại chi tiết từng câu hỏi và lời giải"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem lại</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartExam(item.testId, item.mode as any, item.targetPart)}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Làm lại đề thi này"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAttempt(item.id)}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Xóa bài thi khỏi lịch sử"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

    {/* ----------------- TAB 3: LỊCH SỬ CÂU HỎI ----------------- */}
    {catalogTab === 'question_history' && (
      <div className="space-y-6">
        {/* Summary metrics for Question History */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Target className="w-4 h-4 text-blue-600" />
              Tổng câu đã luyện
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1.5">
              {questionHistoryList.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">lượt trả lời câu hỏi</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Số câu làm đúng
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1.5">
              {questionHistoryList.filter(q => q.isCorrect).length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {questionHistoryList.length > 0
                ? `${Math.round((questionHistoryList.filter(q => q.isCorrect).length / questionHistoryList.length) * 100)}% độ chính xác`
                : '--'}
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <X className="w-4 h-4 text-rose-500" />
              Số câu làm sai
            </div>
            <div className="text-2xl font-black text-rose-600 mt-1.5">
              {questionHistoryList.filter(q => !q.isCorrect).length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">cần ôn luyện lại</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Award className="w-4 h-4 text-purple-600" />
              Đã từng làm đúng
            </div>
            <div className="text-2xl font-black text-purple-600 mt-1.5">
              {historyStore.getCorrectQuestionsList().length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">câu hỏi đã chinh phục</div>
          </div>
        </div>

        {/* Filter & Search Bar for Question History */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={qHistorySearch}
                onChange={(e) => setQHistorySearch(e.target.value)}
                placeholder="Tìm theo nội dung câu hỏi, mã câu..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setQHistoryStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  qHistoryStatusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({questionHistoryList.length})
              </button>
              <button
                type="button"
                onClick={() => setQHistoryStatusFilter('correct')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  qHistoryStatusFilter === 'correct'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chỉ câu đúng ({questionHistoryList.filter(q => q.isCorrect).length})
              </button>
              <button
                type="button"
                onClick={() => setQHistoryStatusFilter('wrong')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  qHistoryStatusFilter === 'wrong'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chỉ câu sai ({questionHistoryList.filter(q => !q.isCorrect).length})
              </button>
            </div>
          </div>

          {/* Part filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Part:
            </span>
            <button
              type="button"
              onClick={() => setQHistoryPartFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                qHistoryPartFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả
            </button>
            {[1, 2, 3, 4, 5, 6, 7].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setQHistoryPartFilter(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                  qHistoryPartFilter === p
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Part {p}
              </button>
            ))}
          </div>
        </div>

        {/* Question History Cards List */}
        {filteredQuestionHistory.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <Target className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Chưa có câu hỏi nào theo bộ lọc này</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hãy luyện tập các phần Nghe, Đọc hoặc thi thử để hệ thống tự động lưu trữ câu hỏi và phân tích lịch sử làm bài của bạn.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuestionHistory.slice(0, qHistoryLimit).map((item) => (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  item.isCorrect
                    ? 'bg-white border-slate-200/80 hover:border-emerald-300'
                    : 'bg-white border-slate-200/80 hover:border-rose-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-100 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                      Part {item.part} • {item.part <= 4 ? 'Listening' : 'Reading'}
                    </span>
                    {item.questionNumber && (
                      <span className="text-xs font-bold text-slate-600">
                        Câu #{item.questionNumber}
                      </span>
                    )}
                    {item.testId && (
                      <span className="text-[11px] text-slate-400">
                        ({item.testId})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">
                      {safeFormatDateTime(item.createdAt)}
                    </span>
                    {item.isCorrect ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã làm đúng
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold inline-flex items-center gap-1 shadow-2xs">
                        <X className="w-3.5 h-3.5 text-rose-600" /> Làm sai
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 space-y-2.5">
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                    {item.questionText || `Câu hỏi Part ${item.part} chuẩn format ETS`}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 font-medium">Bạn chọn:</span>
                      <strong className={item.isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                        {item.selectedOption || '--'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-emerald-700 font-medium">Đáp án chuẩn:</span>
                      <strong className="text-emerald-800 font-bold">{item.correctOption || '--'}</strong>
                    </div>

                    {item.testId && (
                      <button
                        type="button"
                        onClick={() => handleStartExam(item.testId || "")}
                        className="ml-auto text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Luyện đề này</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredQuestionHistory.length > qHistoryLimit && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setQHistoryLimit((prev) => prev + 30)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  Xem thêm 30 câu hỏi (còn lại {filteredQuestionHistory.length - qHistoryLimit} câu)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )}

        {/* Mode & Part Selection Modal (Screenshots 1 & 2) */}
        {selectedTestForModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="min-w-0 pr-3">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {cleanBranding(selectedTestForModal.title)}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Chọn chế độ làm bài phù hợp với mục tiêu của bạn
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTestForModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Tabs: [ 📝 Luyện thi ] vs [ 🎯 Luyện tập ] */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/90 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setModalModeTab('exam')}
                  className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    modalModeTab === 'exam'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Luyện thi
                </button>
                <button
                  type="button"
                  onClick={() => setModalModeTab('practice')}
                  className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    modalModeTab === 'practice'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Target className="w-4 h-4" /> Luyện tập
                </button>
              </div>

              {modalModeTab === 'exam' ? (
                /* ================= TAB 1: LUYỆN THI (Screenshot 2) ================= */
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Top 3 Quick Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Full Test Card */}
                    <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-300 transition-all flex flex-col justify-between space-y-3">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">Full Test</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Làm như thi thật</div>
                        <div className="text-[11px] font-semibold text-slate-600 mt-2 flex items-center gap-1.5 flex-wrap">
                          <span>⏱ 120 phút</span>
                          <span>•</span>
                          <span>📄 200 câu</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartExam(selectedTestForModal.id, 'full')}
                        className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu
                      </button>
                    </div>

                    {/* Thi Listening Card */}
                    <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-300 transition-all flex flex-col justify-between space-y-3">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">Thi Listening</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Thi riêng phần nghe</div>
                        <div className="text-[11px] font-semibold text-slate-600 mt-2 flex items-center gap-1.5 flex-wrap">
                          <span>⏱ 45 phút</span>
                          <span>•</span>
                          <span>📄 100 câu</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartExam(selectedTestForModal.id, 'listening')}
                        className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu
                      </button>
                    </div>

                    {/* Thi Reading Card */}
                    <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-300 transition-all flex flex-col justify-between space-y-3">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">Thi Reading</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Thi riêng phần đọc</div>
                        <div className="text-[11px] font-semibold text-slate-600 mt-2 flex items-center gap-1.5 flex-wrap">
                          <span>⏱ 75 phút</span>
                          <span>•</span>
                          <span>📄 100 câu</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartExam(selectedTestForModal.id, 'reading')}
                        className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu
                      </button>
                    </div>
                  </div>

                  {/* Section: Thi theo Part */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Thi theo Part</h4>
                        <p className="text-[11px] text-slate-500">Chọn Part cụ thể để thi thử</p>
                      </div>
                      <button
                        type="button"
                        disabled={examSelectedParts.length === 0}
                        onClick={() => {
                          const suggestedSecs = examSelectedParts.reduce(
                            (acc, p) => acc + (TOEIC_PARTS_INFO[p]?.recommendedMins || 10) * 60,
                            0
                          );
                          const chosenSecs = isCustomExamTime ? customExamMinutes * 60 : suggestedSecs;
                          handleStartExam(selectedTestForModal.id, 'parts', examSelectedParts, chosenSecs);
                        }}
                        className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu
                      </button>
                    </div>

                    {/* Listening parts */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        LISTENING
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map((p) => {
                          const isChecked = examSelectedParts.includes(p);
                          const info = TOEIC_PARTS_INFO[p];
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setExamSelectedParts((prev) =>
                                  isChecked
                                    ? prev.length > 1
                                      ? prev.filter((x) => x !== p)
                                      : prev
                                    : [...prev, p].sort((a, b) => a - b)
                                );
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                isChecked
                                  ? 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-2xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <div>
                                <div className="text-xs font-bold">Part {p}</div>
                                <div className="text-[10px] text-slate-500 font-normal">({info?.defaultQs || 0} câu)</div>
                              </div>
                              <span
                                className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                                  isChecked ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
                                }`}
                              >
                                {isChecked && '✓'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reading parts */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        READING
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {[5, 6, 7].map((p) => {
                          const isChecked = examSelectedParts.includes(p);
                          const info = TOEIC_PARTS_INFO[p];
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setExamSelectedParts((prev) =>
                                  isChecked
                                    ? prev.length > 1
                                      ? prev.filter((x) => x !== p)
                                      : prev
                                    : [...prev, p].sort((a, b) => a - b)
                                );
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                isChecked
                                  ? 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold shadow-2xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <div>
                                <div className="text-xs font-bold">Part {p}</div>
                                <div className="text-[10px] text-slate-500 font-normal">({info?.defaultQs || 0} câu)</div>
                              </div>
                              <span
                                className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                                  isChecked ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
                                }`}
                              >
                                {isChecked && '✓'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Row: Thời gian làm bài with toggle Tự đặt */}
                    {(() => {
                      const suggestedMins = examSelectedParts.reduce(
                        (acc, p) => acc + (TOEIC_PARTS_INFO[p]?.recommendedMins || 10),
                        0
                      );
                      const totalQs = examSelectedParts.reduce(
                        (acc, p) => acc + (TOEIC_PARTS_INFO[p]?.defaultQs || 0),
                        0
                      );

                      return (
                        <div className="pt-3 border-t border-slate-100 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-slate-500" /> Thời gian làm bài:
                            </span>

                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer font-medium">
                                <span>Tự đặt:</span>
                                <input
                                  type="checkbox"
                                  checked={isCustomExamTime}
                                  onChange={(e) => {
                                    setIsCustomExamTime(e.target.checked);
                                    if (e.target.checked && customExamMinutes <= 0) {
                                      setCustomExamMinutes(suggestedMins);
                                    }
                                  }}
                                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                                />
                              </label>

                              {isCustomExamTime ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={180}
                                    value={customExamMinutes}
                                    onChange={(e) => setCustomExamMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-center"
                                  />
                                  <span className="text-xs text-slate-600 font-semibold">phút</span>
                                </div>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                                  ⏱ {suggestedMins} phút (thời gian đề xuất)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-1">
                            <span>
                              📄 <strong>{totalQs}</strong> câu hỏi • Đã chọn {examSelectedParts.length} part
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                /* ================= TAB 2: LUYỆN TẬP (Screenshot 1) ================= */
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Notice banner */}
                  <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200/80 text-blue-900 text-xs sm:text-sm font-medium flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Chế độ Luyện tập: Xem đáp án và giải thích ngay sau mỗi câu/nhóm câu hỏi.</span>
                  </div>

                  {/* Section: Chọn Part để luyện tập */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Chọn Part để luyện tập</h4>
                        <p className="text-[11px] text-slate-500">Hỗ trợ tra từ, lưu từ vựng, song ngữ và dẫn chứng</p>
                      </div>
                      <button
                        type="button"
                        disabled={practiceSelectedParts.length === 0}
                        onClick={() => handleStartPractice(selectedTestForModal.id, practiceSelectedParts)}
                        className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu
                      </button>
                    </div>

                    {/* Option: Chọn tất cả 7 Part */}
                    {(() => {
                      const isAll7 = practiceSelectedParts.length === 7;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setPracticeSelectedParts(isAll7 ? [1] : [1, 2, 3, 4, 5, 6, 7]);
                          }}
                          className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isAll7
                              ? 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                                isAll7 ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
                              }`}
                            >
                              {isAll7 && '✓'}
                            </span>
                            <span className="text-xs font-bold">Chọn tất cả 7 Part (200 câu)</span>
                          </div>
                          <span className="text-[11px] text-blue-600 font-semibold">Full Test</span>
                        </button>
                      );
                    })()}

                    {/* Part list checkboxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                        const isChecked = practiceSelectedParts.includes(p);
                        const info = TOEIC_PARTS_INFO[p];
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setPracticeSelectedParts((prev) =>
                                isChecked
                                  ? prev.length > 1
                                    ? prev.filter((x) => x !== p)
                                    : prev
                                  : [...prev, p].sort((a, b) => a - b)
                              );
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                              isChecked
                                ? 'bg-blue-50/90 border-blue-600 text-blue-900 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                                  isChecked ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
                                }`}
                              >
                                {isChecked && '✓'}
                              </span>
                              <div>
                                <span className="font-bold">{info?.title || `Part ${p}`}</span>
                                <span className="text-[11px] text-slate-500 block font-normal">{info?.desc}</span>
                              </div>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {info?.defaultQs || 0} câu
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    {(() => {
                      const totalQs = practiceSelectedParts.length === 7
                        ? 200
                        : practiceSelectedParts.reduce(
                            (acc, p) => acc + (TOEIC_PARTS_INFO[p]?.defaultQs || 0),
                            0
                          );
                      return (
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
                          <span>
                            📄 <strong>{totalQs}</strong> câu hỏi • Đã chọn {practiceSelectedParts.length} part
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartPractice(selectedTestForModal.id, practiceSelectedParts)}
                            className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-current" /> Bắt đầu luyện
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const MockTestsPage: React.FC<MockTestsPageProps> = (props) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Kho Đề thi thử TOEIC"
        featureDesc="Thi thử 200 câu format chuẩn ETS với audio phòng thi, đồng hồ đếm ngược và chấm điểm tự động. Vui lòng đăng nhập để bắt đầu thi thử."
        onNavigate={props.onNavigate}
        onOpenAuth={props.onOpenAuth}
        onOpenRBAC={props.onOpenRBAC}
      />
    );
  }

  return <MockTestsPageInner {...props} />;
};
