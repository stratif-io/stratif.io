import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { OnboardingPage } from '../OnboardingPage'

describe('OnboardingPage', () => {
  it('renders welcome headline', () => {
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Welcome to stratif.io')).toBeInTheDocument()
  })

  it('renders the 3-step checklist', () => {
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Connect your warehouse')).toBeInTheDocument()
    expect(screen.getByText('Map your events table')).toBeInTheDocument()
    expect(screen.getByText('Explore your data')).toBeInTheDocument()
  })

  it('renders the primary CTA', () => {
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /connect your first database/i })).toBeInTheDocument()
  })
})
