import { chromium, type Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import { connectDb } from '../src/server/db/connection'
import { Contact, Department, Lead, LeadAssignment, User, ContactAttempt, Activity, FollowUp } from '../src/server/db/models'
import { hashPassword } from '../src/server/auth/password'
import { oid } from '../src/server/services/common'

const OUT_DIR = path.resolve(process.cwd(), 'public/guide/lifecycle')
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

async function snap(page: Page, filename: string, waitMs = 600) {
  if (waitMs > 0) await page.waitForTimeout(waitMs)
  const filePath = path.join(OUT_DIR, filename)
  await page.screenshot({ path: filePath, fullPage: false })
  console.log(`[Captured] ${filename}`)
}

async function main() {
  await connectDb()
  console.log('Connected to DB for setup')

  const tradingDept = await Department.findOne({ code: 'TRADING' })
  if (!tradingDept) throw new Error('Trading department not found')

  const managerUser = await User.findOne({ username: 'hamza.trading' })
  if (!managerUser) throw new Error('hamza.trading not found')

  const agentUser = await User.findOne({ username: 'bilal.agent' })
  if (!agentUser) throw new Error('bilal.agent not found')

  // Clean previous test lead
  await Lead.deleteMany({ 'source.rowKey': 'kashif-abbasi-lifecycle' })
  await Contact.deleteMany({ phones: '+923009876543' })

  // Launch Playwright
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  const BASE_URL = 'http://localhost:3000'

  console.log('=== Step 1: Manager Logs In & Google Sheets Sync ===')
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="login"]', 'hamza.trading')
  await page.fill('input[name="password"]', 'HamzaManager@Volt2026')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**')
  await page.waitForLoadState('networkidle')

  // Navigate to Leads Page
  await page.goto(`${BASE_URL}/leads`)
  await page.waitForLoadState('networkidle')
  await snap(page, '01_leads_header_sync_and_filters.png', 800)

  // Ingest the new lead into DB as if pulled from Google Sheet
  console.log('Simulating Google Sheet Row Ingestion for Kashif Abbasi...')
  const contact = await Contact.create({
    name: 'Kashif Abbasi',
    phones: ['+923009876543'],
    city: 'Lahore',
    area: 'DHA Phase 6',
  })

  const lead = await Lead.create({
    contactId: contact._id,
    departmentId: tradingDept._id,
    channel: 'google_sheet',
    stage: 'new',
    status: 'open',
    source: {
      channel: 'google_sheet',
      sheetTab: 'Trading Leads',
      sheetRow: 42,
      rowKey: 'kashif-abbasi-lifecycle',
      submittedAt: new Date(),
    },
    site: {
      targetKw: 10,
      propertyType: 'residential',
      monthlyBillPkr: 85000,
      netMeteringRequired: true,
    },
    assignment: {
      state: 'unassigned',
      agentId: null,
      assignedAt: null,
    },
    receivedAt: new Date(),
    assignableAt: new Date(),
  })

  await Activity.create({
    leadId: lead._id,
    type: 'lead_created',
    data: { source: 'Google Sheet (Trading Leads)', targetKw: 10 },
    at: new Date(),
  })

  // Reload Leads page to show incoming lead
  await page.reload()
  await page.waitForLoadState('networkidle')
  await snap(page, '02_lead_received_from_sheet.png', 800)

  // Click on Kashif Abbasi
  await page.click(`a[href="/leads/${lead._id}"]`)
  await page.waitForURL(`**/leads/${lead._id}**`)
  await page.waitForLoadState('networkidle')
  await snap(page, '03_unassigned_lead_detail.png', 800)

  // Manager assigns lead to Bilal Ahmed
  console.log('Manager assigns lead to Bilal Ahmed...')
  const assignSelect = page.locator('select[name="agentId"]')
  if (await assignSelect.count()) {
    await assignSelect.selectOption({ label: 'Bilal Ahmed' })
    await page.click('button[type="submit"]:has-text("Assign")')
    await page.waitForTimeout(1500)
    await page.waitForLoadState('networkidle')
    await snap(page, '04_manager_assigned_to_agent.png', 800)
  }

  // Clear cookies and switch to Agent Bilal Ahmed
  await context.clearCookies()

  console.log('=== Step 2: Agent Bilal Logs In & Accepts Lead ===')
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="login"]', 'bilal.agent')
  await page.fill('input[name="password"]', 'BilalAgent@Volt2026')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**')
  await page.waitForLoadState('networkidle')

  // Check in if needed
  const checkInBtn = page.locator('button:has-text("Check in")')
  if (await checkInBtn.count()) {
    await checkInBtn.click()
    await page.waitForTimeout(1500)
    await page.waitForLoadState('networkidle')
  }

  // Snap Agent Dashboard with countdown
  await snap(page, '05_agent_dashboard_countdown_timer.png', 800)

  // Agent accepts lead
  const acceptBtn = page.locator('button:has-text("Accept")').first()
  if (await acceptBtn.count()) {
    await acceptBtn.click()
    await page.waitForTimeout(1500)
    await page.waitForLoadState('networkidle')
    await snap(page, '06_agent_accepted_lead.png', 800)
  }

  // Open Lead detail as Agent
  await page.goto(`${BASE_URL}/leads/${lead._id}`)
  await page.waitForLoadState('networkidle')
  await snap(page, '07_agent_lead_detail_masked_phone.png', 800)

  // Reveal Phone
  const revealBtn = page.locator('button:has-text("Reveal")')
  if (await revealBtn.count()) {
    await revealBtn.click()
    await page.waitForTimeout(500)
    await snap(page, '08_agent_lead_phone_unmasked.png', 600)
  }

  // Log Attempt 1: Call Connected, Callback Requested
  console.log('Logging Attempt 1: Callback requested...')
  const now = new Date()
  const tapTime = new Date(now.getTime() - 120_000)
  const leftTime = new Date(now.getTime() - 110_000)
  const returnTime = new Date(now.getTime() - 20_000)

  const attempt1 = await ContactAttempt.create({
    leadId: lead._id,
    agentId: agentUser._id,
    channel: 'call',
    followUpNo: 0,
    serverTapAt: tapTime,
    leftAt: leftTime,
    returnedAt: returnTime,
    outcomeAt: now,
    result: 'connected',
    response: 'callback_requested',
    remarks: 'Customer is in a conference meeting. Requested detailed discussion tomorrow at 2:00 PM.',
    durationSec: 90,
    proofStatus: 'logged',
    flags: [],
  })

  // Move stage to contacted and schedule follow-up
  const tomorrow = new Date(now.getTime() + 86_400_000)
  await FollowUp.create({
    leadId: lead._id,
    number: 1,
    dueAt: tomorrow,
    status: 'pending',
  })

  lead.stage = 'contacted'
  lead.attemptCount = 1
  lead.lastContactAt = now
  lead.nextFollowUpAt = tomorrow
  await lead.save()

  await Activity.create({
    leadId: lead._id,
    type: 'attempt_logged',
    actorId: agentUser._id,
    data: { channel: 'call', result: 'connected', remarks: 'Customer requested callback tomorrow at 2:00 PM' },
    at: now,
  })
  await Activity.create({
    leadId: lead._id,
    type: 'stage_changed',
    actorId: agentUser._id,
    data: { stage: 'contacted' },
    at: now,
  })

  // Reload lead page to show Attempt 1 and Stage Contacted
  await page.reload()
  await page.waitForLoadState('networkidle')
  await snap(page, '09_stage_contacted_and_followup_set.png', 800)

  // Click Timeline Tab
  await page.click('button[role="tab"]:has-text("Timeline")')
  await page.waitForTimeout(500)
  await snap(page, '10_lead_timeline_first_attempt.png', 600)

  // Navigate to Follow-ups due page
  console.log('=== Step 3: Follow-ups Due & Day 2 Call ===')
  await page.goto(`${BASE_URL}/follow-ups`)
  await page.waitForLoadState('networkidle')
  await snap(page, '11_followups_due_list.png', 800)

  // Day 2: Customer is Interested
  console.log('Simulating Day 2: Customer Interested...')
  const day2Time = new Date(now.getTime() + 86_400_000)
  const attempt2 = await ContactAttempt.create({
    leadId: lead._id,
    agentId: agentUser._id,
    channel: 'call',
    followUpNo: 1,
    serverTapAt: day2Time,
    leftAt: new Date(day2Time.getTime() + 5000),
    returnedAt: new Date(day2Time.getTime() + 180_000),
    outcomeAt: new Date(day2Time.getTime() + 185_000),
    result: 'connected',
    response: 'interested',
    remarks: 'Customer reviewed solar profile. Wants a 10kW On-Grid setup with Longi panels and Huawei inverter.',
    durationSec: 175,
    proofStatus: 'logged',
    flags: [],
  })

  await FollowUp.updateMany({ leadId: lead._id, status: 'pending' }, { status: 'completed' })
  lead.stage = 'interested'
  lead.attemptCount = 2
  lead.lastContactAt = day2Time
  lead.nextFollowUpAt = null
  await lead.save()

  await Activity.create({
    leadId: lead._id,
    type: 'attempt_logged',
    actorId: agentUser._id,
    data: { channel: 'call', result: 'connected', remarks: 'Customer confirmed interest in 10kW system' },
    at: day2Time,
  })
  await Activity.create({
    leadId: lead._id,
    type: 'stage_changed',
    actorId: agentUser._id,
    data: { stage: 'interested' },
    at: day2Time,
  })

  await page.goto(`${BASE_URL}/leads/${lead._id}`)
  await page.waitForLoadState('networkidle')
  await snap(page, '12_stage_updated_to_interested.png', 800)

  // Step 4: Requirement Collected
  console.log('Moving to Requirement Collected...')
  lead.stage = 'requirement_collected'
  lead.site = {
    ...lead.site,
    propertyType: 'residential',
    roofType: 'concrete_flat',
    shading: 'none',
    monthlyBillPkr: 85000,
    monthlyUnits: 1020,
    targetKw: 10,
    netMeteringRequired: true,
  }
  await lead.save()
  await Activity.create({
    leadId: lead._id,
    type: 'stage_changed',
    actorId: agentUser._id,
    data: { stage: 'requirement_collected', specs: '10kW On-Grid, 18x 580W Longi Hi-MO X6, 10kW Huawei Inverter' },
    at: new Date(day2Time.getTime() + 3600_000),
  })

  await page.reload()
  await page.waitForLoadState('networkidle')
  await snap(page, '13_requirements_collected_specs.png', 800)

  // Step 5: Quotation Sent (PKR 1,850,000)
  console.log('Moving to Quotation Sent...')
  lead.stage = 'quotation_sent'
  await lead.save()
  await Activity.create({
    leadId: lead._id,
    type: 'stage_changed',
    actorId: agentUser._id,
    data: { stage: 'quotation_sent', quotationValuePkr: 1850000, details: 'Formal solar proposal sent via WhatsApp & Email' },
    at: new Date(day2Time.getTime() + 7200_000),
  })

  await page.reload()
  await page.waitForLoadState('networkidle')
  await snap(page, '14_quotation_sent_proposal.png', 800)

  // Step 6: Negotiation & Pipeline Kanban Board
  console.log('Moving to Negotiation...')
  lead.stage = 'negotiation'
  await lead.save()
  await Activity.create({
    leadId: lead._id,
    type: 'stage_changed',
    actorId: agentUser._id,
    data: { stage: 'negotiation', terms: '50% advance, net metering warranty included' },
    at: new Date(day2Time.getTime() + 10800_000),
  })

  // Open Pipeline Board (/pipeline)
  console.log('Navigating to Pipeline Kanban Board...')
  await page.goto(`${BASE_URL}/pipeline`)
  await page.waitForLoadState('networkidle')
  await snap(page, '15_pipeline_kanban_board_full.png', 1000)

  // Demonstrate horizontal scroll on Pipeline
  await page.evaluate(() => {
    const el = document.querySelector('.overflow-x-auto')
    if (el) el.scrollBy({ left: 450, behavior: 'smooth' })
  })
  await page.waitForTimeout(600)
  await snap(page, '16_pipeline_board_scrolled_negotiation.png', 600)

  // Step 7: Deal Won Marked by Agent (Anti-Fraud Review Pending)
  console.log('Agent marks Deal Won with PKR 1,850,000...')
  lead.stage = 'won'
  lead.status = 'won'
  lead.wonValuePkr = 1850000
  lead.closeReview = {
    status: 'pending',
    by: null,
    at: null,
  }
  await lead.save()
  await Activity.create({
    leadId: lead._id,
    type: 'stage_changed',
    actorId: agentUser._id,
    data: { stage: 'won', wonValuePkr: 1850000 },
    at: new Date(day2Time.getTime() + 14400_000),
  })

  // Open Lead page showing Anti-Fraud Pending Review banner
  await page.goto(`${BASE_URL}/leads/${lead._id}`)
  await page.waitForLoadState('networkidle')
  await snap(page, '17_deal_won_anti_fraud_review_pending.png', 800)

  // Clear cookies and switch to Manager Hamza for Proof Review
  await context.clearCookies()

  console.log('=== Step 4: Manager Proof Review & Official Approval ===')
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="login"]', 'hamza.trading')
  await page.fill('input[name="password"]', 'HamzaManager@Volt2026')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**')
  await page.waitForLoadState('networkidle')

  // Open Manager Review Screen (/review)
  await page.goto(`${BASE_URL}/review`)
  await page.waitForLoadState('networkidle')
  await snap(page, '18_manager_review_queue.png', 800)

  // Approve Deal on the lead page
  console.log('Manager approves deal...')
  lead.closeReview = {
    status: 'approved',
    by: managerUser._id,
    at: new Date(),
  }
  await lead.save()
  await Activity.create({
    leadId: lead._id,
    type: 'proof_reviewed',
    actorId: managerUser._id,
    data: { status: 'approved', note: 'Customer contract verified, 50% deposit confirmed in company account' },
    at: new Date(),
  })

  // Reload Lead page showing Approved Status
  await page.goto(`${BASE_URL}/leads/${lead._id}`)
  await page.waitForLoadState('networkidle')
  await snap(page, '19_manager_approved_deal_won.png', 800)

  // Manager Dashboard showing updated KPIs and revenue
  await page.goto(`${BASE_URL}/dashboard`)
  await page.waitForLoadState('networkidle')
  await snap(page, '20_dashboard_kpis_revenue_recognized.png', 800)

  console.log('=== SUCCESS: All 20 lifecycle screenshots captured! ===')
  await browser.close()
  process.exit(0)
}

main().catch((err) => {
  console.error('Error during lifecycle recording:', err)
  process.exit(1)
})
