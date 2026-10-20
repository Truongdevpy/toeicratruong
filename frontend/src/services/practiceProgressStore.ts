// -*- coding: utf-8 -*-
import { historyStore } from './historyStore';

const LEVEL_PROGRESS_STORAGE_KEY = 'toeic_practice_level_progress_v2';
const SAVED_VOCAB_KEY = 'toeic_saved_vocab';

export interface LevelProgressRecord {
  totalQuestions: number;
  answeredQuestions: Record<string, { choice: string; isCorrect: boolean; timestamp: number }>;
  correctQuestionIds: string[];
  wrongQuestionIds: string[];
  lastStudiedAt?: string;
}

export interface SavedVocabItem {
  word: string;
  meaning: string;
  context?: string;
  savedAt: string;
}

// Real user progress map - No fake hardcoded counts
const DEFAULT_SEEDS: Record<string, LevelProgressRecord> = {};

const DEFAULT_VOCAB_SEEDS: SavedVocabItem[] = [
  { word: 'reliable', meaning: 'đáng tin cậy, chắc chắn', context: 'a more reliable copy machine', savedAt: new Date().toISOString() },
  { word: 'glitch', meaning: 'trục trặc nhỏ, sự cố kỹ thuật', context: 'technical glitch in the software', savedAt: new Date().toISOString() },
  { word: 'subsequently', meaning: 'sau đó, tiếp theo', context: 'subsequently appointed as director', savedAt: new Date().toISOString() },
  { word: 'feasibility', meaning: 'tính khả thi', context: 'assess the feasibility of the project', savedAt: new Date().toISOString() },
  { word: 'mandatory', meaning: 'bắt buộc', context: 'attendance is mandatory for all staff', savedAt: new Date().toISOString() },
  { word: 'reimbursement', meaning: 'sự hoàn trả, thanh toán lại', context: 'travel expense reimbursement', savedAt: new Date().toISOString() },
  { word: 'commence', meaning: 'bắt đầu, khởi đầu', context: 'construction will commence next Monday', savedAt: new Date().toISOString() },
  { word: 'unanimous', meaning: 'nhất trí, đồng thuận 100%', context: 'unanimous vote by the board', savedAt: new Date().toISOString() },
  { word: 'tentative', meaning: 'dự kiến, chưa dứt khoát', context: 'a tentative schedule for next week', savedAt: new Date().toISOString() },
  { word: 'complimentary', meaning: 'miễn phí, tặng kèm', context: 'complimentary breakfast buffet', savedAt: new Date().toISOString() },
  { word: 'preliminary', meaning: 'sơ bộ, bước đầu', context: 'preliminary findings of the audit', savedAt: new Date().toISOString() },
  { word: 'lucrative', meaning: 'sinh lợi, có nhiều lợi nhuận', context: 'a lucrative business contract', savedAt: new Date().toISOString() },
  { word: 'stringent', meaning: 'nghiêm ngặt, chặt chẽ', context: 'stringent safety regulations', savedAt: new Date().toISOString() },
  { word: 'expedite', meaning: 'xúc tiến, đẩy nhanh tiến độ', context: 'expedite the shipping process', savedAt: new Date().toISOString() },
  { word: 'comprehensive', meaning: 'toàn diện, bao quát', context: 'a comprehensive training manual', savedAt: new Date().toISOString() },
  { word: 'speculate', meaning: 'suy đoán, đồn đoán', context: 'analysts speculate market recovery', savedAt: new Date().toISOString() },
  { word: 'subcontractor', meaning: 'nhà thầu phụ', context: 'hiring a local subcontractor', savedAt: new Date().toISOString() },
  { word: 'deliberate', meaning: 'thận trọng, có chủ đích', context: 'deliberate discussion before deciding', savedAt: new Date().toISOString() },
  { word: 'subsidize', meaning: 'trợ cấp, hỗ trợ kinh phí', context: 'government subsidizes public transport', savedAt: new Date().toISOString() },
  { word: 'fluctuate', meaning: 'biến động, dao động', context: 'prices fluctuate seasonally', savedAt: new Date().toISOString() },
  { word: 'recession', meaning: 'sự suy thoái kinh tế', context: 'surviving during the global recession', savedAt: new Date().toISOString() },
  { word: 'stipulation', meaning: 'điều khoản quy định', context: 'according to the contract stipulation', savedAt: new Date().toISOString() },
  { word: 'adjacent', meaning: 'liền kề, ngay sát', context: 'adjacent to the conference hall', savedAt: new Date().toISOString() },
  { word: 'amenity', meaning: 'tiện nghi, dịch vụ kèm theo', context: 'hotel offers modern amenities', savedAt: new Date().toISOString() },
  { word: 'prerequisite', meaning: 'điều kiện tiên quyết', context: 'prerequisite for promotion', savedAt: new Date().toISOString() },
  { word: 'discrepancy', meaning: 'sự khác biệt, sai lệch số liệu', context: 'discrepancy in the financial report', savedAt: new Date().toISOString() },
  { word: 'negligence', meaning: 'sự cẩu thả, bất cẩn', context: 'due to employee negligence', savedAt: new Date().toISOString() },
  { word: 'procure', meaning: 'thu mua, kiếm được', context: 'procure raw materials in bulk', savedAt: new Date().toISOString() },
  { word: 'prospective', meaning: 'tiềm năng, triển vọng', context: 'meeting with prospective clients', savedAt: new Date().toISOString() },
  { word: 'scrutinize', meaning: 'kiểm tra kỹ lưỡng, soi xét', context: 'scrutinize all receipts carefully', savedAt: new Date().toISOString() }
];

