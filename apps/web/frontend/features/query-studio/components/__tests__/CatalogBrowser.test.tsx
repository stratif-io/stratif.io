import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppStore } from '@/stores'

vi.mock('@/lib/api', () => ({
  fetchConnectionTables: vi.fn(),
  fetchConnectionColumns: vi.fn(),
}))

import { fetchConnectionTables, fetchConnectionColumns } from '@/lib/api'
import { CatalogBrowser } from '../CatalogBrowser'

const mockFetchTables = vi.mocked(fetchConnectionTables)
const mockFetchColumns = vi.mocked(fetchConnectionColumns)

// Use tables without a schema so they render directly (no collapsed schema node)
const TABLES_NO_SCHEMA = [
  { catalog: null, table_schema: null, name: 'events', full_name: 'events' },
  { catalog: null, table_schema: null, name: 'sessions', full_name: 'sessions' },
]

// Tables with a schema — require clicking the schema node to expand
const TABLES_WITH_SCHEMA = [
  { catalog: null, table_schema: 'main', name: 'events', full_name: 'main.events' },
  { catalog: null, table_schema: 'main', name: 'sessions', full_name: 'main.sessions' },
]

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function renderBrowser(
  overrides: { onTableClick?: (name: string) => void; onColumnClick?: (name: string) => void } = {},
) {
  const onTableClick = overrides.onTableClick ?? vi.fn()
  const onColumnClick = overrides.onColumnClick ?? vi.fn()
  const result = render(
    createElement(CatalogBrowser, { onTableClick, onColumnClick }),
    { wrapper: makeWrapper() },
  )
  return { ...result, onTableClick, onColumnClick }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAppStore.setState({ activeConnectionId: 'conn-1' })
  mockFetchTables.mockResolvedValue({ tables: TABLES_NO_SCHEMA })
  mockFetchColumns.mockResolvedValue({ columns: ['user_id', 'timestamp', 'event_name'] })
})

describe('CatalogBrowser', () => {
  it('renders table names after data loads', async () => {
    renderBrowser()
    expect(await screen.findByText('events')).toBeInTheDocument()
    expect(screen.getByText('sessions')).toBeInTheDocument()
  })

  it('clicking the table name button calls onTableClick with full_name', async () => {
    const { onTableClick } = renderBrowser()
    await screen.findByText('events')
    const tableBtn = screen.getAllByTitle('Insert SELECT')[0]
    fireEvent.click(tableBtn)
    expect(onTableClick).toHaveBeenCalledWith('events')
  })

  it('clicking the chevron/expand button does NOT call onTableClick', async () => {
    const { onTableClick } = renderBrowser()
    await screen.findByText('events')
    const expandBtn = screen.getAllByTitle('Expand columns')[0]
    fireEvent.click(expandBtn)
    expect(onTableClick).not.toHaveBeenCalled()
  })

  it('search input filters the table list', async () => {
    renderBrowser()
    await screen.findByText('events')
    const input = screen.getByPlaceholderText('Search tables…')
    fireEvent.change(input, { target: { value: 'sess' } })
    expect(screen.queryByText('events')).not.toBeInTheDocument()
    expect(screen.getByText('sessions')).toBeInTheDocument()
  })

  it('expanding a table fetches and renders columns', async () => {
    useAppStore.setState({ activeConnectionId: 'conn-1' })
    mockFetchTables.mockResolvedValue({ tables: TABLES_WITH_SCHEMA })
    renderBrowser()
    // Wait for schema node to appear, then expand it
    const schemaBtn = await screen.findByText('main')
    fireEvent.click(schemaBtn)
    // Now table is visible — expand it to see columns
    await screen.findByText('events')
    fireEvent.click(screen.getAllByTitle('Expand columns')[0])
    await waitFor(() => {
      expect(mockFetchColumns).toHaveBeenCalledWith('conn-1', 'main.events')
      expect(screen.getByText('user_id')).toBeInTheDocument()
      expect(screen.getByText('timestamp')).toBeInTheDocument()
    })
  })

  it('table name button calls onTableClick with schema-qualified full_name', async () => {
    mockFetchTables.mockResolvedValue({ tables: TABLES_WITH_SCHEMA })
    const { onTableClick } = renderBrowser()
    // Expand schema first
    const schemaBtn = await screen.findByText('main')
    fireEvent.click(schemaBtn)
    await screen.findByText('events')
    fireEvent.click(screen.getAllByTitle('Insert SELECT')[0])
    expect(onTableClick).toHaveBeenCalledWith('main.events')
  })
})
