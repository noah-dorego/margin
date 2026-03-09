import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb } from '../../helpers/db'
import {
  _setDbForTesting,
  insertDocument,
  getDocument,
  getAllDocuments,
  updateDocumentStatus,
  insertFinding,
  getFinding,
  getFindings,
  getStats,
  insertFeedSource,
  upsertFeedItem,
  updateFeedItemStatus,
  getFeedItems,
} from '@/lib/db'

let testDb: Database.Database

beforeEach(() => {
  testDb = createTestDb()
  _setDbForTesting(testDb)
})

// ---------------------------------------------------------------------------
// Document helpers
// ---------------------------------------------------------------------------

describe('insertDocument / getDocument', () => {
  it('returns a UUID and retrieves the document', () => {
    const id = insertDocument({
      title: 'Test Doc',
      source_regulator: 'CIRO',
      raw_text: 'some text',
      content_type: 'text',
    })

    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(10)

    const doc = getDocument(id)
    expect(doc).toBeDefined()
    expect(doc!.title).toBe('Test Doc')
    expect(doc!.source_regulator).toBe('CIRO')
    expect(doc!.processing_status).toBe('pending')
  })

  it('returns undefined for an unknown id', () => {
    expect(getDocument('nonexistent')).toBeUndefined()
  })
})

describe('getAllDocuments', () => {
  it('returns documents ordered by ingested_at DESC', () => {
    const id1 = insertDocument({ title: 'First', source_regulator: 'CRA', raw_text: 'a', content_type: 'text' })
    const id2 = insertDocument({ title: 'Second', source_regulator: 'OSC', raw_text: 'b', content_type: 'text' })

    // Force distinct timestamps so ORDER BY is deterministic
    testDb.prepare("UPDATE regulatory_documents SET ingested_at = '2025-01-01T00:00:00.000Z' WHERE id = ?").run(id1)
    testDb.prepare("UPDATE regulatory_documents SET ingested_at = '2025-01-02T00:00:00.000Z' WHERE id = ?").run(id2)

    const docs = getAllDocuments()
    expect(docs.length).toBe(2)
    expect(docs[0].title).toBe('Second')
    expect(docs[1].title).toBe('First')
  })
})

describe('updateDocumentStatus', () => {
  it('changes the processing_status field', () => {
    const id = insertDocument({ title: 'Doc', source_regulator: 'OSC', raw_text: 'x', content_type: 'text' })
    expect(getDocument(id)!.processing_status).toBe('pending')

    updateDocumentStatus(id, 'processed')
    expect(getDocument(id)!.processing_status).toBe('processed')

    updateDocumentStatus(id, 'failed')
    expect(getDocument(id)!.processing_status).toBe('failed')
  })
})

// ---------------------------------------------------------------------------
// Finding helpers
// ---------------------------------------------------------------------------

function insertTestDoc(): string {
  return insertDocument({ title: 'D', source_regulator: 'OSFI', raw_text: 'r', content_type: 'text' })
}

describe('insertFinding / getFinding', () => {
  it('serializes JSON arrays and deserializes them on retrieval', () => {
    const docId = insertTestDoc()
    const id = insertFinding({
      document_id: docId,
      finding_summary: 'Test finding',
      severity: 'high',
      affected_products: ['TRADING', 'TFSA'],
      recommended_actions: ['Do X', 'Do Y'],
      key_quotes: ['Quote A'],
    })

    const finding = getFinding(id)
    expect(finding).toBeDefined()
    expect(finding!.finding_summary).toBe('Test finding')
    expect(finding!.severity).toBe('high')
    expect(finding!.affected_products).toEqual(['TRADING', 'TFSA'])
    expect(finding!.recommended_actions).toEqual(['Do X', 'Do Y'])
    expect(finding!.key_quotes).toEqual(['Quote A'])
    expect(finding!.source_regulator).toBe('OSFI')
  })

  it('returns undefined for an unknown id', () => {
    expect(getFinding('nope')).toBeUndefined()
  })
})

