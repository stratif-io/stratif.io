import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: LucideIcon
  iconElement?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link'
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  iconElement,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label={title || 'Empty state'}
      className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}
    >
      {/* Icon */}
      <div className="mb-4 border border-border p-3 inline-flex">
        {iconElement ||
          (Icon && <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />)}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      {/* Description */}
      {description && <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>}

      {/* Action Button */}
      {action && (
        <Button onClick={action.onClick} variant={action.variant ?? 'outline'}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
