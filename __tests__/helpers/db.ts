import Database from 'better-sqlite3'

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS regulatory_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    source_regulator TEXT NOT NULL,
    source_url TEXT,
    publish_date TEXT,
    raw_text TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text'
      CHECK(content_type IN ('text', 'pdf')),
    ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
    processing_status TEXT NOT NULL DEFAULT 'pending'
      CHECK(processing_status IN ('pending', 'processed', 'failed'))
  );

  CREATE TABLE IF NOT EXISTS regulatory_findings (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES regulatory_documents(id),
    finding_summary TEXT NOT NULL,
    effective_date TEXT,
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    severity_rationale TEXT,
    affected_products TEXT NOT NULL DEFAULT '[]',
    recommended_actions TEXT NOT NULL DEFAULT '[]',
    key_quotes TEXT NOT NULL DEFAULT '[]',
    confidence_score REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feed_sources (
    id             TEXT PRIMARY KEY,
    label          TEXT NOT NULL,
    url            TEXT NOT NULL UNIQUE,
    source_regulator  TEXT NOT NULL,
    category       TEXT NOT NULL DEFAULT 'news'
                   CHECK(category IN ('news', 'publications', 'orders')),
    feed_type      TEXT NOT NULL DEFAULT 'html'
                   CHECK(feed_type IN ('html', 'rss')),
    disabled       INTEGER NOT NULL DEFAULT 0,
    last_checked_at TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feed_items (
    id           TEXT PRIMARY KEY,
    source_id    TEXT NOT NULL REFERENCES feed_sources(id) ON DELETE CASCADE,
    item_url     TEXT NOT NULL UNIQUE,
    title        TEXT,
    detected_at  TEXT NOT NULL DEFAULT (datetime('now')),
    published_at TEXT,
    status       TEXT NOT NULL DEFAULT 'new'
                 CHECK(status IN ('new', 'dismissed', 'ingested')),
    document_id  TEXT REFERENCES regulatory_documents(id)
  );
`

export function createTestDb(): Database.Database {
  const testDb = new Database(':memory:')
  testDb.pragma('journal_mode = WAL')
  testDb.pragma('foreign_keys = ON')
  testDb.exec(SCHEMA)
  return testDb
}
