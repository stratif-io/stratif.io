import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  RowSelectionState,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
  PaginationState,
  Updater,
} from '@tanstack/react-table'

export interface UseDataTableProps {
  initialPageSize?: number
  initialSorting?: SortingState
  multiSort?: boolean
}

export interface UseDataTableReturn {
  sorting: SortingState
  setSorting: (value: Updater<SortingState>) => void
  columnFilters: ColumnFiltersState
  setColumnFilters: (value: Updater<ColumnFiltersState>) => void
  columnVisibility: VisibilityState
  setColumnVisibility: (value: Updater<VisibilityState>) => void
  rowSelection: RowSelectionState
  setRowSelection: (value: Updater<RowSelectionState>) => void
  pagination: PaginationState
  setPagination: (value: Updater<PaginationState>) => void
  globalFilter: string
  setGlobalFilter: (value: string) => void
  resetAll: () => void
}

export function useDataTable({
  initialPageSize = 10,
  initialSorting = [],
  multiSort = false,
}: UseDataTableProps = {}): UseDataTableReturn {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const resetAll = useCallback(() => {
    setSorting(initialSorting)
    setColumnFilters([])
    setColumnVisibility({})
    setRowSelection({})
    setGlobalFilter('')
    setPagination({
      pageIndex: 0,
      pageSize: initialPageSize,
    })
  }, [initialSorting, initialPageSize])

  return {
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    columnVisibility,
    setColumnVisibility,
    rowSelection,
    setRowSelection,
    pagination,
    setPagination,
    globalFilter,
    setGlobalFilter,
    resetAll,
  }
}
