# RegScope — Implementation Roadmap

## Current state (as of 2026-03-01)

**Complete:**

- Full DB layer (`lib/db.ts`) — all CRUD helpers, singleton pattern, WAL mode
- AI process pipeline (`app/api/documents/[id]/process`) — extraction → per-finding assessment → persist
- All document + finding API routes (`GET/POST /api/documents`, `GET /api/findings`, `GET /api/findings/[id]`, `GET /api/stats`)
- Native PDF support via Claude document content blocks — no pdf-parse dependency
- Upload form with three tabs: File (.txt/.pdf drag+drop), Link (placeholder), Manual (text paste)
- Nav layout with sidebar (`app/layout.tsx`, `components/Sidebar.tsx`)
- Dashboard — severity summary bar, filter sidebar (severity/agency/product), findings table with severity-colored left borders
- Finding detail page — metadata grid, key quotes, recommended actions, severity rationale, confidence bar, low confidence banner (< 0.7)
- Confidence badge in findings table rows (shown when score < 0.85)
- `app/error.tsx` and `app/not-found.tsx` global error/404 pages
- Documents list page with status, agency badge, ProcessButton
- `db/seed.ts` — seeder with duplicate prevention
- `db/process-all.ts` — bulk processing script for all pending/failed documents
- Sonner toasts throughout

**Terminology:** documents → findings (not "changes")

---

## Day 3 — Polish + Smoke Test ✓

**Remaining:**

- [ ] Run `npx tsx --env-file=.env.local db/process-all.ts` to process all 8 seed documents
- [ ] Verify dashboard shows a realistic spread of severities and findings across agencies

Everything else in Day 3 is complete.

---

## Day 4 — Regulatory Feed

**Goal:** Turn RegScope from a manual-upload tool into a live monitoring system. Users configure agency publication pages; RegScope detects new links and enables one-click AI ingestion.

**End of day checkpoint:** A user can open the Feed page, check all sources, see new bulletin links appear in the inbox, and ingest one with a single click — triggering the full extraction + assessment pipeline automatically.

---

### Overview

```
Feed Sources (configured URLs)
  CRA Newsroom         https://canada.ca/en/revenue-agency/news/newsroom.html
  CIRO News            https://ciro.ca/news-and-publications
  OSC News             https://osc.ca/en/news-events
  …

       ↓  [Check All] or per-source [Check]

Feed Inbox (detected new links)
  [NEW]  CRA: "2026 TFSA Contribution Limit Announced"   Jan 12  [Ingest] [Dismiss]
  [NEW]  CIRO: "Notice 25-0142 — Margin Rule Amendment"  Jan 10  [Ingest] [Dismiss]
  [DONE] OSC: "Staff Notice 33-754"                      Jan 8   → 3 findings
```

---

### 1. Package install

```bash
npm install node-html-parser
```

Used for both link+title extraction from source pages and HTML stripping during ingestion.

---

### 2. DB schema additions

**File:** `lib/db.ts` (append to inline DDL), `db/schema.sql` (mirror)

```sql
CREATE TABLE IF NOT EXISTS feed_sources (
  id            TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  url           TEXT NOT NULL UNIQUE,
  source_agency TEXT NOT NULL,
  last_checked_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feed_items (
  id           TEXT PRIMARY KEY,
  source_id    TEXT NOT NULL REFERENCES feed_sources(id) ON DELETE CASCADE,
  item_url     TEXT NOT NULL UNIQUE,   -- URL deduplication
  title        TEXT,
  detected_at  TEXT NOT NULL DEFAULT (datetime('now')),
  status       TEXT NOT NULL DEFAULT 'new'
               CHECK(status IN ('new', 'dismissed', 'ingested')),
  document_id  TEXT REFERENCES regulatory_documents(id)
);
```

Deduplication is by `item_url UNIQUE` — re-running a source check never creates duplicates.

---

### 3. New types

**File:** `lib/types.ts`

```typescript
export interface FeedSource {
  id: string
  label: string
  url: string
  source_agency: SourceAgency
  last_checked_at?: string
  created_at: string
}

export interface FeedItem {
  id: string
  source_id: string
  item_url: string
  title?: string
  detected_at: string
  status: 'new' | 'dismissed' | 'ingested'
  document_id?: string
}
```

---

### 4. New DB helpers

**File:** `lib/db.ts`

```typescript
// Feed sources
getFeedSources(): FeedSource[]
insertFeedSource(source: { label: string; url: string; source_agency: SourceAgency }): string
deleteFeedSource(id: string): void
updateFeedSourceCheckedAt(id: string, checkedAt: string): void

// Feed items
getFeedItems(status?: 'new' | 'dismissed' | 'ingested'): FeedItem[]
upsertFeedItem(item: { source_id: string; item_url: string; title?: string }): void  // INSERT OR IGNORE
updateFeedItemStatus(id: string, status: FeedItem['status'], document_id?: string): void
```

