import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface' | 'peach' | 'rose' | 'mint' | 'lavender' | 'sky' | 'yellow' | 'cream';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hoverable = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border-hairline text-charcoal shadow-xs',
    surface: 'bg-surface border-hairline text-charcoal',
    peach: 'bg-card-tint-peach border-amber-200/60 text-charcoal',
    rose: 'bg-card-tint-rose border-rose-200/60 text-charcoal',
    mint: 'bg-card-tint-mint border-emerald-200/60 text-charcoal',
    lavender: 'bg-card-tint-lavender border-purple-200/60 text-charcoal',
    sky: 'bg-card-tint-sky border-blue-200/60 text-charcoal',
    yellow: 'bg-card-tint-yellow border-amber-200/60 text-charcoal',
    cream: 'bg-card-tint-cream border-stone-200/60 text-charcoal',
  }[variant];

  const hoverStyles = hoverable ? 'interactive-card cursor-pointer' : '';

  return (
    <div
      className={`rounded-lg border p-4 sm:p-5 transition-all ${variantStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
