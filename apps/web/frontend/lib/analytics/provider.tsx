import { type ReactNode } from 'react'
import { AnalyticsContext } from './context'
import type { AnalyticsAdapter } from './types'

const noop: AnalyticsAdapter = {
  track: () => {},
  page: () => {},
}

interface AnalyticsProviderProps {
  adapter?: AnalyticsAdapter
  children: ReactNode
}

export function AnalyticsProvider({ adapter = noop, children }: AnalyticsProviderProps) {
  return <AnalyticsContext.Provider value={adapter}>{children}</AnalyticsContext.Provider>
}
