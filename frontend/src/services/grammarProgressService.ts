// -*- coding: utf-8 -*-
export type LessonNodeType = 'theory' | 'traps' | 'practice_basic' | 'practice_adv' | 'checkpoint';

export interface GrammarLessonNode {
  id: string;
  topicId: string;
  unitIndex: number;
  nodeIndex: number;
  type: LessonNodeType;
  title: string;
  subtitle: string;
  questionCount: number;
  xpReward: number;
}

export interface NodeCheckpoint {
  mode: 'theory' | 'exercise';
  theoryCardIdx?: number;
  questionIndex?: number;
  correctCount?: number;
  totalAttempts?: number;
  updatedAt: string;
}

export interface NodeProgress {
  status: 'locked' | 'unlocked' | 'completed';
  stars: number;
  scorePercent: number;
  completedAt?: string;
  attemptsCount: number;
  wrongQuestionIds?: string[];
  checkpoint?: NodeCheckpoint;
}

export interface GrammarUserProgress {
  userId: string | number;
  hearts: number;
  lastHeartRegen?: string;
  nodes: Record<string, NodeProgress>;
  skippedTopics: string[];
  totalXp: number;
  lastActiveNodeId?: string;
}

const STORAGE_KEY_PREFIX = 'toeic_grammar_duo_progress_';

class GrammarProgressService {
  private getKey(userId?: string | number): string {
    return STORAGE_KEY_PREFIX + (userId || 'guest');
  }

  public getProgress(userId?: string | number, isVip: boolean = false): GrammarUserProgress {
    try {
      const raw = localStorage.getItem(this.getKey(userId));
      if (raw) {
        const parsed: GrammarUserProgress = JSON.parse(raw);
        if (typeof parsed.hearts !== 'number') parsed.hearts = isVip ? 999 : 10;
        if (parsed.hearts === 5 && !parsed.lastHeartRegen) parsed.hearts = 10;
        if (!parsed.nodes) parsed.nodes = {};
        if (!parsed.skippedTopics) parsed.skippedTopics = [];
        return parsed;
      }
    } catch {
      // fallback
    }

    return {
      userId: userId || 'guest',
      hearts: isVip ? 999 : 10,
      nodes: {},
      skippedTopics: [],
      totalXp: 0,
      lastActiveNodeId: undefined,
    };
  }

  public saveProgress(progress: GrammarUserProgress) {
    try {
      localStorage.setItem(this.getKey(progress.userId), JSON.stringify(progress));
    } catch (e) {
      console.warn('Failed to save grammar progress', e);
    }
  }

  public isNodeAccessible(
    nodeId: string,
    allNodesInOrder: GrammarLessonNode[],
    progress: GrammarUserProgress,
    _isVip: boolean = false
  ): boolean {
    // Chuẩn Duolingo: Mở khóa tuần tự nghiêm ngặt (kể cả tài khoản VIP) để tạo trải nghiệm học tập chuẩn hóa
    const p = progress.nodes[nodeId];
    if (p && p.status === 'completed') return true;

    const node = allNodesInOrder.find((n) => n.id === nodeId);
    if (node && progress.skippedTopics && progress.skippedTopics.includes(node.topicId)) return true;

    if (allNodesInOrder.length > 0 && allNodesInOrder[0].id === nodeId) return true;

    const currentIndex = allNodesInOrder.findIndex((n) => n.id === nodeId);
    if (currentIndex <= 0) return true;

    const previousNode = allNodesInOrder[currentIndex - 1];
    const prevProg = progress.nodes[previousNode.id];
    return Boolean(prevProg && prevProg.status === 'completed');
  }

  public saveNodeCheckpoint(
    userId: string | number | undefined,
    nodeId: string,
    checkpoint: NodeCheckpoint,
    isVip: boolean = false
  ): GrammarUserProgress {
    const progress = this.getProgress(userId, isVip);
    const existing = progress.nodes[nodeId];
    progress.nodes[nodeId] = {
      status: existing?.status || 'unlocked',
      stars: existing?.stars || 0,
      scorePercent: existing?.scorePercent || 0,
      attemptsCount: existing?.attemptsCount || 0,
      completedAt: existing?.completedAt,
      wrongQuestionIds: existing?.wrongQuestionIds,
      checkpoint,
    };
    progress.lastActiveNodeId = nodeId;
    this.saveProgress(progress);
    return progress;
  }

