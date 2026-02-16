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
import { DateRangePicker } from '@/components/DateRangePicker'
import { TrendingUp, BarChart3, LineChart as LineChartIcon } from 'lucide-react'
import { useAppStore } from '@/stores'
import { useTrendData } from './hooks/useTrendData'
import { TrendChart } from './components/TrendChart'

export function TrendsPage() {
  const { dateRange, setDateRange } = useAppStore()
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [granularity, setGranularity] = useState<'day' | 'week'>('day')
  const [chartType, setChartType] = useState<'area' | 'line'>('area')

  const { trendData, events, isLoading, totalEvents, averageValue, maxValue } = useTrendData({
    dateRange,
    selectedEvent,
    granularity,
  })

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trend Analysis</h1>
          <p className="text-muted-foreground mt-1">Analyze event trends over time</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Events per day</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Day</CardTitle>
            <LineChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maxValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Maximum events in a day</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Event Trends</CardTitle>
            </div>
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
            <div className="h-[450px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
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
  )
}
