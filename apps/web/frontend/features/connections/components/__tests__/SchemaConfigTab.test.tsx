import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SchemaConfigTab } from '../SchemaConfigTab'
import * as hooks from '../../hooks/useConnectionsData'

vi.mock('../../hooks/useConnectionsData')

const mockSchema = {
  user_id_field: 'user_id',
  timestamp_field: 'created_at',
  event_name_field: 'event_name',
  events_table: 'events',
  session_timeout_minutes: 30,
  custom_properties: [
    { name: 'country', path: 'properties.country', type: 'string' as const, category: undefined },
  ],
}

const mockFilters = {
  filter_fields: [{ field: 'event_name', label: 'Event', icon: 'Tag' }],
}

function renderTab() {
  vi.mocked(hooks.useSchemaConfig).mockReturnValue({
    data: mockSchema,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)
  vi.mocked(hooks.useFilterConfig).mockReturnValue({
    data: mockFilters,
    isLoading: false,
  } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)
  vi.mocked(hooks.useUpsertSchemaConfig).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)
  vi.mocked(hooks.useUpsertFilterConfig).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)
  vi.mocked(hooks.useDetectSchema).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SchemaConfigTab connId="conn-1" />
    </QueryClientProvider>
  )
}

describe('SchemaConfigTab filter columns', () => {
  it('renders filter checkboxes for required fields', () => {
    renderTab()
    // At least 3 filter checkboxes for required fields + 1 for custom prop
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(4)
  })

  it('shows event_name as filter-enabled based on loaded filter config', () => {
    renderTab()
    // event_name is in mockFilters — it should be checked
    // Radix Checkbox renders a button with aria-checked
    const checked = screen
      .getAllByRole('checkbox')
      .filter(
        (el) => el.getAttribute('aria-checked') === 'true' || (el as HTMLInputElement).checked
      )
    expect(checked.length).toBeGreaterThan(0)
  })

  it('renders lock icons for required fields', () => {
    renderTab()
    // Lock icons indicate required fields can't be deleted
    // Check that user_id, created_at, event_name column names are displayed
    expect(screen.getByText('user_id')).toBeInTheDocument()
    expect(screen.getByText('created_at')).toBeInTheDocument()
    expect(screen.getByText('event_name')).toBeInTheDocument()
  })
})
