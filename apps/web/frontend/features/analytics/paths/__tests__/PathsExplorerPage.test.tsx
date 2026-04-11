import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PathsExplorerPage } from '../PathsExplorerPage'
import { useAppStore } from '@/stores'

// Mock the hook at the module level
vi.mock('../hooks/usePathExplorer', () => ({
  usePathExplorer: () => ({
    pathData: [],
    events: [],
    isLoading: false,
    isError: false,
    error: null,
    eventsLoading: false,
    totalPaths: 0,
    sql: undefined,
  }),
}))

vi.mock('@/lib/analytics', () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}))

const mockSetSearchParams = vi.fn()
let mockSearchParams = new URLSearchParams('')

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  }
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PathsExplorerPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PathsExplorerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetSearchParams.mockImplementation(() => {})
    mockSearchParams = new URLSearchParams('')
    useAppStore.setState({
      dateRange: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
      activeConnectionId: 'conn-1',
      activeFilters: {},
    })
  })

  it('renders without the Exact/Contains toggle', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: 'Exact' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Contains' })).not.toBeInTheDocument()
  })

  it('renders the paths page title', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Paths' })).toBeInTheDocument()
  })
})
