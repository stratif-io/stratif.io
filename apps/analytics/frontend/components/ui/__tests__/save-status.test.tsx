import { render, screen } from '@testing-library/react'
import { SaveStatus } from '../save-status'

describe('SaveStatus', () => {
  it('renders nothing when status is idle', () => {
    const { container } = render(<SaveStatus status="idle" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows saving indicator', () => {
    render(<SaveStatus status="saving" />)
    expect(screen.getByText(/saving/i)).toBeInTheDocument()
  })

  it('shows saved indicator', () => {
    render(<SaveStatus status="saved" />)
    expect(screen.getByText(/saved/i)).toBeInTheDocument()
  })

  it('shows error with retry button', () => {
    const onRetry = vi.fn()
    render(<SaveStatus status="error" onRetry={onRetry} />)
    expect(screen.getByText(/failed/i)).toBeInTheDocument()
    screen.getByRole('button', { name: /retry/i }).click()
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
