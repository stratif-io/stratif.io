import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FieldMapStep } from '../FieldMapStep'

vi.mock('../../../hooks/useSchemaForm', () => ({
  useSchemaForm: vi.fn(),
}))

import { useSchemaForm } from '../../../hooks/useSchemaForm'

const baseHookReturn = {
  form: {
    userIdField: 'user_id',
    eventNameField: 'event_name',
    timestampField: 'created_at',
    eventsTable: 'public.events',
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
}

function renderStep() {
  vi.mocked(useSchemaForm).mockReturnValue(
    baseHookReturn as unknown as ReturnType<typeof useSchemaForm>
  )
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <FieldMapStep connId="conn-1" />
    </QueryClientProvider>
  )
}

beforeEach(() => vi.clearAllMocks())

describe('FieldMapStep', () => {
  it('shows Detect from schema button when eventsTable is set', () => {
    renderStep()
    expect(screen.getByTestId('detect-btn')).toBeInTheDocument()
  })

  it('hides Detect from schema button when eventsTable is empty', () => {
    vi.mocked(useSchemaForm).mockReturnValue({
      ...baseHookReturn,
      form: { ...baseHookReturn.form, eventsTable: '' },
    } as unknown as ReturnType<typeof useSchemaForm>)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <FieldMapStep connId="conn-1" />
      </QueryClientProvider>
    )
    expect(screen.queryByTestId('detect-btn')).not.toBeInTheDocument()
  })

  it('calls handleDetect when Detect button is clicked', async () => {
    const handleDetect = vi.fn()
    vi.mocked(useSchemaForm).mockReturnValue({
      ...baseHookReturn,
      handleDetect,
    } as unknown as ReturnType<typeof useSchemaForm>)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <FieldMapStep connId="conn-1" />
      </QueryClientProvider>
    )
    await userEvent.click(screen.getByTestId('detect-btn'))
    expect(handleDetect).toHaveBeenCalled()
  })

  it('renders required field rows', () => {
    renderStep()
    expect(screen.getByTestId('field-row-userIdField')).toBeInTheDocument()
    expect(screen.getByTestId('field-row-eventNameField')).toBeInTheDocument()
    expect(screen.getByTestId('field-row-timestampField')).toBeInTheDocument()
  })

  it('shows amber suggestion row when pending detection exists', () => {
    vi.mocked(useSchemaForm).mockReturnValue({
      ...baseHookReturn,
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    } as unknown as ReturnType<typeof useSchemaForm>)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <FieldMapStep connId="conn-1" />
      </QueryClientProvider>
    )
    const row = screen.getByTestId('field-row-userIdField')
    expect(row).toHaveAttribute('data-suggested', 'true')
    expect(row).toHaveTextContent('uid')
  })

  it('calls acceptDetection when ✓ button is clicked on a pending row', async () => {
    const acceptDetection = vi.fn()
    vi.mocked(useSchemaForm).mockReturnValue({
      ...baseHookReturn,
      acceptDetection,
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    } as unknown as ReturnType<typeof useSchemaForm>)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <FieldMapStep connId="conn-1" />
      </QueryClientProvider>
    )
    await userEvent.click(screen.getByTestId('accept-userIdField'))
    expect(acceptDetection).toHaveBeenCalledWith('userIdField')
  })

  it('calls rejectDetection when ✕ button is clicked on a pending row', async () => {
    const rejectDetection = vi.fn()
    vi.mocked(useSchemaForm).mockReturnValue({
      ...baseHookReturn,
      rejectDetection,
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    } as unknown as ReturnType<typeof useSchemaForm>)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <FieldMapStep connId="conn-1" />
      </QueryClientProvider>
    )
    await userEvent.click(screen.getByTestId('reject-userIdField'))
    expect(rejectDetection).toHaveBeenCalledWith('userIdField')
  })

  it('shows Accept All button when there are pending detections', () => {
    vi.mocked(useSchemaForm).mockReturnValue({
      ...baseHookReturn,
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    } as unknown as ReturnType<typeof useSchemaForm>)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <FieldMapStep connId="conn-1" />
      </QueryClientProvider>
    )
    expect(screen.getByRole('button', { name: /accept all/i })).toBeInTheDocument()
  })

  it('shows save status indicator in header', () => {
    vi.mocked(useSchemaForm).mockReturnValue({
      ...baseHookReturn,
      upsert: { isPending: true, isSuccess: false, isError: false },
    } as unknown as ReturnType<typeof useSchemaForm>)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <FieldMapStep connId="conn-1" />
      </QueryClientProvider>
    )
    expect(screen.getByTestId('save-status')).toBeInTheDocument()
  })

  it('calls acceptAllDetections when Accept All is clicked', async () => {
    const acceptAllDetections = vi.fn()
    vi.mocked(useSchemaForm).mockReturnValue({
      ...baseHookReturn,
      acceptAllDetections,
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    } as unknown as ReturnType<typeof useSchemaForm>)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <FieldMapStep connId="conn-1" />
      </QueryClientProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: /accept all/i }))
    expect(acceptAllDetections).toHaveBeenCalled()
  })
})
