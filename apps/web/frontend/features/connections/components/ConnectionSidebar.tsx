import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ConnectionStep = 'credentials' | 'table' | 'fieldmap' | 'advanced'
export type TestStatus = 'idle' | 'testing' | 'connected' | 'failed'

const STEPS: { id: ConnectionStep; label: string }[] = [
  { id: 'credentials', label: 'Credentials' },
  { id: 'table', label: 'Table' },
  { id: 'fieldmap', label: 'Field Map' },
  { id: 'advanced', label: 'Advanced' },
]

const DB_TYPE_LABELS: Record<string, string> = {
  duckdb: 'DuckDB',
  postgresql: 'PostgreSQL',
  databricks: 'Databricks',
  snowflake: 'Snowflake',
  clickhouse: 'ClickHouse',
  sqlite: 'SQLite',
}

interface ConnectionSidebarProps {
  connectionName: string
  dbType: string
  testStatus: TestStatus
  currentStep: ConnectionStep
  completedSteps: string[]
  onStepClick: (step: ConnectionStep) => void
  tableFooter?: string
}

export function ConnectionSidebar({
  connectionName,
  dbType,
  testStatus,
  currentStep,
  completedSteps,
  onStepClick,
  tableFooter,
}: ConnectionSidebarProps) {
  return (
    <aside className="w-44 shrink-0 bg-background border-r flex flex-col py-4 px-2.5">
      {/* Connection info */}
      <div className="mb-3 px-1">
        <p className="text-xs font-bold text-foreground truncate">{connectionName}</p>
        <p className="text-xs text-muted-foreground">{DB_TYPE_LABELS[dbType] ?? dbType}</p>
      </div>

      {/* Status dot */}
      <div
        data-testid="conn-status"
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-md mb-3',
          testStatus === 'testing' && 'bg-blue-50 text-blue-700',
          testStatus === 'connected' && 'bg-green-50 text-green-700',
          testStatus === 'failed' && 'bg-red-50 text-red-700',
          testStatus === 'idle' && 'bg-muted text-muted-foreground'
        )}
      >
        {testStatus === 'testing' && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
        {testStatus === 'connected' && (
          <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
        )}
        {testStatus === 'failed' && <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />}
        {testStatus === 'idle' && (
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
        )}
        <span>
          {testStatus === 'testing' && 'Testing…'}
          {testStatus === 'connected' && 'Connected'}
          {testStatus === 'failed' && 'Failed'}
          {testStatus === 'idle' && 'Not tested'}
        </span>
      </div>

      {/* Step nav */}
      <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider px-1 mb-1.5">
        Setup
      </p>
      <nav className="space-y-0.5">
        {STEPS.map((step, i) => {
          const isCompleted = completedSteps.includes(step.id)
          const isActive = currentStep === step.id
          return (
            <button
              key={step.id}
              data-testid={`step-nav-${step.id}`}
              data-active={String(isActive)}
              data-completed={String(isCompleted)}
              onClick={() => onStepClick(step.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left',
                isActive && 'bg-blue-50',
                !isActive && 'hover:bg-muted/60'
              )}
            >
              <span
                className={cn(
                  'h-[18px] w-[18px] rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold border-2',
                  isCompleted && 'bg-blue-500 border-blue-500 text-white',
                  isActive && !isCompleted && 'border-blue-500 text-blue-600 bg-white',
                  !isActive && !isCompleted && 'border-muted-foreground/30 text-muted-foreground/40'
                )}
              >
                {isCompleted ? <Check className="h-2.5 w-2.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-[11px]',
                  isActive && 'font-semibold text-blue-700',
                  !isActive && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Footer metadata */}
      {tableFooter && (
        <div className="mt-auto pt-3 border-t px-1">
          <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-0.5">
            Table
          </p>
          <p className="text-[10px] font-semibold text-foreground font-mono truncate">
            {tableFooter}
          </p>
        </div>
      )}
    </aside>
  )
}
