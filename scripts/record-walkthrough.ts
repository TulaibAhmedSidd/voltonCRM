import { chromium, type Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const OUT_DIR = path.resolve(process.cwd(), 'public/guide/walkthrough')
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

async function snap(page: Page, filename: string, waitMs = 500) {
  if (waitMs > 0) await page.waitForTimeout(waitMs)
  const filePath = path.join(OUT_DIR, filename)
  await page.screenshot({ path: filePath, fullPage: false })
  console.log(`[Captured] ${filename}`)
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
  })

  // Desktop 1280x800 with 2x DPR for crisp presentation
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  })

  const page = await context.newPage()
  const BASE_URL = 'http://localhost:3000'

  console.log('=== Step 1: Super Admin Login & Manager Creation ===')
  // 1. Login Page
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await snap(page, '01_login_page.png')

  // Fill Super Admin credentials
  await page.fill('input[name="login"]', 'tulaib@gmail.com')
  await page.fill('input[name="password"]', 'VoltOn@2026')
  await snap(page, '02_superadmin_credentials_entered.png')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**')
  await page.waitForLoadState('networkidle')

  // 2. Super Admin Dashboard
  await snap(page, '03_superadmin_dashboard.png')

  // 3. Navigate to Company Admin (/admin)
  await page.goto(`${BASE_URL}/admin`)
  await page.waitForLoadState('networkidle')
  await snap(page, '04_company_admin_page.png')

  // 4. Fill Trading Manager Form
  const addAdminForm = page.locator('form:has-text("Add a manager or admin")')
  await addAdminForm.locator('input[name="name"]').fill('Hamza Farooq')
  await addAdminForm.locator('input[name="username"]').fill('hamza.trading')
  await addAdminForm.locator('input[name="password"]').fill('TradingManager@2026')
  await addAdminForm.locator('input[name="phone"]').fill('03001234567')
  await addAdminForm.locator('input[name="email"]').fill('trading.manager@volton.com')
  await addAdminForm.locator('select[name="role"]').selectOption('manager')

  // Select Trading department
  const tradingOption = await page.$eval('form:has-text("Add a manager or admin") select[name="departmentId"]', (el: HTMLSelectElement) => {
    const opt = Array.from(el.options).find((o) => o.text.toLowerCase().includes('trading'))
    return opt ? opt.value : el.options[1]?.value || ''
  })
  if (tradingOption) {
    await addAdminForm.locator('select[name="departmentId"]').selectOption(tradingOption)
  }
  await snap(page, '05_create_trading_manager_form.png')

  // Submit Trading Manager
  await addAdminForm.locator('button[type="submit"]:has-text("Add")').click()
  await page.waitForTimeout(2000)
  await page.waitForLoadState('networkidle')
  await snap(page, '06_trading_manager_created.png')

  // 5. Fill Installation Manager Form
  await addAdminForm.locator('input[name="name"]').fill('Zubair Khan')
  await addAdminForm.locator('input[name="username"]').fill('zubair.install')
  await addAdminForm.locator('input[name="password"]').fill('InstallManager@2026')
  await addAdminForm.locator('input[name="phone"]').fill('03007654321')
  await addAdminForm.locator('input[name="email"]').fill('install.manager@volton.com')
  await addAdminForm.locator('select[name="role"]').selectOption('manager')

  const installOption = await page.$eval('form:has-text("Add a manager or admin") select[name="departmentId"]', (el: HTMLSelectElement) => {
    const opt = Array.from(el.options).find((o) => o.text.toLowerCase().includes('installation'))
    return opt ? opt.value : el.options[2]?.value || ''
  })
  if (installOption) {
    await addAdminForm.locator('select[name="departmentId"]').selectOption(installOption)
  }
  await snap(page, '07_create_installation_manager_form.png')

  // Submit Installation Manager
  await addAdminForm.locator('button[type="submit"]:has-text("Add")').click()
  await page.waitForTimeout(2000)
  await page.waitForLoadState('networkidle')
  await snap(page, '08_both_managers_created.png')

  // Log out Super Admin
  await context.clearCookies()

  console.log('=== Step 2: Trading Manager Login, Forced Password Reset & Employee Creation ===')
  // 6. Manager First Login
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="login"]', 'hamza.trading')
  await page.fill('input[name="password"]', 'TradingManager@2026')
  await snap(page, '09_manager_login_credentials.png')

  await page.click('button[type="submit"]')
  // Manager is redirected to /change-password
  await page.waitForURL('**/change-password**')
  await page.waitForLoadState('networkidle')
  await snap(page, '10_manager_forced_password_reset.png')

  // Reset Password for Manager
  await page.fill('input[name="current"]', 'TradingManager@2026')
  await page.fill('input[name="password"]', 'HamzaManager@Volt2026')
  await page.fill('input[name="confirm"]', 'HamzaManager@Volt2026')
  await snap(page, '11_manager_password_reset_filled.png')

  await page.click('button[type="submit"]:has-text("Save new password")')
  await page.waitForURL('**/dashboard**')
  await page.waitForLoadState('networkidle')
  await snap(page, '12_trading_manager_dashboard.png')

  // 7. Manager goes to Settings to add Call Agent Employee
  await page.goto(`${BASE_URL}/settings`)
  await page.waitForLoadState('networkidle')
  await snap(page, '13_manager_settings_page.png')

  const addUserForm = page.locator('form:has-text("Add a user")')
  await addUserForm.locator('input[name="name"]').fill('Bilal Ahmed')
  await addUserForm.locator('input[name="username"]').fill('bilal.agent')
  await addUserForm.locator('input[name="password"]').fill('AgentBilal@2026')
  await addUserForm.locator('input[name="phone"]').fill('03121234567')
  await addUserForm.locator('input[name="email"]').fill('bilal.agent@volton.com')
  await addUserForm.locator('select[name="role"]').selectOption('agent')
  await snap(page, '14_manager_add_call_agent_form.png')

  await addUserForm.locator('button[type="submit"]:has-text("Add user")').click()
  await page.waitForTimeout(2000)
  await page.waitForLoadState('networkidle')
  await snap(page, '15_call_agent_created_in_team.png')

  // 8. Manager inspects /team and adds Bilal to active rotation if needed
  await page.goto(`${BASE_URL}/team`)
  await page.waitForLoadState('networkidle')
  const addMemberBtn = await page.$('form button:has-text("+ Bilal Ahmed")')
  if (addMemberBtn) {
    await addMemberBtn.click()
    await page.waitForTimeout(1500)
    await page.waitForLoadState('networkidle')
  }
  await snap(page, '16_manager_team_order_and_timings.png')

  // 9. Manager adds a demo lead in Trading
  await page.goto(`${BASE_URL}/leads`)
  await page.waitForLoadState('networkidle')
  const addLeadBtn = await page.$('button:has-text("Add lead")')
  if (addLeadBtn) {
    await addLeadBtn.click()
    await page.waitForSelector('div[role="dialog"] input[name="name"]')
    const dialog = page.locator('div[role="dialog"]')
    await dialog.locator('input[name="name"]').fill('Tariq Mehmood')
    await dialog.locator('input[name="phone"]').fill('03001234567')
    await dialog.locator('input[name="city"]').fill('Lahore')
    await dialog.locator('select[name="department"]').selectOption('TRADING')
    await dialog.locator('select[name="channel"]').selectOption('whatsapp')
    await dialog.locator('input[name="sourceDetail"]').fill('Meta Ad - 10kW Hybrid Special')
    await dialog.locator('textarea[name="notes"]').fill('Client requested quotation for 10kW solar system with batteries.')
    await snap(page, '17_manager_quick_add_lead_dialog.png')
    await dialog.locator('button[type="submit"]:has-text("Save lead")').click()
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle')
  }

  // 10. Manager assigns lead to Bilal Ahmed
  await page.goto(`${BASE_URL}/leads`)
  await page.waitForLoadState('networkidle')
  const leadRow = page.locator('a[href^="/leads/"]:visible').first()
  if (await leadRow.count()) {
    await leadRow.click()
    await page.waitForURL('**/leads/**')
    await page.waitForLoadState('networkidle')
    await snap(page, '18_manager_lead_detail_view.png')

    // Find Assign to dropdown and select Bilal Ahmed
    const assignForm = page.locator('form:has-text("Assign")')
    if (await assignForm.count()) {
      const bilalOpt = await page.$eval('form:has-text("Assign") select[name="agentId"]', (el: HTMLSelectElement) => {
        const opt = Array.from(el.options).find((o) => o.text.includes('Bilal'))
        return opt ? opt.value : el.options[1]?.value || ''
      })
      if (bilalOpt) {
        await assignForm.locator('select[name="agentId"]').selectOption(bilalOpt)
        await snap(page, '19_manager_selecting_assigned_agent.png')
        await assignForm.locator('button[type="submit"]:has-text("Assign")').click()
        await page.waitForTimeout(2000)
        await page.waitForLoadState('networkidle')
        await snap(page, '20_manager_assigned_lead_to_agent.png')
      }
    }
  }

  // Log out Manager
  await context.clearCookies()

  console.log('=== Step 3: Employee First Login, Password Reset, Check-in & Lead Workflow ===')
  // 11. Employee First Login
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="login"]', 'bilal.agent')
  await page.fill('input[name="password"]', 'AgentBilal@2026')
  await snap(page, '21_employee_login_screen.png')

  await page.click('button[type="submit"]')
  // Employee is redirected to /change-password
  await page.waitForURL('**/change-password**')
  await page.waitForLoadState('networkidle')
  await snap(page, '22_employee_forced_password_reset.png')

  // Reset Password for Employee
  await page.fill('input[name="current"]', 'AgentBilal@2026')
  await page.fill('input[name="password"]', 'BilalAgent@Volt2026')
  await page.fill('input[name="confirm"]', 'BilalAgent@Volt2026')
  await snap(page, '23_employee_password_reset_filled.png')

  await page.click('button[type="submit"]:has-text("Save new password")')
  await page.waitForURL('**/dashboard**')
  await page.waitForLoadState('networkidle')
  await snap(page, '24_employee_dashboard_unaccepted_lead.png')

  // 12. Employee Checks in
  const checkInBtn = page.locator('button:has-text("Check in")')
  if (await checkInBtn.count()) {
    await checkInBtn.click()
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle')
  }
  await snap(page, '25_employee_checked_in_active_shift.png')

  // 13. Employee Accepts Lead
  const acceptBtn = page.locator('button:has-text("Accept")')
  if (await acceptBtn.count()) {
    await acceptBtn.click()
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle')
  }
  await snap(page, '26_employee_lead_accepted.png')

  // 14. Employee visits Lead detail
  await page.goto(`${BASE_URL}/leads`)
  await page.waitForLoadState('networkidle')
  const empLeadLink = page.locator('a[href^="/leads/"]:visible').first()
  if (await empLeadLink.count()) {
    await empLeadLink.click()
    await page.waitForURL('**/leads/**')
    await page.waitForLoadState('networkidle')
    await snap(page, '27_lead_detail_contact_options.png')

    // Click "Notes" tab
    const notesTab = page.locator('button[role="tab"]:has-text("Notes")')
    if (await notesTab.count()) {
      await notesTab.click()
      await page.waitForTimeout(500)
      await snap(page, '28_lead_detail_notes_and_proof.png')
    }

    // Click "Timeline" tab
    const timelineTab = page.locator('button[role="tab"]:has-text("Timeline")')
    if (await timelineTab.count()) {
      await timelineTab.click()
      await page.waitForTimeout(500)
      await snap(page, '29_lead_detail_audit_timeline.png')
    }
  }

  // 15. Employee Pipeline View
  await page.goto(`${BASE_URL}/pipeline`)
  await page.waitForLoadState('networkidle')
  await snap(page, '30_employee_pipeline_drag_scroll.png')

  // 16. Employee returns to dashboard showing updated stats
  await page.goto(`${BASE_URL}/dashboard`)
  await page.waitForLoadState('networkidle')
  await snap(page, '31_employee_dashboard_active_duty.png')

  console.log('All 31 walkthrough screenshots successfully captured!')
  await browser.close()
}

main().catch((err) => {
  console.error('Walkthrough error:', err)
  process.exit(1)
})
