# Done — 2026-10-09

## Auto-assign — what was wrong and the fix
- The live database showed **75 of 79 open leads "held until the office opens"**. They had been imported after 7 PM, and the office hours are 10:00–19:00 Mon–Sat.
- **Nobody was checked in.** Auto-assign gives leads only to checked-in agents, and only 2 check-ins had ever happened.
- Held leads waited for a cron timer. Checking in did not release them.
- Fixes:
  - **Self-healing queue.** Every waiting, held or unassigned lead is given out once its hold ends: on check-in, on accept (a slot frees up), on every cron tick and on every page poll. No cron is needed.
  - **New team switches** (Team page → Timings): "Give new leads only to checked-in agents" (on by default) and "Give out leads at night / on holidays too" (off by default).
  - **"Waiting for assignment" panel** on the manager dashboard and the Unassigned leads view. It says why leads wait (nobody checked in / office opens at … / everyone at their accept limit / team paused / no agents in the order), with an **"Assign waiting leads now"** button.

## Step-by-step lead page
- **"What to do now"** box at the top, in one sentence (accept by …, first contact, try 2 due now, nothing to do until …, close the lead, waiting for the manager).
- **Lead steps:** Accept → Try 1 → Try 2 (next day) → Try 3 (3 days later) → Close → Manager check. Each step is marked done ✓, current ● or upcoming ○, with the result and date of each try.
- "How a lead works" explanation on every lead, plus a new **Help** page in the menu (agents, field agents, managers).
- **Call screen:**
  - It shows "This will be try 2 of 3 · last time: …".
  - The pop-up says why it opened ("Welcome back from WhatsApp · you were away 1 min 20 s", "you already tapped …", "save your last …").
  - It shows try X of 3, the last result, the current stage, and numbered steps.
  - **"What happens next"** explains the result before saving (next try tomorrow / in 3 days / lead becomes Dead / closes and goes to the manager).
- **"I tapped by mistake"** cancels a tap without counting a try. It's only allowed right after the tap (away less than 2 minutes) and shows on the lead as "Cancelled — tapped by mistake".
- **A second tap** before saving the first opens the first one instead.

## Manager alerts and Ping
- **Settings → My alerts:** pick which employee actions to hear about:
  - accepted a lead
  - tapped WhatsApp / WA call / Call (with the customer name and lead number)
  - saved a result
  - cancelled a tap
  - check-in, check-out, break
  - visit updates

  Choose all employees or only ticked ones. Managers get everything by default; admins only if they opt in.
- **Ping:** a manager can nudge the agent from the lead page (Manage) or the Team page. The agent gets an alert, and it's noted on the lead.

## Tests
- 265 tests pass (10 new). Lint, types and the build are clean.
- Checked in the browser on a local test database. The live database was only read (counts only) to find the auto-assign cause.

## Later — delete leads (managers)
- **Leads page:**
  - Managers and admins get a tick box on every lead and "Select all on this page".
  - Then write a reason (required) → **Delete N** → **"Yes, delete N leads"**.
