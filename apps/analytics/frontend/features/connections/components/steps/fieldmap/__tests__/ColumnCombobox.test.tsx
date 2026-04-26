// apps/analytics/frontend/features/connections/components/steps/fieldmap/__tests__/ColumnCombobox.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnCombobox } from '../ColumnCombobox'

describe('ColumnCombobox', () => {
  it('renders the current value in the trigger', () => {
    render(<ColumnCombobox value="user_id" detectedColumns={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveTextContent('user_id')
  })

  it('renders placeholder when value is empty', () => {
    render(
      <ColumnCombobox value="" detectedColumns={[]} onChange={vi.fn()} placeholder="Pick one…" />
    )
    expect(screen.getByRole('button')).toHaveTextContent('Pick one…')
  })

  it('calls onChange when an option is selected', async () => {
    const onChange = vi.fn()
    render(
      <ColumnCombobox value="" detectedColumns={['event_name', 'user_id']} onChange={onChange} />
    )
    await userEvent.click(screen.getByRole('button'))
    await userEvent.click(screen.getByRole('option', { name: 'event_name' }))
    expect(onChange).toHaveBeenCalledWith('event_name')
  })
})
