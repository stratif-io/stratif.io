import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectionSidebar } from '../ConnectionSidebar'

const baseProps = {
  connectionName: 'my-prod-db',
  dbType: 'postgresql',
  testStatus: 'idle' as const,
  currentStep: 'credentials' as const,
  completedSteps: [] as string[],
  onStepClick: vi.fn(),
}

describe('ConnectionSidebar', () => {
  it('renders connection name and db type', () => {
    render(<ConnectionSidebar {...baseProps} />)
    expect(screen.getByText('my-prod-db')).toBeInTheDocument()
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument()
  })

  it('renders all four steps', () => {
    render(<ConnectionSidebar {...baseProps} />)
    expect(screen.getByTestId('step-nav-credentials')).toBeInTheDocument()
    expect(screen.getByTestId('step-nav-table')).toBeInTheDocument()
    expect(screen.getByTestId('step-nav-fieldmap')).toBeInTheDocument()
    expect(screen.getByTestId('step-nav-advanced')).toBeInTheDocument()
  })

  it('marks current step as active', () => {
    render(<ConnectionSidebar {...baseProps} currentStep="table" />)
    expect(screen.getByTestId('step-nav-table')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('step-nav-credentials')).toHaveAttribute('data-active', 'false')
  })

  it('marks completed steps with a checkmark', () => {
    render(<ConnectionSidebar {...baseProps} completedSteps={['credentials']} />)
    expect(screen.getByTestId('step-nav-credentials')).toHaveAttribute('data-completed', 'true')
  })

  it('calls onStepClick when a step is clicked', async () => {
    const onStepClick = vi.fn()
    render(
      <ConnectionSidebar
        {...baseProps}
        completedSteps={['credentials']}
        onStepClick={onStepClick}
      />
    )
    await userEvent.click(screen.getByTestId('step-nav-credentials'))
    expect(onStepClick).toHaveBeenCalledWith('credentials')
  })

  it('shows pulsing Testing indicator when testStatus is testing', () => {
    render(<ConnectionSidebar {...baseProps} testStatus="testing" />)
    expect(screen.getByTestId('conn-status')).toHaveTextContent(/testing/i)
  })

  it('shows green Connected when testStatus is connected', () => {
    render(<ConnectionSidebar {...baseProps} testStatus="connected" />)
    expect(screen.getByTestId('conn-status')).toHaveTextContent(/connected/i)
  })

  it('shows red Failed when testStatus is failed', () => {
    render(<ConnectionSidebar {...baseProps} testStatus="failed" />)
    expect(screen.getByTestId('conn-status')).toHaveTextContent(/failed/i)
  })

  it('shows contextual footer when tableFooter prop is provided', () => {
    render(<ConnectionSidebar {...baseProps} tableFooter="public.events" />)
    expect(screen.getByText('public.events')).toBeInTheDocument()
  })
})
