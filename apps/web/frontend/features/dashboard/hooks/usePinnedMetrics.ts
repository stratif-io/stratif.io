import { useState, useCallback } from 'react'

type MetricKey = string

const DEFAULT_PINNED: MetricKey[] = [
  'total_events',
  'unique_users',
  'total_sessions',
  'avg_session_duration_sec',
  'avg_events_per_session',
  'new_users',
  'returning_users',
  'dau_mau_ratio',
]

function storageKey(connectionId: string) {
  return `stratifio_pinned_metrics_${connectionId}`
}

export function usePinnedMetrics(connectionId: string | null) {
  const [pinned, setPinned] = useState<MetricKey[]>(() => {
    if (!connectionId) return DEFAULT_PINNED
    try {
      const raw = localStorage.getItem(storageKey(connectionId))
      return raw ? (JSON.parse(raw) as MetricKey[]) : DEFAULT_PINNED
    } catch {
      return DEFAULT_PINNED
    }
  })

  const togglePin = useCallback(
    (key: MetricKey) => {
      setPinned((prev) => {
        const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        if (connectionId) {
          localStorage.setItem(storageKey(connectionId), JSON.stringify(next))
        }
        return next
      })
    },
    [connectionId]
  )

  const isPinned = useCallback((key: MetricKey) => pinned.includes(key), [pinned])

  return { pinned, togglePin, isPinned }
}
