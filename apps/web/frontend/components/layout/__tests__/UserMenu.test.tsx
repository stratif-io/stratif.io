import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { UserMenu } from '../UserMenu'

describe('UserMenu', () => {
  it('renders username', () => {
    render(<UserMenu username="carlo" onThemeChange={vi.fn()} onSignOut={vi.fn()} />)
    expect(screen.getByText('carlo')).toBeInTheDocument()
  })

  it('opens dropdown on click', async () => {
    const user = userEvent.setup()
    render(<UserMenu username="carlo" onThemeChange={vi.fn()} onSignOut={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /carlo/i }))
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('calls onSignOut when sign out clicked', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(<UserMenu username="carlo" onThemeChange={vi.fn()} onSignOut={onSignOut} />)
    await user.click(screen.getByRole('button', { name: /carlo/i }))
    await user.click(screen.getByText('Sign out'))
    expect(onSignOut).toHaveBeenCalledOnce()
  })
})
