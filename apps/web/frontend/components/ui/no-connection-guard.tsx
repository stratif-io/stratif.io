import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { Button } from '@/components/ui/button'
import { Database } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SPACING, TYPOGRAPHY } from '@/lib/constants'

export function NoConnectionScreen({ className }: { className?: string }) {
  const navigate = useNavigate()
  return (
    <div className={cn(SPACING.page, className)}>
      <div className="flex flex-col items-start gap-8 px-1 py-8 max-w-lg">
        <div className="flex h-10 w-10 items-center justify-center border border-border">
          <Database className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h2 className={TYPOGRAPHY.sectionTitleSm}>Connect your warehouse</h2>
          <p className={cn(TYPOGRAPHY.muted, 'leading-relaxed')}>
            stratif.io queries your database directly — no data pipelines, no per-event fees.
            Connect once and your events are available immediately.
          </p>
        </div>

        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="shrink-0 font-medium text-xs text-muted-foreground w-5 pt-0.5">
              01
            </span>
            <div>
              <p className="font-medium">Add a connection</p>
              <p className="text-muted-foreground mt-0.5">
                Snowflake, Databricks, PostgreSQL, or DuckDB — provide credentials and stratif.io
                connects directly.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-medium text-xs text-muted-foreground w-5 pt-0.5">
              02
            </span>
            <div>
              <p className="font-medium">Point to your events table</p>
              <p className="text-muted-foreground mt-0.5">
                Tell stratif.io which table holds your events and which columns map to user,
                session, and timestamp.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-medium text-xs text-muted-foreground w-5 pt-0.5">
              03
            </span>
            <div>
              <p className="font-medium">Explore your data</p>
              <p className="text-muted-foreground mt-0.5">
                Mission Control metrics, activity charts, and top events — all queried live from
                your warehouse.
              </p>
            </div>
          </li>
        </ol>

        <Button onClick={() => navigate('/connections')}>Add your first connection</Button>
      </div>
    </div>
  )
}

interface NoConnectionGuardProps {
  children: React.ReactNode
  screenClassName?: string
}

export function NoConnectionGuard({ children, screenClassName }: NoConnectionGuardProps) {
  const { activeConnectionId } = useAppStore()
  if (!activeConnectionId) return <NoConnectionScreen className={screenClassName} />
  return <>{children}</>
}
