import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CardLoadingBar } from '@/components/ui/card-loading-bar'
import { PageTransition } from '@/components/layout/PageTransition'
import { Header } from '@/components/layout/Header'
import { PageConfigBar } from '@/components/layout/PageConfigBar'
import { SummaryPanel } from '@/components/layout/SummaryPanel'
import { ChartSkeleton } from '@/components/ui/loading-state'
import { QueryError } from '@/components/ui/query-error'
import { EmptyState } from '@/components/ui/empty-state'
import { TrendingUp } from 'lucide-react'
import { useAppStore } from '@/stores'
import { fetchPivotOptions, fetchPivotGridFilterValues } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useTrendData } from './hooks/useTrendData'
import { TrendMetricPicker } from './components/TrendMetricPicker'
import { TrendChart } from './components/TrendChart'
import { TrendFilters } from './components/TrendFilters'
import { FilterSelect } from '@/components/FilterSelect'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { Granularity } from '@/types'
import { DevCard } from '@/components/dev'
import { NoConnectionGuard } from '@/components/ui/no-connection-guard'
import { buildPivotUrl } from './trendToPivot'

const GRANULARITY_PERIOD_LABELS: Record<Granularity, string> = {
  hour: 'Hourly',
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
  quarter: 'Quarterly',
  year: 'Yearly',
}

export function TrendsPage() {
  useEffect(() => {
    document.title = 'Trends — stratif.io'
  }, [])

  const { dateRange, activeConnectionId, granularity, dashboardView } = useAppStore()
  const navigate = useNavigate()
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area')
  const [breakdownDimension, setBreakdownDimension] = useState<string | null>(null)
  const [measureField, setMeasureField] = useState<string>('count_events')
  const [aggregation, setAggregation] = useState<
    'sum' | 'avg' | 'min' | 'max' | 'count' | 'count_distinct'
  >('sum')
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [localFilters, setLocalFilters] = useState<Record<string, string[]>>({})

  useEffect(() => {
    setBreakdownDimension(null)
    setMeasureField('count_events')
    setAggregation('sum')
    setSelectedEvent(null)
    setLocalFilters({})
  }, [activeConnectionId])

  const { data: eventNamesData } = useQuery({
    queryKey: ['trend-event-names', activeConnectionId],
    queryFn: () =>
      fetchPivotGridFilterValues({
        field: 'event_name',
        connection_id: activeConnectionId ?? undefined,
      }),
    staleTime: QUERY_STALE_TIME.default,
    enabled: !!activeConnectionId,
  })
  const eventOptions = useMemo(
    () =>
      (eventNamesData?.values ?? [])
        .map(String)
        .filter(Boolean)
        .map((v) => ({ value: v, label: v })),
    [eventNamesData]
  )

  const effectiveFilters = useMemo(() => {
    if (!selectedEvent) return localFilters
    return { ...localFilters, event_name: [selectedEvent] }
  }, [selectedEvent, localFilters])

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

  function handleRunInPivot() {
    navigate(buildPivotUrl({ measure, breakdownDimension, localFilters }))
  }

  const {
    trendData,
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
    granularity,
    breakdownDimension,
    measure,
    localFilters: effectiveFilters,
  })

  const periodLabel = GRANULARITY_PERIOD_LABELS[granularity]

  const summaryInsight =
    totalEvents > 0
      ? `${totalEvents.toLocaleString()} total events · ${periodLabel} avg ${averageValue.toLocaleString()} · peak ${maxValue.toLocaleString()}`
      : 'No events recorded in this date range.'

  return (
    <PageTransition>
      <NoConnectionGuard>
        <div className="flex flex-col h-full">
          {/* Zone 1: Header */}
          <Header title="Trends" subtitle="Event counts over time" showShare />

          {/* Zone 2: Config bar */}
          <PageConfigBar
            right={
              <div className="flex items-center bg-muted rounded-md p-0.5 h-7 gap-0.5">
                {(['area', 'line', 'bar'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setChartType(type)}
                    className={cn(
                      'px-2.5 text-xs rounded capitalize transition-colors',
                      chartType === type
                        ? 'bg-background shadow-sm font-medium text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            }
          >
            {eventOptions.length > 0 && (
              <div className="w-[min(160px,40vw)]">
                <FilterSelect
                  size="sm"
                  mode="single"
                  options={eventOptions}
                  value={selectedEvent}
                  onChange={(val) => setSelectedEvent((val as string) || null)}
                  placeholder="All events"
                  searchable
                />
              </div>
            )}
            <TrendMetricPicker
              measureField={measureField}
              aggregation={aggregation}
              standardMeasures={standardMeasures}
              numericDimensions={numericDimensions}
              dimensions={dimensions}
              onChange={(field, agg) => {
                setMeasureField(field)
                setAggregation(agg as typeof aggregation)
              }}
              onAggChange={(agg) => setAggregation(agg as typeof aggregation)}
            />
            {dimensions.length > 0 && (
              <div className="w-[min(180px,45vw)] flex gap-1">
                <div className="flex-1">
                  <FilterSelect
                    size="sm"
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
                    className="h-7 min-w-[28px] px-1.5 rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-xs"
                    aria-label="Clear breakdown"
                    title="Clear breakdown"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </PageConfigBar>

          {/* Zone 3: Content */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <DevCard sql={sql}>
                  <Card className="relative overflow-hidden">
                    <CardLoadingBar loading={isLoading} />
                    <CardHeader className="pb-3">
                      {/* Inline stats strip */}
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Total
                          </span>
                          <span className="ml-1.5 text-sm font-semibold">
                            {totalEvents.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-muted-foreground/30 select-none">|</span>
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {periodLabel} avg
                          </span>
                          <span className="ml-1.5 text-sm font-semibold">
                            {averageValue.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-muted-foreground/30 select-none">|</span>
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Peak
                          </span>
                          <span className="ml-1.5 text-sm font-semibold">
                            {maxValue.toLocaleString()}
                          </span>
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
                            eventName={selectedEvent ?? 'All Events'}
                            seriesKeys={seriesKeys}
                            measureKey={measureKey}
                          />
                        </div>
                      )}
                      {activeConnectionId && (
                        <div className="flex justify-end pt-3">
                          <Button variant="outline" size="sm" onClick={handleRunInPivot}>
                            Run in Pivot Explorer
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </DevCard>
              </div>
              {dashboardView === 'summary' && (
                <SummaryPanel
                  insight={summaryInsight}
                  totals={[
                    {
                      label: 'Total',
                      value: totalEvents.toLocaleString(),
                      color: 'hsl(var(--chart-1))',
                    },
                    {
                      label: `${periodLabel} avg`,
                      value: averageValue.toLocaleString(),
                      color: 'hsl(var(--chart-2))',
                    },
                    {
                      label: 'Peak',
                      value: maxValue.toLocaleString(),
                      color: 'hsl(var(--chart-3))',
                    },
                  ]}
                />
              )}
            </div>
          </div>
        </div>
      </NoConnectionGuard>
    </PageTransition>
  )
}
