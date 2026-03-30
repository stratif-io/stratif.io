import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type WizardStep = 'connection' | 'schema' | 'filters'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'connection', label: 'Connect' },
  { id: 'schema', label: 'Schema' },
  { id: 'filters', label: 'Filters' },
]

interface Props {
  currentStep: WizardStep
}

export function ConnectionWizardProgress({ currentStep }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex
        const isActive = i === currentIndex

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 w-full">
              <div
                data-testid={`step-${step.id}`}
                data-active={String(isActive)}
                data-completed={String(isCompleted)}
                className={cn(
                  'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-semibold transition-colors',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  isActive && 'border-primary text-primary bg-background',
                  !isCompleted && !isActive && 'border-muted text-muted-foreground bg-background'
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  isActive
                    ? 'text-primary'
                    : isCompleted
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-px mx-2 mb-5 transition-colors',
                  isCompleted ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
