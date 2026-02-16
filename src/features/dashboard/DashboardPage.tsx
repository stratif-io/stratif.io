import { useAppStore } from '@/stores'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MetricCard } from './components/MetricCard'
import { ActivityChart } from './components/ActivityChart'
import { TopEvents } from './components/TopEvents'
import { useDashboardMetrics } from './hooks/useDashboardMetrics'
import { MousePointerClick, Users, Clock, Target } from 'lucide-react'

export function DashboardPage() {
  const { dateRange } = useAppStore()
  const { metrics, isLoading, eventsLoading } = useDashboardMetrics({ dateRange })

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's what's happening with your product.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Events"
            value={metrics.totalEvents.toLocaleString()}
            change={5.2}
            changeType="positive"
            icon={MousePointerClick}
            description="vs previous period"
            loading={isLoading}
          />
          <MetricCard
            title="Unique Users"
            value={metrics.uniqueUsers.toLocaleString()}
            change={-2.1}
            changeType="negative"
            icon={Users}
            description="vs previous period"
            loading={isLoading}
          />
          <MetricCard
            title="Avg Session"
            value={`${Math.floor(metrics.avgDuration / 60)}m ${Math.round(metrics.avgDuration % 60)}s`}
            change={8.5}
            changeType="positive"
            icon={Clock}
            description="vs previous period"
            loading={isLoading}
          />
          <MetricCard
            title="Conversion Rate"
            value={`${metrics.conversionRate.toFixed(1)}%`}
            change={12.3}
            changeType="positive"
            icon={Target}
            description="Users who purchased after viewing home"
            tooltip="Calculated as: users who completed a Purchase event after their first Home event, divided by total users who viewed Home."
            loading={isLoading}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <ActivityChart data={metrics.chartData} loading={isLoading} />
          <TopEvents events={metrics.topEvents} loading={eventsLoading} />
        </div>
      </div>
    </TooltipProvider>
  )
}
