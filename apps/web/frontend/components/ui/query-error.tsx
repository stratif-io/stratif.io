import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QueryErrorProps {
  error: Error | null | unknown
  className?: string
  onRetry?: () => void
}

export function QueryError({ error, className, onRetry }: QueryErrorProps) {
  if (!error) return null
  const message = error instanceof Error ? error.message : 'Failed to load data. Please try again.'
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center gap-3',
        className
      )}
    >
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-destructive font-medium">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  )
}
