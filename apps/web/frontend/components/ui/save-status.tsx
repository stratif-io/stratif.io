import { Loader2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type SaveStatusType = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  status: SaveStatusType
  onRetry?: () => void
  className?: string
}

export function SaveStatus({ status, onRetry, className }: Props) {
  if (status === 'idle') return null

  return (
    <span className={cn('flex items-center gap-1 text-xs', className)}>
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving…</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3 w-3 text-success" />
          <span className="text-success">Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <X className="h-3 w-3 text-destructive" />
          <span className="text-destructive">Failed</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-primary underline-offset-2 hover:underline ml-1"
            >
              retry
            </button>
          )}
        </>
      )}
    </span>
  )
}
