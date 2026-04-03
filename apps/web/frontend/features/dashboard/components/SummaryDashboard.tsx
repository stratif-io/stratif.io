import { useAppStore } from '@/stores'
import { useMissionControl } from '@/features/dashboard/hooks/useMissionControl'
import { HeroKpiCard } from './HeroKpiCard'

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

function calcDeltaPct(current: number, previous: number | null): number {
  if (previous === null || previous === 0) return 0
  return ((current - previous) / previous) * 100
}

// Generate a simple ascending/descending stub sparkline from two values
function stubSparkline(prev: number | null, curr: number): number[] {
  const start = prev ?? curr * 0.9
  return Array.from({ length: 7 }, (_, i) => start + ((curr - start) * i) / 6)
}

export function SummaryDashboard() {
  const { dateRange } = useAppStore()
  const { data, isLoading } = useMissionControl({ dateRange })

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-4 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-[10px] p-3.5 h-28 animate-pulse"
          />
        ))}
      </div>
    )
  }

  const { current, previous } = data

  const kpis = [
    {
      label: 'Active Users',
      value: fmt(current.unique_users),
      delta: calcDeltaPct(current.unique_users, previous.unique_users),
      sparkline: stubSparkline(previous.unique_users, current.unique_users),
    },
    {
      label: 'Sessions',
      value: fmt(current.total_sessions),
      delta: calcDeltaPct(current.total_sessions, previous.total_sessions),
      sparkline: stubSparkline(previous.total_sessions, current.total_sessions),
    },
    {
      label: 'Retention D7',
      value: `${current.retention_rate.toFixed(1)}%`,
      delta: calcDeltaPct(current.retention_rate, previous.retention_rate),
      sparkline: stubSparkline(previous.retention_rate, current.retention_rate),
    },
    {
      label: 'Funnel Conv.',
      value: `${current.dau_mau_ratio.toFixed(1)}%`,
      delta: calcDeltaPct(current.dau_mau_ratio, previous.dau_mau_ratio),
      sparkline: stubSparkline(previous.dau_mau_ratio, current.dau_mau_ratio),
    },
  ]

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-4 gap-2.5">
        {kpis.map((kpi) => (
          <HeroKpiCard key={kpi.label} {...kpi} />
        ))}
      </div>
      {/* Chart area — placeholder */}
      <div className="bg-card border border-border rounded-[10px] p-3.5 h-40 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <p className="text-[11px] font-semibold text-foreground">Active users over time</p>
      </div>
    </div>
  )
}
