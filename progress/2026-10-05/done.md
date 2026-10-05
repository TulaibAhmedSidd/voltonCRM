# Done — 2026-10-05

## Production hardening (from the QA report of 2026-10-04)
- **All Critical and High loopholes are fixed or reduced.** Report: `docs/qa/2026-10-05-QA-report-after-fixes.xlsx`. 48 fixed, 7 reduced, 7 low ones left for phase 2.
- **Fake sales stopped:**
  - Agents can only move a lead forward to Contacted, Interested or Requirement collected.
  - A sale is saved from the call result ("Deal done" + value) and counts in sales only after a manager approves it in Proof review.
- **Agent closes need a manager:** Not interested, Close lead, Dead after 3 no-answers and Wrong number all need a written reason and go to manager review. "Dispute" re-opens the lead for another agent.
- **Proof of work:**
  - Times reported by the phone are checked against the server's clock.
  - A typed call length longer than the time away is capped and flagged.
  - A screenshot must be the agent's own upload made after the tap; a reused screenshot is flagged.
  - 10% of normal calls go to the manager for a call-back spot check.
  - One result per call (double tap is safe).
  - "Verified" WhatsApp proof is no longer overwritten.
- **Permissions:**
  - Every action loads records through `src/server/auth/guards.ts`.
  - Managers are limited to their own department.
  - Field agents can only report their own visits.
  - The agent-list filter (`?agentId=`) leak is closed.
  - Phone numbers stay hidden until the agent accepts.
- **Login:**
  - 5 wrong tries lock the account for 15 minutes.
  - Same answer time for unknown users.
  - Open-redirect fixed.
  - Weak passwords refused.
  - Anyone whose password was set by someone else must choose their own at first sign-in.
  - "Change password" in the menu.
- **Google Sheet:**
  - Rows are tracked by key (`sheetrows`), so deleted or sorted rows lose nothing.
  - One bad row no longer blocks the rest; failed rows are listed in Settings.
  - The first live pull waits for "history" or "start from now".
- **Assignment:**
  - Paused teams really pause.
  - Old timers can't fire on a new agent.
  - Deactivating or removing a user releases their leads and visits.
- **Check-in:** a re-check-in after closing time is no longer auto-checked-out within a minute, and the agent is told when checked out.
- **APIs:**
  - Cron secret compared in constant time.
  - The webhook rejects broken JSON, and failed WhatsApp events are retried by the cron.
  - Upload signing is images only, in each user's own folder, rate-limited.
- **UX:**
  - Spinner on every save button ("Checking in…", "Accepting…").
  - A friendly error page and a "no access" notice replace the server-error screen.
  - The review queue shows problems first.
  - Field-agent wording is about visits.

## New features (user request)
- **Super admin** role and a **Company admin** page (`/admin`):
  - departments, managers and agents, who is checked in, open leads, approved sales this month
  - add, deactivate and remove managers and admins (super admin only)
  - system health and a recent admin activity log
- **Brand colours** in Settings → Appearance (admin and super admin): 5 presets or any 2 colours; text contrast is automatic.
- Owner (super admin) account created with `npm run create-super-admin` (password given on the command line, not stored in the repo).
- WhatsApp setup guide for the client: `docs/whatsapp-setup.md`.

## Tests
- 44 new tests. 4 old tests were changed for the new rules (accept before calling, optional follow-up date).
- The full business flow runs through the real server actions (`tests/db/production-flow.test.ts`):
  - super admin → manager → employees, each changing their password
  - check in → Sheet row → pull → manual assign → accept
  - try 1 → day 2 → day 3 → deal won → manager approves → sales update
  - the Dead → dispute → re-open path
- `tests/db/security.test.ts` covers the loopholes; `tests/db/api-routes.test.ts` covers every API route and the proxy.
- The browser walkthrough on a phone-sized screen confirmed the same flow and the colour change.

## 21:15 PKT — Dashboard Auto-Assign Toggle, Pipeline Drag Scroll, App Speedup, and Bilingual Guide
- **Dashboard Auto-Assign Toggle**:
  - Added `toggleAutoAssignAction` in `src/server/actions.ts` and `AutoAssignToggle` client component on `/dashboard`.
  - When toggled ON: unpauses team, sets manager window to 0, cancels waiting timers, and immediately auto-assigns waiting leads to checked-in agents via `drainQueue()`.
  - When toggled OFF: pauses auto-assign so new leads wait for manager's manual assignment.
- **Pipeline Kanban Drag-to-Scroll**:
  - Added `PipelineBoard` with `cursor-grab` and `active:cursor-grabbing` on desktop, smooth touch scrolling on mobile, mouse wheel horizontal conversion, and drag-click interceptor.
