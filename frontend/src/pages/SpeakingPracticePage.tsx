import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Search,
  Sparkles,
  Award,
  ArrowRight,
  ArrowLeft,
  Bot,
  Loader2,
  Bookmark,
  Film,
  BookOpen,
  Headphones,
  X,
  Keyboard
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AuthRequiredGate } from '../components/AuthRequiredGate';

interface SpeakingPracticePageProps {
  onNavigate: (path: string) => void;
  onFocusModeChange?: (active: boolean) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onOpenRBAC?: () => void;
}

interface ShadowingSentence {
  s: number;
  e: number;
  t: string;
  vi: string;
  w?: number[];
}

interface ShadowingLessonSummary {
  id: string;
  title: string;
  title_vi?: string;
  category: string;
  channel_name: string;
  level: string;
  accent: string;
  youtube_id?: string;
  thumbnail_url?: string;
  duration_seconds: number;
  duration_formatted: string;
  sentence_count: number;
}

interface ShadowingLessonDetail extends ShadowingLessonSummary {
  sentences: ShadowingSentence[];
}

interface WordEvaluation {
  word: string;
  status: 'correct' | 'missing' | 'incorrect' | 'extra';
  spoken?: string;
}

interface EvaluationResult {
  accuracy: number;
  status: 'excellent' | 'good' | 'needs_work' | 'retry';
  feedback_vi: string;
  words: WordEvaluation[];
}

interface SWQuestion {
  question_number: number;
  question_type: string;
  prompt: string;
  context: string;
  image_url?: string;
}

interface SWTest {
  id: string;
  name: string;
  total_questions: number;
  duration_minutes: number;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pronunciation', label: 'Pronunciation' },
  { id: 'toeic', label: 'TOEIC' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'movie', label: 'Movie' },
  { id: 'vlog', label: 'Vlog' },
  { id: 'business', label: 'Business English' },
];

