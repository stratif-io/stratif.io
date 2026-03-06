import type {
  ConnectionStatus,
  EventType,
  Subscription,
  WebSocketMessage,
  WebSocketOptions,
  WebSocketClientEvents,
} from './types'

const DEFAULT_OPTIONS: Required<Omit<WebSocketOptions, 'url'>> = {
  reconnectAttempts: 5,
  reconnectInterval: 1000,
  heartbeatInterval: 30000,
  maxQueueSize: 100,
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private options: Required<Omit<WebSocketOptions, 'url'>>
  private status: ConnectionStatus = 'disconnected'
  private subscriptions: Map<string, Subscription> = new Map()
  private messageQueue: WebSocketMessage[] = []
  private reconnectAttempts = 0
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimeout: ReturnType<typeof setInterval> | null = null
  private pongReceived = false
  private events: Partial<WebSocketClientEvents> = {}

  constructor(options: WebSocketOptions) {
    this.url = options.url
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  on<K extends keyof WebSocketClientEvents>(event: K, callback: WebSocketClientEvents[K]): void {
    this.events[event] = callback
  }

  off<K extends keyof WebSocketClientEvents>(event: K): void {
    delete this.events[event]
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return
    }

    this.setStatus('connecting')

    try {
      this.ws = new WebSocket(this.url)
      this.setupEventHandlers()
    } catch (error) {
      this.setStatus('error')
      this.events.onError?.(error as Event)
      this.attemptReconnect()
    }
  }

  disconnect(): void {
    this.cleanup()
    this.setStatus('disconnected')
  }

  subscribe(event: EventType, callback: (data: unknown) => void): string {
    const subscriptionId = this.generateId()
    const subscription: Subscription = { id: subscriptionId, event, callback }
    this.subscriptions.set(subscriptionId, subscription)

    const message: WebSocketMessage = {
      type: 'subscribe',
      event,
      subscriptionId,
    }
    this.send(message)

    return subscriptionId
  }

  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId)

    const message: WebSocketMessage = {
      type: 'unsubscribe',
      subscriptionId,
    }
    this.send(message)
  }

  send<T = unknown>(message: WebSocketMessage<T>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      if (this.messageQueue.length < this.options.maxQueueSize) {
        this.messageQueue.push(message)
      }
    }
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  private setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.setStatus('connected')
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this.flushQueue()
      this.events.onOpen?.()
    }

    this.ws.onclose = () => {
      this.stopHeartbeat()
      this.events.onClose?.()

      if (this.status !== 'disconnected') {
        this.attemptReconnect()
      }
    }

    this.ws.onerror = (error) => {
      this.setStatus('error')
      this.events.onError?.(error)
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        this.handleMessage(message)
      } catch {
        console.error('Failed to parse WebSocket message')
      }
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    if (message.type === 'pong') {
      this.pongReceived = true
      return
    }

    if (message.type === 'ping') {
      this.send({ type: 'pong' })
      return
    }

    this.events.onMessage?.(message)

    if (message.type === 'data' && message.event) {
      this.subscriptions.forEach((sub) => {
        if (sub.event === message.event) {
          sub.callback(message.payload)
        }
      })
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status
    this.events.onStatusChange?.(status)
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.options.reconnectAttempts) {
      this.setStatus('error')
      return
    }

    this.setStatus('connecting')
    this.reconnectAttempts++

    const delay = this.options.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1)

    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.pongReceived = true

    this.heartbeatTimeout = setInterval(() => {
      if (!this.pongReceived) {
        this.ws?.close()
        return
      }

      this.pongReceived = false
      this.send({ type: 'ping' })
    }, this.options.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimeout) {
      clearInterval(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()
      if (message) {
        this.ws.send(JSON.stringify(message))
      }
    }
  }

  private cleanup(): void {
    this.stopHeartbeat()

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.onopen = null
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.onmessage = null
      this.ws.close()
      this.ws = null
    }

    this.subscriptions.clear()
    this.messageQueue = []
    this.reconnectAttempts = 0
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}

export const createWebSocketClient = (url?: string): WebSocketClient => {
  const wsUrl = url || import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`
  return new WebSocketClient({ url: wsUrl })
}
