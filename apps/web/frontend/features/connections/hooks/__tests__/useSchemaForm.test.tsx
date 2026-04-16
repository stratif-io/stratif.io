import { describe, it, expect, vi, beforeEach } from 'vitest'
import { migrateFilterFields } from '../../utils/migrateFilterFields'
import type { FilterField, SchemaConfig } from '@/types'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSchemaForm } from '../useSchemaForm'

vi.mock('../useConnectionsData', () => ({
  useSchemaConfig: vi.fn(),
  useFilterConfig: vi.fn(),
  useUpsertSchemaConfig: vi.fn(),
  useUpsertFilterConfig: vi.fn(),
  useDetectSchema: vi.fn(),
}))

import {
  useSchemaConfig,
  useFilterConfig,
  useUpsertSchemaConfig,
  useUpsertFilterConfig,
  useDetectSchema,
} from '../useConnectionsData'

const mockSchema = {
  user_id_field: 'user_id',
  event_name_field: 'event_name',
  timestamp_field: 'created_at',
  events_table: 'public.events',
  session_timeout_minutes: 30,
  resurrection_window_days: 30,
  power_user_threshold_days: 4,
  custom_properties: [],
  email_field: null,
  first_name_field: null,
  last_name_field: null,
  date_of_birth_field: null,
  phone_field: null,
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useSchemaConfig).mockReturnValue({
    data: mockSchema,
    isLoading: false,
  } as unknown as ReturnType<typeof useSchemaConfig>)
  vi.mocked(useUpsertSchemaConfig).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useUpsertSchemaConfig>)
  vi.mocked(useDetectSchema).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useDetectSchema>)
  vi.mocked(useFilterConfig).mockReturnValue({
    data: { filter_fields: [] },
    isLoading: false,
    isSuccess: true,
  } as unknown as ReturnType<typeof useFilterConfig>)
  vi.mocked(useUpsertFilterConfig).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpsertFilterConfig>)
})

