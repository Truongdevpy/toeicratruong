import { api } from './api';

const CORRECT_QUESTIONS_KEY = 'toeic_correct_questions_v2';
const TEST_HISTORY_KEY = 'toeic_test_attempt_history_v2';
const QUESTION_HISTORY_KEY = 'toeic_question_history_v2';

export interface TestHistoryRecord {
  id: number | string;
  testId: string;
  testTitle: string;
  testType?: string;
  mode?: string;
  targetPart?: number;
  totalScore: number;
  listeningScore?: number;
  readingScore?: number;
  listeningCorrect?: string;
  readingCorrect?: string;
  totalCorrect: number;
  totalQuestions: number;
  accuracy: number;
  timeSpentSeconds: number;
  completedAt: string;
  reviewAnswers?: any[];
}

export interface QuestionHistoryRecord {
  id: string | number;
  questionId: string;
  testId?: string;
  questionNumber?: number;
  part: number;
  section: string;
  questionText?: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  timeSpentSec?: number;
  createdAt: string;
}

class HistoryStore {
  private correctQuestions: Set<string> = new Set();
  private isLoaded = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(CORRECT_QUESTIONS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this.correctQuestions = new Set(arr);
        }
      }
      this.isLoaded = true;
    } catch {
      this.correctQuestions = new Set();
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(CORRECT_QUESTIONS_KEY, JSON.stringify(Array.from(this.correctQuestions)));
    } catch {}
  }

  public isQuestionMarkedCorrect(questionKey: string | number): boolean {
    if (!questionKey) return false;
    const strKey = String(questionKey).trim();
    return this.correctQuestions.has(strKey);
  }

  public isQuestionMarkedIncorrect(questionKey: string | number): boolean {
    if (!questionKey) return false;
    const strKey = String(questionKey).trim();
    return this.getQuestionAttempts().some((a: QuestionHistoryRecord) => a.questionId === strKey && !a.isCorrect);
  }

  public markQuestionCorrect(questionKey: string | number, meta?: {
    testId?: string;
    questionNumber?: number;
    part?: number;
    section?: string;
    questionText?: string;
    selectedOption?: string;
    correctOption?: string;
  }) {
    if (!questionKey) return;
    const strKey = String(questionKey).trim();
    this.correctQuestions.add(strKey);
    this.saveToLocalStorage();

    // Also record to local question history
    this.saveQuestionAttempt({
      id: `local-q-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      questionId: strKey,
      testId: meta?.testId || '',
      questionNumber: meta?.questionNumber,
      part: meta?.part || 1,
      section: meta?.section || 'listening',
      questionText: meta?.questionText || '',
      selectedOption: meta?.selectedOption || 'A',
      correctOption: meta?.correctOption || 'A',
      isCorrect: true,
      createdAt: new Date().toISOString()
    });

    // Sync to backend asynchronously
    try {
      api.recordQuestionAttempt({
        question_id: strKey,
        test_id: meta?.testId,
        question_number: meta?.questionNumber,
        part: meta?.part || 1,
        section: meta?.section,
        question_text: meta?.questionText,
        selected_option: meta?.selectedOption,
        correct_option: meta?.correctOption,
        is_correct: true,
        time_spent_sec: 25
      }).catch(() => {});
    } catch {}
  }

  public markQuestionIncorrect(questionKey: string | number, meta?: {
    testId?: string;
    questionNumber?: number;
    part?: number;
    section?: string;
    questionText?: string;
    selectedOption?: string;
    correctOption?: string;
  }) {
    if (!questionKey) return;
    const strKey = String(questionKey).trim();

    // Record attempt
    this.saveQuestionAttempt({
      id: `local-q-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      questionId: strKey,
      testId: meta?.testId || '',
      questionNumber: meta?.questionNumber,
      part: meta?.part || 1,
      section: meta?.section || 'listening',
      questionText: meta?.questionText || '',
      selectedOption: meta?.selectedOption || 'A',
      correctOption: meta?.correctOption || 'B',
      isCorrect: false,
      createdAt: new Date().toISOString()
    });

    try {
      api.recordQuestionAttempt({
        question_id: strKey,
        test_id: meta?.testId,
        question_number: meta?.questionNumber,
        part: meta?.part || 1,
        section: meta?.section,
        question_text: meta?.questionText,
        selected_option: meta?.selectedOption,
        correct_option: meta?.correctOption,
        is_correct: false,
        time_spent_sec: 25
      }).catch(() => {});
    } catch {}
  }

  public getCorrectQuestionsList(): string[] {
    return Array.from(this.correctQuestions);
  }

  public getTestAttempts(): TestHistoryRecord[] {
    try {
      const raw = localStorage.getItem(TEST_HISTORY_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}

    return [];
  }

  public saveTestAttempt(rec: TestHistoryRecord) {
    try {
      const existing = this.getTestAttempts();
      const updated = [rec, ...existing.filter((x) => x.id !== rec.id && (x.testId !== rec.testId || x.completedAt !== rec.completedAt))];
      localStorage.setItem(TEST_HISTORY_KEY, JSON.stringify(updated.slice(0, 100)));
    } catch {}
  }

  public deleteTestAttempt(id: number | string) {
    try {
      const existing = this.getTestAttempts();
      const updated = existing.filter((x) => String(x.id) !== String(id));
      localStorage.setItem(TEST_HISTORY_KEY, JSON.stringify(updated));
    } catch {}
  }

  public getQuestionAttempts(): QuestionHistoryRecord[] {
    try {
      const raw = localStorage.getItem(QUESTION_HISTORY_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  public saveQuestionAttempt(rec: QuestionHistoryRecord) {
    try {
      const existing = this.getQuestionAttempts();
      const updated = [rec, ...existing.filter((x) => x.id !== rec.id)];
      localStorage.setItem(QUESTION_HISTORY_KEY, JSON.stringify(updated.slice(0, 300)));
    } catch {}
  }

  public async syncWithBackend() {
    try {
      const res = await api.getCorrectQuestions();
      if (res && res.correct_question_ids && Array.isArray(res.correct_question_ids)) {
        res.correct_question_ids.forEach((id: string) => this.correctQuestions.add(id));
        this.saveToLocalStorage();
      }

      const testRes = await api.getTestHistory({ limit: 50 });
      if (testRes && testRes.items && Array.isArray(testRes.items)) {
        const local = this.getTestAttempts();
        const map = new Map<string, TestHistoryRecord>();
        local.forEach((l) => map.set(String(l.id), l));
        testRes.items.forEach((item: any) => {
          map.set(String(item.id), {
            id: item.id,
            testId: item.test_id,
            testTitle: item.test_title,
            testType: item.test_type,
            mode: item.mode,
            targetPart: item.target_part,
            totalScore: item.total_score,
            listeningScore: item.listening_score,
            readingScore: item.reading_score,
            listeningCorrect: item.listening_correct,
            readingCorrect: item.reading_correct,
            totalCorrect: item.total_correct,
            totalQuestions: item.total_questions,
            accuracy: item.accuracy,
            timeSpentSeconds: item.time_spent_seconds,
            completedAt: item.created_at || new Date().toISOString()
          });
        });
        localStorage.setItem(TEST_HISTORY_KEY, JSON.stringify(Array.from(map.values())));
      }
    } catch {}
  }
}

export const historyStore = new HistoryStore();
