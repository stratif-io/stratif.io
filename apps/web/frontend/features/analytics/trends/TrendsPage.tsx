import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { TrendingUp } from 'lucide-react'
import { useAppStore } from '@/stores'
import { fetchPivotOptions } from '@/lib/api'
import { useTrendData } from './hooks/useTrendData'
import { TrendChart } from './components/TrendChart'
import { TrendFilters } from './components/TrendFilters'
import { FilterSelect } from '@/components/FilterSelect'
import { SPACING, TYPOGRAPHY, QUERY_STALE_TIME } from '@/lib/constants'
import { DevCard } from '@/components/dev'

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
  const [aggregation, setAggregation] = useState<
    'sum' | 'avg' | 'min' | 'max' | 'count' | 'count_distinct'
  >('sum')
  const [localFilters, setLocalFilters] = useState<Record<string, string[]>>({})

  useEffect(() => {
    setBreakdownDimension(null)
    setMeasureField('count_events')
    setAggregation('sum')
    setLocalFilters({})
  }, [activeConnectionId])

  // When switching to a non-numeric field, reset aggregation to 'count'
  useEffect(() => {
    if (isCustomField && !isNumericField && !['count', 'count_distinct'].includes(aggregation)) {
      setAggregation('count')
    }
  }, [measureField]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: pivotOptions } = useQuery({
    queryKey: ['pivot-options', activeConnectionId],
    queryFn: () => fetchPivotOptions(activeConnectionId ?? undefined),
    staleTime: QUERY_STALE_TIME.default,
  })
  const sortByLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label)
  const dimensions = (pivotOptions?.dimensions ?? []).slice().sort(sortByLabel)
  const standardMeasures = pivotOptions?.measures ?? []
  const numericDimensions = (pivotOptions?.numeric_dimensions ?? []).slice().sort(sortByLabel)

  const isCustomField = measureField !== 'count_events' && measureField !== 'unique_users'
  const numericValues = new Set(numericDimensions.map((d) => d.value))
  const isNumericField = isCustomField && numericValues.has(measureField)
  const measure = isCustomField ? `${aggregation}:${measureField}` : measureField

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
    sql,
  } = useTrendData({
    dateRange,
    selectedEvent,
    granularity,
    breakdownDimension,
    measure,
    localFilters,
  })

  const measureIsNonDefault = measure !== 'count_events'

  return (
    <PageTransition>
      <div className={SPACING.page}>
        <div className={SPACING.section}>
          <h1 className={TYPOGRAPHY.pageLabel}>Trend Analysis</h1>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              {
                label: 'Total Events',
                value: totalEvents.toLocaleString(),
                span: 'col-span-2 lg:col-span-2',
              },
              { label: 'Daily Average', value: averageValue.toLocaleString(), span: 'col-span-1' },
              { label: 'Daily Peak', value: maxValue.toLocaleString(), span: 'col-span-1' },
            ].map(({ label, value, span }) => (
              <div
                key={label}
                className={`relative overflow-hidden rounded-xl border bg-card shadow-sm p-3 ${span}`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {label}
                </p>
                <p className="text-lg font-bold tracking-tight leading-none">{value}</p>
              </div>
            ))}
          </div>

          <DevCard sql={sql}>
            <Card className="relative overflow-hidden">
              <CardLoadingBar loading={isLoading} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* Left group: what you're measuring */}
                  <div className="flex flex-wrap gap-2 items-center">
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
                        {dimensions.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Categorical fields</SelectLabel>
                            {dimensions.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>

                    {/* Aggregation selector — shown for custom fields only */}
                    {isCustomField && (
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
                          {isNumericField && (
                            <>
                              <SelectItem value="sum">Sum</SelectItem>
                              <SelectItem value="avg">Avg</SelectItem>
                              <SelectItem value="min">Min</SelectItem>
                              <SelectItem value="max">Max</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Right group: how it's displayed */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Chart type toggle */}
                    <div className="flex items-center border rounded-md p-1">
                      <Button
                        variant={chartType === 'area' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setChartType('area')}
                      >
                        Area
                      </Button>
                      <Button
                        variant={chartType === 'line' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setChartType('line')}
                      >
                        Line
                      </Button>
                      <Button
                        variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setChartType('bar')}
                      >
                        Bar
                      </Button>
                    </div>

                    {/* Granularity selector */}
                    <Select
                      value={granularity}
                      onValueChange={(val) => setGranularity(val as 'day' | 'week')}
                    >
                      <SelectTrigger className="w-[min(120px,35vw)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Daily</SelectItem>
                        <SelectItem value="week">Weekly</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Breakdown selector */}
                    {dimensions.length > 0 && (
                      <div className="w-[min(180px,45vw)] flex gap-1">
                        <div className="flex-1">
                          <FilterSelect
                            mode="single"
                            tree={true}
                            options={dimensions}
                            value={breakdownDimension}
                            onChange={(val) => setBreakdownDimension(val as string)}
                            placeholder="Break down by…"
                          />
                        </div>
                        {breakdownDimension && (
                          <button
                            type="button"
                            onClick={() => setBreakdownDimension(null)}
                            className="h-9 min-w-[44px] px-2 rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-xs"
                            aria-label="Clear breakdown"
                            title="Clear breakdown"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="pb-4">
                  <TrendFilters
                    dimensions={[...dimensions, ...numericDimensions]}
                    filters={localFilters}
                    connectionId={activeConnectionId ?? undefined}
                    onChange={setLocalFilters}
                  />
                </div>
                {isError ? (
                  <QueryError error={error} className="h-[300px] sm:h-[380px] lg:h-[450px]" />
                ) : isLoading ? (
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
          </DevCard>
        </div>
      </div>
    </PageTransition>
  )
}
