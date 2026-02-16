import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LucideIcon } from 'lucide-react'

export interface MetricCardProps {
  title: string
  value: string
  change: number
  changeType: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
  description: string
  loading?: boolean
}

export function MetricCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  description,
  loading,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  changeType === 'positive'
                    ? 'default'
                    : changeType === 'negative'
                      ? 'destructive'
                      : 'secondary'
                }
                className="text-xs"
              >
                {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '−'}{' '}
                {Math.abs(change)}%
              </Badge>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
