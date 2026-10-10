# Volton CRM — Manager Guide

For: **Managers** (one department: Installation or Trading). Website: https://volton-crm.vercel.app

> **In one line:** leads come in by themselves → the CRM gives them to checked-in agents in turn → agents call / WhatsApp and save proof → you watch, help, and approve every close.

---

## 1. Your first day — checklist

- [ ] Sign in with the username and temporary password you were given. The CRM asks you to set your own password.
- [ ] Install the app on your phone: Android Chrome → **Install app**; iPhone Safari → Share → **Add to Home Screen**.
- [ ] Tap the bell 🔔 → **Turn on phone / PC notifications**. Without this you miss alerts when the CRM is closed.
- [ ] **Team → Add a team member**: check that all your call agents and field agents have accounts. Add anyone missing.
- [ ] **Team → Lead order & timings**: check the order of agents and the timings (see section 5).
- [ ] **Team → Who gets leads**: make sure every agent who should get leads shows **Gets leads automatically**.
- [ ] **Settings → My alerts**: choose which employee actions you want to be told about.
- [ ] **Settings → Google Sheets**: if your department still uses a Sheet, check it shows **connected**.
- [ ] Open **Leads** and look at **Where leads come from** — every source should say **Auto-sync on**.
- [ ] Read section 7 (your daily routine) and section 8 (closing and approval).

---

## 2. What you can see

| Menu | What it is for |
|---|---|
| Dashboard | Your department today: leads waiting, overdue follow-ups, who is checked in, KPI tiles |
| Instructions | Give work to people and track it (section 10) |
| Leads | Every lead in your department (section 4) |
| Follow-ups | Overdue and upcoming call-backs |
| Site visits | Field agents' visits, balanced by kW |
| Pipeline | Board of leads by stage (read-only view) |
| Team | People, lead order, timings, roles (section 5) |
| Proof review | Approve or dispute closes and suspicious calls (section 8) |
| Settings | Your alerts, proof storage, Google Sheets (section 6) |
| Help | Short in-app help |

You only see **your own department**. Admins and the super admin see everything.

---

## 3. Where leads come from and how they arrive

| Source | How it arrives | Do you need to do anything? |
|---|---|---|
| Facebook / Instagram lead forms (Meta) | Live, within seconds. A backup check runs every 15 minutes. | No. Admin connects it once. |
| WhatsApp (connected company numbers) | A new chat becomes a lead instantly. Click-to-WhatsApp ads show as **WhatsApp ad**. | No. |
| Google Sheet | New rows are pulled every minute. | Only if a tab **stops** (you get an alert). |
| Added by staff | **Add lead** button on the Leads page. | Yes, when a customer calls or walks in. |

**Which department?** Meta forms follow the form → department setting (admin). Otherwise words in the campaign decide (install, home, net metering → Installation; panel, inverter, battery, dealer → Trading). Unknown goes to Installation.

**Same customer again?** The CRM never makes a second open lead in the same department. It adds **Asked again** to the timeline and tells the agent.

---

## 4. The Leads page

When you open **Leads** you see two cards:

### 4.1 Leads by employee
- One card per employee: **name, checked in or not, total leads**, and a progress bar: **green = won, blue = still open, grey = lost / dead**.
- Numbers under each name: Open · Not accepted yet · Not contacted · Interested + · Won · Lost / dead · Overdue follow-ups.
- Period chips at the top: **All time · Today · This week · This month · Last month** (counts leads received in that period).
- **Tap a name** → that person's own page with **all their leads** (open, won, lost, everything). Tap any lead to see its stage, timeline, proof (screenshots) and WhatsApp chat.
- **← All employees** takes you back.

