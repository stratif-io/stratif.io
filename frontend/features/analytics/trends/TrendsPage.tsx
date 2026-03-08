import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageTransition } from '@/components/layout/PageTransition'
import { LoadingState, ChartSkeleton } from '@/components/ui/loading-state'
import { QueryError } from '@/components/ui/query-error'
import { EmptyState } from '@/components/ui/empty-state'
import { TrendingUp, BarChart3, LineChart as LineChartIcon } from 'lucide-react'
import { useAppStore } from '@/stores'
import { useTrendData } from './hooks/useTrendData'
import { TrendChart } from './components/TrendChart'
import { SPACING, TYPOGRAPHY, ICON_SIZES } from '@/lib/constants'

export function TrendsPage() {
  const { dateRange } = useAppStore()
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [granularity, setGranularity] = useState<'day' | 'week'>('day')
  const [chartType, setChartType] = useState<'area' | 'line'>('area')

  const { trendData, events, isLoading, isError, error, totalEvents, averageValue, maxValue } = useTrendData({
    dateRange,
    selectedEvent,
    granularity,
  })

  if (isError) return <QueryError error={error} />

  return (
    <PageTransition>
      <div className={SPACING.page}>
        <div className={SPACING.section}>
          <span className={TYPOGRAPHY.pageLabel}>Trend Analysis</span>

          <div className={`grid gap-4 md:grid-cols-3`}>
            <Card hover="lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={TYPOGRAPHY.label}>Total Events</CardTitle>
                <TrendingUp className={`${ICON_SIZES.sm} text-muted-foreground`} />
              </CardHeader>
              <CardContent>
                <div className={TYPOGRAPHY.metric}>{totalEvents.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card hover="lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={TYPOGRAPHY.label}>Daily Average</CardTitle>
                <BarChart3 className={`${ICON_SIZES.sm} text-muted-foreground`} />
              </CardHeader>
              <CardContent>
                <div className={TYPOGRAPHY.metric}>{averageValue.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card hover="lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={TYPOGRAPHY.label}>Peak Day</CardTitle>
                <LineChartIcon className={`${ICON_SIZES.sm} text-muted-foreground`} />
              </CardHeader>
              <CardContent>
                <div className={TYPOGRAPHY.metric}>{maxValue.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-end">
                <div className="flex gap-2">
                  <div className="flex items-center border rounded-md p-1">
                    <Button
                      variant={chartType === 'area' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setChartType('area')}
                      className="h-7"
                    >
                      Area
                    </Button>
                    <Button
                      variant={chartType === 'line' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setChartType('line')}
                      className="h-7"
                    >
                      Line
                    </Button>
                  </div>
                  <Select
                    value={selectedEvent || 'all'}
                    onValueChange={(val) => setSelectedEvent(val === 'all' ? '' : val)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Events" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event} value={event}>
                          {event}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={granularity}
                    onValueChange={(val) => setGranularity(val as 'day' | 'week')}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Daily</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton height="h-[450px]" />
              ) : trendData.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No trend data available"
                  description="Try adjusting your date range or filters to see trend data."
                  className="h-[450px]"
                />
              ) : (
                <div className="h-[450px]">
                  <TrendChart
                    data={trendData}
                    chartType={chartType}
                    averageValue={averageValue}
                    eventName={selectedEvent || 'All Events'}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
}