Pre-seed sources inside `getDb()` using `INSERT OR IGNORE INTO feed_sources` so they're always present without a separate seed script.

---

### 5. Pre-seeded sources

Inserted in `getDb()` after table creation:

| Label                    | Agency          | URL                                                             |
| ------------------------ | --------------- | --------------------------------------------------------------- |
| CRA Newsroom             | CRA             | `https://www.canada.ca/en/revenue-agency/news/newsroom.html`    |
| CIRO News & Publications | CIRO            | `https://www.ciro.ca/news-and-publications`                     |
| OSC News                 | OSC             | `https://www.osc.ca/en/news-events`                             |
| CSA News                 | CSA             | `https://www.securities-administrators.ca/news/`                |
| FINTRAC What's New       | FINTRAC         | `https://fintrac-canafe.gc.ca/new-neuf/1-eng`                   |
| OSFI News                | OSFI            | `https://www.osfi-bsif.gc.ca/en/news-events`                    |
| FCAC News                | FCAC            | `https://www.canada.ca/en/financial-consumer-agency/news.html`  |
| Dept of Finance News     | Dept-of-Finance | `https://www.canada.ca/en/department-finance/news.html`         |
| Payments Canada News     | Payments-Canada | `https://www.payments.ca/news`                                  |

---

### 6. API routes

**New files under `app/api/feed/`:**

| Method   | Route                          | Description                                               |
| -------- | ------------------------------ | --------------------------------------------------------- |
| `GET`    | `/api/feed/sources`            | Return all `FeedSource[]`                                 |
| `POST`   | `/api/feed/sources`            | Add source `{ label, url, source_agency }`                |
| `DELETE` | `/api/feed/sources/[id]`       | Remove source + cascade-delete its items                  |
| `POST`   | `/api/feed/sources/[id]/check` | Fetch source page, extract links, upsert feed items       |
| `POST`   | `/api/feed/check-all`          | Run check on every source sequentially                    |
| `GET`    | `/api/feed/items`              | Return items, optional `?status=new`                      |
| `PATCH`  | `/api/feed/items/[id]`         | Set status to `dismissed`                                 |
| `POST`   | `/api/feed/items/[id]/ingest`  | Fetch article, strip HTML, create document, run pipeline  |

**Check source logic** (`POST /api/feed/sources/[id]/check`):

```typescript
import { parse } from 'node-html-parser'

const html = await fetch(source.url, {
  headers: { 'User-Agent': 'RegScope/1.0' },
}).then((r) => r.text())

const root = parse(html)
const links = root.querySelectorAll('a[href]')
  .map((el) => ({
    url: new URL(el.getAttribute('href')!, source.url).href,
    title: el.text.trim() || undefined,
  }))
  .filter(({ url }) => url.startsWith('http'))

for (const { url, title } of links) {
  upsertFeedItem({ source_id: source.id, item_url: url, title })
}
updateFeedSourceCheckedAt(source.id, new Date().toISOString())

return NextResponse.json({ new_items: links.length })
```

**Ingest logic** (`POST /api/feed/items/[id]/ingest`):

```typescript
// 1. Fetch the article page and strip HTML to plain text
const html = await fetch(item.item_url, {
  headers: { 'User-Agent': 'RegScope/1.0' },
}).then((r) => r.text())
const root = parse(html)
// Remove nav/footer/script noise
root.querySelectorAll('script, style, nav, footer, header').forEach((el) => el.remove())
const raw_text = root.structuredText.trim()

// 2. Derive title from page <title> tag if feed item has none
const title = item.title || root.querySelector('title')?.text?.trim() || item.item_url

// 3. Create document
const { id: documentId } = await insertDocument({
  title,
  source_agency: source.source_agency,
  source_url: item.item_url,
  raw_text,
  content_type: 'text',
})

// 4. Run pipeline
// (call process logic inline — same code as /api/documents/[id]/process)

// 5. Mark item as ingested
updateFeedItemStatus(item.id, 'ingested', documentId)

return NextResponse.json({ document_id: documentId, findings_extracted: N })
```

Note: ingest calls the pipeline logic directly (shared helper, not HTTP). Extract the pipeline body from `app/api/documents/[id]/process/route.ts` into `lib/pipeline.ts` so both routes can reuse it without an HTTP round-trip.

---

### 7. Shared pipeline helper

**New file:** `lib/pipeline.ts`

Extract the extraction + assessment loop from `app/api/documents/[id]/process/route.ts` into:

