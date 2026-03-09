import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing runPipeline
vi.mock('@/lib/db', () => ({
  getDocument: vi.fn(),
  updateDocumentStatus: vi.fn(),
  insertFinding: vi.fn(),
}))

vi.mock('@/lib/claude', () => ({
  callClaude: vi.fn(),
  parseAIResponse: vi.fn(),
}))

import { runPipeline } from '@/lib/pipeline'
import { getDocument, updateDocumentStatus, insertFinding } from '@/lib/db'
import { callClaude, parseAIResponse } from '@/lib/claude'

const mockGetDocument = vi.mocked(getDocument)
const mockUpdateDocumentStatus = vi.mocked(updateDocumentStatus)
const mockInsertFinding = vi.mocked(insertFinding)
const mockCallClaude = vi.mocked(callClaude)
const mockParseAIResponse = vi.mocked(parseAIResponse)

const SAMPLE_DOC = {
  id: 'doc-1',
  title: 'Test Doc',
  source_regulator: 'CIRO' as const,
  raw_text: 'The regulation requires X.',
  content_type: 'text' as const,
  ingested_at: '2025-01-01T00:00:00.000Z',
  processing_status: 'pending' as const,
}

const SAMPLE_EXTRACTION = {
  findings: [
    {
      finding_summary: 'New rule A',
      effective_date: '2025-04-01',
      key_quotes: ['Quote A'],
      regulatory_references: ['S.1'],
      affected_keywords: ['trading'],
    },
    {
      finding_summary: 'New rule B',
      effective_date: null,
      key_quotes: ['Quote B'],
      regulatory_references: [],
      affected_keywords: ['crypto'],
    },
  ],
}

const SAMPLE_ASSESSMENT = {
  affected_products: ['TRADING'],
  severity: 'high' as const,
  severity_rationale: 'Requires immediate action',
  recommended_actions: ['Do X'],
  confidence_score: 0.9,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetDocument.mockReturnValue(SAMPLE_DOC)
  mockInsertFinding.mockReturnValue('finding-id')
})

describe('runPipeline', () => {
  it('happy path — calls insertFinding for each extracted finding, returns counts', async () => {
    mockCallClaude.mockResolvedValue('{"findings":[...]}')
    mockParseAIResponse
      .mockReturnValueOnce(SAMPLE_EXTRACTION)   // extraction
      .mockReturnValue(SAMPLE_ASSESSMENT)        // assessment (x2)

    const result = await runPipeline('doc-1')

    expect(result.findings_extracted).toBe(2)
    expect(result.findings_failed).toBe(0)
    expect(mockInsertFinding).toHaveBeenCalledTimes(2)
    expect(mockUpdateDocumentStatus).toHaveBeenLastCalledWith('doc-1', 'processed')
  })

  it('one assessment failure is non-fatal — other findings still inserted', async () => {
    mockCallClaude.mockResolvedValue('{}')
    mockParseAIResponse
      .mockReturnValueOnce(SAMPLE_EXTRACTION) // extraction OK
      .mockReturnValueOnce(SAMPLE_ASSESSMENT) // first finding assessment OK
      .mockImplementationOnce(() => { throw new Error('API error') }) // second fails

    const result = await runPipeline('doc-1')

    expect(result.findings_extracted).toBe(2)
    expect(result.findings_failed).toBe(1)
    expect(mockInsertFinding).toHaveBeenCalledTimes(1)
    expect(mockUpdateDocumentStatus).toHaveBeenLastCalledWith('doc-1', 'processed')
  })

  it('extraction failure sets doc status to failed and re-throws', async () => {
    mockCallClaude.mockResolvedValue('{}')
    mockParseAIResponse.mockImplementationOnce(() => { throw new Error('Bad JSON') })

    await expect(runPipeline('doc-1')).rejects.toThrow('Bad JSON')
    expect(mockUpdateDocumentStatus).toHaveBeenCalledWith('doc-1', 'failed')
  })

  it('throws if document is not found', async () => {
    mockGetDocument.mockReturnValue(undefined)
    await expect(runPipeline('unknown')).rejects.toThrow('Document not found: unknown')
  })
})
