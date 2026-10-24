# Done — 2026-10-24

## CRM Enhancements & Workflow Implementations

- **Agent-Level WhatsApp Integration**:
  - Added "Connect with WhatsApp" card (`AgentWhatsAppCard`) on the dashboard for agents and field agents.
  - Linked agent accounts using Meta WhatsApp Embedded Signup.
  - Updated server actions `connectWhatsAppNumberAction` and `disconnectAgentWhatsAppAction` to support individual agent bindings (`agentId: actor.id`).
  - Synced WhatsApp messages and coexistence echoes directly with assigned leads and customer contacts.

- **Follow-Up 1, 2, 3 Table Columns**:
  - Integrated 3 clickable follow-up action buttons directly into each row of the main Leads table (`src/components/crm/follow-up-modal.tsx`).
  - Dynamic status colors: red for pending/incomplete (`bg-tone-danger-soft`), green for completed (`bg-tone-success-soft`).
  - Quick communication buttons: Call (`tel:`) and WhatsApp chat (`wa.me`) without leaving the table.
  - Prevented accidental duplicate follow-up completions with atomic claims and validation.

- **Send Quotation Directly from Leads Table**:
  - Added "Send Quotation" button to each row in the main Leads table (`SendQuotationDialog`).
  - Pre-populates customer and lead information into the Quotation Builder.
  - Creates, previews, and downloads PDF quotations with direct WhatsApp sending from the table without opening the lead page.

- **Navigation State & Filter Preservation**:
  - Preserved active view, search query, sorting, filters, and pagination when opening leads from the Leads table (`returnTo` parameter).
  - Tapping "Back" on lead detail (`/leads/[id]`) returns users to their exact table state without resetting filters or views.

- **Simplified Leads Table**:
  - Removed redundant `Source`, `Department`, and `Stage` columns from the Leads table.
  - Placed source badges compactly alongside customer names.

- **Controlled Lead Locking & Manager Approval**:
  - Implemented lead locking workflow: agents work on assigned leads one at a time.
  - Locked subsequent leads until all 3 follow-ups or completion criteria are met on the active lead.
  - Added "Request Lead from Manager" button on locked table rows and lead detail pages.
  - Added manager review actions ("Approve & Unlock" / "Reject") with notification alerts.
  - Backend enforcement in `src/server/auth/guards.ts` prevents bypassing locking through URLs or API calls.

- **Automated 30-Day CRM Backup**:
  - Built automated snapshot engine (`src/server/services/backup.ts`) backing up leads, contacts, follow-ups, messages, quotations, assignments, and settings.
  - Scheduled 30-day checks triggered through cron tick (`runTick()`).
  - Created Backup Management Panel in `/settings?section=crm-backups` with "Run Backup Now" and "Confirm Restore" mechanisms with SHA-256 checksum verification.

- **Dedicated Quotation Builder Tab**:
  - Added `/quotations` tab to CRM navigation for super_admin, admin, manager, and agent roles.
  - Built standalone quotation workflow with customer detail inputs and optional lead linking.
  - Central quotation list displaying Quotation #, customer, lead link, kW, total PKR, status (Draft, Sent, Accepted, Rejected), creator, and date with instant status update select.

- **Removed Help & Instructions**:
  - Removed `/instructions` and `/help` from navigation and sidebar.
  - Cleanly redirected routes to `/dashboard` without breaking custom role settings.

- **Code Quality & Testing**:
  - `npm run typecheck` passed with 0 errors.
  - `npm run lint` passed with 0 errors.
  - Unit tests for quotations, ui-maps, and models passed with 100% success.