### 4.2 All leads
The full list, same as before:
- View chips: All open · New · Unassigned · Follow-ups · Interested · Won · Lost · Dead / junk · Everything.
- Search by name, phone or lead number.
- **Show more filters**: source, stage, agent, tries, follow-up, form / campaign, city, received date (Today, This week, This month… or a date range).
- **Download Excel report** (opens like an accordion) — choose before downloading:
  1. **Period**: Today, Yesterday, This week, Last 7 days, This month, Last month, Last 30 days, or **From – To dates**.
  2. **Sources**: tick one or more — e.g. Facebook + WhatsApp + Website together — or All sources.
  3. **Which leads**: *Received in this period* (e.g. "all Facebook leads of this month") or *Received or worked on in this period*.
  4. **More**: one employee (or "Not assigned"), a stage.
  - The box shows "You will get: …" before you press **Download Excel**. The file has Summary, Leads and Activity sheets; its About sheet lists the filters used.
- **Delete**: tick leads → write why → **Delete**. The lead is hidden but its history is kept.
- **Sync Google Sheet now** pulls the Sheet immediately (normally not needed).

### 4.3 One lead (lead page)
At the top: customer details, **What to do now**, and the contact buttons. Below, cards that open a panel from the bottom:

| Card | What you do there |
|---|---|
| Quotation | Make the quotation PDF (Volton classic or Modern design), send it on WhatsApp |
| Stage | Move the lead to any stage. Lost needs a reason; Won needs the sale value. |
| Manage | **Assign to** an agent (a person you pick gets the lead **already accepted — no Accept step**, they can call at once; "Next in order" still asks them to accept), **Move to department**, **Ping** the agent, **Delete**, **Reopen** a closed lead |
| Timeline & notes | Everything that happened, plus your notes |
| Proof | Every call / chat try with its result and screenshot |
| WhatsApp chat | The real WhatsApp conversation with the customer |
| Follow-ups | Planned call-backs |
| Site & visit | Bill, units, roof, kW; **Book site visit** for a field agent |
| Lead steps | Accept → Try 1 → Try 2 → Try 3 → Close → Manager check |

### 4.4 Lead stages (in order)
New → Contacted → Interested → Requirement Collected → Site Survey → Quotation Pending → Quotation Sent → Negotiation → **Won** / **Lost**.
Trading has no Site Survey. Many moves happen automatically: a connected call → Contacted, saving site details → Requirement Collected, booking a visit → Site Survey, sending a quotation → Quotation Sent.

---

## 5. Team page — settings that control who gets leads

### 5.1 Who is working now
Every agent with **open leads, leads to accept, last action** and check-in status.
- **Ping** — sends a message straight to their phone.
- **Give leads to others** — all their open leads go back to the queue and are given to other agents (use when someone leaves early or is sick).

### 5.2 Who gets leads
**Turn on / Turn off** per person.
- **On** → they join the lead order and get leads when checked in.
- **Off** → they get no new leads but keep the ones they already have.

### 5.3 Lead order & timings — what each setting does

| Setting | Default | Effect |
|---|---|---|
| Lead order (↑ ↓, Remove, + name) | — | Leads go 1 → 2 → 3 … then back to 1. "(got the last lead)" shows whose turn just passed. |
| Agent must accept within (min) | 5 | After this, you get **"… has not accepted a lead"**. |
| If not accepted in time, move the lead to the next agent | Off | When on, the lead jumps to the next agent automatically. |
| First call/WhatsApp within (min) | 15 | After this, you get **"Not contacted yet"**. |
| Max leads waiting to accept, per agent | 3 | An agent with this many un-accepted leads is skipped. |
| Give new leads only to agents who are checked in | On (keep it) | Agents who did not check in get nothing. |
| Give out leads at night / on holidays too | Off | Off = night leads wait until office opens. |
| Pause auto-assign (manager assigns everything) | Off | On = every lead waits for you to assign by hand. |
| Manager window (min) | 5 | Not used in practice (managers do not check in). Leave it. |

Press **Save timings** after changes.

### 5.4 Add a team member
- **Full name, Username, Temporary password** (8+ characters), Phone, Email, **Role**.
- New call agents join the lead order automatically. The person must change the password at first sign-in.
- **Deactivate** stops access (their open leads go back to the queue). **Password / remove…** resets the password or removes the person.