describe('useSchemaForm', () => {
  it('initializes form from server schema config', () => {
    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    expect(result.current.form.userIdField).toBe('user_id')
    expect(result.current.form.eventsTable).toBe('public.events')
  })

  it('updateForm merges patch into form state', () => {
    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    act(() => {
      result.current.updateForm({ userIdField: 'uid' })
    })
    expect(result.current.form.userIdField).toBe('uid')
  })

  it('detect creates pending detections for returned suggestions', () => {
    let detectCallback: ((data: unknown) => void) | undefined
    vi.mocked(useDetectSchema).mockReturnValue({
      mutate: vi.fn((_table: unknown, opts: { onSuccess?: (data: unknown) => void }) => {
        detectCallback = opts?.onSuccess
      }),
      isPending: false,
    } as unknown as ReturnType<typeof useDetectSchema>)

    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    act(() => {
      result.current.handleDetect()
    })
    act(() => {
      detectCallback?.({
        suggestions: { user_id_field: 'uid', event_name_field: null, timestamp_field: null },
        proposed_custom_properties: [],
        events_table: 'public.events',
        columns: [
          { name: 'uid', type: 'string' },
          { name: 'event_name', type: 'string' },
        ],
      })
    })
    expect(result.current.pendingDetections).toHaveLength(1)
    expect(result.current.pendingDetections[0].fieldKey).toBe('userIdField')
    expect(result.current.pendingDetections[0].proposedColumn).toBe('uid')
  })

  it('detect merges nested paths from proposed_custom_properties into detectedColumns', () => {
    let detectCallback: ((data: unknown) => void) | undefined
    vi.mocked(useDetectSchema).mockReturnValue({
      mutate: vi.fn((_table: unknown, opts: { onSuccess?: (data: unknown) => void }) => {
        detectCallback = opts?.onSuccess
      }),
      isPending: false,
    } as unknown as ReturnType<typeof useDetectSchema>)

    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    act(() => {
      result.current.handleDetect()
    })
    act(() => {
      detectCallback?.({
        suggestions: {},
        proposed_custom_properties: [
          { name: 'session_duration', path: 'properties.session_duration', type: 'number' },
          { name: 'plan', path: 'traits.plan', type: 'string' },
        ],
        events_table: 'public.events',
        columns: [
          { name: 'user_id', type: 'string' },
          { name: 'properties', type: 'json' },
        ],
      })
    })
    const colNames = result.current.detectedColumns.map((c) => c.name)
    expect(colNames).toContain('user_id')
    expect(colNames).toContain('properties')
    expect(colNames).toContain('properties.session_duration')
    expect(colNames).toContain('traits.plan')
  })

  it('acceptDetection applies the column and removes the pending detection', () => {
    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    act(() => {
      result.current.setPendingDetections([
        { fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' },
      ])
    })
    act(() => {
      result.current.acceptDetection('userIdField')
    })
    expect(result.current.form.userIdField).toBe('uid')
    expect(result.current.pendingDetections).toHaveLength(0)
  })

  it('rejectDetection removes the pending detection without changing form', () => {
    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    act(() => {
      result.current.setPendingDetections([
        { fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' },
      ])
    })
    act(() => {
      result.current.rejectDetection('userIdField')
    })
    expect(result.current.form.userIdField).toBe('user_id') // unchanged
    expect(result.current.pendingDetections).toHaveLength(0)
  })

  it('acceptDetection applies identity field to userIdentityFields', () => {
    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    act(() => {
      result.current.setPendingDetections([
        { fieldKey: 'email_field', label: 'Email', proposedColumn: 'email' },
      ])
    })
    act(() => {
      result.current.acceptDetection('email_field')
    })
    expect(result.current.form.userIdentityFields.email_field).toBe('email')
    expect(result.current.pendingDetections).toHaveLength(0)
  })

  it('acceptAllDetections applies multiple identity fields without dropping any', () => {
    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    act(() => {
      result.current.setPendingDetections([
        { fieldKey: 'email_field', label: 'Email', proposedColumn: 'email' },
        { fieldKey: 'phone_field', label: 'Phone', proposedColumn: 'phone_num' },
      ])
    })
    act(() => {
      result.current.acceptAllDetections()
    })
    expect(result.current.form.userIdentityFields.email_field).toBe('email')
    expect(result.current.form.userIdentityFields.phone_field).toBe('phone_num')
    expect(result.current.pendingDetections).toHaveLength(0)
  })

  it('setEnabledFields triggers upsertFilter even when filterConfig is null (new connection)', async () => {
    const upsertFilterMutate = vi.fn()
    vi.mocked(useFilterConfig).mockReturnValue({
      data: null,
      isLoading: false,
      isSuccess: true,
    } as unknown as ReturnType<typeof useFilterConfig>)
    vi.mocked(useUpsertFilterConfig).mockReturnValue({
      mutate: upsertFilterMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpsertFilterConfig>)

    const { result } = renderHook(() => useSchemaForm('conn-new'), { wrapper })
    act(() => {
      result.current.setEnabledFields({ user_id: { label: 'User ID', icon: 'Activity' } })
    })
    // Give the debounce timer a chance to fire
    await act(async () => {
      await new Promise((r) => setTimeout(r, 700))
    })
    expect(upsertFilterMutate).toHaveBeenCalledWith({
      filter_fields: [{ ref: 'user_id', field: '', label: 'User ID', icon: 'Activity' }],
    })
  })

  it('defaults queryTimeoutSeconds and maxConcurrentQueries when not in schemaConfig', () => {
    vi.mocked(useSchemaConfig).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useSchemaConfig>)
    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    expect(result.current.form.queryTimeoutSeconds).toBe(10)
    expect(result.current.form.maxConcurrentQueries).toBe(5)
  })

  it('hydrates queryTimeoutSeconds and maxConcurrentQueries from schemaConfig', () => {
    vi.mocked(useSchemaConfig).mockReturnValue({
      data: { ...mockSchema, query_timeout_seconds: 42, max_concurrent_queries: 7 },
      isLoading: false,
    } as unknown as ReturnType<typeof useSchemaConfig>)
    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    expect(result.current.form.queryTimeoutSeconds).toBe(42)
    expect(result.current.form.maxConcurrentQueries).toBe(7)
  })

  it('sends query_timeout_seconds and max_concurrent_queries on debounced save', async () => {
    const upsertMutate = vi.fn()
    vi.mocked(useUpsertSchemaConfig).mockReturnValue({
      mutate: upsertMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUpsertSchemaConfig>)
    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    act(() => {
      result.current.updateForm({ queryTimeoutSeconds: 25, maxConcurrentQueries: 3 })
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 900))
    })
    expect(upsertMutate).toHaveBeenCalledWith(
      expect.objectContaining({ query_timeout_seconds: 25, max_concurrent_queries: 3 })
    )
  })

  it('acceptAllDetections applies all pending detections', () => {
    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    act(() => {
      result.current.setPendingDetections([
        { fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' },
        { fieldKey: 'eventNameField', label: 'Event Name', proposedColumn: 'action' },
      ])
    })
    act(() => {
      result.current.acceptAllDetections()
    })
    expect(result.current.form.userIdField).toBe('uid')
    expect(result.current.form.eventNameField).toBe('action')
    expect(result.current.pendingDetections).toHaveLength(0)
  })

  it('enabledFields is keyed by ref after loading filterConfig', () => {
    vi.mocked(useFilterConfig).mockReturnValue({
      data: {
        filter_fields: [{ ref: 'abc-123', field: '', label: 'Country', icon: 'globe' }],
      },
      isLoading: false,
      isSuccess: true,
    } as unknown as ReturnType<typeof useFilterConfig>)
    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    expect(result.current.enabledFields['abc-123']).toEqual({ label: 'Country', icon: 'globe' })
  })

  it('toggleFilter adds a ref key to enabledFields', () => {
    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    act(() => {
      result.current.toggleFilter('abc-123', 'Country', 'globe')
    })
    expect(result.current.enabledFields['abc-123']).toEqual({ label: 'Country', icon: 'globe' })
  })

  it('toggleFilter removes an existing ref key from enabledFields', () => {
    const { result } = renderHook(() => useSchemaForm('conn-1'), { wrapper })
    act(() => {
      result.current.toggleFilter('abc-123', 'Country', 'globe')
    })
    act(() => {
      result.current.toggleFilter('abc-123', 'Country', 'globe')
    })
    expect(result.current.enabledFields['abc-123']).toBeUndefined()
  })
})

const baseSchema: SchemaConfig = {
  id: 'schema-1',
  connection_id: 'conn-1',
  user_id_field: 'user_id',
  event_name_field: 'event_name',
  timestamp_field: 'created_at',
  events_table: 'public.events',
  custom_properties: [],
  session_timeout_minutes: 30,
  updated_at: '2024-01-01T00:00:00Z',
}

describe('migrateFilterFields', () => {
  it('passes through already-migrated entries', () => {
    const ff: FilterField[] = [{ ref: 'abc-123', field: '', label: 'Country', icon: 'globe' }]
    const result = migrateFilterFields(ff, baseSchema)
    expect(result).toEqual(ff)
  })

  it('migrates legacy entry matching a custom property by path', () => {
    const schema: SchemaConfig = {
      ...baseSchema,
      custom_properties: [
        { id: 'abc-123', name: 'Country', path: 'context.country', type: 'string' },
      ],
    }
    const ff: FilterField[] = [
      { ref: '', field: 'context.country', label: 'Country', icon: 'globe' },
    ]
    const result = migrateFilterFields(ff, schema)
    expect(result).toEqual([{ ref: 'abc-123', field: '', label: 'Country', icon: 'globe' }])
  })

  it('migrates legacy entry matching a system field by value', () => {
    const ff: FilterField[] = [{ ref: '', field: 'user_id', label: 'User ID', icon: 'user' }]
    const result = migrateFilterFields(ff, baseSchema)
    expect(result).toEqual([{ ref: '$user_id_field', field: '', label: 'User ID', icon: 'user' }])
  })

  it('drops orphaned entries with no match', () => {
    const ff: FilterField[] = [{ ref: '', field: 'nonexistent', label: 'X', icon: 'x' }]
    const result = migrateFilterFields(ff, baseSchema)
    expect(result).toEqual([])
  })
})
