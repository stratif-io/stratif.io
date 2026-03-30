import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { usePeopleList } from '../usePeopleList'
import * as api from '@/lib/api'

vi.mock('@/lib/api')
vi.mock('@/stores', () => ({
  useAppStore: vi.fn(() => ({
    activeConnectionId: 'conn-1',
    dateRange: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
  })),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client: qc }, children)
}

describe('usePeopleList', () => {
  it('returns users from the API', async () => {
    vi.mocked(api.fetchUserList).mockResolvedValue({
      sql: undefined,
      limit: 50,
      offset: 0,
      data: [
        {
          user_id: 'user-1',
          event_count: 10,
          first_seen: '2026-01-01T00:00:00',
          last_seen: '2026-01-15T00:00:00',
        },
        {
          user_id: 'user-2',
          event_count: 5,
          first_seen: '2026-01-02T00:00:00',
          last_seen: '2026-01-10T00:00:00',
        },
      ],
    })

    const { result } = renderHook(() => usePeopleList(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.users).toHaveLength(2)
    expect(result.current.users[0].user_id).toBe('user-1')
  })

  it('is disabled when no connection is active', async () => {
    const { useAppStore } = await import('@/stores')
    vi.mocked(useAppStore).mockReturnValue({
      activeConnectionId: null,
      dateRange: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
    } as unknown as ReturnType<typeof useAppStore>)

    const fetchSpy = vi.mocked(api.fetchUserList)
    fetchSpy.mockClear()

    renderHook(() => usePeopleList(), { wrapper })

    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
