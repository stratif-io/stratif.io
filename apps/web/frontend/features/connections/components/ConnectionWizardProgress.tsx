import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type WizardStep = 'connection' | 'schema'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'connection', label: 'Connect' },
  { id: 'schema', label: 'Schema' },
]

interface Props {
  currentStep: WizardStep
  onStepClick?: (step: WizardStep) => void
}

export function ConnectionWizardProgress({ currentStep, onStepClick }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex
        const isActive = i === currentIndex

        return (
          <button
            key={step.id}
            data-testid={`step-${step.id}`}
            data-active={String(isActive)}
            data-completed={String(isCompleted)}
            onClick={() => onStepClick?.(step.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              isCompleted && 'bg-success/10 border border-success/30 text-success',
              isActive && 'bg-primary/10 border border-primary/30 text-primary',
              !isCompleted &&
                !isActive &&
                'bg-muted/50 border border-transparent text-muted-foreground',
              onStepClick ? 'cursor-pointer' : 'cursor-default'
            )}
          >
            {isCompleted && <Check className="h-3 w-3" />}
            {step.label}
          </button>
        )
      })}
    </div>
  )
}
