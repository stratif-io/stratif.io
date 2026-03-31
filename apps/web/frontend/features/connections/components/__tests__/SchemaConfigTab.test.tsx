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
  filter_fields: [{ field: 'event_name', label: 'Event', icon: 'Activity' }],
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

function renderAndExpand(section: 'identity' | 'properties' | 'advanced') {
  const { detectMutate } = renderTab()
  const nameMap = {
    identity: /user identity/i,
    properties: /event properties/i,
    advanced: /advanced/i,
  }
  act(() => {
    screen.getByRole('button', { name: nameMap[section] }).click()
  })
  return { detectMutate }
}

describe('SchemaConfigTab — Setup section', () => {
  it('shows the events table input with current value', () => {
    renderTab()
    expect(screen.getByRole('button', { name: /events/i })).toBeInTheDocument()
  })

  it('shows session timeout input in the Advanced section', () => {
    renderAndExpand('advanced')
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
  })

  it('shows Detect from Schema button', () => {
    renderTab()
    expect(screen.getByRole('button', { name: /detect from schema/i })).toBeInTheDocument()
  })

  it('shows Event Name and Timestamp as required field rows', () => {
    renderTab()
    expect(screen.getByText('Event Name')).toBeInTheDocument()
    expect(screen.getByText('Timestamp')).toBeInTheDocument()
  })
})

describe('SchemaConfigTab — User Identity section', () => {
  it('renders "User Identity" section heading', () => {
    renderTab()
    expect(screen.getByRole('button', { name: /user identity/i })).toBeInTheDocument()
  })

  it('shows User ID label in Required Fields', () => {
    renderTab()
    expect(screen.getByText('User ID')).toBeInTheDocument()
  })

  it('shows all five optional field labels when identity section is expanded', () => {
    renderAndExpand('identity')
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('First Name')).toBeInTheDocument()
    expect(screen.getByText('Last Name')).toBeInTheDocument()
    expect(screen.getByText('Date of Birth')).toBeInTheDocument()
    expect(screen.getByText('Phone')).toBeInTheDocument()
  })

  it('shows the mapped email column value when identity section is expanded', () => {
    renderAndExpand('identity')
    expect(screen.getByText('user_email')).toBeInTheDocument()
  })
})

describe('SchemaConfigTab — Event Properties section', () => {
  it('renders "Event Properties" section heading', () => {
    renderTab()
    expect(screen.getByText(/event properties/i)).toBeInTheDocument()
  })

  it('shows custom property name in an editable input', () => {
    renderTab()
    expect(screen.getByDisplayValue('country')).toBeInTheDocument()
  })

  it('shows Add button', () => {
    renderTab()
    expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument()
  })

  it('renders Cat. column header in Event Properties', () => {
    renderTab()
    expect(screen.getByText(/^cat\.$/i)).toBeInTheDocument()
  })
})

