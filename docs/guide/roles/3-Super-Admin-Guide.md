# Volton CRM — Super Admin Guide

For: the **owner / super admin** (and admins). Website: https://volton-crm.vercel.app

> **You set up the company once** (sources, numbers, hours, people). Managers run the day. You check health, approve big things, and handle privacy requests.

Admins can do everything here **except** adding / removing managers and admins — that is super admin only.

---

## 1. Who can do what

| Role | Sees | Can |
|---|---|---|
| Super admin | Everything | Everything, plus add / deactivate / reset / remove **managers and admins** |
| Admin | Everything | All settings, all departments, erase customer data; adds agents, field agents, custom roles |
| Manager | Own department | Team, lead order, timings, proof review, Sheets, alerts, instructions |
| Call agent | Own leads only | Accept, call / WhatsApp, save results, quotations |
| Field agent | Own site visits | Update visits |
| Staff (custom role, no leads) | Own instructions | Work from Instructions |

Departments: **Installation** and **Trading**.

---

## 2. One-time company setup — checklist

- [ ] **Company admin → Managers & admins → Add a manager or admin**: one manager per department. Adding a manager creates that department's team.
- [ ] **Settings → Working hours**: Opens / Closes / working days (default 10:00–19:00, Mon–Sat, Pakistan time).
- [ ] **Settings → Appearance**: brand colours (applies to everyone).
- [ ] **Settings → Meta lead forms**: **Turn on live leads** once; set each form → department (**Save departments**). Use **Fetch leads from Meta** to pull past days.
- [ ] **Settings → WhatsApp numbers → Connect a WhatsApp number**: "Number already on WhatsApp Business app" (keeps the app working) or "New number". Set **Phone is with** (shared or an employee).
- [ ] **Settings → Google Sheets**: connect any Sheet still in use, with its department.
- [ ] Check **Company admin → System health** is green.
- [ ] Ask each manager to finish their checklist in the Manager Guide (team, lead order, alerts).

---

## 3. What each setting changes

| Setting | Where | Effect |
|---|---|---|
| Working hours | Settings | Night / holiday leads wait for opening time (unless a team allows night assignment). Follow-up times land inside office hours. Everyone still checked in is checked out 30 min after closing. |
| Appearance | Settings | Colours for all users. |
| Meta lead forms | Settings | Live Facebook / Instagram leads; form → department. |
| WhatsApp numbers | Settings | Chats become leads; replies and proof per number / employee. |
| Google Sheets | Settings | New rows every minute → leads. |
| My alerts | Settings | Your own notifications (admins get none until they opt in). |
| Proof storage | Settings | Screenshot space (Cloudinary free plan 25 GB) and clearing old screenshots. |
| Lead order & timings | Team (per department) | Who gets leads, accept / first-contact timers, check-in rule, night leads, pause. See Manager Guide §5.3. |
| Roles | Team | Custom roles: gets leads? gets instructions? |

---

## 4. Company admin page — what to watch

- **Closes waiting for approval** — managers should keep this near zero.
- **Open leads**, **Checked in now**.
- **Departments** cards: manager, agents, checked in, open leads, won this month, and **Auto-assign paused** (should normally be off).
- **System health**: Google Sheets, Timers (every minute), Background jobs, WhatsApp API, Meta lead forms, Screenshot storage. Anything red → fix or tell the developer.
- **Recent admin activity**: who changed users, teams and settings.

### Weekly checklist
- [ ] System health all green.
- [ ] Closes waiting for approval low in every department.
- [ ] **Leads → Leads by employee** for each department: who is behind?
- [ ] **Download Excel report** (Leads page) for the week.
- [ ] Proof storage not near the limit.

---

## 5. People

- **Managers and admins**: only you add, deactivate, reset password or remove them (Company admin page).
- **Agents, field agents, staff**: managers and admins add them in **Team → Add a team member**.
- **Deactivate** someone who left: they cannot sign in; their open leads go back to the queue and their visits move to others.
- Nobody can deactivate or remove their own account.

---

## 6. New roles and Instructions (for teams without leads)

**Add a role** — Team → Roles → New role:
1. **Role name** (e.g. Installer, Accountant, Store keeper).
2. **Does this role get leads automatically?** Yes = works like a call agent; No = staff, works only from Instructions.
3. **Does this role get work instructions?** Yes if they will be given tasks.
4. **Add role**, then add people with that role in **Add a team member**.

Roles you create are company-wide; a manager's roles belong to their department.

**How Instructions work**
1. A manager (or anyone) gives an instruction: **To**, **What needs to be done**, **Priority** (Normal / High / Urgent), **Due date**, **Details**.
2. The person gets a phone notification and moves it: **To do → In progress → In review** (Send for review). **On hold** if blocked.
3. The giver or a manager checks it and marks **Completed**. The employee cannot mark Completed.
4. Every change notifies the other side and is kept in **History**. Late items show **(late)**.
5. **Whole team** view shows everyone's tasks (admins: whole company).

---

## 7. Privacy and data

- **Delete a lead** (managers / admins): hidden, history kept — the customer can come back as a new lead.
- **Erase customer data** (admin / super admin only, permanent): lead page → Manage → **Erase customer data (privacy request — permanent)…** → type the last 4 digits of the phone + tick "I understand this cannot be undone". Removes the customer, all their leads, chats, files, visits and quotations. Old copies are never re-imported.
- Public pages for Meta: **/privacy** and **/data-deletion** (linked in the footer).

---

## 8. When something goes wrong

| Problem | Check |
|---|---|
| No new Facebook / Instagram leads | Settings → Meta lead forms status; System health. |
| A Google Sheet stopped | Settings → Google Sheets → the tab shows the problem; fix the column and press **Use new columns from now**. |
| Leads pile up unassigned | Dashboard queue panel reason: nobody checked in / auto-assign paused / no agents in the order. |
| WhatsApp messages not arriving | Settings → WhatsApp numbers status; System health → WhatsApp API. |
| Push notifications not working | The server needs the WEB_PUSH keys (developer). Users must tap **Turn on phone / PC notifications**. |
