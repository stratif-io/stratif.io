import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  EventCountPayload,
  ActiveUsersPayload,
  ConversionUpdatePayload,
  RealtimeMetrics,
} from '@/lib/websocket/types'
import type { UseWebSocketReturn } from './use-websocket'

export interface UseRealtimeMetricsReturn {
  metrics: RealtimeMetrics
  isLoading: boolean
  error: string | null
}

export function useRealtimeMetrics(websocket: UseWebSocketReturn): UseRealtimeMetricsReturn {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    eventCount: null,
    activeUsers: null,
    conversionUpdate: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const subscriptionsRef = useRef<string[]>([])

  const handleEventCount = useCallback((data: unknown) => {
    setMetrics((prev) => ({ ...prev, eventCount: data as EventCountPayload }))
    setIsLoading(false)
  }, [])

  const handleActiveUsers = useCallback((data: unknown) => {
    setMetrics((prev) => ({ ...prev, activeUsers: data as ActiveUsersPayload }))
    setIsLoading(false)
  }, [])

  const handleConversionUpdate = useCallback((data: unknown) => {
    setMetrics((prev) => ({ ...prev, conversionUpdate: data as ConversionUpdatePayload }))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (websocket.status === 'error') {
      setError('WebSocket connection error')
      setIsLoading(false)
      return
    }

    if (websocket.status !== 'connected') {
      return
    }

    setError(null)
    setIsLoading(true)

    const sub1 = websocket.subscribe('event_count', handleEventCount)
    const sub2 = websocket.subscribe('active_users', handleActiveUsers)
    const sub3 = websocket.subscribe('conversion_update', handleConversionUpdate)

    subscriptionsRef.current = [sub1, sub2, sub3]

    return () => {
      subscriptionsRef.current.forEach((subId) => {
        if (subId) {
          websocket.unsubscribe(subId)
        }
      })
      subscriptionsRef.current = []
    }
  }, [
    websocket.status,
    websocket.subscribe,
    websocket.unsubscribe,
    handleEventCount,
    handleActiveUsers,
    handleConversionUpdate,
  ])

  return {
    metrics,
    isLoading,
    error,
  }
}
