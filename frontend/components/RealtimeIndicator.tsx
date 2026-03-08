import { cn } from '@/lib/utils'
import type { ConnectionStatus } from '@/lib/websocket/types'

interface RealtimeIndicatorProps {
  status: ConnectionStatus
  className?: string
  showLabel?: boolean
}

const statusConfig: Record<ConnectionStatus, { color: string; label: string; pulse: boolean }> = {
  connected: { color: 'bg-green-500', label: 'Live', pulse: true },
  connecting: { color: 'bg-yellow-500', label: 'Connecting...', pulse: true },
  disconnected: { color: 'bg-gray-400', label: 'Offline', pulse: false },
  error: { color: 'bg-red-500', label: 'Error', pulse: false },
}

export function RealtimeIndicator({ status, className, showLabel = true }: RealtimeIndicatorProps) {
  const config = statusConfig[status]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75',
              config.color,
              status === 'connected' && 'animate-ping'
            )}
          />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', config.color)} />
      </span>
      {showLabel && <span className="text-xs text-muted-foreground">{config.label}</span>}
    </div>
  )
}
