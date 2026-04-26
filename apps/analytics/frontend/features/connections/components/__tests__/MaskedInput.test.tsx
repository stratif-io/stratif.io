import { render, screen } from '@testing-library/react'
import { MaskedInput } from '../ConnectionConfigTab'

describe('MaskedInput', () => {
  it('shows "Currently set" indicator when initialValue is provided', () => {
    render(<MaskedInput id="pw" name="password" placeholder="Password" initialValue="••••••••" />)
    expect(screen.getByText(/currently set/i)).toBeInTheDocument()
  })

  it('does not show indicator when field has never been set', () => {
    render(<MaskedInput id="pw" name="password" placeholder="Password" initialValue={null} />)
    expect(screen.queryByText(/currently set/i)).not.toBeInTheDocument()
  })

  it('shows editable input with blank-to-keep placeholder', () => {
    render(<MaskedInput id="pw" name="password" placeholder="Password" initialValue="••••••••" />)
    expect(screen.getByPlaceholderText(/leave blank to keep/i)).toBeInTheDocument()
  })
})
