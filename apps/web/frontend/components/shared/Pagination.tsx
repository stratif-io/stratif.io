import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  from: number
  to: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, from, to, total, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
      <span className="text-xs text-muted-foreground">
        {total === 0
          ? 'No events'
          : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} events`}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="First page"
          aria-disabled={page === 1}
        >
          <ChevronsLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          aria-disabled={page === 1}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <span
          className="text-xs px-2.5 py-1 rounded border border-border/50 bg-muted/30 tabular-nums min-w-[60px] text-center"
          aria-current="page"
        >
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          aria-disabled={page >= totalPages}
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          aria-label="Last page"
          aria-disabled={page >= totalPages}
        >
          <ChevronsRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
