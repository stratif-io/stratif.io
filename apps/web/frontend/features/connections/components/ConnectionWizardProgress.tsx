import { cn } from '@/lib/utils'

type WizardStep = 'connection' | 'schema'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'connection', label: 'Connect' },
  { id: 'schema', label: 'Schema' },
]

interface Props {
  currentStep: WizardStep
}

export function ConnectionWizardProgress({ currentStep }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex

        return (
          <div
            key={step.id}
            data-testid={`step-${step.id}`}
            data-active={String(isActive)}
            className="flex flex-col items-center gap-1"
          >
            <div
              className={cn(
                'h-0.5 w-20 rounded-full transition-colors',
                isActive ? 'bg-primary' : 'bg-muted'
              )}
            />
            <span
              className={cn(
                'text-xs font-medium transition-colors',
                isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
