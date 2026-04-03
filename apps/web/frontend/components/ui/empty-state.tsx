import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

type EmptyStateVariant = 'no-data' | 'configure' | 'no-connection'

interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'ghost'
}

interface EmptyStateProps {
  variant?: EmptyStateVariant
  icon?: LucideIcon
  iconElement?: ReactNode
  title: string
  description?: string
  actions?: EmptyStateAction[]
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link'
  }
  className?: string
}

export function EmptyState({
  variant = 'no-data',
  icon: Icon,
  iconElement,
  title,
  description,
  actions,
  action,
  className,
}: EmptyStateProps) {
  const isTealIcon = variant === 'configure' || variant === 'no-connection'

  return (
    <div
      role="region"
      aria-label={title || 'Empty state'}
      className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}
    >
      {/* Icon */}
      <div
        data-testid="empty-icon-wrapper"
        className={cn(
          'w-10 h-10 rounded-[10px] flex items-center justify-center mb-3 inline-flex',
          isTealIcon ? 'bg-[hsl(var(--primary)/0.1)]' : 'bg-muted'
        )}
        aria-hidden="true"
      >
        {iconElement ||
          (Icon && (
            <Icon
              className={cn(
                'w-5 h-5',
                isTealIcon ? 'text-[hsl(var(--primary))]' : 'text-muted-foreground/50'
              )}
            />
          ))}
      </div>

      {/* Title */}
      <p className="text-[12px] font-semibold text-foreground mb-1">{title}</p>

      {/* Description */}
      {description && (
        <p className="text-[10px] text-muted-foreground leading-relaxed max-w-xs mb-4">
          {description}
        </p>
      )}

      {/* Action Buttons (new API) */}
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2">
          {actions.map((actionItem) => (
            <Button
              key={actionItem.label}
              size="sm"
              variant={actionItem.variant === 'ghost' ? 'outline' : 'default'}
              onClick={actionItem.onClick}
              className="h-7 px-3 text-[10px] font-semibold"
            >
              {actionItem.label}
            </Button>
          ))}
        </div>
      )}

      {/* Legacy Action Button (backward compat) */}
      {!actions && action && (
        <Button onClick={action.onClick} variant={action.variant ?? 'outline'}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
