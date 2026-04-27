import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotFoundPage } from '../NotFoundPage'

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

describe('NotFoundPage', () => {
  it('renders the witty heading', () => {
    render(<NotFoundPage />, { wrapper })
    expect(screen.getByText('Nothing to chart here')).toBeInTheDocument()
  })

  it('renders the subtext', () => {
    render(<NotFoundPage />, { wrapper })
    expect(screen.getByText(/This page has zero data points/i)).toBeInTheDocument()
  })

  it('renders a link back to dashboard', () => {
    render(<NotFoundPage />, { wrapper })
    const link = screen.getByRole('link', { name: /back to dashboard/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/dashboard')
  })

  it('renders a link to docs', () => {
    render(<NotFoundPage />, { wrapper })
    expect(screen.getByRole('link', { name: /view docs/i })).toBeInTheDocument()
  })
})
