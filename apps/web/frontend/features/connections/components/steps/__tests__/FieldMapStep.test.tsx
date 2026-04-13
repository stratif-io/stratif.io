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
  upsertFilter: { isPending: false, isSuccess: false, isError: false },
}

function renderStep(overrides = {}) {
  vi.mocked(useSchemaForm).mockReturnValue({
    ...baseHookReturn,
    ...overrides,
  } as unknown as ReturnType<typeof useSchemaForm>)
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <FieldMapStep connId="conn-1" />
    </QueryClientProvider>
  )
}

beforeEach(() => vi.clearAllMocks())

describe('FieldMapStep', () => {
  it('renders all three required field rows', () => {
    renderStep()
    expect(screen.getByTestId('field-row-userIdField')).toBeInTheDocument()
    expect(screen.getByTestId('field-row-eventNameField')).toBeInTheDocument()
    expect(screen.getByTestId('field-row-timestampField')).toBeInTheDocument()
  })

  it('shows detect button when eventsTable is set', () => {
    renderStep()
    expect(screen.getByTestId('detect-btn')).toBeInTheDocument()
  })

  it('hides detect button when eventsTable is empty', () => {
    renderStep({ form: { ...baseHookReturn.form, eventsTable: '' } })
    expect(screen.queryByTestId('detect-btn')).not.toBeInTheDocument()
  })

  it('calls handleDetect when detect button clicked', async () => {
    const handleDetect = vi.fn()
    renderStep({ handleDetect })
    await userEvent.click(screen.getByTestId('detect-btn'))
    expect(handleDetect).toHaveBeenCalled()
  })

  it('shows detect banner when pendingDetections present', () => {
    renderStep({
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    })
    expect(screen.getByTestId('detect-banner')).toBeInTheDocument()
    expect(screen.getByText(/1 field.*detected/i)).toBeInTheDocument()
  })

  it('does not show detect banner when no pendingDetections', () => {
    renderStep()
    expect(screen.queryByTestId('detect-banner')).not.toBeInTheDocument()
  })

  it('calls acceptAllDetections when Accept all clicked in banner', async () => {
    const acceptAllDetections = vi.fn()
    renderStep({
      acceptAllDetections,
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    })
    await userEvent.click(screen.getByRole('button', { name: /accept all/i }))
    expect(acceptAllDetections).toHaveBeenCalled()
  })

  it('clears pendingDetections when Dismiss clicked in banner', async () => {
    const setPendingDetections = vi.fn()
    renderStep({
      setPendingDetections,
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    })
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(setPendingDetections).toHaveBeenCalledWith([])
  })

  it('shows required field count in section header', () => {
    renderStep()
    // user_id, event_name, created_at all mapped → 3/3
    expect(screen.getByText('3 / 3 mapped')).toBeInTheDocument()
  })

  it('shows amber suggested row for pending required field', () => {
    renderStep({
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    })
    expect(screen.getByTestId('field-row-userIdField')).toHaveAttribute('data-suggested', 'true')
  })

  it('calls acceptDetection when ✓ clicked on suggested required row', async () => {
    const acceptDetection = vi.fn()
    renderStep({
      acceptDetection,
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    })
    await userEvent.click(screen.getByTestId('accept-userIdField'))
    expect(acceptDetection).toHaveBeenCalledWith('userIdField')
  })

  it('renders identity field rows', () => {
    renderStep()
    expect(screen.getByTestId('identity-row-email_field')).toBeInTheDocument()
  })

  it('renders property cards for customProps', () => {
    renderStep({
      form: {
        ...baseHookReturn.form,
        customProps: [
          { id: 'p1', name: 'Plan', path: 'traits.plan', type: 'string', category: 'user' },
        ],
      },
    })
    expect(screen.getByDisplayValue('Plan')).toBeInTheDocument()
  })

  it('shows save status', () => {
    renderStep({ upsert: { isPending: true, isSuccess: false, isError: false } })
    expect(screen.getByTestId('save-status')).toBeInTheDocument()
  })
})
