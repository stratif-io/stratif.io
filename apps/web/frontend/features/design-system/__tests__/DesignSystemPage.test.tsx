import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DesignSystemPage } from '../DesignSystemPage'

// Mock all sections to avoid provider / canvas issues in jsdom
vi.mock('../components/sections/PrimitivesSection', () => ({
  PrimitivesSection: () => <div>UI Primitives</div>,
}))
vi.mock('../components/sections/FeedbackSection', () => ({
  FeedbackSection: () => <div>Feedback States</div>,
}))
vi.mock('../components/sections/ChartsSection', () => ({
  ChartsSection: () => <div>Charts</div>,
}))
vi.mock('../components/sections/DataSection', () => ({
  DataSection: () => <div>Data Display</div>,
}))
vi.mock('../components/sections/AppComponentsSection', () => ({
  AppComponentsSection: () => <div>App Components</div>,
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

describe('DesignSystemPage', () => {
  it('renders all section headings', () => {
    render(<DesignSystemPage />, { wrapper })
    // Some labels appear in both the nav sidebar and the section mock — use getAllByText
    expect(screen.getAllByText('UI Primitives').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Feedback States')).toBeInTheDocument()
    expect(screen.getAllByText('Charts').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Data Display').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('App Components').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the inner nav buttons', () => {
    render(<DesignSystemPage />, { wrapper })
    expect(screen.getByRole('button', { name: 'UI Primitives' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Charts' })).toBeInTheDocument()
  })
})
