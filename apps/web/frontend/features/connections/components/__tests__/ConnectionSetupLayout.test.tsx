import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionSetupLayout } from '../ConnectionSetupLayout'
import type { ConnectionStep, TestStatus } from '../ConnectionSidebar'

const baseProps = {
  connectionName: 'my-db',
  dbType: 'postgresql',
  testStatus: 'connected' as TestStatus,
  currentStep: 'credentials' as ConnectionStep,
  completedSteps: [] as ConnectionStep[],
  onStepClick: vi.fn(),
}

describe('ConnectionSetupLayout', () => {
  it('renders the sidebar', () => {
    render(
      <ConnectionSetupLayout {...baseProps}>
        <div>panel content</div>
      </ConnectionSetupLayout>
    )
    expect(screen.getByTestId('conn-status')).toBeInTheDocument()
  })

  it('renders children in the content panel', () => {
    render(
      <ConnectionSetupLayout {...baseProps}>
        <div data-testid="panel-child">hello</div>
      </ConnectionSetupLayout>
    )
    expect(screen.getByTestId('panel-child')).toBeInTheDocument()
  })

  it('passes tableFooter to sidebar', () => {
    render(
      <ConnectionSetupLayout {...baseProps} tableFooter="public.events">
        <div />
      </ConnectionSetupLayout>
    )
    expect(screen.getByText('public.events')).toBeInTheDocument()
  })
})
