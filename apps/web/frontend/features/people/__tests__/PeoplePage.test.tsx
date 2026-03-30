import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { PeoplePage } from '../PeoplePage'
import * as peopleListHook from '../hooks/usePeopleList'
import * as timelineHook from '../hooks/useUserTimeline'

vi.mock('../hooks/usePeopleList')
vi.mock('../hooks/useUserTimeline')
vi.mock('@/stores', () => ({
  useAppStore: vi.fn(() => ({ activeConnectionId: 'conn-1' })),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PeoplePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const mockUsers = [
  {
    user_id: 'user-abc',
    event_count: 10,
    first_seen: '2026-01-01T00:00:00',
    last_seen: '2026-01-15T00:00:00',
  },
  {
    user_id: 'user-def',
    event_count: 5,
    first_seen: '2026-01-02T00:00:00',
    last_seen: '2026-01-10T00:00:00',
  },
]

const emptyTimeline = {
  events: [],
  isLoading: false,
  isError: false,
  error: null,
  hasNextPage: false,
  fetchNextPage: vi.fn(),
  isFetchingNextPage: false,
}

describe('PeoplePage', () => {
  beforeEach(() => {
    vi.mocked(timelineHook.useUserTimeline).mockReturnValue(emptyTimeline)
  })

  it('shows user list when users exist', () => {
    vi.mocked(peopleListHook.usePeopleList).mockReturnValue({
      users: mockUsers,
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    })

    renderPage()

    expect(screen.getAllByText('user-abc').length).toBeGreaterThan(0)
    expect(screen.getByText('user-def')).toBeInTheDocument()
  })

  it('shows empty state when no users', () => {
    vi.mocked(peopleListHook.usePeopleList).mockReturnValue({
      users: [],
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    })

    renderPage()

    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  it('clicking a user row loads their timeline', async () => {
    vi.mocked(peopleListHook.usePeopleList).mockReturnValue({
      users: mockUsers,
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    })
    vi.mocked(timelineHook.useUserTimeline).mockReturnValue({
      events: [
        {
          user_id: 'user-def',
          event_name: 'page_view',
          timestamp: '2026-01-10T12:00:00',
          properties: {},
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    })

    renderPage()

    await userEvent.click(screen.getByText('user-def'))

    expect(screen.getByText('page_view')).toBeInTheDocument()
  })

  it('shows search input', () => {
    vi.mocked(peopleListHook.usePeopleList).mockReturnValue({
      users: mockUsers,
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    })

    renderPage()

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })
})
