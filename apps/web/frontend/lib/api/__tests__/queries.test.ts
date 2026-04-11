import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/semaphore', () => ({
  fetchWithSemaphore: vi.fn(),
  initSemaphore: vi.fn(),
}))

import { fetchPathAnalysis } from '@/lib/api/queries'
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
