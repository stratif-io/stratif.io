import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ShareModal } from '../ShareModal'

vi.mock('@/lib/api/reports', () => ({
  useCreateReport: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ shortcode: 'abc123', id: 'r1' }),
    isPending: false,
  }),
}))

function renderModal(props?: Partial<React.ComponentProps<typeof ShareModal>>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <ShareModal
          open={true}
          onClose={vi.fn()}
          page="trends"
          pageLabel="Trends"
          params={{ dateRange: '30d' }}
          {...props}
        />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

describe('ShareModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders report name input', () => {
    renderModal()
    expect(screen.getByLabelText(/report name/i)).toBeInTheDocument()
  })

  it('pre-fills report name with page label', () => {
    renderModal({ pageLabel: 'Trends' })
    const input = screen.getByLabelText(/report name/i) as HTMLInputElement
    expect(input.value).toContain('Trends')
  })

  it('renders access options', () => {
    renderModal()
    expect(screen.getByText('Anyone on this instance')).toBeInTheDocument()
    expect(screen.getByText('Logged-in users only')).toBeInTheDocument()
  })

  it('renders snapshot/live options', () => {
    renderModal()
    expect(screen.getByText('Snapshot')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('shows generated link after create', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /create report/i }))
    await waitFor(() => {
      expect(screen.getByText(/abc123/)).toBeInTheDocument()
    })
  })

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
