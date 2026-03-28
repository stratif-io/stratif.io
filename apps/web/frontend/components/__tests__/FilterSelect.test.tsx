import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FilterSelect } from '../FilterSelect'

const baseOptions = [
  { value: 'country', label: 'Country', category: 'geography' },
  { value: 'browser', label: 'Browser', category: 'device' },
  { value: 'utm_source', label: 'UTM Source', category: 'marketing' },
]

// Options that match real dimension-categories.json patterns so grouping works
const treeOptions = [
  { value: 'user_id', label: 'user_id', category: 'user' },
  { value: 'user_country', label: 'user_country', category: 'user' },
  { value: 'ts_event', label: 'ts_event', category: 'time' },
  { value: 'device_type', label: 'device_type', category: 'device' },
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
    expect(screen.getByRole('button', { name: '2 values' })).toBeInTheDocument()
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
    render(<FilterSelect mode="single" options={[]} isLoading value={null} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText(/no options/i)).not.toBeInTheDocument()
  })

  it('disabled={true} prevents opening the popover', async () => {
    render(
      <FilterSelect mode="single" options={baseOptions} value={null} onChange={vi.fn()} disabled />
    )
    const trigger = screen.getByRole('button')
    expect(trigger).toBeDisabled()
    await userEvent.click(trigger)
    expect(screen.queryByText('Country')).not.toBeInTheDocument()
  })

  // ── tree={true} two-panel tests ─────────────────────────────────────────

  it('tree mode renders two-panel layout with category list and column list', async () => {
    render(
      <FilterSelect mode="single" tree options={treeOptions} value={null} onChange={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button'))
    const dialog = screen.getByRole('dialog')
    // Category labels visible
    expect(dialog).toHaveTextContent('User')
    expect(dialog).toHaveTextContent('Time')
    expect(dialog).toHaveTextContent('Device')
  })

  it('tree mode opens to the first category when no value is selected', async () => {
    render(
      <FilterSelect mode="single" tree options={treeOptions} value={null} onChange={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button'))
    const dialog = screen.getByRole('dialog')
    // 'user' is the first category — its columns should be visible in the right panel
    expect(within(dialog).getByRole('button', { name: /user_id/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /user_country/i })).toBeInTheDocument()
    // columns from other categories should NOT be visible
    expect(within(dialog).queryByRole('button', { name: /ts_event/i })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /device_type/i })).not.toBeInTheDocument()
  })

  it('tree mode opens to the category of the first selected value', async () => {
    render(
      <FilterSelect mode="single" tree options={treeOptions} value="ts_event" onChange={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button'))
    const dialog = screen.getByRole('dialog')
    // time category columns should be visible in right panel
    expect(dialog).toHaveTextContent('ts_event')
    // user_id column button should NOT be in the right panel
    expect(within(dialog).queryByRole('button', { name: /user_id/i })).not.toBeInTheDocument()
  })

  it('tree mode clicking a category switches the right panel', async () => {
    render(
      <FilterSelect mode="single" tree options={treeOptions} value={null} onChange={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button'))
    const dialog = screen.getByRole('dialog')
    // Initially shows first category (user)
    expect(within(dialog).getByRole('button', { name: /user_id/i })).toBeInTheDocument()
    // Click Device category
    await userEvent.click(within(dialog).getByRole('button', { name: /device/i }))
    expect(within(dialog).getByRole('button', { name: /device_type/i })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /user_id/i })).not.toBeInTheDocument()
  })

  it('tree mode search filters across all categories and shows grouped results', async () => {
    render(
      <FilterSelect mode="single" tree options={treeOptions} value={null} onChange={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button'))
    const searchInput = screen.getByPlaceholderText(/search/i)
    await userEvent.type(searchInput, 'user')
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('user_id')
    expect(dialog).toHaveTextContent('user_country')
    expect(dialog).not.toHaveTextContent('device_type')
    expect(dialog).not.toHaveTextContent('ts_event')
  })

  it('tree mode clearing search restores two-panel layout', async () => {
    render(
      <FilterSelect mode="single" tree options={treeOptions} value={null} onChange={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button'))
    const searchInput = screen.getByPlaceholderText(/search/i)
    await userEvent.type(searchInput, 'user')
    // Category panel is hidden during search
    expect(screen.queryByRole('button', { name: /device/i })).not.toBeInTheDocument()
    // Clear search
    await userEvent.clear(searchInput)
    // Category panel is restored
    expect(screen.getByRole('button', { name: /device/i })).toBeInTheDocument()
  })

  it('tree mode shows no-results message when search matches nothing', async () => {
    render(
      <FilterSelect mode="single" tree options={treeOptions} value={null} onChange={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button'))
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'zzznomatch')
    expect(screen.getByText(/no columns match/i)).toBeInTheDocument()
  })

  it('tree multi mode shows footer with count and clear button', async () => {
    const onChange = vi.fn()
    render(
      <FilterSelect
        mode="multi"
        tree
        options={treeOptions}
        value={['user_id', 'ts_event']}
        onChange={onChange}
      />
    )
    await userEvent.click(screen.getByRole('button'))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('2 selected')
    await userEvent.click(within(dialog).getByRole('button', { name: /clear/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('tree single mode shows no footer', async () => {
    render(
      <FilterSelect mode="single" tree options={treeOptions} value="user_id" onChange={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button'))
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument()
  })

  it('tree mode category badge count matches number of columns in that category', async () => {
    render(
      <FilterSelect mode="single" tree options={treeOptions} value={null} onChange={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button'))
    const dialog = screen.getByRole('dialog')
    // 'user' category has 2 columns: user_id, user_country
    const userRow = within(dialog).getByRole('button', { name: /👤/ })
    expect(within(userRow).getByText('2')).toBeInTheDocument()
    // 'time' category has 1 column: ts_event
    const timeRow = within(dialog).getByRole('button', { name: /🕐/ })
    expect(within(timeRow).getByText('1')).toBeInTheDocument()
    // 'device' category has 1 column: device_type
    const deviceRow = within(dialog).getByRole('button', { name: /💻/ })
    expect(within(deviceRow).getByText('1')).toBeInTheDocument()
  })

  it('tree mode category badge turns primary colour when category has selections', async () => {
    render(
      <FilterSelect
        mode="multi"
        tree
        options={treeOptions}
        value={['user_id']}
        onChange={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button'))
    const dialog = screen.getByRole('dialog')
    // 'user' category has 1 selected value — badge should have primary styling
    const userRow = within(dialog).getByRole('button', { name: /👤/ })
    const userBadge = within(userRow).getByText('2')
    expect(userBadge).toHaveClass('bg-primary')
    // 'device' category has no selected values — badge should NOT have primary styling
    const deviceRow = within(dialog).getByRole('button', { name: /💻/ })
    const deviceBadge = within(deviceRow).getByText('1')
    expect(deviceBadge).not.toHaveClass('bg-primary')
  })

  it('tree mode disabled column is not clickable', async () => {
    const onChange = vi.fn()
    const opts = [
      { value: 'user_id', label: 'user_id', category: 'user', disabled: true },
      { value: 'user_country', label: 'user_country', category: 'user' },
    ]
    render(<FilterSelect mode="single" tree options={opts} value={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))
    await userEvent.click(screen.getByRole('button', { name: /user_id/i }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