- **Lead page → Manage:** "Delete this lead…" (reason + confirm tick).
- Managers can delete only their own department's leads; admins can delete any lead. Agents can't delete.
- **What deleting does:**
  - The lead is hidden everywhere (lists, numbers, the agent's screens).
  - Timers, follow-ups and linked site visits stop.
  - The agent is told, and the delete is written in the admin activity log with the reason.
  - The record and its history are kept (soft delete), so a mistaken delete can be undone.
  - The Sheet won't import that row again.
  - The same customer can still come back later as a new lead.
- Test added (security.test.ts).

## Later — proof storage (Settings)
- **Settings → Proof storage** (managers: their department · admins: all):
  - space used by proof screenshots: all, this week, this month, older than 3 months
  - space used per employee
  - the whole Cloudinary account usage (free plan: 25 GB)
- **Clear screenshots:** this week / this month / last month / older than 3 months / a date range (Pakistan time).
  - Step 1, "Check what will be deleted": shows the count and MB, and deletes nothing.
  - Step 2: type CLEAR → "Clear now".
  - "Keep screenshots still waiting for my review" is on by default.
- **Only screenshot files are deleted.** Employees, leads, call results and notes stay. A cleared call shows "Screenshot cleared (storage)".
- Files are deleted from Cloudinary first and only then marked cleared; if Cloudinary refuses, nothing changes. Each clear is written in the admin activity log.
- Screenshot sizes now use the real size reported by Cloudinary.
- Tests: Pakistan-time ranges; manager scope; pending-review files kept; a Cloudinary failure changes nothing; the preview deletes nothing.

## Later — Meta lead forms straight into the CRM (no Google Sheet)
- New webhook `/api/webhooks/meta-leads` (Page field `leadgen`). It checks Meta's signature, saves the event first and processes it right after (failures are retried by the cron tick).
- The CRM fetches each lead's answers from Meta and uses the same column detection as the Sheet (full_name, phone_number, form questions). Unknown answers are kept under the lead's extra details.
- Safety net: the cron tick checks Meta every 15 minutes for the last day's leads. Each Meta lead id is imported only once, and it is shared with Sheet rows that had the id.
- **Settings → Meta lead forms** (admins):
  - connection status and the webhook URL
  - "Turn on live leads" (subscribes the Page)
  - form → department
  - "Fetch leads from Meta" (1–90 days; customers already in the CRM are skipped, so leads that came from the Sheet aren't doubled)
- A system-user token is swapped for the Page token automatically.
- Company admin health shows "Meta lead forms".
- A public `/privacy` page, which Meta needs before the app can go Live.
- New env vars: `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`, plus `META_APP_SECRET` / `META_VERIFY_TOKEN`, which fall back to the WhatsApp values. Setup steps are in `docs/meta-leads-setup.md`.
- Tests (api-routes.test.ts): verify token, signature, webhook → lead with form answers and department, Meta retry not doubled, catch-up sync skips existing customers, expired token message, page subscribe.

## Later — moved to the new GitHub repo
- The project now lives at https://github.com/TulaibAhmedSidd/voltonCRM (`origin`). The old repo (tulaibpsw/CRMvolt) is kept as remote `crmvolt-old` only for reference.
- Both histories are joined (merge, no force push). The new repo's extra files (guide page, guide videos and screenshots, recording scripts, loading screen) are kept.
- Removed `src/components/crm/auto-assign-toggle.tsx`: no page used it, and it called an action that no longer exists, so it broke the type check / build.

## Later — lead sources, Leads filters, quieter polling
- Lead source names are now clear everywhere (list, card, lead header):
  - "Facebook form" / "Instagram form" (direct from Meta)
  - "WhatsApp ad" / "WhatsApp chat"
  - "Google Sheet · Facebook" (when the Sheet has a platform column), "Manual"
- Sheet rows now save the Facebook / Instagram platform.
- Leads page:
  - Source chips: All, Facebook, Instagram, Meta forms, WhatsApp, WhatsApp ads, Google Sheet, Added by hand.
  - "Show more filters" panel:
    - source, stage, department (admins), agent (incl. "Nobody assigned"), tries, next follow-up, form / campaign, city
    - received: today / yesterday / this week / last 7 days / this month / last month / last 30 days, or a date range (Pakistan time)
  - The filters in use show as chips that can be removed one by one, plus "Clear all".
  - Filters live in the URL (links can be shared; Back works). They are always ANDed with the user's scope.
- The notification bell polls only while the screen is visible, every 30 s instead of 20 s. It checks straight away when the screen is opened again.
- Checked live Meta: the Page is subscribed to the app for `leadgen` ("Turn on live leads" worked) and Vercel has the verify token. Still to do: the test WhatsApp account is not subscribed to the app.
- Tests: lead-filters unit tests; filter scope test in security.test.ts.

## Later — WhatsApp test account fixed + Coexistence (connect existing WhatsApp Business app numbers)
- **Found:** the app had no webhook address saved in Meta (neither WhatsApp nor Page), and the test WhatsApp account was not subscribed to the app. The user's IDs and keys were all correct.
- **Fixed in Meta (via API, with the user's OK):**
  - WhatsApp webhook → `/api/webhooks/whatsapp`, fields `messages`, `smb_message_echoes`, `history`, `smb_app_state_sync`
  - Page webhook → `/api/webhooks/meta-leads`, field `leadgen`
  - test WhatsApp account subscribed to Volton CRM
  - Meta confirmed both callback URLs.
- **Settings → WhatsApp numbers** (admins):
  - list of numbers; whose phone each is on (phone-sent messages count for that employee)
  - **Connect WhatsApp number** = Meta Embedded Signup, either Coexistence (`featureType: whatsapp_business_app_onboarding`) or a new number
- **Server side of Connect:**
  - one-time code → business token, stored **encrypted** (AES-256-GCM, key from AUTH_SECRET; hidden from queries by default)
  - subscribes the WhatsApp account to the app
  - saves the number, then asks Meta for contacts + chat history (only allowed within 24 h of onboarding)
- **Webhooks:**
  - `history` saves old chats on the customer (creating the contact if needed, **no lead**)
  - `smb_app_state_sync` fills in contact names
  - a declined history share is shown on the number
- Replies from the CRM go out from the number the customer wrote to (that number's own token).
- New env: `META_APP_ID`, `META_ES_CONFIG_ID`. Guide: `docs/whatsapp-coexistence.md`.
- Tests: tests/db/coexistence.test.ts (secret box, signup happy path + refused code, history import / replay / contact names / declined history, a later message opens a lead).
