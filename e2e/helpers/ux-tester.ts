import { expect, type Page, type Request } from '@playwright/test'

export interface UXAuditOptions {
  /** Selector of the button or interactive element to click. */
  triggerSelector: string
  /** Optional URL substring or RegExp to match outgoing network API calls. */
  apiUrlPattern?: string | RegExp
  /** Whether to simulate rapid consecutive clicks to test double-click / debounce protection. */
  testRapidClicks?: boolean
  /** Time limit in milliseconds within which visual feedback must appear (default: 200ms). */
  maxFeedbackDelayMs?: number
  /** Expected maximum time for the entire action to complete (default: 5000ms). */
  maxTotalDurationMs?: number
}

export interface UXAuditReport {
  triggerSelector: string
  /** Time in ms from click until visual loading feedback appeared. */
  feedbackDelayMs: number
  /** Total time in ms from click until network/action completion. */
  totalDurationMs: number
  /** Whether a visual loading state was detected. */
  hasVisualFeedback: boolean
  /** Nature of visual feedback identified. */
  feedbackType: 'spinner' | 'disabled' | 'text-change' | 'aria-busy' | 'none'
  /** Flagged true if user waited > 200ms without seeing any loading feedback (feels stuck). */
  isPerceivedStuck: boolean
  /** Number of times the element was clicked during rapid-click test. */
  clicksAttempted: number
  /** Number of API calls dispatched to the backend. */
  apiCallCount: number
  /** True if the UI protected against multiple API dispatches on rapid clicking. */
  doubleClickProtected: boolean
  /** List of UX findings and human-readable warnings. */
  warnings: string[]
}

/**
 * Universal UX & Double-Click Auditor for Web Applications.
 * Tests visual loading feedback latency, UI freeze perception, and API deduplication.
 */
export async function clickAndAuditUX(
  page: Page,
  options: UXAuditOptions,
): Promise<UXAuditReport> {
  const {
    triggerSelector,
    apiUrlPattern,
    testRapidClicks = true,
    maxFeedbackDelayMs = 200,
    maxTotalDurationMs = 5000,
  } = options

  const warnings: string[] = []
  const element = page.locator(triggerSelector).first()
  await expect(element).toBeVisible({ timeout: 5000 })

  const initialText = ((await element.textContent()) || '').trim()

  // Track network requests
  let apiCallCount = 0
  const onRequest = (req: Request) => {
    const url = req.url()
    if (apiUrlPattern) {
      if (typeof apiUrlPattern === 'string' && url.includes(apiUrlPattern)) {
        apiCallCount++
      } else if (apiUrlPattern instanceof RegExp && apiUrlPattern.test(url)) {
        apiCallCount++
      }
    } else if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr') {
      apiCallCount++
    }
  }

  page.on('request', onRequest)

  const clickStartTime = Date.now()
  let feedbackDetectedTime: number | null = null
  let feedbackType: UXAuditReport['feedbackType'] = 'none'

  // Polling loop to detect visual loading state as fast as possible (<20ms intervals)
  const pollFeedback = async () => {
    const maxPollTime = 1500
    const startPoll = Date.now()
    while (Date.now() - startPoll < maxPollTime) {
      try {
        const [isDisabled, ariaBusy, hasSpinner, currentText] = await Promise.all([
          element.getAttribute('disabled').then((v) => v !== null),
          element.getAttribute('aria-busy').then((v) => v === 'true'),
          element.locator('.animate-spin, [role="progressbar"], svg.lucide-loader, svg.lucide-loader-2').count().then((c) => c > 0),
          element.textContent().then((t) => (t || '').trim()),
        ])

        if (hasSpinner) {
          feedbackType = 'spinner'
          feedbackDetectedTime = Date.now()
          break
        }
        if (ariaBusy) {
          feedbackType = 'aria-busy'
          feedbackDetectedTime = Date.now()
          break
        }
        if (isDisabled) {
          feedbackType = 'disabled'
          feedbackDetectedTime = Date.now()
          break
        }
        if (currentText && currentText !== initialText) {
          feedbackType = 'text-change'
          feedbackDetectedTime = Date.now()
          break
        }
      } catch {
        // Element might have unmounted or page navigated
        break
      }
      await page.waitForTimeout(20)
    }
  }

  // Dispatch initial click and optional rapid double-click
  let clicksAttempted = 1
  const clickPromise = (async () => {
    await element.click({ delay: 10 })
    if (testRapidClicks) {
      // Rapid secondary tap within 40ms to simulate impatient user
      try {
        await element.click({ delay: 10, timeout: 200, force: false })
        clicksAttempted = 2
      } catch {
        // Expected if element became disabled immediately!
      }
    }
  })()

  // Concurrently poll for visual feedback
  await Promise.all([clickPromise, pollFeedback()])

  // Wait for network settle
  try {
    await page.waitForLoadState('networkidle', { timeout: maxTotalDurationMs })
  } catch {
    // Some routes stream or hold long-lived connections
  }

  const completionTime = Date.now()
  const totalDurationMs = completionTime - clickStartTime

  page.off('request', onRequest)

  const feedbackDelayMs = feedbackDetectedTime
    ? feedbackDetectedTime - clickStartTime
    : totalDurationMs

  const hasVisualFeedback = feedbackType !== 'none'
  const isPerceivedStuck = !hasVisualFeedback && totalDurationMs > maxFeedbackDelayMs

  if (isPerceivedStuck) {
    warnings.push(
      `PERCEPTION ISSUE: Action took ${totalDurationMs}ms but provided no visual feedback (spinner/disabled state) within ${maxFeedbackDelayMs}ms. The UI will appear stuck/unresponsive to users.`,
    )
  }

  const doubleClickProtected = clicksAttempted === 1 || apiCallCount <= 1

  if (!doubleClickProtected) {
    warnings.push(
      `DOUBLE-CLICK VULNERABILITY: Multiple clicks triggered ${apiCallCount} API requests. The button should disable immediately on first click.`,
    )
  }

  return {
    triggerSelector,
    feedbackDelayMs,
    totalDurationMs,
    hasVisualFeedback,
    feedbackType,
    isPerceivedStuck,
    clicksAttempted,
    apiCallCount,
    doubleClickProtected,
    warnings,
  }
}

/**
 * Asserts that an interaction meets healthy UX & anti-duplicate standards.
 */
export function assertHealthyUX(report: UXAuditReport) {
  if (report.warnings.length > 0) {
    console.warn(`[UX Audit Warning] for ${report.triggerSelector}:`, report.warnings.join('\n'))
  }
  expect(
    report.isPerceivedStuck,
    `UI appeared stuck! Took ${report.totalDurationMs}ms with no visible loading feedback.`,
  ).toBe(false)

  expect(
    report.doubleClickProtected,
    `Double-click triggered ${report.apiCallCount} duplicate backend calls!`,
  ).toBe(true)
}
