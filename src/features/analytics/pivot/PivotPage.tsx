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
import { Table, RotateCcw, Plus, X } from 'lucide-react'
import { useAppStore } from '@/stores'
import { fetchPivot, fetchPivotOptions } from '@/lib/api'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function PivotPage() {
  const { dateRange } = useAppStore()
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['event_name'])
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>(['count'])
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [browserFilter, setBrowserFilter] = useState<string>('all')
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all')

  const startDate = format(dateRange.from, 'yyyy-MM-dd')
  const endDate = format(dateRange.to, 'yyyy-MM-dd')

  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: ['pivot-options'],
    queryFn: fetchPivotOptions,
  })

  const { data: pivotData, isLoading: pivotLoading } = useQuery({
    queryKey: [
      'pivot',
      selectedDimensions.join(','),
      selectedMeasures.join(','),
      startDate,
      endDate,
      eventFilter,
      countryFilter,
      browserFilter,
      productCategoryFilter,
    ],
    queryFn: () =>
      fetchPivot({
        row_dimensions: selectedDimensions,
        measures: selectedMeasures,
        start_date: startDate,
        end_date: endDate,
        event_filter: eventFilter === 'all' ? undefined : eventFilter,
        country_filter: countryFilter === 'all' ? undefined : countryFilter,
        browser_filter: browserFilter === 'all' ? undefined : browserFilter,
        product_category_filter:
          productCategoryFilter === 'all' ? undefined : productCategoryFilter,
      }),
    enabled: selectedDimensions.length > 0 && selectedMeasures.length > 0,
  })

  const handleReset = () => {
    setSelectedDimensions(['event_name'])
    setSelectedMeasures(['count'])
    setEventFilter('all')
    setCountryFilter('all')
    setBrowserFilter('all')
    setProductCategoryFilter('all')
  }

  const addDimension = (dim: string) => {
    if (!selectedDimensions.includes(dim)) {
      setSelectedDimensions([...selectedDimensions, dim])
    }
  }

  const removeDimension = (dim: string) => {
    setSelectedDimensions(selectedDimensions.filter((d) => d !== dim))
  }

  const addMeasure = (measure: string) => {
    if (!selectedMeasures.includes(measure)) {
      setSelectedMeasures([...selectedMeasures, measure])
    }
  }

  const removeMeasure = (measure: string) => {
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
    return options?.dimensions.filter((d) => !selectedDimensions.includes(d.value)) || []
  }, [options, selectedDimensions])

  const availableMeasures = useMemo(() => {
    return options?.measures.filter((m) => !selectedMeasures.includes(m.value)) || []
  }, [options, selectedMeasures])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sandbox</h1>
        <p className="text-muted-foreground mt-1">
          Explore event data with flexible dimensions and measures
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>Select dimensions and measures for analysis</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Row Dimensions</h4>
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
              <div className="flex flex-wrap gap-2 min-h-[36px] p-2 border rounded-lg bg-muted/30">
                {selectedDimensions.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No dimensions selected</span>
                ) : (
                  selectedDimensions.map((dim) => (
                    <Badge key={dim} variant="secondary" className="gap-1">
                      {getDimensionLabel(dim)}
                      <button
                        onClick={() => removeDimension(dim)}
                        className="ml-1 hover:bg-background/50 rounded-full p-0.5"
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
                <h4 className="text-sm font-medium">Measures</h4>
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
              <div className="flex flex-wrap gap-2 min-h-[36px] p-2 border rounded-lg bg-muted/30">
                {selectedMeasures.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No measures selected</span>
                ) : (
                  selectedMeasures.map((measure) => (
                    <Badge key={measure} variant="default" className="gap-1">
                      {getMeasureLabel(measure)}
                      <button
                        onClick={() => removeMeasure(measure)}
                        className="ml-1 hover:bg-background/50 rounded-full p-0.5"
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Country</label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All countries</SelectItem>
                    {options?.countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Browser</label>
                <Select value={browserFilter} onValueChange={setBrowserFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All browsers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All browsers</SelectItem>
                    {options?.browsers.map((browser) => (
                      <SelectItem key={browser} value={browser}>
                        {browser}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Product Category</label>
                <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {options?.product_categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
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
            <Table className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                {pivotData?.data?.length
                  ? `${pivotData.data.length} rows`
                  : 'Configure the pivot table above'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {optionsLoading || pivotLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : pivotData?.error ? (
            <div className="text-sm text-red-500 text-center py-4">{pivotData.error}</div>
          ) : !pivotData?.data?.length ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No data available for the selected configuration
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    {pivotData.dimensions.map((dim) => (
                      <th
                        key={dim}
                        className="text-left p-3 font-medium text-muted-foreground bg-muted/50"
                      >
                        {getDimensionLabel(dim)}
                      </th>
                    ))}
                    {pivotData.measures.map((measure) => (
                      <th
                        key={measure}
                        className="text-right p-3 font-medium text-muted-foreground bg-muted/50"
                      >
                        {getMeasureLabel(measure)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pivotData.data.map((row, idx) => (
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
  )
}
