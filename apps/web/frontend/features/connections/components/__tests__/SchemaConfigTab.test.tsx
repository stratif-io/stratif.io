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

describe('SchemaConfigTab — Setup section', () => {
  it('shows the events table input with current value', () => {
    renderTab()
    expect(screen.getByDisplayValue('events')).toBeInTheDocument()
  })

  it('shows core field inputs with loaded values', () => {
    renderTab()
    expect(screen.getByDisplayValue('user_id')).toBeInTheDocument()
    expect(screen.getByDisplayValue('created_at')).toBeInTheDocument()
    expect(screen.getByDisplayValue('event_name')).toBeInTheDocument()
  })

  it('shows session timeout input with loaded value', () => {
    renderTab()
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
  })

  it('shows Detect from Schema button', () => {
    renderTab()
    expect(screen.getByRole('button', { name: /detect from schema/i })).toBeInTheDocument()
  })
})

describe('SchemaConfigTab — Properties table', () => {
  it('shows required field column names as read-only rows', () => {
    renderTab()
    expect(screen.getByText('user_id')).toBeInTheDocument()
    expect(screen.getByText('created_at')).toBeInTheDocument()
    expect(screen.getByText('event_name')).toBeInTheDocument()
  })

  it('shows custom property name in an editable input', () => {
    renderTab()
    expect(screen.getByDisplayValue('country')).toBeInTheDocument()
  })

  it('renders "Add to Global Filters" column header', () => {
    renderTab()
    expect(screen.getByText(/add to global filters/i)).toBeInTheDocument()
  })

  it('has a checkbox for each required field and custom prop (4 total)', () => {
    renderTab()
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(4)
  })

  it('shows event_name filter checkbox as checked based on filter config', () => {
    renderTab()
    const checked = screen
      .getAllByRole('checkbox')
      .filter(
        (el) => el.getAttribute('aria-checked') === 'true' || (el as HTMLInputElement).checked
      )
    expect(checked.length).toBeGreaterThan(0)
  })

  it('does not render any icon select dropdowns', () => {
    renderTab()
    expect(screen.queryByText('Globe')).not.toBeInTheDocument()
    expect(screen.queryByText('Chrome')).not.toBeInTheDocument()
  })

  it('shows Add property button', () => {
    renderTab()
    expect(screen.getByRole('button', { name: /add property/i })).toBeInTheDocument()
  })
})
