import { useEffect } from 'react'
import { useAppStore } from '@/stores'
import { PageTransition } from '@/components/layout/PageTransition'
import { MissionControlGrid } from './components/MissionControlGrid'
import { TopEvents } from './components/TopEvents'
import { useMissionControl } from './hooks/useMissionControl'
import { useMissionControlTrends } from './hooks/useMissionControlTrends'
import { QueryError } from '@/components/ui/query-error'
import { SPACING, TYPOGRAPHY } from '@/lib/constants'
import { DevCard } from '@/components/dev'
import { NoConnectionScreen } from '@/components/ui/no-connection-guard'

export function DashboardPage() {
  useEffect(() => {
    document.title = 'Mission Control — stratif.io'
  }, [])

  const { dateRange, activeConnectionId, setActiveConnectionId } = useAppStore()
  const { data, metricLoading, isError, error, topEvents, eventsLoading, topEventsSql } =
    useMissionControl({
      dateRange,
    })
  const { trends } = useMissionControlTrends({ dateRange })

  const isConnectionNotFound =
    isError &&
    error instanceof Error &&
    error.message.toLowerCase().includes('connection not found')

  useEffect(() => {
    if (isConnectionNotFound && activeConnectionId) {
      setActiveConnectionId(null)
    }
  }, [isConnectionNotFound, activeConnectionId, setActiveConnectionId])

  if (!activeConnectionId || isConnectionNotFound) {
    return (
      <PageTransition>
        <NoConnectionScreen />
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className={SPACING.page}>
        <div className={SPACING.section}>
          <h1 className={TYPOGRAPHY.pageLabel}>Mission Control</h1>

          {isError ? (
            <QueryError error={error} />
          ) : (
            <>
              <MissionControlGrid data={data} trends={trends} metricLoading={metricLoading} />
              <DevCard sql={topEventsSql}>
                <TopEvents events={topEvents} loading={eventsLoading} />
              </DevCard>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
