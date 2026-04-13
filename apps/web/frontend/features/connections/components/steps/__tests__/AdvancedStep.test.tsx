import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
