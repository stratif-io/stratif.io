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
  resurrection_window_days: 45,
  power_user_threshold_days: 7,
  custom_properties: [
    { name: 'country', path: 'properties.country', type: 'string' as const, category: undefined },
  ],
}

const mockFilters = {
  filter_fields: [{ field: 'event_name', label: 'Event', icon: 'Tag' }],
}

function renderTab() {
  const detectMutate = vi.fn()
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
    mutate: detectMutate,
    isPending: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <SchemaConfigTab connId="conn-1" />
    </QueryClientProvider>
  )
  return { detectMutate }
}

describe('SchemaConfigTab — Setup section', () => {
  it('shows the events table input with current value', () => {
    renderTab()
    expect(screen.getByDisplayValue('events')).toBeInTheDocument()
  })

  it('shows session timeout input', () => {
    renderTab()
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
  })

  it('shows Detect from Schema button', () => {
    renderTab()
    expect(screen.getByRole('button', { name: /detect from schema/i })).toBeInTheDocument()
  })

  it('does NOT show standalone text inputs for User ID, Timestamp, Event Name in Setup', () => {
    renderTab()
    // These used to be inputs in Setup — now they are Select dropdowns in the Properties table
    expect(screen.queryByLabelText(/user id column/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/timestamp column/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/event name column/i)).not.toBeInTheDocument()
  })
})

describe('SchemaConfigTab — Properties table required rows', () => {
  it('shows "Field" and "Column" column headers', () => {
    renderTab()
    expect(screen.getByText('Field')).toBeInTheDocument()
    expect(screen.getByText('Column')).toBeInTheDocument()
  })

  it('shows semantic labels for required rows', () => {
    renderTab()
    expect(screen.getByText('User ID')).toBeInTheDocument()
    expect(screen.getByText('Timestamp')).toBeInTheDocument()
    expect(screen.getByText('Event Name')).toBeInTheDocument()
  })

  it('shows current column values as selected option text in required rows', () => {
    renderTab()
    // Radix Select renders the selected value as visible text
    expect(screen.getByText('user_id')).toBeInTheDocument()
    expect(screen.getByText('created_at')).toBeInTheDocument()
    expect(screen.getByText('event_name')).toBeInTheDocument()
  })
})

describe('SchemaConfigTab — Properties table', () => {
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

describe('SchemaConfigTab — Resurrection window and Power user threshold', () => {
  it('shows Resurrection window label', () => {
    renderTab()
    expect(screen.getByText(/resurrection window/i)).toBeInTheDocument()
  })

  it('shows Power user threshold label', () => {
    renderTab()
    expect(screen.getByText(/power user threshold/i)).toBeInTheDocument()
  })

  it('shows resurrection_window_days input with value 45', () => {
    renderTab()
    const input = screen.getByDisplayValue('45')
    expect(input).toBeInTheDocument()
  })

  it('shows power_user_threshold_days input with value 7', () => {
    renderTab()
    const input = screen.getByDisplayValue('7')
    expect(input).toBeInTheDocument()
  })
})
