import { describe, it, expect, vi, beforeEach } from 'vitest'
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
        columns: ['uid', 'event_name'],
      })
    })
    expect(result.current.pendingDetections).toHaveLength(1)
    expect(result.current.pendingDetections[0].fieldKey).toBe('userIdField')
    expect(result.current.pendingDetections[0].proposedColumn).toBe('uid')
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
})
