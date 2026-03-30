import { memo } from 'react'
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatMetricValue } from '@/lib/format-metric'
import type { MissionControlMetrics, MetricBreakdown } from '@/types'

type MetricKey = keyof MissionControlMetrics

interface MetricPopoverProps {
  metricKey: MetricKey
  currentMetrics: MissionControlMetrics
  breakdown?: MetricBreakdown
}

interface FormulaLine {
  value: string
  label: string
  op?: 'minus' | 'plus' | 'divide' | 'equals'
  highlight?: boolean
}

function buildFormula(
  key: MetricKey,
  m: MissionControlMetrics,
  breakdown?: MetricBreakdown
): { definition: string; lines: FormulaLine[]; footnote?: string } {
  const fmt = (k: string, v: number) => formatMetricValue(k, v)

  switch (key) {
    case 'new_users':
      return {
        definition: 'Users whose very first event ever was recorded during this period.',
        lines: [
          { value: String(m.unique_users), label: 'active users this period' },
          {
            value: String(m.returning_users + m.resurrected_users),
            label: 'had prior activity',
            op: 'minus',
          },
          { value: String(m.new_users), label: 'new users', op: 'equals', highlight: true },
        ],
        footnote: '"New" is based on earliest event across all history, not just this window.',
      }
    case 'returning_users':
      return {
        definition:
          'Users active this period who had prior activity within the resurrection window.',
        lines: [
          { value: String(m.unique_users), label: 'active users this period' },
          { value: String(m.new_users), label: 'first-timers', op: 'minus' },
          { value: String(m.resurrected_users), label: 'resurrected', op: 'minus' },
          { value: String(m.returning_users), label: 'returning', op: 'equals', highlight: true },
        ],
      }
    case 'resurrected_users':
      return {
        definition: 'Users who came back after a long absence (beyond the resurrection window).',
        lines: [
          { value: String(m.unique_users), label: 'active users this period' },
          {
            value: String(m.new_users + m.returning_users),
            label: 'new or recently returning',
            op: 'minus',
          },
          {
            value: String(m.resurrected_users),
            label: 'resurrected',
            op: 'equals',
            highlight: true,
          },
        ],
        footnote: 'The resurrection window is configurable in your connection settings.',
      }
    case 'churned_users':
      return {
        definition: 'Users who were active last period but did not return this period.',
        lines: [
          {
            value: String(m.churned_users),
            label: 'users lost since last period',
            op: 'equals',
            highlight: true,
          },
        ],
        footnote: 'Compared against the equivalent preceding period.',
      }
    case 'retention_rate': {
      const retained = breakdown?.retained_count ?? '—'
      const prevUniq = breakdown?.prev_unique_users ?? '—'
      return {
        definition: "Share of last period's users who came back this period.",
        lines: [
          { value: String(retained), label: 'users returned from last period' },
          { value: String(prevUniq), label: 'users last period', op: 'divide' },
          {
            value: fmt('retention_rate', m.retention_rate),
            label: 'retention rate',
            op: 'equals',
            highlight: true,
          },
        ],
        footnote: 'Benchmark: >40% monthly retention is healthy for most consumer products.',
      }
    }
    case 'dau_mau_ratio':
      return {
        definition: 'How sticky your product is day-to-day.',
        lines: [
          { value: String(breakdown?.avg_dau ?? '—'), label: 'avg distinct users/day (DAU)' },
          {
            value: String(breakdown?.mau_28d ?? '—'),
            label: 'users in last 28 days (MAU)',
            op: 'divide',
          },
          {
            value: fmt('dau_mau_ratio', m.dau_mau_ratio),
            label: 'DAU/MAU',
            op: 'equals',
            highlight: true,
          },
        ],
        footnote: 'MAU uses a rolling 28-day window ending on the last day of your period.',
      }
    case 'wau':
      return {
        definition: 'Distinct users active in the last 7 days of the selected period.',
        lines: [
          { value: fmt('wau', m.wau), label: 'weekly active users', op: 'equals', highlight: true },
        ],
      }
    case 'avg_active_days':
      return {
        definition: 'Average number of distinct days each user was active during this period.',
        lines: [
          {
            value: fmt('avg_active_days', m.avg_active_days),
            label: 'avg active days per user',
            op: 'equals',
            highlight: true,
          },
        ],
        footnote: 'Higher values mean users are building a regular habit.',
      }
    case 'power_users':
      return {
        definition: 'Users who hit the minimum active-days threshold for this period.',
        lines: [
          {
            value: String(m.power_users),
            label: 'power users',
            op: 'equals',
            highlight: true,
          },
          { value: String(m.unique_users), label: 'total active users' },
        ],
        footnote: 'The threshold (e.g. 4 days) is configurable in your connection settings.',
      }
    case 'total_events':
      return {
        definition: 'Every event fired by any user during the selected period.',
        lines: [
          {
            value: fmt('total_events', m.total_events),
            label: 'events tracked',
            op: 'equals',
            highlight: true,
          },
        ],
      }
    case 'unique_users':
      return {
        definition: 'Distinct users who triggered at least one event.',
        lines: [
          {
            value: String(m.unique_users),
            label: 'distinct users',
            op: 'equals',
            highlight: true,
          },
        ],
      }
    case 'total_sessions':
      return {
        definition:
          'User sessions started during this period. A session ends after inactivity (timeout configurable).',
        lines: [
          {
            value: fmt('total_sessions', m.total_sessions),
            label: 'sessions',
            op: 'equals',
            highlight: true,
          },
        ],
      }
    case 'avg_session_duration_sec':
      return {
        definition: 'Average duration from the first to the last event of a session.',
        lines: [
          {
            value: fmt('avg_session_duration_sec', m.avg_session_duration_sec),
            label: 'avg session duration',
            op: 'equals',
            highlight: true,
          },
        ],
      }
    case 'avg_events_per_session':
      return {
        definition: 'Average number of events fired within a single session.',
        lines: [
          {
            value: fmt('avg_events_per_session', m.avg_events_per_session),
            label: 'events per session',
            op: 'equals',
            highlight: true,
          },
        ],
      }
    default:
      return { definition: '', lines: [] }
  }
}

