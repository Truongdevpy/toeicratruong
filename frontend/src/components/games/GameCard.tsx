import React from 'react';
import { GameDefinition } from './gameTypes';
import { Play, Trophy, Sparkles } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface GameCardProps {
  game: GameDefinition;
  highScore?: number;
  playCount?: number;
  onSelect: (game: GameDefinition) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, highScore = 0, playCount = 0, onSelect }) => {
  const { settings } = useSettings();
  const isDark = settings?.theme === 'dark';
  const Icon = game.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(game)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(game);
        }
      }}
      className={`group relative rounded-3xl p-6 transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden text-left border ${
        isDark
          ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:shadow-2xl hover:shadow-blue-500/10'
          : 'bg-white border-slate-200/90 shadow-sm hover:shadow-xl hover:shadow-slate-300/40 hover:border-blue-400'
      }`}
    >
      <div
        className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full pointer-events-none transition-all ${
          isDark
            ? 'bg-gradient-to-bl from-blue-500/10 to-transparent group-hover:from-blue-500/20'
            : 'bg-gradient-to-bl from-blue-50 to-transparent group-hover:from-blue-100/60'
        }`}
      />
      <div>
        <div className="flex items-center justify-between mb-4">
          <div
            className={`w-13 h-13 rounded-2xl flex items-center justify-center border shadow-md group-hover:scale-110 transition-transform duration-200 ${
              isDark ? 'border-white/10' : 'border-slate-100'
            }`}
            style={{ backgroundColor: `${game.color}20`, color: game.color }}
          >
            <Icon className="w-7 h-7" />
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              isDark
                ? game.tagColor
                : 'text-slate-700 bg-slate-50 border-slate-200'
            }`}
          >
            {game.categoryLabel}
          </span>
        </div>
        <h3
          className={`text-xl font-bold transition-colors ${
            isDark
              ? 'text-white group-hover:text-blue-400'
              : 'text-slate-900 group-hover:text-blue-600'
          }`}
        >
          {game.title}
        </h3>
        <p className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {game.subtitle}
        </p>
        <p
          className={`text-xs mt-2 line-clamp-2 leading-relaxed ${
            isDark ? 'text-slate-400/90' : 'text-slate-600'
          }`}
        >
          {game.description}
        </p>
      </div>

      <div
        className={`mt-6 pt-4 border-t flex items-center justify-between text-xs ${
          isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-3">
          {highScore > 0 ? (
            <span className="flex items-center gap-1 text-amber-500 font-semibold">
              <Trophy className="w-3.5 h-3.5" /> {highScore} đ
            </span>
          ) : (
            <span className={`flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <Sparkles className="w-3.5 h-3.5" /> Chưa chơi
            </span>
          )}
          {playCount > 0 && <span>• {playCount} lượt</span>}
        </div>
        <span
          className={`flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform ${
            isDark ? 'text-blue-400' : 'text-blue-600'
          }`}
        >
          Chơi ngay <Play className="w-3 h-3 fill-current" />
        </span>
      </div>
    </div>
  );
};
