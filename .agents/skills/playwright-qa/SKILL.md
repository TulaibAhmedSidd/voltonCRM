---
name: playwright-qa
description: Reusable Autonomous QA & Playwright E2E Testing Agent. Writes and runs browser test scripts for complete top-to-bottom flows, UI loading feedback (<200ms detection), button double-click debounce protection, and duplicate API call prevention.
---

# Playwright QA & E2E Tester Agent

A production-ready, reusable QA agent and Playwright test harness for testing web applications end-to-end. Designed to be completely portable across projects (SaaS, CRM, e-commerce, internal portals).

## What This Agent Tests

1. **Top-to-Bottom User Journeys**:
   - Multi-role hierarchy: Admin creates Manager $\rightarrow$ Manager provisions Team Members $\rightarrow$ System receives records $\rightarrow$ Round-robin / manual assignment $\rightarrow$ End-user acts on records $\rightarrow$ Final disposition.
2. **UI Loading Feedback & Stuck Detection**:
   - Checks if visual feedback (spinners, skeletons, disabled attributes, pending text) appears within **200 ms** of a user click.
   - Flags interactions where the screen appears stuck or frozen to the user.
   - Logs exact latency: `feedbackDelayMs` and `totalDurationMs`.
3. **Anti-Double-Click & Duplicate API Call Prevention**:
   - Dispatches rapid double-clicks on submit buttons (`dblclick()` or rapid consecutive taps).
   - Intercepts network traffic to ensure only **1 HTTP request** is dispatched and buttons enter a disabled/loading state immediately.
4. **Mobile-First & Desktop Verification**:
   - Emulates mobile viewports (390 px) and desktop viewports (1280 px).
   - Validates touch targets ($\ge 44\text{ px}$) and responsive dialogs.

---

## Directory Structure

```
e2e/
├── helpers/
│   ├── ux-tester.ts      # Core reusable UX timing, double-click & API counter harness
│   └── auth.ts           # Authentication session setup helpers
├── specs/
│   ├── full-flow.spec.ts # Complete multi-role journey from top to bottom
│   └── ux-audit.spec.ts  # Visual feedback & double-click protection audit
└── playwright.config.ts  # Browser settings, mobile devices, traces & videos
```

---

## Core UX Testing Helper (`e2e/helpers/ux-tester.ts`)

Use `clickAndAuditUX(page, options)` in any Playwright test to automatically audit:
1. Did visual feedback appear under 200 ms?
2. Did the button prevent double clicks?
3. How many network requests were sent for the action?

```typescript
import { test, expect, Page, Locator } from '@playwright/test'
import { clickAndAuditUX } from '../helpers/ux-tester'

test('Submit lead button shows immediate spinner and blocks duplicate hits', async ({ page }) => {
  await page.goto('/leads/new')
  await page.fill('input[name="name"]', 'Test Customer')
  await page.fill('input[name="phone"]', '03001234567')

  const ux = await clickAndAuditUX(page, {
    triggerSelector: 'button[type="submit"]',
    expectedApiPattern: '**/api/**',
    testRapidClicks: true,
  })

  // Ensure user felt immediate feedback (< 200ms)
  expect(ux.hasVisualFeedback).toBe(true)
  expect(ux.feedbackDelayMs).toBeLessThan(200)

  // Ensure duplicate clicks did not trigger duplicate requests
  expect(ux.apiCallCount).toBe(1)
  expect(ux.doubleClickProtected).toBe(true)
})
```

---

## How to Run in Any Project

1. Install Playwright:
   ```bash
   npm install -D @playwright/test
   npx playwright install --with-deps chromium
   ```
2. Run test suite:
   ```bash
   npx playwright test
   ```
3. Run with UI mode (interactive step-by-step viewer):
   ```bash
   npx playwright test --ui
   ```