describe('getFindings filters', () => {
  beforeEach(() => {
    const docCiro = insertDocument({ title: 'CIRO Doc', source_regulator: 'CIRO', raw_text: 't', content_type: 'text' })
    const docOsc = insertDocument({ title: 'OSC Doc', source_regulator: 'OSC', raw_text: 't', content_type: 'text' })

    insertFinding({ document_id: docCiro, finding_summary: 'F1', severity: 'high', affected_products: ['TRADING'], recommended_actions: [], key_quotes: [] })
    insertFinding({ document_id: docCiro, finding_summary: 'F2', severity: 'critical', affected_products: ['CRYPTO'], recommended_actions: [], key_quotes: [] })
    insertFinding({ document_id: docOsc, finding_summary: 'F3', severity: 'low', affected_products: ['TFSA'], recommended_actions: [], key_quotes: [] })
  })

  it('returns all findings when no filters applied', () => {
    expect(getFindings()).toHaveLength(3)
  })

  it('filters by severity', () => {
    const results = getFindings({ severity: ['high', 'critical'] })
    expect(results).toHaveLength(2)
    expect(results.every(f => ['high', 'critical'].includes(f.severity))).toBe(true)
  })

  it('filters by source_regulator', () => {
    const results = getFindings({ source_regulator: 'CIRO' })
    expect(results).toHaveLength(2)
    expect(results.every(f => f.source_regulator === 'CIRO')).toBe(true)
  })

  it('filters by product using LIKE match', () => {
    const results = getFindings({ product: 'TRADING' })
    expect(results).toHaveLength(1)
    expect(results[0].finding_summary).toBe('F1')
  })
})

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------

describe('getStats', () => {
  it('returns correct document and finding totals with per-severity breakdown', () => {
    const doc1 = insertTestDoc()
    const doc2 = insertDocument({ title: 'D2', source_regulator: 'CRA', raw_text: 'x', content_type: 'text' })

    insertFinding({ document_id: doc1, finding_summary: 'A', severity: 'critical', affected_products: [], recommended_actions: [], key_quotes: [] })
    insertFinding({ document_id: doc1, finding_summary: 'B', severity: 'high', affected_products: [], recommended_actions: [], key_quotes: [] })
    insertFinding({ document_id: doc2, finding_summary: 'C', severity: 'high', affected_products: [], recommended_actions: [], key_quotes: [] })

    const stats = getStats()
    expect(stats.total_documents).toBe(2)
    expect(stats.total_findings).toBe(3)
    expect(stats.by_severity.critical).toBe(1)
    expect(stats.by_severity.high).toBe(2)
    expect(stats.by_severity.medium).toBe(0)
    expect(stats.by_severity.low).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Feed helpers
// ---------------------------------------------------------------------------

describe('insertFeedSource / upsertFeedItem / updateFeedItemStatus', () => {
  it('creates a feed source and feed items', () => {
    const sourceId = insertFeedSource({
      label: 'Test Source',
      url: 'https://example.com/feed',
      source_regulator: 'CIRO',
      category: 'news',
    })
    expect(typeof sourceId).toBe('string')

    upsertFeedItem({ source_id: sourceId, item_url: 'https://example.com/article-1', title: 'Article 1' })
    upsertFeedItem({ source_id: sourceId, item_url: 'https://example.com/article-2', title: 'Article 2' })

    const items = getFeedItems()
    expect(items).toHaveLength(2)
    expect(items[0].status).toBe('new')
  })

  it('upsertFeedItem is idempotent — duplicate URL is silently ignored', () => {
    const sourceId = insertFeedSource({
      label: 'S',
      url: 'https://example.com/s',
      source_regulator: 'OSC',
      category: 'publications',
    })
    upsertFeedItem({ source_id: sourceId, item_url: 'https://example.com/a' })
    upsertFeedItem({ source_id: sourceId, item_url: 'https://example.com/a' })

    expect(getFeedItems()).toHaveLength(1)
  })

  it('updateFeedItemStatus changes status', () => {
    const sourceId = insertFeedSource({
      label: 'S2',
      url: 'https://example.com/s2',
      source_regulator: 'CSA',
      category: 'orders',
    })
    upsertFeedItem({ source_id: sourceId, item_url: 'https://example.com/b' })
    const item = getFeedItems()[0]

    updateFeedItemStatus(item.id, 'dismissed')
    const updated = getFeedItems('dismissed')
    expect(updated).toHaveLength(1)
    expect(updated[0].status).toBe('dismissed')
  })
})
