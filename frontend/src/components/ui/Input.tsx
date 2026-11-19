import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="space-y-1 w-full text-left">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-charcoal">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-steel pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-white border border-hairline rounded-md px-3.5 py-2 text-sm text-charcoal placeholder:text-stone-custom transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary min-h-[44px] ${
            leftIcon ? 'pl-9' : ''
          } ${rightIcon ? 'pr-9' : ''} ${error ? 'border-wrong focus:ring-wrong' : ''} ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-steel">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-wrong font-medium mt-1">{error}</p>
      )}
    </div>
  );
});
Input.displayName = 'Input';
