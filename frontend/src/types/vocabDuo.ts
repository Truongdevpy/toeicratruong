// -*- coding: utf-8 -*-
import { VocabWord } from './index';

export type VocabNodeType = 'theory' | 'practice_basic' | 'collocations' | 'checkpoint';

export interface VocabLessonNode {
  id: string;
  topicId: string;
  unitIndex: number;
  nodeIndex: number;
  type: VocabNodeType;
  title: string;
  subtitle: string;
  wordCount: number;
  xpReward: number;
}

export interface VocabNodeProgress {
  status: 'locked' | 'unlocked' | 'completed';
  stars: number;
  scorePercent: number;
  completedAt?: string;
  attemptsCount: number;
}

export interface VocabUserProgress {
  userId: string | number;
  hearts: number;
  lastHeartRegen?: string;
  nodes: Record<string, VocabNodeProgress>;
  skippedTopics: string[];
  totalXp: number;
  lastActiveNodeId?: string;
}

export interface VocabDuoQuestion {
  id: string;
  word: string;
  ipa?: string;
  part_of_speech?: string;
  meaning: string;
  example?: string;
  example_vi?: string;
  audio_url?: string;
  type: 'meaning_select' | 'reverse_select' | 'fill_in' | 'collocation_match';
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}
