import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FilterSelect } from '../FilterSelect'

const baseOptions = [
  { value: 'country', label: 'Country', category: 'geography' },
  { value: 'browser', label: 'Browser', category: 'device' },
  { value: 'utm_source', label: 'UTM Source', category: 'marketing' },
]

describe('FilterSelect', () => {
  it('single mode closes popover on selection', async () => {
    const onChange = vi.fn()
    render(
      <FilterSelect
        mode="single"
        options={baseOptions}
        value={null}
        onChange={onChange}
        placeholder="Pick one"
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /pick one/i }))
    await userEvent.click(screen.getByText('Country'))
    expect(onChange).toHaveBeenCalledWith('country')
    expect(screen.queryByText('Browser')).not.toBeInTheDocument()
  })

  it('multi mode shows "N values" count label when multiple items selected', async () => {
    render(
      <FilterSelect
        mode="multi"
        options={baseOptions}
        value={['country', 'browser']}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByRole('button')).toHaveTextContent('2 values')
  })

  it('tree mode opens to the group containing the active value', async () => {
    render(
      <FilterSelect
        mode="single"
        tree
        options={baseOptions}
        value="browser"
        onChange={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button'))
    // Implementation uses conditional rendering — collapsed items are not in the DOM at all
    expect(screen.getByText('Browser')).toBeInTheDocument()
    expect(screen.queryByText('Country')).not.toBeInTheDocument()
  })

  it('searchable mode filters options client-side case-insensitively', async () => {
    render(
      <FilterSelect
        mode="single"
        searchable
        options={baseOptions}
        value={null}
        onChange={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByPlaceholderText(/search/i)
    await userEvent.type(input, 'utm')
    expect(screen.getByText('UTM Source')).toBeInTheDocument()
    expect(screen.queryByText('Country')).not.toBeInTheDocument()
    expect(screen.queryByText('Browser')).not.toBeInTheDocument()
  })

  it('isLoading={true} renders loading state instead of option list', async () => {
    render(
      <FilterSelect
        mode="single"
        options={[]}
        isLoading
        value={null}
        onChange={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText(/no options/i)).not.toBeInTheDocument()
  })

  it('disabled={true} prevents opening the popover', async () => {
    render(
      <FilterSelect
        mode="single"
        options={baseOptions}
        value={null}
        onChange={vi.fn()}
        disabled
      />
    )
    const trigger = screen.getByRole('button')
    expect(trigger).toBeDisabled()
    await userEvent.click(trigger)
    expect(screen.queryByText('Country')).not.toBeInTheDocument()
  })
})
