import { describe, it, expect } from 'vitest'
import { buildPivotUrl } from '../trendToPivot'

describe('buildPivotUrl', () => {
  it('includes from_trend sentinel', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: {},
    })
    expect(url).toContain('from_trend=1')
  })

  it('encodes measure', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: {},
    })
    expect(url).toContain('measure=count_events')
  })

  it('encodes custom measure with aggregation', () => {
    const url = buildPivotUrl({
      measure: 'sum:revenue',
      breakdownDimension: null,
      localFilters: {},
    })
    expect(url).toContain('measure=sum%3Arevenue')
  })

  it('encodes breakdown dimension when present', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: 'country',
      localFilters: {},
    })
    expect(url).toContain('breakdown=country')
  })

  it('omits breakdown param when null', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: {},
    })
    expect(url).not.toContain('breakdown')
  })

  it('encodes filters as filter_<field>=<firstValue>', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: { platform: ['web', 'mobile'] },
    })
    expect(url).toContain('filter_platform=web')
    expect(url).not.toContain('filter_platform=mobile')
  })

  it('omits filter keys with empty arrays', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: { platform: [] },
    })
    expect(url).not.toContain('filter_platform')
  })

  it('encodes multiple filters', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: { platform: ['web'], device: ['desktop'] },
    })
    expect(url).toContain('filter_platform=web')
    expect(url).toContain('filter_device=desktop')
  })

  it('returns path starting with /pivot', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: {},
    })
    expect(url.startsWith('/pivot?')).toBe(true)
  })
})