const ACCENT_TABS = [
  { id: 'all', label: 'Tất cả giọng' },
  { id: 'UK', label: 'Anh – Anh (UK)' },
  { id: 'US', label: 'Anh – Mỹ (US)' },
];
export const SpeakingPracticePageInner: React.FC<SpeakingPracticePageProps> = ({
  onFocusModeChange,
}) => {
  const [activeMode, setActiveMode] = useState<'shadowing' | 'ets_tests'>('shadowing');

  // Shadowing Catalog state
  const [shadowingLessons, setShadowingLessons] = useState<ShadowingLessonSummary[]>([]);
  const [shadowingLoading, setShadowingLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('pronunciation');
  const [selectedAccent, setSelectedAccent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [accentCounts, setAccentCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [totalLessons, setTotalLessons] = useState(0);

  // Shadowing Studio state
  const [activeShadowingLesson, setActiveShadowingLesson] = useState<ShadowingLessonDetail | null>(null);
  const [_loadingLessonDetail, setLoadingLessonDetail] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [autoNextOnSuccess, setAutoNextOnSuccess] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [sentenceScores, setSentenceScores] = useState<Record<number, number>>({});
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [videoKey, setVideoKey] = useState(0);
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);

  const [savedWords, setSavedWords] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('toeic_saved_vocab');
      if (stored) {
        const arr = JSON.parse(stored);
        return new Set(arr.map((item: any) => (item.word || '').toLowerCase()));
      }
    } catch {}
    return new Set();
  });

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ETS Tests state
  const [tests, setTests] = useState<SWTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [etsSearchQuery, setEtsSearchQuery] = useState('');
  const [activeTest, setActiveTest] = useState<SWTest | null>(null);
  const [questions, setQuestions] = useState<SWQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [_recordingsMap, setRecordingsMap] = useState<Record<number, string>>({});
  const [transcriptMap, setTranscriptMap] = useState<Record<number, string>>({});
  const [questionAIFeedback, setQuestionAIFeedback] = useState<Record<number, any>>({});
  const [gradingQuestionLoading, setGradingQuestionLoading] = useState(false);
  const [fullSessionAIFeedback, setFullSessionAIFeedback] = useState<any | null>(null);
  const [gradingSessionLoading, setGradingSessionLoading] = useState(false);
  const [etsTimeLeft, setEtsTimeLeft] = useState(20 * 60);

  useEffect(() => {
    const isFocus = Boolean(activeShadowingLesson || activeTest);
    onFocusModeChange?.(isFocus);
    return () => {
      onFocusModeChange?.(false);
    };
  }, [activeShadowingLesson, activeTest, onFocusModeChange]);

  const loadShadowingLessons = async () => {
    try {
      setShadowingLoading(true);
      const res = await api.getShadowingLessons({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        accent: selectedAccent === 'all' ? undefined : selectedAccent,
        search: searchQuery || undefined,
        page,
        limit: 24,
      });
      if (res && res.lessons) {
        setShadowingLessons(res.lessons);
        setTotalLessons(res.total || res.lessons.length);
        if (res.category_counts) setCategoryCounts(res.category_counts);
        if (res.accent_counts) setAccentCounts(res.accent_counts);
      }
    } catch (err) {
      console.error('Error loading shadowing lessons:', err);
    } finally {
      setShadowingLoading(false);
    }
  };

  useEffect(() => {
    if (activeMode === 'shadowing') {
      loadShadowingLessons();
    }
  }, [activeMode, selectedCategory, selectedAccent, searchQuery, page]);
  const handleOpenShadowingLesson = async (lesson: ShadowingLessonSummary) => {
    try {
      setLoadingLessonDetail(true);
      const detail = await api.getShadowingLessonDetail(lesson.id);
      if (detail && detail.sentences && detail.sentences.length > 0) {
        setActiveShadowingLesson(detail);
        setCurrentSentenceIndex(0);
        setEvaluationResult(null);
        setSentenceScores({});
        setLiveTranscript('');
        setManualInput('');
        setShowManualInput(false);
        setRecordedAudioUrl(null);
        setVideoKey((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error loading lesson detail:', err);
    } finally {
      setLoadingLessonDetail(false);
    }
  };

  const handleExitShadowing = () => {
    stopRecording();
    setActiveShadowingLesson(null);
    setEvaluationResult(null);
    setLiveTranscript('');
    setRecordedAudioUrl(null);
  };

  const currentSentence = activeShadowingLesson?.sentences[currentSentenceIndex];
  const sentenceStartSec = currentSentence ? Math.max(0, Math.floor(currentSentence.s)) : 0;
  const sentenceEndSec = currentSentence ? Math.ceil(currentSentence.e) : 10;

  const handleReplayVideoSegment = () => {
    setVideoKey((prev) => prev + 1);
  };

  const startRecording = async () => {
    setLiveTranscript('');
    setEvaluationResult(null);
    setRecordedAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
    } catch (err) {
      console.warn('Microphone error:', err);
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = activeShadowingLesson?.accent === 'UK' ? 'en-GB' : 'en-US';

        let finalTranscript = '';

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          const full = (finalTranscript + interim).trim();
          setLiveTranscript(full);
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition error:', e.error);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Recognition start error:', err);
        setIsRecording(true);
      }
    } else {
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    setTimeout(() => {
      handleEvaluateCurrentSentence();
    }, 450);
  };

  const handleEvaluateCurrentSentence = async (overrideText?: string) => {
    if (!currentSentence) return;
    const spokenText = (overrideText !== undefined ? overrideText : (liveTranscript || manualInput)).trim();

    if (!spokenText) {
      setEvaluationResult({
        accuracy: 0,
        status: 'retry',
        feedback_vi: 'Chưa phát hiện được giọng nói. Bạn hãy bấm mic và phát âm to, rõ ràng theo câu mẫu nhé!',
        words: currentSentence.t
          .replace(/[^\w\s']/g, ' ')
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => ({ word: w, status: 'missing' })),
      });
      return;
    }

    setEvaluating(true);
    try {
      const res = await api.evaluateShadowing({
        target_text: currentSentence.t,
        user_speech: spokenText,
        lesson_id: activeShadowingLesson?.id,
        sentence_index: currentSentenceIndex,
      });

      if (res) {
        setEvaluationResult(res);
        setSentenceScores((prev) => ({
          ...prev,
          [currentSentenceIndex]: res.accuracy,
        }));

        if (autoNextOnSuccess && res.accuracy >= 80 && activeShadowingLesson) {
          if (currentSentenceIndex < activeShadowingLesson.sentences.length - 1) {
            setTimeout(() => {
              handleNextSentence();
            }, 1800);
          }
        }
      }
    } catch (err) {
      console.error('Error evaluating shadowing:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handlePlayModelPronunciation = () => {
    if (!currentSentence?.t) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentSentence.t);
      utterance.lang = activeShadowingLesson?.accent === 'UK' ? 'en-GB' : 'en-US';
      utterance.rate = playbackSpeed;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  };

  const handleNextSentence = () => {
    if (!activeShadowingLesson) return;
    if (currentSentenceIndex < activeShadowingLesson.sentences.length - 1) {
      setCurrentSentenceIndex((prev) => prev + 1);
      setEvaluationResult(null);
      setLiveTranscript('');
      setManualInput('');
      setShowManualInput(false);
      setRecordedAudioUrl(null);
      setVideoKey((prev) => prev + 1);
    }
  };

  const handlePrevSentence = () => {
    if (currentSentenceIndex > 0) {
      setCurrentSentenceIndex((prev) => prev - 1);
      setEvaluationResult(null);
      setLiveTranscript('');
      setManualInput('');
      setShowManualInput(false);
      setRecordedAudioUrl(null);
      setVideoKey((prev) => prev + 1);
    }
  };

  const handleJumpToSentence = (idx: number) => {
    setCurrentSentenceIndex(idx);
    setEvaluationResult(null);
    setLiveTranscript('');
    setManualInput('');
    setShowManualInput(false);
    setRecordedAudioUrl(null);
    setVideoKey((prev) => prev + 1);
  };

  const handleToggleSaveVocab = (word: string) => {
    const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (!clean) return;

    try {
      const stored = localStorage.getItem('toeic_saved_vocab');
      let arr: any[] = stored ? JSON.parse(stored) : [];
      const exists = arr.some((item) => (item.word || '').toLowerCase() === clean);

      if (exists) {
        arr = arr.filter((item) => (item.word || '').toLowerCase() !== clean);
        setSavedWords((prev) => {
          const next = new Set(prev);
          next.delete(clean);
          return next;
        });
      } else {
        arr.push({
          word: clean,
          meaning: currentSentence?.vi || 'Từ vựng Shadowing',
          context: currentSentence?.t || '',
          savedAt: new Date().toISOString(),
        });
        setSavedWords((prev) => new Set([...prev, clean]));
      }
      localStorage.setItem('toeic_saved_vocab', JSON.stringify(arr));
    } catch (e) {
      console.error('Error saving vocab:', e);
    }
  };
  useEffect(() => {
    if (!activeShadowingLesson) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handlePlayModelPronunciation();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleReplayVideoSegment();
      } else if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleNextSentence();
      } else if (e.key === 'ArrowLeft' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handlePrevSentence();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeShadowingLesson, isRecording, currentSentenceIndex]);

  const lessonStats = useMemo(() => {
    if (!activeShadowingLesson) return { avg: 0, completed: 0, total: 0 };
    const total = activeShadowingLesson.sentences.length;
    const scores = Object.values(sentenceScores);
    const completed = scores.length;
    const avg = completed > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / completed) : 0;
    return { avg, completed, total };
  }, [activeShadowingLesson, sentenceScores]);

  const loadETSTests = async () => {
    try {
      setLoadingTests(true);
      const res = await api.getSWTests({ test_type: 'speaking' });
      if (res && res.tests && res.tests.length > 0) {
        setTests(res.tests);
      }
    } catch (e) {
      console.error('Error loading ETS tests:', e);
    } finally {
      setLoadingTests(false);
    }
  };

  useEffect(() => {
    if (activeMode === 'ets_tests' && tests.length === 0) {
      loadETSTests();
    }
  }, [activeMode, tests.length]);

  const handleStartETSTest = async (test: SWTest) => {
    try {
      setActiveTest(test);
      setCurrentQIndex(0);
      setRecordingsMap({});
      setTranscriptMap({});
      setQuestionAIFeedback({});
      setFullSessionAIFeedback(null);
      setEtsTimeLeft(20 * 60);

      const res = await api.getSWTestDetail(test.id);
      if (res && res.questions && res.questions.length > 0) {
        setQuestions(res.questions);
      } else {
        setQuestions(generateSampleSpeakingQuestions());
      }
    } catch {
      setQuestions(generateSampleSpeakingQuestions());
    } finally {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const generateSampleSpeakingQuestions = (): SWQuestion[] => [
    {
      question_number: 1,
      question_type: 'Read a text aloud',
      prompt: 'Đọc to đoạn thông báo cho sẵn với phát âm chuẩn, ngắt nghỉ đúng chỗ.',
      context: 'Good afternoon, passengers. This is the pre-boarding announcement for flight 402 to Chicago. We are now inviting passengers with small children and those requiring special assistance to begin boarding at Gate 14. Please have your boarding pass and photo identification ready.',
      image_url: ''
    },
    {
      question_number: 2,
      question_type: 'Read a text aloud',
      prompt: 'Đọc to thông điệp quảng cáo dịch vụ với ngữ điệu tự nhiên, lôi cuốn.',
      context: 'Welcome to Riverside Fitness! Whether you want to build strength, improve flexibility, or simply stay healthy, our expert trainers are here to guide you every step of the way. Visit our reception desk today to claim your complimentary two-week trial pass.',
      image_url: ''
    },
    {
      question_number: 3,
      question_type: 'Describe a picture',
      prompt: 'Miêu tả chi tiết bức ảnh trong vòng 45 giây.',
      context: 'Describe a picture showing people in an office meeting room discussing a project on a whiteboard.',
      image_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80'
    },
    {
      question_number: 4,
      question_type: 'Describe a picture',
      prompt: 'Miêu tả chi tiết bức ảnh tại quán cà phê trong 45 giây.',
      context: 'Describe a picture showing a barista preparing coffee behind a wooden counter while customers wait in line.',
      image_url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80'
    },
    {
      question_number: 5,
      question_type: 'Respond to questions',
      prompt: 'Trả lời phỏng vấn: How often do you buy books, and what genre do you prefer?',
      context: 'Imagine an interviewer calling to ask about your reading habits.',
      image_url: ''
    },
    {
      question_number: 6,
      question_type: 'Respond to questions',
      prompt: 'Trả lời phỏng vấn: Do you prefer physical printed books or e-books? Why?',
      context: 'State your preference clearly with 2 supporting reasons.',
      image_url: ''
    },
    {
      question_number: 7,
      question_type: 'Respond to questions',
      prompt: 'Trả lời phỏng vấn: What factors influence your decision when purchasing a new book?',
      context: 'Provide detailed examples (author reputation, reviews, recommendations).',
      image_url: ''
    },
    {
      question_number: 8,
      question_type: 'Respond using information provided',
      prompt: 'Trả lời thông tin dựa trên lịch trình hội nghị cho trước.',
      context: 'Conference Schedule:\n9:00 AM - Keynote Address by Dr. Angela Vance\n10:30 AM - AI in Business Seminar (Room B)\n12:00 PM - Catered Lunch\nQuestion: Where will the AI seminar take place and who is speaking?',
      image_url: ''
    },
    {
      question_number: 9,
      question_type: 'Respond using information provided',
      prompt: 'Xác nhận thông tin thời gian ăn trưa theo lịch trình.',
      context: 'Question: I heard the keynote speech starts at 11:00 AM, is that correct?',
      image_url: ''
    },
    {
      question_number: 10,
      question_type: 'Respond using information provided',
      prompt: 'Liệt kê các phiên hội thảo buổi chiều theo lịch trình.',
      context: 'Question: Can you tell me all the sessions scheduled after the lunch break?',
      image_url: ''
    },
    {
      question_number: 11,
      question_type: 'Express an opinion',
      prompt: 'Bày tỏ quan điểm (60 giây): Is it better for university students to live on campus or off campus with their family?',
      context: 'State your opinion clearly and support it with reasons and personal experiences.',
      image_url: ''
    }
  ];

  useEffect(() => {
    let interval: any = null;
    if (activeTest && etsTimeLeft > 0) {
      interval = setInterval(() => {
        setEtsTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTest, etsTimeLeft]);

  const handleGradeCurrentETSQuestion = async () => {
    const q = questions[currentQIndex];
    if (!q) return;
    const spoken = transcriptMap[currentQIndex] || '';
    setGradingQuestionLoading(true);
    try {
      const res = await api.gradeSWQuestion({
        test_type: 'speaking',
        question_number: q.question_number,
        prompt: q.prompt,
        context: q.context,
        user_answer: spoken || 'Học viên chưa phát âm rõ câu trả lời.',
      });
      if (res) {
        setQuestionAIFeedback((prev) => ({ ...prev, [currentQIndex]: res }));
      }
    } catch (err) {
      console.error('Error grading speaking question:', err);
    } finally {
      setGradingQuestionLoading(false);
    }
  };

  const handleGradeFullETSSession = async () => {
    if (!activeTest || questions.length === 0) return;
    setGradingSessionLoading(true);
    try {
      const answersPayload = questions.map((q, idx) => ({
        question_number: q.question_number,
        prompt: q.prompt,
        context: q.context,
        user_answer: transcriptMap[idx]?.trim() || 'No answer recorded',
      }));

      const res = await api.gradeSWTest({
        test_type: 'speaking',
        test_name: activeTest.name,
        answers: answersPayload,
      });
      if (res) {
        setFullSessionAIFeedback(res);
      }
    } catch (err) {
      console.error('Error grading full speaking test:', err);
    } finally {
      setGradingSessionLoading(false);
    }
  };
  if (activeShadowingLesson && currentSentence) {
    const totalSentences = activeShadowingLesson.sentences.length;
    const progressPercent = Math.round(((currentSentenceIndex + 1) / totalSentences) * 100);

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        {/* Studio Topbar */}
        <header className="bg-slate-950/90 border-b border-slate-800 sticky top-0 z-30 px-4 py-3 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleExitShadowing}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Thoát Studio</span>
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-2">
                  <span>{activeShadowingLesson.title}</span>
                </h1>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="px-2 py-0.5 rounded-md bg-blue-900/60 text-blue-300 font-bold text-[11px]">
                    {activeShadowingLesson.accent === 'UK' ? '🇬🇧 Anh – Anh' : '🇺🇸 Anh – Mỹ'}
                  </span>
                  <span>•</span>
                  <span>{activeShadowingLesson.channel_name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/60 text-xs font-mono">
                {[0.75, 1.0, 1.25].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      playbackSpeed === speed
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setAutoNextOnSuccess(!autoNextOnSuccess)}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  autoNextOnSuccess
                    ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title="Tự động nhảy câu tiếp theo khi chấm đạt từ 80%"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tự động qua câu (&gt;=80%)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowShortcutsHint(!showShortcutsHint)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Phím tắt luyện nói"
              >
                <Keyboard className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleExitShadowing}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-w-7xl mx-auto mt-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
              <span>Câu {currentSentenceIndex + 1} / {totalSentences}</span>
              <span>{progressPercent}% Hoàn thành</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </header>

        {showShortcutsHint && (
          <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 text-xs text-slate-300 animate-in fade-in">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-blue-400" /> Phím tắt:
                </span>
                <span><kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-blue-300">Space</kbd> : Bật/Tắt Mic</span>
                <span><kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-blue-300">R</kbd> : Nghe giọng mẫu</span>
                <span><kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-blue-300">P</kbd> : Phát lại video đoạn này</span>
                <span><kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-blue-300">→</kbd> : Câu tiếp</span>
                <span><kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-blue-300">←</kbd> : Câu trước</span>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsHint(false)}
                className="text-slate-400 hover:text-white text-xs underline cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {activeShadowingLesson.youtube_id && (
              <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                <div className="relative aspect-video w-full bg-black">
                  <iframe
                    key={`${activeShadowingLesson.youtube_id}_${currentSentenceIndex}_${videoKey}`}
                    src={`https://www.youtube.com/embed/${activeShadowingLesson.youtube_id}?start=${sentenceStartSec}&end=${sentenceEndSec}&autoplay=1&enablejsapi=1&rel=0`}
                    title="YouTube Video Lesson"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-400 font-bold">
                      {Math.floor(currentSentence.s / 60)}:{(Math.floor(currentSentence.s) % 60).toString().padStart(2, '0')} - {Math.floor(currentSentence.e / 60)}:{(Math.floor(currentSentence.e) % 60).toString().padStart(2, '0')}
                    </span>
                    <span>• Đoạn câu hiện tại</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReplayVideoSegment}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-blue-400" />
                      <span>Phát lại đoạn video</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-800/60 rounded-2xl border border-slate-700/80 p-5 sm:p-6 space-y-4 shadow-lg backdrop-blur-xs">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Câu mẫu cần nói theo (Shadowing):</span>
                  </div>

                  <div className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-relaxed select-text">
                    {currentSentence.t.split(/(\s+)/).map((segment, idx) => {
                      const cleanWord = segment.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
                      const isWord = Boolean(cleanWord);
                      const isSaved = isWord && savedWords.has(cleanWord);

                      if (!isWord) return <span key={idx}>{segment}</span>;

                      return (
                        <span
                          key={idx}
                          onClick={() => handleToggleSaveVocab(cleanWord)}
                          title="Click để lưu từ vựng này vào Sổ tay"
                          className={`cursor-pointer rounded px-1 transition-all ${
                            isSaved
                              ? 'bg-amber-500/20 text-amber-300 underline decoration-amber-400 underline-offset-4'
                              : 'hover:bg-blue-600/30 hover:text-blue-200'
                          }`}
                        >
                          {segment}
                        </span>
                      );
                    })}
                  </div>

                  <div className="text-sm sm:text-base text-slate-300 font-medium pt-1 italic">
                    "{currentSentence.vi}"
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePlayModelPronunciation}
                  className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-md hover:shadow-blue-500/25 transition-all cursor-pointer shrink-0 group"
                  title="Nghe phát âm chuẩn người bản xứ (Phím R)"
                >
                  <Volume2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  Mẹo: Click vào bất kỳ từ tiếng Anh nào ở trên để lưu vào Sổ từ vựng.
                </span>
                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="text-slate-400 hover:text-white underline cursor-pointer"
                >
                  {showManualInput ? 'Ẩn nhập tay' : 'Không có mic? Nhập tay'}
                </button>
              </div>

              {showManualInput && (
                <div className="pt-2 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="Gõ lại câu bạn vừa nói..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleEvaluateCurrentSentence(manualInput)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Chấm câu này
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-800/40 rounded-2xl border border-slate-700/80 p-6 flex flex-col items-center justify-center space-y-4 shadow-lg text-center">
              <div className="relative">
                {isRecording && (
                  <div className="absolute -inset-3 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
                )}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
                    isRecording
                      ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-400/50 scale-105'
                      : 'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:scale-105 shadow-blue-500/25'
                  }`}
                  title={isRecording ? 'Bấm để dừng và chấm điểm' : 'Bấm để bắt đầu nói theo câu'}
                >
                  {isRecording ? (
                    <MicOff className="w-8 h-8 animate-pulse" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-bold text-white">
                  {isRecording ? (
                    <span className="text-rose-400 flex items-center justify-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                      Đang lắng nghe... Nói to, rõ ràng theo câu mẫu
                    </span>
                  ) : (
                    <span>Bấm vào Micro hoặc nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-blue-300 font-mono text-xs">Space</kbd> để luyện nói</span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {isRecording ? 'Bấm lại micro khi bạn nói xong để AI chấm từng từ' : 'Máy sẽ nhận diện giọng nói và chấm điểm từng từ'}
                </div>
              </div>

              {(liveTranscript || isRecording) && (
                <div className="w-full max-w-xl bg-slate-950/70 border border-slate-700 rounded-xl p-3 text-left">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Âm thanh thu được từ bạn:
                  </div>
                  <div className="text-sm sm:text-base font-medium text-blue-200 min-h-[28px] font-sans">
                    {liveTranscript || <span className="text-slate-500 italic">Đang chờ giọng nói của bạn...</span>}
                  </div>
                </div>
              )}

              {recordedAudioUrl && !isRecording && (
                <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2 text-xs">
                  <Headphones className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">Nghe lại giọng vừa thu của bạn:</span>
                  <audio controls src={recordedAudioUrl} className="h-7 w-48 sm:w-64" />
                </div>
              )}
            </div>

            {evaluating && (
              <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-center gap-3 text-sm text-blue-300">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI đang phân tích ngữ âm và so khớp từng từ...</span>
              </div>
            )}

            {evaluationResult && !evaluating && (
              <div className="bg-slate-800/90 rounded-2xl border border-slate-700 p-6 space-y-5 shadow-xl animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${
                        evaluationResult.accuracy >= 90
                          ? 'bg-emerald-500 text-slate-950'
                          : evaluationResult.accuracy >= 70
                          ? 'bg-blue-500 text-white'
                          : evaluationResult.accuracy >= 40
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {evaluationResult.accuracy}%
                    </div>
                    <div>
                      <div className="text-base font-bold text-white flex items-center gap-2">
                        <span>
                          {evaluationResult.accuracy >= 90
                            ? 'Xuất sắc! 🎉'
                            : evaluationResult.accuracy >= 70
                            ? 'Rất tốt! 👏'
                            : evaluationResult.accuracy >= 40
                            ? 'Cần cải thiện thêm 💪'
                            : 'Thử lại nhé 🔄'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">
                        {evaluationResult.feedback_vi}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startRecording}
                      className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                      <span>Nói lại câu này</span>
                    </button>
                    {currentSentenceIndex < totalSentences - 1 && (
                      <button
                        type="button"
                        onClick={handleNextSentence}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-600/30"
                      >
                        <span>Câu tiếp theo</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Chi tiết chấm từng từ:</span>
                    <div className="flex items-center gap-3 text-[11px] font-normal normal-case">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Đúng
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Thiếu/Lướt
                      </span>
                      <span className="flex items-center gap-1 text-rose-400">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Cần sửa
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 p-4 bg-slate-950/70 rounded-xl border border-slate-800">
                    {evaluationResult.words.map((w, idx) => {
                      if (w.status === 'correct') {
                        return (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 font-bold text-sm"
                            title="Phát âm chuẩn xác"
                          >
                            {w.word}
                          </span>
                        );
                      }
                      if (w.status === 'missing') {
                        return (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-600/80 text-amber-300 line-through decoration-amber-400 font-medium text-sm"
                            title="Từ bị thiếu hoặc phát âm quá nhỏ"
                          >
                            {w.word}
                          </span>
                        );
                      }
                      if (w.status === 'incorrect') {
                        return (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-600/80 text-rose-300 font-bold text-sm"
                            title={w.spoken ? `Bạn nói: "${w.spoken}"` : 'Phát âm chưa chuẩn'}
                          >
                            {w.word}
                            {w.spoken && (
                              <span className="text-[10px] text-rose-400 block font-normal">
                                (nghe: {w.spoken})
                              </span>
                            )}
                          </span>
                        );
                      }
                      return (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-600 text-slate-400 font-normal text-xs"
                          title="Từ nói thừa"
                        >
                          +{w.word}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handlePrevSentence}
                disabled={currentSentenceIndex === 0}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>

              <div className="text-xs text-slate-400 font-mono">
                {currentSentenceIndex + 1} / {totalSentences}
              </div>

              <button
                type="button"
                onClick={handleNextSentence}
                disabled={currentSentenceIndex === totalSentences - 1}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-600/30"
              >
                <span>Câu tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Tiến độ bài học
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {lessonStats.completed} / {lessonStats.total} câu
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Điểm trung bình
                  </div>
                  <div
                    className={`text-lg font-black mt-0.5 ${
                      lessonStats.avg >= 80
                        ? 'text-emerald-400'
                        : lessonStats.avg >= 50
                        ? 'text-blue-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {lessonStats.completed > 0 ? `${lessonStats.avg}%` : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  Danh sách câu ({totalSentences})
                </span>
                <span className="text-[11px] text-slate-400 font-normal">Click để nhảy câu</span>
              </div>

              <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {activeShadowingLesson.sentences.map((sent, idx) => {
                  const isCurrent = idx === currentSentenceIndex;
                  const score = sentenceScores[idx];
                  const hasScore = score !== undefined;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleJumpToSentence(idx)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        isCurrent
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs'
                          : 'bg-slate-900/50 border-slate-750 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-bold font-mono flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate leading-tight">
                          {sent.t}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {sent.vi}
                        </div>
                      </div>

                      {hasScore && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 ${
                            score >= 80
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : score >= 50
                              ? 'bg-blue-950 text-blue-300 border border-blue-700'
                              : 'bg-rose-950 text-rose-300 border border-rose-700'
                          }`}
                        >
                          {score}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (activeTest && questions.length > 0) {
    const currentQ = questions[currentQIndex];
    const totalQ = questions.length;
    const currentTranscript = transcriptMap[currentQIndex] || '';

    return (
      <div className="min-h-screen bg-slate-50 pb-16 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setActiveTest(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ← Danh sách đề
              </button>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-slate-900 truncate">
                  {activeTest.name}
                </h1>
                <div className="text-xs text-slate-500">
                  Câu hỏi {currentQIndex + 1} / {totalQ} • {currentQ?.question_type}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {Math.floor(etsTimeLeft / 60).toString().padStart(2, '0')}:
                  {(etsTimeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentQIndex;
                  const hasAnswer = Boolean(transcriptMap[idx]?.trim());
                  return (
                    <button
                      key={q.question_number}
                      type="button"
                      onClick={() => setCurrentQIndex(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-xs scale-105'
                          : hasAnswer
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {currentQ && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">
                    <span>Part / Type: {currentQ.question_type}</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    {currentQ.prompt}
                  </h2>

                  {currentQ.image_url && (
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                      <img
                        src={currentQ.image_url}
                        alt="Question visual"
                        className="w-full h-auto object-cover max-h-72"
                      />
                    </div>
                  )}

                  {currentQ.context && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                      {currentQ.context}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-6 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Thu âm câu trả lời của bạn:
                    </span>
                    <button
                      type="button"
                      onClick={handleGradeCurrentETSQuestion}
                      disabled={gradingQuestionLoading || !currentTranscript}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      {gradingQuestionLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Bot className="w-3.5 h-3.5" />
                      )}
                      <span>Chấm điểm với AI</span>
                    </button>
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (isRecording) {
                          stopRecording();
                          setTranscriptMap((prev) => ({
                            ...prev,
                            [currentQIndex]: liveTranscript,
                          }));
                        } else {
                          startRecording();
                        }
                      }}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                        isRecording
                          ? 'bg-rose-600 text-white ring-4 ring-rose-300 animate-pulse'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                    </button>
                    <div className="text-xs font-semibold text-slate-600">
                      {isRecording ? 'Đang thu âm... Bấm lại để hoàn tất' : 'Bấm mic để bắt đầu trả lời'}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      Nội dung bài nói ghi nhận được:
                    </label>
                    <textarea
                      value={currentTranscript || liveTranscript}
                      onChange={(e) =>
                        setTranscriptMap((prev) => ({
                          ...prev,
                          [currentQIndex]: e.target.value,
                        }))
                      }
                      rows={4}
                      placeholder="Bấm mic để nói hoặc tự nhập nội dung bài nói vào đây..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  {questionAIFeedback[currentQIndex] && (
                    <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200 space-y-2 text-xs text-blue-950">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-blue-900">
                          <Bot className="w-4 h-4 text-blue-600" />
                          Đánh giá AI: {questionAIFeedback[currentQIndex].level || 'B2'}
                        </span>
                        <span className="font-black text-blue-700">
                          {questionAIFeedback[currentQIndex].score_estimate}
                        </span>
                      </div>
                      <p className="text-slate-700">
                        {questionAIFeedback[currentQIndex].overall_comment}
                      </p>
                      {questionAIFeedback[currentQIndex].sample_answer && (
                        <div className="mt-2 pt-2 border-t border-blue-200/80">
                          <div className="font-bold text-blue-900 mb-0.5">Câu trả lời mẫu:</div>
                          <div className="italic text-slate-600">
                            {questionAIFeedback[currentQIndex].sample_answer}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentQIndex === 0}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      ← Câu trước
                    </button>
                    {currentQIndex < totalQ - 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentQIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>Câu sau</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGradeFullETSSession}
                        disabled={gradingSessionLoading}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {gradingSessionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Award className="w-3.5 h-3.5" />
                        )}
                        <span>Hoàn thành & Chấm toàn bài</span>
                      </button>
                    )}
                  </div>
                </div>

                {fullSessionAIFeedback && (
                  <div className="bg-white rounded-2xl border-2 border-emerald-400 p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-black text-slate-900">
                        Kết quả toàn bài thi TOEIC Speaking
                      </div>
                      <div className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm">
                        {fullSessionAIFeedback.total_score_estimate || '160/200'}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      {fullSessionAIFeedback.overall_comment}
                    </div>
                    {fullSessionAIFeedback.action_plan && (
                      <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1">
                        <div className="font-bold text-slate-900">Kế hoạch cải thiện:</div>
                        <div>{fullSessionAIFeedback.action_plan}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 font-sans">
      {/* 1. Header Banner (Inspired by DauEnglish /speak) */}
      <section className="bg-gradient-to-b from-blue-50/90 via-white to-slate-50/70 border-b border-slate-200/80 pt-10 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-700 text-xs font-extrabold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Luyện nói tiếng Anh</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
            Nói tự nhiên{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              như người bản xứ
            </span>{' '}
            từ từng câu ngắn
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-medium">
            Shadowing theo video: nghe từng câu, nói theo, máy chấm từng từ với công nghệ AI Speech Evaluation.
          </p>

          <div className="pt-4 flex items-center justify-center">
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300/80 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveMode('shadowing')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeMode === 'shadowing'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Film className="w-4 h-4 text-blue-600" />
                <span>Luyện nói Shadowing ({totalLessons || 265})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('ets_tests')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeMode === 'ets_tests'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mic className="w-4 h-4 text-blue-600" />
                <span>Đề thi ETS Speaking (45 đề)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MODE: SHADOWING CATALOG */}
      {activeMode === 'shadowing' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="space-y-4">
            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORY_TABS.map((tab) => {
                const count = categoryCounts[tab.id];
                const isSelected = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(tab.id);
                      setPage(1);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {count !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sub-filters: Accent & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Accent Selector */}
              <div className="flex items-center gap-2">
                {ACCENT_TABS.map((acc) => {
                  const isSelected = selectedAccent === acc.id;
                  const count = accentCounts[acc.id];
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccent(acc.id);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{acc.label}</span>
                      {count !== undefined && (
                        <span className="text-[10px] text-slate-400">({count})</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Search box */}
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm video, kênh, chủ đề..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Video Grid (4 Columns Responsive) */}
          {shadowingLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <div className="text-sm font-semibold text-slate-600">
                Đang tải danh sách bài học Shadowing...
              </div>
            </div>
          ) : shadowingLessons.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Film className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Không tìm thấy video phù hợp
              </h3>
              <p className="text-xs text-slate-500">
                Hãy thử đổi từ khóa tìm kiếm hoặc chọn chủ đề khác.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {shadowingLessons.map((lesson) => {
                const thumb =
                  lesson.thumbnail_url ||
                  (lesson.youtube_id
                    ? `https://img.youtube.com/vi/${lesson.youtube_id}/mqdefault.jpg`
                    : '');

                return (
                  <div
                    key={lesson.id}
                    onClick={() => handleOpenShadowingLesson(lesson)}
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
                  >
                    <div className="relative aspect-video bg-slate-900 overflow-hidden">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={lesson.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                          <Film className="w-8 h-8" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>

                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-white font-mono text-[10px] font-bold">
                        {lesson.duration_formatted}
                      </div>

                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold">
                        {lesson.accent === 'UK' ? '🇬🇧 UK' : '🇺🇸 US'}
                      </div>

                      {lesson.level && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold uppercase">
                          {lesson.level}
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
                      <div className="space-y-1">
                        <h2 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                          {lesson.title}
                        </h2>
                        {lesson.title_vi && (
                          <div className="text-xs text-slate-500 line-clamp-1">
                            {lesson.title_vi}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-blue-600">
                          {lesson.sentence_count} câu
                        </span>
                        <span className="truncate max-w-[140px] text-right font-medium">
                          {lesson.channel_name}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalLessons > 24 && (
            <div className="pt-6 flex items-center justify-between border-t border-slate-200">
              <div className="text-xs text-slate-500">
                Hiển thị trang {page} / {Math.ceil(totalLessons / 24)} • Tổng {totalLessons} bài học
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  ← Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={page * 24 >= totalLessons}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 3. MODE: ETS SPEAKING TESTS CATALOG */}
      {activeMode === 'ets_tests' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Bộ đề thi thử TOEIC Speaking chuẩn ETS
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                45 đề thi hoàn chỉnh với 11 câu hỏi theo đúng format phòng thi quốc tế.
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={etsSearchQuery}
                onChange={(e) => setEtsSearchQuery(e.target.value)}
                placeholder="Tìm đề thi..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 shadow-2xs"
              />
            </div>
          </div>

          {loadingTests ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <div className="text-sm font-semibold text-slate-600">
                Đang tải 45 đề thi TOEIC Speaking...
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {tests
                .filter((t) => t.name.toLowerCase().includes(etsSearchQuery.toLowerCase()))
                .map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold">
                          ETS Speaking
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {t.duration_minutes || 20} phút
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {t.name}
                      </h3>
                      <div className="text-xs text-slate-500">
                        11 câu hỏi • Đọc văn bản, miêu tả tranh, trả lời câu hỏi và bày tỏ quan điểm.
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Chấm điểm AI 1-1
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartETSTest(t)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <span>Luyện ngay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export const SpeakingPracticePage: React.FC<SpeakingPracticePageProps> = (props) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Luyện nói (TOEIC Speaking & Shadowing)"
        featureDesc="265 video luyện nói Shadowing chấm từng từ theo chuẩn DauEnglish và 45 đề thi thử ETS Speaking có chấm AI."
        onNavigate={props.onNavigate}
        onOpenAuth={props.onOpenAuth}
        onOpenRBAC={props.onOpenRBAC}
      />
    );
  }

  return <SpeakingPracticePageInner {...props} />;
};

export default SpeakingPracticePage;