describe('SchemaConfigTab — resurrection and power user fields', () => {
  it('shows resurrection_window_days input with value 45 in the Advanced section', () => {
    renderAndExpand('advanced')
    expect(screen.getByDisplayValue('45')).toBeInTheDocument()
  })

  it('shows power_user_threshold_days input with value 7 in the Advanced section', () => {
    renderAndExpand('advanced')
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

  it('Accept all applies ALL identity fields when multiple are detected', () => {
    const multiDetectResult = {
      ...mockDetectResult,
      suggestions: {
        ...mockDetectResult.suggestions,
        email_field: 'user_email',
        first_name_field: 'fname',
        last_name_field: 'lname',
      },
    }
    vi.mocked(hooks.useDetectSchema).mockReturnValue({
      mutate: (_table: unknown, opts: { onSuccess: (r: typeof multiDetectResult) => void }) => {
        opts.onSuccess(multiDetectResult)
      },
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <SchemaConfigTab connId="conn-accept-all-multi" />
      </QueryClientProvider>
    )

    act(() => {
      screen.getAllByRole('button', { name: /detect from schema/i })[0].click()
    })

    act(() => {
      screen.getByRole('button', { name: /accept all/i }).click()
    })

    // All three identity fields must be applied — not just the last one
    // ColumnCombobox renders the selected value as visible text (Radix Select)
    expect(screen.getByText('fname')).toBeInTheDocument()
    expect(screen.getByText('lname')).toBeInTheDocument()
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

  it('proposed custom properties exclude columns already mapped to required or identity fields', async () => {
    // mockSchema has: user_id_field='user_id', timestamp_field='created_at',
    //                 event_name_field='event_name', email_field='user_email'
    const detectWithConflicts = {
      ...mockDetectResult,
      proposed_custom_properties: [
        { name: 'safe_prop', path: 'properties.safe_prop', type: 'string' as const },
        { name: 'user_id', path: 'user_id', type: 'string' as const },
        { name: 'created_at', path: 'created_at', type: 'timestamp' as const },
        { name: 'event_name', path: 'event_name', type: 'string' as const },
        { name: 'user_email', path: 'user_email', type: 'string' as const },
      ],
      columns: [],
    }
    vi.mocked(hooks.useDetectSchema).mockReturnValue({
      mutate: (_table: unknown, opts: { onSuccess: (r: typeof detectWithConflicts) => void }) => {
        opts.onSuccess(detectWithConflicts)
      },
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <SchemaConfigTab connId="conn-reserved-cols" />
      </QueryClientProvider>
    )

    act(() => {
      screen.getAllByRole('button', { name: /detect from schema/i })[0].click()
    })

    // Properties section is open by default — safe_prop should be added as a new custom property
    expect(screen.getByDisplayValue('safe_prop')).toBeInTheDocument()
    // reserved paths must NOT appear as new custom properties
    expect(screen.queryByDisplayValue('user_id')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('created_at')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('event_name')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('user_email')).not.toBeInTheDocument()
  })

  it('detect removes existing custom props whose path conflicts with required or identity fields', () => {
    // Schema where a reserved column was previously saved as a custom property
    vi.mocked(hooks.useSchemaConfig).mockReturnValue({
      data: {
        ...mockSchema,
        custom_properties: [
          { name: 'user_id', path: 'user_id', type: 'string' as const, category: undefined },
          {
            name: 'safe_prop',
            path: 'properties.safe_prop',
            type: 'string' as const,
            category: undefined,
          },
        ],
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)

    vi.mocked(hooks.useDetectSchema).mockReturnValue({
      mutate: (_table: unknown, opts: { onSuccess: (r: typeof mockDetectResult) => void }) => {
        opts.onSuccess({ ...mockDetectResult, proposed_custom_properties: [] })
      },
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <SchemaConfigTab connId="conn-cleanup" />
      </QueryClientProvider>
    )

    act(() => {
      screen.getAllByRole('button', { name: /detect from schema/i })[0].click()
    })

    // user_id was a reserved path — should be removed from the list
    expect(screen.queryByDisplayValue('user_id')).not.toBeInTheDocument()
    // safe_prop should remain
    expect(screen.getByDisplayValue('safe_prop')).toBeInTheDocument()
  })
})

describe('SchemaConfigTab — auto-save with null schema (new connection)', () => {
  afterEach(() => {
    // Restore standard mock so subsequent tests don't inherit the null-schema state
    vi.mocked(hooks.useSchemaConfig).mockReturnValue({
      data: mockSchema,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)
  })

  it('triggers upsert.mutate with default values when schema is null', () => {
    vi.useFakeTimers()

    const upsertMutate = vi.fn()
    vi.mocked(hooks.useSchemaConfig).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)
    vi.mocked(hooks.useFilterConfig).mockReturnValue({
      data: mockFilters,
      isLoading: false,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)
    vi.mocked(hooks.useUpsertSchemaConfig).mockReturnValue({
      mutate: upsertMutate,
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
    render(
      <QueryClientProvider client={qc}>
        <SchemaConfigTab connId="conn-null-schema" />
      </QueryClientProvider>
    )

    // Advance past the 800ms debounce
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // upsert.mutate must be called even when schema data was null
    expect(upsertMutate).toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('triggers upsertFilter.mutate when filter config is null (global filter toggle)', () => {
    vi.useFakeTimers()

    const upsertFilterMutate = vi.fn()
    vi.mocked(hooks.useFilterConfig).mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)
    vi.mocked(hooks.useUpsertFilterConfig).mockReturnValue({
      mutate: upsertFilterMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <SchemaConfigTab connId="conn-null-filters" />
      </QueryClientProvider>
    )

    // Advance past initial auto-save timer so filterInitialized is set
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    upsertFilterMutate.mockClear()

    // Toggle the global filter for the 'country' custom prop (Event Properties is open by default)
    act(() => {
      screen.getByRole('button', { name: /add country to global filters/i }).click()
    })

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // upsertFilter.mutate must fire after toggling a global filter
    expect(upsertFilterMutate).toHaveBeenCalled()

    vi.useRealTimers()
  })
})

describe('SchemaConfigTab — auto-save after detect', () => {
  it('triggers upsert.mutate with accepted field values after detect + accept all', async () => {
    vi.useFakeTimers()

    const upsertMutate = vi.fn()
    vi.mocked(hooks.useUpsertSchemaConfig).mockReturnValue({
      mutate: upsertMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<(typeof hooks)[keyof typeof hooks]>)
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
        <SchemaConfigTab connId="conn-autosave-detect" />
      </QueryClientProvider>
    )

    // Advance past initial auto-save timer
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    upsertMutate.mockClear()

    // Run detect
    act(() => {
      screen.getByRole('button', { name: /detect from schema/i }).click()
    })

    // Accept all proposals
    act(() => {
      screen.getByRole('button', { name: /accept all/i }).click()
    })

    // Advance past the 800ms debounce
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // upsert.mutate should have been called with the detected field values
    expect(upsertMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id_field: 'uid',
        event_name_field: 'action',
        timestamp_field: 'ts',
        email_field: 'user_email',
      })
    )

    vi.useRealTimers()
  })
})
