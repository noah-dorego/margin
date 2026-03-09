import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  getStats: vi.fn(),
}))

import { GET } from '@/app/api/stats/route'
import { getStats } from '@/lib/db'

const mockGetStats = vi.mocked(getStats)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetStats.mockReturnValue({
    total_documents: 5,
    total_findings: 12,
    by_severity: { critical: 2, high: 4, medium: 3, low: 3 },
  })
})

describe('GET /api/stats', () => {
  it('returns 200 with total_documents, total_findings, and by_severity', async () => {
    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.total_documents).toBe(5)
    expect(body.total_findings).toBe(12)
    expect(body.by_severity).toEqual({ critical: 2, high: 4, medium: 3, low: 3 })
  })

  it('delegates entirely to getStats()', async () => {
    await GET()
    expect(mockGetStats).toHaveBeenCalledTimes(1)
  })
})
