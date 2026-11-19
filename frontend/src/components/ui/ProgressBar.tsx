import React from 'react';

export interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
  showValueLabel?: boolean;
  color?: 'primary' | 'correct' | 'wrong' | 'warning';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  showValueLabel = false,
  color = 'primary',
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  const colorStyles = {
    primary: 'bg-primary',
    correct: 'bg-correct',
    wrong: 'bg-wrong',
    warning: 'bg-brand-orange',
  }[color];

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {(label || showValueLabel) && (
        <div className="flex items-center justify-between text-xs font-bold text-charcoal">
          {label && <span>{label}</span>}
          {showValueLabel && <span>{clamped}%</span>}
        </div>
      )}
      <div
        className="w-full bg-surface-soft h-2 rounded-full overflow-hidden border border-hairline"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${colorStyles}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
