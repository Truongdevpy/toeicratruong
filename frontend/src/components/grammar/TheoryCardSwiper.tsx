import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Play
} from 'lucide-react';
import { TheoryCard } from '../../types/grammarDuo';
import { useSettings } from '../../context/SettingsContext';
import { TRANSLATIONS } from '../../i18n/translations';

export interface TheoryCardSwiperProps {
  cards: TheoryCard[];
  initialCardIdx?: number;
  onCardChange?: (idx: number) => void;
  onFinish: () => void;
}

export const TheoryCardSwiper: React.FC<TheoryCardSwiperProps> = ({ cards, initialCardIdx = 0, onCardChange, onFinish }) => {
  const { settings } = useSettings();
  const lang = settings.language || (typeof window !== 'undefined' && localStorage.getItem('app_language') === 'en' ? 'en' : 'vi');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;
  const [currentCardIdx, setCurrentCardIdx] = useState(Math.min(initialCardIdx, Math.max(0, cards.length - 1)));
  const [miniAnswer, setMiniAnswer] = useState<string | null>(null);
  const [miniChecked, setMiniChecked] = useState(false);

  if (!cards || cards.length === 0) {
    return (
      <div className="text-center py-8">
        <button
          onClick={onFinish}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl cursor-pointer"
        >
          {lang === 'en' ? 'Start Practice' : 'Vào luyện tập'}
        </button>
      </div>
    );
  }

  const card = cards[currentCardIdx];
  const isLast = currentCardIdx === cards.length - 1;

  const handleNext = () => {
    if (isLast) {
      onFinish();
    } else {
      const nextIdx = currentCardIdx + 1;
      setCurrentCardIdx(nextIdx);
      if (onCardChange) onCardChange(nextIdx);
      setMiniAnswer(null);
      setMiniChecked(false);
    }
  };

  const handlePrev = () => {
    if (currentCardIdx > 0) {
      const prevIdx = currentCardIdx - 1;
      setCurrentCardIdx(prevIdx);
      if (onCardChange) onCardChange(prevIdx);
      setMiniAnswer(null);
      setMiniChecked(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in select-none">
      {/* Top Card Stepper / Indicator */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {cards.map((c, i) => (
            <div
              key={c.id || i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentCardIdx
                  ? 'w-7 bg-blue-600'
                  : i < currentCardIdx
                  ? 'w-3.5 bg-blue-300'
                  : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {lang === 'en' ? 'Card' : 'Thẻ'} {currentCardIdx + 1} / {cards.length}
        </span>
      </div>

      {/* Main Card Container */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-5 transition-all">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              card.badgeColor || 'bg-blue-100 text-blue-700'
            }`}
          >
            {card.badge}
          </span>
          <span className="text-xs text-slate-400 font-semibold">Micro-Learning tương tác</span>
        </div>

        <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
          {card.title}
        </h3>

        {/* 1. Example Card with syntax role highlights */}
        {card.highlightedSentence && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed flex flex-wrap gap-1">
              {card.highlightedSentence.segments.map((seg, sIdx) => {
                let colorClass = 'text-slate-800';
                let tag = '';
                if (seg.role === 'subject') {
                  colorClass = 'bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-lg';
                  tag = lang === 'en' ? 'Subject (S)' : 'Chủ ngữ (S)';
                } else if (seg.role === 'verb') {
                  colorClass = 'bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-lg';
                  tag = lang === 'en' ? 'Verb (V)' : 'Động từ (V)';
                } else if (seg.role === 'object') {
                  colorClass = 'bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-lg font-black';
                  tag = lang === 'en' ? 'Object (O - Noun)' : 'Tân ngữ (O - Danh từ)';
                } else if (seg.role === 'target') {
                  colorClass = 'bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-lg font-black underline';
                  tag = lang === 'en' ? 'Target Option' : 'Từ cần chọn';
                }

                return (
                  <span key={sIdx} className={`inline-block ${colorClass}`} title={tag}>
                    {seg.text}
                  </span>
                );
              })}
            </div>

            <p className="text-xs sm:text-sm text-slate-600 italic">
              👉 {card.highlightedSentence.vi}
            </p>
          </div>
        )}

        {/* 2. Rule List Card */}
        {card.ruleList && card.ruleList.length > 0 && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2.5">
            <div className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-emerald-600" />
              {lang === 'en' ? 'Core Rule Reminder:' : 'Ghi nhớ quy tắc cốt lõi:'}
            </div>
            <ul className="space-y-2">
              {card.ruleList.map((rule, idx) => (
                <li key={idx} className="text-xs sm:text-sm text-emerald-950 font-medium flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <span className="leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 3. Trap Comparison Card (Wrong vs Correct) */}
        {card.trapComparison && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5">
              <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-black uppercase text-rose-700 tracking-wider block">
                  {lang === 'en' ? 'Common Test Trap:' : 'Bẫy thí sinh hay mắc phải:'}
                </span>
                <span className="text-xs sm:text-sm font-bold text-rose-950 line-through">
                  {card.trapComparison.wrong}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-black uppercase text-emerald-700 tracking-wider block">
                  {lang === 'en' ? 'Standard ETS Usage:' : 'Cách dùng chuẩn đề ETS:'}
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-950">
                  {card.trapComparison.correct}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
              💡 {card.trapComparison.note}
            </p>
          </div>
        )}

        {/* 4. Mini Check Quiz Card */}
        {card.miniCheck && (
          <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-black text-purple-900">
              <Sparkles className="w-4 h-4 text-purple-600" />
              {lang === 'en' ? 'Quick 1-question check before drill:' : 'Thử sức nhanh 1 câu trước khi vào bài:'}
            </div>

            <p className="text-sm font-bold text-slate-900 leading-relaxed">
              {card.miniCheck.question}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {card.miniCheck.options.map((opt, oIdx) => {
                const letter = opt.trim().charAt(0).toUpperCase();
                const isSelected = miniAnswer === letter;
                let btnStyle = 'bg-white border-slate-200 hover:border-purple-300 text-slate-800';

                if (miniChecked) {
                  if (letter === card.miniCheck?.correct) {
                    btnStyle = 'bg-emerald-100 border-emerald-500 text-emerald-900 font-bold';
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-100 border-rose-500 text-rose-900 font-bold';
                  }
                } else if (isSelected) {
                  btnStyle = 'bg-purple-100 border-purple-600 text-purple-900 font-bold';
                }

                return (
                  <button
                    key={oIdx}
                    type="button"
                    disabled={miniChecked}
                    onClick={() => {
                      setMiniAnswer(letter);
                      setMiniChecked(true);
                    }}
                    className={`p-3 rounded-xl border-2 text-left text-xs transition-all cursor-pointer ${btnStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {miniChecked && (
              <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-purple-200 space-y-1">
                <span className="font-bold text-purple-800 block">
                  {miniAnswer === card.miniCheck.correct ? (lang === 'en' ? '🎉 Correct!' : '🎉 Rất chính xác!') : (lang === 'en' ? '💡 Explanation:' : '💡 Lời giải:')}
                </span>
                <p>{card.miniCheck.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          disabled={currentCardIdx === 0}
          onClick={handlePrev}
          className={`px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold flex items-center gap-1 transition-all ${
            currentCardIdx === 0
              ? 'opacity-40 cursor-not-allowed text-slate-400'
              : 'hover:bg-slate-50 text-slate-700 cursor-pointer'
          }`}
        >
          <ChevronLeft className="w-4 h-4" /> {lang === "en" ? "Back" : "Quay lại"}
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-blue-500/25 active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
        >
          {isLast ? (
            <>
              <Play className="w-4 h-4 fill-current" />
              {lang === 'en' ? 'Got it, start practice (+XP)' : 'Đã hiểu, vào luyện tập (+XP)'}
            </>
          ) : (
            <>
              {t.continueBtn} thẻ sau
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
