import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
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
        <TooltipProvider>
          <PathsExplorerPage />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PathsExplorerPage counting mode toggle', () => {
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

  it('renders Exact and Contains toggle buttons', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Exact' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Contains' })).toBeInTheDocument()
  })

  it('Exact button has active styling (bg-foreground) by default (no mode param)', () => {
    mockSearchParams = new URLSearchParams('')
    renderPage()
    const exactBtn = screen.getByRole('button', { name: 'Exact' })
    expect(exactBtn.className).toContain('bg-foreground')
    const containsBtn = screen.getByRole('button', { name: 'Contains' })
    expect(containsBtn.className).not.toContain('bg-foreground')
  })

  it('Exact button has active styling when mode=exact', () => {
    mockSearchParams = new URLSearchParams('mode=exact')
    renderPage()
    const exactBtn = screen.getByRole('button', { name: 'Exact' })
    expect(exactBtn.className).toContain('bg-foreground')
    const containsBtn = screen.getByRole('button', { name: 'Contains' })
    expect(containsBtn.className).not.toContain('bg-foreground')
  })

  it('Contains button has active styling when mode=contains', () => {
    mockSearchParams = new URLSearchParams('mode=contains')
    renderPage()
    const containsBtn = screen.getByRole('button', { name: 'Contains' })
    expect(containsBtn.className).toContain('bg-foreground')
    const exactBtn = screen.getByRole('button', { name: 'Exact' })
    expect(exactBtn.className).not.toContain('bg-foreground')
  })

  it('clicking Contains calls setSearchParams with { replace: true }', () => {
    mockSearchParams = new URLSearchParams('')
    renderPage()
    const containsBtn = screen.getByRole('button', { name: 'Contains' })
    fireEvent.click(containsBtn)
    expect(mockSetSearchParams).toHaveBeenCalledOnce()
    // Second argument should be { replace: true }
    const [, options] = mockSetSearchParams.mock.calls[0]
    expect(options).toEqual({ replace: true })
  })

  it('clicking Exact calls setSearchParams with { replace: true }', () => {
    mockSearchParams = new URLSearchParams('mode=contains')
    renderPage()
    const exactBtn = screen.getByRole('button', { name: 'Exact' })
    fireEvent.click(exactBtn)
    expect(mockSetSearchParams).toHaveBeenCalledOnce()
    const [, options] = mockSetSearchParams.mock.calls[0]
    expect(options).toEqual({ replace: true })
  })
})
