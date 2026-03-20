import { describe, it, expect } from 'vitest'
import { groupDimensionsByCategory } from '../dimensionCategories'
import type { DimensionOption, DimensionCategoryConfig } from '@/types'

const categories: DimensionCategoryConfig[] = [
  { id: 'time', label: '🕐 Time', patterns: ['^ts_', '^(date|week|hour)$'] },
  { id: 'user', label: '👤 User', patterns: ['^user_'] },
  { id: 'other', label: '⚙️ Other', patterns: ['.*'] },
]

describe('groupDimensionsByCategory', () => {
  it('assigns dimensions to the correct category', () => {
    const dims: DimensionOption[] = [
      { value: 'ts_month', label: 'Month' },
      { value: 'user_id', label: 'User ID' },
      { value: 'custom_field', label: 'Custom Field' },
    ]
    const groups = groupDimensionsByCategory(dims, categories)
    expect(groups).toHaveLength(3)
    expect(groups[0].category.id).toBe('time')
    expect(groups[0].dimensions.map((d) => d.value)).toEqual(['ts_month'])
    expect(groups[1].category.id).toBe('user')
    expect(groups[1].dimensions.map((d) => d.value)).toEqual(['user_id'])
    expect(groups[2].category.id).toBe('other')
    expect(groups[2].dimensions.map((d) => d.value)).toEqual(['custom_field'])
  })

  it('first match wins when patterns overlap', () => {
    const overlappingCategories: DimensionCategoryConfig[] = [
      { id: 'first', label: 'First', patterns: ['^user_'] },
      { id: 'second', label: 'Second', patterns: ['.*'] },
    ]
    const dims: DimensionOption[] = [{ value: 'user_id', label: 'User ID' }]
    const groups = groupDimensionsByCategory(dims, overlappingCategories)
    expect(groups).toHaveLength(1)
    expect(groups[0].category.id).toBe('first')
  })

  it('sorts dimensions A→Z by label within each group', () => {
    const dims: DimensionOption[] = [
      { value: 'ts_year', label: 'Year' },
      { value: 'ts_date', label: 'Date' },
      { value: 'ts_month', label: 'Month' },
    ]
    const groups = groupDimensionsByCategory(dims, categories)
    expect(groups[0].dimensions.map((d) => d.label)).toEqual(['Date', 'Month', 'Year'])
  })

  it('excludes empty groups from output', () => {
    const dims: DimensionOption[] = [{ value: 'user_id', label: 'User ID' }]
    const groups = groupDimensionsByCategory(dims, categories)
    const ids = groups.map((g) => g.category.id)
    expect(ids).not.toContain('time')
    expect(ids).toContain('user')
  })

  it('returns empty array when dimensions input is empty', () => {
    const groups = groupDimensionsByCategory([], categories)
    expect(groups).toEqual([])
  })

  it('matching is case-insensitive', () => {
    const dims: DimensionOption[] = [{ value: 'User_Name', label: 'User Name' }]
    const groups = groupDimensionsByCategory(dims, categories)
    expect(groups[0].category.id).toBe('user')
  })
})
