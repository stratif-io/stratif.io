import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createReport, getReport } from '../reports'
import { initSemaphore } from '../semaphore'

describe('Reports API', () => {
  beforeEach(() => {
    initSemaphore(vi.fn())
    vi.clearAllMocks()
  })

  describe('createReport', () => {
    it('POSTs to /api/reports and returns shortcode and id', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            shortcode: 'abc123',
            id: '550e8400-e29b-41d4-a716-446655440000',
          }),
          { status: 201, headers: { 'content-type': 'application/json' } }
        )
      )
      vi.stubGlobal('fetch', mockFetch)

      const payload = {
        name: 'My Report',
        page: 'dashboard',
        params: { dateRange: '7d' },
        access: 'public' as const,
        snapshot: false,
      }

      const result = await createReport(payload)

      expect(mockFetch).toHaveBeenCalled()
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('/api/reports')
      expect(options.method).toBe('POST')
      expect(options.credentials).toBe('include')
      expect(options.body).toBe(JSON.stringify(payload))

      expect(result).toEqual({ shortcode: 'abc123', id: '550e8400-e29b-41d4-a716-446655440000' })

      vi.unstubAllGlobals()
    })

    it('throws on non-OK response', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Invalid payload' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        })
      )
      vi.stubGlobal('fetch', mockFetch)

      const payload = {
        name: 'My Report',
        page: 'dashboard',
        params: {},
        access: 'public' as const,
        snapshot: false,
      }

      await expect(createReport(payload)).rejects.toThrow('Invalid payload')

      vi.unstubAllGlobals()
    })
  })

  describe('getReport', () => {
    it('GETs /api/reports/:shortcode and returns ReportData', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            shortcode: 'abc123',
            name: 'My Report',
            page: 'dashboard',
            params: { dateRange: '7d' },
            access: 'public',
            snapshot: false,
            snapshot_data: null,
            created_at: '2024-01-15T10:00:00Z',
            created_by_username: 'alice',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
      vi.stubGlobal('fetch', mockFetch)

      const result = await getReport('abc123')

      expect(mockFetch).toHaveBeenCalled()
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('/api/reports/abc123')
      expect(options.credentials).toBe('include')

      expect(result).toEqual({
        shortcode: 'abc123',
        name: 'My Report',
        page: 'dashboard',
        params: { dateRange: '7d' },
        access: 'public',
        snapshot: false,
        snapshot_data: null,
        created_at: '2024-01-15T10:00:00Z',
        created_by_username: 'alice',
      })

      vi.unstubAllGlobals()
    })

    it('returns null on 404', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ detail: 'Not found' }), { status: 404 }))
      vi.stubGlobal('fetch', mockFetch)

      const result = await getReport('nonexistent')

      expect(result).toBeNull()

      vi.unstubAllGlobals()
    })

    it('throws on other non-OK response', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: 'Server error' }), { status: 500 })
        )
      vi.stubGlobal('fetch', mockFetch)

      await expect(getReport('abc123')).rejects.toThrow('Server error')

      vi.unstubAllGlobals()
    })
  })
})
