import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChartComponent } from '@/components/charts'

export interface ActivityChartProps {
  data: Array<{ day: string; events: number; users: number }>
  loading?: boolean
}

export function ActivityChart({ data, loading }: ActivityChartProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Activity Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px]" />
        ) : (
          <LineChartComponent
            data={data}
            lines={[
              { dataKey: 'events', name: 'Events', color: 'hsl(var(--primary))' },
              { dataKey: 'users', name: 'Users', color: 'hsl(var(--chart-2))' },
            ]}
            xAxisKey="day"
            height={300}
          />
        )}
      </CardContent>
    </Card>
  )
}
