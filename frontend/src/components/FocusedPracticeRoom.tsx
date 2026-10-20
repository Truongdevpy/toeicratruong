import { AuthRequiredGate } from './AuthRequiredGate';
import DOMPurify from 'dompurify';
import { MorphPlayPause } from './MorphIcon';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Check,
  X,
  Star,
  MessageSquare,
  Flag,
  ShoppingBag,
  BookOpen,
  Search,
  Crown,
  PenTool,
  FileText,
  Zap,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  LayoutGrid,
  Bell,
  Sparkles,
  Lightbulb,
  Settings,
  Bot
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { QuestionImage } from './QuestionImage';
import { historyStore } from '../services/historyStore';
import { useSettings } from '../context/SettingsContext';
import { practiceProgressStore } from '../services/practiceProgressStore';
import { VocabBasketModal } from './VocabBasketModal';
import { RichDictionaryCard, TranslateResult, WordDetail } from './RichDictionaryCard';
import { extractEvidenceFromQuestion, highlightPassageWithEvidence, EvidenceItem } from '../utils/evidenceExtractor';


// Helper to clean options and questions so they never duplicate or show raw letter prefixes
function cleanDisplayQuestionText(text?: string, part?: number, qNum?: number | string): string {
  if (!text) return '';
  let clean = text.trim();
  if (part === 1) {
    return `Câu ${qNum || ''}: Nghe 4 phương án và chọn câu miêu tả đúng nhất cho bức tranh.`;
  }
  if (part === 2) {
    if (!clean || clean.startsWith('Câu') || /^[A-D.\s]+$/.test(clean)) {
      return `Câu ${qNum || ''}: Nghe câu hỏi và 3 câu phản hồi trong audio để chọn đáp án đúng.`;
    }
  }
  if (part === 6) {
    if (/^[A-D][\.\)]/i.test(clean) || !clean || /^[A-D.\s]+$/.test(clean)) {
      return `Chọn từ hoặc câu thích hợp nhất để điền vào vị trí [${qNum || ''}].`;
    }
  }
  // Strip trailing embedded options like " A. of B. from C. in D. for"
  clean = clean.replace(/\s+[A-D][\.\)]\s+.*$/i, '').trim();
  return clean;
}

function cleanOptionText(text?: string, letter?: string): string {
  if (!text) return '';
  let clean = text.trim();
  if (letter) {
    clean = clean.replace(new RegExp(`^\\(?${letter}[\\.\\)\\:\\-]?\\s*`, 'i'), '').trim();
  }
  return clean;
}

interface WordDiffItem {
  status: 'correct' | 'wrong' | 'missing' | 'extra';
  word: string;
  expected?: string;
}

interface DictationResult {
  accuracy: number;
  isMatch: boolean;
  correctCount: number;
  wrongCount: number;
  missingCount: number;
  extraCount: number;
  diff: WordDiffItem[];
  targetText: string;
  userText: string;
}

function cleanWordForDiff(w: string): string {
  return w.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
}

function computeWordDiff(targetText: string, userText: string): DictationResult {
  const cleanTarget = targetText.replace(/^\([A-D]\)\s*|^[A-D][.:]\s*/i, '').trim();
  const cleanUser = userText.replace(/^\([A-D]\)\s*|^[A-D][.:]\s*/i, '').trim();

  const targetWords = cleanTarget.split(/\s+/).filter(Boolean);
  const userWords = cleanUser.split(/\s+/).filter(Boolean);

  const tClean = targetWords.map(cleanWordForDiff);
  const uClean = userWords.map(cleanWordForDiff);

  const m = tClean.length;
  const n = uClean.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (tClean[i] === uClean[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  let i = m;
  let j = n;
  const diffRev: WordDiffItem[] = [];
  let correctCount = 0;
  let wrongCount = 0;
  let missingCount = 0;
  let extraCount = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tClean[i - 1] === uClean[j - 1]) {
      diffRev.push({
        status: 'correct',
        word: userWords[j - 1],
        expected: targetWords[i - 1]
      });
      correctCount++;
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i - 1][j - 1] >= dp[i - 1][j] && dp[i - 1][j - 1] >= dp[i][j - 1]) {
      diffRev.push({
        status: 'wrong',
        word: userWords[j - 1],
        expected: targetWords[i - 1]
      });
      wrongCount++;
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffRev.push({
        status: 'extra',
        word: userWords[j - 1],
        expected: ''
      });
      extraCount++;
      j--;
    } else if (i > 0) {
      diffRev.push({
        status: 'missing',
        word: targetWords[i - 1],
        expected: targetWords[i - 1]
      });
      missingCount++;
      i--;
    }
  }

  const diff = diffRev.reverse();
  const total = Math.max(1, targetWords.length);
  const accuracy = Math.round((correctCount / total) * 100);
  const isMatch = accuracy >= 80;

  return {
    accuracy,
    isMatch,
    correctCount,
    wrongCount,
    missingCount,
    extraCount,
    diff,
    targetText: cleanTarget,
    userText: cleanUser
  };
}

const PART_TITLES: Record<number, string> = {
  1: 'Photographs',
  2: 'Question - Response',
  3: 'Conversations',
  4: 'Short Talks',
  5: 'Incomplete Sentences',
  6: 'Text Completion',
  7: 'Reading Comprehension',
};

export interface FocusedPracticeRoomProps {
  title: string;
  levelBadge?: string;
  levelKey?: string;
  partNumber: number;
  questions: Question[];
  passages?: any[];
  initialIndex?: number;
  onExit: () => void;
  onNavigate?: (path: string) => void;
}

interface SavedVocabItem {
  word: string;
  meaning: string;
  context: string;
  savedAt: string;
}

function playAudioChime(isCorrect: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (isCorrect) {
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } else {
      const freqs = [174.61, 146.83];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.15, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.22);
      });
    }
  } catch {}
}

