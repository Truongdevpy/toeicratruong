import React, { useState } from 'react';
import { X, Play, HelpCircle } from 'lucide-react';
import { GameDefinition, QuestionCountChoice, UserGamePreference } from './gameTypes';

interface GameSetupModalProps {
  game: GameDefinition;
  initialPreference: UserGamePreference;
  isOpen: boolean;
  onClose: () => void;
  onStart: (count: QuestionCountChoice, optionId: string, showHints: boolean) => void;
}

const COUNT_OPTIONS: { value: QuestionCountChoice; label: string; badge?: string }[] = [
  { value: 10, label: '10 câu', badge: 'Nhanh' },
  { value: 20, label: '20 câu', badge: 'Chuẩn' },
  { value: 50, label: '50 câu' },
  { value: 100, label: '100 câu' },
  { value: 'infinite', label: 'Vô hạn', badge: 'Không giới hạn' }
];

export const GameSetupModal: React.FC<GameSetupModalProps> = ({
  game,
  initialPreference,
  isOpen,
  onClose,
  onStart
}) => {
  const [selectedCount, setSelectedCount] = useState<QuestionCountChoice>(initialPreference.questionCount || 10);
  const [selectedOptionId, setSelectedOptionId] = useState<string>(
    initialPreference.selectedOptionId || (game.options[0]?.id ?? 'all')
  );
  const [showHints, setShowHints] = useState<boolean>(
    initialPreference.showHints !== undefined ? initialPreference.showHints : true
  );

  if (!isOpen) return null;

  const Icon = game.icon;

  const handleStart = () => {
    onStart(selectedCount, selectedOptionId, showHints);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-xl bg-slate-900 border border-slate-700/80 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100 animate-in slide-in-from-bottom-6 duration-200">
        
        {/* Header */}
        <div className="relative p-6 sm:p-7 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg border border-white/10"
              style={{ backgroundColor: `${game.color}20`, color: game.color }}
            >
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {game.categoryLabel}
                </span>
                <span className="text-xs text-slate-400 font-medium">⏱️ {game.estimatedMinutes}</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white mt-1">{game.title}</h2>
              <p className="text-xs sm:text-sm text-slate-400">{game.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng modal"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 sm:p-7 space-y-6 overflow-y-auto">
          
          {/* Section 1: Question Count */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>1. Số lượng thử thách</span>
              </label>
              <span className="text-xs text-slate-400">Chọn mục tiêu cho phiên luyện tập</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {COUNT_OPTIONS.map((opt) => {
                const isSelected = selectedCount === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setSelectedCount(opt.value)}
                    className={`relative p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[66px] ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-500'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-sm font-bold block">{opt.label}</span>
                    {opt.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium mt-1 ${
                        isSelected ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {opt.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Content Option */}
          {game.options && game.options.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {game.setupType === 'topic' && '2. Chọn chủ đề từ vựng'}
                  {game.setupType === 'level' && '2. Chọn cấp độ thử thách'}
                  {game.setupType === 'part' && '2. Chọn phân loại bài thi'}
                </label>
                <span className="text-xs text-slate-400">Tập trung theo nhu cầu</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {game.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500'
                          : 'bg-slate-800/50 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {opt.icon && <span className="text-lg flex-shrink-0">{opt.icon}</span>}
                        <span className="text-xs sm:text-sm font-medium truncate">{opt.label}</span>
                      </div>
                      {opt.badge && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 ml-2 font-medium flex-shrink-0">
                          {opt.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Hints Toggle Checkbox */}
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">Bật trợ giúp & gợi ý thông minh</div>
                <div className="text-xs text-slate-400">Hiện nghĩa, từ loại hoặc chữ cái đầu khi gặp câu khó</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showHints}
                onChange={(e) => setShowHints(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

        </div>

        {/* Footer CTA */}
        <div className="p-5 sm:p-6 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="px-7 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Bắt đầu chơi</span>
          </button>
        </div>

      </div>
    </div>
  );
};
