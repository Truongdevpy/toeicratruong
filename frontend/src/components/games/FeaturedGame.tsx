import React from 'react';
import { GameDefinition } from './gameTypes';
import { Play, Sparkles, Trophy, ArrowRight } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface FeaturedGameProps {
  game: GameDefinition;
  highScore?: number;
  playCount?: number;
  onPlay: (game: GameDefinition) => void;
}

export const FeaturedGame: React.FC<FeaturedGameProps> = ({ game, highScore = 0, playCount = 0, onPlay }) => {
  const { settings } = useSettings();
  const isDark = settings?.theme === 'dark';
  const Icon = game.icon;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 transition-all border ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-indigo-500/30 shadow-2xl shadow-indigo-500/10'
          : 'bg-gradient-to-r from-blue-50 via-indigo-50/60 to-white border-blue-200/80 shadow-lg shadow-indigo-100/50'
      }`}
    >
      <div
        className={`absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
          isDark ? 'bg-indigo-500/10' : 'bg-blue-300/20'
        }`}
      />
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-5">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center border shadow-xl flex-shrink-0 ${
              isDark ? 'border-white/10 shadow-indigo-500/20' : 'border-indigo-100 shadow-indigo-200/40 bg-white'
            }`}
            style={{ backgroundColor: isDark ? `${game.color}25` : undefined, color: game.color }}
          >
            <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  isDark
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}
              >
                <Sparkles className="w-3 h-3" /> Gợi ý hôm nay
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  isDark ? game.tagColor : 'text-slate-700 bg-white/80 border-slate-200'
                }`}
              >
                {game.categoryLabel}
              </span>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>⏱️ {game.estimatedMinutes}</span>
            </div>
            <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {game.title}
            </h2>
            <p className={`text-xs sm:text-sm mt-1 max-w-xl leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {game.description}
            </p>
            {playCount > 0 && (
              <div className={`mt-2 flex items-center gap-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="flex items-center gap-1 text-amber-500 font-semibold">
                  <Trophy className="w-3.5 h-3.5" /> Kỷ lục: {highScore} đ
                </span>
                <span>• Đã chơi {playCount} lần</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onPlay(game)}
          className="w-full md:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.03] active:scale-[0.98] cursor-pointer flex-shrink-0"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Chơi ngay</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
