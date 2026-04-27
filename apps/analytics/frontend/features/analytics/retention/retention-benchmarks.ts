import type { RetentionGranularity } from './hooks/useRetentionData'

export const BENCHMARKS: Record<string, { good: number; ok: number }> = {
  // Day — bracket "returned at least once in first N days"
  day_1: { good: 25, ok: 10 },
  day_7: { good: 45, ok: 20 },
  day_30: { good: 25, ok: 10 },
  day_90: { good: 15, ok: 5 },

  // Week — bracket "returned at least once in first N weeks"
  week_1: { good: 40, ok: 20 },
  week_2: { good: 55, ok: 30 },
  week_4: { good: 45, ok: 22 },
  week_12: { good: 30, ok: 12 },

  // Month — bracket "returned at least once in first N months"
  month_1: { good: 35, ok: 15 },
  month_2: { good: 55, ok: 28 },
  month_3: { good: 50, ok: 22 },
  month_6: { good: 40, ok: 15 },

  // Quarter — bracket "returned at least once in first N quarters"
  quarter_1: { good: 30, ok: 12 },
  quarter_2: { good: 48, ok: 20 },
  quarter_3: { good: 42, ok: 16 },
  quarter_4: { good: 38, ok: 14 },

  // Year — bracket "returned at least once in first N years"
  year_1: { good: 25, ok: 10 },
  year_2: { good: 38, ok: 15 },
  year_3: { good: 32, ok: 12 },
}

export interface CellClass {
  /** Background color class for the cell wrapper div */
  container: string
  /** Text color class */
  text: string
}

export function getCellClass(
  pct: number | null,
  granularity: RetentionGranularity,
  milestone: number
): CellClass {
  if (pct === null) {
    return { container: '', text: 'text-muted-foreground/40 italic' }
  }
  const b = BENCHMARKS[`${granularity}_${milestone}`] ?? { good: 20, ok: 5 }
  if (pct >= b.good) return { container: 'bg-success/15', text: 'text-success' }
  if (pct >= b.ok) return { container: 'bg-warning/15', text: 'text-warning' }
  return { container: 'bg-destructive/12', text: 'text-destructive' }
}

/** Tooltip text for a milestone column header */
export function milestoneTooltip(granularity: RetentionGranularity, milestone: number): string {
  const b = BENCHMARKS[`${granularity}_${milestone}`] ?? { good: 20, ok: 5 }
  const unitName =
    granularity === 'week'
      ? 'weeks'
      : granularity === 'month'
        ? 'months'
        : granularity === 'quarter'
          ? 'quarters'
          : granularity === 'year'
            ? 'years'
            : 'days'
  if (milestone === 1) {
    const singular = unitName.slice(0, -1)
    return `Returned in ${singular} 1 after signup. Good ≥ ${b.good}% · Average ≥ ${b.ok}%`
  }
  return `Returned at least once in the first ${milestone} ${unitName}. Good ≥ ${b.good}% · Average ≥ ${b.ok}%`
}
