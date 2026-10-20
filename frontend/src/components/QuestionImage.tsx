import React, { useState } from 'react';
import { Image as ImageIcon, ImageOff, ZoomIn, X, RefreshCw, Loader2 } from 'lucide-react';

export interface QuestionImageProps {
  src?: string | null;
  alt?: string;
  part?: number;
  questionNumber?: number;
  className?: string;
  imageClassName?: string;
  maxHeight?: string;
  allowZoom?: boolean;
}

export const QuestionImage: React.FC<QuestionImageProps> = ({
  src,
  alt,
  part,
  questionNumber,
  className = '',
  imageClassName = '',
  maxHeight,
  allowZoom = true,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // Normalize image URL
  const resolvedSrc = React.useMemo(() => {
    if (!src) return '';
    const clean = src.trim().split('\\').join('/');
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    if (clean.startsWith('/')) {
      return clean;
    }
    return `/${clean}`;
  }, [src]);

  // Determine appropriate max height based on part if not explicitly passed
  const resolvedMaxHeight = React.useMemo(() => {
    if (maxHeight) return maxHeight;
    // Parts 3, 4, 7 typically contain schedules, tables, graphics, maps, receipts
    if (part === 3 || part === 4 || part === 7) {
      return 'max-h-[580px] sm:max-h-[640px]';
    }
    // Part 1 photos
    return 'max-h-[440px]';
  }, [maxHeight, part]);

  // Strip restrictive max-h / object classes from container className if passed accidentally
  const containerClass = React.useMemo(() => {
    return className
      .replace(/\bmax-h-\S+/g, '')
      .replace(/\bobject-\S+/g, '')
      .trim();
  }, [className]);

  // Handle retry loading
  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setRetryKey((prev) => prev + 1);
  };

  // If no source is provided
  if (!resolvedSrc) {
    if (part === 1 || part === 3 || part === 4 || part === 7) {
      return (
        <div className={`my-3 p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5 ${containerClass}`}>
          <ImageIcon className="w-6 h-6 text-slate-400" />
          <p className="text-xs font-semibold text-slate-600">
            Hình ảnh câu hỏi {questionNumber ? `câu ${questionNumber}` : ''} (Part {part})
          </p>
          <span className="text-[11px] text-slate-400">Ảnh đang được cập nhật trên hệ thống</span>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <div className={`relative my-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2 flex flex-col items-center justify-center group ${containerClass}`}>
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2 z-10 animate-pulse">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-[11px] font-medium text-slate-500">Đang tải hình ảnh...</span>
          </div>
        )}

        {/* Error Fallback */}
        {hasError ? (
          <div className="w-full py-8 px-4 flex flex-col items-center justify-center text-center space-y-2 bg-slate-50 rounded-xl">
            <ImageOff className="w-8 h-8 text-slate-400" />
            <p className="text-xs font-semibold text-slate-700">
              Không thể tải hình ảnh {questionNumber ? `câu ${questionNumber}` : ''}
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Vui lòng kiểm tra lại kết nối mạng hoặc nhấn nút bên dưới để thử lại.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Thử tải lại
            </button>
          </div>
        ) : (
          /* Actual Image */
          <div className="relative max-w-full w-full flex items-center justify-center">
            <img
              key={retryKey}
              src={resolvedSrc}
              alt={alt || `Hình ảnh minh họa TOEIC ${questionNumber ? `câu ${questionNumber}` : ''}`}
              loading="lazy"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              className={`w-auto max-w-full h-auto ${resolvedMaxHeight} object-contain rounded-xl shadow-2xs transition-opacity duration-200 ${
                isLoading ? 'opacity-0' : 'opacity-100'
              } ${imageClassName}`}
            />

            {/* Zoom Action Button */}
            {!isLoading && allowZoom && (
              <button
                type="button"
                onClick={() => setIsZoomed(true)}
                className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-sm border border-slate-200/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                title="Phóng to xem chi tiết"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal for Zooming In */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 px-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">
                {alt || `Hình ảnh chi tiết ${questionNumber ? `câu ${questionNumber}` : ''}`}
              </span>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[82vh] flex items-center justify-center">
              <img
                src={resolvedSrc}
                alt={alt || 'Phóng to ảnh'}
                className="max-w-full max-h-[78vh] w-auto h-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
