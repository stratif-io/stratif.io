import { describe, it, expect } from 'vitest'
import { formatMetricValue, computePctChange } from '../format-metric'

describe('formatMetricValue', () => {
  describe('avg_session_duration_sec', () => {
    it('formats seconds only when under a minute', () => {
      expect(formatMetricValue('avg_session_duration_sec', 45)).toBe('45s')
    })

    it('formats minutes and seconds', () => {
      expect(formatMetricValue('avg_session_duration_sec', 142)).toBe('2m 22s')
    })

    it('rounds fractional seconds', () => {
      expect(formatMetricValue('avg_session_duration_sec', 60.9)).toBe('1m 1s')
    })

    it('formats exactly one minute', () => {
      expect(formatMetricValue('avg_session_duration_sec', 60)).toBe('1m 0s')
    })
  })

  describe('dau_mau_ratio', () => {
    it('formats as percentage with one decimal', () => {
      expect(formatMetricValue('dau_mau_ratio', 0.34)).toBe('34.0%')
    })

    it('formats zero', () => {
      expect(formatMetricValue('dau_mau_ratio', 0)).toBe('0.0%')
    })

    it('formats 1.0 as 100.0%', () => {
      expect(formatMetricValue('dau_mau_ratio', 1)).toBe('100.0%')
    })
  })

  describe('avg_events_per_session', () => {
    it('formats to one decimal', () => {
      expect(formatMetricValue('avg_events_per_session', 13.8)).toBe('13.8')
    })

    it('preserves trailing zero', () => {
      expect(formatMetricValue('avg_events_per_session', 10)).toBe('10.0')
    })
  })

  describe('compact number metrics (total_events, unique_users, etc.)', () => {
    it('formats millions with up to 2 significant decimal places', () => {
      expect(formatMetricValue('total_events', 1_240_000)).toBe('1.24M')
    })

    it('strips trailing zeros in millions', () => {
      expect(formatMetricValue('total_events', 2_000_000)).toBe('2M')
    })

    it('formats thousands with one decimal', () => {
      expect(formatMetricValue('unique_users', 48_200)).toBe('48.2K')
    })

    it('strips trailing zeros in thousands', () => {
      expect(formatMetricValue('unique_users', 48_000)).toBe('48K')
    })

    it('formats numbers under 1000 as-is', () => {
      expect(formatMetricValue('total_events', 999)).toBe('999')
    })
  })
})

describe('computePctChange', () => {
  it('returns positive change', () => {
    expect(computePctChange(1240000, 1100000)).toBeCloseTo(12.73, 1)
  })

  it('returns negative change', () => {
    expect(computePctChange(89700, 91000)).toBeCloseTo(-1.43, 1)
  })

  it('returns null when previous is zero', () => {
    expect(computePctChange(100, 0)).toBeNull()
  })

  it('returns 0 when values are equal', () => {
    expect(computePctChange(100, 100)).toBe(0)
  })
})
