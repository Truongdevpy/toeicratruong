import { useState, useMemo } from 'react';

export interface UsePaginationOptions<T> {
  data: T[];
  initialPage?: number;
  initialPageSize?: number | 'all';
  pageSize?: number | 'all';
  syncUrl?: boolean;
}

export interface UsePaginationResult<T> {
  currentPage: number;
  pageSize: number | 'all';
  totalPages: number;
  totalItems: number;
  paginatedData: T[];
  startIndex: number;
  endIndex: number;
  setCurrentPage: (page: number) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number | 'all') => void;
  resetPage: () => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
}

export function usePagination<T>({
  data,
  initialPage = 1,
  initialPageSize = 9,
  pageSize: optionPageSize,
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSizeState] = useState<number | 'all'>(optionPageSize ?? initialPageSize);

  const totalItems = data.length;

  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [totalItems, pageSize]);

  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = typeof pageSize === 'number' ? (validCurrentPage - 1) * pageSize : 0;
  const endIndex = typeof pageSize === 'number' ? Math.min(startIndex + pageSize, totalItems) : totalItems;

  const paginatedData = useMemo(() => {
    if (pageSize === 'all') return data;
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex, pageSize]);

  const setPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  const setPageSize = (size: number | 'all') => {
    setPageSizeState(size);
    setCurrentPage(1);
  };

  const resetPage = () => {
    setCurrentPage(1);
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  return {
    currentPage: validCurrentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData,
    startIndex,
    endIndex,
    setCurrentPage,
    setPage,
    setPageSize,
    resetPage,
    goToNextPage,
    goToPrevPage,
  };
}