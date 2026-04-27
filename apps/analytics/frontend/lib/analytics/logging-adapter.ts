import type { AnalyticsAdapter } from './types'

export const loggingAdapter: AnalyticsAdapter = {
  track(event, props) {
    console.log('[analytics] track:', event, props ?? {})
  },
  page(path) {
    console.log('[analytics] page:', path)
  },
}
