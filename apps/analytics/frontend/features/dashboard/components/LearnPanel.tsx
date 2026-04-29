import { memo } from 'react'
import { X, BookOpen, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMetricValue } from '@/lib/format-metric'
import type { MissionControlMetrics, MissionControlMetricsNullable, MetricBreakdown } from '@/types'
import type { TrendMetric } from '../hooks/useMissionControlTrends'

interface LearnContent {
  title: string
  what: string
  snapshot: Array<{ label: string; value: string; sub?: string }>
  insight: string
  benchmark?: string
}

function buildLearnContent(
  key: TrendMetric,
  current: MissionControlMetrics,
  previous: MissionControlMetricsNullable | Partial<MissionControlMetrics>,
  pctChange: number | null,
  breakdown?: MetricBreakdown,
  currentRange?: string,
  previousRange?: string
): LearnContent {
  const fmt = (k: string, v: number) => formatMetricValue(k, v)
  const curLabel = currentRange ?? 'this period'
  const prevLabel = previousRange ?? 'prev. period'
  const up = pctChange !== null && pctChange > 0
  const down = pctChange !== null && pctChange < 0
  const pctStr = pctChange !== null ? `${up ? '+' : ''}${pctChange.toFixed(1)}%` : '—'

  const eventsPerUser = current.unique_users > 0 ? current.total_events / current.unique_users : 0
  const eventsPerUserStr = eventsPerUser > 0 ? eventsPerUser.toFixed(1) : '—'
  const shareOfActives = (n: number): string =>
    current.unique_users > 0 ? `${((n / current.unique_users) * 100).toFixed(0)}%` : '—'
  const netChange = current.new_users + current.resurrected_users - current.churned_users

  switch (key) {
    case 'total_events':
      return {
        title: 'Total Events',
        what: 'Every tap, click, or action tracked in your product. This is the raw volume of activity — the heartbeat of your analytics. Use it to spot viral moments, detect bugs, or validate that a new feature is actually being used.',
        snapshot: [
          {
            label: curLabel,
            value: fmt('total_events', current.total_events),
            sub: `${fmt('total_events', current.unique_users)} active users`,
          },
          {
            label: prevLabel,
            value: previous.total_events != null ? fmt('total_events', previous.total_events) : '—',
            sub: pctStr + ' vs. prior period',
          },
          {
            label: 'Events per user',
            value:
              current.unique_users > 0
                ? (current.total_events / current.unique_users).toFixed(1)
                : '—',
          },
        ],
        insight: up
          ? `Activity is up ${pctStr} — your ${fmt('total_events', current.unique_users)} active users fired ${eventsPerUserStr} events each on average. Rising events/user usually signals deeper engagement.`
          : down
            ? `Activity is down ${pctStr} (${eventsPerUserStr} events per active user). Worth checking whether fewer users, shorter sessions, or one specific event dropped off.`
            : `Event volume is steady at ${eventsPerUserStr} per active user.`,
      }

    case 'unique_users':
      return {
        title: 'Unique Users',
        what: 'Distinct users who triggered at least one event in the selected period. This is your active audience size for that window — everyone who showed up, regardless of how often.',
        snapshot: [
          {
            label: curLabel,
            value: String(current.unique_users),
            sub: `${fmt('total_events', current.total_events)} total events`,
          },
          {
            label: prevLabel,
            value: previous.unique_users != null ? String(previous.unique_users) : '—',
            sub: pctStr + ' vs. prior period',
          },
          {
            label: 'Events per user',
            value:
              current.unique_users > 0
                ? (current.total_events / current.unique_users).toFixed(1)
                : '—',
          },
        ],
        insight: up
          ? `Your active user base grew ${pctStr} to ${current.unique_users.toLocaleString()} — ${current.new_users} new, ${current.returning_users} returning, ${current.resurrected_users} resurrected. The mix tells you whether growth is acquisition or retention.`
          : down
            ? `Active users are down ${pctStr} to ${current.unique_users.toLocaleString()}. With ${current.new_users} new and ${current.returning_users} returning this period, the ratio points to ${current.new_users > current.returning_users ? 'a retention' : 'an acquisition'} problem.`
            : `Audience size is stable at ${current.unique_users.toLocaleString()}.`,
      }

    case 'wau':
      return {
        title: 'Weekly Active Users',
        what: 'Distinct users active in the last 7 days of the selected period. WAU is the sweet spot between the noise of DAU and the slow signal of MAU — ideal for tracking weekly engagement trends and campaign impact.',
        snapshot: [
          {
            label: curLabel,
            value: fmt('wau', current.wau),
          },
          {
            label: prevLabel,
            value: previous.wau != null ? fmt('wau', previous.wau) : '—',
            sub: pctStr + ' vs. prior period',
          },
          {
            label: 'WAU / MAU',
            value:
              current.unique_users > 0
                ? ((current.wau / current.unique_users) * 100).toFixed(0) + '%'
                : '—',
            sub: 'weekly reach of monthly base',
          },
        ],
        insight: (() => {
          const wauShare =
            current.unique_users > 0
              ? `${((current.wau / current.unique_users) * 100).toFixed(0)}%`
              : '—'
          if (up)
            return `Weekly active users grew ${pctStr} to ${current.wau.toLocaleString()} — ${wauShare} of your total active base showed up in the last 7 days. Rising WAU ahead of MAU often means engagement is accelerating.`
          if (down)
            return `Weekly active users fell ${pctStr} to ${current.wau.toLocaleString()} (${wauShare} of your monthly base). If MAU is steady, your users are visiting less frequently.`
          return `Weekly activity is stable at ${current.wau.toLocaleString()} (${wauShare} of the monthly base).`
        })(),
      }

    case 'total_sessions':
      return {
        title: 'Sessions',
        what: 'A session is a continuous block of activity — events grouped closely in time, separated by an inactivity gap. More sessions means more frequent visits, which is almost always a good sign.',
        snapshot: [
          {
            label: curLabel,
            value: fmt('total_sessions', current.total_sessions),
            sub: `${current.unique_users > 0 ? (current.total_sessions / current.unique_users).toFixed(1) : '—'} sessions / user`,
          },
          {
            label: prevLabel,
            value:
              previous.total_sessions != null
                ? fmt('total_sessions', previous.total_sessions)
                : '—',
            sub: pctStr + ' vs. prior period',
          },
          {
            label: 'Avg duration',
            value: fmt('avg_session_duration_sec', current.avg_session_duration_sec),
          },
        ],
        insight: (() => {
          const perUser =
            current.unique_users > 0
              ? (current.total_sessions / current.unique_users).toFixed(1)
              : '—'
          if (up)
            return `Sessions are up ${pctStr} — that's ${perUser} sessions per active user, a strong habit-formation signal.`
          if (down)
            return `Sessions dropped ${pctStr} to ${perUser} per active user. If unique users are stable, people are coming back less often; if both dropped, it's a broader engagement issue.`
          return `Session count is stable at ${perUser} per active user.`
        })(),
        benchmark:
          'Sessions are grouped events separated by an inactivity gap (the timeout is configurable per connection). A user-level filter scopes which users are counted, but each session includes all of that user’s events.',
      }

    case 'avg_session_duration_sec':
      return {
        title: 'Avg Session Duration',
        what: 'How long the average session lasts, from first to last event. Longer sessions usually mean deeper engagement — but for focused utility apps, short and efficient sessions can be a sign of success, not disengagement.',
        snapshot: [
          {
            label: curLabel,
            value: fmt('avg_session_duration_sec', current.avg_session_duration_sec),
          },
          {
            label: prevLabel,
            value:
              previous.avg_session_duration_sec != null
                ? fmt('avg_session_duration_sec', previous.avg_session_duration_sec)
                : '—',
            sub: pctStr + ' vs. prior period',
          },
          {
            label: 'Events per session',
            value: fmt('avg_events_per_session', current.avg_events_per_session),
          },
        ],
        insight: (() => {
          const dur = fmt('avg_session_duration_sec', current.avg_session_duration_sec)
          const depth = fmt('avg_events_per_session', current.avg_events_per_session)
          if (up)
            return `Sessions are ${pctStr} longer — averaging ${dur} across ${depth} events. Dig into which flows drive the longest sessions.`
          if (down)
            return `Sessions are ${pctStr} shorter (${dur}, ${depth} events). Check whether users are completing their goal faster (good) or abandoning earlier (bad).`
          return `Session length is steady at ${dur} (${depth} events per session).`
        })(),
      }

    case 'avg_events_per_session':
      return {
        title: 'Events per Session',
        what: 'How much users do in a single visit. A high number means users are exploring multiple features. A very low number may indicate friction, poor discoverability, or a narrow use case.',
        snapshot: [
          {
            label: curLabel,
            value: fmt('avg_events_per_session', current.avg_events_per_session),
          },
          {
            label: prevLabel,
            value:
              previous.avg_events_per_session != null
                ? fmt('avg_events_per_session', previous.avg_events_per_session)
                : '—',
            sub: pctStr + ' vs. prior period',
          },
          {
            label: 'Total events',
            value: fmt('total_events', current.total_events),
          },
        ],
        insight: up
          ? `Users are doing ${pctStr} more per session — ${fmt('avg_events_per_session', current.avg_events_per_session)} events per visit on average. Rising depth is a strong engagement signal.`
          : down
            ? `Users are doing ${pctStr} less per session (${fmt('avg_events_per_session', current.avg_events_per_session)} events). Cross-reference with session duration — if both dropped, engagement is thinning.`
            : `Interaction depth is stable at ${fmt('avg_events_per_session', current.avg_events_per_session)} events per session.`,
      }

    case 'avg_active_days':
      return {
        title: 'Avg Active Days',
        what: 'How many different days the average user was active during this period. A rising number means users are building a habit. Flat or falling means engagement is shallow or sporadic.',
        snapshot: [
          {
            label: curLabel,
            value: fmt('avg_active_days', current.avg_active_days) + ' days',
          },
          {
            label: prevLabel,
            value:
              previous.avg_active_days != null
                ? fmt('avg_active_days', previous.avg_active_days) + ' days'
                : '—',
            sub: pctStr + ' vs. prior period',
          },
          {
            label: 'Power users',
            value: String(current.power_users),
            sub: 'highest activity tier',
          },
        ],
        insight: up
          ? `Users are returning ${pctStr} more days on average — the typical user showed up on ${fmt('avg_active_days', current.avg_active_days)} distinct days this period. Habit formation is strengthening.`
          : down
            ? `Average active days fell ${pctStr} to ${fmt('avg_active_days', current.avg_active_days)}. Users are dipping in less regularly — check if this correlates with a drop in new users (who naturally have lower active days).`
            : `Return frequency is stable at ${fmt('avg_active_days', current.avg_active_days)} days per user.`,
        benchmark: 'Only counts users who were active at least once during the period.',
      }

    case 'power_users':
      return {
        title: 'Power Users',
        what: "Your most engaged users — those who hit the activity threshold that defines 'power use' for your product. Power users drive word-of-mouth, provide the best feedback, and are the least likely to churn. Growing this cohort is one of the clearest signs of product-market fit.",
        snapshot: [
          {
            label: curLabel,
            value: String(current.power_users),
            sub:
              current.unique_users > 0
                ? ((current.power_users / current.unique_users) * 100).toFixed(1) +
                  '% of active users'
                : '',
          },
          {
            label: prevLabel,
            value: previous.power_users != null ? String(previous.power_users) : '—',
            sub: pctStr + ' vs. prior period',
          },
          {
            label: 'Regular users',
            value: String(current.unique_users - current.power_users),
          },
        ],
        insight: up
          ? `Power users grew ${pctStr} — ${current.power_users.toLocaleString()} users (${shareOfActives(current.power_users)} of actives) hit the activity threshold this period. That's your strongest cohort getting bigger.`
          : down
            ? `Power users fell ${pctStr} to ${current.power_users.toLocaleString()} (${shareOfActives(current.power_users)} of actives). If overall unique users are stable, some highly engaged users dropped a tier.`
            : `Power user count is stable at ${current.power_users.toLocaleString()} (${shareOfActives(current.power_users)} of actives).`,
        benchmark:
          'A user is "power" when their distinct active-days in the period meet the threshold configured on the connection.',
      }

    case 'new_users':
      return {
        title: 'New Users',
        what: 'People using your product for the very first time — ever. A user is "new" if this period contains their earliest recorded event in your entire history. Growing new users means your acquisition is working.',
        snapshot: [
          {
            label: curLabel,
            value: String(current.new_users),
            sub:
              current.unique_users > 0
                ? ((current.new_users / current.unique_users) * 100).toFixed(1) +
                  '% of active users'
                : '',
          },
          {
            label: prevLabel,
            value: previous.new_users != null ? String(previous.new_users) : '—',
            sub: pctStr + ' vs. prior period',
          },
          {
            label: 'Of total actives',
            value: String(current.unique_users),
            sub: `${current.returning_users} returning · ${current.resurrected_users} resurrected`,
          },
        ],
        insight: up
          ? `New user acquisition is up ${pctStr} — ${current.new_users.toLocaleString()} first-timers this period (${shareOfActives(current.new_users)} of actives). Pair with retention rate to check if they stick.`
          : down
            ? `New users dropped ${pctStr} to ${current.new_users.toLocaleString()} (${shareOfActives(current.new_users)} of actives). Check your acquisition channels — marketing spend, seasonality, or a referral drop.`
            : `New user volume is stable at ${current.new_users.toLocaleString()} (${shareOfActives(current.new_users)} of actives).`,
        benchmark:
          'Newness is checked against all historical data — a user is new only once, at their very first event.',
      }

    case 'returning_users':
      return {
        title: 'Returning Users',
        what: 'Users who were active before and came back within a normal gap. These are your regulars — the core of a healthy, retained user base. A high proportion of returning users means your product has earned repeat visits.',
        snapshot: [
          {
            label: curLabel,
            value: String(current.returning_users),
            sub:
              current.unique_users > 0
                ? ((current.returning_users / current.unique_users) * 100).toFixed(1) +
                  '% of active users'
                : '',
          },
          {
            label: prevLabel,
            value: previous.returning_users != null ? String(previous.returning_users) : '—',
            sub: pctStr + ' vs. prior period',
          },
          {
            label: 'New + resurrected',
            value: String(current.new_users + current.resurrected_users),
            sub: 'first-time or reactivated',
          },
        ],
        insight: up
          ? `Returning users grew ${pctStr} — ${current.returning_users.toLocaleString()} regulars this period (${shareOfActives(current.returning_users)} of actives). Your existing base is staying active, a direct retention-health signal.`
          : down
            ? `Returning users fell ${pctStr} to ${current.returning_users.toLocaleString()} (${shareOfActives(current.returning_users)} of actives). A retention signal — users are not coming back as consistently.`
            : `Returning user volume is stable at ${current.returning_users.toLocaleString()} (${shareOfActives(current.returning_users)} of actives).`,
        benchmark:
          'A user is "returning" when their last activity before this period falls within the resurrection window (configurable per connection; 30 days by default).',
      }

    case 'resurrected_users':
      return {
        title: 'Resurrected Users',
        what: 'Users who went quiet for a long time and then came back. Re-engagement campaigns, product updates, or word-of-mouth can all drive resurrection. Worth investigating what brought them back — it often reveals your strongest re-activation lever.',
        snapshot: [
          {
            label: curLabel,
            value: String(current.resurrected_users),
            sub:
              current.unique_users > 0
                ? ((current.resurrected_users / current.unique_users) * 100).toFixed(1) +
                  '% of active users'
                : '',
          },
          {
            label: prevLabel,
            value: previous.resurrected_users != null ? String(previous.resurrected_users) : '—',
            sub: pctStr + ' vs. prior period',
          },
          {
            label: 'Churned (this period)',
            value: String(current.churned_users),
          },
        ],
        insight: up
          ? `Resurrections are up ${pctStr} — ${current.resurrected_users.toLocaleString()} lapsed users came back (${shareOfActives(current.resurrected_users)} of actives). Check whether a campaign, update, or external mention coincides with this period.`
          : down
            ? `Resurrections fell ${pctStr} to ${current.resurrected_users.toLocaleString()} (${shareOfActives(current.resurrected_users)} of actives). Worth investigating if you ran re-engagement work; otherwise it may reflect a smaller pool of dormant users.`
            : `Resurrection volume is stable at ${current.resurrected_users.toLocaleString()} (${shareOfActives(current.resurrected_users)} of actives).`,
        benchmark:
          'A user is resurrected if the gap since their last activity exceeds the resurrection window (configurable in connection settings).',
      }

    case 'churned_users':
      return {
        title: 'Churned Users',
        what: 'Users who were active last period but did not show up this period. Churn is a lagging signal — by the time it appears, the user has already disengaged. Keeping this number low is one of the clearest signs of product-market fit.',
        snapshot: [
          {
            label: curLabel,
            value: String(current.churned_users),
            sub:
              previous.unique_users != null && previous.unique_users > 0
                ? ((current.churned_users / previous.unique_users) * 100).toFixed(1) +
                  '% of prior actives lost'
                : '',
          },
          {
            label: prevLabel,
            value: previous.churned_users != null ? String(previous.churned_users) : '—',
            sub: pctStr + ' vs. prior period',
          },
          {
            label: 'Net change',
            value: (() => {
              const net = current.new_users + current.resurrected_users - current.churned_users
              return (net >= 0 ? '+' : '') + String(net)
            })(),
            sub: 'new + resurrected − churned',
          },
        ],
        insight: (() => {
          const netStr = `${netChange >= 0 ? '+' : ''}${netChange}`
          if (down)
            return `Churn dropped ${pctStr} — ${current.churned_users.toLocaleString()} users didn't return, against ${current.new_users + current.resurrected_users} new + resurrected (net ${netStr}). One of the highest-impact improvements you can make.`
          if (up)
            return `Churn rose ${pctStr} to ${current.churned_users.toLocaleString()} — net change ${netStr} after new + resurrected. Look at what changed in the prior period: feature removal, price change, or competitor move.`
          return `Churn is stable at ${current.churned_users.toLocaleString()} (net ${netStr} after new + resurrected).`
        })(),
        benchmark: 'Compared against the equivalent preceding period of the same length.',
      }

    case 'retention_rate': {
      const retained = breakdown?.retained_count
      const prevUniq = breakdown?.prev_unique_users
      const rate = current.retention_rate
      const rateLabel =
        rate >= 40
          ? 'strong'
          : rate >= 25
            ? 'healthy'
            : rate >= 15
              ? 'below average'
              : 'needs attention'
      return {
        title: 'Retention Rate',
        what: "The percentage of last period's active users who returned this period. This is the most important metric for sustainable growth — you can't grow a leaky bucket. Even a 5 percentage point improvement compounds dramatically over time.",
        snapshot: [
          {
            label: 'Retention rate',
            value: fmt('retention_rate', rate),
            sub: rateLabel,
          },
          {
            label: 'Came back',
            value: retained != null ? String(retained) : '—',
            sub: prevUniq != null ? `of ${prevUniq} prior actives` : '',
          },
          {
            label: prevLabel,
            value:
              previous.retention_rate != null
                ? fmt('retention_rate', previous.retention_rate)
                : '—',
            sub: pctStr + ' vs. prior period',
          },
        ],
        insight: (() => {
          const outOfTen = Math.round(rate * 10)
          if (up)
            return `Retention improved ${pctStr} — roughly ${outOfTen} of every 10 prior-period users came back. Even a +5pp improvement here compounds into dramatic long-term user-base growth.`
          if (down)
            return `Retention dropped ${pctStr} — only ${outOfTen} of every 10 prior-period users returned. Dig into the churned cohort: new users failing to activate, or established users disengaging?`
          return `Retention is holding steady — ${outOfTen} of every 10 prior-period users came back.`
        })(),
        benchmark: '>25% monthly is decent · >40% is strong for most consumer products',
      }
    }

    case 'dau_mau_ratio': {
      const ratio = current.dau_mau_ratio
      const ratioLabel =
        ratio >= 0.5 ? 'excellent' : ratio >= 0.3 ? 'strong' : ratio >= 0.2 ? 'typical' : 'low'
      return {
        title: 'DAU / MAU',
        what: 'How often monthly users return on a daily basis — a direct measure of product stickiness. Both DAU and MAU are computed over the same trailing 30-day window ending on the last day of the selected period, so the ratio is always between 0 and 1. A ratio of 0.50 means users are active every other day on average.',
        snapshot: [
          {
            label: 'Stickiness',
            value: fmt('dau_mau_ratio', ratio),
            sub: ratioLabel,
          },
          {
            label: 'Avg daily actives (DAU)',
            value: breakdown?.avg_dau != null ? String(breakdown.avg_dau) : '—',
            sub: 'trailing 30-day window',
          },
          {
            label: 'Monthly actives (MAU)',
            value: breakdown?.mau_30d != null ? String(breakdown.mau_30d) : '—',
            sub:
              prevLabel +
              ': ' +
              (previous.dau_mau_ratio != null ? fmt('dau_mau_ratio', previous.dau_mau_ratio) : '—'),
          },
        ],
        insight: (() => {
          const daysOf30 = Math.round(ratio * 30)
          if (up)
            return `Stickiness improved ${pctStr} — at ${fmt('dau_mau_ratio', ratio)}, the average monthly user is now active roughly ${daysOf30} of every 30 days. Your product is becoming a daily habit.`
          if (down)
            return `Stickiness dropped ${pctStr} to ${fmt('dau_mau_ratio', ratio)} — the avg monthly user comes back ~${daysOf30} of 30 days. Cross-reference with avg active days and session trends.`
          return `Stickiness is stable at ${fmt('dau_mau_ratio', ratio)} — the avg monthly user is active ~${daysOf30} of every 30 days.`
        })(),
        benchmark:
          '~20% is typical · ~50% is excellent (WhatsApp-level) · Both DAU and MAU use the same rolling 30-day window',
      }
    }

    default:
      return {
        title: key,
        what: '',
        snapshot: [],
        insight: '',
      }
  }
}

