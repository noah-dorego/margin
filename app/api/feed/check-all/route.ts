import { NextResponse } from 'next/server'
import { getFeedSources, upsertFeedItem, updateFeedSourceCheckedAt } from '@/lib/db'
import { extractArticleLinks, SCRAPER_USER_AGENT } from '@/lib/feed-scraper'

export async function POST() {
  const sources = getFeedSources()

  let sources_checked = 0
  let total_items_found = 0

  for (const source of sources) {
    try {
      const res = await fetch(source.url, {
        headers: { 'User-Agent': SCRAPER_USER_AGENT },
      })
      const html = await res.text()
      const links = extractArticleLinks(html, source.url)

      for (const link of links) {
        upsertFeedItem({ source_id: source.id, item_url: link.url, title: link.title, published_at: link.published_at })
      }

      updateFeedSourceCheckedAt(source.id, new Date().toISOString())
      sources_checked++
      total_items_found += links.length
    } catch (err) {
      console.error(`Failed to check source ${source.label}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ sources_checked, total_items_found })
}
