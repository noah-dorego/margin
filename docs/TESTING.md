# Testing

## Scripts

| Command | Description |
|---|---|
| `npm test` | Run all unit and integration tests once |
| `npm run test:watch` | Run tests in watch mode (re-runs on file save) |
| `npm run test:coverage` | Run tests and print a coverage report |
| `npm run test:e2e` | Run Playwright E2E tests (requires dev server running) |

E2E tests will auto-start the dev server in CI (`process.env.CI=true`). Locally they reuse an already-running `npm run dev` instance, or start one if none is found.

---

## Test layers

### Unit — `__tests__/unit/lib/`

Pure function tests with no I/O. No mocking required.

| File | What it covers |
|---|---|
| `utils.test.ts` | `cn()`, `formatDate()`, `severityOrder`, `severityColor` |
| `prompts.test.ts` | `buildExtractionSystemPrompt()`, `buildExtractionUserMessage()`, `buildAssessmentPrompt()` |
| `feed-scraper.test.ts` | `extractRssItems()` (RSS XML parsing), `extractArticleLinks()` (HTML link extraction, dedup, filtering) |

### Integration — `__tests__/unit/lib/`

Tests that exercise real logic with external dependencies swapped out.

| File | Strategy |
|---|---|
| `db.test.ts` | Runs all DB helpers (`insertDocument`, `getFindings`, `getStats`, feed helpers, etc.) against an in-memory SQLite DB injected via `_setDbForTesting()`. No file I/O, no seeding side effects. |
| `pipeline.test.ts` | Mocks `callClaude`/`parseAIResponse` and all DB helpers via `vi.mock()`. Covers the happy path, partial assessment failure (non-fatal), extraction failure (sets doc to `failed`), and missing document. |

### API route tests — `__tests__/unit/api/`

Route handlers are imported directly and called with `new NextRequest(url)`. The `@/lib/db` module is mocked with `vi.mock()` so no database is touched.

| File | Routes covered |
|---|---|
| `findings.test.ts` | `GET /api/findings` (no filter, severity, regulator, product), `GET /api/findings/[id]` (found, 404) |
| `documents.test.ts` | `GET /api/documents`, `POST /api/documents` (valid, missing fields, invalid regulator), `POST /api/documents/[id]/process` (404, 409, 200) |
| `stats.test.ts` | `GET /api/stats` |
| `feed.test.ts` | `GET/POST /api/feed/sources`, `DELETE /api/feed/sources/[id]`, `GET /api/feed/items` (filter, invalid status), `PATCH /api/feed/items/[id]` (dismissed, invalid `new`, 404) |

### E2E — `__tests__/e2e/`

Playwright tests running against the live dev server with seeded demo data. All tests use Chromium.

| File | What it covers |
|---|---|
| `dashboard.spec.ts` | Page load, severity summary bar, findings table renders, row click navigates to detail |
| `documents.spec.ts` | Documents list, upload link, status badge, upload form fields |
| `findings.spec.ts` | Row → detail navigation, severity badge, finding summary heading, Key Quotes section, back link |

---

## DB isolation strategy

The production `getDb()` singleton opens `./db/margin.db` and runs seeding on first call. Tests bypass this entirely:

```ts
// In tests:
import { _setDbForTesting } from '@/lib/db'
import { createTestDb } from '__tests__/helpers/db'

beforeEach(() => {
  _setDbForTesting(createTestDb()) // fresh :memory: DB per test
})
```

`createTestDb()` (`__tests__/helpers/db.ts`) creates a `:memory:` SQLite database with the same schema as production but no seed data.

---

## Frameworks

| Layer | Framework |
|---|---|
| Unit + integration | [Vitest](https://vitest.dev) v4 |
| E2E | [Playwright](https://playwright.dev) |
| Coverage | `@vitest/coverage-v8` |
| Path aliases | `vite-tsconfig-paths` (resolves `@/` from `tsconfig.json`) |
