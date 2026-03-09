import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  getFindings: vi.fn(),
  getFinding: vi.fn(),
}))

import { GET as listFindings } from '@/app/api/findings/route'
import { GET as getFindingById } from '@/app/api/findings/[id]/route'
import { getFindings, getFinding } from '@/lib/db'

const mockGetFindings = vi.mocked(getFindings)
const mockGetFinding = vi.mocked(getFinding)

const SAMPLE_FINDING = {
  id: 'f-1',
  document_id: 'doc-1',
  source_regulator: 'CIRO' as const,
  finding_summary: 'Test finding',
  severity: 'high' as const,
  affected_products: ['TRADING' as const],
  recommended_actions: ['Do X'],
  key_quotes: ['Quote A'],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetFindings.mockReturnValue([SAMPLE_FINDING])
  mockGetFinding.mockReturnValue(SAMPLE_FINDING)
})

describe('GET /api/findings', () => {
  it('returns 200 with findings when no filters applied', async () => {
    const req = new NextRequest('http://localhost/api/findings')
    const res = await listFindings(req)

    expect(res.status).toBe(200)
    expect(mockGetFindings).toHaveBeenCalledWith({})
  })

  it('parses severity filter and passes array to getFindings', async () => {
    const req = new NextRequest('http://localhost/api/findings?severity=high,critical')
    await listFindings(req)

    expect(mockGetFindings).toHaveBeenCalledWith({ severity: ['high', 'critical'] })
  })

  it('parses source_regulator filter', async () => {
    const req = new NextRequest('http://localhost/api/findings?source_regulator=CIRO')
    await listFindings(req)

    expect(mockGetFindings).toHaveBeenCalledWith({ source_regulator: 'CIRO' })
  })

  it('parses product filter', async () => {
    const req = new NextRequest('http://localhost/api/findings?product=TRADING')
    await listFindings(req)

    expect(mockGetFindings).toHaveBeenCalledWith({ product: 'TRADING' })
  })

  it('returns the findings array in response body', async () => {
    const req = new NextRequest('http://localhost/api/findings')
    const res = await listFindings(req)
    const body = await res.json()

    expect(Array.isArray(body)).toBe(true)
    expect(body[0].id).toBe('f-1')
  })
})

describe('GET /api/findings/[id]', () => {
  it('returns 200 with the finding body when found', async () => {
    const req = new NextRequest('http://localhost/api/findings/f-1')
    const res = await getFindingById(req, { params: Promise.resolve({ id: 'f-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('f-1')
  })

  it('returns 404 when finding does not exist', async () => {
    mockGetFinding.mockReturnValue(undefined)
    const req = new NextRequest('http://localhost/api/findings/unknown')
    const res = await getFindingById(req, { params: Promise.resolve({ id: 'unknown' }) })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})
