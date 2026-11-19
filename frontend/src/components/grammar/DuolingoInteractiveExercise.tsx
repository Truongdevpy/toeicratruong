import React from 'react';
import { InteractiveDuoQuestion } from '../../types/grammarDuo';

export interface DuolingoInteractiveExerciseProps {
  question: InteractiveDuoQuestion;
  selectedAnswer: string | null;
  onSelectAnswer: (ans: string) => void;
  status: 'idle' | 'correct' | 'wrong';
  onUseHint?: () => void;
}

export const DuolingoInteractiveExercise: React.FC<DuolingoInteractiveExerciseProps> = ({
  question,
  selectedAnswer,
  onSelectAnswer,
  status,
}) => {
  return (
    <div className="space-y-6 select-none animate-in fade-in">
      {/* Question Card */}
      <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-3">
        <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 inline-block">
          {question.type || 'Câu hỏi trọng tâm'}
        </span>
        <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
          {question.question}
        </h3>
        {question.translation && (
          <p className="text-xs text-slate-500 italic">
            Dịch nghĩa: {question.translation}
          </p>
        )}
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((opt, idx) => {
          const letter = opt.trim().charAt(0).toUpperCase();
          const isSelected = selectedAnswer === letter;
          let btnStyle = 'bg-white border-slate-200 hover:border-blue-400 text-slate-800';

          if (isSelected) {
            if (status === 'correct') {
              btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300 font-bold';
            } else if (status === 'wrong') {
              btnStyle = 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-300 font-bold';
            } else {
              btnStyle = 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-300 font-bold';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={status !== 'idle'}
              onClick={() => onSelectAnswer(letter)}
              className={`p-4 rounded-2xl border-2 text-left text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99] flex items-center justify-between ${btnStyle}`}
            >
              <span>{opt}</span>
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center shrink-0">
                {letter}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