### 5.5 Roles (custom roles)
See section 9.

---

## 6. Settings — what you can change

| Card | What it does | Impact |
|---|---|---|
| My alerts | Pick which employee actions notify you: accepted a lead, tapped call/WhatsApp, saved a result, cancelled a tap, checked in / out, break, visit updated. For all or only ticked employees. | Only your own notifications. Closes, missed accepts and Sheet problems always come to you. |
| Proof storage | See how much screenshot space is used; **Clear screenshots** for a period. | Deletes only images. Calls, results and notes stay. Type CLEAR to confirm. |
| Google Sheets | Connect a Sheet (link + tab names), **Sync now**, **Start from now**, **Import ALL rows as history**, remove. | New rows become leads every minute. A stopped tab alerts you. |
| Users & roles | Shortcut to the Team page. | — |

Office **working hours**, colours, Meta forms and WhatsApp numbers are set by an admin.
Working hours matter to you: night leads wait for opening time, follow-up times land inside office hours, and anyone still checked in is **checked out automatically 30 minutes after closing**.

---

## 7. Your daily routine — checklist

**Morning**
- [ ] Dashboard: how many agents are **checked in**? Call anyone missing.
- [ ] **Leads waiting to be assigned**: if the queue panel shows leads, read the reason (e.g. "Nobody is checked in") and press **Assign waiting leads now** once agents are in.
- [ ] **Overdue follow-ups**: ping the agent or reassign.

**During the day**
- [ ] React to alerts: **has not accepted a lead**, **Not contacted yet**, **OVERDUE follow-up** → Ping, or Manage → Assign to someone else.
- [ ] Open **Leads → Leads by employee**: look for big orange numbers (Not contacted, Overdue) and for anyone with many leads and no progress.
- [ ] Add walk-in / phone customers with **Add lead**.

**Before closing**
- [ ] **Proof review**: approve or dispute every close (section 8).
- [ ] Check Sheet / source status on the Leads page.

**Weekly / monthly**
- [ ] **Download Excel report** for the week / month.
- [ ] Review the lead order: is everyone who should get leads in it?
- [ ] Proof storage: clear old screenshots if space is high (keep ones still waiting for review).

---

## 8. When an employee finishes or closes a lead — what you must do

Every close by an agent (**Won, Lost, Dead, Wrong number**) comes to you for checking. You get **"<agent> marked WON (Rs …) — please check"** (or Dead / not interested / wrong number).

- [ ] Open **Proof review** (the alert opens it).
- [ ] Read the agent's note and look at the screenshot.
- [ ] For a **Won** close: confirm the sale value is right.
- [ ] For a **Spot check** item: call the customer and confirm the call really happened.
- [ ] Press **OK** → approved. A Won close only counts in sales after you press OK.
- [ ] Or write a note and press **Dispute** → the lead re-opens, goes to another agent, and the first agent is told.

**Red flags to look for** (shown on the proof): Never left the app · Too fast · Screenshot reused · Screenshot time mismatch · Logged off duty · Call length too long · Lead closed — check it.

**Dead rule:** 3 no-answers in a row over at least 2 different days marks a lead **Dead** automatically. Wrong number marks it **Junk**.

---

## 9. Adding a new role (example: Accountant, Store keeper, Installer)

Use this for people who are not call agents or field agents.

1. Go to **Team → Roles → New role**.
2. Type the **Role name** (e.g. "Installer").
3. **Does this role get leads automatically?**
   - **Yes** → they work like a call agent (join the lead order).
   - **No** → they never get leads. They work only from **Instructions**.
4. **Does this role get work instructions?** Choose **Yes** if you will give them tasks.
5. Press **Add role**.
6. Go to **Team → Add a team member**, choose the new role in **Role**, and create the person.

A role cannot be removed while someone still has it. Your roles belong to your department.

---

## 10. Instructions — giving work to people who do not work leads

Instructions are tasks. Anyone can give one; they are most useful for roles with **no leads** (installers, store, accounts).

