import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectionDetailPage } from '../ConnectionDetailPage'
import { useAppStore } from '@/stores'

// Mock the hooks used by ConnectionDetailPage and its children
vi.mock('../hooks/useConnectionsData', () => ({
  useConnection: vi.fn(),
  useTestConnection: vi.fn(),
  useUpdateConnection: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    error: null,
  })),
  useConnectionCredentials: vi.fn(() => ({ data: { fields: {} } })),
  useConnectionString: vi.fn(() => ({ data: null })),
  useSchemaConfig: vi.fn(() => ({ data: null, isLoading: false })),
  useUpsertSchemaConfig: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useFilterConfig: vi.fn(() => ({ data: null, isLoading: false })),
  useUpsertFilterConfig: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useFilterOptions: vi.fn(() => ({ data: null })),
  useConnectionTables: vi.fn(() => ({ data: null })),
  useDetectSchema: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useConnections: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  useDeleteConnection: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

import { useConnection, useTestConnection } from '../hooks/useConnectionsData'

const mockConnection = Object.freeze({
  id: 'conn-1',
  name: 'My DB',
  db_type: 'postgresql',
  created_at: '2024-01-01T00:00:00Z',
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/connections/conn-1']}>
        <Routes>
          <Route path="/connections/:id/:tab?" element={<ConnectionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useConnection).mockReturnValue({
    data: mockConnection,
    isLoading: false,
    error: null,
  } as ReturnType<typeof useConnection>)
  vi.mocked(useTestConnection).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    data: undefined,
    error: null,
    reset: vi.fn(),
  } as unknown as ReturnType<typeof useTestConnection>)
  useAppStore.setState({ activeConnectionId: null })
})

describe('ConnectionDetailPage — wizard mode', () => {
  it('shows wizard progress when schema_config is null (new connection)', () => {
    renderPage()
    expect(screen.getByTestId('step-connection')).toBeInTheDocument()
    expect(screen.getByTestId('step-schema')).toBeInTheDocument()
    expect(screen.queryByTestId('step-filters')).not.toBeInTheDocument()
  })

  it('does not show wizard progress when schema_config is set (returning user)', () => {
    vi.mocked(useConnection).mockReturnValue({
      data: { ...mockConnection, schema_config: { tables: [] } },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useConnection>)

    renderPage()
    expect(screen.queryByTestId('step-connection')).not.toBeInTheDocument()
  })

  it('hides tab buttons in wizard mode', () => {
    renderPage()
    expect(screen.queryByText('Schema Mapping')).not.toBeInTheDocument()
    expect(screen.queryByText('Global Filters')).not.toBeInTheDocument()
  })

  it('shows tab buttons when not in wizard mode', () => {
    vi.mocked(useConnection).mockReturnValue({
      data: { ...mockConnection, schema_config: { tables: [] } },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useConnection>)

    renderPage()
    expect(screen.getByText('Schema Mapping')).toBeInTheDocument()
    expect(screen.queryByText('Global Filters')).not.toBeInTheDocument()
  })

  it('does not show a Next button — wizard steps are navigated by clicking the pills', () => {
    renderPage()
    expect(screen.queryByText(/next/i)).not.toBeInTheDocument()
  })
})

describe('ConnectionDetailPage — connection testing and activation', () => {
  it('shows verifying indicator while test is pending', () => {
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      data: undefined,
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)

    renderPage()
    const status = screen.getByTestId('auto-test-status')
    expect(status).toHaveTextContent(/verifying/i)
  })

  it('sets active connection when test passes', async () => {
    let capturedCallbacks: { onSuccess?: (data: unknown) => void } = {}
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn((_id, callbacks) => {
        capturedCallbacks = callbacks ?? {}
      }),
      isPending: false,
      data: { ok: true },
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)

    renderPage()

    // Simulate the onSuccess callback firing
    capturedCallbacks.onSuccess?.({ ok: true })

    await waitFor(() => {
      expect(useAppStore.getState().activeConnectionId).toBe('conn-1')
    })
    const status = screen.getByTestId('auto-test-status')
    expect(status).toHaveTextContent(/^active$/i)
  })

  it('shows connection failed when test returns ok=false', () => {
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { ok: false },
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)

    renderPage()
    const status = screen.getByTestId('auto-test-status')
    expect(status).toHaveTextContent(/connection failed/i)
    expect(useAppStore.getState().activeConnectionId).toBeNull()
  })

  it('does not change active connection when test fails with network error', async () => {
    useAppStore.setState({ activeConnectionId: 'other-conn' })
    let capturedCallbacks: { onError?: (err: unknown) => void } = {}
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn((_id, callbacks) => {
        capturedCallbacks = callbacks ?? {}
      }),
      isPending: false,
      data: undefined,
      error: new Error('connection refused'),
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)

    renderPage()
    capturedCallbacks.onError?.(new Error('connection refused'))

    await waitFor(() => {
      expect(useAppStore.getState().activeConnectionId).toBe('other-conn')
    })
    const status = screen.getByTestId('auto-test-status')
    expect(status).toHaveTextContent(/connection failed/i)
  })
})
