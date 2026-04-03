import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConnectionIndicator } from '../ConnectionIndicator'

describe('ConnectionIndicator', () => {
  it('shows connection name when connected', () => {
    render(<ConnectionIndicator connectionName="production.duckdb" onClick={vi.fn()} />)
    expect(screen.getByText('production.duckdb')).toBeInTheDocument()
  })

  it('shows green dot when connected', () => {
    render(<ConnectionIndicator connectionName="production.duckdb" onClick={vi.fn()} />)
    expect(screen.getByTestId('connection-dot')).toHaveClass('bg-green-500')
  })

  it('shows connect prompt when no connection', () => {
    render(<ConnectionIndicator connectionName={null} onClick={vi.fn()} />)
    expect(screen.getByText('Connect database')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<ConnectionIndicator connectionName="db" onClick={onClick} />)
    screen.getByRole('button').click()
    expect(onClick).toHaveBeenCalledOnce()
  })
})
