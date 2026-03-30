import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ConnectionList } from '../ConnectionList'
import * as hooks from '../../hooks/useConnectionsData'

vi.mock('../../hooks/useConnectionsData')
vi.mock('../ConnectionFormDialog', () => ({
  ConnectionFormDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="mock-form-dialog">Mock Form Dialog</div> : null,
}))

function renderList() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ConnectionList />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ConnectionList empty state', () => {
  beforeEach(() => {
    const mockUseConnections = vi.mocked(hooks.useConnections)
    const mockUseDeleteConnection = vi.mocked(hooks.useDeleteConnection)
    const mockUseTestConnection = vi.mocked(hooks.useTestConnection)

    mockUseConnections.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof hooks.useConnections>)
    mockUseDeleteConnection.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useDeleteConnection>)
    mockUseTestConnection.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      reset: vi.fn(),
      data: undefined,
      error: null,
    } as unknown as ReturnType<typeof hooks.useTestConnection>)
  })

  it('shows EmptyState when no connections exist', () => {
    renderList()

    expect(screen.getByText('No connections yet')).toBeInTheDocument()
    expect(screen.getByText(/Connect your event database/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add your first connection/i })).toBeInTheDocument()
  })

  it('does not show the old dashed-box empty state', () => {
    renderList()

    expect(screen.queryByText(/--snowflake/)).not.toBeInTheDocument()
  })
})
