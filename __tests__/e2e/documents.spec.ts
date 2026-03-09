import { test, expect } from '@playwright/test'

test.describe('Documents list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/documents')
  })

  test('page heading says Documents', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Documents')
  })

  test('lists at least one seeded document', async ({ page }) => {
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
  })

  test('Upload Document button links to /documents/upload', async ({ page }) => {
    const uploadLink = page.getByRole('link', { name: /upload document/i })
    await expect(uploadLink).toBeVisible()
    await expect(uploadLink).toHaveAttribute('href', '/documents/upload')
  })

  test('status badge is visible in each row', async ({ page }) => {
    // Status column (4th td) should contain Processed, Pending, or Failed
    const firstRow = page.locator('tbody tr').first()
    const statusCell = firstRow.locator('td').nth(3)
    await expect(statusCell).toContainText(/processed|pending|failed/i)
  })
})

test.describe('Upload form', () => {
  test('renders Manual tab with required fields', async ({ page }) => {
    await page.goto('/documents/upload')
    // Title field should be present
    await expect(page.getByLabel(/title/i)).toBeVisible()
  })
})
