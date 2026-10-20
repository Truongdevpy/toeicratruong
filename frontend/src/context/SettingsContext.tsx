import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface AppSettings {
  songNgu: boolean;
  danChung: boolean;
  dienTu: boolean;
  latTu: boolean;
  autoAdvance: boolean;
  sfx: boolean;
  annotator: boolean;
  playbackSpeed: number;
  theme: 'light' | 'dark';
  timerMode: 'countdown' | 'countup';
  meoLamBai: boolean;
  tuVung: boolean;
  showFloatingAITutor: boolean;
  showFloatingChat: boolean;
}

const SETTINGS_STORAGE_KEY = 'toeic_global_app_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  songNgu: false,
  danChung: false,
  dienTu: false,
  latTu: false,
  autoAdvance: false,
  sfx: true,
  annotator: false,
  playbackSpeed: 1.0,
  theme: 'light',
  timerMode: 'countdown',
  meoLamBai: false,
  tuVung: false,
  showFloatingAITutor: true,
  showFloatingChat: true,
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
  resetSettings: () => void;
  setPlaybackSpeed: (speed: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          meoLamBai: typeof parsed.meoLamBai === 'boolean' ? parsed.meoLamBai : false,
          tuVung: typeof parsed.tuVung === 'boolean' ? parsed.tuVung : false,
          songNgu: typeof parsed.songNgu === 'boolean' ? parsed.songNgu : false,
          danChung: typeof parsed.danChung === 'boolean' ? parsed.danChung : false,
          showFloatingAITutor: typeof parsed.showFloatingAITutor === 'boolean' ? parsed.showFloatingAITutor : true,
          showFloatingChat: typeof parsed.showFloatingChat === 'boolean' ? parsed.showFloatingChat : true,
        };
      }
    } catch (err) {
      console.error('Failed to load settings from localStorage', err);
    }
    return DEFAULT_SETTINGS;
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

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch {}
  };

  const setPlaybackSpeed = (speed: number) => {
    setSettings((prev) => {
      const updated = { ...prev, playbackSpeed: speed };
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
        resetSettings,
        setPlaybackSpeed,
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