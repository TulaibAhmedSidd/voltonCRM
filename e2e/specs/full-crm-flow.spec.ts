import { test, expect } from '@playwright/test'
import { clickAndAuditUX, assertHealthyUX } from '../helpers/ux-tester'

test.describe.serial('CRM Full Flow & UX Performance Test (Top-to-Bottom)', () => {
  const timestamp = Date.now()
  const managerEmail = `mgr_${timestamp}@volton.test`
  const agentEmail = `agt_${timestamp}@volton.test`
  const password = 'StrongPassword123!'
  const customerPhone = '03001234567'

  test('1. Admin creates a Manager with immediate UI loading feedback', async ({ page }) => {
    // 1. Log in as super_admin
    await page.goto('/login')
    await page.fill('input[name="login"]', 'owner')
    await page.fill('input[name="password"]', 'OwnerPass123!')

    const loginUx = await clickAndAuditUX(page, {
      triggerSelector: 'button[type="submit"]:has-text("Sign in")',
      testRapidClicks: true,
    })
    assertHealthyUX(loginUx)
    await page.waitForURL('**/dashboard')

    // 2. Navigate to Team page to create a Manager
    await page.goto('/team')
    await expect(page.locator('h1')).toContainText(/Team/i)

    // Open Add member form
    const addMemberTrigger = page.locator('button:has-text("Add team member"), a:has-text("Add team member")').first()
    if (await addMemberTrigger.isVisible()) {
      await addMemberTrigger.click()
    }

    await page.fill('input[name="name"]', 'QA Test Manager')
    await page.fill('input[name="email"]', managerEmail)
    await page.fill('input[name="password"]', password)

    // Select manager role if dropdown exists
    const roleSelect = page.locator('select[name="role"]')
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('manager')
    }

    // Submit and audit UX
    const createUx = await clickAndAuditUX(page, {
      triggerSelector: 'button[type="submit"]:has-text("Add member"), button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Create")',
      testRapidClicks: true,
    })

    assertHealthyUX(createUx)
    console.log(`[QA Report] Manager creation: ${createUx.totalDurationMs}ms total, feedback in ${createUx.feedbackDelayMs}ms`)
  })

  test('2. Manager logs in and creates a Call Agent', async ({ page }) => {
    // Sign out admin
    await page.context().clearCookies()

    // Sign in as new Manager
    await page.goto('/login')
    await page.fill('input[name="login"]', managerEmail)
    await page.fill('input[name="password"]', password)

    const loginUx = await clickAndAuditUX(page, {
      triggerSelector: 'button[type="submit"]:has-text("Sign in")',
      testRapidClicks: true,
    })
    assertHealthyUX(loginUx)
    await page.waitForURL('**/dashboard')

    // Navigate to Team to create Agent
    await page.goto('/team')
    const addMemberTrigger = page.locator('button:has-text("Add team member"), a:has-text("Add team member")').first()
    if (await addMemberTrigger.isVisible()) {
      await addMemberTrigger.click()
    }

    await page.fill('input[name="name"]', 'QA Call Agent')
    await page.fill('input[name="email"]', agentEmail)
    await page.fill('input[name="password"]', password)

    const roleSelect = page.locator('select[name="role"]')
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('agent')
    }

    const agentUx = await clickAndAuditUX(page, {
      triggerSelector: 'button[type="submit"]:has-text("Add member"), button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Create")',
      testRapidClicks: true,
    })

    assertHealthyUX(agentUx)
    console.log(`[QA Report] Agent creation: ${agentUx.totalDurationMs}ms total, feedback in ${agentUx.feedbackDelayMs}ms`)
  })

  test('3. Leads Ingestion & Table Actions with Follow-Up Modal', async ({ page }) => {
    await page.goto('/leads')
    await expect(page.locator('h1')).toContainText(/Leads/i)

    // Verify removed columns (Source, Department, Stages) are not present in table header
    const tableHeader = page.locator('table thead')
    if (await tableHeader.isVisible()) {
      await expect(tableHeader).not.toContainText(/\bStages\b/i)
      await expect(tableHeader).not.toContainText(/\bDepartment\b/i)
      // Verify Follow-Up columns are present
      await expect(tableHeader).toContainText(/Follow-Up 1/i)
      await expect(tableHeader).toContainText(/Follow-Up 2/i)
      await expect(tableHeader).toContainText(/Follow-Up 3/i)
    }

    // Test Quick Add Lead if present
    const addLeadButton = page.locator('button:has-text("Add lead"), a:has-text("Add lead")').first()
    if (await addLeadButton.isVisible()) {
      await addLeadButton.click()
      await page.fill('input[name="name"]', 'QA Customer Lead')
      await page.fill('input[name="phone"]', customerPhone)

      const submitLeadUx = await clickAndAuditUX(page, {
        triggerSelector: 'button[type="submit"]:has-text("Save lead"), button[type="submit"]:has-text("Add")',
        testRapidClicks: true,
      })
      assertHealthyUX(submitLeadUx)
      console.log(`[QA Report] Add Lead: ${submitLeadUx.totalDurationMs}ms total, feedback in ${submitLeadUx.feedbackDelayMs}ms`)
    }

    // Test Follow-Up 1 Modal directly on table row
    const followUp1Btn = page.locator('button:has-text("1 Pending"), button:has-text("1 Done")').first()
    if (await followUp1Btn.isVisible()) {
      await followUp1Btn.click()

      // Modal opens
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()
      await expect(modal).toContainText(/Follow-Up 1/i)

      // Verify quick contact buttons (Call & WhatsApp) are present
      await expect(modal.locator('a:has-text("WhatsApp")')).toBeVisible()
      await expect(modal.locator('a:has-text("Call")')).toBeVisible()

      // Fill follow-up details
      await modal.locator('textarea[name="notes"]').fill('Customer requested quotation for 10kW system.')

      // Click save and audit UX for spinner & anti-double-click
      const saveFuUx = await clickAndAuditUX(page, {
        triggerSelector: '[role="dialog"] button:has-text("Save Follow-Up")',
        testRapidClicks: true,
      })
      assertHealthyUX(saveFuUx)
      console.log(`[QA Report] Follow-Up 1 Save: ${saveFuUx.totalDurationMs}ms total, feedback in ${saveFuUx.feedbackDelayMs}ms`)
    }
  })

  test('4. Send Quotation from Leads Table & Standalone Quotation Builder', async ({ page }) => {
    await page.goto('/leads')

    // Test Send Quotation button in row
    const sendQuoteBtn = page.locator('button:has-text("Send Quotation")').first()
    if (await sendQuoteBtn.isVisible()) {
      await sendQuoteBtn.click()

      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText(/Quotation/i)

      // Test Generate PDF button inside modal
      const generateBtn = dialog.locator('button:has-text("Generate quotation PDF")')
      if (await generateBtn.isVisible()) {
        const quoteUx = await clickAndAuditUX(page, {
          triggerSelector: '[role="dialog"] button:has-text("Generate quotation PDF")',
          testRapidClicks: true,
        })
        assertHealthyUX(quoteUx)
        console.log(`[QA Report] Quotation Generation: ${quoteUx.totalDurationMs}ms total, feedback in ${quoteUx.feedbackDelayMs}ms`)
      }

      // Close dialog
      await page.keyboard.press('Escape')
    }

    // Test dedicated Quotation Builder tab (/quotations)
    await page.goto('/quotations')
    await expect(page.locator('h1')).toContainText(/Quotation Builder/i)

    // Open standalone builder dialog
    const newQuoteBtn = page.locator('button:has-text("New Quotation")')
    await expect(newQuoteBtn).toBeVisible()
    await newQuoteBtn.click()

    const standaloneDialog = page.locator('[role="dialog"]')
    await expect(standaloneDialog).toBeVisible()
    await expect(standaloneDialog).toContainText(/Customer & Lead Details/i)

    await standaloneDialog.locator('input[placeholder*="Muhammad Ali"]').fill('Direct Standalone Customer')
    await standaloneDialog.locator('input[placeholder*="03001234567"]').fill('03112345678')
    await standaloneDialog.locator('input[placeholder*="Karachi"]').fill('Clifton Block 4, Karachi')

    const generateStandaloneUx = await clickAndAuditUX(page, {
      triggerSelector: '[role="dialog"] button:has-text("Generate quotation PDF")',
      testRapidClicks: true,
    })
    assertHealthyUX(generateStandaloneUx)
    console.log(`[QA Report] Standalone Quotation: ${generateStandaloneUx.totalDurationMs}ms total, feedback in ${generateStandaloneUx.feedbackDelayMs}ms`)
  })

  test('5. Removed Help & Instructions Redirect to Dashboard', async ({ page }) => {
    // Accessing /instructions must cleanly redirect to /dashboard
    await page.goto('/instructions')
    await page.waitForURL('**/dashboard')
    await expect(page).toHaveURL(/.*dashboard/)

    // Accessing /help must cleanly redirect to /dashboard
    await page.goto('/help')
    await page.waitForURL('**/dashboard')
    await expect(page).toHaveURL(/.*dashboard/)
  })
})
