import { describe, it, expect } from 'vitest'
import { parseTrendParams } from '../parseTrendParams'
import type { ZoneCol, FilterEntry } from '@/components/pivot-table/types'

describe('parseTrendParams', () => {
  function params(obj: Record<string, string>): URLSearchParams {
    return new URLSearchParams(obj)
  }

  it('returns null when from_trend is absent', () => {
    expect(parseTrendParams(params({ measure: 'count_events' }))).toBeNull()
  })

  it('maps count_events to event_count value col', () => {
    const result = parseTrendParams(params({ from_trend: '1', measure: 'count_events' }))
    expect(result?.initialValueCols).toEqual<ZoneCol[]>([
      { colId: 'event_count', label: 'Events', aggFunc: 'sum' },
    ])
  })

  it('maps unique_users to user_id value col', () => {
    const result = parseTrendParams(params({ from_trend: '1', measure: 'unique_users' }))
    expect(result?.initialValueCols).toEqual<ZoneCol[]>([
      { colId: 'user_id', label: 'Users', aggFunc: 'count_distinct' },
    ])
  })

  it('maps sum:revenue to revenue value col', () => {
    const result = parseTrendParams(params({ from_trend: '1', measure: 'sum:revenue' }))
    expect(result?.initialValueCols).toEqual<ZoneCol[]>([
      { colId: 'revenue', label: 'revenue', aggFunc: 'sum' },
    ])
  })

  it('maps avg:load_time to load_time value col', () => {
    const result = parseTrendParams(params({ from_trend: '1', measure: 'avg:load_time' }))
    expect(result?.initialValueCols).toEqual<ZoneCol[]>([
      { colId: 'load_time', label: 'load_time', aggFunc: 'avg' },
    ])
  })

  it('maps breakdown to initialRowGroups', () => {
    const result = parseTrendParams(
      params({ from_trend: '1', measure: 'count_events', breakdown: 'country' })
    )
    expect(result?.initialRowGroups).toEqual<ZoneCol[]>([{ colId: 'country', label: 'country' }])
  })

  it('returns undefined initialRowGroups when no breakdown', () => {
    const result = parseTrendParams(params({ from_trend: '1', measure: 'count_events' }))
    expect(result?.initialRowGroups).toBeUndefined()
  })

  it('maps filter_ params to initialPivotFilters', () => {
    const result = parseTrendParams(
      params({
        from_trend: '1',
        measure: 'count_events',
        filter_platform: 'web',
        filter_device: 'desktop',
      })
    )
    expect(result?.initialPivotFilters).toEqual<FilterEntry[]>(
      expect.arrayContaining([
        { field: 'platform', fieldLabel: 'platform', value: 'web' },
        { field: 'device', fieldLabel: 'device', value: 'desktop' },
      ])
    )
  })

  it('returns empty initialPivotFilters when no filter_ params', () => {
    const result = parseTrendParams(params({ from_trend: '1', measure: 'count_events' }))
    expect(result?.initialPivotFilters).toEqual([])
  })

  it('returns null for malformed measure with no colon', () => {
    expect(parseTrendParams(params({ from_trend: '1', measure: 'badvalue' }))).toBeNull()
  })
})
