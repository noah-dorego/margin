import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  getAllDocuments: vi.fn(),
  insertDocument: vi.fn(),
  getDocument: vi.fn(),
}))

vi.mock('@/lib/pipeline', () => ({
  runPipeline: vi.fn(),
}))

import { GET as listDocuments, POST as createDocument } from '@/app/api/documents/route'
import { POST as processDocument } from '@/app/api/documents/[id]/process/route'
import { getAllDocuments, insertDocument, getDocument } from '@/lib/db'
import { runPipeline } from '@/lib/pipeline'

const mockGetAllDocuments = vi.mocked(getAllDocuments)
const mockInsertDocument = vi.mocked(insertDocument)
const mockGetDocument = vi.mocked(getDocument)
const mockRunPipeline = vi.mocked(runPipeline)

const SAMPLE_DOC = {
  id: 'doc-1',
  title: 'Test Document',
  source_regulator: 'CIRO' as const,
  raw_text: 'text',
  content_type: 'text' as const,
  ingested_at: '2025-01-01T00:00:00Z',
  processing_status: 'pending' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAllDocuments.mockReturnValue([SAMPLE_DOC])
  mockInsertDocument.mockReturnValue('doc-new')
  mockGetDocument.mockReturnValue(SAMPLE_DOC)
  mockRunPipeline.mockResolvedValue({ findings_extracted: 3, findings_failed: 0 })
})

describe('GET /api/documents', () => {
  it('returns 200 and calls getAllDocuments', async () => {
    const res = await listDocuments()
    expect(res.status).toBe(200)
    expect(mockGetAllDocuments).toHaveBeenCalledTimes(1)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})

describe('POST /api/documents', () => {
  it('returns 201 with { id } for a valid body', async () => {
    const req = new NextRequest('http://localhost/api/documents', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Doc',
        source_regulator: 'CIRO',
        raw_text: 'Full text here',
      }),
    })
    const res = await createDocument(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('doc-new')
  })

  it('returns 400 when title is missing', async () => {
    const req = new NextRequest('http://localhost/api/documents', {
      method: 'POST',
      body: JSON.stringify({ source_regulator: 'CIRO', raw_text: 'text' }),
    })
    const res = await createDocument(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when raw_text is missing', async () => {
    const req = new NextRequest('http://localhost/api/documents', {
      method: 'POST',
      body: JSON.stringify({ title: 'Title', source_regulator: 'CIRO' }),
    })
    const res = await createDocument(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid source_regulator', async () => {
    const req = new NextRequest('http://localhost/api/documents', {
      method: 'POST',
      body: JSON.stringify({ title: 'T', source_regulator: 'INVALID', raw_text: 'x' }),
    })
    const res = await createDocument(req)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/documents/[id]/process', () => {
  it('returns 404 when document does not exist', async () => {
    mockGetDocument.mockReturnValue(undefined)
    const req = new NextRequest('http://localhost/api/documents/unknown/process', { method: 'POST' })
    const res = await processDocument(req, { params: Promise.resolve({ id: 'unknown' }) })
    expect(res.status).toBe(404)
  })

  it('returns 409 when document is already processed', async () => {
    mockGetDocument.mockReturnValue({ ...SAMPLE_DOC, processing_status: 'processed' })
    const req = new NextRequest('http://localhost/api/documents/doc-1/process', { method: 'POST' })
    const res = await processDocument(req, { params: Promise.resolve({ id: 'doc-1' }) })
    expect(res.status).toBe(409)
  })

  it('returns 200 with pipeline result on success', async () => {
    const req = new NextRequest('http://localhost/api/documents/doc-1/process', { method: 'POST' })
    const res = await processDocument(req, { params: Promise.resolve({ id: 'doc-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.document_id).toBe('doc-1')
    expect(body.findings_extracted).toBe(3)
    expect(body.findings_failed).toBe(0)
  })
})
