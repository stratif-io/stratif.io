import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChartComponent } from '@/components/charts'
import { TrendingUp } from 'lucide-react'

export interface ActivityChartProps {
  data: Array<{ day: string; events: number; users: number }>
  loading?: boolean
}

export function ActivityChart({ data, loading }: ActivityChartProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Activity Overview</CardTitle>
        </div>
        <CardDescription>Events and estimated users over time</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px]" />
        ) : (
          <LineChartComponent
            data={data}
            lines={[
              { dataKey: 'events', name: 'Events', color: 'hsl(var(--primary))' },
              { dataKey: 'users', name: 'Users', color: '#22c55e' },
            ]}
            xAxisKey="day"
            height={300}
          />
        )}
      </CardContent>
    </Card>
  )
}
