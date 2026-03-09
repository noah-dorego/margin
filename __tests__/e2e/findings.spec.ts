import { test, expect } from '@playwright/test'

test.describe('Finding detail page', () => {
  test('clicking a row on the dashboard navigates to the finding detail', async ({ page }) => {
    await page.goto('/')
    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()

    await expect(page).toHaveURL(/\/findings\//)
  })

  test('finding detail shows a severity badge', async ({ page }) => {
    await page.goto('/')
    await page.locator('tbody tr').first().click()

    // Severity badge: one of Critical / High / Medium / Low
    await expect(page.getByText(/critical|high|medium|low/i).first()).toBeVisible()
  })

  test('finding detail shows the finding summary as a heading', async ({ page }) => {
    await page.goto('/')
    await page.locator('tbody tr').first().click()

    // h1 should contain non-empty text (the finding summary)
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    const text = await heading.textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  })

  test('Key Quotes section is present', async ({ page }) => {
    await page.goto('/')
    await page.locator('tbody tr').first().click()

    await expect(page.getByText('Key Quotes')).toBeVisible()
  })

  test('back link navigates to the dashboard', async ({ page }) => {
    await page.goto('/')
    await page.locator('tbody tr').first().click()

    const backLink = page.getByRole('link', { name: /back to dashboard/i })
    await expect(backLink).toBeVisible()
    await backLink.click()
    await expect(page).toHaveURL('/')
  })
})
