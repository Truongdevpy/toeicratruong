import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'neutral' | 'streak';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-correct/10 text-correct border-correct/20',
    danger: 'bg-wrong/10 text-wrong border-wrong/20',
    warning: 'bg-card-tint-peach text-weak-point border-amber-300',
    neutral: 'bg-surface text-charcoal border-hairline',
    streak: 'bg-card-tint-yellow text-streak border-amber-300',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border leading-tight ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
