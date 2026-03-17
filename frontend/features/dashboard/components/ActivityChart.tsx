import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChartComponent } from '@/components/charts'
import { useReducedMotion } from '@/hooks'

export interface ActivityChartProps {
  data: Array<{ day: string; events: number; users: number }>
  loading?: boolean
}

export function ActivityChart({ data, loading }: ActivityChartProps) {
  const prefersReducedMotion = useReducedMotion()
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Activity Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] rounded-md bg-muted opacity-30" />
        ) : (
          <motion.div
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
          >
            <LineChartComponent
              data={data}
              lines={[
                { dataKey: 'events', name: 'Events', color: 'hsl(var(--primary))' },
                { dataKey: 'users', name: 'Users', color: 'hsl(var(--chart-2))' },
              ]}
              xAxisKey="day"
              height={300}
            />
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