interface LearnPanelProps {
  metricKey: TrendMetric
  label: string
  currentMetrics: MissionControlMetrics | undefined
  previousMetrics: MissionControlMetricsNullable | undefined
  pctChange: number | null
  onClose: () => void
  breakdown?: MetricBreakdown
  currentRange?: string
  previousRange?: string
}

export const LearnPanel = memo(function LearnPanel({
  metricKey,
  label,
  currentMetrics,
  previousMetrics,
  pctChange,
  onClose,
  breakdown,
  currentRange,
  previousRange,
}: LearnPanelProps) {
  if (!currentMetrics) return null

  const content = buildLearnContent(
    metricKey,
    currentMetrics,
    previousMetrics ?? {},
    pctChange,
    breakdown,
    currentRange,
    previousRange
  )

  const up = pctChange !== null && pctChange > 0
  const down = pctChange !== null && pctChange < 0

  return (
    <div role="complementary" aria-label={`Learn about ${label}`} className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{content.title}</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close learn panel"
          className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* What it is */}
        <p className="text-xs text-muted-foreground leading-relaxed">{content.what}</p>

        {/* Your numbers */}
        {content.snapshot.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Your numbers
            </p>
            <div className="bg-muted/40 rounded-xl p-3 space-y-3">
              {content.snapshot.map((item, i) => (
                <div key={i} className={cn(i > 0 && 'border-t border-border/50 pt-3')}>
                  <div className="text-[10px] text-muted-foreground mb-0.5">{item.label}</div>
                  <div className="text-base font-bold tracking-tight">{item.value}</div>
                  {item.sub && (
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">{item.sub}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trend indicator */}
        {pctChange !== null && (
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-xl p-3 text-xs',
              up && 'bg-success/10 text-success',
              down && 'bg-destructive/10 text-destructive',
              !up && !down && 'bg-muted/40 text-muted-foreground'
            )}
          >
            <div className="mt-0.5 flex-shrink-0">
              {up ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : down ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
            </div>
            <p className="leading-relaxed">{content.insight}</p>
          </div>
        )}

        {/* Benchmark */}
        {content.benchmark && (
          <p className="text-[10px] text-muted-foreground/60 italic leading-relaxed">
            {content.benchmark}
          </p>
        )}
      </div>
    </div>
  )
})
