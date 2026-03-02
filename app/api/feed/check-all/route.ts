import { NextResponse } from 'next/server'
import { getFeedSources, upsertFeedItem, updateFeedSourceCheckedAt } from '@/lib/db'
import { extractArticleLinks, extractRssItems, SCRAPER_HEADERS } from '@/lib/feed-scraper'
import type { FeedSource } from '@/lib/types'

interface SourceResult {
  source: FeedSource
  items_found: number
  error?: string
}

async function checkSource(source: FeedSource): Promise<SourceResult> {
  let body: string

  try {
    const res = await fetch(source.url, {
      headers: SCRAPER_HEADERS,
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      const msg = `HTTP ${res.status} ${res.statusText}`
      console.error(`[check-all] [${source.label}] Server error: ${msg}`)
      return { source, items_found: 0, error: msg }
    }

    body = await res.text()
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    const msg = isTimeout
      ? `Request timed out after 30s`
      : `Fetch failed: ${err instanceof Error ? err.message : String(err)}`
    console.error(`[check-all] [${source.label}] ${msg}`)
    return { source, items_found: 0, error: msg }
  }

  try {
    const links = source.feed_type === 'rss'
      ? await extractRssItems(body)
      : extractArticleLinks(body, source.url)

    for (const link of links) {
      upsertFeedItem({ source_id: source.id, item_url: link.url, title: link.title, published_at: link.published_at })
    }

    updateFeedSourceCheckedAt(source.id, new Date().toISOString())
    return { source, items_found: links.length }
  } catch (err) {
    const msg = `Parse/insert error: ${err instanceof Error ? err.message : String(err)}`
    console.error(`[check-all] [${source.label}] ${msg}`)
    return { source, items_found: 0, error: msg }
  }
}

export async function POST() {
  const sources = getFeedSources().filter(s => !s.disabled)

  const results = await Promise.allSettled(sources.map(checkSource))

  let sources_checked = 0
  let total_items_found = 0
  const failures: { label: string; error: string }[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { source, items_found, error } = result.value
      if (error) {
        failures.push({ label: source.label, error })
      } else {
        sources_checked++
        total_items_found += items_found
      }
    } else {
      console.error(`[check-all] Unexpected rejection: ${result.reason}`)
    }
  }

  if (failures.length > 0) {
    console.error(`[check-all] ${failures.length} source(s) failed:\n${failures.map(f => `  ${f.label}: ${f.error}`).join('\n')}`)
  }

  return NextResponse.json({ sources_checked, total_items_found, failures })
}