- **App Performance & Navigation Progress Bar**:
  - Added zero-dependency `NavigationProgressBar` with primary amber glow mounted globally in `RootLayout`.
  - Added `src/app/(crm)/loading.tsx` skeleton fallback for instant visual feedback on route changes.
  - Increased MongoDB `maxIdleTimeMS` to 30,000 ms to avoid connection drops between clicks.
  - Added link prefetching in `AppShell`.
- **Complete Operational Guide in English & Urdu**:
  - Built interactive in-app guide at `/guide` with language tabs (English / اردو) and baby steps for Call Agents, Field Agents, and Managers.
  - Added pictures (`public/guide/manager-dashboard.png`, `public/guide/agent-phone.png`) and standalone reference manual at `docs/guide/EMPLOYEE-MANAGER-GUIDE.md`.
  - Added App Guide to sidebar and mobile navigation.
- **Verification**: `npm run lint` and `npm run typecheck` passed with 0 errors; all 238 unit and database tests passed.

## 21:45 PKT — Commit, Push, and Demo Data Wipe
- Committed all features to `main` branch and pushed to GitHub: `https://github.com/TulaibAhmedSidd/voltonCRM.git`.
- Wiped all demo/test data:
  - Preserved owner account `tulaib@gmail.com` (Super Admin).
  - Deleted 19 demo users (including admin, bilal, sana, and agent/field test accounts).
  - Deleted all demo teams, leads (61), contacts (61), visits (6), attempts (97), follow-ups (31), activities (324), audit logs, and messages.
  - Reset lead counter sequence so real customer leads start fresh at `VL-00001`.
  - Reset Google Sheet cursor in settings.
- Departments (`TRADING`, `INSTALLATION`) and appearance/theme settings kept intact.

## 22:25 PKT — End-to-End Walkthrough Automation, Screenshots, Urdu Video Narration & WhatsApp API Specs
- **Automated Playwright Walkthrough & Screenshot Suite (`scripts/record-walkthrough.ts`)**:
  - Script simulated real browser sessions across 3 roles capturing 31 retina-quality screenshots into `public/guide/walkthrough/`:
    - **Super Admin**: Login, Dashboard, `/admin` company view, creation of Trading Manager (`Hamza Farooq`) and Installation Manager (`Zubair Khan`).
    - **Trading Manager**: First login, mandatory forced password change (`/change-password`), department dashboard, creation of Call Agent (`Bilal Ahmed`), team round-robin ordering & SLA timers (`/team`), quick-adding lead (`Tariq Mehmood`), and manual agent assignment.
    - **Employee (Call Agent)**: First login, mandatory forced password reset, dashboard before check-in, shift check-in (starting duty), 5-minute lead accept timer, masked customer phone & call attempt audit logging, and horizontal drag pipeline.
- **Urdu Video Walkthrough Generator (`scripts/generate_guide_videos.py`)**:
  - Leveraged `edge-tts` with high-fidelity Pakistani Urdu voice `ur-PK-AsadNeural` (slow rate: `-12%`) and `imageio_ffmpeg`.
  - Generated 3 synchronized MP4 videos with clear Urdu voiceover explaining the why and what of every action:
    - `public/guide/volton-crm-manager-guide-urdu.mp4` (~3.93 MB, 3 mins): Manager & Super Admin walkthrough.
    - `public/guide/volton-crm-employee-guide-urdu.mp4` (~2.65 MB, 2.5 mins): Employee & Call Agent walkthrough.
    - `public/guide/volton-crm-complete-guide-urdu.mp4` (~6.59 MB, 5.5 mins): Combined master guide.
- **WhatsApp Cloud API Integration Specification**:
  - Generated dedicated infographic slide `public/guide/walkthrough/32_whatsapp_api_future_features.png`.
  - Detailed the 4 future features that unlock once Meta credentials are plugged in: Automated Meta CTWA ad ingestion, live 2-way in-CRM chat panel, verified template auto-responses, and 100% lead leakage protection.
- **Enhanced In-App Guide (`/guide`) & Documentation**:
  - Integrated native HTML5 video players on `/guide` for instant playback on mobile and desktop.
  - Added bilingual tabs (English & اردو) with baby steps and high-resolution screenshot cards.
  - Authored comprehensive offline operational manual at `docs/guide/STEP-BY-STEP-VISUAL-WALKTHROUGH.md`.
- **Verification**:
  - `npm run lint` & `npm run typecheck` passed with 0 errors.
  - All 238 unit and database tests passed. AI setup check passed.

