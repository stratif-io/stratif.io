import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn utility function', () => {
  it('merges class names correctly', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('handles conditional classes', () => {
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
