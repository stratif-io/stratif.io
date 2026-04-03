import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PageConfigBar } from '../PageConfigBar'

describe('PageConfigBar', () => {
  it('renders children', () => {
    render(
      <PageConfigBar>
        <button>Config control</button>
      </PageConfigBar>
    )
    expect(screen.getByText('Config control')).toBeInTheDocument()
  })

  it('renders right slot children', () => {
    render(<PageConfigBar right={<button>Granularity</button>} />)
    expect(screen.getByText('Granularity')).toBeInTheDocument()
  })
})
