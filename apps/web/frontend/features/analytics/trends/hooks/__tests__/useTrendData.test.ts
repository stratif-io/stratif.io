import { describe, it, expect } from 'vitest'
import { formatTrendDate, granularityToDim } from '../useTrendData'

describe('granularityToDim', () => {
  it('maps hour → hour', () => expect(granularityToDim('hour')).toBe('hour'))
  it('maps day → date', () => expect(granularityToDim('day')).toBe('date'))
  it('maps week → week', () => expect(granularityToDim('week')).toBe('week'))
  it('maps month → month', () => expect(granularityToDim('month')).toBe('month'))
  it('maps quarter → quarter', () => expect(granularityToDim('quarter')).toBe('quarter'))
  it('maps year → year', () => expect(granularityToDim('year')).toBe('year'))
})

describe('formatTrendDate', () => {
  it('formats day as "Mar 31"', () => {
    expect(formatTrendDate('2026-03-31', 'day')).toBe('Mar 31')
  })
  it('formats week as "Mar 30"', () => {
    expect(formatTrendDate('2026-03-30', 'week')).toBe('Mar 30')
  })
  it('formats month as "Mar 2026"', () => {
    expect(formatTrendDate('2026-03-01', 'month')).toBe('Mar 2026')
  })
  it('formats quarter as "Q1 2026"', () => {
    expect(formatTrendDate('2026-01-01', 'quarter')).toBe('Q1 2026')
  })
  it('formats year as "2026"', () => {
    expect(formatTrendDate('2026-01-01', 'year')).toBe('2026')
  })
  it('formats hour showing date and hour', () => {
    // Should show the date part at minimum
    const result = formatTrendDate('2026-03-31T14:00:00', 'hour')
    expect(result).toContain('Mar 31')
    expect(result).toContain('14:00')
  })
})
