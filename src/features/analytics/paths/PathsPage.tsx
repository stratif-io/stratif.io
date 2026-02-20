import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Route } from 'lucide-react'
import { useAppStore } from '@/stores'
import { usePathsData } from './hooks/usePathsData'
import { PathsChart } from './components/PathsChart'
import { PathsTable } from './components/PathsTable'
import { PageTransition } from '@/components/layout/PageTransition'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { SPACING, TYPOGRAPHY, ICON_SIZES } from '@/lib/constants'

export function PathsPage() {
  const { dateRange, selectedEvent, setSelectedEvent } = useAppStore()
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
    <PageTransition>
      <div className={SPACING.page}>
        <div className={SPACING.section}>
          <div>
            <h1 className={TYPOGRAPHY.pageTitle}>Path Analysis</h1>
            <p className={`${TYPOGRAPHY.muted} mt-1`}>
              Discover user journeys leading to key events
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Route className={`${ICON_SIZES.md} text-primary`} />
                  <div>
                    <CardTitle>Reverse Path Analysis</CardTitle>
                    <CardDescription>Most common paths leading to a target event</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
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
              </div>
            </CardHeader>
            <CardContent>
              {isLoading || eventsLoading ? (
                <LoadingState message="Analyzing paths…" />
              ) : pathData.length === 0 ? (
                <EmptyState
                  icon={Route}
                  title="No paths found"
                  description={`No paths lead to "${targetEvent}" in the selected date range. Try a different event or date range.`}
                />
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {totalOccurrences.toLocaleString()}
                    </span>{' '}
                    total occurrences leading to{' '}
                    <span className="font-semibold text-foreground">{targetEvent}</span>
                  </div>
                  <PathsChart data={pathData} targetEvent={targetEvent} />
                  <PathsTable data={pathData} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
}