class PracticeProgressStore {
  private progressMap: Record<string, LevelProgressRecord> = {};
  private savedVocabs: SavedVocabItem[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.subscribe = this.subscribe.bind(this);
    this.getSavedVocabs = this.getSavedVocabs.bind(this);
    this.addSavedVocab = this.addSavedVocab.bind(this);
    this.removeSavedVocab = this.removeSavedVocab.bind(this);
    this.getLevelData = this.getLevelData.bind(this);
    this.getLevelStats = this.getLevelStats.bind(this);
    this.recordAnswer = this.recordAnswer.bind(this);
    this.resetLevel = this.resetLevel.bind(this);
    this.updateTotalQuestions = this.updateTotalQuestions.bind(this);
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(LEVEL_PROGRESS_STORAGE_KEY);
      if (raw) {
        this.progressMap = JSON.parse(raw);
      } else {
        this.progressMap = { ...DEFAULT_SEEDS };
        this.saveProgressToStorage();
      }
    } catch {
      this.progressMap = { ...DEFAULT_SEEDS };
    }

    try {
      const rawVocab = localStorage.getItem(SAVED_VOCAB_KEY);
      if (rawVocab) {
        this.savedVocabs = JSON.parse(rawVocab);
      } else {
        this.savedVocabs = [...DEFAULT_VOCAB_SEEDS];
        this.saveVocabToStorage();
      }
    } catch {
      this.savedVocabs = [...DEFAULT_VOCAB_SEEDS];
    }
  }

  private saveProgressToStorage() {
    try {
      localStorage.setItem(LEVEL_PROGRESS_STORAGE_KEY, JSON.stringify(this.progressMap));
      this.notifyListeners();
    } catch {}
  }

  private saveVocabToStorage() {
    try {
      localStorage.setItem(SAVED_VOCAB_KEY, JSON.stringify(this.savedVocabs));
      this.notifyListeners();
    } catch {}
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  }

  public updateTotalQuestions(levelKey: string, total: number) {
    if (typeof total === 'number' && total > 0) {
      const data = this.getLevelData(levelKey, total);
      data.totalQuestions = total;
      this.saveProgressToStorage();
      this.notifyListeners();
    }
  }

  public getLevelData(levelKey: string, initialTotal?: number): LevelProgressRecord {
    if (!this.progressMap[levelKey]) {
      this.progressMap[levelKey] = {
        totalQuestions: initialTotal && initialTotal > 0 ? initialTotal : 0,
        answeredQuestions: {},
        correctQuestionIds: [],
        wrongQuestionIds: []
      };
    } else if (initialTotal && initialTotal > 0) {
      this.progressMap[levelKey].totalQuestions = initialTotal;
    }
    return this.progressMap[levelKey];
  }

  public getLevelStats(levelKey: string, fallbackTotal?: number) {
    const data = this.getLevelData(levelKey, fallbackTotal);
    const total = (fallbackTotal && fallbackTotal > 0) ? fallbackTotal : (data.totalQuestions || 0);
    const correctCount = data.correctQuestionIds.length;
    const wrongCount = data.wrongQuestionIds.length;
    const answered = correctCount + wrongCount;

    return {
      total,
      answered,
      correct: correctCount,
      wrong: wrongCount,
      correctIds: data.correctQuestionIds,
      wrongIds: data.wrongQuestionIds
    };
  }

  public recordAnswer(
    levelKey: string,
    questionId: string,
    choice: string,
    isCorrect: boolean,
    totalQuestionsCount?: number
  ) {
    const qStr = String(questionId);
    const data = this.getLevelData(levelKey);
    if (totalQuestionsCount) {
      data.totalQuestions = totalQuestionsCount;
    }

    data.answeredQuestions[qStr] = {
      choice,
      isCorrect,
      timestamp: Date.now()
    };

    if (isCorrect) {
      if (!data.correctQuestionIds.includes(qStr)) {
        data.correctQuestionIds.push(qStr);
      }
      data.wrongQuestionIds = data.wrongQuestionIds.filter((id) => id !== qStr);
      historyStore.markQuestionCorrect(qStr);
    } else {
      if (!data.wrongQuestionIds.includes(qStr)) {
        data.wrongQuestionIds.push(qStr);
      }
      data.correctQuestionIds = data.correctQuestionIds.filter((id) => id !== qStr);
      historyStore.markQuestionIncorrect(qStr);
    }

    data.lastStudiedAt = new Date().toISOString();
    this.progressMap[levelKey] = data;
    this.saveProgressToStorage();
  }

  public resetLevel(levelKey: string) {
    const data = this.getLevelData(levelKey);
    // Unmark questions from correctQuestions in historyStore if desired, or simply reset level progress
    data.answeredQuestions = {};
    data.correctQuestionIds = [];
    data.wrongQuestionIds = [];
    data.lastStudiedAt = undefined;
    this.progressMap[levelKey] = data;
    this.saveProgressToStorage();
  }

  // Vocabulary Basket methods
  public getSavedVocabs(): SavedVocabItem[] {
    return this.savedVocabs;
  }

  public addSavedVocab(item: { word: string; meaning: string; context?: string }): boolean {
    const cleanWord = item.word.trim();
    if (!cleanWord) return false;
    const exists = this.savedVocabs.some((v) => v.word.toLowerCase() === cleanWord.toLowerCase());
    if (exists) return false;

    this.savedVocabs = [
      {
        word: cleanWord,
        meaning: item.meaning || '',
        context: item.context || '',
        savedAt: new Date().toISOString()
      },
      ...this.savedVocabs
    ];
    this.saveVocabToStorage();
    return true;
  }

  public removeSavedVocab(word: string) {
    const cleanWord = word.trim().toLowerCase();
    this.savedVocabs = this.savedVocabs.filter((v) => v.word.toLowerCase() !== cleanWord);
    this.saveVocabToStorage();
  }
}

export const practiceProgressStore = new PracticeProgressStore();
