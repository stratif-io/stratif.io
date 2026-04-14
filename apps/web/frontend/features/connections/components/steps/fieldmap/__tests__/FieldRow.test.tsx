import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FieldRow } from '../FieldRow'

const base = {
  testId: 'field-row-userIdField',
  label: 'User ID',
  required: true,
  value: '',
  pending: undefined,
  colNames: ['user_id', 'uid'],
  filterEnabled: false,
  onFilterToggle: vi.fn(),
  onAccept: vi.fn(),
  onReject: vi.fn(),
  onChange: vi.fn(),
}

describe('FieldRow', () => {
  it('renders the label', () => {
    render(<FieldRow {...base} value="user_id" />)
    expect(screen.getByText('User ID')).toBeInTheDocument()
  })

  it('shows red dashed style when required and empty', () => {
    render(<FieldRow {...base} />)
    const row = screen.getByTestId('field-row-userIdField')
    expect(row.className).toMatch(/border-red/)
    expect(screen.getByText(/required · missing/i)).toBeInTheDocument()
  })

  it('shows green style when mapped', () => {
    render(<FieldRow {...base} value="user_id" />)
    const row = screen.getByTestId('field-row-userIdField')
    expect(row.className).toMatch(/border-green/)
    expect(screen.getByText(/✓ mapped/i)).toBeInTheDocument()
  })

  it('shows amber style and proposed column when pending', () => {
    render(
      <FieldRow
        {...base}
        pending={{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }}
      />
    )
    const row = screen.getByTestId('field-row-userIdField')
    expect(row).toHaveAttribute('data-suggested', 'true')
    expect(row.className).toMatch(/border-amber/)
    expect(screen.getByText('uid')).toBeInTheDocument()
    expect(screen.getByText(/suggestion pending/i)).toBeInTheDocument()
  })

  it('calls onAccept when ✓ clicked on pending row', async () => {
    const onAccept = vi.fn()
    render(
      <FieldRow
        {...base}
        onAccept={onAccept}
        pending={{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }}
      />
    )
    await userEvent.click(screen.getByTestId('accept-userIdField'))
    expect(onAccept).toHaveBeenCalled()
  })

  it('calls onReject when ✕ clicked on pending row', async () => {
    const onReject = vi.fn()
    render(
      <FieldRow
        {...base}
        onReject={onReject}
        pending={{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }}
      />
    )
    await userEvent.click(screen.getByTestId('reject-userIdField'))
    expect(onReject).toHaveBeenCalled()
  })

  it('shows neutral style for optional empty field', () => {
    render(<FieldRow {...base} required={false} />)
    const row = screen.getByTestId('field-row-userIdField')
    expect(row.className).not.toMatch(/border-red/)
    expect(row.className).not.toMatch(/border-green/)
    expect(row.className).not.toMatch(/border-amber/)
  })

  it('shows clear button when onClear provided and value set', () => {
    const onClear = vi.fn()
    render(<FieldRow {...base} value="user_id" onClear={onClear} />)
    expect(screen.getByLabelText(/clear user id/i)).toBeInTheDocument()
  })
})
