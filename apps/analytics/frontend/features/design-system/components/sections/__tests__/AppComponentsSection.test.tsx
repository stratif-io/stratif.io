import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppComponentsSection } from '../AppComponentsSection'

vi.mock('@/components/DbLogo', () => ({
  DbLogo: () => <span>DbLogo</span>,
}))

function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AppComponentsSection', () => {
  it('renders a DevCard section', () => {
    render(<AppComponentsSection />, { wrapper: AllProviders })
    expect(screen.getByText(/DevCard/i)).toBeInTheDocument()
  })
})
