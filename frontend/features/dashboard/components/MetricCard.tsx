import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MetricCardSkeleton } from '@/components/ui/loading-state'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle, LucideIcon } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import { ICON_SIZES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface MetricCardProps {
  title: string
  value: string
  numericValue?: number // Optional numeric value for animation
  change: number
  changeType: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
  description: string
  loading?: boolean
  tooltip?: string
}

export function MetricCard({
  title,
  value,
  numericValue,
  change,
  changeType,
  icon: Icon,
  description,
  loading,
  tooltip,
}: MetricCardProps) {
  // Animate numeric values if provided
  const animatedValue = useCountUp(numericValue ?? 0, {
    duration: 1000,
    decimals: 0,
  })

  const displayValue = numericValue !== undefined ? animatedValue.toLocaleString() : value

  return (
    <Card hover="lift" className="animate-in fade-in-50 duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
          <Icon className={cn(ICON_SIZES.md, 'text-primary')} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <MetricCardSkeleton />
        ) : (
          <>
            <div className="text-3xl font-bold tracking-tight">{displayValue}</div>
            <div className="flex items-center gap-2 mt-2">
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
                {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '−'}{' '}
                {Math.abs(change)}%
              </Badge>
              <p className="text-xs text-muted-foreground">{description}</p>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