const OP_LABELS: Record<string, string> = {
  minus: 'minus',
  plus: 'plus',
  divide: 'divided by',
  equals: '=',
}

export const MetricPopover = memo(function MetricPopover({
  metricKey,
  currentMetrics,
  breakdown,
}: MetricPopoverProps) {
  const { definition, lines, footnote } = buildFormula(metricKey, currentMetrics, breakdown)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="info"
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto text-muted-foreground/60 hover:text-muted-foreground transition-colors flex-shrink-0"
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" className="w-72 p-3 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{definition}</p>

        {lines.length > 1 && (
          <div className="bg-muted/40 rounded-lg p-3 space-y-2">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              How it&apos;s counted
            </p>
            {lines.map((line) => (
              <div key={`${line.op ?? 'val'}-${line.label}`} className="text-xs">
                {line.op && line.op !== 'equals' && (
                  <div className="text-muted-foreground/50 pl-2 text-[10px] mb-1">
                    {OP_LABELS[line.op]}
                  </div>
                )}
                <div
                  className={
                    line.highlight
                      ? 'flex items-center gap-2 border-t border-border pt-2 mt-1'
                      : 'flex items-center gap-2'
                  }
                >
                  <span
                    className={
                      line.highlight
                        ? 'font-bold text-foreground'
                        : 'font-semibold text-foreground/80'
                    }
                  >
                    {line.value}
                  </span>
                  <span className="text-muted-foreground">{line.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {footnote && (
          <p className="text-[10px] text-muted-foreground/60 italic leading-relaxed">{footnote}</p>
        )}
      </PopoverContent>
    </Popover>
  )
})
