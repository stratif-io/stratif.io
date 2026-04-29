import { TableBody, TableCell, TableRow } from '@/components/ui/table'

interface EmptyStateProps {
  message?: string
  colSpan: number
}

export function EmptyState({ message = 'No data', colSpan }: EmptyStateProps) {
  return (
    <TableBody>
      <TableRow>
        <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
          {message}
        </TableCell>
      </TableRow>
    </TableBody>
  )
}
