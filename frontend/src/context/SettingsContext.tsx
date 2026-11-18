import React, { createContext, useContext, useState, ReactNode } from 'react';
import { api } from '../services/api';

export interface AppSettings {
  language: 'vi' | 'en';
  songNgu: boolean;
  danChung: boolean;
  dienTu: boolean;
  latTu: boolean;
  autoAdvance: boolean;
  sfx: boolean;
  annotator: boolean;
  playbackSpeed: number;
  theme: 'light' | 'dark';
  visualEffects: 'full' | 'reduced' | 'off';
  timerMode: 'countdown' | 'countup';
  meoLamBai: boolean;
  tuVung: boolean;
  showFloatingAITutor: boolean;
  showFloatingChat: boolean;
  showExplanation: boolean;
  showTranslation: boolean;
  showProfileOnLeaderboard: boolean;
  skipIntro: boolean;
}

const SETTINGS_STORAGE_KEY = 'toeic_global_app_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  language: 'vi',
  songNgu: false,
  danChung: false,
  dienTu: false,
  latTu: false,
  autoAdvance: false,
  sfx: true,
  annotator: false,
  playbackSpeed: 1.0,
  theme: 'light',
  visualEffects: 'full',
  timerMode: 'countdown',
  meoLamBai: false,
  tuVung: false,
  showFloatingAITutor: true,
  showFloatingChat: true,
  showExplanation: true,
  showTranslation: true,
  showProfileOnLeaderboard: false,
  skipIntro: false,
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  toggleSongNgu: () => void;
  toggleDanChung: () => void;
  toggleDienTu: () => void;
  toggleLatTu: () => void;
  toggleAutoAdvance: () => void;
  toggleSfx: () => void;
  toggleAnnotator: () => void;
  toggleMeoLamBai: () => void;
  toggleTuVung: () => void;
  toggleFloatingAITutor: () => void;
  toggleFloatingChat: () => void;
  toggleShowExplanation: () => void;
  toggleShowTranslation: () => void;
  toggleShowProfileOnLeaderboard: () => void;
  toggleSkipIntro: () => void;
  setLanguage: (lang: 'vi' | 'en') => void;
  resetSettings: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setVisualEffects: (mode: 'full' | 'reduced' | 'off') => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const savedLang = localStorage.getItem('app_language') as ('vi' | 'en' | null);
      const savedSpeed = localStorage.getItem('toeic_playback_speed');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          playbackSpeed: savedSpeed ? Math.max(0.5, Math.min(2.0, parseFloat(savedSpeed))) : (typeof parsed.playbackSpeed === 'number' ? Math.max(0.5, Math.min(2.0, parsed.playbackSpeed)) : 1.0),
          language: savedLang === 'en' || parsed.language === 'en' ? 'en' : 'vi',
          meoLamBai: typeof parsed.meoLamBai === 'boolean' ? parsed.meoLamBai : false,
          tuVung: typeof parsed.tuVung === 'boolean' ? parsed.tuVung : false,
          songNgu: typeof parsed.songNgu === 'boolean' ? parsed.songNgu : false,
          danChung: typeof parsed.danChung === 'boolean' ? parsed.danChung : false,
          showFloatingAITutor: typeof parsed.showFloatingAITutor === 'boolean' ? parsed.showFloatingAITutor : true,
          showFloatingChat: typeof parsed.showFloatingChat === 'boolean' ? parsed.showFloatingChat : true,
          showExplanation: typeof parsed.showExplanation === 'boolean' ? parsed.showExplanation : true,
          showTranslation: typeof parsed.showTranslation === 'boolean' ? parsed.showTranslation : true,
          showProfileOnLeaderboard: typeof parsed.showProfileOnLeaderboard === 'boolean' ? parsed.showProfileOnLeaderboard : false,
          skipIntro: typeof parsed.skipIntro === 'boolean' ? parsed.skipIntro : false,
        };
      }
    } catch (err) {
      console.error('Failed to load settings from localStorage', err);
    }
    const savedLang = (typeof window !== 'undefined' ? localStorage.getItem('app_language') : null) as ('vi' | 'en' | null);
    return { ...DEFAULT_SETTINGS, language: savedLang === 'en' ? 'en' : 'vi' };
  });

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save settings to localStorage', err);
      }
      return updated;
    });
  };

  const toggleSongNgu = () => {
    setSettings((prev) => {
      const updated = { ...prev, songNgu: !prev.songNgu };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleDanChung = () => {
    setSettings((prev) => {
      const updated = { ...prev, danChung: !prev.danChung };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleDienTu = () => {
    setSettings((prev) => {
      const updated = { ...prev, dienTu: !prev.dienTu };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleLatTu = () => {
    setSettings((prev) => {
      const updated = { ...prev, latTu: !prev.latTu };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleAutoAdvance = () => {
    setSettings((prev) => {
      const updated = { ...prev, autoAdvance: !prev.autoAdvance };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleSfx = () => {
    setSettings((prev) => {
      const updated = { ...prev, sfx: !prev.sfx };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleAnnotator = () => {
    setSettings((prev) => {
      const updated = { ...prev, annotator: !prev.annotator };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleMeoLamBai = () => {
    setSettings((prev) => {
      const updated = { ...prev, meoLamBai: !prev.meoLamBai };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleTuVung = () => {
    setSettings((prev) => {
      const updated = { ...prev, tuVung: !prev.tuVung };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleFloatingAITutor = () => {
    setSettings((prev) => {
      const updated = { ...prev, showFloatingAITutor: !prev.showFloatingAITutor };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleFloatingChat = () => {
    setSettings((prev) => {
      const updated = { ...prev, showFloatingChat: !prev.showFloatingChat };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleSkipIntro = () => {
    setSettings((prev) => {
      const updated = { ...prev, skipIntro: !prev.skipIntro };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleShowProfileOnLeaderboard = () => {
    setSettings((prev) => {
      const updated = { ...prev, showProfileOnLeaderboard: !prev.showProfileOnLeaderboard };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      api.updateLeaderboardPrivacy(!updated.showProfileOnLeaderboard).catch(() => {});
      return updated;
    });
  };

  const setLanguage = (lang: 'vi' | 'en') => {
    setSettings((prev) => {
      const updated: AppSettings = { ...prev, language: lang };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
        localStorage.setItem('app_language', lang);
      } catch {}
      return updated;
    });
    try {
      localStorage.setItem('app_language', lang);
      window.dispatchEvent(new Event('app-settings-changed'));
      window.dispatchEvent(new CustomEvent('app-language-changed', { detail: lang }));
    } catch {}
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch {}
  };

  const setPlaybackSpeed = (speed: number) => {
    const validSpeed = Math.max(0.5, Math.min(2.0, Math.round(speed * 100) / 100));
    setSettings((prev) => {
      const updated = { ...prev, playbackSpeed: validSpeed };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
        localStorage.setItem('toeic_playback_speed', String(validSpeed));
      } catch {}
      return updated;
    });
    try {
      window.dispatchEvent(new CustomEvent('toeic-playback-speed-changed', { detail: validSpeed }));
    } catch {}
  };

  const toggleShowExplanation = () => {
    setSettings((prev) => {
      const updated = { ...prev, showExplanation: !prev.showExplanation };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const setVisualEffects = (mode: 'full' | 'reduced' | 'off') => {
    setSettings((prev) => {
      const updated = { ...prev, visualEffects: mode };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Sync motion mode and tab visibility to DOM
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const mode = settings.visualEffects || 'full';
    document.documentElement.setAttribute('data-motion', mode);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.documentElement.classList.add('is-tab-hidden');
      } else {
        document.documentElement.classList.remove('is-tab-hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [settings.visualEffects]);

  const toggleShowTranslation = () => {
    setSettings((prev) => {
      const updated = { ...prev, showTranslation: !prev.showTranslation };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        toggleSongNgu,
        toggleDanChung,
        toggleDienTu,
        toggleLatTu,
        toggleAutoAdvance,
        toggleSfx,
        toggleAnnotator,
        toggleMeoLamBai,
        toggleTuVung,
        toggleFloatingAITutor,
        toggleFloatingChat,
        toggleShowExplanation,
        toggleShowTranslation,
        toggleShowProfileOnLeaderboard,
        toggleSkipIntro,
        setLanguage,
        resetSettings,
        setPlaybackSpeed,
        setVisualEffects,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
};