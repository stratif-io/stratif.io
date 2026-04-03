import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf-8')

describe('design tokens', () => {
  it('uses Inter as the primary sans font', () => {
    expect(css).toMatch(/Inter.*sans/)
  })
  it('defines --color-surface token', () => {
    expect(css).toContain('--color-surface')
  })
  it('defines --color-danger-light token', () => {
    expect(css).toContain('--color-danger-light')
  })
})