```typescript
export async function runPipeline(id: string): Promise<{ findings_extracted: number; findings_failed: number }>
```

Update `app/api/documents/[id]/process/route.ts` to call `runPipeline(id)` instead of inlining the logic.
The ingest route calls `runPipeline(documentId)` after creating the document.

---

### 8. UI

**Sidebar:** Add **Feed** link to `components/Sidebar.tsx` (icon: `Rss` from lucide-react), between Documents and bottom.

**`app/feed/page.tsx`** — server component, two-panel layout:

```
Feed                                           [Check All Sources]
────────────────────────────────────────────────────────────────────
Sources (left panel, 240px)  │  Inbox — 14 new (right panel, flex-1)
─────────────────────────    │  ──────────────────────────────────────
CRA Newsroom            [✓]  │  [NEW]  TFSA Limit 2026 · CRA · Jan 12
CIRO News & Pubs        [✓]  │         ciro.ca/…/tfsa-2026
OSC News                [✓]  │         [Ingest →]   [Dismiss]
OSFI Notices            [✓]  │
FCAC Updates            [✓]  │  [NEW]  Notice 25-0142 · CIRO · Jan 10
                             │         ciro.ca/notices/…
[+ Add Source]               │         [Ingest →]   [Dismiss]
                             │
                             │  [DONE] Staff Notice 33-754 · OSC · Jan 8
                             │         → 3 findings extracted
```

**`components/FeedSourceList.tsx`** — `'use client'`

- Lists sources with last-checked timestamp
- Per-source `[Check]` button — calls `POST /api/feed/sources/[id]/check`, router.refresh() on success
- `[+ Add Source]` inline form: label, URL, agency select → `POST /api/feed/sources`
- Delete button (trash icon) → `DELETE /api/feed/sources/[id]`

**`components/FeedInbox.tsx`** — `'use client'`

- Accepts `items: FeedItem[]` from server component
- Groups by status: new first, then ingested (collapsed or at bottom)
- Each new item: title, source agency badge, truncated URL, detected date
- `[Ingest →]` → `POST /api/feed/items/[id]/ingest` with inline spinner (can take 15–30s); on success show findings count toast + router.refresh()
- `[Dismiss]` → `PATCH /api/feed/items/[id]` with `{ status: 'dismissed' }`; router.refresh()

**`app/feed/page.tsx`** renders both components side by side, reading initial data server-side via `getFeedSources()` and `getFeedItems()`.

---

### 9. `[Check All Sources]` button

**`components/CheckAllButton.tsx`** — `'use client'`

Calls `POST /api/feed/check-all`. Shows a spinner while in-flight (can take several seconds per source). On complete: toast with total new items found, router.refresh().

---

### Day 4 checklist

- [ ] `npm install node-html-parser`
- [ ] Add `feed_sources` and `feed_items` tables to DB + `lib/db.ts` DDL
- [ ] Add `FeedSource`, `FeedItem` types to `lib/types.ts`
- [ ] Add DB helpers to `lib/db.ts`
- [ ] Seed `feed_sources` inside `getDb()` with 9 agency sources
- [ ] Extract pipeline logic to `lib/pipeline.ts`
- [ ] Implement all 8 API routes under `app/api/feed/`
- [ ] Add Feed nav link to `components/Sidebar.tsx`
- [ ] Build `app/feed/page.tsx` (server component)
- [ ] Build `components/FeedSourceList.tsx` (client)
- [ ] Build `components/FeedInbox.tsx` (client)
- [ ] Build `components/CheckAllButton.tsx` (client)
- [ ] Check one source → verify items appear in inbox
- [ ] Ingest one item → verify findings appear on dashboard

---

## Deployment

SQLite (`better-sqlite3`) does not work on Vercel's serverless runtime. Options:

**Option A — Vercel + Turso (recommended for demo speed)**
- Turso is hosted libSQL (SQLite-compatible)
- Replace `better-sqlite3` with `@libsql/client`
- Same SQL, minimal code changes, free tier sufficient

**Option B — Fly.io / Railway (persistent disk)**
- Long-running Node.js process, not serverless
- `better-sqlite3` works unchanged, DB file persists on disk

**Option C — Pre-seeded static demo**
- Commit the fully-processed `db/regscope.db` to the repo
- Deploy anywhere with persistent storage
- Data is static but the demo looks live

---

## Package install summary

| Package            | Purpose                                     | When  |
| ------------------ | ------------------------------------------- | ----- |
| `node-html-parser` | Link extraction + HTML stripping for Feed   | Day 4 |
| `@libsql/client`   | Hosted SQLite for Vercel deploy (Option A)  | Deploy|
