import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardLoadingBar } from '@/components/ui/card-loading-bar'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageTransition } from '@/components/layout/PageTransition'
import { ChartSkeleton } from '@/components/ui/loading-state'
import { QueryError } from '@/components/ui/query-error'
import { EmptyState } from '@/components/ui/empty-state'
import { TrendingUp, BarChart3, LineChart as LineChartIcon } from 'lucide-react'
import { useAppStore } from '@/stores'
import { fetchPivotOptions } from '@/lib/api'
import { useTrendData } from './hooks/useTrendData'
import { TrendChart } from './components/TrendChart'
import { SPACING, TYPOGRAPHY, ICON_SIZES } from '@/lib/constants'

export function TrendsPage() {
  useEffect(() => {
    document.title = 'Trends — stratif.io'
  }, [])

  const { dateRange, activeConnectionId } = useAppStore()
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [granularity, setGranularity] = useState<'day' | 'week'>('day')
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area')
  const [breakdownDimension, setBreakdownDimension] = useState<string | null>(null)
  const [measureField, setMeasureField] = useState<string>('count_events')
  const [aggregation, setAggregation] = useState<'sum' | 'avg' | 'min' | 'max' | 'count' | 'count_distinct'>('sum')

  useEffect(() => {
    setBreakdownDimension(null)
    setMeasureField('count_events')
    setAggregation('sum')
  }, [activeConnectionId])

  const isNumericField = measureField !== 'count_events' && measureField !== 'unique_users'
  const measure = isNumericField ? `${aggregation}:${measureField}` : measureField

  const { data: pivotOptions } = useQuery({
    queryKey: ['pivot-options', activeConnectionId],
    queryFn: () => fetchPivotOptions(activeConnectionId ?? undefined),
    staleTime: 5 * 60 * 1000,
  })
  const dimensions = pivotOptions?.dimensions ?? []
  const standardMeasures = pivotOptions?.measures ?? []
  const numericDimensions = pivotOptions?.numeric_dimensions ?? []

  const {
    trendData,
    events,
    isLoading,
    isError,
    error,
    totalEvents,
    averageValue,
    maxValue,
    seriesKeys,
    measureKey,
  } = useTrendData({
    dateRange,
    selectedEvent,
    granularity,
    breakdownDimension,
    measure,
  })

  if (isError) return <QueryError error={error} />

  const measureIsNonDefault = measure !== 'count_events'

  return (
    <PageTransition>
      <div className={SPACING.page}>
        <div className={SPACING.section}>
          <h1 className="sr-only">Trends</h1>
          <span className={TYPOGRAPHY.pageLabel}>Trend Analysis</span>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card hover="lift" className="col-span-2 lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={TYPOGRAPHY.label}>Total Events</CardTitle>
                <TrendingUp className={`${ICON_SIZES.sm} text-muted-foreground`} />
              </CardHeader>
              <CardContent>
                <div className={TYPOGRAPHY.metric}>{totalEvents.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card hover="lift" className="col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={TYPOGRAPHY.label}>Daily Average</CardTitle>
                <BarChart3 className={`${ICON_SIZES.sm} text-muted-foreground`} />
              </CardHeader>
              <CardContent>
                <div className={TYPOGRAPHY.metric}>{averageValue.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card hover="lift" className="col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={TYPOGRAPHY.label}>Daily Peak</CardTitle>
                <LineChartIcon className={`${ICON_SIZES.sm} text-muted-foreground`} />
              </CardHeader>
              <CardContent>
                <div className={TYPOGRAPHY.metric}>{maxValue.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="relative overflow-hidden">
            <CardLoadingBar loading={isLoading} />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-end">
                <div className="flex flex-wrap gap-2 justify-end">
                  {/* Chart type toggle */}
                  <div className="flex items-center border rounded-md p-1">
                    <Button
                      variant={chartType === 'area' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setChartType('area')}
                      className="h-8"
                    >
                      Area
                    </Button>
                    <Button
                      variant={chartType === 'line' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setChartType('line')}
                      className="h-8"
                    >
                      Line
                    </Button>
                    <Button
                      variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setChartType('bar')}
                      className="h-8"
                    >
                      Bar
                    </Button>
                  </div>

                  {/* Event selector */}
                  <Select
                    value={selectedEvent || 'all'}
                    onValueChange={(val) => setSelectedEvent(val === 'all' ? '' : val)}
                  >
                    <SelectTrigger className="w-[min(180px,45vw)]">
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

                  {/* Granularity selector */}
                  <Select
                    value={granularity}
                    onValueChange={(val) => setGranularity(val as 'day' | 'week')}
                    disabled={!!breakdownDimension}
                  >
                    <SelectTrigger
                      className="w-[min(120px,35vw)]"
                      title={
                        breakdownDimension
                          ? 'Granularity is not available in breakdown mode'
                          : undefined
                      }
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Daily</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Measure field selector */}
                  <Select value={measureField} onValueChange={setMeasureField}>
                    <SelectTrigger
                      className={`w-[min(180px,45vw)] ${measureIsNonDefault ? 'border-primary text-primary' : ''}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Standard</SelectLabel>
                        {standardMeasures.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      {numericDimensions.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Numeric fields</SelectLabel>
                          {numericDimensions.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>

                  {/* Aggregation selector — only shown for numeric fields */}
                  {isNumericField && (
                    <Select
                      value={aggregation}
                      onValueChange={(val) => setAggregation(val as typeof aggregation)}
                    >
                      <SelectTrigger className="w-[min(100px,30vw)] border-primary text-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="count_distinct">Count Distinct</SelectItem>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="avg">Avg</SelectItem>
                        <SelectItem value="min">Min</SelectItem>
                        <SelectItem value="max">Max</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {/* Breakdown selector */}
                  {dimensions.length > 0 && (
                    <Select
                      value={breakdownDimension ?? 'none'}
                      onValueChange={(val) => setBreakdownDimension(val === 'none' ? null : val)}
                    >
                      <SelectTrigger
                        className={`w-[min(180px,45vw)] ${breakdownDimension ? 'border-primary text-primary' : ''}`}
                      >
                        <SelectValue placeholder="Break down by…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No breakdown</SelectItem>
                        {dimensions.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton height="h-[300px] sm:h-[380px] lg:h-[450px]" />
              ) : trendData.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No trend data available"
                  description="No events were recorded in this date range. Try widening the range or selecting a different event."
                  className="h-[300px] sm:h-[380px] lg:h-[450px]"
                />
              ) : (
                <div className="h-[300px] sm:h-[380px] lg:h-[450px]">
                  <TrendChart
                    data={trendData}
                    chartType={chartType}
                    averageValue={averageValue}
                    eventName={selectedEvent || 'All Events'}
                    seriesKeys={seriesKeys}
                    measureKey={measureKey}
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
