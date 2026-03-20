import { cn } from '@/lib/utils'
import type { FunnelStepData } from '@/types'

interface FunnelStepsProps {
  steps: FunnelStepData[]
}

function barBg(overallRate: number) {
  if (overallRate > 70) return 'bg-success'
  if (overallRate > 40) return 'bg-primary'
  if (overallRate > 20) return 'bg-warning'
  return 'bg-destructive'
}

function dropBadgeCn(rate: number) {
  if (rate === 0) return 'bg-success/10 text-success'
  if (rate < 20) return 'bg-primary/10 text-primary'
  if (rate < 50) return 'bg-warning/10 text-warning'
  return 'bg-destructive/10 text-destructive'
}

export function FunnelSteps({ steps }: FunnelStepsProps) {
  if (!steps.length) return null

  const _startUsers = steps[0].users

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1
        const next = steps[idx + 1]
        const isFirst = idx === 0

        return (
          <div key={step.step}>
            {/* Step card */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                    {step.step}
                  </div>
                  <span className="font-semibold text-base">{step.event}</span>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold tabular-nums leading-none">
                    {step.users.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {isFirst
                      ? 'people started'
                      : step.overall_conversion_rate === 100
                        ? 'reached this step'
                        : `reached this step · ${step.overall_conversion_rate}% of starters`}
                  </div>
                </div>
              </div>

              {/* Bar */}
              <div className="h-4 bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-[width] duration-700 ease-out',
                    barBg(step.overall_conversion_rate)
                  )}
                  style={{ width: `${Math.max(step.overall_conversion_rate, 1)}%` }}
                />
              </div>
            </div>

            {/* Connector */}
            {!isLast && next && (
              <div className="flex items-center gap-3 px-4 py-2.5">
                {/* Vertical line */}
                <div className="flex flex-col items-center shrink-0 self-stretch justify-center">
                  <div className="w-px flex-1 bg-border" />
                </div>

                {/* Drop-off info */}
                {next.dropoff_users === 0 ? (
                  <span
                    className={cn('text-xs font-medium px-2.5 py-1 rounded-full', dropBadgeCn(0))}
                  >
                    All {step.users.toLocaleString()} people continued
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1 rounded-full',
                        dropBadgeCn(next.dropoff_rate)
                      )}
                    >
                      {next.dropoff_users.toLocaleString()} people left here ({next.dropoff_rate}%)
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {next.users.toLocaleString()} continued
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
