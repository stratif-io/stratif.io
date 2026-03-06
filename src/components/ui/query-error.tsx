import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QueryErrorProps {
  error: Error | null | unknown
  className?: string
}

export function QueryError({ error, className }: QueryErrorProps) {
  if (!error) return null
  const message =
    error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center gap-3',
        className,
      )}
    >
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-destructive font-medium">{message}</p>
    </div>
  )
}
