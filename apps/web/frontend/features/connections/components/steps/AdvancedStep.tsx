import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSchemaForm } from '../../hooks/useSchemaForm'

interface AdvancedStepProps {
  connId: string
  onDone: () => void
}

export function AdvancedStep({ connId, onDone }: AdvancedStepProps) {
  const { form, updateForm } = useSchemaForm(connId)

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">Advanced Settings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fine-tune session and engagement parameters.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="session-timeout" className="text-xs">
            Session Timeout Minutes
          </Label>
          <p className="text-[11px] text-muted-foreground">
            A gap ≥ this many minutes between events splits them into separate sessions.
          </p>
          <Input
            id="session-timeout"
            type="number"
            value={form.sessionTimeoutMinutes}
            onChange={(e) => updateForm({ sessionTimeoutMinutes: Number(e.target.value) })}
            className="h-9 w-40"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="resurrection-window" className="text-xs">
            Resurrection Window Days
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Users inactive longer than this are treated as churned and re-counted on return.
          </p>
          <Input
            id="resurrection-window"
            type="number"
            value={form.resurrectionWindowDays}
            onChange={(e) => updateForm({ resurrectionWindowDays: Number(e.target.value) })}
            className="h-9 w-40"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="power-user-threshold" className="text-xs">
            Power User Threshold Days
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Users active on at least this many days per period are flagged as power users.
          </p>
          <Input
            id="power-user-threshold"
            type="number"
            value={form.powerUserThresholdDays}
            onChange={(e) => updateForm({ powerUserThresholdDays: Number(e.target.value) })}
            className="h-9 w-40"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="query-timeout" className="text-xs">
            Query Timeout (seconds)
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Cancels queries that run longer than this duration. Range: 1–600 s.
          </p>
          <Input
            id="query-timeout"
            type="number"
            min={1}
            max={600}
            value={form.queryTimeoutSeconds}
            onChange={(e) => updateForm({ queryTimeoutSeconds: Number(e.target.value) })}
            className="h-9 w-40"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="max-concurrent-queries" className="text-xs">
            Max Concurrent Queries
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Limits simultaneous queries to your warehouse to avoid overload. Range: 1–50.
          </p>
          <Input
            id="max-concurrent-queries"
            type="number"
            min={1}
            max={50}
            value={form.maxConcurrentQueries}
            onChange={(e) => updateForm({ maxConcurrentQueries: Number(e.target.value) })}
            className="h-9 w-40"
          />
        </div>
      </div>

      <div className="flex justify-end pt-3 border-t">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Done — Back to Connections
        </Button>
      </div>
    </div>
  )
}
