import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { WebSocketClient, createWebSocketClient } from '@/lib/websocket/client'
import type { ConnectionStatus, EventType, WebSocketMessage } from '@/lib/websocket/types'

interface WebSocketContextValue {
  status: ConnectionStatus
  lastMessage: WebSocketMessage | null
  subscribe: (event: EventType, callback: (data: unknown) => void) => string
  unsubscribe: (subscriptionId: string) => void
  send: <T = unknown>(message: WebSocketMessage<T>) => void
  connect: () => void
  disconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

interface WebSocketProviderProps {
  children: ReactNode
  autoConnect?: boolean
}

export function WebSocketProvider({ children, autoConnect = true }: WebSocketProviderProps) {
  const clientRef = useRef<WebSocketClient | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const shouldConnect = autoConnect && import.meta.env.VITE_WEBSOCKET_ENABLED !== 'false'

  useEffect(() => {
    if (!shouldConnect) return

    if (!clientRef.current) {
      clientRef.current = createWebSocketClient()
    }

    const client = clientRef.current

    client.on('onStatusChange', setStatus)
    client.on('onMessage', setLastMessage)
    client.connect()

    return () => {
      client.off('onStatusChange')
      client.off('onMessage')
      client.disconnect()
    }
  }, [shouldConnect])

  const subscribe = (event: EventType, callback: (data: unknown) => void): string => {
    if (!clientRef.current) return ''
    return clientRef.current.subscribe(event, callback)
  }

  const unsubscribe = (subscriptionId: string): void => {
    clientRef.current?.unsubscribe(subscriptionId)
  }

  const send = <T = unknown,>(message: WebSocketMessage<T>): void => {
    clientRef.current?.send(message)
  }

  const connect = (): void => {
    clientRef.current?.connect()
  }

  const disconnect = (): void => {
    clientRef.current?.disconnect()
  }

  const value: WebSocketContextValue = {
    status,
    lastMessage,
    subscribe,
    unsubscribe,
    send,
    connect,
    disconnect,
  }

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext)

  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }

  return context
}
