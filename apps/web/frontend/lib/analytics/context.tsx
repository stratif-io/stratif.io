import { createContext } from 'react'
import type { AnalyticsAdapter } from './types'

const noop: AnalyticsAdapter = {
  track: () => {},
  page: () => {},
}

export const AnalyticsContext = createContext<AnalyticsAdapter>(noop)
