import { NextRequest, NextResponse } from 'next/server'
import { getFeedSource, upsertFeedItem, updateFeedSourceCheckedAt } from '@/lib/db'
import { extractArticleLinks, SCRAPER_USER_AGENT } from '@/lib/feed-scraper'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const source = getFeedSource(id)
  if (!source) {
    return NextResponse.json({ error: 'Feed source not found' }, { status: 404 })
  }

  let html: string
  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': SCRAPER_USER_AGENT },
    })
    html = await res.text()
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch source: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    )
  }

  const links = extractArticleLinks(html, source.url)

  for (const link of links) {
    upsertFeedItem({ source_id: id, item_url: link.url, title: link.title, published_at: link.published_at })
  }

  updateFeedSourceCheckedAt(id, new Date().toISOString())

  return NextResponse.json({ items_found: links.length })
}