const FocusedPracticeRoomInner: React.FC<FocusedPracticeRoomProps> = ({
  title,
  levelBadge = 'Lv.1',
  levelKey,
  partNumber: rawPartNumber,
  questions = [],
  passages = [],
  initialIndex = 0,
  onExit,
  onNavigate,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);

  // Derive robust partNumber: prioritize actual question/passage data over raw prop fallback
  const firstQ = questions[0] || passages[0]?.questions?.[0];
  const derivedPart = Number(
    firstQ?.part ||
    passages[0]?.part ||
    (rawPartNumber && Number(rawPartNumber) > 0 ? Number(rawPartNumber) : null) ||
    (title?.match(/Part\s*(\d)/i) ? Number(title.match(/Part\s*(\d)/i)![1]) : null) ||
    5
  );
  const partNumber = derivedPart;
  const pNum = derivedPart;

  const { user } = useAuth();
  const isVipUser = Boolean(user?.role === 'vip' || user?.role === 'admin' || user?.is_vip);

  // 1. Group passages or use passed-in passages (MUST be initialized before any dependent logic)
  const effectivePassages = useMemo(() => {
    if (Array.isArray(passages) && passages.length > 0) return passages;
    if (![3, 4, 6, 7].includes(pNum) || !questions || questions.length === 0) return [];
    const groups: any[] = [];
    let currentGroup: any = null;
    questions.forEach((q) => {
      const qAudio = q.audio_url || (q as any).local_audio || (q as any).audio;
      const qPassageId = (q as any).passage_id;
      const qPassageText = q.passage_text;

      const belongsToCurrent = currentGroup && (
        (qPassageId && currentGroup.passage_id === qPassageId) ||
        (qAudio && currentGroup.audio_url === qAudio) ||
        (qPassageText && currentGroup.passage_text === qPassageText) ||
        (!qPassageId && !qAudio && !qPassageText && currentGroup.questions.length < (pNum === 6 ? 4 : 3))
      );

      if (belongsToCurrent && currentGroup.questions.length < 5) {
        currentGroup.questions.push(q);
        if (!currentGroup.image_url && q.image_url) currentGroup.image_url = q.image_url;
        if (!currentGroup.passage_text && q.passage_text) currentGroup.passage_text = q.passage_text;
        if (!currentGroup.transcript && (q.transcript || q.passage_text)) currentGroup.transcript = q.transcript || q.passage_text;
      } else {
        currentGroup = {
          id: qPassageId || `passage_group_${groups.length + 1}`,
          passage_id: qPassageId,
          audio_url: qAudio,
          image_url: q.image_url,
          passage_text: qPassageText || '',
          transcript: q.transcript || qPassageText || '',
          questions: [q]
        };
        groups.push(currentGroup);
      }
    });
    return groups;
  }, [passages, pNum, questions]);

  const isPassageMode = (pNum === 3 || pNum === 4 || pNum === 6 || pNum === 7) && effectivePassages.length > 0;
  const currentPassage = isPassageMode ? effectivePassages[currentPassageIndex] : null;

  // 2. Gemini AI Practice Grading State
  const [isAiGradingModalOpen, setIsAiGradingModalOpen] = useState(false);
  const [isAiGradingLoading, setIsAiGradingLoading] = useState(false);
  const [aiGradingReport, setAiGradingReport] = useState<any | null>(null);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);

  const handleRunAiGrading = async () => {
    setIsAiGradingLoading(true);
    setIsAiGradingModalOpen(true);
    try {
      let allQuestionsToGrade = questions;
      if (isPassageMode && effectivePassages.length > 0) {
        allQuestionsToGrade = effectivePassages.flatMap((p: any) => p.questions || []);
      }
      const answersPayload = allQuestionsToGrade.map((q: any, idx: number) => {
        const qKey = String(q.id || q.question_number || (idx + 1));
        const userSel = userAnswers[qKey] || userAnswers[String(q.id)] || userAnswers[String(q.question_number)] || '';
        const corr = q.correct_option || q.correct_answer || 'A';
        const isCorr = userSel ? String(userSel).trim().toUpperCase() === String(corr).trim().toUpperCase() : false;
        return {
          question_number: q.question_number || idx + 1,
          question_text: q.question_text || '',
          selected_option: userSel || '',
          correct_option: corr,
          is_correct: isCorr,
          explanation: q.explanation || ''
        };
      });
      const skillType = (Number(partNumber) <= 4) ? 'listening' : 'reading';
      const report = await api.aiGradePractice({
        skill: skillType,
        part: Number(partNumber),
        title: title || `Part ${partNumber} Practice`,
        answers: answersPayload
      });
      setAiGradingReport(report);
    } catch (err) {
      console.warn('AI Grading fallback', err);
    } finally {
      setIsAiGradingLoading(false);
    }
  };

  // STRICT GUARANTEE: 1 audio file -> strictly the question(s) for that audio file!
  // In passage mode (Part 3/4), render all questions for the current passage.
  // In single-question mode (Part 1, 2, 5, etc.), render ONLY the active question at currentIndex!
  const activeQuestions = useMemo(() => {
    if (isPassageMode && currentPassage?.questions?.length) {
      return currentPassage.questions;
    }
    const singleQ = questions[currentIndex];
    return singleQ ? [singleQ] : [];
  }, [isPassageMode, currentPassage, questions, currentIndex]);
  const totalItems = isPassageMode ? effectivePassages.length : questions.length;
  const currentQ: Question | undefined = isPassageMode ? activeQuestions[0] : questions[currentIndex];

  const displayImageUrl = useMemo(() => {
    return currentPassage?.image_url || activeQuestions.find((q: any) => !!q.image_url)?.image_url || currentQ?.image_url;
  }, [currentPassage, activeQuestions, currentQ]);

  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [flaggedItems, setFlaggedItems] = useState<Record<string, boolean>>({});
  const [editingNoteTarget, setEditingNoteTarget] = useState<{ key: string; num: number | string } | null>(null);
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>(() => {
    try {
      const data = localStorage.getItem('toeic_practice_notes');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  });

  const {
    settings: globalSettings,
    updateSettings,
    toggleSongNgu,
    toggleDienTu,
    toggleLatTu,
    toggleAutoAdvance,
    toggleSfx,
    toggleAnnotator,
    toggleMeoLamBai,
    toggleTuVung,
    toggleDanChung,
    toggleFloatingAITutor,
    toggleFloatingChat,
    setPlaybackSpeed: setGlobalPlaybackSpeed
  } = useSettings();

  const isSongNgu = globalSettings.songNgu;
  const isDictationMode = globalSettings.dienTu;
  const isLatTu = globalSettings.latTu;
  const isAutoAdvance = globalSettings.autoAdvance;
  const isSfxEnabled = globalSettings.sfx;
  const isAnnotatorActive = globalSettings.annotator;
  const isMeoLamBai = Boolean(globalSettings.meoLamBai);
  const isTuVung = Boolean(globalSettings.tuVung);
  const isDanChung = Boolean(globalSettings.danChung);
  const [showClueByQuestion, setShowClueByQuestion] = useState<Record<string, boolean>>({});
  const playbackSpeed = globalSettings.playbackSpeed || 1.0;
  const [flippedChoices, setFlippedChoices] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFlippedChoices({});
  }, [currentIndex, currentPassageIndex]);
  const [dictationInputs, setDictationInputs] = useState<Record<string, string>>({});
  const [dictationResults, setDictationResults] = useState<Record<string, DictationResult>>({});

  const handleCheckDictation = (qTarget: Question) => {
    const qKey = String(qTarget.id || qTarget.question_number || (currentIndex + 1));
    const userText = (dictationInputs[qKey] || '').trim();
    if (!userText) {
      showNotification('Vui lòng gõ ít nhất 1 từ bạn nghe được trước khi kiểm tra!');
      return;
    }

    const correctLetter = (qTarget.correct_answer || 'A').toUpperCase();
    const optProp = 'option_' + correctLetter.toLowerCase();
    const rawOpt = (qTarget.options?.[correctLetter] || (qTarget as any)?.[optProp] || '').trim();
    const isDummyOpt = !rawOpt || /^(\([A-D]\)\.?|[A-D]\.?|Lựa chọn [A-D]|Option [A-D])$/i.test(rawOpt);

    let targetSentence = '';
    // In Part 1 and Part 2, options are often spoken-only or dummy letters. Prioritize transcript!
    if (!isDummyOpt && qTarget.part !== 1 && qTarget.part !== 2) {
      targetSentence = rawOpt;
    }

    if (!targetSentence && qTarget.transcript) {
      const lines = qTarget.transcript.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      const re = new RegExp(`^\\(?${correctLetter}\\)?(?:\\.|:|\\s)+`, 'i');
      const foundLine = lines.find((l: string) => re.test(l));
      if (foundLine) {
        targetSentence = foundLine.replace(re, '').trim();
      } else {
        targetSentence = qTarget.transcript.trim();
      }
    }

    if (!targetSentence && !isDummyOpt) {
      targetSentence = rawOpt;
    }

    if (!targetSentence) {
      targetSentence = qTarget.question_text || 'Listen and select the correct answer.';
    }

    const result = computeWordDiff(targetSentence, userText);
    setDictationResults((prev) => ({ ...prev, [qKey]: result }));

    if (isSfxEnabled) {
      playAudioChime(result.isMatch);
    }

    setUserAnswers((prev) => ({ ...prev, [qKey]: correctLetter }));

    if (result.isMatch) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
      showNotification(`🎉 Chính xác ${result.accuracy}%! Bạn chép chính tả rất tốt!`);
    } else {
      showNotification(`Độ chính xác: ${result.accuracy}%. Xem so sánh từ đúng/sai bên dưới!`);
    }
  };
  const [annotatorTool, setAnnotatorTool] = useState<'pen' | 'highlight_yellow' | 'highlight_green'>('pen');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Translations cache for Song ngữ
  const [translationsMap, setTranslationsMap] = useState<Record<string, string>>({});

  // Auto-clear canvas on question change
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [currentIndex, currentPassageIndex]);

  // Adjust canvas size when Annotator active
  useEffect(() => {
    if (isAnnotatorActive && canvasRef.current) {
      const parent = canvasRef.current.parentElement;
      if (parent) {
        canvasRef.current.width = parent.clientWidth;
        canvasRef.current.height = parent.clientHeight;
      }
    }
  }, [isAnnotatorActive, currentIndex, currentPassageIndex]);

  // Handle Annotator drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    if (annotatorTool === 'pen') {
      ctx.strokeStyle = '#ef4444'; // Red pen
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (annotatorTool === 'highlight_yellow') {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)'; // Amber highlight
      ctx.lineWidth = 14;
      ctx.lineCap = 'square';
    } else if (annotatorTool === 'highlight_green') {
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)'; // Green highlight
      ctx.lineWidth = 14;
      ctx.lineCap = 'square';
    }

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    if (annotatorTool === 'pen') {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
    } else if (annotatorTool === 'highlight_yellow') {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = 14;
    } else if (annotatorTool === 'highlight_green') {
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
      ctx.lineWidth = 14;
    }

    ctx.lineTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    ctx.stroke();
  };

  const clearAnnotationCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      showNotification('Đã xóa nét vẽ trên tranh ảnh');
    }
  };

  // Pre-fetch dynamic translation if Song ngữ is enabled and option translation missing
  useEffect(() => {
    if (!isSongNgu) return;
    activeQuestions.forEach((q: Question) => {
      ['A', 'B', 'C', 'D'].forEach((letter) => {
        if (q.option_translations?.[letter]) return;
        const optProp = 'option_' + letter.toLowerCase();
        const optText = q.options?.[letter] || (q as any)?.[optProp];
        if (optText && optText.length > 3 && !translationsMap[optText]) {
          api.translateLookup({ text: optText })
            .then((res) => {
              if (res && res.translation) {
                setTranslationsMap((prev) => ({ ...prev, [optText]: res.translation }));
              }
            })
            .catch(() => {});
        }
      });
    });
  }, [isSongNgu, activeQuestions]);

  const [streak, setStreak] = useState<number>(0);
  const [isQuestionDrawerOpen, setIsQuestionDrawerOpen] = useState<boolean>(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState<boolean>(false);
  const [isVocabBasketOpen, setIsVocabBasketOpen] = useState<boolean>(false);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState<boolean>(false);
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(false);
  const handleOpenAiTutor = () => {
    if (!isVipUser) {
      const todayKey = `toeic_ai_tutor_queries_${new Date().toISOString().slice(0, 10)}`;
      const count = Number(localStorage.getItem(todayKey) || 0);
      if (count >= 3) {
        showNotification('👑 Bạn đã dùng hết 3 lượt hỏi AI hôm nay của Gói Thường. Nâng cấp VIP Pro để hỏi không giới hạn!');
        return;
      }
      localStorage.setItem(todayKey, String(count + 1));
      showNotification(`Lượt hỏi AI hôm nay: ${count + 1}/3 (Gói Thường)`);
    }
    setIsAiTutorOpen(true);
  };

  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportText, setReportText] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [dictSearchWord, setDictSearchWord] = useState<string>('');
  const [dictResult, setDictResult] = useState<TranslateResult | null>(null);
  const [isDictLoading, setIsDictLoading] = useState<boolean>(false);

  const questionKeywords = useMemo(() => {
    if (!currentQ?.question_text) return [];
    const qText = currentQ.question_text.replace(/^câu\s*(hỏi)?\s*\d+[:.]?\s*/i, '');
    const tokens = qText.match(/[a-zA-Z]{3,}/g) || [];
    const stopwords = new Set([
      'the', 'and', 'for', 'with', 'that', 'this', 'from', 'what', 'when',
      'where', 'which', 'who', 'will', 'would', 'could', 'should', 'have',
      'has', 'had', 'does', 'did', 'are', 'was', 'were', 'about'
    ]);
    const words: string[] = [];
    for (const t of tokens) {
      const w = t.toLowerCase();
      if (!stopwords.has(w) && !words.includes(w)) {
        words.push(w);
      }
      if (words.length >= 6) break;
    }
    return words;
  }, [currentQ?.question_text]);

  const [savedVocabs, setSavedVocabs] = useState<SavedVocabItem[]>(() => {
    try {
      const data = localStorage.getItem('toeic_saved_vocab');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const passageContainerRef = useRef<HTMLDivElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const currentFullText = useMemo(() => {
    if (partNumber === 3 || partNumber === 4) {
      return (
        (currentPassage as any)?.transcript ||
        currentPassage?.passage_text ||
        currentQ?.transcript ||
        currentQ?.passage_text ||
        ''
      );
    }
    return currentPassage?.passage_text || currentQ?.passage_text || '';
  }, [partNumber, currentPassage, currentQ]);

  const evidenceList: EvidenceItem[] = useMemo(() => {
    if (![3, 4, 6, 7].includes(partNumber) || !activeQuestions?.length) {
      return [];
    }
    return activeQuestions
      .map((q: Question, idx: number) => {
        const qNum = q.question_number || idx + 1;
        const res = extractEvidenceFromQuestion(q, currentFullText);
        return {
          qNum,
          text: res.text,
          translation: res.translation,
          paraphrase: res.paraphrase
        };
      })
      .filter((item: EvidenceItem) => Boolean(item.text && item.text.trim().length > 0));
  }, [partNumber, activeQuestions, currentFullText]);

  const evidenceByQNum = useMemo(() => {
    const map = new Map<string | number, EvidenceItem>();
    evidenceList.forEach((ev) => {
      map.set(String(ev.qNum), ev);
      map.set(Number(ev.qNum), ev);
    });
    return map;
  }, [evidenceList]);

  const scrollToEvidence = (qNum: number | string) => {
    const el = document.getElementById(`evidence-clue-${qNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-amber-400', 'bg-amber-200', 'scale-[1.02]');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-amber-400', 'bg-amber-200', 'scale-[1.02]');
      }, 2500);
    } else {
      showNotification(`Đoạn dẫn chứng cho Câu ${qNum} đã được hiển thị trong bài.`);
    }
  };

  const scrollToQuestion = (qNum: number | string) => {
    const el = document.getElementById(`question-card-${qNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('ring-2', 'ring-amber-400', 'bg-amber-50/50');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-50/50');
      }, 2500);
    }
  };

  const handleLocateEvidence = (qNum: number | string) => {
    if (!isDanChung) {
      if (!isVipUser) {
        showNotification('👑 Tính năng Dẫn chứng chỉ dành riêng cho Gói VIP Pro. Nâng cấp VIP để sử dụng!');
        return;
      }
      toggleDanChung();
      setTimeout(() => {
        scrollToEvidence(qNum);
      }, 100);
    } else {
      scrollToEvidence(qNum);
    }
  };

  const handlePassageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('[data-evidence-q]');
    if (target) {
      const qNum = target.getAttribute('data-evidence-q');
      if (qNum) {
        scrollToQuestion(qNum);
      }
    }
  };

  const currentAudioUrl = useMemo(() => {
    if (isPassageMode) {
      return currentPassage?.audio_url || activeQuestions[0]?.audio_url || null;
    }
    return currentQ?.audio_url || null;
  }, [isPassageMode, currentPassage, activeQuestions, currentQ]);

  const handleTogglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  const handleRewind = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - seconds);
    setAudioCurrentTime(audioRef.current.currentTime);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setGlobalPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [setGlobalPlaybackSpeed]);

  const handleSeek = useCallback((percent: number) => {
    if (!audioRef.current || !audioDuration) return;
    const target = percent * audioDuration;
    audioRef.current.currentTime = target;
    setAudioCurrentTime(target);
  }, [audioDuration]);

  useEffect(() => {
    setAudioCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = playbackSpeed;
      if (currentAudioUrl) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
          setIsPlaying(false);
        });
      } else {
        setIsPlaying(false);
      }
    }
  }, [currentIndex, currentPassageIndex, playbackSpeed, currentAudioUrl]);

  const stats = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let totalQs = 0;

    if (isPassageMode) {
      effectivePassages.forEach((p) => {
        (p.questions || []).forEach((q: Question) => {
          totalQs++;
          const qKey = String(q.id || q.question_number);
          const ans = userAnswers[qKey];
          if (ans) {
            if (ans.toUpperCase() === (q.correct_answer || 'A').toUpperCase()) {
              correct++;
            } else {
              incorrect++;
            }
          }
        });
      });
    } else {
      totalQs = questions.length;
      questions.forEach((q, idx) => {
        const qKey = String(q.id || q.question_number || idx + 1);
        const ans = userAnswers[qKey];
        if (ans) {
          if (ans.toUpperCase() === (q.correct_answer || 'A').toUpperCase()) {
            correct++;
          } else {
            incorrect++;
          }
        }
      });
    }

    const unanswered = Math.max(0, totalQs - (correct + incorrect));
    return { correct, incorrect, unanswered, totalQs };
  }, [isPassageMode, passages, questions, userAnswers]);

  const handleSelectOption = useCallback((qTarget: Question, chosenLetter: string) => {
    const qKey = String(qTarget.id || qTarget.question_number || (currentIndex + 1));
    if (userAnswers[qKey]) return;

    const correctLetter = (qTarget.correct_answer || 'A').toUpperCase();
    const isCorrect = chosenLetter.toUpperCase() === correctLetter;

    setUserAnswers((prev) => ({ ...prev, [qKey]: chosenLetter }));

    if (isSfxEnabled) {
      playAudioChime(isCorrect);
    }

    const activeLevelKey = levelKey || (levelBadge?.match(/Level \d+/i) ? `part${partNumber}_${levelBadge.match(/Level \d+/i)?.[0]}` : `part${partNumber}_Level 1`);
    practiceProgressStore.recordAnswer(
      activeLevelKey,
      String(qTarget.id || qKey),
      chosenLetter,
      isCorrect,
      totalItems
    );

    if (isCorrect) {
      historyStore.markQuestionCorrect(qTarget.id || qKey, {
        questionNumber: qTarget.question_number,
        part: partNumber,
        section: partNumber <= 4 ? 'listening' : 'reading',
        questionText: qTarget.question_text,
        selectedOption: chosenLetter,
        correctOption: correctLetter
      });
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > 0 && nextStreak % 5 === 0) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
        showNotification(`🔥 Chuỗi ${nextStreak} câu trả lời đúng liên tiếp!`);
      }
    } else {
      historyStore.markQuestionIncorrect(qTarget.id || qKey, {
        questionNumber: qTarget.question_number,
        part: partNumber,
        section: partNumber <= 4 ? 'listening' : 'reading',
        questionText: qTarget.question_text,
        selectedOption: chosenLetter,
        correctOption: correctLetter
      });
      setStreak(0);
    }

    if (isAutoAdvance) {
      setTimeout(() => {
        if (isPassageMode) {
          if (currentPassageIndex < effectivePassages.length - 1) {
            setCurrentPassageIndex((prev) => prev + 1);
          }
        } else {
          if (currentIndex < questions.length - 1) {
            setCurrentIndex((prev) => prev + 1);
          }
        }
      }, 1400);
    }
  }, [userAnswers, isSfxEnabled, streak, isAutoAdvance, isPassageMode, currentPassageIndex, effectivePassages.length, currentIndex, questions.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.code === 'Space' || (e.ctrlKey && e.code === 'KeyP')) {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'KeyR' || (e.shiftKey && e.code === 'ArrowLeft')) {
        e.preventDefault();
        handleRewind(3);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (isPassageMode) {
          if (currentPassageIndex > 0) setCurrentPassageIndex((prev) => prev - 1);
        } else {
          if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (isPassageMode) {
          if (currentPassageIndex < effectivePassages.length - 1) setCurrentPassageIndex((prev) => prev + 1);
        } else {
          if (currentIndex < questions.length - 1) setCurrentIndex((prev) => prev + 1);
        }
      } else if (['Digit1', 'KeyA'].includes(e.code)) {
        if (currentQ) handleSelectOption(currentQ, 'A');
      } else if (['Digit2', 'KeyB'].includes(e.code)) {
        if (currentQ) handleSelectOption(currentQ, 'B');
      } else if (['Digit3', 'KeyC'].includes(e.code)) {
        if (currentQ) handleSelectOption(currentQ, 'C');
      } else if (['Digit4', 'KeyD'].includes(e.code)) {
        if (currentQ && partNumber !== 2) handleSelectOption(currentQ, 'D');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleRewind, isPassageMode, currentPassageIndex, effectivePassages.length, currentIndex, questions.length, currentQ, partNumber, handleSelectOption]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const waveformHeights = useMemo(() => {
    return [16, 28, 20, 36, 14, 24, 40, 18, 30, 22, 38, 16, 26, 42, 20, 32, 14, 28, 38, 18, 34, 22, 16, 30, 40, 14, 26, 36, 20, 32, 18, 24, 38, 16, 28, 20];
  }, []);

  const renderAudioPlayer = (compact = false) => {
    if (partNumber > 4) return null;
    return (
      <div className={`space-y-2.5 shrink-0 ${compact ? 'p-2.5 sm:p-3 bg-slate-50/90 rounded-2xl border border-slate-200/90 shadow-2xs' : 'pt-3 border-t border-slate-100'}`}>
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Big Play/Pause Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`${compact ? 'w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl' : 'w-11 h-11 sm:w-14 sm:h-14 rounded-2xl'} bg-[#1E4E9E] hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-900/20 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0`}
            title="Phát / Tạm dừng"
          >
            <MorphPlayPause isPlaying={isPlaying} size={compact ? 20 : 24} className="fill-white text-white" />
          </button>

          {/* Waveform Visualizer with Interactive Seek */}
          <div className="flex-1 flex flex-col justify-center space-y-1.5 min-w-0">
            <div
              className={`${compact ? 'h-8 sm:h-10' : 'h-10 sm:h-12'} flex items-center gap-1 sm:gap-1.5 cursor-pointer px-2 py-1 bg-white sm:bg-slate-50 hover:bg-slate-100/80 rounded-xl sm:rounded-2xl border border-slate-200/80 transition-colors`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const pct = Math.max(0, Math.min(1, clickX / rect.width));
                handleSeek(pct);
              }}
              title="Nhấn vào bất kỳ thanh sóng để tua"
            >
              {waveformHeights.map((h, idx) => {
                const progress = audioDuration > 0 ? audioCurrentTime / audioDuration : 0;
                const barProgress = idx / waveformHeights.length;
                const isPassed = barProgress <= progress;
                const scaledHeight = compact ? Math.max(6, Math.min(28, Math.round(h * 0.7))) : h;
                return (
                  <div
                    key={idx}
                    className="flex-1 rounded-full transition-all duration-150"
                    style={{
                      height: isPlaying ? `${Math.max(6, Math.min(compact ? 28 : 38, scaledHeight + (Math.sin(idx + audioCurrentTime * 6) * 6)))}px` : `${scaledHeight}px`,
                      backgroundColor: isPassed ? '#1E4E9E' : '#CBD5E1',
                    }}
                  />
                );
              })}
            </div>

            {/* Time Readout + Rewind Controls */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-mono font-bold text-slate-700 text-[10px] sm:text-xs">
                {formatTime(audioCurrentTime)} / {formatTime(audioDuration || 20)}
              </span>

              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Rewind 3s */}
                <button
                  type="button"
                  onClick={() => handleRewind(3)}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] sm:text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                  title="Tua lại 3 giây"
                >
                  <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>3s</span>
                </button>

                {/* Rewind 5s (hidden on phone, visible on sm+) */}
                <button
                  type="button"
                  onClick={() => handleRewind(5)}
                  className="hidden sm:flex px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                  title="Tua lại 5 giây"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>5s</span>
                </button>

                {/* Speed Selector */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                  {[0.75, 1.0, 1.25].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => handleSpeedChange(speed)}
                      className={`px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                        playbackSpeed === speed
                          ? 'bg-[#1E4E9E] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                {/* Volume Mute */}
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.muted = !isMuted;
                      setIsMuted(!isMuted);
                    }
                  }}
                  className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title={isMuted ? 'Bật âm' : 'Tắt âm'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint Row: HIDDEN on phones/mobile (hidden md:flex) */}
        <div className="hidden md:flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200 font-bold">Ctrl / Space</kbd> Phát/Dừng</span>
            <span><kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200 font-bold">Shift</kbd> Tua lại 3s</span>
            <span><kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200 font-bold">1-4 / A-D</kbd> Chọn đáp án</span>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveVocab = async (word: string, meaning: string = '', detail?: any) => {
    const clean = word.trim();
    if (!clean) return;

    const isAlreadySaved = savedVocabs.some((v) => v.word.toLowerCase() === clean.toLowerCase());
    if (!isVipUser && savedVocabs.length >= 30 && !isAlreadySaved) {
      showNotification('👑 Gói Thường giới hạn lưu tối đa 30 từ vào Giỏ từ. Nâng cấp VIP Pro để lưu không giới hạn!');
      return;
    }
    if (!clean) return;
    const exists = savedVocabs.some((v) => v.word.toLowerCase() === clean.toLowerCase());
    if (exists) {
      showNotification(`"${clean}" đã có trong Giỏ từ!`);
      return;
    }
    const meaningText = meaning || detail?.context_meaning || detail?.meaning || 'Đang cập nhật nghĩa...';
    const updated = [
      ...savedVocabs,
      {
        word: clean,
        meaning: meaningText,
        context: currentQ?.question_text || '',
        savedAt: new Date().toLocaleDateString('vi-VN')
      }
    ];
    setSavedVocabs(updated);
    try {
      localStorage.setItem('toeic_saved_vocab', JSON.stringify(updated));
    } catch {}

    try {
      await api.addToFlashcards({
        word: clean,
        meaning: meaningText,
        ipa: detail?.ipa_us || detail?.ipa || '',
        part_of_speech: detail?.context_pos || detail?.part_of_speech || 'n',
        example: detail?.example || '',
        audio_url: detail?.audio_us || '',
        source_context: currentQ?.question_text || ''
      });
    } catch {}

    showNotification(`Đã thêm "${clean}" vào Giỏ từ!`);
  };

  const handleRemoveVocab = (word: string) => {
    const updated = savedVocabs.filter((v) => v.word !== word);
    setSavedVocabs(updated);
    try {
      localStorage.setItem('toeic_saved_vocab', JSON.stringify(updated));
    } catch {}
  };

  const handleSearchDictionary = async (term?: string) => {
    const query = term || dictSearchWord;
    if (!query.trim()) return;
    setIsDictLoading(true);
    setDictResult(null);
    try {
      const res: TranslateResult = await api.translateLookup({
        text: query.trim(),
        sentence: currentQ?.question_text || ''
      });
      setDictResult(res);
    } catch {
      setDictResult({
        original_text: query.trim(),
        translation: '',
        type: 'word',
        error: 'Không thể kết nối đến máy chủ từ điển. Vui lòng thử lại.'
      });
    } finally {
      setIsDictLoading(false);
    }
  };

  const activeQKey = currentQ ? String(currentQ.id || currentQ.question_number || currentIndex + 1) : '';
  const currentAnswer = userAnswers[activeQKey];
  const isCurrentAnswered = Boolean(currentAnswer);
  const isCurrentCorrect = isCurrentAnswered && currentAnswer.toUpperCase() === (currentQ?.correct_answer || 'A').toUpperCase();
  const isCurrentWrong = isCurrentAnswered && !isCurrentCorrect;

  const renderSentenceWithBlank = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(-------+|_______+|_{3,}|\.{3,})/g);
    return parts.map((part, idx) => {
      if (/^-------+|^_______+|^_{3,}|^\.{3,}/.test(part)) {
        return (
          <span
            key={idx}
            className="inline-block px-3 py-0.5 mx-1.5 rounded-lg bg-blue-100 text-blue-800 font-bold border border-blue-300 shadow-2xs"
          >
            _______
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F6F8] flex flex-col h-screen max-h-screen overflow-hidden">
      {/* 1. TOP NAV BAR (#1E4E9E Authentic Design) */}
      <header className="bg-[#1E4E9E] text-white h-13 px-4 sm:px-6 flex items-center justify-between shadow-md shrink-0 z-20 select-none">
        {/* Left: Exit + Mascot */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              if (isPlaying && audioRef.current) audioRef.current.pause();
              onExit();
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer shrink-0"
            title="Thoát khỏi phòng luyện tập"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Thoát</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-white/20 min-w-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-black text-xs shadow-xs shrink-0">
              🦉
            </div>
            <div className="font-bold text-xs tracking-wide text-white/90 truncate max-w-[130px] sm:max-w-[200px]">
              {title}
            </div>
          </div>
        </div>

        {/* Center: Title / Level Pill (hidden on smaller viewports to prevent overflow) */}
        <div className="hidden xl:flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/15 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold tracking-wide">
            Part {partNumber} · {levelBadge}
          </span>
        </div>

        {/* Mobile Toolbar (Screens < md) - Compact, zero-clutter */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {/* Streak Counter */}
          <div
            className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-1 rounded-xl text-xs font-bold shrink-0"
            title="Số câu đúng liên tiếp"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
            <span>{streak}</span>
          </div>

          {/* Giỏ từ button */}
          <button
            type="button"
            onClick={() => setIsVocabBasketOpen(true)}
            className="px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer bg-amber-500/20 text-amber-200 border border-amber-400/30 shrink-0"
            title="Giỏ từ vựng đã lưu"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
              {practiceProgressStore.getSavedVocabs().length}
            </span>
          </button>

          {/* Cài đặt Quick Settings button */}
          <button
            type="button"
            onClick={() => setIsMobileSettingsOpen(true)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center cursor-pointer transition-colors"
            title="Cài đặt phòng luyện"
          >
            <Settings className="w-4 h-4 text-white" />
          </button>

          {/* Question Index Pill (Opens Drawer) */}
          <button
            type="button"
            onClick={() => setIsQuestionDrawerOpen(true)}
            className="px-2 sm:px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer shrink-0"
            title="Danh sách câu hỏi"
          >
            <span>{isPassageMode ? `${currentPassageIndex + 1}/${effectivePassages.length}` : `${currentIndex + 1}/${questions.length}`}</span>
            <ChevronRight className="w-3 h-3 opacity-70" />
          </button>
        </div>

        {/* Desktop Toolbar (Screens >= md) */}
        <div className="hidden md:flex items-center gap-1 sm:gap-1.5 shrink-0 overflow-x-auto no-scrollbar py-1">
                    {/* Annotator */}
          <button
            type="button"
            onClick={() => {
              if (!isVipUser) {
                showNotification('👑 Tính năng Annotator chỉ dành riêng cho Gói VIP Pro. Nâng cấp VIP để sử dụng!');
                return;
              }
              toggleAnnotator();
              showNotification(!isAnnotatorActive ? 'Đã bật công cụ Annotator (vẽ & highlight)' : 'Đã tắt công cụ Annotator');
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border shrink-0 ${
              isAnnotatorActive
                ? 'bg-amber-400 text-slate-900 border-amber-300 font-bold shadow-xs ring-2 ring-amber-300'
                : 'bg-white/10 text-white/90 border-white/15 hover:bg-white/20'
            }`}
            title="Bút chì & Highlight tranh ảnh"
          >
            <PenTool className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden 2xl:inline text-[11px]">Annotator</span>
          </button>

          {/* Song ngữ */}
          <button
            type="button"
            onClick={() => {
              if (!isVipUser) {
                showNotification('👑 Tính năng Song ngữ chỉ dành riêng cho Gói VIP Pro. Nâng cấp VIP để sử dụng!');
                return;
              }
              toggleSongNgu();
              showNotification(!isSongNgu ? 'Đã bật hiển thị Song ngữ (Anh - Việt)' : 'Đã tắt Song ngữ (Chỉ tiếng Anh)');
            }}
            className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border shrink-0 ${
              isSongNgu
                ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-xs ring-2 ring-amber-300'
                : 'bg-white/10 text-white/80 border-white/15 hover:bg-white/20'
            }`}
            title="Bật/Tắt bản dịch tiếng Việt cho câu hỏi và đáp án"
          >
            <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
            <span className="hidden 2xl:inline text-[11px]">Song ngữ</span>
          </button>

          {/* Dẫn chứng (Part 3, 4, 6, 7) */}
          {[3, 4, 6, 7].includes(partNumber) && (
            <button
              type="button"
              onClick={() => {
                if (!isVipUser) {
                  showNotification('👑 Tính năng Dẫn chứng chỉ dành riêng cho Gói VIP Pro. Nâng cấp VIP để sử dụng!');
                  return;
                }
                toggleDanChung();
                showNotification(!isDanChung ? 'Đã bật hiển thị Dẫn chứng câu hỏi' : 'Đã tắt Dẫn chứng');
              }}
              className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border shrink-0 ${
                isDanChung
                  ? 'bg-emerald-500 text-white border-emerald-400 font-bold shadow-xs ring-2 ring-emerald-300'
                  : 'bg-white/10 text-white/80 border-white/15 hover:bg-white/20'
              }`}
              title="Bật/Tắt hiển thị Dẫn chứng cho câu trả lời (Part 3, 4, 6, 7)"
            >
              <span>✍️</span>
              <span className="hidden 2xl:inline text-[11px]">Dẫn chứng</span>
              <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
            </button>
          )}

          {/* Mẹo làm bài */}
          <button
            type="button"
            onClick={() => {
              toggleMeoLamBai();
              showNotification(!isMeoLamBai ? 'Đã bật hiển thị Mẹo làm bài' : 'Đã tắt Mẹo làm bài');
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border shrink-0 ${
              isMeoLamBai
                ? 'bg-amber-400 text-slate-900 border-amber-300 font-bold shadow-xs ring-2 ring-amber-300'
                : 'bg-white/10 text-white/90 border-white/15 hover:bg-white/20'
            }`}
            title="Bật/Tắt hiển thị Mẹo làm bài Part 5"
          >
            <Lightbulb className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden 2xl:inline text-[11px]">Mẹo</span>
          </button>

          {/* Từ vựng */}
          <button
            type="button"
            onClick={() => {
              toggleTuVung();
              showNotification(!isTuVung ? 'Đã bật hiển thị Từ vựng quan trọng' : 'Đã tắt Từ vựng quan trọng');
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border shrink-0 ${
              isTuVung
                ? 'bg-emerald-500 text-white border-emerald-400 font-bold shadow-xs ring-2 ring-emerald-300'
                : 'bg-white/10 text-white/90 border-white/15 hover:bg-white/20'
            }`}
            title="Bật/Tắt hiển thị Từ vựng quan trọng trong câu"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden 2xl:inline text-[11px]">Từ vựng</span>
          </button>

          {/* Ghi chú */}
          <button
            type="button"
            onClick={() => {
              setEditingNoteTarget({ key: activeQKey, num: currentQ?.question_number || (currentIndex + 1) });
              setIsNotesModalOpen(true);
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border shrink-0 ${
              savedNotes[activeQKey]
                ? 'bg-amber-400 text-slate-900 border-amber-300 font-bold shadow-xs'
                : 'bg-white/10 text-white/90 border-white/15 hover:bg-white/20'
            }`}
            title="Sổ ghi chú bài tập"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden 2xl:inline text-[11px]">Ghi chú</span>
            {savedNotes[activeQKey] && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-950 ml-0.5 shrink-0" />
            )}
          </button>

          {/* Điền Từ */}
          <button
            type="button"
            onClick={() => {
              toggleDienTu();
              showNotification(!isDictationMode ? 'Đã bật chế độ Điền từ (gõ những gì nghe được)' : 'Chế độ Trắc nghiệm chuẩn');
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border shrink-0 ${
              isDictationMode
                ? 'bg-emerald-500 text-white border-emerald-400 font-bold shadow-xs ring-2 ring-emerald-300'
                : 'bg-white/10 text-white/90 border-white/15 hover:bg-white/20'
            }`}
            title="Chế độ Điền từ: Gõ câu bạn nghe được"
          >
            <PenTool className="w-3.5 h-3.5 opacity-90 shrink-0" />
            <span className="hidden 2xl:inline text-[11px]">Điền Từ</span>
          </button>

          {/* Lật Từ */}
          <button
            type="button"
            onClick={() => {
              toggleLatTu();
              showNotification(!isLatTu ? 'Đã bật chế độ Lật từ (Ẩn lựa chọn để tự nhẩm)' : 'Đã tắt chế độ Lật từ');
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border shrink-0 ${
              isLatTu
                ? 'bg-amber-400 text-slate-900 border-amber-300 font-bold shadow-xs ring-2 ring-amber-300'
                : 'bg-white/10 text-white/90 border-white/15 hover:bg-white/20'
            }`}
            title="Chế độ Lật từ: Ẩn đáp án để tự suy nghĩ trước khi lật xem"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
            <span className="hidden 2xl:inline text-[11px]">Lật Từ</span>
          </button>

          {/* Auto advance */}
          <button
            type="button"
            onClick={() => {
              toggleAutoAdvance();
              showNotification(!isAutoAdvance ? 'Tự động chuyển câu khi trả lời' : 'Tắt tự động chuyển câu');
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border shrink-0 ${
              isAutoAdvance
                ? 'bg-blue-500 text-white border-blue-400 font-bold shadow-xs ring-2 ring-blue-300'
                : 'bg-white/10 text-white/80 border-white/15 hover:bg-white/20'
            }`}
            title="Tự động qua câu kế tiếp và phát âm thanh"
          >
            <Volume2 className="w-3.5 h-3.5 opacity-90 shrink-0" />
            <span className="hidden 2xl:inline text-[11px]">Auto</span>
          </button>

          {/* SFX Toggle */}
          <button
            type="button"
            onClick={() => {
              toggleSfx();
              showNotification(!isSfxEnabled ? 'Bật âm thanh Chime khi làm bài' : 'Tắt âm thanh thông báo');
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border shrink-0 ${
              isSfxEnabled
                ? 'bg-white/20 text-white border-white/30 font-bold shadow-xs'
                : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/15'
            }`}
            title="Âm thanh hiệu ứng đúng/sai"
          >
            <Bell className="w-3.5 h-3.5 opacity-90 shrink-0" />
            <span className="hidden 2xl:inline text-[11px]">SFX</span>
          </button>

          {/* Giỏ từ button */}
          <button
            type="button"
            onClick={() => setIsVocabBasketOpen(true)}
            className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-400/30 shrink-0"
            title="Giỏ từ vựng đã lưu"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-[11px] hidden 2xl:inline">Giỏ từ</span>
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
              {practiceProgressStore.getSavedVocabs().length}
            </span>
          </button>

          {/* Streak Counter */}
          <div
            className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-1 rounded-xl text-xs font-bold shrink-0"
            title="Số câu đúng liên tiếp hiện tại"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
            <span>{streak}</span>
          </div>

          {/* Score Counter */}
          <div
            className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-1 rounded-xl text-xs font-bold shrink-0"
            title="Số câu đã trả lời đúng"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{stats.correct}/{stats.totalQs}</span>
          </div>

          {/* Question Index Pill (Opens Drawer) */}
          <button
            type="button"
            onClick={() => setIsQuestionDrawerOpen(true)}
            className="ml-1 px-2.5 sm:px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer shrink-0"
            title="Mở danh sách câu hỏi"
          >
            <span className="truncate max-w-[120px] sm:max-w-none">
              {isPassageMode ? `Đoạn ${currentPassageIndex + 1}/${effectivePassages.length}` : `Câu ${currentIndex + 1}/${questions.length}`}
            </span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </header>

      {/* Annotator Active Toolbar */}
      {isAnnotatorActive && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-150 z-20 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-amber-900 flex items-center gap-1">
              <PenTool className="w-3.5 h-3.5 text-amber-700" />
              Công cụ Annotator:
            </span>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-amber-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setAnnotatorTool('pen')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  annotatorTool === 'pen' ? 'bg-rose-500 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Bút vẽ tự do màu đỏ"
              >
                <span>✏️ Bút vẽ đỏ</span>
              </button>
              <button
                type="button"
                onClick={() => setAnnotatorTool('highlight_yellow')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  annotatorTool === 'highlight_yellow' ? 'bg-amber-400 text-slate-900 shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Bút dạ quang vàng"
              >
                <span>🟡 Highlight vàng</span>
              </button>
              <button
                type="button"
                onClick={() => setAnnotatorTool('highlight_green')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  annotatorTool === 'highlight_green' ? 'bg-emerald-500 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Bút dạ quang xanh"
              >
                <span>🟢 Highlight xanh</span>
              </button>
            </div>

            <button
              type="button"
              onClick={clearAnnotationCanvas}
              className="px-2.5 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              title="Xóa toàn bộ nét vẽ trên câu này"
            >
              <span>🧹 Xóa nét vẽ</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-amber-800 text-[11px] hidden sm:inline font-medium">
              💡 Kéo chuột để vẽ lên tranh ảnh khoanh vùng chi tiết
            </span>
            <button
              type="button"
              onClick={() => {
                updateSettings({ annotator: false });
                showNotification('Đã tắt công cụ Annotator');
              }}
              className="p-1 rounded-lg hover:bg-amber-200 text-amber-900 cursor-pointer"
              title="Đóng thanh Annotator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hidden native audio tag */}
      {currentAudioUrl && (
        <audio
          ref={audioRef}
          src={currentAudioUrl}
          onTimeUpdate={() => {
            if (audioRef.current) setAudioCurrentTime(audioRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) setAudioDuration(audioRef.current.duration);
          }}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* 2. MAIN WORKSPACE (2-COLUMN SPLIT DESKTOP) */}
      <main className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-2.5 sm:p-5 flex flex-col lg:flex-row gap-3 sm:gap-6 items-stretch">
        {/* LEFT COLUMN: Prompt / Visual / Reading Passage / Waveform Player (Hidden for Part 2 & Part 5; Hidden on mobile for Part 1) */}
        {partNumber !== 2 && partNumber !== 5 && (
          <section className={`w-full ${partNumber === 1 ? 'hidden lg:flex' : 'flex'} lg:w-1/2 lg:h-full flex-col justify-between bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200/90 shadow-xs lg:min-h-0 lg:overflow-hidden space-y-3 sm:space-y-4`}>
          <div className="flex-1 lg:min-h-0 lg:overflow-y-auto space-y-4 pr-1">
            {/* Top Prompt Text */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {partNumber <= 4 ? (
                  <Headphones className="w-4 h-4 text-[#1E4E9E]" />
                ) : (
                  <BookOpen className="w-4 h-4 text-[#1E4E9E]" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {partNumber === 1
                    ? 'Part 1 · Photographs'
                    : partNumber === 2
                    ? 'Part 2 · Question - Response'
                    : partNumber === 3
                    ? 'Part 3 · Conversations'
                    : partNumber === 4
                    ? 'Part 4 · Short Talks'
                    : partNumber === 5
                    ? 'Part 5 · Incomplete Sentences'
                    : partNumber === 6
                    ? 'Part 6 · Text Completion'
                    : 'Part 7 · Reading Comprehension'}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {isPassageMode
                  ? `Đoạn ${currentPassageIndex + 1}/${totalItems}`
                  : `Câu hỏi ${currentIndex + 1}/${totalItems}`}
              </span>
            </div>

            {/* Part 1: Photo Preview & Graphics (Part 1, 3, 4, 7 image) */}
            {(() => {
              const displayImageUrl = currentPassage?.image_url || activeQuestions.find((q: any) => !!q.image_url)?.image_url || currentQ?.image_url;
              if (partNumber !== 1 && !displayImageUrl) return null;
              return (
                <div className="w-full flex justify-center bg-slate-50 rounded-2xl p-3 border border-slate-100 relative">
                  <div className="relative inline-block max-w-full">
                    <QuestionImage
                      src={displayImageUrl}
                    alt={`Hình ảnh câu ${currentQ?.question_number || currentIndex + 1}`}
                    part={partNumber}
                    questionNumber={currentQ?.question_number || currentIndex + 1}
                    maxHeight={partNumber === 3 || partNumber === 4 || partNumber === 7 ? 'max-h-[170px] sm:max-h-[220px] lg:max-h-[520px]' : 'max-h-[420px]'}
                    className="w-auto select-none pointer-events-none my-0 border-0 bg-transparent p-0"
                    allowZoom={!isAnnotatorActive}
                  />
                  {/* Annotator Canvas Overlay */}
                  {isAnnotatorActive && (
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full cursor-crosshair z-10 touch-none rounded-xl"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={stopDrawing}
                    />
                  )}
                </div>
              </div>
              );
            })()}

            {/* Part 2: Direction Prompt */}
            {partNumber === 2 && (
              <div className="py-6 px-4 bg-slate-50/70 rounded-2xl border border-slate-100 text-center space-y-2">
                <p className="text-sm sm:text-base font-semibold text-slate-700 italic">
                  "Select the best response to the question."
                </p>
                {isSongNgu && (
                  <p className="text-xs text-slate-500 font-normal">
                    (Hãy nghe câu hỏi và chọn câu phản hồi phù hợp nhất từ A, B hoặc C)
                  </p>
                )}
              </div>
            )}

            {/* Part 3 / 4 (Listening): Direction Prompt & Revealed Transcript */}
            {(partNumber === 3 || partNumber === 4) && (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100/80 text-xs sm:text-sm text-blue-900 leading-relaxed font-medium">
                  Questions refer to the following {partNumber === 3 ? 'conversation between two or three speakers' : 'talk given by a single speaker'}.
                  {isSongNgu && (
                    <div className="text-[11px] text-blue-700/80 mt-1">
                      (Các câu hỏi sau liên quan đến đoạn {partNumber === 3 ? 'hội thoại' : 'bài nói'} bạn sắp nghe)
                    </div>
                  )}
                </div>

                {(isDanChung || isCurrentAnswered) && currentFullText && (
                  <div
                    ref={transcriptContainerRef}
                    onClick={handlePassageClick}
                    className="p-4 bg-slate-50/95 rounded-2xl border border-slate-200 text-xs text-slate-800 font-serif leading-relaxed max-h-[280px] overflow-y-auto select-text shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                        <span>📝</span> Audio Transcript:
                      </span>
                      {isDanChung && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span>✍️</span> Đã bật dẫn chứng
                        </span>
                      )}
                    </div>
                    {isDanChung ? (
                      <div
                        className="whitespace-pre-line leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(
                            highlightPassageWithEvidence(currentFullText, evidenceList),
                            { ADD_ATTR: ['id', 'data-evidence-q', 'target', 'class'] }
                          )
                        }}
                      />
                    ) : (
                      <p className="whitespace-pre-line leading-relaxed">{currentFullText}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Part 6 & Part 7: Reading - Passages (Text Completion & Reading Comprehension) */}
            {(partNumber === 6 || partNumber === 7) && (
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-[#1E4E9E] uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Đoạn văn đọc hiểu {partNumber === 6 ? '(Text Completion)' : '(Reading Comprehension)'}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {activeQuestions.length} câu hỏi liên quan
                  </span>
                </div>

                <div
                  ref={passageContainerRef}
                  onClick={handlePassageClick}
                  className="p-5 bg-slate-50/90 rounded-2xl border border-slate-200 text-slate-800 text-sm sm:text-base leading-relaxed select-text shadow-2xs overflow-y-auto max-h-[580px]"
                >
                  {(() => {
                    const rawPassage = currentPassage?.passage_text || currentQ?.passage_text || '';
                    if (!rawPassage) {
                      return (
                        <div className="py-8 text-center text-xs text-slate-400 italic">
                          (Đoạn văn đọc hiểu đang được cập nhật...)
                        </div>
                      );
                    }
                    const processedPassage = isDanChung
                      ? highlightPassageWithEvidence(rawPassage, evidenceList)
                      : rawPassage;
                    const hasHtml = /<[a-z][\s\S]*>/i.test(processedPassage);
                    if (hasHtml || isDanChung) {
                      const cleanHtml = DOMPurify.sanitize(processedPassage, {
                        ADD_ATTR: ['id', 'data-evidence-q', 'target', 'class']
                      });
                      return (
                        <div
                          className="prose prose-sm max-w-none text-slate-800 space-y-2 [&_p]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100 [&_th]:font-bold font-serif"
                          dangerouslySetInnerHTML={{ __html: cleanHtml }}
                        />
                      );
                    }
                    return (
                      <div className="whitespace-pre-line font-serif leading-relaxed text-slate-800">
                        {rawPassage}
                      </div>
                    );
                  })()}
                </div>

                <div className="text-[11px] text-slate-400 italic flex items-center gap-1 px-1">
                  <span>💡 Tip:</span>
                  <span>
                    {isDanChung
                      ? 'Nhấn vào huy hiệu [🎯 Câu X] trên đoạn văn để cuộn nhanh đến câu hỏi tương ứng.'
                      : 'Bật Dẫn chứng 👑 trên thanh công cụ để đánh dấu trực tiếp câu chứa đáp án trong đoạn văn.'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 italic flex items-center gap-1 px-1">
                  <span>💡</span> Bôi đen từ hoặc cụm từ trong bài đọc để tra từ điển & dịch tức thì.
                </div>
              </div>
            )}
          </div>

          {/* AUDIO WAVEFORM PLAYER SECTION (Listening Parts 1-4 only) */}
          {partNumber <= 4 ? (
            renderAudioPlayer(false)
          ) : (
            /* Reading Toolbar (Parts 5, 6, 7) - NO AUDIO PLAYER */
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#1E4E9E]" />
                  Chế độ Đọc hiểu:
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  {partNumber === 5 ? 'Phân tích ngữ cảnh & từ loại' : 'Đọc kỹ bài đọc và chọn đáp án đúng bên phải'}
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400">
                <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-bold hidden sm:inline">1-4 / A-D</kbd> <span className="hidden sm:inline">Chọn đáp án</span></span>
              </div>
            </div>
          )}
        </section>
        )}

        {/* RIGHT COLUMN (OR CENTER FOR PART 2 & PART 5): Question & Multiple Choice / Dictation Options */}
        <section className={`w-full ${(partNumber === 2 || partNumber === 5) ? 'max-w-3xl mx-auto h-full' : (partNumber === 1 ? 'max-w-3xl lg:max-w-none mx-auto lg:mx-0 lg:w-1/2 lg:h-full' : 'lg:w-1/2 lg:h-full')} flex flex-col justify-between bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200/90 shadow-xs min-h-0 overflow-y-auto lg:overflow-hidden space-y-4`}>
          <div className="flex-1 lg:min-h-0 lg:overflow-y-auto space-y-4 sm:space-y-5 pr-1">
            {/* Top Row: Part 5 Header Banner */}
            {partNumber === 5 && (
              <div className="flex items-center justify-between px-1 text-slate-500 text-xs font-medium border-b border-slate-100 pb-2">
                <span className="text-[#1E4E9E] font-bold">📖 Part 5 · Incomplete Sentences</span>
                <span className="text-[11px] text-slate-400">Chọn 1 đáp án chính xác nhất</span>
              </div>
            )}

            {/* Part 2: Centered Audio Player & Header (Desktop & Mobile) */}
            {partNumber === 2 && (
              <div className="space-y-3 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="text-[#1E4E9E] font-bold flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5" />
                    Part 2 · Question - Response
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Câu {currentIndex + 1}/{totalItems}
                  </span>
                </div>
                {renderAudioPlayer(true)}
              </div>
            )}

            {/* Part 1: Mobile-Only Photo & Compact Audio Player (Desktop uses Left Column) */}
            {partNumber === 1 && (
              <div className="lg:hidden space-y-2.5 pb-2.5 border-b border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-1">
                  <span className="text-[#1E4E9E] font-bold flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5" />
                    Part 1 · Photographs
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Câu {currentIndex + 1}/{totalItems}
                  </span>
                </div>
                <div className="w-full flex justify-center bg-slate-50 rounded-xl p-2 border border-slate-100 relative">
                  <QuestionImage
                    src={displayImageUrl}
                    alt={`Hình ảnh câu ${currentQ?.question_number || currentIndex + 1}`}
                    part={1}
                    questionNumber={currentQ?.question_number || currentIndex + 1}
                    maxHeight="max-h-[170px] sm:max-h-[220px]"
                    className="w-auto select-none pointer-events-none my-0 border-0 bg-transparent p-0"
                    allowZoom={true}
                  />
                </div>
                {renderAudioPlayer(true)}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-[#1E4E9E] border border-blue-200/70 text-xs font-bold">
                  {levelBadge}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  Câu {currentQ?.question_number || (currentIndex + 1)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Hỏi bài AI Tutor */}
                <button
                  type="button"
                  onClick={handleOpenAiTutor}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200/80 transition-colors cursor-pointer shadow-2xs"
                  title="Hỏi Gia sư AI về câu này"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Hỏi bài</span>
                </button>

                {/* Bookmark Star */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !flaggedItems[activeQKey];
                    setFlaggedItems((prev) => ({ ...prev, [activeQKey]: next }));
                    showNotification(next ? 'Đã đánh dấu câu hỏi' : 'Đã bỏ đánh dấu');
                  }}
                  className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                    flaggedItems[activeQKey]
                      ? 'bg-amber-50 text-amber-500 border-amber-300'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-amber-500 hover:bg-amber-50'
                  }`}
                  title="Đánh dấu xem lại"
                >
                  <Star className={`w-4 h-4 ${flaggedItems[activeQKey] ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* In Passage Mode: Question Tabs if multiple questions */}
            {isPassageMode && activeQuestions.length > 1 && (
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500">Đoạn này gồm {activeQuestions.length} câu:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeQuestions.map((q: Question, qIdx: number) => {
                    const qk = String(q.id || q.question_number);
                    const isDone = !!userAnswers[qk];
                    const isPrevCorr = historyStore.isQuestionMarkedCorrect(qk) || (q.id && historyStore.isQuestionMarkedCorrect(q.id));
                    return (
                      <span
                        key={qIdx}
                        className={'px-2.5 py-0.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 ' + (isDone ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600')}
                      >
                        Câu {q.question_number || qIdx + 1}
                        {isPrevCorr && <span className="text-[10px] text-emerald-600 font-black" title="Đã từng làm đúng">✓</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Render Questions (Supports single question for Part 1/2 or all 2-4 questions for Part 3/4) */}
            <div className="space-y-6">
              {activeQuestions.map((qItem: Question, qIdx: number) => {
                const qKey = String(qItem.id || qItem.question_number || (currentIndex + 1));
                const qAnswer = userAnswers[qKey];
                const isQAnswered = Boolean(qAnswer);
                const qCorrect = (qItem.correct_answer || 'A').toUpperCase();
                const cardId = `question-card-${qItem.question_number || qIdx + 1}`;

                return (
                  <div
                    key={qItem.id || qItem.question_number || qIdx}
                    id={cardId}
                    className="space-y-3.5 pb-5 border-b border-slate-100 last:border-b-0 last:pb-0 scroll-mt-6 rounded-2xl transition-all duration-300 p-2 -m-2"
                  >
                    {/* Sticky Note for this question */}
                    {savedNotes[qKey] && (
                      <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start justify-between gap-3 text-xs text-amber-950 shadow-2xs mb-2">
                        <div className="flex items-start gap-2">
                          <span className="text-sm">📌</span>
                          <div>
                            <span className="font-bold text-amber-900 block mb-0.5">Ghi chú của bạn:</span>
                            <p className="whitespace-pre-line text-slate-800 font-medium">{savedNotes[qKey]}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
              setEditingNoteTarget({ key: activeQKey, num: currentQ?.question_number || (currentIndex + 1) });
              setIsNotesModalOpen(true);
            }}
                          className="text-amber-800 hover:text-amber-950 underline font-semibold text-[11px] shrink-0 cursor-pointer"
                        >
                          Sửa
                        </button>
                      </div>
                    )}

                    {/* Question Number & Text */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug flex items-baseline gap-2 flex-wrap min-w-0 break-words">
                        <span className="text-[#1E4E9E] font-black text-lg">
                          {isPassageMode ? (qItem.question_number || qIdx + 1) : (currentIndex + 1)}.
                        </span>
                        <span className="select-text">
                          {partNumber === 2 && !isQAnswered
                            ? 'Nghe và chọn câu trả lời đúng nhất:'
                            : (partNumber === 6
                                ? (qItem.question_text && !qItem.question_text.match(/^câu\s*(hỏi)?\s*\d+$/i) && !qItem.question_text.match(/^questions?\s+\d+/i)
                                    ? qItem.question_text
                                    : `Chọn từ/câu thích hợp điền vào vị trí [${qItem.question_number || qIdx + 1}]:`)
                                : (partNumber === 5
                                    ? renderSentenceWithBlank(cleanDisplayQuestionText(qItem.question_text, 5, qItem.question_number || currentIndex + 1))
                                    : (qItem.question_text && !qItem.question_text.match(/^câu\s*(hỏi)?\s*\d+$/i)
                                        ? qItem.question_text
                                        : (partNumber === 1
                                            ? 'Mô tả hình ảnh:'
                                            : partNumber === 2
                                            ? 'Nghe và chọn câu trả lời đúng nhất:'
                                            : `Câu hỏi ${isPassageMode ? (qItem.question_number || qIdx + 1) : (currentIndex + 1)}:`))))}
                        </span>
                        </h3>
                        {(historyStore.isQuestionMarkedCorrect(qKey) || (qItem.id && historyStore.isQuestionMarkedCorrect(qItem.id))) && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã từng làm đúng
                          </span>
                        )}
                      </div>
                      {isSongNgu && (isQAnswered || partNumber !== 2) && qItem.vietnamese_translation && (
                        <p className="text-xs text-slate-500 italic pl-6">
                          {qItem.vietnamese_translation}
                        </p>
                      )}
                    </div>

                    {/* DICTATION MODE (Only in single-question mode) */}
                    {isDictationMode && !isPassageMode ? (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Headphones className="w-3.5 h-3.5 text-emerald-600" />
                            Nhập câu bạn nghe được:
                          </label>
                          {dictationResults[qKey] && (
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                              dictationResults[qKey].isMatch
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-amber-50 text-amber-700 border-amber-300'
                            }`}>
                              Độ chính xác: {dictationResults[qKey].accuracy}%
                            </span>
                          )}
                        </div>

                        <textarea
                          value={dictationInputs[qKey] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDictationInputs((prev) => ({ ...prev, [qKey]: val }));
                          }}
                          placeholder="Gõ câu nghe được vào đây và nhấn 'Kiểm tra câu gõ'..."
                          rows={3}
                          disabled={Boolean(dictationResults[qKey]?.isMatch)}
                          className="w-full p-3.5 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm font-medium text-slate-800 transition-all outline-none resize-none shadow-2xs"
                        />

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCheckDictation(qItem)}
                              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>Kiểm tra câu gõ</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleTogglePlay}
                              className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                              title="Nghe lại câu này"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                              <span>Nghe lại</span>
                            </button>
                          </div>

                          {dictationResults[qKey] && (
                            <button
                              type="button"
                              onClick={() => {
                                setDictationResults((prev) => {
                                  const copy = { ...prev };
                                  delete copy[qKey];
                                  return copy;
                                });
                              }}
                              className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold cursor-pointer"
                            >
                              Gõ lại câu này
                            </button>
                          )}
                        </div>

                        {/* DICTATION COMPARISON RESULT & WORD DIFF */}
                        {dictationResults[qKey] && (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3.5 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <span className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                {dictationResults[qKey].isMatch ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-amber-500" />
                                )}
                                Kết quả phân tích chi tiết:
                              </span>
                              <div className="flex items-center gap-2 text-[11px] font-bold">
                                <span className="text-emerald-700">Đúng: {dictationResults[qKey].correctCount}</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-rose-600">Sai: {dictationResults[qKey].wrongCount}</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-amber-600">Thiếu: {dictationResults[qKey].missingCount}</span>
                              </div>
                            </div>

                            {/* Word Diff Chips */}
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-500 block">So sánh từ bạn gõ với transcript chuẩn:</span>
                              <div className="flex flex-wrap gap-2 text-sm leading-relaxed items-center p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                                {dictationResults[qKey].diff.map((d, dIdx) => {
                                  if (d.status === 'correct') {
                                    return (
                                      <span
                                        key={dIdx}
                                        className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold inline-flex items-center gap-1 text-xs shadow-2xs"
                                      >
                                        <span>{d.word}</span>
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      </span>
                                    );
                                  }
                                  if (d.status === 'wrong') {
                                    return (
                                      <span
                                        key={dIdx}
                                        className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-300 text-xs inline-flex items-center gap-1 font-medium shadow-2xs"
                                      >
                                        <span className="line-through text-rose-500">{d.word}</span>
                                        <span className="text-emerald-700 font-bold">({d.expected})</span>
                                      </span>
                                    );
                                  }
                                  if (d.status === 'missing') {
                                    return (
                                      <span
                                        key={dIdx}
                                        className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs inline-flex items-center gap-1 shadow-2xs"
                                      >
                                        <span className="italic">[{d.word}]</span>
                                        <span className="text-[10px] text-amber-600 font-normal">thiếu</span>
                                      </span>
                                    );
                                  }
                                  return (
                                    <span
                                      key={dIdx}
                                      className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-300 text-xs line-through"
                                    >
                                      {d.word}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Standard Transcript & Translation */}
                            <div className="space-y-2 pt-1 border-t border-slate-200/80">
                              <div>
                                <span className="font-bold text-slate-700 block text-xs">Câu chuẩn:</span>
                                <p className="font-mono text-slate-900 font-semibold text-xs mt-0.5">{dictationResults[qKey].targetText}</p>
                              </div>
                              {(qItem.vietnamese_translation || translationsMap[dictationResults[qKey].targetText]) && (
                                <div className="text-xs text-blue-800 italic">
                                  <span className="font-semibold text-slate-600 not-italic block text-[11px]">Dịch nghĩa:</span>
                                  <p>{qItem.vietnamese_translation || translationsMap[dictationResults[qKey].targetText]}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* MULTIPLE CHOICE OPTIONS LIST */
                      <div className="space-y-2 pt-1">
                        {isLatTu && !isQAnswered && (
                          <div className="flex items-center justify-between pb-1 px-1">
                            <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              Chế độ Lật từ: Thẻ đang úp, bấm vào thẻ để lật xem nội dung
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const allFlipped: Record<string, boolean> = {};
                                ['A', 'B', 'C', 'D'].forEach((l) => (allFlipped[l] = true));
                                setFlippedChoices(allFlipped);
                              }}
                              className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-2xs"
                            >
                              Lật tất cả
                            </button>
                          </div>
                        )}
                        {['A', 'B', 'C', ...(partNumber === 2 ? [] : ['D'])].map((letter) => {
                          const opts = qItem?.options || {};
                          const optProp = 'option_' + letter.toLowerCase();
                          const optText = opts[letter] || (qItem as any)?.[optProp] || '';
                          const isSelected = qAnswer === letter;
                          const isCorrect = qCorrect === letter;

                          const isCardFlipped = isQAnswered || !isLatTu || !!flippedChoices[letter];

                          let cardStyle = 'border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/20 text-slate-800';
                          let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

                          if (isQAnswered) {
                            if (isCorrect) {
                              cardStyle = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold ring-1 ring-emerald-400';
                              badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
                            } else if (isSelected && !isCorrect) {
                              cardStyle = 'border-rose-400 bg-rose-50/70 text-rose-950 font-medium ring-1 ring-rose-300';
                              badgeStyle = 'bg-rose-600 text-white border-rose-600';
                            } else {
                              cardStyle = 'border-slate-200/60 bg-slate-50/40 text-slate-400 opacity-70';
                              badgeStyle = 'bg-slate-100 text-slate-400 border-slate-200';
                            }
                          } else if (isLatTu && !isCardFlipped) {
                            cardStyle = 'border-2 border-dashed border-amber-300/80 bg-amber-50/30 hover:bg-amber-100/50 text-slate-800 hover:border-amber-400';
                            badgeStyle = 'bg-amber-100 text-amber-900 border-amber-300';
                          }

                          return (
                            <div
                              key={letter}
                              onClick={() => {
                                if (isQAnswered) return;
                                if (isLatTu && !isCardFlipped) {
                                  setFlippedChoices((prev) => ({ ...prev, [letter]: true }));
                                  showNotification(`Đã lật thẻ (${letter})`);
                                } else {
                                  handleSelectOption(qItem, letter);
                                }
                              }}
                              className={'p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ' + cardStyle}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={'w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ' + badgeStyle}>
                                  {letter}
                                </span>
                                <div className="min-w-0 text-xs sm:text-sm leading-relaxed">
                                  {!isCardFlipped ? (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-900/80 italic py-0.5">
                                      <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                                      <span>✨ Bấm để lật thẻ ({letter})</span>
                                    </div>
                                  ) : isQAnswered || (partNumber !== 1 && partNumber !== 2 && (optText && !optText.match(/^[A-D].?$/i))) ? (
                                    <div>
                                      <span className="text-slate-800">{cleanOptionText(optText, letter) || ('Lựa chọn (' + letter + ')')}</span>
                                      {isSongNgu && (qItem.option_translations?.[letter] || translationsMap[optText]) && (
                                        <p className="text-[11px] sm:text-xs text-blue-700 font-medium italic mt-0.5">
                                          ↳ {qItem.option_translations?.[letter] || translationsMap[optText]}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="text-slate-700 font-medium">({letter})</span>
                                      {isSongNgu && isQAnswered && (qItem.option_translations?.[letter] || translationsMap[optText]) && (
                                        <p className="text-[11px] sm:text-xs text-blue-700 font-medium italic mt-0.5">
                                          ↳ {qItem.option_translations?.[letter] || translationsMap[optText]}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {!isCardFlipped && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-md shrink-0">
                                  Lật xem
                                </span>
                              )}
                              {isQAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                              {isQAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 💡 Mẹo làm bài Part 5 (Directly beneath answers) */}
                    {partNumber === 5 && (
                      isMeoLamBai ? (
                        <div className="p-3.5 sm:p-4 bg-amber-50/80 rounded-2xl border border-amber-200/90 space-y-2 transition-all">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                              <span>💡</span> Mẹo làm bài Part 5
                            </h5>
                            <button
                              type="button"
                              onClick={() => {
                                toggleMeoLamBai();
                                showNotification('Đã tắt Mẹo làm bài');
                              }}
                              className="text-[11px] text-slate-500 hover:text-slate-700 underline font-medium cursor-pointer"
                              title="Tắt mẹo làm bài"
                            >
                              Ẩn mẹo
                            </button>
                          </div>
                          <p className="text-xs text-amber-950 leading-relaxed font-medium">
                            Quan sát từ đứng trước và sau chỗ trống để xác định loại từ (danh từ, động từ, tính từ hay trạng từ) hoặc cấu trúc ngữ pháp cần điền.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 transition-all text-xs">
                          <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                            <span>💡</span> Mẹo làm bài Part 5
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              toggleMeoLamBai();
                              showNotification('Đã bật hiển thị Mẹo làm bài Part 5');
                            }}
                            className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-amber-400 text-slate-700 hover:text-amber-700 font-bold text-[11px] transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <Lightbulb className="w-3 h-3 text-amber-500" />
                            <span>Bật mẹo</span>
                          </button>
                        </div>
                      )
                    )}

                    {/* 🇻🇳 Dịch nghĩa câu (Directly beneath answers) */}
                    {qItem?.vietnamese_translation && (
                      isSongNgu ? (
                        <div className="p-3.5 sm:p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/90 text-xs text-emerald-950 space-y-1 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                              <span>🇻🇳</span> Dịch nghĩa câu:
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                toggleSongNgu();
                                showNotification('Đã tắt Song ngữ (Chỉ tiếng Anh)');
                              }}
                              className="text-[11px] text-slate-500 hover:text-slate-700 underline font-medium cursor-pointer"
                              title="Tắt dịch nghĩa"
                            >
                              Ẩn dịch
                            </button>
                          </div>
                          <p className="leading-relaxed font-medium mt-1 select-text">{qItem.vietnamese_translation}</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 transition-all text-xs">
                          <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                            <span>🇻🇳</span> Dịch nghĩa câu
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isVipUser) {
                                showNotification('👑 Tính năng Song ngữ chỉ dành riêng cho Gói VIP Pro. Nâng cấp VIP để sử dụng!');
                                return;
                              }
                              toggleSongNgu();
                              showNotification('Đã bật hiển thị Song ngữ (Anh - Việt)');
                            }}
                            className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 font-bold text-[11px] transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <Crown className="w-3 h-3 text-amber-500" />
                            <span>Bật dịch</span>
                          </button>
                        </div>
                      )
                    )}

                    {/* 📚 Từ vựng quan trọng trong câu (Directly beneath answers) */}
                    {(() => {
                      const vocabList: Array<{ word: string; meaning?: string }> = (() => {
                        if (Array.isArray((qItem as any)?.vocabulary) && (qItem as any).vocabulary.length > 0) {
                          return (qItem as any).vocabulary.map((v: any) => typeof v === 'string' ? { word: v, meaning: '' } : v);
                        }
                        if (qItem?.question_text) {
                          const qText = qItem.question_text.replace(/^câu\s*(hỏi)?\s*\d+[:.]?\s*/i, '');
                          const tokens = qText.match(/[a-zA-Z]{4,}/g) || [];
                          const stopwords = new Set([
                            'the', 'and', 'for', 'with', 'that', 'this', 'from', 'what', 'when',
                            'where', 'which', 'who', 'will', 'would', 'could', 'should', 'have',
                            'has', 'had', 'does', 'did', 'are', 'was', 'were', 'about', 'their', 'there'
                          ]);
                          const extracted: Array<{ word: string; meaning?: string }> = [];
                          for (const t of tokens) {
                            const w = t.toLowerCase();
                            if (!stopwords.has(w) && !extracted.some(x => x.word.toLowerCase() === w)) {
                              extracted.push({ word: w });
                            }
                            if (extracted.length >= 4) break;
                          }
                          return extracted;
                        }
                        return [];
                      })();

                      if (vocabList.length === 0) return null;

                      return isTuVung ? (
                        <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 transition-all">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span>📚 Từ vựng quan trọng trong câu</span>
                              <span className="text-[10px] text-slate-500 font-normal">({vocabList.length} từ)</span>
                            </h5>
                            <button
                              type="button"
                              onClick={() => {
                                toggleTuVung();
                                showNotification('Đã tắt hiển thị Từ vựng');
                              }}
                              className="text-[11px] text-slate-500 hover:text-slate-700 underline font-medium cursor-pointer"
                              title="Tắt từ vựng"
                            >
                              Ẩn từ vựng
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {vocabList.map((vocabItem, vIdx) => (
                              <div
                                key={vIdx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 shadow-2xs hover:border-blue-300 transition-colors"
                              >
                                <span className="font-bold text-[#1E4E9E]">{vocabItem.word}</span>
                                {vocabItem.meaning && <span className="text-slate-500 text-[11px]">: {vocabItem.meaning}</span>}
                                <button
                                  type="button"
                                  onClick={() => handleSaveVocab(vocabItem.word, vocabItem.meaning || '')}
                                  className="ml-1 text-slate-400 hover:text-amber-500 cursor-pointer font-bold"
                                  title="Lưu vào giỏ từ"
                                >
                                  +
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 transition-all text-xs">
                          <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                            <span>📚</span> Từ vựng quan trọng ({vocabList.length} từ)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              toggleTuVung();
                              showNotification('Đã bật hiển thị Từ vựng quan trọng');
                            }}
                            className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-700 font-bold text-[11px] transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <BookOpen className="w-3 h-3 text-blue-600" />
                            <span>Bật từ vựng</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* ✍️ Dẫn chứng đáp án (Part 3, 4, 6, 7) */}
                    {[3, 4, 6, 7].includes(partNumber) && (() => {
                      const qNum = qItem.question_number || (currentIndex + 1);
                      const ev = evidenceByQNum.get(String(qNum)) || evidenceByQNum.get(Number(qNum)) || extractEvidenceFromQuestion(qItem, currentFullText);
                      const hasClue = Boolean(ev && ev.text && ev.text.trim().length > 0);
                      const isRevealed = isDanChung || showClueByQuestion[qKey];

                      if (isRevealed) {
                        return (
                          <div className="p-3.5 sm:p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/90 space-y-2.5 transition-all shadow-2xs">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                                <span className="text-sm">🎯</span>
                                <span>Dẫn chứng đáp án (Câu {qNum})</span>
                                <span className="px-1.5 py-0.2 rounded-md bg-emerald-200/80 text-emerald-900 text-[10px] font-black">VIP</span>
                              </h5>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleLocateEvidence(qNum)}
                                  className="px-2.5 py-1 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100/60 text-emerald-800 font-bold text-[11px] transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                  title="Cuộn tới vị trí dẫn chứng trong bài"
                                >
                                  <span>🔍</span>
                                  <span>Định vị trong bài</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isDanChung) {
                                      toggleDanChung();
                                      showNotification('Đã tắt Dẫn chứng');
                                    } else {
                                      setShowClueByQuestion((prev) => ({ ...prev, [qKey]: false }));
                                    }
                                  }}
                                  className="text-[11px] text-emerald-700/80 hover:text-emerald-900 underline font-medium cursor-pointer"
                                  title="Ẩn dẫn chứng câu này"
                                >
                                  Ẩn dẫn chứng
                                </button>
                              </div>
                            </div>

                            {hasClue ? (
                              <div className="space-y-1.5">
                                <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-100 text-xs sm:text-sm font-serif text-slate-800 italic leading-relaxed select-text border-l-4 border-l-emerald-500">
                                  "{ev.text}"
                                </div>
                                {ev.translation && (
                                  <div className="text-[11px] text-emerald-900/90 flex items-start gap-1 font-sans pl-1">
                                    <span className="font-semibold text-emerald-700 shrink-0">🇻🇳 Dịch nghĩa:</span>
                                    <span>{ev.translation}</span>
                                  </div>
                                )}
                                {ev.paraphrase && (
                                  <div className="text-[11px] text-blue-900/90 flex items-start gap-1 font-sans pl-1 bg-blue-50/70 p-2 rounded-xl border border-blue-200/70">
                                    <span className="font-semibold text-blue-700 shrink-0">🔄 Paraphrase đối ứng:</span>
                                    <span>{ev.paraphrase}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-500 italic">
                                Dẫn chứng đang được định vị từ nội dung câu hỏi và ngữ cảnh đoạn văn...
                              </p>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl border border-slate-200/80 hover:border-emerald-200 transition-all text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <span>🎯</span> Dẫn chứng đáp án (Câu {qNum})
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">VIP</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isVipUser) {
                                showNotification('👑 Tính năng Dẫn chứng chỉ dành riêng cho Gói VIP Pro. Nâng cấp VIP để sử dụng!');
                                return;
                              }
                              toggleDanChung();
                              showNotification('Đã bật hiển thị Dẫn chứng');
                            }}
                            className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 font-bold text-[11px] transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <span>✍️</span>
                            <span>Bật dẫn chứng</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Question Transcript & Explanation when answered */}
                    {isQAnswered && (
                      <div className="space-y-2 pt-1">
                        {qItem.transcript && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed">
                            <span className="font-bold text-slate-700 block mb-0.5">Lời thoại câu {qItem.question_number}:</span>
                            <p className="font-mono whitespace-pre-line">{qItem.transcript}</p>
                          </div>
                        )}
                        {qItem.explanation && (
                          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-slate-700 leading-relaxed">
                            <span className="font-bold text-[#1E4E9E] block mb-0.5">Giải thích:</span>
                            <p className="whitespace-pre-line">{qItem.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Next / Finish Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-400 font-medium">
              {isCurrentAnswered ? (<span>Nhấn Next <span className="hidden sm:inline">[▶]</span> để sang câu tiếp</span>) : 'Chọn đáp án để xem giải thích'}
            </span>

            {isPassageMode ? (
              currentPassageIndex < effectivePassages.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentPassageIndex((prev) => prev + 1)}
                  className="px-5 py-2 rounded-xl bg-[#1E4E9E] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Đoạn tiếp theo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                    onExit();
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Hoàn thành buổi luyện tập 🎉
                </button>
              )
            ) : (
              currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                  className="px-5 py-2 rounded-xl bg-[#1E4E9E] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Câu tiếp theo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                    onExit();
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Hoàn thành buổi luyện tập 🎉
                </button>
              )
            )}
          </div>
        </section>
      </main>

      {/* 3. BOTTOM UTILITY BAR */}
      <footer className="bg-white border-t border-slate-200/90 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between shadow-xs shrink-0 select-none z-20">
        {/* Left: Tools */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Báo lỗi */}
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
            title="Báo cáo lỗi âm thanh hoặc nội dung"
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Báo lỗi</span>
          </button>

          {/* Giỏ từ (Saved Vocabs) */}
          <button
            type="button"
            onClick={() => setIsVocabBasketOpen(true)}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Xem danh sách từ vựng đã lưu"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Giỏ từ ({savedVocabs.length})</span>
          </button>

          {/* Chấm bài & Chẩn đoán AI (Gemini) */}
          <button
            type="button"
            onClick={handleRunAiGrading}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 hover:from-blue-100 hover:to-indigo-100 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Chấm điểm, phân tích bẫy đề thi và nhận mẹo 5 giây bằng Gemini AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Chấm bài AI</span>
          </button>

          {/* Tra từ (Dictionary) */}
          <button
            type="button"
            onClick={() => {
              const sel = window.getSelection()?.toString().trim();
              if (sel && sel.length >= 2) {
                setDictSearchWord(sel);
                handleSearchDictionary(sel);
              } else if (!dictResult && questionKeywords.length > 0 && !dictSearchWord) {
                setDictSearchWord(questionKeywords[0]);
                handleSearchDictionary(questionKeywords[0]);
              }
              setIsDictionaryOpen(true);
            }}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Tra cứu từ điển nhanh"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Tra từ</span>
          </button>
        </div>

        {/* Right: Prev / Current Toggle Pill / Next */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Previous Question Button */}
          <button
            type="button"
            disabled={isPassageMode ? currentPassageIndex === 0 : currentIndex === 0}
            onClick={() => {
              if (isPassageMode) {
                if (currentPassageIndex > 0) setCurrentPassageIndex((prev) => prev - 1);
              } else {
                if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
              }
            }}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Câu trước [←]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Drawer Toggle Pill Button */}
          <button
            type="button"
            onClick={() => setIsQuestionDrawerOpen(true)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
              isCurrentWrong
                ? 'bg-rose-600 hover:bg-rose-700 ring-2 ring-rose-300'
                : isCurrentCorrect
                ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300'
                : 'bg-[#1E4E9E] hover:bg-blue-700'
            }`}
            title="Mở danh sách câu hỏi"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{isPassageMode ? `${currentPassageIndex + 1}/${effectivePassages.length}` : `${currentIndex + 1}/${questions.length}`}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-70 hidden sm:inline" />
          </button>

          {/* Next Question Button */}
          <button
            type="button"
            disabled={isPassageMode ? currentPassageIndex === effectivePassages.length - 1 : currentIndex === questions.length - 1}
            onClick={() => {
              if (isPassageMode) {
                if (currentPassageIndex < effectivePassages.length - 1) setCurrentPassageIndex((prev) => prev + 1);
              } else {
                if (currentIndex < questions.length - 1) setCurrentIndex((prev) => prev + 1);
              }
            }}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Câu tiếp theo [→]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* 4. SLIDE-OVER DRAWER: QUESTION LIST (Matching Screenshot 2) */}
      {isQuestionDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsQuestionDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-slideLeft">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Danh sách câu hỏi</h3>
              <button
                type="button"
                onClick={() => setIsQuestionDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Statistics */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                <Check className="w-3.5 h-3.5" />
                <span>{stats.correct} Đúng</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-lg">
                <X className="w-3.5 h-3.5" />
                <span>{stats.incorrect} Sai</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 bg-slate-200 px-2.5 py-1 rounded-lg">
                <span className="w-3 h-3 border-2 border-slate-400 rounded-xs inline-block" />
                <span>{stats.unanswered} Chưa làm</span>
              </div>
            </div>

            {/* Status Legend */}
            <div className="px-6 py-2.5 border-b border-slate-100 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>Đang xem</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Đúng</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Sai</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300" />
                <span>Chưa làm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Đánh dấu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 text-[7px] text-white font-bold flex items-center justify-center">✓</span>
                <span>Đã từng làm đúng</span>
              </div>
            </div>

            {/* Part Subtitle */}
            <div className="px-6 pt-3.5 pb-1 text-xs font-bold text-slate-800">
              {`Part ${pNum} – ${PART_TITLES[pNum] || 'Luyện tập'} (${isPassageMode ? `${effectivePassages.length} đoạn / ${stats.totalQs} câu` : `${questions.length} câu`})`}
            </div>

            {/* 5-Column Grid of Question Numbers */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-5 gap-2.5">
                {(isPassageMode ? effectivePassages : questions).map((item, idx) => {
                  const isCurrent = isPassageMode ? currentPassageIndex === idx : currentIndex === idx;
                  const itemKey = String(item.id || item.question_number || idx + 1);
                  const isFlagged = flaggedItems[itemKey];
                  const isPreviouslyCorrect = historyStore.isQuestionMarkedCorrect(itemKey) || (item.id && historyStore.isQuestionMarkedCorrect(item.id));

                  let isDone = false;
                  let isAnsCorrect = false;

                  if (isPassageMode) {
                    const pQs = item.questions || [];
                    const answeredCount = pQs.filter((q: any) => !!userAnswers[String(q.id || q.question_number)]).length;
                    isDone = answeredCount > 0;
                    isAnsCorrect = answeredCount === pQs.length && pQs.every((q: any) => {
                      const ans = userAnswers[String(q.id || q.question_number)];
                      return ans && ans.toUpperCase() === (q.correct_answer || 'A').toUpperCase();
                    });
                  } else {
                    const ans = userAnswers[itemKey];
                    if (ans) {
                      isDone = true;
                      isAnsCorrect = ans.toUpperCase() === (item.correct_answer || 'A').toUpperCase();
                    }
                  }

                  let btnStyle = 'bg-slate-100 text-slate-700 hover:bg-slate-200';
                  if (isCurrent) {
                    if (isDone && !isAnsCorrect) {
                      btnStyle = 'bg-rose-600 text-white font-bold ring-2 ring-rose-400 ring-offset-1 shadow-xs';
                    } else if (isDone && isAnsCorrect) {
                      btnStyle = 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400 ring-offset-1 shadow-xs';
                    } else {
                      btnStyle = 'bg-blue-600 text-white font-bold ring-2 ring-blue-300 ring-offset-1 shadow-xs';
                    }
                  } else if (isDone && isAnsCorrect) {
                    btnStyle = 'bg-emerald-500 text-white font-bold shadow-xs';
                  } else if (isDone && !isAnsCorrect) {
                    btnStyle = 'bg-rose-500 text-white font-bold shadow-xs border border-rose-600';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (isPassageMode) {
                          setCurrentPassageIndex(idx);
                        } else {
                          setCurrentIndex(idx);
                        }
                        setIsQuestionDrawerOpen(false);
                      }}
                      className={`relative h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-2xs ${btnStyle}`}
                    >
                      <span>{idx + 1}</span>
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
                      )}
                      {isPreviouslyCorrect && (
                        <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center ring-1 ring-white shadow-2xs" title="Đã từng làm đúng">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. NOTES MODAL */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Ghi chú Câu {editingNoteTarget?.num || (isPassageMode ? (currentQ?.question_number || 1) : (currentIndex + 1))}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNotesModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              rows={4}
              value={savedNotes[editingNoteTarget?.key || activeQKey] || ''}
              onChange={(e) => {
                const text = e.target.value;
                const k = editingNoteTarget?.key || activeQKey;
                const nextNotes = { ...savedNotes, [k]: text };
                setSavedNotes(nextNotes);
                try {
                  localStorage.setItem('toeic_practice_notes', JSON.stringify(nextNotes));
                } catch {}
              }}
              placeholder="Viết ghi chú cá nhân, từ vựng hoặc bẫy cần nhớ cho câu hỏi này..."
              className="w-full p-3.5 rounded-2xl border border-slate-300 focus:border-blue-600 text-sm outline-none resize-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsNotesModalOpen(false);
                  showNotification('Đã lưu ghi chú!');
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer"
              >
                Đóng & Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. VOCABULARY BASKET MODAL */}
      {isVocabBasketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-base">Giỏ từ vựng ({savedVocabs.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVocabBasketOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {savedVocabs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8 font-medium">
                  Chưa có từ vựng nào trong giỏ. Hãy bôi đen từ trên bài hoặc bấm Tra từ để lưu!
                </p>
              ) : (
                savedVocabs.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900">{item.word}</div>
                      <div className="text-xs text-slate-500">{item.meaning}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVocab(item.word)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Xóa khỏi giỏ từ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsVocabBasketOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DICTIONARY QUICK LOOKUP MODAL */}
      {isDictionaryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Tra từ điển TOEIC</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Hỗ trợ phát âm, ngữ cảnh & flashcards</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDictionaryOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchDictionary();
              }}
              className="flex gap-2 shrink-0"
            >
              <input
                type="text"
                value={dictSearchWord}
                onChange={(e) => setDictSearchWord(e.target.value)}
                placeholder="Nhập từ tiếng Anh cần tra (vd: glitch, budget, attendee)..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm outline-none transition-all"
              />
              <button
                type="submit"
                disabled={isDictLoading}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Tra cứu</span>
              </button>
            </form>

            {/* Keyword Suggestion Chips */}
            {questionKeywords.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none shrink-0 text-xs">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">Gợi ý:</span>
                {questionKeywords.map((kw, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDictSearchWord(kw);
                      handleSearchDictionary(kw);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer shrink-0"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            )}

            {/* Rich Card Body */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {isDictLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold text-slate-500">Đang tra từ điển TOEIC AI...</span>
                </div>
              ) : dictResult ? (
                <RichDictionaryCard
                  result={dictResult}
                  loading={false}
                  error={dictResult.error || null}
                  onClose={() => setIsDictionaryOpen(false)}
                  onSaveToBasket={(word, meaning, detail) => handleSaveVocab(word, meaning, detail)}
                  onAddToDifficulty={(levelLabel, detail) => {
                    const w = detail?.word || dictResult.original_text || dictSearchWord;
                    const m = detail?.meaning || dictResult.translation || '';
                    handleSaveVocab(w, m, detail);
                    showNotification(`Đã lưu "${w}" vào nhóm ${levelLabel}`);
                  }}
                  onLookupWord={(w) => {
                    setDictSearchWord(w);
                    handleSearchDictionary(w);
                  }}
                  isSaved={Boolean(dictResult.original_text && savedVocabs.some(v => v.word.toLowerCase() === dictResult.original_text.toLowerCase()))}
                  maxHeight="max-h-[55vh]"
                  showHeaderClose={false}
                />
              ) : (
                <div className="text-center py-10 text-xs text-slate-400 space-y-2">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Nhập từ tiếng Anh hoặc chọn từ gợi ý ở trên để xem phát âm, nghĩa ngữ cảnh và flashcard.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. AI TUTOR MODAL */}
      {isAiTutorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-violet-600 text-white flex items-center justify-center text-xs font-bold">
                  AI
                </div>
                <h3 className="font-bold text-slate-900 text-base">Gia sư AI giải thích Câu {currentQ?.question_number || (currentIndex + 1)}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAiTutorOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 max-h-[300px] overflow-y-auto leading-relaxed">
              <div className="p-3 bg-violet-50 rounded-2xl border border-violet-100 text-violet-900">
                <span className="font-bold block mb-1">Điểm ngữ pháp & Từ vựng trọng tâm:</span>
                <p>
                  Part {partNumber} kiểm tra phản xạ nhận diện ý chính và bẫy phát âm (như từ đồng âm, trả lời gián tiếp hoặc bẫy thì).
                </p>
              </div>

              {currentQ?.explanation && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">Phân tích chi tiết:</span>
                  <p className="whitespace-pre-line">{currentQ.explanation}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsAiTutorOpen(false)}
                className="px-5 py-2 rounded-xl bg-violet-600 text-white font-bold text-xs cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <Flag className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Báo lỗi Câu {currentQ?.question_number || (currentIndex + 1)}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              rows={3}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Mô tả lỗi: file âm thanh không nghe được, đáp án bị sai, hoặc hình ảnh không khớp..."
              className="w-full p-3.5 rounded-2xl border border-slate-300 focus:border-rose-500 text-sm outline-none resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsReportModalOpen(false);
                  setReportText('');
                  showNotification('Đã ghi nhận báo cáo. Cảm ơn bạn đã đóng góp!');
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs cursor-pointer"
              >
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. AI GRADING & DIAGNOSTICS MODAL (Gemini DeepTutor) */}
      {isAiGradingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 relative shrink-0">
              <button
                type="button"
                onClick={() => setIsAiGradingModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold border border-amber-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Gemini DeepTutor AI Grader</span>
                </span>
                {aiGradingReport?.model_used && (
                  <span className="text-[10px] text-slate-300 font-mono">
                    Model: {aiGradingReport.model_used}
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Báo cáo Chẩn đoán & Chấm bài AI TOEIC
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Phân tích bẫy đề thi ETS, điểm mạnh và mẹo 5 giây bứt phá điểm số.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 flex-1">
              {isAiGradingLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Gemini AI đang phân tích bài thi & các bẫy ETS...</p>
                  <p className="text-[11px] text-slate-400">Đang quét từ vựng và tạo mẹo 5 giây Socratic</p>
                </div>
              ) : aiGradingReport ? (
                <>
                  {/* Score & Verdict Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-100 space-y-1">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Dự đoán Điểm TOEIC</span>
                      <div className="text-lg font-black text-blue-900">{aiGradingReport.band_score_estimate || '600 - 750'}</div>
                      <span className="text-[10px] text-blue-600 font-medium">Thang điểm 10 - 990</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-100 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Độ chính xác</span>
                      <div className="text-lg font-black text-emerald-900">{aiGradingReport.accuracy_rate || '80%'}</div>
                      <span className="text-[10px] text-emerald-600 font-medium">Tỷ lệ trả lời chuẩn</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-100 space-y-1 sm:col-span-1">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Đánh giá chung</span>
                      <div className="text-xs font-bold text-amber-950 line-clamp-2">{aiGradingReport.level_verdict || 'Khá'}</div>
                    </div>
                  </div>

                  {/* Overall Comment */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    {aiGradingReport.overall_comment}
                  </div>

                  {/* Strengths */}
                  {aiGradingReport.strengths && aiGradingReport.strengths.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Điểm mạnh đã phát huy</span>
                      </h4>
                      <div className="space-y-1.5">
                        {aiGradingReport.strengths.map((s: string, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-950 flex items-start gap-2">
                            <span className="text-emerald-600 font-bold shrink-0">✓</span>
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ETS Traps Identified */}
                  {aiGradingReport.traps_identified && aiGradingReport.traps_identified.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Phân tích Bẫy Đề Thi ETS bạn cần tránh</span>
                      </h4>
                      <div className="space-y-2.5">
                        {aiGradingReport.traps_identified.map((t: any, idx: number) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-950">Câu {t.question_number}: {t.trap_type}</span>
                            </div>
                            <p className="text-slate-600 leading-relaxed">{t.explanation}</p>
                            {t.five_second_rule && (
                              <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-amber-900 font-semibold text-[11px] flex items-start gap-1.5">
                                <span>💡</span>
                                <span><b>Mẹo 5 giây DeepTutor:</b> {t.five_second_rule}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vocabulary to Learn */}
                  {aiGradingReport.vocabulary_to_learn && aiGradingReport.vocabulary_to_learn.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>Từ vựng trọng tâm cần lưu nhớ</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {aiGradingReport.vocabulary_to_learn.map((v: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-blue-700">{v.word}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{v.ipa}</span>
                            </div>
                            <div className="text-slate-700 font-medium">{v.meaning}</div>
                            {v.context_note && (
                              <div className="text-[10px] text-slate-400">{v.context_note}</div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                handleSaveVocab(v.word, v.meaning);
                                showNotification(`Đã lưu "${v.word}" vào giỏ từ!`);
                              }}
                              className="mt-1 w-full py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Lưu vào giỏ từ</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Plan */}
                  {aiGradingReport.action_plan && aiGradingReport.action_plan.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Kế hoạch hành động bứt phá điểm số</span>
                      </h4>
                      <div className="space-y-1">
                        {aiGradingReport.action_plan.map((step: string, idx: number) => (
                          <div key={idx} className="p-2 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 flex items-center gap-2 font-medium">
                            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                Powered by Google Gemini 2.0 & DeepTutor Framework
              </span>
              <button
                type="button"
                onClick={() => setIsAiGradingModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Đóng báo cáo
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Mobile Quick Settings Drawer */}
      {isMobileSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileSettingsOpen(false)}
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 z-10 max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1E4E9E] flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Cài đặt phòng luyện</h3>
                  <p className="text-[11px] text-slate-400">Tùy chỉnh hiển thị và công cụ học</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSettingsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {/* Song ngữ */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      Song ngữ (Anh - Việt)
                      <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">VIP</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Hiện bản dịch câu hỏi và đáp án</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isVipUser) {
                      showNotification('👑 Tính năng Song ngữ chỉ dành riêng cho Gói VIP Pro.');
                      return;
                    }
                    toggleSongNgu();
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${isSongNgu ? 'bg-amber-400' : 'bg-slate-200'}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${isSongNgu ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Dẫn chứng (Part 3, 4, 6, 7) */}
              {[3, 4, 6, 7].includes(partNumber) && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">✍️</span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        Dẫn chứng đáp án
                        <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">VIP</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Đánh dấu đoạn văn/audio chứa đáp án</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isVipUser) {
                        showNotification('👑 Tính năng Dẫn chứng chỉ dành riêng cho Gói VIP Pro.');
                        return;
                      }
                      toggleDanChung();
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${isDanChung ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${isDanChung ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              )}

              {/* Mẹo làm bài Part 5 */}
              {partNumber === 5 && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Mẹo làm bài Part 5</div>
                      <p className="text-[10px] text-slate-500">Hiển thị mẹo phân tích câu</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleMeoLamBai}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${isMeoLamBai ? 'bg-[#1E4E9E]' : 'bg-slate-200'}`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${isMeoLamBai ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              )}

              {/* Từ vựng quan trọng */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Từ vựng quan trọng</div>
                    <p className="text-[10px] text-slate-500">Gợi ý từ vựng cốt lõi trong câu</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleTuVung}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${isTuVung ? 'bg-emerald-600' : 'bg-slate-200'}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${isTuVung ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Chế độ Điền từ */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Headphones className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Chép chính tả / Điền từ</div>
                    <p className="text-[10px] text-slate-500">Luyện nghe gõ từ thay vì trắc nghiệm</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleDienTu}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${isDictationMode ? 'bg-emerald-600' : 'bg-slate-200'}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${isDictationMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Chế độ Lật từ (Flashcard) */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Lật đáp án (Flashcard)</div>
                    <p className="text-[10px] text-slate-500">Che đáp án để người học tự suy nghĩ</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleLatTu}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${isLatTu ? 'bg-purple-600' : 'bg-slate-200'}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${isLatTu ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Tự động chuyển câu */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Tự động chuyển câu</div>
                    <p className="text-[10px] text-slate-500">Chuyển sang câu kế sau khi chọn đáp án</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleAutoAdvance}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${isAutoAdvance ? 'bg-[#1E4E9E]' : 'bg-slate-200'}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${isAutoAdvance ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* SFX Âm thanh */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-slate-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Hiệu ứng âm thanh (SFX)</div>
                    <p className="text-[10px] text-slate-500">Âm thanh vui tai khi làm đúng/sai</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSfx}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${isSfxEnabled ? 'bg-[#1E4E9E]' : 'bg-slate-200'}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${isSfxEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Annotator */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <PenTool className="w-4 h-4 text-rose-500" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      Công cụ Annotator
                      <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">VIP</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Vẽ và ghi chú lên hình ảnh bài thi</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isVipUser) {
                      showNotification('👑 Tính năng Annotator chỉ dành riêng cho Gói VIP Pro.');
                      return;
                    }
                    toggleAnnotator();
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${isAnnotatorActive ? 'bg-rose-500' : 'bg-slate-200'}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${isAnnotatorActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Nút nổi Gia sư AI cá nhân hóa */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-violet-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      Nút nổi Gia sư AI
                      <span className="px-1.5 py-0.2 rounded-md bg-violet-100 text-violet-800 text-[10px] font-bold">Mặc định bật</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Bật/tắt nút màu tím ở góc phải màn hình</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleFloatingAITutor}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${globalSettings.showFloatingAITutor ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : 'bg-slate-200'}`}
                  title={globalSettings.showFloatingAITutor ? 'Đang bật - Nhấn để ẩn' : 'Đang tắt - Nhấn để hiện'}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${globalSettings.showFloatingAITutor ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Nút nổi Tin nhắn */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      Nút nổi Tin nhắn
                      <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">Mặc định bật</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Bật/tắt nút màu xanh ở góc phải màn hình</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleFloatingChat}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${globalSettings.showFloatingChat ? 'bg-blue-600' : 'bg-slate-200'}`}
                  title={globalSettings.showFloatingChat ? 'Đang bật - Nhấn để ẩn' : 'Đang tắt - Nhấn để hiện'}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${globalSettings.showFloatingChat ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileSettingsOpen(false)}
              className="w-full py-2.5 rounded-2xl bg-[#1E4E9E] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Đóng cài đặt
            </button>
          </div>
        </div>
      )}

            {/* Vocab Basket Modal */}
      <VocabBasketModal
        isOpen={isVocabBasketOpen}
        onClose={() => setIsVocabBasketOpen(false)}
        onNavigate={onNavigate}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-xl border border-white/10 animate-bounce">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export const FocusedPracticeRoom: React.FC<FocusedPracticeRoomProps> = (props) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Phòng luyện tập chuyên sâu"
        featureDesc="Luyện tập câu hỏi chuẩn ETS với audio phòng thi, phân tích ngữ cảnh và chấm điểm AI."
        onNavigate={props.onNavigate || (() => {})}
      />
    );
  }

  return <FocusedPracticeRoomInner {...props} />;
};
