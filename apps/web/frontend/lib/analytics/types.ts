export interface AnalyticsAdapter {
  track(event: string, props?: Record<string, string | number | boolean>): void
  page(path: string): void
}
