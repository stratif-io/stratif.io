import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { PageTransition } from '@/components/layout/PageTransition'
import { MetricCard } from './components/MetricCard'
import { ActivityChart } from './components/ActivityChart'
import { TopEvents } from './components/TopEvents'
import { useMissionControl } from './hooks/useMissionControl'
import { QueryError } from '@/components/ui/query-error'
import { SPACING, TYPOGRAPHY } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Database } from 'lucide-react'
import { cn } from '@/lib/utils'

function DashboardFirstRun() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-start gap-8 px-1 py-8 max-w-lg">
      <div className="flex h-10 w-10 items-center justify-center border border-border">
        <Database className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <h2 className={TYPOGRAPHY.sectionTitleSm}>Connect your warehouse</h2>
        <p className={cn(TYPOGRAPHY.muted, 'leading-relaxed')}>
          stratif.io queries your database directly — no data pipelines, no per-event fees. Connect
          once and your events are available immediately.
        </p>
      </div>

      <ol className="space-y-4 text-sm">
        <li className="flex gap-3">
          <span className="shrink-0 font-mono text-xs text-muted-foreground w-5 pt-0.5">01</span>
          <div>
            <p className="font-medium">Add a connection</p>
            <p className="text-muted-foreground mt-0.5">
              Snowflake, Databricks, PostgreSQL, or DuckDB — provide credentials and stratif.io
              connects directly.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 font-mono text-xs text-muted-foreground w-5 pt-0.5">02</span>
          <div>
            <p className="font-medium">Point to your events table</p>
            <p className="text-muted-foreground mt-0.5">
              Tell stratif.io which table holds your events and which columns map to user, session,
              and timestamp.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 font-mono text-xs text-muted-foreground w-5 pt-0.5">03</span>
          <div>
            <p className="font-medium">Explore your data</p>
            <p className="text-muted-foreground mt-0.5">
              Mission Control metrics, activity charts, and top events — all queried live from your
              warehouse.
            </p>
          </div>
        </li>
      </ol>

      <Button onClick={() => navigate('/connections')}>Add your first connection</Button>
    </div>
  )
}

export function DashboardPage() {

  useEffect(() => {
    document.title = 'Mission Control — stratif.io'
  }, [])

  const { dateRange, activeConnectionId, setActiveConnectionId } = useAppStore()
  const { data, isLoading, isError, error, trendData, trendLoading, topEvents, eventsLoading } =
    useMissionControl({ dateRange, trendMetric: 'total_events' })

  const chartData = (trendData?.data ?? []).map((d) => ({
    day: d.date,
    events: d.value,
    users: 0,
  }))

  const isConnectionNotFound =
    isError && error instanceof Error && error.message.toLowerCase().includes('connection not found')

  useEffect(() => {
    if (isConnectionNotFound && activeConnectionId) {
      setActiveConnectionId(null)
    }
  }, [isConnectionNotFound, activeConnectionId, setActiveConnectionId])

  if (!activeConnectionId || isConnectionNotFound) {
    return (
      <PageTransition>
        <div className={SPACING.page}>
          <h1 className="sr-only">Mission Control</h1>
          <DashboardFirstRun />
        </div>
      </PageTransition>
    )
  }

  if (isError) return <QueryError error={error} />

  return (
    <PageTransition>
        <div className={SPACING.page}>
          <div className={SPACING.section}>
            <h1 className="sr-only">Mission Control</h1>
            <span className={TYPOGRAPHY.pageLabel}>Mission Control</span>

            {/* Metric Cards */}
            <div className={`grid grid-cols-2 lg:grid-cols-4 ${SPACING.gridGap}`}>
              <MetricCard
                title="Total Events"
                value={(data?.current.total_events ?? 0).toLocaleString()}
                numericValue={data?.current.total_events ?? 0}
                change={0}
                changeType="neutral"
                description="in selected period"
                subtitle={
                  (data?.current.unique_users ?? 0) > 0
                    ? `${((data?.current.total_events ?? 0) / (data?.current.unique_users ?? 1)).toFixed(1)} events / user`
                    : undefined
                }
                loading={isLoading}
                className="col-span-2 lg:col-span-2"
              />
              <MetricCard
                title="Unique Users"
                value={(data?.current.unique_users ?? 0).toLocaleString()}
                numericValue={data?.current.unique_users ?? 0}
                change={0}
                changeType="neutral"
                description="in selected period"
                loading={isLoading}
                className="col-span-1 motion-safe:[animation-delay:75ms]"
              />
              <MetricCard
                title="Total Sessions"
                value={(data?.current.total_sessions ?? 0).toLocaleString()}
                numericValue={data?.current.total_sessions ?? 0}
                change={0}
                changeType="neutral"
                description="in selected period"
                subtitle={
                  (data?.current.unique_users ?? 0) > 0
                    ? `${((data?.current.total_sessions ?? 0) / (data?.current.unique_users ?? 1)).toFixed(1)} sessions / user`
                    : undefined
                }
                loading={isLoading}
                className="col-span-1 motion-safe:[animation-delay:150ms]"
              />
            </div>

            {/* Charts Grid */}
            <div className={`grid ${SPACING.gridGap} lg:grid-cols-3`}>
              <ActivityChart data={chartData} loading={trendLoading} />
              <TopEvents events={topEvents} loading={eventsLoading} />
            </div>
          </div>
        </div>
    </PageTransition>
  )
}
