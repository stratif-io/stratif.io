import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { DevCard } from '../DevCard'
import { useAppStore } from '@/stores'

function setDevMode(enabled: boolean) {
  useAppStore.setState({ devMode: enabled })
}

beforeEach(() => {
  setDevMode(false)
})

describe('DevCard', () => {
  it('renders children with no badge when devMode is off', () => {
    render(<DevCard sql="SELECT 1"><div>content</div></DevCard>)
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.queryByLabelText('Show SQL')).not.toBeInTheDocument()
  })

  it('renders SQL badge when devMode is on', () => {
    setDevMode(true)
    render(<DevCard sql="SELECT 1"><div>content</div></DevCard>)
    expect(screen.getByLabelText('Show SQL')).toBeInTheDocument()
  })

  it('flips to show SQL when badge is clicked', () => {
    setDevMode(true)
    render(<DevCard sql="SELECT 1 FROM events"><div>content</div></DevCard>)
    fireEvent.click(screen.getByLabelText('Show SQL'))
    expect(screen.getByText('SELECT 1 FROM events')).toBeInTheDocument()
    expect(screen.getByLabelText('Close SQL')).toBeInTheDocument()
  })

  it('flips back when close button is clicked', () => {
    setDevMode(true)
    render(<DevCard sql="SELECT 1"><div>content</div></DevCard>)
    fireEvent.click(screen.getByLabelText('Show SQL'))
    fireEvent.click(screen.getByLabelText('Close SQL'))
    expect(screen.queryByLabelText('Close SQL')).not.toBeInTheDocument()
  })

  it('renders multiple SQL blocks when sql is an array', () => {
    setDevMode(true)
    render(<DevCard sql={['SELECT 1', 'SELECT 2']}><div>content</div></DevCard>)
    fireEvent.click(screen.getByLabelText('Show SQL'))
    expect(screen.getByText('SELECT 1')).toBeInTheDocument()
    expect(screen.getByText('SELECT 2')).toBeInTheDocument()
    expect(screen.getByText('-- Query 1')).toBeInTheDocument()
    expect(screen.getByText('-- Query 2')).toBeInTheDocument()
  })

  it('renders SQL badge even when sql is null', () => {
    setDevMode(true)
    render(<DevCard sql={null}><div>content</div></DevCard>)
    expect(screen.getByLabelText('Show SQL')).toBeInTheDocument()
  })
})
