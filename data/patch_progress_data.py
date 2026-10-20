import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'../frontend/src/pages/MockTestsPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add TrendingUp, XCircle to lucide-react import
old_import = "  CheckCheck\n} from 'lucide-react';"
new_import = "  CheckCheck,\n  TrendingUp,\n  XCircle\n} from 'lucide-react';"

if "TrendingUp," not in text:
    assert old_import in text, "old_import not found"
    text = text.replace(old_import, new_import, 1)

# 2. Add PracticeSessionRecord and DEFAULT_PRACTICE_SESSIONS before MockTestsPageInner
target_before_inner = "const MockTestsPageInner: React.FC<MockTestsPageProps> = ({"
data_models = """export interface PracticeSessionRecord {
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

"""

if "PRACTICE_SESSIONS_STORAGE_KEY" not in text:
    assert target_before_inner in text, "target_before_inner not found"
    text = text.replace(target_before_inner, data_models + target_before_inner, 1)

# 3. Update catalogTab and add progress states
old_catalog_tab_init = "  const [catalogTab, setCatalogTab] = useState<'catalog' | 'test_history' | 'question_history'>(initialTab || 'catalog');"
new_catalog_tab_init = """  const [catalogTab, setCatalogTab] = useState<'catalog' | 'progress' | 'test_history' | 'question_history'>(() => {
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
  });"""

if old_catalog_tab_init in text:
    text = text.replace(old_catalog_tab_init, new_catalog_tab_init, 1)

# 4. Add helper methods: handleRedoWrongQuestions, partStatsList, filteredSessions
target_helpers_pos = "  const isPart3or4 = currentQ && (currentQ.part === 3 || currentQ.part === 4);"
new_helpers = """  const handleRedoWrongQuestions = async (session: PracticeSessionRecord) => {
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

"""

if "handleRedoWrongQuestions" not in text:
    assert target_helpers_pos in text, "target_helpers_pos not found"
    text = text.replace(target_helpers_pos, new_helpers + target_helpers_pos, 1)

with open(r'../frontend/src/pages/MockTestsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Progress data models and helpers added successfully!")
