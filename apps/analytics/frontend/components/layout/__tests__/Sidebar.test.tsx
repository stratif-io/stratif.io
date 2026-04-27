import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '../Sidebar'

function AllProviders({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TooltipProvider>{children}</TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Sidebar', () => {
  it('renders Funnel nav item', () => {
    render(<Sidebar />, { wrapper: AllProviders })
    expect(screen.getByRole('button', { name: /funnel/i })).toBeInTheDocument()
  })

  it('renders SQL Studio without any dev mode condition', () => {
    render(<Sidebar />, { wrapper: AllProviders })
    expect(screen.getByRole('button', { name: /sql studio/i })).toBeInTheDocument()
  })
})
