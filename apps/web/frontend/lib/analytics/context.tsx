import { createContext, type ReactNode } from 'react'
import type { AnalyticsAdapter } from './types'

const noop: AnalyticsAdapter = {
  track: () => {},
  page: () => {},
}

// eslint-disable-next-line react-refresh/only-export-components
export const AnalyticsContext = createContext<AnalyticsAdapter>(noop)

interface AnalyticsProviderProps {
  adapter?: AnalyticsAdapter
  children: ReactNode
}

export function AnalyticsProvider({ adapter = noop, children }: AnalyticsProviderProps) {
  return <AnalyticsContext.Provider value={adapter}>{children}</AnalyticsContext.Provider>
}
