// Re-export design system for consumers who depend on @stratif-io/analytics as a lib
export * from '@stratif-io/design-system'

// Analytics-specific exports
export { RootLayout } from './App'
export type { AnalyticsAdapter } from './lib/analytics'
export { AnalyticsProvider, useAnalytics } from './lib/analytics'
