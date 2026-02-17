import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageTransition } from '@/components/layout/PageTransition'
import { LoadingState, TableSkeleton } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Table as TableIcon, RotateCcw, Plus, X, TrendingUp, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useAppStore } from '@/stores'
import { fetchPivot, fetchPivotOptions } from '@/lib/api'
import { SPACING, TYPOGRAPHY, ICON_SIZES } from '@/lib/constants'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function PivotPage() {
  const { dateRange, activeFilters, activeConnectionId } = useAppStore()
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([])
  const [selectedColumnDimensions, setSelectedColumnDimensions] = useState<string[]>([])
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>(['count', 'unique_users'])
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const startDate = format(dateRange.from, 'yyyy-MM-dd')
  const endDate = format(dateRange.to, 'yyyy-MM-dd')

  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: ['pivot-options', activeConnectionId],
    queryFn: () => fetchPivotOptions(activeConnectionId ?? undefined),
  })

  const { data: pivotData, isLoading: pivotLoading } = useQuery({
    queryKey: [
      'pivot',
      selectedDimensions.join(','),
      selectedColumnDimensions.join(','),
      selectedMeasures.join(','),
      startDate,
      endDate,
      eventFilter,
      activeFilters,
    ],
    queryFn: () =>
      fetchPivot({
        row_dimensions: selectedDimensions,
        column_dimensions: selectedColumnDimensions,
        measures: selectedMeasures,
        start_date: startDate,
        end_date: endDate,
        event_filter: eventFilter === 'all' ? undefined : eventFilter,
        filters: activeFilters,
      }),
    enabled: selectedMeasures.length > 0,
  })

  const handleReset = () => {
    setSelectedDimensions([])
    setSelectedColumnDimensions([])
    setSelectedMeasures(['count', 'unique_users'])
    setEventFilter('all')
    setSortKey(null)
    setSortDirection('desc')
  }

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
      : <ChevronDown className="h-3.5 w-3.5 text-primary" />
  }

  const addDimension = (dim: string) => {
    if (!selectedDimensions.includes(dim) && !selectedColumnDimensions.includes(dim)) {
      setSelectedDimensions([...selectedDimensions, dim])
    }
  }

  const removeDimension = (dim: string) => {
    setSelectedDimensions(selectedDimensions.filter((d) => d !== dim))
  }

  const addColumnDimension = (dim: string) => {
    if (!selectedColumnDimensions.includes(dim) && !selectedDimensions.includes(dim)) {
      setSelectedColumnDimensions([...selectedColumnDimensions, dim])
    }
  }

  const removeColumnDimension = (dim: string) => {
    setSelectedColumnDimensions(selectedColumnDimensions.filter((d) => d !== dim))
  }

  const addMeasure = (measure: string) => {
    if (!selectedMeasures.includes(measure)) {
      setSelectedMeasures([...selectedMeasures, measure])
    }
  }

  const removeMeasure = (measure: string) => {
    // Allow removing all measures - UI will show helpful message
    setSelectedMeasures(selectedMeasures.filter((m) => m !== measure))
  }

  const formatCellValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (key === 'day_of_week' && typeof value === 'number') {
      return DAY_NAMES[value] || String(value)
    }
    if (key === 'hour' && typeof value === 'number') {
      return `${value.toString().padStart(2, '0')}:00`
    }
    if (typeof value === 'number') {
      return value.toLocaleString()
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return format(new Date(value), 'MMM d, yyyy')
    }
    return String(value)
  }

  const getDimensionLabel = (dim: string): string => {
    return options?.dimensions.find((d) => d.value === dim)?.label || dim
  }

  const getMeasureLabel = (measure: string): string => {
    return options?.measures.find((m) => m.value === measure)?.label || measure
  }

  const availableDimensions = useMemo(() => {
    return options?.dimensions.filter(
      (d) => !selectedDimensions.includes(d.value) && !selectedColumnDimensions.includes(d.value)
    ) || []
  }, [options, selectedDimensions, selectedColumnDimensions])

  const availableMeasures = useMemo(() => {
    return options?.measures.filter((m) => !selectedMeasures.includes(m.value)) || []
  }, [options, selectedMeasures])

  const sortedData = useMemo(() => {
    if (!pivotData?.data || !sortKey) return pivotData?.data || []
    return [...pivotData.data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      let cmp = 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else {
        cmp = String(aVal).localeCompare(String(bVal))
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [pivotData?.data, sortKey, sortDirection])

  return (
    <PageTransition>
      <div className={SPACING.page}>
        <div className={SPACING.section}>
          <div>
            <h1 className={TYPOGRAPHY.pageTitle}>Pivot Explorer</h1>
            <p className={`${TYPOGRAPHY.muted} mt-1`}>
              Explore event data with flexible dimensions and measures
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TableIcon className={`${ICON_SIZES.md} text-primary`} />
                  <div>
                    <CardTitle>Configuration</CardTitle>
                    <CardDescription>
                      Select dimensions (optional) and measures for analysis
                    </CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={TYPOGRAPHY.label}>Row Dimensions</h4>
                  <p className={`${TYPOGRAPHY.mutedSm} mt-0.5`}>Table rows</p>
                </div>
                {availableDimensions.length > 0 && (
                  <Select value="" onValueChange={addDimension}>
                    <SelectTrigger className="w-40 h-8">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </SelectTrigger>
                    <SelectContent>
                      {availableDimensions.map((dim) => (
                        <SelectItem key={dim.value} value={dim.value}>
                          {dim.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className={`flex flex-wrap gap-2 min-h-[36px] p-3 border rounded-lg transition-colors ${
                selectedDimensions.length === 0
                  ? 'border-primary/30 bg-primary/5'
                  : 'bg-muted/30'
              }`}>
                {selectedDimensions.length === 0 ? (
                  <div className="flex items-center gap-2 w-full">
                    <TrendingUp className={`${ICON_SIZES.sm} text-primary`} />
                    <span className={`${TYPOGRAPHY.bodySm} text-primary font-medium`}>
                      None selected — will show aggregated metrics
                    </span>
                  </div>
                ) : (
                  selectedDimensions.map((dim) => (
                    <Badge key={dim} variant="secondary" className="gap-1">
                      {getDimensionLabel(dim)}
                      <button
                        onClick={() => removeDimension(dim)}
                        className="ml-1 hover:bg-background/50 rounded-full p-0.5"
                        aria-label={`Remove ${getDimensionLabel(dim)}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={TYPOGRAPHY.label}>Column Dimensions</h4>
                  <p className={`${TYPOGRAPHY.mutedSm} mt-0.5`}>Table columns</p>
                </div>
                {availableDimensions.length > 0 && (
                  <Select value="" onValueChange={addColumnDimension}>
                    <SelectTrigger className="w-40 h-8">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </SelectTrigger>
                    <SelectContent>
                      {availableDimensions.map((dim) => (
                        <SelectItem key={dim.value} value={dim.value}>
                          {dim.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className={`flex flex-wrap gap-2 min-h-[36px] p-3 border rounded-lg transition-colors ${
                selectedColumnDimensions.length === 0
                  ? 'border-muted bg-muted/10'
                  : 'bg-muted/30'
              }`}>
                {selectedColumnDimensions.length === 0 ? (
                  <div className="flex items-center gap-2 w-full">
                    <span className={`${TYPOGRAPHY.bodySm} text-muted-foreground italic`}>
                      None — no column grouping
                    </span>
                  </div>
                ) : (
                  selectedColumnDimensions.map((dim) => (
                    <Badge key={dim} variant="secondary" className="gap-1">
                      {getDimensionLabel(dim)}
                      <button
                        onClick={() => removeColumnDimension(dim)}
                        className="ml-1 hover:bg-background/50 rounded-full p-0.5"
                        aria-label={`Remove ${getDimensionLabel(dim)}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={TYPOGRAPHY.label}>Measures</h4>
                  <p className={`${TYPOGRAPHY.mutedSm} mt-0.5`}>Required metrics</p>
                </div>
                {availableMeasures.length > 0 && (
                  <Select value="" onValueChange={addMeasure}>
                    <SelectTrigger className="w-40 h-8">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </SelectTrigger>
                    <SelectContent>
                      {availableMeasures.map((measure) => (
                        <SelectItem key={measure.value} value={measure.value}>
                          {measure.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className={`flex flex-wrap gap-2 min-h-[36px] p-3 border rounded-lg transition-colors ${
                selectedMeasures.length === 0
                  ? 'border-destructive/50 bg-destructive/5'
                  : 'bg-muted/30'
              }`}>
                {selectedMeasures.length === 0 ? (
                  <div className="flex items-center gap-2 w-full">
                    <TrendingUp className={`${ICON_SIZES.sm} text-destructive`} />
                    <span className={`${TYPOGRAPHY.bodySm} text-destructive font-medium`}>
                      Select at least one measure to see data
                    </span>
                  </div>
                ) : (
                  selectedMeasures.map((measure) => (
                    <Badge key={measure} variant="default" className="gap-1">
                      {getMeasureLabel(measure)}
                      <button
                        onClick={() => removeMeasure(measure)}
                        className="ml-1 hover:bg-background/50 rounded-full p-0.5"
                        aria-label={`Remove ${getMeasureLabel(measure)}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Event</label>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All events</SelectItem>
                    {options?.event_names.map((event) => (
                      <SelectItem key={event} value={event}>
                        {event}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
          </div>
        </CardContent>
      </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TableIcon className={`${ICON_SIZES.md} text-primary`} />
                <div>
                  <CardTitle>Results</CardTitle>
                  <CardDescription>
                    {pivotData?.data?.length
                      ? selectedDimensions.length === 0
                        ? 'Aggregated metrics'
                        : `${pivotData.data.length} rows`
                      : selectedMeasures.length === 0
                        ? 'Select measures to see results'
                        : 'No data for selected configuration'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedMeasures.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="Select measures to begin"
                  description="Choose at least one measure (like Event Count or Unique Users) to see your data. Dimensions are optional."
                />
              ) : optionsLoading || pivotLoading ? (
                <LoadingState message="Loading results..." />
              ) : pivotData?.error ? (
                <EmptyState
                  icon={TableIcon}
                  title="Error loading data"
                  description={pivotData.error}
                />
              ) : !pivotData?.data?.length ? (
                <EmptyState
                  icon={TableIcon}
                  title="No data available"
                  description="Try adjusting your filters or date range to see results."
                />
              ) : selectedDimensions.length === 0 && selectedColumnDimensions.length === 0 ? (
                // Show as metric cards when no dimensions selected
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {pivotData.measures.map((measure) => {
                    const value = pivotData.data[0]?.[measure]
                    return (
                      <Card key={measure} hover="lift" className="animate-in fade-in-50 duration-300">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className={TYPOGRAPHY.label}>
                              {getMeasureLabel(measure)}
                            </CardTitle>
                            <TrendingUp className={`${ICON_SIZES.sm} text-primary`} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className={TYPOGRAPHY.metricLg}>
                            {formatCellValue(measure, value)}
                          </div>
                          <p className={TYPOGRAPHY.mutedSm}>Aggregated total</p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : pivotData.pivoted && pivotData.column_headers ? (
                // Show as pivot table when column dimensions are selected
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      {/* Column dimension headers */}
                      {selectedColumnDimensions.length > 0 && (
                        <tr className="border-b">
                          {pivotData.dimensions.map((dim) => (
                            <th
                              key={dim}
                              rowSpan={2}
                              className="text-left p-3 font-medium text-muted-foreground bg-muted/50 border-r cursor-pointer select-none hover:bg-muted/70 transition-colors"
                              onClick={() => handleSort(dim)}
                            >
                              <div className="flex items-center gap-1.5">
                                {getDimensionLabel(dim)}
                                <SortIcon colKey={dim} />
                              </div>
                            </th>
                          ))}
                          {pivotData.column_headers.map((colHeader, idx) => (
                            <th
                              key={idx}
                              colSpan={pivotData.measures.length}
                              className="text-center p-3 font-medium text-muted-foreground bg-primary/10 border-r"
                            >
                              {selectedColumnDimensions.map(dim => formatCellValue(dim, colHeader[dim])).join(' / ')}
                            </th>
                          ))}
                        </tr>
                      )}
                      {/* Measure headers */}
                      <tr className="border-b">
                        {selectedColumnDimensions.length === 0 && pivotData.dimensions.map((dim) => (
                          <th
                            key={dim}
                            className="text-left p-3 font-medium text-muted-foreground bg-muted/50 cursor-pointer select-none hover:bg-muted/70 transition-colors"
                            onClick={() => handleSort(dim)}
                          >
                            <div className="flex items-center gap-1.5">
                              {getDimensionLabel(dim)}
                              <SortIcon colKey={dim} />
                            </div>
                          </th>
                        ))}
                        {pivotData.column_headers.map((colHeader, colIdx) =>
                          pivotData.measures.map((measure, mIdx) => {
                            const colLabel = selectedColumnDimensions.map(dim => colHeader[dim]).join('_')
                            const cellKey = `${colLabel}_${measure}`
                            return (
                              <th
                                key={`${colIdx}-${measure}`}
                                className={`text-right p-3 font-medium text-muted-foreground bg-muted/30 cursor-pointer select-none hover:bg-muted/70 transition-colors ${
                                  mIdx === pivotData.measures.length - 1 ? 'border-r' : ''
                                }`}
                                onClick={() => handleSort(cellKey)}
                              >
                                <div className="flex items-center justify-end gap-1.5">
                                  <SortIcon colKey={cellKey} />
                                  {getMeasureLabel(measure)}
                                </div>
                              </th>
                            )
                          })
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                          {pivotData.dimensions.map((dim) => (
                            <td key={dim} className="p-3 font-medium border-r">
                              {formatCellValue(dim, row[dim])}
                            </td>
                          ))}
                          {(pivotData.column_headers || []).map((colHeader, colIdx) => {
                            const colLabel = selectedColumnDimensions.map(dim => colHeader[dim]).join('_')
                            return pivotData.measures.map((measure, mIdx) => (
                              <td
                                key={`${colIdx}-${measure}`}
                                className={`p-3 text-right ${
                                  mIdx === pivotData.measures.length - 1 ? 'border-r' : ''
                                }`}
                              >
                                {formatCellValue(measure, row[`${colLabel}_${measure}`] ?? 0)}
                              </td>
                            ))
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // Show as regular table when only row dimensions are selected
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        {pivotData.dimensions.map((dim) => (
                          <th
                            key={dim}
                            className="text-left p-3 font-medium text-muted-foreground bg-muted/50 cursor-pointer select-none hover:bg-muted/70 transition-colors"
                            onClick={() => handleSort(dim)}
                          >
                            <div className="flex items-center gap-1.5">
                              {getDimensionLabel(dim)}
                              <SortIcon colKey={dim} />
                            </div>
                          </th>
                        ))}
                        {pivotData.measures.map((measure) => (
                          <th
                            key={measure}
                            className="text-right p-3 font-medium text-muted-foreground bg-muted/50 cursor-pointer select-none hover:bg-muted/70 transition-colors"
                            onClick={() => handleSort(measure)}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <SortIcon colKey={measure} />
                              {getMeasureLabel(measure)}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                          {pivotData.dimensions.map((dim) => (
                            <td key={dim} className="p-3">
                              {formatCellValue(dim, row[dim])}
                            </td>
                          ))}
                          {pivotData.measures.map((measure) => (
                            <td key={measure} className="p-3 text-right font-medium">
                              {formatCellValue(measure, row[measure])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
}
