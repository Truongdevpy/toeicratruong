// -*- coding: utf-8 -*-
import React from 'react';

export type GameId =
  | 'grammar'
  | 'dictation'
  | 'word_blast'
  | 'quiz'
  | 'word_rain'
  | 'match_words'
  | 'collocation'
  | 'photo_match'
  | 'sentence_build';

export type QuestionCountChoice = 10 | 20 | 50 | 100 | 'infinite';

export interface GameConfigOption {
  id: string;
  label: string;
  icon?: string;
  badge?: string;
}

export interface GameDefinition {
  id: GameId;
  title: string;
  subtitle: string;
  description: string;
  category: 'vocab' | 'grammar' | 'listening';
  categoryLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  accentClass: string;
  tagColor: string;
  setupType: 'topic' | 'part' | 'level';
  options: GameConfigOption[];
  estimatedMinutes: string;
  previewType: GameId;
}

export interface UserGamePreference {
  questionCount: QuestionCountChoice;
  selectedOptionId: string;
  showHints?: boolean;
  lastPlayedAt?: string;
}

export interface UserGameStat {
  highScore: number;
  playCount: number;
  lastScore?: number;
  lastPlayedAt?: string;
}
