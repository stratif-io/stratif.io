import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Route, Search, RotateCcw } from 'lucide-react'
import { useAppStore } from '@/stores'
import { usePathExplorer } from './hooks/usePathExplorer'
import { PathExplorerChart } from './components/PathExplorerChart'
import { PathExplorerTable } from './components/PathExplorerTable'
import { Button } from '@/components/ui/button'

const TIME_UNITS = [
  { value: 'seconds', label: 'Seconds' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
] as const

const GROUP_BY_OPTIONS = [
  { value: 'user_id', label: 'User' },
  { value: 'session_id', label: 'Session' },
] as const

export function PathsExplorerPage() {
  const { dateRange } = useAppStore()
  const [startEvent, setStartEvent] = useState<string>('')
  const [endEvent, setEndEvent] = useState<string>('')
  const [minPathLength, setMinPathLength] = useState<number>(2)
  const [maxPathLength, setMaxPathLength] = useState<number>(5)
  const [maxTimeBetweenEvents, setMaxTimeBetweenEvents] = useState<number | null>(null)
  const [timeUnit, setTimeUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days'>('minutes')
  const [groupBy, setGroupBy] = useState<'user_id' | 'session_id'>('user_id')
  const [topN, setTopN] = useState<number>(20)

  const { pathData, events, isLoading, eventsLoading, totalPaths } = usePathExplorer({
    dateRange,
    startEvent: startEvent || null,
    endEvent: endEvent || null,
    minPathLength,
    maxPathLength,
    maxTimeBetweenEvents,
    timeUnit,
    groupBy,
    topN,
  })

  const handleReset = () => {
    setStartEvent('')
    setEndEvent('')
    setMinPathLength(2)
    setMaxPathLength(5)
    setMaxTimeBetweenEvents(null)
    setTimeUnit('minutes')
    setGroupBy('user_id')
    setTopN(20)
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Path Explorer</h1>
        <p className="text-muted-foreground mt-1">
          Discover and analyze user journeys through your application
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Analysis Filters</CardTitle>
              <CardDescription>Configure path analysis parameters</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-event">Start Event</Label>
              <Select
                value={startEvent || 'any'}
                onValueChange={(v) => setStartEvent(v === 'any' ? '' : v)}
              >
                <SelectTrigger id="start-event">
                  <SelectValue placeholder="Any event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any event</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event} value={event}>
                      {event}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-event">End Event</Label>
              <Select
                value={endEvent || 'any'}
                onValueChange={(v) => setEndEvent(v === 'any' ? '' : v)}
              >
                <SelectTrigger id="end-event">
                  <SelectValue placeholder="Any event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any event</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event} value={event}>
                      {event}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-length">Min Path Length</Label>
              <Input
                id="min-length"
                type="number"
                min={2}
                max={20}
                value={minPathLength}
                onChange={(e) => setMinPathLength(Math.max(2, parseInt(e.target.value) || 2))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-length">Max Path Length</Label>
              <Input
                id="max-length"
                type="number"
                min={minPathLength}
                max={20}
                value={maxPathLength}
                onChange={(e) =>
                  setMaxPathLength(
                    Math.max(minPathLength, parseInt(e.target.value) || minPathLength)
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-time">Max Time Between</Label>
              <Input
                id="max-time"
                type="number"
                min={1}
                placeholder="No limit"
                value={maxTimeBetweenEvents ?? ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  setMaxTimeBetweenEvents(isNaN(val) ? null : val)
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-unit">Time Unit</Label>
              <Select value={timeUnit} onValueChange={(v) => setTimeUnit(v as typeof timeUnit)}>
                <SelectTrigger id="time-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-by">Group By</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                <SelectTrigger id="group-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_BY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="top-n">Top N Results</Label>
              <Input
                id="top-n"
                type="number"
                min={1}
                max={100}
                value={topN}
                onChange={(e) =>
                  setTopN(Math.min(100, Math.max(1, parseInt(e.target.value) || 10)))
                }
              />
            </div>

            <div className="space-y-2 flex items-end">
              <Button variant="outline" onClick={handleReset} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Path Analysis Results</CardTitle>
                <CardDescription>
                  {totalPaths > 0
                    ? `Found ${totalPaths} unique paths`
                    : 'Configure filters and analyze paths'}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || eventsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              <PathExplorerChart data={pathData} dateRange={dateRange} />
              <PathExplorerTable data={pathData} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
