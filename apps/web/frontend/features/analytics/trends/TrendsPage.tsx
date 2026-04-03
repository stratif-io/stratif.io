import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CardLoadingBar } from '@/components/ui/card-loading-bar'
import { PageTransition } from '@/components/layout/PageTransition'
import { ChartSkeleton } from '@/components/ui/loading-state'
import { QueryError } from '@/components/ui/query-error'
import { EmptyState } from '@/components/ui/empty-state'
import { TrendingUp } from 'lucide-react'
import { useAppStore } from '@/stores'
import { fetchPivotOptions } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useTrendData } from './hooks/useTrendData'
import { TrendMetricPicker } from './components/TrendMetricPicker'
import { TrendChart } from './components/TrendChart'
import { TrendFilters } from './components/TrendFilters'
import { FilterSelect } from '@/components/FilterSelect'
import { SPACING, TYPOGRAPHY, QUERY_STALE_TIME } from '@/lib/constants'
import type { Granularity } from '@/types'
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

  const { dateRange, activeConnectionId, granularity } = useAppStore()
  const navigate = useNavigate()
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
  } = useTrendData({
    dateRange,
    granularity,
    breakdownDimension,
    measure,
    localFilters,
  })

  const periodLabel = GRANULARITY_PERIOD_LABELS[granularity]

  return (
    <PageTransition>
      <NoConnectionGuard>
        <div className={SPACING.page}>
          <div className={SPACING.section}>
            <h1 className={TYPOGRAPHY.pageLabel}>Trend Analysis</h1>

            <Card className="relative overflow-hidden">
              <CardLoadingBar loading={isLoading} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* Left group: what you're measuring */}
                  <div className="flex flex-wrap gap-2 items-center">
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
                  </div>

                  {/* Right group: how it's displayed */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Chart type toggle — h-7 inner-pill */}
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

                    {/* Breakdown selector */}
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
                  </div>
                </div>
                {/* Inline stats strip */}
                <div className="flex items-center gap-3 pt-1">
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
                      eventName="All Events"
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
          </div>
        </div>
      </NoConnectionGuard>
    </PageTransition>
  )
}
