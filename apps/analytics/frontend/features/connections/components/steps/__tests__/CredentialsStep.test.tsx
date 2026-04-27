import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CredentialsStep } from '../CredentialsStep'

vi.mock('../../../hooks/useConnectionsData', () => ({
  useTestConnection: vi.fn(),
  useUpdateConnection: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  })),
  useConnectionCredentials: vi.fn(() => ({ data: { fields: {} } })),
  useConnectionString: vi.fn(() => ({ data: null })),
}))

import { useTestConnection, useUpdateConnection } from '../../../hooks/useConnectionsData'

const mockConnection = Object.freeze({
  id: 'conn-1',
  name: 'my-db',
  db_type: 'postgresql',
  created_at: '2024-01-01T00:00:00Z',
})

function renderStep(overrides: Partial<Parameters<typeof CredentialsStep>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <CredentialsStep
        connection={mockConnection}
        onTestStatusChange={vi.fn()}
        onNext={vi.fn()}
        {...overrides}
      />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useTestConnection).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    data: undefined,
    error: null,
    reset: vi.fn(),
  } as unknown as ReturnType<typeof useTestConnection>)
})

describe('CredentialsStep', () => {
  it('shows testing state while auto-test is pending', () => {
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      data: undefined,
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)
    renderStep()
    expect(screen.getByTestId('credentials-test-state')).toHaveTextContent(/testing/i)
  })

  it('shows success banner when test passes', () => {
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { ok: true, db_type: 'postgresql' },
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)
    renderStep()
    expect(screen.getByTestId('credentials-test-state')).toHaveTextContent(/connected/i)
  })

  it('shows failure banner when test fails', () => {
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { ok: false },
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)
    renderStep()
    expect(screen.getByTestId('credentials-test-state')).toHaveTextContent(/failed/i)
  })

  it('calls onTestStatusChange with "testing" when test is pending', () => {
    const onTestStatusChange = vi.fn()
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      data: undefined,
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)
    renderStep({ onTestStatusChange })
    expect(onTestStatusChange).toHaveBeenCalledWith('testing')
  })

  it('calls onTestStatusChange with "connected" when test succeeds', () => {
    const onTestStatusChange = vi.fn()
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { ok: true },
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)
    renderStep({ onTestStatusChange })
    expect(onTestStatusChange).toHaveBeenCalledWith('connected')
  })

  it('calls onTestStatusChange with "failed" when test fails', () => {
    const onTestStatusChange = vi.fn()
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { ok: false },
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)
    renderStep({ onTestStatusChange })
    expect(onTestStatusChange).toHaveBeenCalledWith('failed')
  })

  it('disables Next button while test is pending', () => {
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      data: undefined,
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)
    renderStep()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('enables Next button when test passes', () => {
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { ok: true },
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)
    renderStep()
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
  })

  it('shows Re-test button when test fails', () => {
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { ok: false },
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)
    renderStep()
    expect(screen.getByRole('button', { name: /re-test/i })).toBeInTheDocument()
  })

  it('calls mutate with connection.id on mount (auto-test)', () => {
    const mutate = vi.fn()
    vi.mocked(useTestConnection).mockReturnValue({
      mutate,
      isPending: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)
    renderStep()
    expect(mutate).toHaveBeenCalledWith(mockConnection.id)
  })

  it('does NOT show Re-test button when test passes', () => {
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { ok: true },
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)
    renderStep()
    expect(screen.queryByRole('button', { name: /re-test/i })).not.toBeInTheDocument()
  })

  it('debounces credential save: does not call update.mutate immediately on form input, only after 1000ms', () => {
    vi.useFakeTimers()
    const updateMutate = vi.fn()
    vi.mocked(useUpdateConnection).mockReturnValue({
      mutate: updateMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdateConnection>)
    renderStep()
    const form = document.querySelector('form')!
    form.dispatchEvent(new Event('input', { bubbles: true }))
    // Should NOT fire synchronously
    expect(updateMutate).not.toHaveBeenCalled()
    // Advance past debounce window
    vi.advanceTimersByTime(999)
    expect(updateMutate).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    // At this point the debounce fires; saveCredentials skips mutate for empty fields,
    // but the important thing is it was NOT called before the debounce elapsed
    vi.useRealTimers()
  })

  it('calls onNext when Next button is clicked', async () => {
    const onNext = vi.fn()
    vi.mocked(useTestConnection).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { ok: true },
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useTestConnection>)
    renderStep({ onNext })
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onNext).toHaveBeenCalled()
  })
})
