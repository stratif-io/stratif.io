import { describe, it, expect } from 'vitest'
import { getCellClass } from '../retention-benchmarks'

describe('getCellClass', () => {
  it('returns success class when value meets good threshold', () => {
    // day_7 good=45 — value 50 should be success
    const result = getCellClass(50, 'day', 7)
    expect(result.container).toContain('success')
    expect(result.text).toContain('success')
  })

  it('returns warning class when value meets ok but not good threshold', () => {
    // day_7 good=45 ok=20 — value 30 should be warning
    const result = getCellClass(30, 'day', 7)
    expect(result.container).toContain('warning')
    expect(result.text).toContain('warning')
  })

  it('returns destructive class when value is below ok threshold', () => {
    // day_7 ok=20 — value 5 should be destructive
    const result = getCellClass(5, 'day', 7)
    expect(result.container).toContain('destructive')
    expect(result.text).toContain('destructive')
  })

  it('returns muted italic class for null (unreached milestone)', () => {
    const result = getCellClass(null, 'day', 7)
    expect(result.text).toContain('muted')
    expect(result.text).toContain('italic')
    expect(result.container).toBe('')
  })

  it('falls back to defaults for unknown granularity+milestone keys', () => {
    // Should not throw, should return some class
    const result = getCellClass(10, 'day', 999)
    expect(typeof result.text).toBe('string')
    expect(typeof result.container).toBe('string')
  })

  it('handles week granularity thresholds', () => {
    // week_4 good=45 ok=22 — value 23 should be warning
    const result = getCellClass(23, 'week', 4)
    expect(result.container).toContain('warning')
  })

  it('handles month granularity thresholds', () => {
    // month_6 good=40 ok=15 — value 41 should be success
    const result = getCellClass(41, 'month', 6)
    expect(result.container).toContain('success')
  })
})
