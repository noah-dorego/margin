import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('page title contains Dashboard', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('severity summary bar is visible with stat numbers', async ({ page }) => {
    // Stats bar contains severity labels
    await expect(page.getByText('critical')).toBeVisible()
    await expect(page.getByText('high')).toBeVisible()
    await expect(page.getByText('medium')).toBeVisible()
    await expect(page.getByText('low')).toBeVisible()
    // Total findings count is shown
    await expect(page.getByText(/total findings/)).toBeVisible()
  })

  test('FindingsTable renders the "Findings" heading and at least one row', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: 'Findings' })).toBeVisible()
    // Table should have at least one data row (seeded demo data)
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
  })

  test('severity column shows badge labels', async ({ page }) => {
    // At least one severity badge is present in the table
    const severityBadge = page.locator('tbody tr').first().locator('td').nth(2)
    await expect(severityBadge).toBeVisible()
  })

  test('clicking a table row navigates to finding detail', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    await expect(page).toHaveURL(/\/findings\//)
  })
})
