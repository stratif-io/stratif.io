import { render, screen } from '@testing-library/react'
import { ConnectionWizardProgress } from '../ConnectionWizardProgress'

describe('ConnectionWizardProgress', () => {
  it('renders all three steps', () => {
    render(<ConnectionWizardProgress currentStep="connection" />)
    expect(screen.getByText('Connect')).toBeInTheDocument()
    expect(screen.getByText('Schema')).toBeInTheDocument()
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('marks current step as active', () => {
    render(<ConnectionWizardProgress currentStep="schema" />)
    expect(screen.getByTestId('step-schema')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('step-connection')).toHaveAttribute('data-completed', 'true')
    expect(screen.getByTestId('step-filters')).toHaveAttribute('data-active', 'false')
  })

  it('marks completed steps when on filters step', () => {
    render(<ConnectionWizardProgress currentStep="filters" />)
    expect(screen.getByTestId('step-connection')).toHaveAttribute('data-completed', 'true')
    expect(screen.getByTestId('step-schema')).toHaveAttribute('data-completed', 'true')
  })
})
