import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all cursor-pointer select-none rounded-md btn-tactile focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-primary text-on-primary hover:bg-primary-pressed shadow-xs hover:shadow-md border border-transparent',
    secondary: 'bg-surface hover:bg-surface-soft text-charcoal border border-hairline shadow-2xs',
    outline: 'bg-white hover:bg-surface-soft text-charcoal border border-hairline hover:border-hairline-strong shadow-2xs',
    ghost: 'bg-transparent hover:bg-surface text-charcoal border border-transparent',
    danger: 'bg-wrong text-white hover:opacity-90 shadow-xs border border-transparent focus:ring-wrong',
    success: 'bg-correct text-white hover:opacity-90 shadow-xs border border-transparent focus:ring-correct',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2 min-h-[44px] gap-2',
    lg: 'text-base px-5 py-2.5 min-h-[48px] gap-2.5',
  }[size];

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