**Give an instruction**
1. **Instructions → + New instruction**.
2. **To** (the person), **What needs to be done**, **Priority** (Normal / High / Urgent), **Due date** (optional), **Details**.
3. **Send instruction** → the person gets a notification on their phone.

**Statuses**

| Status | Who sets it | Meaning |
|---|---|---|
| To do | — | New, not started |
| In progress | Employee | Working on it |
| In review | Employee (**Send for review**) | Says it is done — you must check |
| Completed | **You** (giver or manager) | You checked it and it is done |
| On hold | Either | Stopped for now |

- The employee cannot mark Completed — only the giver or a manager can, after checking.
- Each update can carry a **Note**; **History** shows every change. Late items show **(late)** in red.
- Views: **For me**, **I gave**, **Whole team**.

**Checklist for instructions**
- [ ] Check **In review** items every day and mark them Completed (or send back to In progress with a note).
- [ ] Look for **(late)** items and follow up.

---

## 11. The website (voltonsolar.com) and the CRM — one team, one login

The company website **voltonsolar.com** has its own admin panel where products (panels, inverters, batteries), plans, deals and website content are managed. The CRM and the website are now connected.

### 11.1 Website products in the quotation
- In **Quotation**, the **Brand / model** boxes for **Solar panels, Inverter and Battery** have a **Pick from website products** list.
- The list shows the products that are **active** in the website admin, with the website price. Picking one fills the model and the price (and the watt for panels). You can still change the price or type your own model.
- A product added or changed in the website admin appears in the CRM within **5 minutes**. A product hidden on the website disappears from the list.
- If the website cannot be reached, the old suggestion list is used — making quotations never stops.

### 11.2 One login for both
- Everyone uses their **CRM username (or email) and password** to sign in to the website admin at **voltonsolar.com/admin/login**. There are no separate website passwords for CRM staff.
- Even quicker: in the CRM menu tap **Website admin** — the website admin opens already signed in.
- When you **deactivate** or **remove** someone in the CRM, they also lose website access at once. A password reset in the CRM changes their website password too.

### 11.3 Who can do what on the website

| Website access | Can do on voltonsolar.com | Given by default to |
|---|---|---|
| **Website admin** | Everything: products, prices, plans, deals, content, settings (WhatsApp number, footer, menu, calculator values, website users) | Super admin, admins, managers, and everyone who was already in the CRM when this was switched on |
| **Website editor** | Content and products: products, brands, categories, plans, deals, testimonials, videos, stats, trending brands, hero images | New call agents and anyone whose role name contains "Marketing" |
| **No website access** | Cannot open the website admin | New field agents and other staff |

**To change someone's access:** **Team → Add a team member** → find the person → **Website** → choose Website admin / Website editor / No website access → **Save**.

### 11.4 Team page on the website (coming next)
The website will get a **Team** page showing the Volton team with its hierarchy (who reports to whom). Names, job titles and departments come straight from the CRM — keep job titles (Team → Roles) and managers correct. Phone numbers and emails are **not** shown on the website.

### 11.5 Checklist
- [ ] Check every person's **Website** access once (Team → Add a team member).
- [ ] Give **Website editor** to your marketing person (create a "Marketing" role in Team → Roles if needed).
- [ ] Before making a quotation, make sure the product and price are up to date in the website admin.
- [ ] When someone leaves: **Deactivate** them in the CRM — that also closes their website access.

---

## 12. Quick answers

| Question | Answer |
|---|---|
| Agent says they get no leads | Are they checked in? Is **Gets leads automatically** on? Are they in the lead order? Do they already have 3 leads waiting to accept? |
| Leads are waiting and nobody gets them | Read the queue panel reason on the Dashboard; press **Assign waiting leads now**. |
| Can I see the customer's real WhatsApp chat? | Yes — lead page → **WhatsApp chat** (company numbers that are connected). |
| Agent checked out by mistake | They tap **Check in** again. Check out now asks "Check out now?" to stop double-taps. |
| Wrong department | Lead page → Manage → **Move to department** + reason. |