  public clearNodeCheckpoint(
    userId: string | number | undefined,
    nodeId: string,
    isVip: boolean = false
  ): GrammarUserProgress {
    const progress = this.getProgress(userId, isVip);
    if (progress.nodes[nodeId]) {
      delete progress.nodes[nodeId].checkpoint;
      this.saveProgress(progress);
    }
    return progress;
  }

  public completeNode(
    userId: string | number | undefined,
    node: GrammarLessonNode,
    scorePercent: number,
    wrongQuestionIds: string[] = [],
    isVip: boolean = false
  ): { earnedXp: number; stars: number; updatedProgress: GrammarUserProgress } {
    const progress = this.getProgress(userId, isVip);
    let stars = 1;
    if (scorePercent >= 90) stars = 3;
    else if (scorePercent >= 70) stars = 2;

    const earnedXp = node.xpReward;
    const existing = progress.nodes[node.id];

    progress.nodes[node.id] = {
      status: 'completed',
      stars: Math.max(existing?.stars || 0, stars),
      scorePercent: Math.max(existing?.scorePercent || 0, scorePercent),
      completedAt: new Date().toISOString(),
      attemptsCount: (existing?.attemptsCount || 0) + 1,
      wrongQuestionIds,
      checkpoint: undefined,
    };

    progress.totalXp = (progress.totalXp || 0) + earnedXp;
    progress.lastActiveNodeId = node.id;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem('toeic_last_study_date', todayStr);
      window.dispatchEvent(new Event('toeic_study_activity'));
    } catch {}

    this.saveProgress(progress);
    return { earnedXp, stars, updatedProgress: progress };
  }

  public skipTopic(
    userId: string | number | undefined,
    topicId: string,
    topicNodes: GrammarLessonNode[],
    isVip: boolean = false
  ): GrammarUserProgress {
    const progress = this.getProgress(userId, isVip);
    if (!progress.skippedTopics.includes(topicId)) {
      progress.skippedTopics.push(topicId);
    }
    topicNodes.forEach((node) => {
      progress.nodes[node.id] = {
        status: 'completed',
        stars: 3,
        scorePercent: 100,
        completedAt: new Date().toISOString(),
        attemptsCount: 1,
        wrongQuestionIds: [],
      };
    });
    this.saveProgress(progress);
    return progress;
  }

  public skipToNode(
    userId: string | number | undefined,
    targetNodeId: string,
    allNodesInOrder: GrammarLessonNode[],
    isVip: boolean = false
  ): GrammarUserProgress {
    const progress = this.getProgress(userId, isVip);
    const targetIdx = allNodesInOrder.findIndex((n) => n.id === targetNodeId);
    if (targetIdx !== -1) {
      for (let i = 0; i <= targetIdx; i++) {
        const n = allNodesInOrder[i];
        progress.nodes[n.id] = {
          status: 'completed',
          stars: 3,
          scorePercent: 100,
          completedAt: new Date().toISOString(),
          attemptsCount: 1,
          wrongQuestionIds: []
        };
      }
    }
    this.saveProgress(progress);
    return progress;
  }

  public skipAllGrammar(
    userId: string | number | undefined,
    allNodesInOrder: GrammarLessonNode[],
    isVip: boolean = false
  ): GrammarUserProgress {
    const progress = this.getProgress(userId, isVip);
    allNodesInOrder.forEach((n) => {
      progress.nodes[n.id] = {
        status: 'completed',
        stars: 3,
        scorePercent: 100,
        completedAt: new Date().toISOString(),
        attemptsCount: 1,
        wrongQuestionIds: []
      };
      if (!progress.skippedTopics.includes(n.topicId)) {
        progress.skippedTopics.push(n.topicId);
      }
    });
    this.saveProgress(progress);
    return progress;
  }

  public consumeHeart(userId: string | number | undefined, isVip: boolean = false): number {
    if (isVip) return 999;
    const progress = this.getProgress(userId, isVip);
    if (progress.hearts > 0) {
      progress.hearts -= 1;
      this.saveProgress(progress);
    }
    return progress.hearts;
  }

  public refillHearts(userId: string | number | undefined): number {
    const progress = this.getProgress(userId, false);
    progress.hearts = 5;
    this.saveProgress(progress);
    return 5;
  }
}

export const grammarProgressService = new GrammarProgressService();
