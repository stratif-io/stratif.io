import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/semaphore', () => ({
  fetchWithSemaphore: vi.fn(),
  initSemaphore: vi.fn(),
}))

import {
  fetchPathAnalysis,
  fetchMissionControlMetric,
  fetchMissionControlTrend,
  fetchMissionControl,
} from '@/lib/api/queries'
import { fetchWithSemaphore } from '@/lib/api/semaphore'

const mockResponse = {
  ok: true,
  status: 200,
  headers: { get: () => null },
  json: async () => ({ data: [], total_paths: 0 }),
}

describe('fetchPathAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchWithSemaphore).mockResolvedValue(mockResponse as unknown as Response)
  })

  it('calls the path-analysis endpoint', async () => {
    await fetchPathAnalysis({})
    const calledUrl = vi.mocked(fetchWithSemaphore).mock.calls[0][0] as string
    expect(calledUrl).toContain('/api/path-analysis')
  })

  it('does not include counting_mode param', async () => {
    await fetchPathAnalysis({})
    const calledUrl = vi.mocked(fetchWithSemaphore).mock.calls[0][0] as string
    expect(calledUrl).not.toContain('counting_mode')
  })
})

describe('mission-control fetchers forward task opts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchWithSemaphore).mockResolvedValue(mockResponse as unknown as Response)
  })

  it('fetchMissionControlMetric passes groupKey, timeoutMs, meta through to fetchWithSemaphore', async () => {
    await fetchMissionControlMetric(
      { metric: 'total_events', connection_id: 'c1' },
      {
        groupKey: 'mc:total_events',
        timeoutMs: 12000,
        meta: { cardName: 'Total Events', querySnippet: 'snippet' },
      }
    )
    const opts = vi.mocked(fetchWithSemaphore).mock.calls[0][2]
    expect(opts).toMatchObject({
      groupKey: 'mc:total_events',
      timeoutMs: 12000,
      meta: { cardName: 'Total Events', querySnippet: 'snippet' },
    })
  })

  it('fetchMissionControlTrend passes task opts through', async () => {
    await fetchMissionControlTrend(
      { metric: 'wau' },
      { groupKey: 'mc:wau', timeoutMs: 5000, meta: { cardName: 'WAU', querySnippet: 's' } }
    )
    const opts = vi.mocked(fetchWithSemaphore).mock.calls[0][2]
    expect(opts?.groupKey).toBe('mc:wau')
    expect(opts?.timeoutMs).toBe(5000)
    expect(opts?.meta?.cardName).toBe('WAU')
  })

  it('fetchMissionControl passes task opts through', async () => {
    await fetchMissionControl(
      { start_date: '2024-01-01', end_date: '2024-01-31' },
      { groupKey: 'mc:all', timeoutMs: 9000, meta: { cardName: 'Overview', querySnippet: 's' } }
    )
    const opts = vi.mocked(fetchWithSemaphore).mock.calls[0][2]
    expect(opts?.groupKey).toBe('mc:all')
    expect(opts?.timeoutMs).toBe(9000)
  })
})
