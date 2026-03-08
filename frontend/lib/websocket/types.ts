export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export type EventType =
  | 'event_count'
  | 'active_users'
  | 'conversion_update'
  | 'session_start'
  | 'session_end'
  | 'page_view'
  | 'custom_event'

export interface WebSocketMessage<T = unknown> {
  type: 'data' | 'ping' | 'pong' | 'subscribe' | 'unsubscribe' | 'error' | 'connected'
  event?: EventType
  payload?: T
  timestamp?: string
  subscriptionId?: string
}

export interface Subscription {
  id: string
  event: EventType
  callback: (data: unknown) => void
}

export interface SubscriptionRequest {
  type: 'subscribe'
  event: EventType
  subscriptionId: string
}

export interface UnsubscriptionRequest {
  type: 'unsubscribe'
  subscriptionId: string
}

export interface EventCountPayload {
  total: number
  today: number
  change: number
}

export interface ActiveUsersPayload {
  count: number
  users: Array<{
    id: string
    lastActive: string
    page: string
  }>
}

export interface ConversionUpdatePayload {
  conversionRate: number
  totalConverted: number
  change: number
}

export interface RealtimeMetrics {
  eventCount: EventCountPayload | null
  activeUsers: ActiveUsersPayload | null
  conversionUpdate: ConversionUpdatePayload | null
}

export interface WebSocketOptions {
  url: string
  reconnectAttempts?: number
  reconnectInterval?: number
  heartbeatInterval?: number
  maxQueueSize?: number
}

export interface WebSocketClientEvents {
  onOpen: () => void
  onClose: () => void
  onError: (error: Event) => void
  onMessage: (message: WebSocketMessage) => void
  onStatusChange: (status: ConnectionStatus) => void
}
