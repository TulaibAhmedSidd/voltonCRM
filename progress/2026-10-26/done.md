# Done — 2026-10-26

## 22:45 PKT — Lead Locking Updates, Open All Previous Leads & Pause Approval Workflow

- **Lead Locking Rule Update (24-Hour Rule)**:
  - Updated `isLeadLockedForAgent` in `src/server/services/leads.ts`: leads older than 24 hours (1 day) are never locked for agents (`receivedAt < 24h ago` or `assignedAt < 24h ago`).
  - Old incomplete leads (> 24h) never lock subsequent or new leads (`earlierIncompleteLead` search restricted to leads received within the last 24h).
  - Only newly received leads (received in the last 24 hours) have sequential active lead locking until 3 follow-ups are completed or the lead is disposed.
  - Updated `lookups` and `toSummary` in `src/server/services/queries.ts` so `earliestActiveLeadId` and `isLocked` apply strictly to leads from the last 24 hours. Historical leads render unlocked with full access.
  - Updated `loadLeadFor` in `src/server/auth/guards.ts` with descriptive error message: "This lead is currently locked. Complete all 3 follow-ups on your active new lead first."

- **Open All Previous Leads**:
  - Implemented `unlockAllPreviousLeads` in `src/server/services/leads.ts` setting `unlockedForAgent: true` and clearing `unlockRequested: false` for all historical leads.
  - Added background auto-unlock hook upon database connection (`src/server/db/connection.ts`) so all existing leads are immediately unlocked upon boot/connect.
  - Added recurring unlock maintenance to cron tick (`runTick` in `src/server/services/jobs.ts`) so leads that pass the 24-hour threshold are unlocked automatically.
  - Verified against development database (`volton_crm_dev`), successfully unlocking all 324+ historical leads.

- **Approval Workflow Paused (Zero Manager Approvals Right Now)**:
  - Removed "Request Lead from Manager" button from `src/app/(crm)/leads/page.tsx` and `src/app/(crm)/leads/[id]/page.tsx` to stop agents from sending unlock requests to managers.
  - Removed manager approval buttons ("Approve / Reject" and "Agent Requested Lead Unlock" cards) so managers are not bothered by approval requests right now.
  - Cleared all pending `unlockRequested` flags and paused manager notification dispatch in `requestLeadUnlock`.

- **Settings Manual & Earlier Enhancements (Committed & Pushed)**:
  - Settings page detailed manual PDF created at `public/docs/VoltOn-CRM-Settings-Manual.pdf` and markdown documentation artifact `volton-crm-settings-manual.md`.
  - Send Quotation Modal made responsive and spacious (`max-w-5xl`, `w-[95vw]`).
  - Quotation products connected via `ProductSelector` pulling live products from `voltonsolar.com` (`websiteCatalog()`) + standard models with auto-filling and editable text.
  - Junk Leads table text overlap fixed (`truncate` with ellipsis `...`) and inline detail modal added (`JunkLeadDetailModal`).
  - Dev database sync script created at `scripts/sync-main-to-dev.ts` ensuring safety isolation from production.

- **Testing & Verification**:
  - Unit & DB tests in `tests/db/crm-enhancements.test.ts` (25 tests) passed with 100% success.
  - `npm run typecheck` passed with 0 errors.
  - `npm run lint` passed with 0 errors.
  - `node scripts/check-ai.mjs` passed.
