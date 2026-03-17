import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardLoadingBar } from '@/components/ui/card-loading-bar'
import { Badge } from '@/components/ui/badge'
import { MetricCardSkeleton } from '@/components/ui/loading-state'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import { TYPOGRAPHY } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface MetricCardProps {
  title: string
  value: string
  numericValue?: number
  change: number
  changeType: 'positive' | 'negative' | 'neutral'
  description: string
  subtitle?: string // derived ratio shown below the metric
  loading?: boolean
  tooltip?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  numericValue,
  change,
  changeType,
  description,
  subtitle,
  loading,
  tooltip,
  className,
}: MetricCardProps) {
  const animatedValue = useCountUp(numericValue ?? 0, {
    duration: 1000,
    decimals: 0,
  })

  const displayValue = numericValue !== undefined ? animatedValue.toLocaleString() : value

  return (
    <Card hover="lift" className={cn('relative overflow-hidden motion-safe:animate-in motion-safe:fade-in-50 motion-safe:duration-300', className)}>
      <CardLoadingBar loading={loading} />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <MetricCardSkeleton />
        ) : (
          <div className="space-y-1">
            <div className={TYPOGRAPHY.metricLg}>{displayValue}</div>
            <div className="flex items-center gap-2">
              {(changeType !== 'neutral' || change !== 0) && (
                <Badge
                  variant={
                    changeType === 'positive'
                      ? 'default'
                      : changeType === 'negative'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className="text-xs font-semibold"
                >
                  <span aria-hidden="true">
                    {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '−'}
                  </span>
                  <span className="sr-only">
                    {changeType === 'positive'
                      ? 'increased by'
                      : changeType === 'negative'
                        ? 'decreased by'
                        : 'no change'}
                  </span>{' '}
                  {Math.abs(change)}%
                </Badge>
              )}
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground/70 tabular-nums">{subtitle}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
