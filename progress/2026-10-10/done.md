# 2026-10-10 — done

## Erase customer data (privacy request)
- Lead page → Manage → "Erase customer data (privacy request — permanent)…" (admin / super admin).
  - To confirm: type the last 4 digits of the customer's phone or WhatsApp number, and tick "I understand".
- Permanently removes:
  - the contact and all their leads (every department), WhatsApp messages, call records, follow-ups, site visits, quotations, timeline and alerts
  - files, in Cloudinary too (deleted first; if Cloudinary refuses, nothing else changes)
- The admin log keeps counts only (no name or number).
- `erasures` stores one-way hashes of the numbers so OLD data (Meta catch-up, old Sheet rows, WhatsApp chat history) is not imported again. A NEW enquiry after the erasure is accepted.
- Tests: tests/db/erasure.test.ts.

## Custom roles + who gets leads
- **Team → Roles:** a manager / admin makes roles (e.g. Installer, Accounts) and answers two questions:
  - "Gets leads automatically?" — yes → the person is a call agent in the lead order; no → permission role **staff** (no lead access)
  - "Gets work instructions?"
- Admin roles are company-wide; manager roles are for their department. A role can be removed only when nobody has it.
- **Team → Add a team member** (moved from Settings): the role list includes the custom roles; the job title is saved on the user. Settings shows a link to Team.
- **Team → Team members:** a "Gets leads automatically" Turn on / Turn off for every employee.
  - Staff turned on become call agents.
  - Field agents show "Gets site visits automatically".
  - Turning off keeps their existing leads.
- New role `staff`: Dashboard (their open instructions), Instructions, Help; blocked from leads.

## Instructions (new tab for everyone)
- Give work to a person (same department; admins: anyone; roles with "no instructions" are left out): what, details, priority (normal / high / urgent), due date.
- Statuses: To do → In progress → In review → Completed, plus On hold.
  - The person doing it: In progress / Send for review / On hold.
  - The giver or a manager: any status (Completed after checking).
  - Notes on every update; full history.
- Views: For me · I gave · Whole team (managers), status filters, late due dates in red.
- Each new instruction and each update notifies the other side (in-app pop-up + phone / PC push).
- Tests: tests/db/work.test.ts.
