import { MoreHorizontal, Copy, Pencil, Trash2, Eye } from 'lucide-react'
import { Row } from '@tanstack/react-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export interface RowAction<TData> {
  label: string
  icon?: React.ReactNode
  onClick: (row: Row<TData>) => void
  variant?: 'default' | 'destructive'
  show?: (row: Row<TData>) => boolean
}

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  actions?: RowAction<TData>[]
  onCopy?: (row: Row<TData>) => void
  onEdit?: (row: Row<TData>) => void
  onDelete?: (row: Row<TData>) => void
  onView?: (row: Row<TData>) => void
}

export function DataTableRowActions<TData>({
  row,
  actions,
  onCopy,
  onEdit,
  onDelete,
  onView,
}: DataTableRowActionsProps<TData>) {
  const defaultActions: RowAction<TData>[] = [
    ...(onView
      ? [
          {
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            onClick: onView,
          },
        ]
      : []),
    ...(onCopy
      ? [
          {
            label: 'Copy',
            icon: <Copy className="h-4 w-4" />,
            onClick: onCopy,
          },
        ]
      : []),
    ...(onEdit
      ? [
          {
            label: 'Edit',
            icon: <Pencil className="h-4 w-4" />,
            onClick: onEdit,
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: onDelete,
            variant: 'destructive' as const,
          },
        ]
      : []),
  ]

  const allActions = actions ?? defaultActions

  if (allActions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allActions
          .filter((action) => !action.show || action.show(row))
          .map((action, index) => (
            <DropdownMenuItem
              key={`${action.label}-${index}`}
              onClick={() => action.onClick(row)}
              className={
                action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''
              }
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
