import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyCard } from '../PropertyCard'

const baseProp = {
  id: 'prop-1',
  name: 'Session Duration',
  path: 'properties.session_duration',
  type: 'number' as const,
  category: 'sessions',
}

const baseProps = {
  prop: baseProp,
  colNames: ['properties.session_duration', 'traits.plan'],
  filterEnabled: false,
  onFilterToggle: vi.fn(),
  onChange: vi.fn(),
  onRemove: vi.fn(),
}

describe('PropertyCard', () => {
  it('renders the property name', () => {
    render(<PropertyCard {...baseProps} />)
    expect(screen.getByDisplayValue('Session Duration')).toBeInTheDocument()
  })

  it('renders the type badge', () => {
    render(<PropertyCard {...baseProps} />)
    expect(screen.getByRole('button', { name: /type: number/i })).toBeInTheDocument()
  })

  it('calls onChange when name is edited', async () => {
    const onChange = vi.fn()
    render(<PropertyCard {...baseProps} onChange={onChange} />)
    const input = screen.getByDisplayValue('Session Duration')
    await userEvent.clear(input)
    await userEvent.type(input, 'Duration')
    // onChange called for each keystroke — just verify it was called with name patch
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: expect.any(String) }))
  })

  it('calls onRemove when Delete property is clicked in menu', async () => {
    const onRemove = vi.fn()
    render(<PropertyCard {...baseProps} onRemove={onRemove} />)
    await userEvent.click(screen.getByLabelText(/property options/i))
    await userEvent.click(screen.getByText(/delete property/i))
    expect(onRemove).toHaveBeenCalled()
  })

  it('cycles type on badge click', async () => {
    const onChange = vi.fn()
    render(<PropertyCard {...baseProps} onChange={onChange} />)
    // current type = 'number', next = 'boolean'
    await userEvent.click(screen.getByRole('button', { name: /type: number/i }))
    expect(onChange).toHaveBeenCalledWith({ type: 'boolean' })
  })
})
