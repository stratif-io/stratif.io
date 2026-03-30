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
        definition:
          'People using your product for the very first time. A user is "new" if this period contains their earliest recorded event — ever. Growing new users means your acquisition is working.',
        lines: [
          { value: String(m.unique_users), label: 'active users this period' },
          {
            value: String(m.returning_users + m.resurrected_users),
            label: 'had prior activity',
            op: 'minus',
          },
          { value: String(m.new_users), label: 'new users', op: 'equals', highlight: true },
        ],
        footnote: 'Newness is checked against all historical data, not just the current window.',
      }
    case 'returning_users':
      return {
        definition:
          'Users who were active before and came back again within a normal gap. These are your regulars — the core of a healthy, retained user base.',
        lines: [
          { value: String(m.unique_users), label: 'active users this period' },
          { value: String(m.new_users), label: 'first-timers', op: 'minus' },
          { value: String(m.resurrected_users), label: 'resurrected', op: 'minus' },
          { value: String(m.returning_users), label: 'returning', op: 'equals', highlight: true },
        ],
      }
    case 'resurrected_users':
      return {
        definition:
          'Users who went quiet for a long time and then came back. Re-engagement campaigns, product updates, or word-of-mouth can drive resurrection. Worth investigating what brought them back.',
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
        footnote:
          'A user is resurrected if their gap since last activity exceeds the resurrection window (configurable in connection settings).',
      }
    case 'churned_users':
      return {
        definition:
          'Users who were active in the previous period but did not show up this period. Churn is a lagging signal — by the time it appears, the user has already disengaged. Keeping this number low is the clearest sign of product-market fit.',
        lines: [
          {
            value: String(m.churned_users),
            label: 'users lost vs. prior period',
            op: 'equals',
            highlight: true,
          },
        ],
        footnote: 'Compared against the equivalent preceding period of the same length.',
      }
    case 'retention_rate': {
      const retained = breakdown?.retained_count ?? '—'
      const prevUniq = breakdown?.prev_unique_users ?? '—'
      return {
        definition:
          "The percentage of last period's active users who returned this period. Retention is the most important metric for sustainable growth — you can't grow a leaky bucket.",
        lines: [
          { value: String(retained), label: 'users who came back from last period' },
          { value: String(prevUniq), label: 'active users last period', op: 'divide' },
          {
            value: fmt('retention_rate', m.retention_rate),
            label: 'retention rate',
            op: 'equals',
            highlight: true,
          },
        ],
        footnote: 'Benchmark: >25% monthly is decent, >40% is strong for most consumer products.',
      }
    }
    case 'dau_mau_ratio':
      return {
        definition:
          'How often monthly users return on a daily basis — a direct measure of product stickiness. A ratio of 50% means the average monthly user comes back every other day.',
        lines: [
          { value: String(breakdown?.avg_dau ?? '—'), label: 'avg distinct users/day (DAU)' },
          {
            value: String(breakdown?.mau_28d ?? '—'),
            label: 'users in last 28 days (MAU)',
            op: 'divide',
          },
          {
            value: fmt('dau_mau_ratio', m.dau_mau_ratio),
            label: 'DAU / MAU',
            op: 'equals',
            highlight: true,
          },
        ],
        footnote:
          'Benchmarks: ~20% is typical, ~50% is excellent (WhatsApp-level). MAU uses a rolling 28-day window.',
      }
    case 'wau':
      return {
        definition:
          'Distinct users who were active in the last 7 days of the selected period. A useful middle ground between DAU (noisy) and MAU (slow to react) for tracking weekly engagement trends.',
        lines: [
          { value: fmt('wau', m.wau), label: 'weekly active users', op: 'equals', highlight: true },
        ],
      }
    case 'avg_active_days':
      return {
        definition:
          'How many different days the average user was active during this period. A rising number means users are building a habit. Flat or falling means engagement is shallow or sporadic.',
        lines: [
          {
            value: fmt('avg_active_days', m.avg_active_days),
            label: 'avg active days per user',
            op: 'equals',
            highlight: true,
          },
        ],
        footnote: 'Only counts users who were active at least once during the period.',
      }
    case 'power_users':
      return {
        definition:
          'Your most engaged users — those who hit the activity threshold that defines "power use" for your product. Power users drive word-of-mouth, provide the best feedback, and are the least likely to churn.',
        lines: [
          {
            value: String(m.power_users),
            label: 'power users',
            op: 'equals',
            highlight: true,
          },
          { value: String(m.unique_users), label: 'total active users' },
        ],
        footnote:
          'The threshold (minimum active days) is configurable in your connection settings.',
      }
    case 'total_events':
      return {
        definition:
          'The total number of actions tracked across all users during this period. Use this to measure overall product activity and to spot sudden spikes or drops that might indicate a bug or viral moment.',
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
        definition:
          'The number of distinct users who triggered at least one event — your Monthly Active Users (MAU) for the selected period. This is the broadest measure of your active audience size.',
        lines: [
          {
            value: String(m.unique_users),
            label: 'distinct active users',
            op: 'equals',
            highlight: true,
          },
        ],
      }
    case 'total_sessions':
      return {
        definition:
          'The number of continuous usage sessions across all users. A session groups events that happen close together in time; a new session begins after a gap of inactivity. More sessions generally means more frequent visits.',
        lines: [
          {
            value: fmt('total_sessions', m.total_sessions),
            label: 'sessions',
            op: 'equals',
            highlight: true,
          },
        ],
        footnote:
          'The inactivity timeout that splits sessions is configurable in connection settings.',
      }
    case 'avg_session_duration_sec':
      return {
        definition:
          'How long the average session lasts, measured from the first event to the last. Longer sessions usually mean deeper engagement — though for utility apps, short focused sessions can be a sign of efficiency, not disengagement.',
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
        definition:
          'How much users do within a single session. A higher count suggests users are exploring more of your product. A very low count may point to friction or poor discoverability.',
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
