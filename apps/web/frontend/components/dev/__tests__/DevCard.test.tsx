import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { useAppStore } from '@/stores'

// ── Mock heavy CodeMirror deps before importing DevCard ──────────────────────
vi.mock('@codemirror/view', () => {
  class EditorView {
    static theme = vi.fn(() => null)
    static lineWrapping = null
    constructor() {}
    destroy() {}
  }
  return { EditorView }
})
vi.mock('@codemirror/state', () => ({
  EditorState: {
    create: vi.fn(() => ({})),
    readOnly: { of: vi.fn(() => null) },
  },
}))
vi.mock('@codemirror/lang-sql', () => ({ sql: vi.fn(() => null) }))
vi.mock('@codemirror/language', () => ({
  syntaxHighlighting: vi.fn(() => null),
  defaultHighlightStyle: null,
}))
vi.mock('@codemirror/theme-one-dark', () => ({ oneDark: null }))
vi.mock('sql-formatter', () => ({ format: (s: string) => s }))

// ── Mock framer-motion ───────────────────────────────────────────────────────
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children?: React.ReactNode
      initial?: unknown
      animate?: unknown
      exit?: unknown
      transition?: unknown
    }) => React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}))

// ── Mock useNavigate ─────────────────────────────────────────────────────────
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Import after mocks
import { DevCard } from '../DevCard'

function setDevMode(enabled: boolean) {
  useAppStore.setState({ devMode: enabled })
}

function renderCard(props: { sql?: string | string[] | null; children?: React.ReactNode } = {}) {
  return render(
    <MemoryRouter>
      <DevCard sql={props.sql !== undefined ? props.sql : 'SELECT 1'}>
        {props.children ?? <div>content</div>}
      </DevCard>
    </MemoryRouter>
  )
}

beforeEach(() => {
  setDevMode(false)
  mockNavigate.mockClear()
  useAppStore.setState({ pendingQueryStudioSql: null })
})

describe('DevCard', () => {
  it('renders children with no SQL badge when devMode is off', () => {
    renderCard()
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.queryByLabelText('Show SQL')).not.toBeInTheDocument()
  })

  it('renders SQL badge when devMode is on', () => {
    setDevMode(true)
    renderCard()
    expect(screen.getByLabelText('Show SQL')).toBeInTheDocument()
  })

  it('flips to show SQL when badge is clicked', () => {
    setDevMode(true)
    renderCard({ sql: 'SELECT 1 FROM events' })
    fireEvent.click(screen.getByLabelText('Show SQL'))
    expect(screen.getByLabelText('Close SQL')).toBeInTheDocument()
  })

  it('flips back when close button is clicked', () => {
    setDevMode(true)
    renderCard()
    fireEvent.click(screen.getByLabelText('Show SQL'))
    fireEvent.click(screen.getByLabelText('Close SQL'))
    expect(screen.queryByLabelText('Close SQL')).not.toBeInTheDocument()
  })

  it('pressing Escape collapses the expanded (full-screen) overlay', () => {
    setDevMode(true)
    renderCard()
    // Flip to back face first
    fireEvent.click(screen.getByLabelText('Show SQL'))
    // Then expand to full-screen
    fireEvent.click(screen.getByLabelText('Expand SQL'))
    // Escape should collapse the overlay (and flip back)
    fireEvent.keyDown(document, { key: 'Escape' })
    // The expanded overlay backdrop should be gone
    expect(screen.queryByLabelText('Collapse')).not.toBeInTheDocument()
  })

  it('clicking Terminal icon navigates to /query-studio and sets pendingQueryStudioSql', () => {
    setDevMode(true)
    renderCard({ sql: 'SELECT 1' })
    fireEvent.click(screen.getByLabelText('Show SQL'))
    fireEvent.click(screen.getByLabelText('Open in Query Studio'))
    expect(mockNavigate).toHaveBeenCalledWith('/query-studio')
    expect(useAppStore.getState().pendingQueryStudioSql).not.toBeNull()
  })

  it('renders multiple SQL query labels when sql is an array', () => {
    setDevMode(true)
    renderCard({ sql: ['SELECT 1', 'SELECT 2'] })
    fireEvent.click(screen.getByLabelText('Show SQL'))
    expect(screen.getByText('-- Query 1')).toBeInTheDocument()
    expect(screen.getByText('-- Query 2')).toBeInTheDocument()
  })

  it('renders SQL badge even when sql is null', () => {
    setDevMode(true)
    renderCard({ sql: null })
    expect(screen.getByLabelText('Show SQL')).toBeInTheDocument()
  })

  it('hooks are always called — toggling devMode on/off must not throw', () => {
    // Render with devMode off
    const { rerender } = render(
      <MemoryRouter>
        <DevCard sql="SELECT 1">
          <div>content</div>
        </DevCard>
      </MemoryRouter>
    )
    // Flip devMode on — if hooks were conditionally called this would throw
    setDevMode(true)
    expect(() =>
      rerender(
        <MemoryRouter>
          <DevCard sql="SELECT 1">
            <div>content</div>
          </DevCard>
        </MemoryRouter>
      )
    ).not.toThrow()
    expect(screen.getByLabelText('Show SQL')).toBeInTheDocument()
  })
})
