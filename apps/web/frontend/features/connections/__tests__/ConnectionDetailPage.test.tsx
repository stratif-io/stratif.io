import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectionDetailPage } from '../ConnectionDetailPage'

vi.mock('../hooks/useConnectionsData', () => ({
  useConnection: vi.fn(),
  useTestConnection: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    data: undefined,
    error: null,
    reset: vi.fn(),
  })),
  useUpdateConnection: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    error: null,
  })),
  useConnectionCredentials: vi.fn(() => ({ data: { fields: {} } })),
  useConnectionString: vi.fn(() => ({ data: null })),
  useSchemaConfig: vi.fn(() => ({ data: null, isLoading: false })),
  useUpsertSchemaConfig: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  })),
  useFilterConfig: vi.fn(() => ({ data: { filter_fields: [] }, isLoading: false })),
  useUpsertFilterConfig: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useFilterOptions: vi.fn(() => ({ data: null })),
  useConnectionTables: vi.fn(() => ({ data: null, isLoading: false })),
  useDetectSchema: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useConnections: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  useDeleteConnection: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('../hooks/useSchemaForm', () => ({
  useSchemaForm: vi.fn(() => ({
    form: {
      userIdField: '',
      eventNameField: '',
      timestampField: '',
      eventsTable: '',
      customProps: [],
      userIdentityFields: {
        email_field: null,
        first_name_field: null,
        last_name_field: null,
        date_of_birth_field: null,
        phone_field: null,
      },
      sessionTimeoutMinutes: 30,
      resurrectionWindowDays: 30,
      powerUserThresholdDays: 4,
    },
    updateForm: vi.fn(),
    pendingDetections: [],
    setPendingDetections: vi.fn(),
    detectedColumns: [],
    enabledFields: {},
    setEnabledFields: vi.fn(),
    detect: { isPending: false },
    handleDetect: vi.fn(),
    acceptDetection: vi.fn(),
    rejectDetection: vi.fn(),
    acceptAllDetections: vi.fn(),
    upsert: { isPending: false, isSuccess: false, isError: false },
    upsertFilter: { mutate: vi.fn(), isPending: false },
  })),
}))

import { useConnection } from '../hooks/useConnectionsData'

const baseConn = Object.freeze({
  id: 'conn-1',
  name: 'My DB',
  db_type: 'postgresql',
  created_at: '2024-01-01T00:00:00Z',
  schema_config: null,
})

function renderPage(step?: string) {
  const path = step ? `/connections/conn-1/${step}` : '/connections/conn-1'
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/connections/:id/:tab?" element={<ConnectionDetailPage />} />
          <Route path="/connections" element={<div>connections list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useConnection).mockReturnValue({
    data: baseConn,
    isLoading: false,
    error: null,
  } as ReturnType<typeof useConnection>)
})

describe('ConnectionDetailPage — default step routing', () => {
  it('lands on credentials step for a new connection (no schema_config)', () => {
    renderPage()
    expect(screen.getByTestId('step-nav-credentials')).toHaveAttribute('data-active', 'true')
  })

  it('lands on table step when schema_config exists but events_table is empty', () => {
    vi.mocked(useConnection).mockReturnValue({
      data: { ...baseConn, schema_config: { events_table: '' } },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useConnection>)
    renderPage()
    expect(screen.getByTestId('step-nav-table')).toHaveAttribute('data-active', 'true')
  })

  it('lands on fieldmap step when table is set', () => {
    vi.mocked(useConnection).mockReturnValue({
      data: { ...baseConn, schema_config: { events_table: 'public.events' } },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useConnection>)
    renderPage()
    expect(screen.getByTestId('step-nav-fieldmap')).toHaveAttribute('data-active', 'true')
  })

  it('respects explicit step URL param', () => {
    vi.mocked(useConnection).mockReturnValue({
      data: { ...baseConn, schema_config: { events_table: 'public.events' } },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useConnection>)
    renderPage('advanced')
    expect(screen.getByTestId('step-nav-advanced')).toHaveAttribute('data-active', 'true')
  })
})

describe('ConnectionDetailPage — layout', () => {
  it('renders the sidebar with conn-status', () => {
    renderPage()
    expect(screen.getByTestId('conn-status')).toBeInTheDocument()
  })

  it('shows loading state while connection is fetching', () => {
    vi.mocked(useConnection).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useConnection>)
    renderPage()
    expect(screen.getByText(/loading connection/i)).toBeInTheDocument()
  })

  it('shows error state when connection not found', () => {
    vi.mocked(useConnection).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('not found'),
    } as ReturnType<typeof useConnection>)
    renderPage()
    expect(screen.getByText(/not found/i)).toBeInTheDocument()
  })
})
