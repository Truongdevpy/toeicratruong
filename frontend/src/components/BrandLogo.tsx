import React from 'react';

export interface BrandLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
  showText?: boolean;
  showSubtitle?: boolean;
  subtitle?: string;
  onClick?: () => void;
}

export const BrandLogoMark: React.FC<{ sizeClass?: string; className?: string }> = ({
  sizeClass = 'w-9 h-9',
  className = '',
}) => {
  return (
    <div
      className={`relative ${sizeClass} rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 ring-1 ring-white/20 select-none shrink-0 overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/25 pointer-events-none" />
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[82%] h-[82%] relative z-10 drop-shadow-sm"
        aria-hidden="true"
      >
        <path d="M18 7.5L32.5 14.5L18 21.5L3.5 14.5L18 7.5Z" fill="#FFFFFF" />
        <path d="M18 7.5L32.5 14.5L18 21.5V7.5Z" fill="#E2E8F0" fillOpacity="0.45" />
        <path
          d="M9 17.5V22C9 26 27 26 27 22V17.5"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 16V18C18 19.5 28.5 19 29.5 22.5V26"
          stroke="#FBBF24"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="29.5" cy="26" r="1.8" fill="#F59E0B" />
        <circle cx="29.5" cy="26" r="0.8" fill="#FEF3C7" />
        <path
          d="M28.5 4.5L29.3 7L31.8 7.8L29.3 8.6L28.5 11.1L27.7 8.6L25.2 7.8L27.7 7L28.5 4.5Z"
          fill="#FDE047"
        />
        <circle cx="28.5" cy="7.8" r="0.7" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'dark',
  showText = true,
  showSubtitle = false,
  subtitle = 'Luyện thi ETS & Gia sư AI',
  onClick,
}) => {
  const sizeMap = {
    xs: { box: 'w-7 h-7', text: 'text-sm', badge: 'text-[8px] px-1 py-0.2' },
    sm: { box: 'w-8 h-8', text: 'text-base', badge: 'text-[9px] px-1.5 py-0.5' },
    md: { box: 'w-9 h-9', text: 'text-base sm:text-lg', badge: 'text-[9px] px-1.5 py-0.5' },
    lg: { box: 'w-11 h-11', text: 'text-xl', badge: 'text-[10px] px-2 py-0.5' },
    xl: { box: 'w-14 h-14', text: 'text-2xl', badge: 'text-xs px-2.5 py-1' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      <BrandLogoMark sizeClass={currentSize.box} className="group-hover:scale-105 transition-transform duration-200" />

      {showText && (
        <div className="flex flex-col min-w-0 text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-black tracking-tight leading-none ${currentSize.text} ${
                variant === 'light' ? 'text-white' : 'text-slate-900'
              }`}
            >
              TOEIC{' '}
              <span className={variant === 'light' ? 'text-blue-400' : 'text-blue-600'}>
                Ra Trường
              </span>
            </span>
            <span
              className={`font-black uppercase tracking-wider rounded-md leading-none shadow-xs ${currentSize.badge} ${
                variant === 'light'
                  ? 'bg-blue-500/90 text-white border border-blue-400/40'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
              }`}
            >
              AI
            </span>
          </div>
          {showSubtitle && (
            <span
              className={`text-[10px] font-semibold tracking-wide mt-1 leading-none ${
                variant === 'light' ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
