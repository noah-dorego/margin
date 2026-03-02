import { NextRequest, NextResponse } from 'next/server'
import { getFeedSource, upsertFeedItem, updateFeedSourceCheckedAt } from '@/lib/db'
import { extractArticleLinks, extractRssItems, SCRAPER_HEADERS } from '@/lib/feed-scraper'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const source = getFeedSource(id)
  if (!source) {
    return NextResponse.json({ error: 'Feed source not found' }, { status: 404 })
  }

  let body: string
  try {
    const res = await fetch(source.url, {
      headers: SCRAPER_HEADERS,
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      const msg = `[${source.label}] Server responded with HTTP ${res.status} ${res.statusText}`
      console.error(msg)
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    body = await res.text()
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    const msg = isTimeout
      ? `[${source.label}] Request timed out after 30s`
      : `[${source.label}] Failed to fetch: ${err instanceof Error ? err.message : String(err)}`
    console.error(msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  let links: Array<{ url: string; title?: string; published_at?: string }>
  try {
    links = source.feed_type === 'rss'
      ? await extractRssItems(body)
      : extractArticleLinks(body, source.url)
  } catch (err) {
    const msg = `[${source.label}] Parse error: ${err instanceof Error ? err.message : String(err)}`
    console.error(msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  for (const link of links) {
    upsertFeedItem({ source_id: id, item_url: link.url, title: link.title, published_at: link.published_at })
  }

  updateFeedSourceCheckedAt(id, new Date().toISOString())

  return NextResponse.json({ items_found: links.length })
}
