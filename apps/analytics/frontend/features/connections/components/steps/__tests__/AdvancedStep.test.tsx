import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdvancedStep } from '../AdvancedStep'

vi.mock('../../../hooks/useSchemaForm', () => ({
  useSchemaForm: vi.fn(),
}))

import { useSchemaForm } from '../../../hooks/useSchemaForm'

const baseHookReturn = {
  form: {
    sessionTimeoutMinutes: 30,
    resurrectionWindowDays: 30,
    powerUserThresholdDays: 4,
    queryTimeoutSeconds: 10,
    maxConcurrentQueries: 5,
    userIdField: '',
    eventNameField: '',
    timestampField: '',
    eventsTable: '',
    customProps: [],
    userIdentityFields: {},
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

function renderStep(onDone = vi.fn()) {
  vi.mocked(useSchemaForm).mockReturnValue(
    baseHookReturn as unknown as ReturnType<typeof useSchemaForm>
  )
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <AdvancedStep connId="conn-1" onDone={onDone} />
    </QueryClientProvider>
  )
}

describe('AdvancedStep', () => {
  it('renders session timeout field', () => {
    renderStep()
    expect(screen.getByLabelText(/session timeout/i)).toBeInTheDocument()
  })

  it('renders resurrection window field', () => {
    renderStep()
    expect(screen.getByLabelText(/resurrection window/i)).toBeInTheDocument()
  })

  it('renders power user threshold field', () => {
    renderStep()
    expect(screen.getByLabelText(/power user/i)).toBeInTheDocument()
  })

  it('renders a Done button', () => {
    renderStep()
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
  })

  it('calls onDone when Done button is clicked', async () => {
    const onDone = vi.fn()
    renderStep(onDone)
    await userEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(onDone).toHaveBeenCalled()
  })

  it('renders query timeout and max concurrent inputs with defaults', () => {
    renderStep()
    expect(screen.getByLabelText(/query timeout/i)).toHaveValue(10)
    expect(screen.getByLabelText(/max concurrent queries/i)).toHaveValue(5)
  })

  it('updates max concurrent on change', () => {
    const updateForm = vi.fn()
    vi.mocked(useSchemaForm).mockReturnValue({
      ...baseHookReturn,
      updateForm,
    } as unknown as ReturnType<typeof useSchemaForm>)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <AdvancedStep connId="conn-1" onDone={() => {}} />
      </QueryClientProvider>
    )
    const input = screen.getByLabelText(/max concurrent queries/i)
    fireEvent.change(input, { target: { value: '3' } })
    expect(updateForm).toHaveBeenCalledWith({ maxConcurrentQueries: 3 })
  })
})
