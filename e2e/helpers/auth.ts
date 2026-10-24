import { expect, type Page } from '@playwright/test'
import { clickAndAuditUX, assertHealthyUX } from './ux-tester'

/**
 * Logs in a user via the UI, asserting that:
 * 1. The sign-in button displays loading state immediately.
 * 2. Rapid double clicks don't cause duplicate login requests.
 * 3. The user successfully lands on /dashboard.
 */
export async function loginViaUI(page: Page, credentials: { login: string; password: string }) {
  await page.goto('/login')
  await expect(page.locator('h1')).toContainText(/Sign in/i)

  await page.fill('input[name="login"]', credentials.login)
  await page.fill('input[name="password"]', credentials.password)

  const ux = await clickAndAuditUX(page, {
    triggerSelector: 'button[type="submit"]:has-text("Sign in")',
    testRapidClicks: true,
  })

  assertHealthyUX(ux)
  await page.waitForURL('**/dashboard', { timeout: 15_000 })
  await expect(page).toHaveURL(/.*dashboard/)
}

/**
 * Clears cookies to simulate signing out or switching roles.
 */
export async function logoutViaUI(page: Page) {
  await page.context().clearCookies()
  await page.goto('/login')
}
