import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from '../Sidebar'

vi.mock('@/stores/app-store', () => ({
  useAppStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      activeConnectionId: 'conn-1',
      theme: 'system' as const,
      setTheme: vi.fn(),
      sidebarOpen: true,
      setSidebarOpen: vi.fn(),
      devMode: false,
      setDevMode: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

describe('Sidebar', () => {
  it('renders ANALYTICS section label', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Analytics')).toBeInTheDocument()
  })

  it('renders DATA section label', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Data')).toBeInTheDocument()
  })

  it('renders SETTINGS section label', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })
})
