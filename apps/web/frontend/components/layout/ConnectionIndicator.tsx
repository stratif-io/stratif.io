import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConnectionIndicatorProps {
  connectionName: string | null
  onClick: () => void
  className?: string
}

export function ConnectionIndicator({
  connectionName,
  onClick,
  className,
}: ConnectionIndicatorProps) {
  const isConnected = connectionName !== null

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors',
        isConnected
          ? 'bg-[hsl(var(--color-primary-light,174_82%_95%))] border border-[hsl(174,60%,85%)] hover:bg-[hsl(174,60%,92%)]'
          : 'bg-muted/50 border border-border hover:bg-muted',
        className
      )}
    >
      <span
        data-testid="connection-dot"
        className={cn(
          'shrink-0 w-1.5 h-1.5 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-muted-foreground/40'
        )}
      />
      <span
        className={cn(
          'flex-1 text-[11px] font-semibold truncate',
          isConnected ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--primary))]'
        )}
      >
        {isConnected ? connectionName : 'Connect database'}
      </span>
      <ChevronDownIcon className="shrink-0 w-3 h-3 text-muted-foreground/60" />
    </button>
  )
}
