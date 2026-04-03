import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { OnboardingGuard } from '../OnboardingGuard'

vi.mock('@/stores/app-store', () => ({
  useAppStore: vi.fn(),
}))

import { useAppStore } from '@/stores/app-store'

describe('OnboardingGuard', () => {
  it('redirects to /onboarding when no active connection', () => {
    vi.mocked(useAppStore).mockReturnValue({ activeConnectionId: null } as ReturnType<
      typeof useAppStore
    >)
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<OnboardingGuard />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
          <Route path="/onboarding" element={<div>Onboarding</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Onboarding')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('renders children when connection exists', () => {
    vi.mocked(useAppStore).mockReturnValue({ activeConnectionId: 'conn-1' } as ReturnType<
      typeof useAppStore
    >)
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<OnboardingGuard />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
          <Route path="/onboarding" element={<div>Onboarding</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Onboarding')).not.toBeInTheDocument()
  })
})
