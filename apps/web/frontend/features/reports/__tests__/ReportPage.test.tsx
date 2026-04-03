import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/api'
import { ReportPage } from '../ReportPage'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/api/reports', () => ({
  useReport: (shortcode: string) => ({
    data: {
      shortcode,
      name: 'User growth — April 2026',
      page: 'trends',
      params: {},
      access: 'public',
      snapshot: true,
      snapshot_data: null,
      created_at: '2026-04-03T10:00:00Z',
      created_by_username: 'carlo',
    },
    isLoading: false,
    error: null,
  }),
}))

function renderWithRouter(shortcode = 'abc123') {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/r/${shortcode}`]}>
        <Routes>
          <Route path="/r/:shortcode" element={<ReportPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders report name', () => {
    renderWithRouter()
    expect(screen.getByText('User growth — April 2026')).toBeInTheDocument()
  })

  it('shows shared by attribution', () => {
    renderWithRouter()
    expect(screen.getByText(/shared by carlo/i)).toBeInTheDocument()
  })

  it('shows Powered by stratif.io footer', () => {
    renderWithRouter()
    expect(screen.getByText(/powered by/i)).toBeInTheDocument()
    expect(screen.getByText('stratif.io')).toBeInTheDocument()
  })

  it('shows Open in app link', () => {
    renderWithRouter()
    expect(screen.getByRole('link', { name: /open in app/i })).toBeInTheDocument()
  })

  it('has no sidebar', () => {
    renderWithRouter()
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument()
  })
})
