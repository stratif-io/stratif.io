import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRangePicker } from '@/components/DateRangePicker'
import { Route } from 'lucide-react'
import { useAppStore } from '@/stores'
import { usePathsData } from './hooks/usePathsData'
import { PathsChart } from './components/PathsChart'
import { PathsTable } from './components/PathsTable'

export function PathsPage() {
  const { dateRange, setDateRange, selectedEvent, setSelectedEvent } = useAppStore()
  const [deviceType, setDeviceType] = useState<string>('')
  const [targetEvent, setTargetEvent] = useState<string>(selectedEvent || 'Purchase')

  const { pathData, events, isLoading, eventsLoading, totalOccurrences } = usePathsData({
    dateRange,
    targetEvent,
    deviceType,
  })

  const handleTargetEventChange = (val: string) => {
    setTargetEvent(val)
    setSelectedEvent(val)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Path Analysis</h1>
          <p className="text-muted-foreground mt-1">Discover user journeys leading to key events</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Reverse Path Analysis</CardTitle>
                <CardDescription>Most common paths leading to a target event</CardDescription>
              </div>
            </div>
            <Select value={targetEvent} onValueChange={handleTargetEventChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select target event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event} value={event}>
                    {event}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || eventsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {totalOccurrences.toLocaleString()}
                  </span>{' '}
                  total occurrences
                </div>
                <Select
                  value={deviceType || 'all'}
                  onValueChange={(val) => setDeviceType(val === 'all' ? '' : val)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Devices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Devices</SelectItem>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Desktop">Desktop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <PathsChart data={pathData} targetEvent={targetEvent} />
              <PathsTable data={pathData} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
