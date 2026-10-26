# Remaining — 2026-10-26

## Milestone Checklist
- [x] M0: Foundation, auth, roles, theme tokens, database connection.
- [x] M1: Lead ingestion (Google Sheets, manual add, Meta webhook foundation, Excel import).
- [x] M2: Auto-assignment (round-robin fixed order, timeout auto-move, check-in enforcement).
- [x] M3: Lead pipeline & journey (stages, contact attempts, proof upload, anti-fraud review).
- [x] M4: Attendance system (check-in, break, checkout confirmation, 14-day history).
- [x] M5: Team management & custom roles (who gets leads, permissions, instructions).
- [x] M6: Quotation builder (Volton Classic PDF, website product sync, standalone & table builder).
- [x] M7: Site visits & field agent assignment (least active kW routing).
- [x] M8: Website SSO & product catalog link.
- [x] M9: Production hardening & security (rate-limiting, audit logs, GDPR erasure).
- [x] M10: Agent Experience Enhancements:
  - [x] Agent-level WhatsApp integration.
  - [x] Follow-up 1, 2, 3 buttons on Leads table (red/green status, communication modal).
  - [x] Send Quotation directly from Leads table with responsive modal.
  - [x] Live website product selection for quotation generator with custom typing capability.
  - [x] Junk Leads table text overlap resolution with inline detail modal.
  - [x] Navigation & filter state preservation across lead details.
  - [x] Simplified table columns.
  - [x] 24-Hour Lead Locking Rule (leads older than 24h never locked).
  - [x] Unlocked all historical leads.
  - [x] Paused manager approval requests.
  - [x] Settings page detailed manual PDF (`VoltOn-CRM-Settings-Manual.pdf`).
  - [x] Automated 30-day backups with restore panel.
  - [x] Dedicated Quotation Builder tab.
  - [x] Removal of Help and Instructions pages.
- [ ] M11: Performance & Cache (Upstash Redis free tier).

## Open Items
- [ ] Connect Upstash Redis free tier for instant query caching.
- [ ] Re-enable manager approval controls when manager team is ready tomorrow.
