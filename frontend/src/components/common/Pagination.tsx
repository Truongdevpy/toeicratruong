import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number | 'all';
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number | 'all') => void;
  pageSizeOptions?: Array<number | 'all'>;
  itemLabel?: string;
  showPageSizeSelector?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [6, 9, 12, 18, 30, 'all'],
  itemLabel = 'mục',
  showPageSizeSelector = true,
}) => {
  if (totalPages <= 1 && (!totalItems || totalItems === 0)) return null;

  const pages: (number | 'ellipsis')[] = [];
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const leftBound = Math.max(2, currentPage - 1);
    const rightBound = Math.min(totalPages - 1, currentPage + 1);

    if (leftBound > 2) pages.push('ellipsis');
    for (let i = leftBound; i <= rightBound; i++) pages.push(i);
    if (rightBound < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }

  const startItem = typeof pageSize === 'number' ? (currentPage - 1) * pageSize + 1 : 1;
  const endItem =
    typeof pageSize === 'number' && totalItems
      ? Math.min(currentPage * pageSize, totalItems)
      : totalItems || 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200 text-xs text-slate-700 font-medium select-none">
      <div className="flex items-center gap-3">
        {totalItems !== undefined && totalItems > 0 && (
          <span>
            Hiển thị <strong className="text-slate-950 font-black">{startItem}-{endItem}</strong> trong tổng số{' '}
            <strong className="text-slate-950 font-black">{totalItems}</strong> {itemLabel}
          </span>
        )}
        {showPageSizeSelector && onPageSizeChange && pageSize !== undefined && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-300">
            <span>Hiển thị:</span>
            <select
              value={String(pageSize)}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                onPageSizeChange(val);
              }}
              className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={String(opt)} value={String(opt)}>
                  {opt === 'all' ? 'Tất cả' : opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1">
          {pages.map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`ell-${idx}`} className="px-2 text-slate-500 font-bold">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`min-w-8 h-8 px-2 text-xs font-bold rounded-lg transition-colors ${
                  currentPage === p
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
          title="Trang tiếp theo"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};