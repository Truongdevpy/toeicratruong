// -*- coding: utf-8 -*-
import { GameId, UserGamePreference, UserGameStat, QuestionCountChoice } from './gameTypes';

const PREFS_KEY = 'toeic_game_user_preferences_v1';
const STATS_KEY = 'toeic_game_user_stats_v1';
const LAST_PLAYED_KEY = 'toeic_last_played_game_id';

const DEFAULT_PREF: UserGamePreference = {
  questionCount: 10,
  selectedOptionId: 'all',
  showHints: true
};

export const gameStorageService = {
  getPreferences(gameId: GameId, defaultOptionId = 'all'): UserGamePreference {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed[gameId]) {
          return {
            questionCount: parsed[gameId].questionCount || 10,
            selectedOptionId: parsed[gameId].selectedOptionId || defaultOptionId,
            showHints: parsed[gameId].showHints !== undefined ? parsed[gameId].showHints : true,
            lastPlayedAt: parsed[gameId].lastPlayedAt
          };
        }
      }
    } catch {}
    return { ...DEFAULT_PREF, selectedOptionId: defaultOptionId };
  },

  savePreferences(gameId: GameId, pref: Partial<UserGamePreference>) {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[gameId] = {
        ...(parsed[gameId] || DEFAULT_PREF),
        ...pref,
        lastPlayedAt: new Date().toISOString()
      };
      localStorage.setItem(PREFS_KEY, JSON.stringify(parsed));
      localStorage.setItem(LAST_PLAYED_KEY, gameId);
    } catch {}
  },

  getStats(gameId: GameId): UserGameStat {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed[gameId]) {
          return parsed[gameId];
        }
      }
    } catch {}
    return {
      highScore: 0,
      playCount: 0
    };
  },

  recordGameResult(gameId: GameId, score: number) {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const current = parsed[gameId] || { highScore: 0, playCount: 0 };
      const nextStat: UserGameStat = {
        highScore: Math.max(current.highScore, score),
        playCount: current.playCount + 1,
        lastScore: score,
        lastPlayedAt: new Date().toISOString()
      };
      parsed[gameId] = nextStat;
      localStorage.setItem(STATS_KEY, JSON.stringify(parsed));
      localStorage.setItem(LAST_PLAYED_KEY, gameId);
    } catch {}
  },

  getLastPlayedGameId(): GameId | null {
    try {
      const id = localStorage.getItem(LAST_PLAYED_KEY);
      if (id) return id as GameId;
    } catch {}
    return null;
  }
};
