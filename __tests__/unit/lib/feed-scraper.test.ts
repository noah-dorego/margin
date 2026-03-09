import { describe, it, expect } from 'vitest'
import { extractRssItems, extractArticleLinks } from '@/lib/feed-scraper'

const VALID_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <item>
      <title>Article One</title>
      <link>https://example.com/article-1</link>
      <pubDate>Mon, 01 Jan 2025 00:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Article Two</title>
      <link>https://example.com/article-2</link>
      <pubDate>Tue, 02 Jan 2025 00:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Article Three</title>
      <link>https://example.com/article-3</link>
    </item>
    <item>
      <title>Article Four</title>
      <link>https://example.com/article-4</link>
    </item>
    <item>
      <title>Article Five</title>
      <link>https://example.com/article-5</link>
    </item>
    <item>
      <title>Article Six — should be excluded (beyond 5 limit)</title>
      <link>https://example.com/article-6</link>
    </item>
  </channel>
</rss>`

const MALFORMED_RSS = `not valid xml <<<<<`

describe('extractRssItems', () => {
  it('parses valid RSS and returns up to 5 items', async () => {
    const items = await extractRssItems(VALID_RSS)
    expect(items.length).toBe(5)
    expect(items[0].url).toBe('https://example.com/article-1')
    expect(items[0].title).toBe('Article One')
  })

  it('throws a descriptive error on malformed XML', async () => {
    await expect(extractRssItems(MALFORMED_RSS)).rejects.toThrow('RSS parse failed')
  })

  it('filters out items with no URL', async () => {
    const rssWithEmpty = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>No link</title></item>
      <item><title>Has link</title><link>https://example.com/x</link></item>
    </channel></rss>`
    const items = await extractRssItems(rssWithEmpty)
    expect(items.length).toBe(1)
    expect(items[0].url).toBe('https://example.com/x')
  })
})

describe('extractArticleLinks', () => {
  it('extracts links from HTML and resolves relative URLs', () => {
    const html = `<html><body><main>
      <a href="/news/2025/article-one">New AML Guidance from FINTRAC</a>
      <a href="/news/2025/article-two">Updated Margin Rules from CIRO</a>
    </main></body></html>`

    const results = extractArticleLinks(html, 'https://example.com/news')
    expect(results.length).toBe(2)
    expect(results[0].url).toMatch(/^https:\/\/example\.com/)
    expect(results[0].title).toBe('New AML Guidance from FINTRAC')
  })

  it('deduplicates identical URLs', () => {
    const html = `<html><body><main>
      <a href="/page/article">CIRO Rule Change Details and Analysis</a>
      <a href="/page/article">CIRO Rule Change Details and Analysis</a>
    </main></body></html>`

    const results = extractArticleLinks(html, 'https://example.com')
    expect(results.length).toBe(1)
  })

  it('filters out anchor-only links (href starting with #)', () => {
    const html = `<html><body><main>
      <a href="#section">Skip to content</a>
      <a href="/real-article">Regulatory Update 2025: Full Details</a>
    </main></body></html>`

    const results = extractArticleLinks(html, 'https://example.com')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Regulatory Update 2025: Full Details')
  })

  it('filters out titles shorter than 8 characters', () => {
    const html = `<html><body><main>
      <a href="/short">Hi</a>
      <a href="/long-enough">Long enough title here</a>
    </main></body></html>`

    const results = extractArticleLinks(html, 'https://example.com')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Long enough title here')
  })

  it('returns at most 5 links', () => {
    const links = Array.from({ length: 10 }, (_, i) =>
      `<a href="/article-${i}">Article number ${i} from regulator</a>`
    ).join('\n')
    const html = `<html><body><main>${links}</main></body></html>`

    const results = extractArticleLinks(html, 'https://example.com')
    expect(results.length).toBe(5)
  })
})
