import { ColumnDef, Row, ColumnMeta } from '@tanstack/react-table'
import { cn } from '@/lib/utils'

export type DataTableColumnMeta = ColumnMeta<unknown, unknown> & {
  displayName?: string
  filterVariant?: 'text' | 'select' | 'date' | 'range'
  filterOptions?: { label: string; value: string }[]
}

export function getCommonPinningClasses<_TData>(isPinned: boolean | 'left' | 'right'): string {
  return cn(
    'bg-background',
    isPinned === 'left' && 'sticky left-0 z-20',
    isPinned === 'right' && 'sticky right-0 z-20'
  )
}

export function getCommonSortingClasses<_TData>(isSorted: false | 'asc' | 'desc'): string {
  return cn(isSorted && 'text-primary font-medium')
}

export function sortableHeader<_TData>(header: string, sortDirection?: 'asc' | 'desc'): string {
  if (!sortDirection) return header
  const arrow = sortDirection === 'asc' ? ' ↑' : ' ↓'
  return `${header}${arrow}`
}

export function createSelectColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: '__select__',
    header: ({ table: _table }) => '',
    cell: ({ row: _row }) => '',
    enableSorting: false,
    enableHiding: false,
    size: 40,
  }
}

export function createActionColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: '__actions__',
    header: () => '',
    cell: () => '',
    enableSorting: false,
    enableHiding: false,
    size: 50,
  }
}

export type { ColumnDef, Row }
