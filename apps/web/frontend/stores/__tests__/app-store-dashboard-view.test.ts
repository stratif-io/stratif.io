import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../app-store'

describe('app store — dashboardView', () => {
  beforeEach(() => {
    useAppStore.setState({ dashboardView: 'summary' })
  })

  it('defaults to summary', () => {
    expect(useAppStore.getState().dashboardView).toBe('summary')
  })

  it('setDashboardView switches to detail', () => {
    useAppStore.getState().setDashboardView('detail')
    expect(useAppStore.getState().dashboardView).toBe('detail')
  })

  it('setDashboardView switches back to summary', () => {
    useAppStore.getState().setDashboardView('detail')
    useAppStore.getState().setDashboardView('summary')
    expect(useAppStore.getState().dashboardView).toBe('summary')
  })
})
