import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TableStep } from '../TableStep'

vi.mock('../../../hooks/useConnectionsData', () => ({
  useConnectionTables: vi.fn(),
  useUpsertSchemaConfig: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  })),
}))

vi.mock('../../TableBrowserPicker', () => ({
  TableBrowserPicker: () => <div data-testid="table-browser-picker" />,
}))

import { useConnectionTables } from '../../../hooks/useConnectionsData'

const mockTables = {
  tables: [
    { full_name: 'public.events', schema: 'public', table: 'events' },
    { full_name: 'public.users', schema: 'public', table: 'users' },
    { full_name: 'analytics.page_views', schema: 'analytics', table: 'page_views' },
  ],
}

function renderStep(onConfirm = vi.fn()) {
  vi.mocked(useConnectionTables).mockReturnValue({
    data: mockTables,
    isLoading: false,
    error: null,
  } as unknown as ReturnType<typeof useConnectionTables>)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <TableStep connId="conn-1" currentTable="" onConfirm={onConfirm} />
    </QueryClientProvider>
  )
}

beforeEach(() => vi.clearAllMocks())

describe('TableStep', () => {
  it('renders search input', () => {
    renderStep()
    expect(screen.getByPlaceholderText(/search tables/i)).toBeInTheDocument()
  })

  it('shows all tables when search is empty', () => {
    renderStep()
    // When search is empty, shows the browser picker (not the flat list)
    expect(screen.getByTestId('table-browser-picker')).toBeInTheDocument()
  })

  it('filters tables by search query', async () => {
    renderStep()
    await userEvent.type(screen.getByPlaceholderText(/search tables/i), 'events')
    expect(screen.getByText('public.events')).toBeInTheDocument()
    expect(screen.queryByText('public.users')).not.toBeInTheDocument()
  })

  it('Confirm Table button is disabled when no table selected', () => {
    renderStep()
    expect(screen.getByRole('button', { name: /confirm table/i })).toBeDisabled()
  })

  it('selecting a table from search results shows it in the selected bar', async () => {
    renderStep()
    await userEvent.type(screen.getByPlaceholderText(/search tables/i), 'events')
    await userEvent.click(screen.getByText('public.events'))
    expect(screen.getByTestId('selected-table-bar')).toHaveTextContent('public.events')
  })

  it('Confirm Table button is enabled after selection', async () => {
    renderStep()
    await userEvent.type(screen.getByPlaceholderText(/search tables/i), 'events')
    await userEvent.click(screen.getByText('public.events'))
    expect(screen.getByRole('button', { name: /confirm table/i })).not.toBeDisabled()
  })

  it('calls onConfirm with the selected full_name when Confirm Table is clicked', async () => {
    const onConfirm = vi.fn()
    renderStep(onConfirm)
    await userEvent.type(screen.getByPlaceholderText(/search tables/i), 'events')
    await userEvent.click(screen.getByText('public.events'))
    await userEvent.click(screen.getByRole('button', { name: /confirm table/i }))
    expect(onConfirm).toHaveBeenCalledWith('public.events')
  })

  it('shows loading state while tables are fetching', () => {
    vi.mocked(useConnectionTables).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useConnectionTables>)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <TableStep connId="conn-1" currentTable="" onConfirm={vi.fn()} />
      </QueryClientProvider>
    )
    expect(screen.getByTestId('table-step-loading')).toBeInTheDocument()
  })
})
