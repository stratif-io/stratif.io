import { describe, it, expect } from 'vitest'
import { cn, formatDateParam } from '../utils'

describe('cn utility function', () => {
  it('merges class names correctly', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    // eslint-disable-next-line no-constant-binary-expression
    const result = cn('base', false && 'hidden', true && 'visible')
    expect(result).toBe('base visible')
  })

  it('handles undefined and null values', () => {
    const result = cn('base', undefined, null, 'end')
    expect(result).toBe('base end')
  })

  it('handles object notation', () => {
    const result = cn({ active: true, disabled: false })
    expect(result).toBe('active')
  })

  it('handles array of classes', () => {
    const result = cn(['foo', 'bar'], 'baz')
    expect(result).toBe('foo bar baz')
  })

  it('merges tailwind classes correctly with tailwind-merge', () => {
    const result = cn('p-4', 'p-2')
    expect(result).toBe('p-2')
  })

  it('handles conflicting margin classes', () => {
    const result = cn('m-4', 'm-2')
    expect(result).toBe('m-2')
  })

  it('handles conflicting display classes', () => {
    const result = cn('block', 'inline-block')
    expect(result).toBe('inline-block')
  })

  it('preserves non-conflicting tailwind classes', () => {
    const result = cn('text-red-500', 'bg-blue-500')
    expect(result).toBe('text-red-500 bg-blue-500')
  })

  it('handles complex tailwind merging', () => {
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('handles empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles all falsy values', () => {
    const result = cn(false, null, undefined, '')
    expect(result).toBe('')
  })

  it('combines multiple object conditions', () => {
    const result = cn({ base: true }, { active: true, disabled: false }, 'extra')
    expect(result).toBe('base active extra')
  })

  it('handles responsive prefixes', () => {
    const result = cn('sm:p-4', 'md:p-2')
    expect(result).toBe('sm:p-4 md:p-2')
  })

  it('handles state variants', () => {
    const result = cn('hover:bg-red-500', 'hover:bg-blue-500')
    expect(result).toBe('hover:bg-blue-500')
  })
})

describe('formatDateParam', () => {
  it('returns yyyy-MM-dd for a midnight date', () => {
    const d = new Date(2025, 2, 1, 0, 0, 0, 0)
    expect(formatDateParam(d)).toBe('2025-03-01')
  })

  it('returns ISO datetime string when hours are non-zero', () => {
    const d = new Date('2025-03-01T14:30:00.000')
    expect(formatDateParam(d)).toBe('2025-03-01T14:30:00')
  })

  it('returns ISO datetime string when minutes are non-zero', () => {
    const d = new Date('2025-03-01T00:05:00.000')
    expect(formatDateParam(d)).toBe('2025-03-01T00:05:00')
  })

  it('returns ISO datetime string when seconds are non-zero', () => {
    const d = new Date('2025-03-23T00:00:01.000')
    expect(formatDateParam(d)).toBe('2025-03-23T00:00:01')
  })

  it('returns ISO datetime string for 23:59:59 (preset endOfDay)', () => {
    const d = new Date('2025-03-01T23:59:59.999')
    expect(formatDateParam(d)).toBe('2025-03-01T23:59:59')
  })
})
