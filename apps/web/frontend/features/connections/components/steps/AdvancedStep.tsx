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
          <Input
            id="power-user-threshold"
            type="number"
            value={form.powerUserThresholdDays}
            onChange={(e) => updateForm({ powerUserThresholdDays: Number(e.target.value) })}
            className="h-9 w-40"
          />
        </div>
      </div>

      <div className="flex justify-end pt-3 border-t">
        <Button variant="outline" size="sm" onClick={onDone}>
          Done — Back to Connections
        </Button>
      </div>
    </div>
  )
}
