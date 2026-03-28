import { render, screen } from '@testing-library/react'
import { MetricCardSkeleton } from '../MetricCardSkeleton'

describe('MetricCardSkeleton', () => {
  it('renders a skeleton placeholder', () => {
    render(<MetricCardSkeleton />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders the correct number of skeletons when count is provided', () => {
    render(
      <div>
        {Array.from({ length: 3 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    )
    expect(screen.getAllByRole('status')).toHaveLength(3)
  })
})
