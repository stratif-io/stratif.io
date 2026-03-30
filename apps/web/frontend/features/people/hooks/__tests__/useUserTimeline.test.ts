import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useUserTimeline } from '../useUserTimeline'
import * as api from '@/lib/api'

vi.mock('@/lib/api')
vi.mock('@/stores', () => ({
  useAppStore: vi.fn(() => ({
    activeConnectionId: 'conn-1',
  })),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client: qc }, children)
}

describe('useUserTimeline', () => {
  it('returns events for the given user', async () => {
    vi.mocked(api.fetchUserEvents).mockResolvedValue({
      user_id: 'user-1',
      data: [
        {
          user_id: 'user-1',
          event_name: 'page_view',
          timestamp: '2026-01-15T10:00:00',
          properties: {},
        },
        {
          user_id: 'user-1',
          event_name: 'signup',
          timestamp: '2026-01-15T10:05:00',
          properties: {},
        },
      ],
    })

    const { result } = renderHook(() => useUserTimeline('user-1'), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.events).toHaveLength(2)
    expect(result.current.events[0].event_name).toBe('page_view')
  })

  it('returns empty events when userId is null', async () => {
    const fetchSpy = vi.mocked(api.fetchUserEvents)
    fetchSpy.mockClear()

    const { result } = renderHook(() => useUserTimeline(null), { wrapper })

    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.current.events).toEqual([])
  })
})
