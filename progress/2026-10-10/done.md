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

## Check-out fix, cards for Settings / Team / lead page, Volton classic quotation
- **Check out asks to confirm** ("Check out now?" → "Yes, check out"). Ifran Ahmed was checked out 13 s after checking in: a double-tap landed on "Check out", which takes the place of "Check in".
- **Settings** is now a grid of cards (icon, title, one line, live badge); a card opens only its section (`?section=`) with "← All settings". Old `/settings#…` links still work.
- **Team** works the same way: Who is working now · Who gets leads · Lead order & timings · Add a team member · Roles.
- **Lead page:** the header, "What to do now" and "Contact the customer" stay on top (the WhatsApp return prompt needs them on the page). Everything else is a card that slides a panel up from the bottom: Quotation · Stage · Manage · Timeline & notes · Proof · WhatsApp chat · Follow-ups · Site & visit · Lead steps. `?panel=` (and the old `?tab=`) opens one directly.
- **Quotation templates:**
  - **Volton classic** (default) = Volton's own PDF: their cover and services/clients pages (original images), the quotation table in their Excel layout (light blue rows, "Job" for lump items, TOTAL, warranty table, Sales Representative box), their acknowledgement page, and their contact page with the email changed to info@voltonsolar.com.
  - **Modern** = the CRM design.
  - Chosen per quotation. Quotations saved before this keep the modern look; `?template=` overrides.
- New warranty fields: solar panel / structure / inverter texts with Volton's wording as defaults.
- Quotations show **info@voltonsolar.com** (`COMPANY.quoteEmail`).
- PDF writer: JPEG pages (DCTDecode) and a dark logo variant. The page images (`src/server/assets/quote-pages.ts`) load only for the classic template.

## Website (voltonsolar.com) connection
- Quotation builder: "Pick from website products" for panels / inverters / batteries — read live (5-min cache, 3 s limit) from the website DB (MAIN_SITE_MONGODB_URI); inactive products hidden.
- One login: CRM users sign in to voltonsolar.com/admin with their CRM username / password (CRM `POST /api/website/login`, shared WEBSITE_SSO_SECRET) or the "Website admin" menu link (60-second signed pass → website `/admin/sso`).
- Website access per person (Team → Add a team member → Website): admin / editor / none. Defaults: managers+ and everyone already in the CRM = admin; new call agents and "Marketing" roles = editor; others none.
- `GET /api/website/team` (shared secret): team tree for the coming website Team page (no phones / emails).
- Website repo (voltonWithoutnode, branch dev/tulaibpsw): real password checks, HttpOnly session cookie, middleware guarding every change, editors blocked from settings, /api/seed and the secret setup page switched off, website passwords hashed and never sent to the browser.
- Guides: Manager §11, Employee §5, Super admin §8.
- Checked locally on test databases only: 25/25 website security checks, product picker, Team control, one-tap sign-in.
