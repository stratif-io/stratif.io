import { useMemo, useCallback } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  VisibilityState,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
  PaginationState,
  Row,
} from '@tanstack/react-table'
import { Download } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTablePagination } from './DataTablePagination'
import { DataTableToolbar } from './DataTableToolbar'
import { DataTableRowActions, RowAction } from './DataTableRowActions'
import { TableSkeleton } from './TableSkeleton'
import { EmptyState } from './EmptyState'
import { cn } from '@/lib/utils'

function MobileTableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 mb-3">
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </>
  )
}

function MobileEmptyState({ message = 'No data' }: { message?: string }) {
  return <div className="text-center py-10 text-muted-foreground">{message}</div>
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  searchPlaceholder?: string
  showSearch?: boolean
  showColumnVisibility?: boolean
  showPagination?: boolean
  showRowSelection?: boolean
  showRowActions?: boolean
  rowActions?: RowAction<TData>[]
  onRowClick?: (row: Row<TData>) => void
  onRowView?: (row: Row<TData>) => void
  onRowEdit?: (row: Row<TData>) => void
  onRowDelete?: (row: Row<TData>) => void
  onRowCopy?: (row: Row<TData>) => void
  toolbarActions?: React.ReactNode
  getRowId?: (row: TData) => string
  enableMultiRowSelection?: boolean
  enableMultiSort?: boolean
  initialState?: {
    sorting?: SortingState
    columnVisibility?: VisibilityState
    columnFilters?: ColumnFiltersState
    rowSelection?: RowSelectionState
    pagination?: PaginationState
  }
  state?: {
    sorting?: SortingState
    columnVisibility?: VisibilityState
    columnFilters?: ColumnFiltersState
    rowSelection?: RowSelectionState
    pagination?: PaginationState
    globalFilter?: string
  }
  onSortingChange?: (value: SortingState) => void
  onColumnVisibilityChange?: (value: VisibilityState) => void
  onColumnFiltersChange?: (value: ColumnFiltersState) => void
  onRowSelectionChange?: (value: RowSelectionState) => void
  onPaginationChange?: (value: PaginationState) => void
  onGlobalFilterChange?: (value: string) => void
  emptyMessage?: string
  className?: string
  pageSizeOptions?: number[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Search...',
  showSearch = true,
  showColumnVisibility = true,
  showPagination = true,
  showRowSelection = true,
  showRowActions = true,
  rowActions,
  onRowClick,
  onRowView,
  onRowEdit,
  onRowDelete,
  onRowCopy,
  toolbarActions,
  getRowId,
  enableMultiRowSelection = true,
  enableMultiSort = false,
  initialState,
  state,
  onSortingChange,
  onColumnVisibilityChange,
  onColumnFiltersChange,
  onRowSelectionChange,
  onPaginationChange,
  onGlobalFilterChange,
  emptyMessage = 'No results found.',
  className,
  pageSizeOptions = [10, 20, 30, 50, 100],
}: DataTableProps<TData, TValue>) {
  const internalSorting = useMemo<SortingState>(
    () => state?.sorting ?? initialState?.sorting ?? [],
    [state?.sorting, initialState?.sorting]
  )
  const internalColumnVisibility = useMemo<VisibilityState>(
    () => state?.columnVisibility ?? initialState?.columnVisibility ?? {},
    [state?.columnVisibility, initialState?.columnVisibility]
  )
  const internalColumnFilters = useMemo<ColumnFiltersState>(
    () => state?.columnFilters ?? initialState?.columnFilters ?? [],
    [state?.columnFilters, initialState?.columnFilters]
  )
  const internalRowSelection = useMemo<RowSelectionState>(
    () => state?.rowSelection ?? initialState?.rowSelection ?? {},
    [state?.rowSelection, initialState?.rowSelection]
  )
  const internalPagination = useMemo<PaginationState>(
    () => state?.pagination ?? initialState?.pagination ?? { pageIndex: 0, pageSize: 10 },
    [state?.pagination, initialState?.pagination]
  )
  const internalGlobalFilter = state?.globalFilter ?? ''

  const handleSortingChange = useCallback(
    (updater: unknown) => {
      if (onSortingChange) {
        const newSorting = typeof updater === 'function' ? updater(internalSorting) : updater
        onSortingChange(newSorting as SortingState)
      }
    },
    [onSortingChange, internalSorting]
  )

  const handleColumnVisibilityChange = useCallback(
    (updater: unknown) => {
      if (onColumnVisibilityChange) {
        const newVisibility =
          typeof updater === 'function' ? updater(internalColumnVisibility) : updater
        onColumnVisibilityChange(newVisibility as VisibilityState)
      }
    },
    [onColumnVisibilityChange, internalColumnVisibility]
  )

  const handleColumnFiltersChange = useCallback(
    (updater: unknown) => {
      if (onColumnFiltersChange) {
        const newFilters = typeof updater === 'function' ? updater(internalColumnFilters) : updater
        onColumnFiltersChange(newFilters as ColumnFiltersState)
      }
    },
    [onColumnFiltersChange, internalColumnFilters]
  )

  const handleRowSelectionChange = useCallback(
    (updater: unknown) => {
      if (onRowSelectionChange) {
        const newSelection = typeof updater === 'function' ? updater(internalRowSelection) : updater
        onRowSelectionChange(newSelection as RowSelectionState)
      }
    },
    [onRowSelectionChange, internalRowSelection]
  )

  const handlePaginationChange = useCallback(
    (updater: unknown) => {
      if (onPaginationChange) {
        const newPagination = typeof updater === 'function' ? updater(internalPagination) : updater
        onPaginationChange(newPagination as PaginationState)
      }
    },
    [onPaginationChange, internalPagination]
  )

  const tableColumns = useMemo(() => {
    const cols: ColumnDef<TData, TValue>[] = []

    if (showRowSelection) {
      cols.unshift({
        id: '__select__',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      })
    }

    cols.push(...columns)

    if (showRowActions) {
      cols.push({
        id: '__actions__',
        cell: ({ row }) => (
          <DataTableRowActions
            row={row}
            actions={rowActions}
            onView={onRowView}
            onEdit={onRowEdit}
            onDelete={onRowDelete}
            onCopy={onRowCopy}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 50,
      })
    }

    return cols
  }, [
    columns,
    showRowSelection,
    showRowActions,
    rowActions,
    onRowView,
    onRowEdit,
    onRowDelete,
    onRowCopy,
  ])

  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableMultiRowSelection,
    enableMultiSort,
    state: {
      sorting: internalSorting,
      columnVisibility: internalColumnVisibility,
      columnFilters: internalColumnFilters,
      rowSelection: internalRowSelection,
      pagination: internalPagination,
      globalFilter: internalGlobalFilter,
    },
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onRowSelectionChange: handleRowSelectionChange,
    onPaginationChange: handlePaginationChange,
    onGlobalFilterChange: onGlobalFilterChange,
  })

  const exportToCSV = useCallback(() => {
    const headers = columns
      .filter((col) => col.id && col.id !== '__select__' && col.id !== '__actions__')
      .map((col) => col.id as string)

    const rows = table.getFilteredRowModel().rows.map((row) =>
      headers.map((header) => {
        const value = row.getValue(header)
        return typeof value === 'string' ? value : JSON.stringify(value ?? '')
      })
    )

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'export.csv')
    link.click()
    URL.revokeObjectURL(url)
  }, [columns, table])

  const renderMobileCard = (row: Row<TData>) => {
    const cells = row
      .getAllCells()
      .filter((cell) => cell.column.id !== '__select__' && cell.column.id !== '__actions__')

    return (
      <div
        key={row.id}
        className={cn('rounded-lg border bg-card p-4 mb-3', row.getIsSelected() && 'bg-muted/50')}
      >
        <div className="flex items-start justify-between mb-3">
          {showRowSelection && (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          )}
          {showRowActions && (
            <DataTableRowActions
              row={row}
              actions={rowActions}
              onView={onRowView}
              onEdit={onRowEdit}
              onDelete={onRowDelete}
              onCopy={onRowCopy}
            />
          )}
        </div>
        <div className="space-y-2">
          {cells.map((cell) => {
            const header = cell.column.columnDef.meta as { displayName?: string } | undefined
            return (
              <div key={cell.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {header?.displayName ?? cell.column.id}
                </span>
                <span className="font-medium">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const rows = table.getRowModel().rows
  const isEmpty = !isLoading && rows.length === 0

  return (
    <div className={cn('space-y-4', className)}>
      <DataTableToolbar
        table={table}
        searchPlaceholder={searchPlaceholder}
        showSearch={showSearch}
        showColumnVisibility={showColumnVisibility}
        searchValue={internalGlobalFilter}
        onSearchChange={onGlobalFilterChange}
        actions={
          <>
            {toolbarActions}
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </>
        }
      />
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          {isLoading ? (
            <TableSkeleton columns={table.getAllColumns().length} />
          ) : isEmpty ? (
            <EmptyState colSpan={table.getAllColumns().length} message={emptyMessage} />
          ) : (
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </div>
      <div className="md:hidden">
        {isLoading ? (
          <MobileTableSkeleton />
        ) : isEmpty ? (
          <MobileEmptyState message={emptyMessage} />
        ) : (
          rows.map(renderMobileCard)
        )}
      </div>
      {showPagination && !isEmpty && (
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
      )}
    </div>
  )
}
