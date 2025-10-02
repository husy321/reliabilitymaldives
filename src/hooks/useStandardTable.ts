"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from "@tanstack/react-table";

export interface StandardTableConfig<T> {
  data: T[];
  columns: ColumnDef<T>[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchTerm?: string;
  loading?: boolean;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  onPageChange?: (page: number) => void;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onSearch?: (term: string) => void;
}

export interface StandardTableReturn<T> {
  table: ReturnType<typeof useReactTable<T>>;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    startIndex: number;
    endIndex: number;
  };
  sorting: SortingState;
  searchState: {
    localSearchTerm: string;
    setLocalSearchTerm: (term: string) => void;
  };
  loading: boolean;
}

export function useStandardTable<T>({
  data,
  columns,
  totalCount = 0,
  page = 1,
  pageSize = 20,
  sortBy = '',
  sortOrder = 'asc',
  searchTerm = '',
  loading = false,
  manualPagination = true,
  manualSorting = true,
  manualFiltering = true,
  onPageChange,
  onSort,
  onSearch,
}: StandardTableConfig<T>): StandardTableReturn<T> {

  const [sorting, setSorting] = useState<SortingState>(
    sortBy ? [{ id: sortBy, desc: sortOrder === 'desc' }] : []
  );

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      onSearch?.(term);
    }, 500),
    [onSearch]
  );

  // Update search when local term changes
  useMemo(() => {
    debouncedSearch(localSearchTerm);
  }, [localSearchTerm, debouncedSearch]);

  // Custom sorting handler
  const handleSortingChange = useCallback((updaterOrValue: any) => {
    setSorting(updaterOrValue);

    if (onSort && typeof updaterOrValue === 'function') {
      const newSorting = updaterOrValue(sorting);
      if (newSorting.length > 0) {
        const { id, desc } = newSorting[0];
        onSort(id, desc ? 'desc' : 'asc');
      }
    }
  }, [sorting, onSort]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      pagination: { pageIndex: page - 1, pageSize },
    },
    manualPagination,
    manualSorting,
    manualFiltering,
    pageCount: manualPagination ? Math.ceil(totalCount / pageSize) : undefined,
  });

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  return {
    table,
    pagination: {
      page,
      pageSize,
      totalPages,
      totalCount,
      startIndex,
      endIndex,
    },
    sorting,
    searchState: {
      localSearchTerm,
      setLocalSearchTerm,
    },
    loading,
  };
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}

// Standard table utilities for creating sortable headers
export interface SortableHeaderConfig {
  title: string;
  icon?: React.ReactNode;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  sortField?: string;
}

// Standard pagination component props
export interface StandardPaginationProps {
  pagination: StandardTableReturn<any>['pagination'];
  onPageChange: (page: number) => void;
  loading?: boolean;
  showPageSizeSelector?: boolean;
  onPageSizeChange?: (size: number) => void;
}