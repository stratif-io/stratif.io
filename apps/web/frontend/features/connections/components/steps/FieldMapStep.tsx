import { Check, X, ScanSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSchemaForm, type PendingDetection } from '../../hooks/useSchemaForm'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FieldMapStepProps {
  connId: string
}

const REQUIRED_FIELDS: {
  key: 'userIdField' | 'eventNameField' | 'timestampField'
  label: string
}[] = [
  { key: 'userIdField', label: 'User ID' },
  { key: 'eventNameField', label: 'Event Name' },
  { key: 'timestampField', label: 'Timestamp' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function FieldMapStep({ connId }: FieldMapStepProps) {
  const {
    form,
    updateForm,
    pendingDetections,
    detectedColumns,
    detect,
    handleDetect,
    acceptDetection,
    rejectDetection,
    acceptAllDetections,
  } = useSchemaForm(connId)

  const colNames = detectedColumns.map((c) => (typeof c === 'string' ? c : c.name))

  function getPending(key: string): PendingDetection | undefined {
    return pendingDetections.find((d) => d.fieldKey === key)
  }

  return (
    <div className="space-y-6">
      {/* Header with Detect button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Required Fields</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Map your table columns to the fields stratif.io needs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingDetections.length > 0 && (
            <Button size="sm" variant="outline" onClick={acceptAllDetections}>
              Accept All
            </Button>
          )}
          {form.eventsTable && (
            <Button
              size="sm"
              variant="outline"
              data-testid="detect-btn"
              onClick={handleDetect}
              disabled={detect.isPending}
            >
              <ScanSearch className="h-3.5 w-3.5 mr-1.5" />
              Detect from schema
            </Button>
          )}
        </div>
      </div>

      {/* Required field rows */}
      <div className="space-y-2">
        {REQUIRED_FIELDS.map(({ key, label }) => {
          const pending = getPending(key)
          const value = form[key]
          return (
            <div
              key={key}
              data-testid={`field-row-${key}`}
              data-suggested={pending ? 'true' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md border px-3 py-2 text-sm',
                pending
                  ? 'border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20'
                  : 'border-border'
              )}
            >
              <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                {label}
              </span>

              {pending ? (
                <>
                  <span className="flex-1 font-mono text-xs text-amber-700 dark:text-amber-400">
                    {pending.proposedColumn}
                  </span>
                  <span className="text-xs text-muted-foreground line-through">{value}</span>
                  <button
                    type="button"
                    data-testid={`accept-${key}`}
                    onClick={() => acceptDetection(key)}
                    className="h-6 w-6 flex items-center justify-center rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                    aria-label="Accept suggestion"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    data-testid={`reject-${key}`}
                    onClick={() => rejectDetection(key)}
                    className="h-6 w-6 flex items-center justify-center rounded text-destructive hover:bg-destructive/10"
                    aria-label="Reject suggestion"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <input
                  className="flex-1 h-7 rounded border border-input bg-background px-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  value={value}
                  list={`cols-${key}`}
                  onChange={(e) =>
                    updateForm({ [key]: e.target.value } as Parameters<typeof updateForm>[0])
                  }
                />
              )}
              {!pending && colNames.length > 0 && (
                <datalist id={`cols-${key}`}>
                  {colNames.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
