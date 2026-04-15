import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryStatusIndicator } from '../QueryStatusIndicator'
import { useAppStore } from '@/stores'
import { IDLE_DISMISS_DELAY_MS } from '@/lib/api/semaphore'

beforeEach(() => {
  vi.useFakeTimers()
  useAppStore.setState({
    runningQueries: 0,
    queuedQueries: 0,
    queryEverActive: false,
    queryHistory: [],
    queryLog: [],
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('QueryStatusIndicator', () => {
  it('renders nothing when never active', () => {
    render(<QueryStatusIndicator />)
    expect(screen.getByRole('status', { hidden: true })).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows running and queued counts when active', () => {
    useAppStore.setState({ runningQueries: 3, queuedQueries: 2, queryEverActive: true })
    render(<QueryStatusIndicator />)
    expect(screen.getByText(/3 running/)).toBeInTheDocument()
    expect(screen.getByText(/2 queued/)).toBeInTheDocument()
  })

  it('shows "all done" when counts drop to zero after being active', () => {
    useAppStore.setState({ runningQueries: 1, queuedQueries: 0, queryEverActive: true })
    render(<QueryStatusIndicator />)
    act(() => {
      useAppStore.setState({ runningQueries: 0, queuedQueries: 0 })
    })
    expect(screen.getByText(/all done/i)).toBeInTheDocument()
  })

  it('starts fading after IDLE_DISMISS_DELAY_MS when done', () => {
    useAppStore.setState({ runningQueries: 0, queuedQueries: 0, queryEverActive: true })
    render(<QueryStatusIndicator />)
    expect(screen.getByText(/all done/i)).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(IDLE_DISMISS_DELAY_MS + 10)
    })
    const pill = screen.getByRole('status')
    expect(pill.className).toContain('opacity-0')
  })

  it('reappears when queries become active again after dismissal', () => {
    useAppStore.setState({ runningQueries: 0, queuedQueries: 0, queryEverActive: true })
    const { rerender } = render(<QueryStatusIndicator />)
    act(() => {
      vi.advanceTimersByTime(IDLE_DISMISS_DELAY_MS + 400)
    })
    act(() => {
      useAppStore.setState({ runningQueries: 1, queuedQueries: 0 })
    })
    rerender(<QueryStatusIndicator />)
    expect(screen.getByText(/1 running/)).toBeInTheDocument()
  })

  it('opens a popover listing query history on click', async () => {
    vi.useRealTimers()
    useAppStore.setState({
      runningQueries: 1,
      queuedQueries: 0,
      queryEverActive: true,
      queryHistory: [
        {
          id: 'a',
          cardName: 'Events',
          querySnippet: 'SELECT 1',
          startedAt: Date.now(),
          status: 'running',
        },
        {
          id: 'b',
          cardName: 'Users',
          querySnippet: 'SELECT 2',
          startedAt: Date.now() - 1000,
          finishedAt: Date.now(),
          status: 'done',
        },
      ],
    })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <QueryStatusIndicator />
      </MemoryRouter>
    )
    const trigger = screen.getByRole('button')
    await user.click(trigger)
    expect(await screen.findByText('Events')).toBeInTheDocument()
    expect(screen.getByText('Users')).toBeInTheDocument()
  })
})
