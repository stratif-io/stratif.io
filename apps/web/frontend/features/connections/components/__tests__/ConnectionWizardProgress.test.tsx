import { render, screen } from '@testing-library/react'
import { ConnectionWizardProgress } from '../ConnectionWizardProgress'

describe('ConnectionWizardProgress', () => {
  it('renders all two steps', () => {
    render(<ConnectionWizardProgress currentStep="connection" />)
    expect(screen.getByText('Connect')).toBeInTheDocument()
    expect(screen.getByText('Schema')).toBeInTheDocument()
    expect(screen.queryByText('Filters')).not.toBeInTheDocument()
  })

  it('marks current step as active', () => {
    render(<ConnectionWizardProgress currentStep="schema" />)
    expect(screen.getByTestId('step-schema')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('step-connection')).toHaveAttribute('data-completed', 'true')
  })

  it('marks connection step as completed when on schema step', () => {
    render(<ConnectionWizardProgress currentStep="schema" />)
    expect(screen.getByTestId('step-connection')).toHaveAttribute('data-completed', 'true')
    expect(screen.getByTestId('step-schema')).toHaveAttribute('data-active', 'true')
  })
})
