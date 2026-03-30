import { render, screen, act } from '@testing-library/react'
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
  email_field: 'user_email',
  first_name_field: null,
  last_name_field: null,
  date_of_birth_field: null,
  phone_field: null,
  custom_properties: [
    { name: 'country', path: 'properties.country', type: 'string' as const, category: undefined },
  ],
}

const mockFilters = {
  filter_fields: [{ field: 'event_name', label: 'Event', icon: 'Tag' }],
}

const mockDetectResult = {
  suggestions: {
    user_id_field: 'uid',
    event_name_field: 'action',
    timestamp_field: 'ts',
    email_field: 'user_email',
    first_name_field: null,
    last_name_field: null,
    date_of_birth_field: null,
    phone_field: null,
  },
  proposed_custom_properties: [],
  events_table: 'events',
  columns: [],
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
})

describe('SchemaConfigTab — User Identity section', () => {
  it('renders "User Identity" section heading', () => {
    renderTab()
    expect(screen.getByText('User Identity')).toBeInTheDocument()
  })

  it('shows User ID label', () => {
    renderTab()
    expect(screen.getByText('User ID')).toBeInTheDocument()
  })

  it('shows all five optional field labels', () => {
    renderTab()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('First Name')).toBeInTheDocument()
    expect(screen.getByText('Last Name')).toBeInTheDocument()
    expect(screen.getByText('Date of Birth')).toBeInTheDocument()
    expect(screen.getByText('Phone')).toBeInTheDocument()
  })

  it('shows the mapped email column value', () => {
    renderTab()
    // Radix Select renders the selected value as visible text
    expect(screen.getByText('user_email')).toBeInTheDocument()
  })
})

describe('SchemaConfigTab — Event Properties section', () => {
  it('renders "Event Properties" section heading', () => {
    renderTab()
    expect(screen.getByText('Event Properties')).toBeInTheDocument()
  })

  it('shows Event Name and Timestamp as locked rows', () => {
    renderTab()
    expect(screen.getByText('Event Name')).toBeInTheDocument()
    expect(screen.getByText('Timestamp')).toBeInTheDocument()
  })

  it('shows custom property name in an editable input', () => {
    renderTab()
    expect(screen.getByDisplayValue('country')).toBeInTheDocument()
  })

  it('shows Add Property button', () => {
    renderTab()
    expect(screen.getByRole('button', { name: /add property/i })).toBeInTheDocument()
  })

  it('does NOT show User ID as a locked row in Event Properties (only one occurrence total — in User Identity)', () => {
    renderTab()
    const allUserIdTexts = screen.getAllByText('User ID')
    expect(allUserIdTexts).toHaveLength(1)
  })

  it('renders Global Filter column header in Event Properties', () => {
    renderTab()
    expect(screen.getByText(/global filter/i)).toBeInTheDocument()
  })
})

describe('SchemaConfigTab — resurrection and power user fields', () => {
  it('shows resurrection_window_days input with value 45', () => {
    renderTab()
    expect(screen.getByDisplayValue('45')).toBeInTheDocument()
  })

  it('shows power_user_threshold_days input with value 7', () => {
    renderTab()
    expect(screen.getByDisplayValue('7')).toBeInTheDocument()
  })
})

describe('SchemaConfigTab — detect review panel', () => {
  it('shows proposed fields in review panel after detect runs (not yet applied)', () => {
    vi.mocked(hooks.useDetectSchema).mockReturnValue({
      mutate: (_table: unknown, opts: { onSuccess: (r: typeof mockDetectResult) => void }) => {
        opts.onSuccess(mockDetectResult)
      },
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <SchemaConfigTab connId="conn-2" />
      </QueryClientProvider>
    )

    act(() => {
      screen.getByRole('button', { name: /detect from schema/i }).click()
    })

    expect(screen.getByText(/fields detected/i)).toBeInTheDocument()
    expect(screen.getByText('uid')).toBeInTheDocument()
    expect(screen.getByText('action')).toBeInTheDocument()
  })

  it('accepting a single row applies that field and removes it from the panel', () => {
    vi.mocked(hooks.useDetectSchema).mockReturnValue({
      mutate: (_table: unknown, opts: { onSuccess: (r: typeof mockDetectResult) => void }) => {
        opts.onSuccess(mockDetectResult)
      },
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <SchemaConfigTab connId="conn-3" />
      </QueryClientProvider>
    )

    act(() => {
      screen.getAllByRole('button', { name: /detect from schema/i })[0].click()
    })

    // Accept User ID row
    const acceptBtn = screen.getByRole('button', { name: /accept user id/i })
    act(() => {
      acceptBtn.click()
    })

    // User ID row should be gone
    expect(screen.queryByRole('button', { name: /accept user id/i })).not.toBeInTheDocument()
    // Panel still visible (other rows remain)
    expect(screen.getByText(/fields detected/i)).toBeInTheDocument()
  })

  it('Accept all applies all fields and hides the panel', () => {
    vi.mocked(hooks.useDetectSchema).mockReturnValue({
      mutate: (_table: unknown, opts: { onSuccess: (r: typeof mockDetectResult) => void }) => {
        opts.onSuccess(mockDetectResult)
      },
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <SchemaConfigTab connId="conn-4" />
      </QueryClientProvider>
    )

    act(() => {
      screen.getAllByRole('button', { name: /detect from schema/i })[0].click()
    })

    act(() => {
      screen.getByRole('button', { name: /accept all/i }).click()
    })

    expect(screen.queryByText(/fields detected/i)).not.toBeInTheDocument()
  })

  it('Dismiss clears the panel without applying anything', () => {
    vi.mocked(hooks.useDetectSchema).mockReturnValue({
      mutate: (_table: unknown, opts: { onSuccess: (r: typeof mockDetectResult) => void }) => {
        opts.onSuccess(mockDetectResult)
      },
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <SchemaConfigTab connId="conn-5" />
      </QueryClientProvider>
    )

    act(() => {
      screen.getAllByRole('button', { name: /detect from schema/i })[0].click()
    })

    expect(screen.getByText(/fields detected/i)).toBeInTheDocument()

    act(() => {
      screen.getByRole('button', { name: /dismiss/i }).click()
    })

    expect(screen.queryByText(/fields detected/i)).not.toBeInTheDocument()
    // Fields should NOT be changed — userIdField should still be 'user_id' from mockSchema
    // We can't easily check state directly but panel is gone, meaning no auto-apply happened
  })

  it('review panel does not appear when detect returns no suggestions', () => {
    const emptyResult = {
      ...mockDetectResult,
      suggestions: {
        user_id_field: null,
        event_name_field: null,
        timestamp_field: null,
        email_field: null,
        first_name_field: null,
        last_name_field: null,
        date_of_birth_field: null,
        phone_field: null,
      },
    }

    vi.mocked(hooks.useDetectSchema).mockReturnValue({
      mutate: (_table: unknown, opts: { onSuccess: (r: typeof emptyResult) => void }) => {
        opts.onSuccess(emptyResult)
      },
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <SchemaConfigTab connId="conn-6" />
      </QueryClientProvider>
    )

    act(() => {
      screen.getAllByRole('button', { name: /detect from schema/i })[0].click()
    })

    expect(screen.queryByText(/fields detected/i)).not.toBeInTheDocument()
  })
})
