import { MorphPlayPause, MorphVolume } from './MorphIcon';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  AlertCircle,
  RefreshCw,
  FastForward,
  Rewind,
  Keyboard,
  Loader2
} from 'lucide-react';

export interface AudioPlayerProps {
  src: string;
  title?: string;
  autoPlay?: boolean;
  compact?: boolean;
  enableKeyboardShortcuts?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  title,
  autoPlay = false,
  compact = false,
  enableKeyboardShortcuts = true,
  onEnded,
  onTimeUpdate,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('toeic_audio_volume');
    return saved !== null ? parseFloat(saved) : 1.0;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);

  // Normalize media URL
  const resolvedSrc = React.useMemo(() => {
    if (!src) return '';
    const clean = src.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    if (clean.startsWith('/')) {
      return clean;
    }
    return `/${clean}`;
  }, [src]);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Handle audio source changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setCurrentTime(0);
    setIsPlaying(false);

    audio.load();

    if (autoPlay) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            // Autoplay policy prevented playback, normal browser behavior
            if (err.name !== 'NotAllowedError') {
              setHasError(true);
              setErrorMessage('Không thể tự động phát âm thanh.');
            }
            setIsPlaying(false);
          });
      }
    }
  }, [resolvedSrc, autoPlay]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (onTimeUpdate) {
        onTimeUpdate(audio.currentTime, audio.duration || 0);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setHasError(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setHasError(true);
      setErrorMessage('Không thể phát file âm thanh này.');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [onEnded, onTimeUpdate]);

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (hasError) {
      setHasError(false);
      setIsLoading(true);
      audio.load();
      audio.play().then(() => setIsPlaying(true)).catch(() => setHasError(true));
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      setIsLoading(true);
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err) => {
          setIsLoading(false);
          if (err.name !== 'AbortError') {
            setHasError(true);
            setErrorMessage('Lỗi phát âm thanh. Nhấn để thử lại.');
          }
        });
    }
  }, [hasError, isPlaying]);

  // Replay from beginning
  const replay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  // Seek relative
  const seekRelative = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
    audio.currentTime = target;
    setCurrentTime(target);
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard against typing in form fields or chat/search inputs
      const active = document.activeElement;
      if (active) {
        const tag = active.tagName.toLowerCase();
        const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
        const isContentEditable = active.getAttribute('contenteditable') === 'true';
        const isRoleInput = active.getAttribute('role') === 'textbox' || active.getAttribute('role') === 'searchbox';
        const isChat = active.classList.contains('chat-input') || Boolean(active.closest('.chat-container'));
        if (isInput || isContentEditable || isRoleInput || isChat) {
          return;
        }
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        replay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, togglePlay, replay, seekRelative]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    localStorage.setItem('toeic_audio_volume', String(val));
    if (val === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '0:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!resolvedSrc) {
    return null;
  }

  // Compact Variant (e.g. for question rows or table views)
  if (compact) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 shadow-2xs ${className}`}
      >
        <audio ref={audioRef} src={resolvedSrc} preload="metadata" />

        <button
          type="button"
          onClick={togglePlay}
          className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          title={isPlaying ? 'Tạm dừng (Space)' : 'Phát audio (Space)'}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <MorphPlayPause isPlaying={isPlaying} size={14} className="fill-current" />
          )}
        </button>

        <button
          type="button"
          onClick={() => seekRelative(-5)}
          className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
          title="Lùi 5s (←)"
        >
          <Rewind className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 flex items-center gap-2 min-w-[120px]">
          <span className="text-[10px] font-mono text-slate-600 min-w-[32px] text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="text-[10px] font-mono text-slate-400 min-w-[32px]">
            {formatTime(duration)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => seekRelative(5)}
          className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
          title="Tiến 5s (→)"
        >
          <FastForward className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={replay}
          className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
          title="Phát lại từ đầu (R)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={toggleMute}
          className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
          title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
        >
          <MorphVolume isMuted={isMuted} size={14} className={isMuted ? "text-rose-500" : ""} />
        </button>

        {hasError && (
          <button
            type="button"
            onClick={togglePlay}
            className="p-1 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer shrink-0"
            title="Lỗi phát audio. Nhấn để thử lại"
          >
            <AlertCircle className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 shrink-0">
          {[0.75, 1.0, 1.25].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => handleSpeedChange(rate)}
              className={`px-1 py-0.5 rounded text-[10px] font-bold ${
                playbackRate === rate ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Full Standard Variant
  return (
    <div
      ref={containerRef}
      className={`bg-white border border-slate-200/90 rounded-2xl p-4 my-3 shadow-xs space-y-3 transition-all ${className}`}
    >
      <audio ref={audioRef} src={resolvedSrc} preload="metadata" />

      {/* Header Info Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-blue-600'}`} />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {title || 'Audio bài nghe'}
          </span>
          {isLoading && (
            <span className="text-[11px] text-blue-600 flex items-center gap-1 font-medium">
              <Loader2 className="w-3 h-3 animate-spin" /> Đang tải...
            </span>
          )}
        </div>

        {/* Keyboard Hints Toggle Button */}
        <button
          type="button"
          onClick={() => setShowKeyboardHints(!showKeyboardHints)}
          className={`hidden md:flex text-[11px] items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
            showKeyboardHints ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
          title="Xem phím tắt điều khiển"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>Phím tắt</span>
        </button>
      </div>

      {/* Keyboard Shortcuts Hint Bar */}
      {showKeyboardHints && (
        <div className="hidden md:flex bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px] text-slate-600 flex-wrap items-center gap-x-4 gap-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">
              Space
            </kbd>
            <span>Phát / Tạm dừng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">
              R
            </kbd>
            <span>Phát lại</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">
              ←
            </kbd>
            <span>Lùi 5s</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">
              →
            </kbd>
            <span>Tiến 5s</span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {hasError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage || 'Không thể phát âm thanh.'}</span>
          </div>
          <button
            type="button"
            onClick={togglePlay}
            className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 font-semibold rounded-lg border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Thử lại
          </button>
        </div>
      )}

      {/* Main Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Play/Pause & Replay Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center transition-all shadow-sm cursor-pointer"
            title={isPlaying ? 'Tạm dừng (Space)' : 'Phát audio (Space)'}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <MorphPlayPause isPlaying={isPlaying} size={20} className="fill-current" />
            )}
          </button>

          <button
            type="button"
            onClick={() => seekRelative(-5)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Tua lùi 5 giây (←)"
          >
            <Rewind className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => seekRelative(5)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Tua tiến 5 giây (→)"
          >
            <FastForward className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={replay}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Phát lại từ đầu (R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar & Timestamps */}
        <div className="flex-1 w-full flex items-center gap-2.5">
          <span className="text-xs font-mono font-medium text-slate-600 min-w-[36px] text-right">
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <span className="text-xs font-mono font-medium text-slate-400 min-w-[36px]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Speed Selector & Volume Controls */}
        <div className="flex items-center justify-between sm:justify-start gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          {/* Speed Presets */}
          <div className="flex items-center gap-1">
            {[0.75, 1.0, 1.25].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleSpeedChange(rate)}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Volume Control */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
            >
              <MorphVolume isMuted={isMuted || volume === 0} size={16} className={isMuted || volume === 0 ? "text-rose-500" : ""} />
            </button>

            {/* Volume Popout Slider */}
            {showVolumeSlider && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center z-50 animate-in fade-in duration-100">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
