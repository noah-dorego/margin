import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  getFeedSources: vi.fn(),
  insertFeedSource: vi.fn(),
  getFeedSource: vi.fn(),
  deleteFeedSource: vi.fn(),
  getFeedItems: vi.fn(),
  getFeedItem: vi.fn(),
  updateFeedItemStatus: vi.fn(),
}))

import { GET as listSources, POST as createSource } from '@/app/api/feed/sources/route'
import { DELETE as deleteSource } from '@/app/api/feed/sources/[id]/route'
import { GET as listItems } from '@/app/api/feed/items/route'
import { PATCH as patchItem } from '@/app/api/feed/items/[id]/route'
import {
  getFeedSources,
  insertFeedSource,
  getFeedSource,
  deleteFeedSource,
  getFeedItems,
  getFeedItem,
  updateFeedItemStatus,
} from '@/lib/db'

const mockGetFeedSources = vi.mocked(getFeedSources)
const mockInsertFeedSource = vi.mocked(insertFeedSource)
const mockGetFeedSource = vi.mocked(getFeedSource)
const mockDeleteFeedSource = vi.mocked(deleteFeedSource)
const mockGetFeedItems = vi.mocked(getFeedItems)
const mockGetFeedItem = vi.mocked(getFeedItem)
const mockUpdateFeedItemStatus = vi.mocked(updateFeedItemStatus)

const SAMPLE_SOURCE = {
  id: 'src-1',
  label: 'CIRO Publications',
  url: 'https://www.ciro.ca/newsroom/publications',
  source_regulator: 'CIRO' as const,
  category: 'publications' as const,
  feed_type: 'html' as const,
  disabled: false,
  created_at: '2025-01-01T00:00:00Z',
}

const SAMPLE_ITEM = {
  id: 'item-1',
  source_id: 'src-1',
  item_url: 'https://www.ciro.ca/newsroom/publications/mr-0125',
  title: 'Margin Rule Amendment',
  detected_at: '2025-01-01T00:00:00Z',
  status: 'new' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetFeedSources.mockReturnValue([SAMPLE_SOURCE])
  mockInsertFeedSource.mockReturnValue('src-new')
  mockGetFeedSource.mockReturnValue(SAMPLE_SOURCE)
  mockGetFeedItems.mockReturnValue([SAMPLE_ITEM])
  mockGetFeedItem.mockReturnValue(SAMPLE_ITEM)
})

// ---------------------------------------------------------------------------
// Feed sources
// ---------------------------------------------------------------------------

describe('GET /api/feed/sources', () => {
  it('returns 200 with sources array', async () => {
    const res = await listSources()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0].id).toBe('src-1')
  })
})

describe('POST /api/feed/sources', () => {
  it('returns 201 with { id } for a valid body', async () => {
    const req = new NextRequest('http://localhost/api/feed/sources', {
      method: 'POST',
      body: JSON.stringify({
        label: 'New Source',
        url: 'https://example.com/feed',
        source_regulator: 'OSC',
        category: 'news',
      }),
    })
    const res = await createSource(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('src-new')
  })

  it('returns 400 when required fields are missing', async () => {
    const req = new NextRequest('http://localhost/api/feed/sources', {
      method: 'POST',
      body: JSON.stringify({ label: 'Missing fields' }),
    })
    const res = await createSource(req)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/feed/sources/[id]', () => {
  it('returns 204 when source is found and deleted', async () => {
    const req = new NextRequest('http://localhost/api/feed/sources/src-1', { method: 'DELETE' })
    const res = await deleteSource(req, { params: Promise.resolve({ id: 'src-1' }) })
    expect(res.status).toBe(204)
    expect(mockDeleteFeedSource).toHaveBeenCalledWith('src-1')
  })

  it('returns 404 when source does not exist', async () => {
    mockGetFeedSource.mockReturnValue(undefined)
    const req = new NextRequest('http://localhost/api/feed/sources/nope', { method: 'DELETE' })
    const res = await deleteSource(req, { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Feed items
// ---------------------------------------------------------------------------

describe('GET /api/feed/items', () => {
  it('returns 200 with all items when no status filter', async () => {
    const req = new NextRequest('http://localhost/api/feed/items')
    const res = await listItems(req)
    expect(res.status).toBe(200)
    expect(mockGetFeedItems).toHaveBeenCalledWith(undefined)
  })

  it('passes status filter to getFeedItems', async () => {
    const req = new NextRequest('http://localhost/api/feed/items?status=new')
    const res = await listItems(req)
    expect(res.status).toBe(200)
    expect(mockGetFeedItems).toHaveBeenCalledWith('new')
  })

  it('returns 400 for an invalid status value', async () => {
    const req = new NextRequest('http://localhost/api/feed/items?status=invalid')
    const res = await listItems(req)
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/feed/items/[id]', () => {
  it('returns 200 when setting status to dismissed', async () => {
    const req = new NextRequest('http://localhost/api/feed/items/item-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'dismissed' }),
    })
    const res = await patchItem(req, { params: Promise.resolve({ id: 'item-1' }) })
    expect(res.status).toBe(200)
    expect(mockUpdateFeedItemStatus).toHaveBeenCalledWith('item-1', 'dismissed')
  })

  it('returns 400 when trying to set status to "new" (disallowed)', async () => {
    const req = new NextRequest('http://localhost/api/feed/items/item-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'new' }),
    })
    const res = await patchItem(req, { params: Promise.resolve({ id: 'item-1' }) })
    expect(res.status).toBe(400)
    expect(mockUpdateFeedItemStatus).not.toHaveBeenCalled()
  })

  it('returns 404 when item does not exist', async () => {
    mockGetFeedItem.mockReturnValue(undefined)
    const req = new NextRequest('http://localhost/api/feed/items/nope', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'dismissed' }),
    })
    const res = await patchItem(req, { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })
})
