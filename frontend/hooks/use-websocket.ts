import { useCallback, useEffect, useRef, useState } from 'react'
import { WebSocketClient, createWebSocketClient } from '@/lib/websocket/client'
import type { ConnectionStatus, EventType, WebSocketMessage } from '@/lib/websocket/types'

export interface UseWebSocketReturn {
  status: ConnectionStatus
  lastMessage: WebSocketMessage | null
  subscribe: (event: EventType, callback: (data: unknown) => void) => string
  unsubscribe: (subscriptionId: string) => void
  send: <T = unknown>(message: WebSocketMessage<T>) => void
  connect: () => void
  disconnect: () => void
}

export function useWebSocket(autoConnect = true): UseWebSocketReturn {
  const clientRef = useRef<WebSocketClient | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)

  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = createWebSocketClient()
    }

    const client = clientRef.current

    client.on('onStatusChange', setStatus)
    client.on('onMessage', setLastMessage)

    if (autoConnect) {
      client.connect()
    }

    return () => {
      client.off('onStatusChange')
      client.off('onMessage')
    }
  }, [autoConnect])

  const subscribe = useCallback((event: EventType, callback: (data: unknown) => void): string => {
    if (!clientRef.current) {
      console.warn('WebSocket client not initialized')
      return ''
    }
    return clientRef.current.subscribe(event, callback)
  }, [])

  const unsubscribe = useCallback((subscriptionId: string): void => {
    clientRef.current?.unsubscribe(subscriptionId)
  }, [])

  const send = useCallback(<T = unknown>(message: WebSocketMessage<T>): void => {
    clientRef.current?.send(message)
  }, [])

  const connect = useCallback((): void => {
    clientRef.current?.connect()
  }, [])

  const disconnect = useCallback((): void => {
    clientRef.current?.disconnect()
  }, [])

  return {
    status,
    lastMessage,
    subscribe,
    unsubscribe,
    send,
    connect,
    disconnect,
  }
}
