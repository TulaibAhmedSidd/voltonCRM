# Volt On Solar CRM — Complete Visual Walkthrough & Operations Manual

> **Video Walkthroughs with Slow Urdu Commentary (ویڈیو رہنمائی)**
> * 🎬 **Manager & Admin Video Walkthrough**: [`public/guide/volton-crm-manager-guide-urdu.mp4`](file:///d:/ReactProjects/CRMvolt/public/guide/volton-crm-manager-guide-urdu.mp4) (3.9 MB)
> * 🎬 **Employee & Call Agent Video Walkthrough**: [`public/guide/volton-crm-employee-guide-urdu.mp4`](file:///d:/ReactProjects/CRMvolt/public/guide/volton-crm-employee-guide-urdu.mp4) (2.6 MB)
> * 🎬 **Master Video (Combined Manager + Employee + WhatsApp API)**: [`public/guide/volton-crm-complete-guide-urdu.mp4`](file:///d:/ReactProjects/CRMvolt/public/guide/volton-crm-complete-guide-urdu.mp4) (6.5 MB)
> * 🌐 **In-App Interactive Guide**: Open the CRM & click **App Guide** in the navigation sidebar or visit [`/guide`](http://localhost:3000/guide).

---

## Table of Contents / فہرست
1. [Core Architectural Rules & Anti-Fraud Security / بنیادی اصول اور سیکیورٹی](#1-core-architectural-rules--anti-fraud-security)
2. [Part 1: Super Admin & Manager Setup (Screenshots & Steps) / مینیجر سیٹ اپ](#2-part-1-super-admin--manager-setup)
3. [Part 2: Manager Daily Workflow & Adding Call Agents / مینیجر کا طریقہ کار اور ٹیم کا اندراج](#3-part-2-manager-daily-workflow--adding-call-agents)
4. [Part 3: Employee (Call Agent) Daily Workflow / ملازمین اور کال ایجنٹس کا طریقہ کار](#4-part-3-employee-call-agent-daily-workflow)
5. [Part 4: What Unlocks When Meta WhatsApp Cloud API is Connected / واٹس ایپ اے پی آئی کی خصوصیات](#5-part-4-what-unlocks-when-meta-whatsapp-cloud-api-is-connected)
6. [Urdu Video Narration Transcript / اردو ویڈیو ٹرانسکرپٹ](#6-urdu-video-narration-transcript)

---

## 1. Core Architectural Rules & Anti-Fraud Security

Volt On CRM is built specifically for Pakistani solar companies operating with two independent departments: **Trading** and **Installation**. To protect company revenues, maintain customer trust, and avoid agent commission disputes, the following anti-fraud rules are strictly enforced by the system:

1. **Mandatory First Login Password Change (`mustChangePassword`)**:
   * *Why*: When an admin or manager creates an account, they provide a temporary password. The system intercepts the first login and forces the user to set a private password. Even the Super Admin or database admin cannot see the user's permanent password.
2. **Duty Check-In Required for Leads (`attendance`)**:
   * *Why*: Leads are precious assets. If an agent is absent or stepped away, assigning leads to them causes customer neglect. The round-robin algorithm only assigns leads to agents who have actively tapped **Check in**.
3. **5-Minute Accept Window SLA**:
   * *Why*: When a lead arrives, the assigned agent has exactly 5 minutes to tap **Accept**. If not accepted, the system automatically transfers the lead to the next agent in the round-robin rotation.
4. **Phone Masking & Atomic Call Logging**:
   * *Why*: Customer phone numbers remain masked until accepted. Tapping WhatsApp or Phone Call writes an atomic audit record. Phone-reported call times are only trusted within the actual window between tap and submission.
5. **Manager Review on Lead Closing (Won / Lost / Dead)**:
   * *Why*: Call agents **cannot** mark a lead as WON or LOST directly into the sales metrics. An agent closing flags `closeReview: pending`. Only after a manager inspects the call notes and screenshots does the sale register in commission KPIs.

---

## 2. Part 1: Super Admin & Manager Setup

### Step 1.1: Super Admin Sign-In
* **URL**: `/login`
* **Action**: Enter `tulaib@gmail.com` and credentials.
* **Why**: The Super Admin (Owner) has full governance over managers, departmental scoping, and global settings.
* **Screenshot**:
  ![Login Screen](/guide/walkthrough/01_login_page.png)
  ![Credentials Entered](/guide/walkthrough/02_superadmin_credentials_entered.png)

### Step 1.2: Super Admin Dashboard & Auto-Assign Toggle
* **URL**: `/dashboard`
* **Action**: View real-time KPIs, pending proof approvals, and the **Auto-Assign Leads** toggle.
* **Why**: The toggle allows the owner or manager to switch between automated round-robin lead assignment and manual manager delegation with one tap.
* **Screenshot**:
  ![Super Admin Dashboard](/guide/walkthrough/03_superadmin_dashboard.png)

### Step 1.3: Creating Departmental Managers (Trading & Installation)
* **URL**: `/admin` (Company Admin)
* **Action**:
  1. Add **Trading Manager**:
     * Name: `Hamza Farooq`
     * Username: `hamza.trading`
     * Role: `manager`
     * Department: `Trading`
     * Phone: `03001234567`
  2. Add **Installation Manager**:
     * Name: `Zubair Khan`
     * Username: `zubair.install`
     * Role: `manager`
     * Department: `Installation`
     * Phone: `03007654321`
* **Why**: Departmental segregation guarantees that Trading managers only see Trading leads and inventory, while Installation managers manage their own site surveys and engineering pipeline.
* **Screenshots**:
  ![Company Admin Overview](/guide/walkthrough/04_company_admin_page.png)
  ![Create Trading Manager Form](/guide/walkthrough/05_create_trading_manager_form.png)
  ![Trading Manager Created](/guide/walkthrough/06_trading_manager_created.png)
  ![Create Installation Manager Form](/guide/walkthrough/07_create_installation_manager_form.png)
  ![Both Managers Created & Active](/guide/walkthrough/08_both_managers_created.png)

---

## 3. Part 2: Manager Daily Workflow & Adding Call Agents

### Step 2.1: Manager First Login & Forced Password Reset
* **URL**: `/login` &rarr; redirected to `/change-password`
* **Action**: Trading Manager signs in with `hamza.trading` and temporary password. The system immediately redirects to the password update form.
* **Why**: Ensures zero password knowledge by upstream administrators.
* **Screenshots**:
  ![Manager First Login](/guide/walkthrough/09_manager_login_credentials.png)
  ![Forced Password Reset](/guide/walkthrough/10_manager_forced_password_reset.png)
  ![Manager Password Reset Form](/guide/walkthrough/11_manager_password_reset_filled.png)
  ![Manager Scoped Dashboard](/guide/walkthrough/12_trading_manager_dashboard.png)

### Step 2.2: Manager Adds Call Agent (Employee)
* **URL**: `/settings` (Users section)
* **Action**: Click **Add user** to register Call Agent:
  * Name: `Bilal Ahmed`
  * Username: `bilal.agent`
  * Role: `agent` (Call Agent)
  * Phone: `03121234567`
  * Temporary password: provided for agent's first sign-in
* **Why**: Managers recruit and manage their own departmental agents without bothering the owner.
* **Screenshots**:
  ![Manager Settings Page](/guide/walkthrough/13_manager_settings_page.png)
  ![Add Call Agent Form](/guide/walkthrough/14_manager_add_call_agent_form.png)
  ![Call Agent Added to Team](/guide/walkthrough/15_call_agent_created_in_team.png)

### Step 2.3: Team Rotation Order & Timings
* **URL**: `/team`
* **Action**: Add agent into the active rotation order (`1. Bilal Ahmed`). Configure timing rules:
  * Manager window: 5 mins
  * Agent accept window: 5 mins
  * Contact within: 15 mins
* **Why**: Guarantees strict round-robin fairness and SLA adherence.
* **Screenshot**:
  ![Team Order and Timings](/guide/walkthrough/16_manager_team_order_and_timings.png)

### Step 2.4: Quick Lead Ingestion & Delegation
* **URL**: `/leads`
* **Action**: Click **Add lead** modal to capture walk-in or manual WhatsApp inquiry (`Tariq Mehmood`, `03001234567`, Lahore, Trading). Assign to `Bilal Ahmed`.
* **Screenshots**:
  ![Quick Add Lead Dialog](/guide/walkthrough/17_manager_quick_add_lead_dialog.png)
  ![Lead Detail View](/guide/walkthrough/18_manager_lead_detail_view.png)
  ![Selecting Assigned Agent](/guide/walkthrough/19_manager_selecting_assigned_agent.png)
  ![Lead Assigned to Agent](/guide/walkthrough/20_manager_assigned_lead_to_agent.png)

---

## 4. Part 3: Employee (Call Agent) Daily Workflow

### Step 3.1: Employee First Login & Password Security
* **URL**: `/login` &rarr; redirected to `/change-password`
* **Action**: Bilal Ahmed signs in with `bilal.agent`. The system enforces setting a private permanent password.
* **Screenshots**:
  ![Employee Login Screen](/guide/walkthrough/21_employee_login_screen.png)
  ![Employee Forced Password Reset](/guide/walkthrough/22_employee_forced_password_reset.png)
  ![Employee Password Reset Form](/guide/walkthrough/23_employee_password_reset_filled.png)

### Step 3.2: Shift Check-In (Starting Duty)
* **URL**: `/dashboard`
* **Action**: Tap yellow **Check in** button.
* **Why**: Mandatory step! Unchecked agents are excluded from receiving any leads.
* **Screenshots**:
  ![Dashboard Before Check-In with Unaccepted Lead](/guide/walkthrough/24_employee_dashboard_unaccepted_lead.png)
  ![Checked In Active Shift](/guide/walkthrough/25_employee_checked_in_active_shift.png)

### Step 3.3: Accepting the Lead (5-Minute Window)
* **URL**: `/dashboard`
* **Action**: Tap **Accept VL-00001** within 5 minutes.
* **Why**: Confirms agent is ready to respond. If skipped, lead bounces to the next agent in queue.
* **Screenshot**:
  ![Lead Accepted by Agent](/guide/walkthrough/26_employee_lead_accepted.png)

### Step 3.4: Contacting the Customer & Proof Audit
* **URL**: `/leads/[id]`
* **Action**: Customer phone number is unmasked. Tap **WhatsApp** or **Call**.
* **Why**: Records atomic attempt claim and timestamp. Agent writes call notes and outcome.
* **Screenshots**:
  ![Contact Options and Masked Phone](/guide/walkthrough/27_lead_detail_contact_options.png)
  ![Audit Timeline & Activities](/guide/walkthrough/29_lead_detail_audit_timeline.png)

### Step 3.5: Pipeline Horizontal Scroll with Grab Cursor
* **URL**: `/pipeline`
* **Action**: Scroll stages (New &rarr; Contacted &rarr; Qualified &rarr; Survey &rarr; Proposal &rarr; Won/Lost) smoothly using drag cursor on desktop or touch swipe on mobile.
* **Screenshots**:
  ![Pipeline Horizontal Drag Scroll](/guide/walkthrough/30_employee_pipeline_drag_scroll.png)
  ![Employee Dashboard Active Duty Summary](/guide/walkthrough/31_employee_dashboard_active_duty.png)

---

## 5. Part 4: What Unlocks When Meta WhatsApp Cloud API is Connected

![WhatsApp Cloud API Feature Infographic](/guide/walkthrough/32_whatsapp_api_future_features.png)

Currently, the CRM uses deep links (`https://wa.me/...`) to launch WhatsApp Web or the mobile app. Once Meta WhatsApp Cloud API credentials (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`) are configured, the following automated features unlock:

1. **Automated Click-to-WhatsApp (CTWA) Ad Lead Ingestion**:
   * When a prospective customer taps a Facebook or Instagram ad and sends an inquiry, the CRM automatically intercepts the webhook.
   * Creates the lead in `< 2 seconds`, attributes the exact Meta Ad Campaign ID, Ad Creative, and referral headline, and immediately assigns it to the next checked-in agent.
2. **Live Two-Way WhatsApp Chat Inside CRM (`ChatPanel`)**:
   * Agents and managers chat directly inside the CRM web application.
   * No personal phone numbers or physical SIM cards required; messages flow through the official verified business number.
3. **Automated Instant Follow-Up Templates**:
   * Instant welcome greeting sent as soon as a lead is generated.
   * Automated solar quotation delivery and follow-up templates sent automatically according to configured SLA timers.
4. **Zero Data Leakage & Security Assurance**:
   * Complete chat history is permanently preserved in the company MongoDB database.
   * Agents cannot delete conversations or divert customer inquiries to personal numbers.

---

## 6. Urdu Video Narration Transcript / اردو ویڈیو ٹرانسکرپٹ

### مینیجر ویڈیو گائیڈ (Urdu Narration Transcript)
1. **خوش آمدید اور سپر ایڈمن ڈیش بورڈ**:
   *"السلام علیکم۔ وولٹ آن سولر سی آر ایم کے مینیجر گائیڈ میں خوش آمدید۔ یہ موبائل فرسٹ ویب سسٹم خاص طور پر پاکستان کی سولر انڈسٹری کے لیے ڈیزائن کیا گیا ہے۔ سب سے پہلے کمپنی سپر ایڈمن لاگ ان کرتے ہیں۔ ڈیش بورڈ پر اہم کے پی آئیز اور آٹو اسائن کا ٹوگل موجود ہے جس کے ذریعے لیڈز کی خودکار تقسیم کو آن یا آف کیا جا سکتا ہے۔"*
2. **شعبہ جاتی مینیجرز کا قیام**:
   *"کمپنی ایڈمن سیکشن میں جا کر، سپر ایڈمن دونوں شعبوں کے لیے مینیجرز تیار کرتا ہے۔ یہاں ہم نے ٹریڈنگ ڈیپارٹمنٹ کے لیے حمزہ فاروق کو اور انسٹالیشن ڈیپارٹمنٹ کے لیے زبیر خان کو بطور مینیجر منتخب کیا، اور عارضی پاس ورڈ فراہم کیا۔ سی آر ایم کے اصول کے مطابق ہر مینیجر صرف اپنے ہی شعبے کے ایجنٹس اور لیڈز تک رسائی رکھتا ہے تاکہ دونوں ڈپارٹمنٹس آزادانہ اور محفوظ طریقے سے کام کر سکیں۔"*
3. **مینیجر لاگ ان اور لازمی پاس ورڈ تبدیلی**:
   *"اب مینیجر پہلی بار اپنے دیے گئے عارضی پاس ورڈ سے لاگ ان کرتا ہے۔ سسٹم فورا پاس ورڈ ری سیٹ اسکرین دکھاتا ہے کیونکہ سیکیورٹی قانون کے تحت کمپنی میں کسی بھی افسر کا پاس ورڈ ایڈمن کو بھی معلوم نہیں ہونا چاہیے۔ مینیجر اپنا نیا محفوظ پاس ورڈ سیٹ کرتا ہے اور اپنے ٹریڈنگ ڈیپارٹمنٹ کے مخصوص ڈیش بورڈ میں داخل ہو جاتا ہے۔"*
4. **کال ایجنٹس کا اندراج اور راؤنڈ رابن روٹیشن**:
   *"سیٹنگز کے صفحے پر جا کر مینیجر اپنے ڈیپارٹمنٹ کے لیے نئے کال ایجنٹ، جیسے بلال احمد، کو شامل کرتا ہے۔ ٹیم کے صفحے پر راؤنڈ رابن روٹیشن سیٹ کی جاتی ہے تاکہ لیڈز ایجنٹس میں باری باری برابر تقسیم ہوں۔ ساتھ ہی مینیجر ونڈو، پانچ منٹ کا ایکسیپٹ ٹائمر، اور فالو اپ کی حدود کا تعین کیا جاتا ہے۔ لیڈ صرف اسی ایجنٹ کو تفویض ہوتی ہے جو اپنی شفٹ میں باقاعدہ چیک ان ہو۔"*
5. **کوئیک لیڈ اور پروف ریویو سیکیورٹی**:
   *"اگر کوئی گاہک واٹس ایپ یا فون پر ڈائریکٹ رابطہ کرے تو مینیجر کوئیک ایڈ لیڈ کے ذریعے کسٹمر کا اندراج کرتا ہے اور مینوئل بھی لیڈ اسائن کر سکتا ہے۔ اینٹی فراڈ قانون کے تحت ایجنٹ خود سے کسی ڈیل کو فائنل نہیں کر سکتا۔ جب بھی کوئی ایجنٹ ڈیل ون کا دعویٰ کرے گا تو وہ مینیجر کے پروف ریویو میں جائے گی اور مینیجر کی تصدیق کے بعد ہی سیلز میں گنی جائے گی۔"*
6. **واٹس ایپ کلاؤڈ اے پی آئی کا مستقبل**:
   *"ایک بہت اہم وضاحت واٹس ایپ اے پی آئی کے حوالے سے: فی الحال آفیشل میٹا واٹس ایپ کلاؤڈ اے پی آئی منسلک نہیں ہے، اس لیے ہم سسٹم سے بیرونی واٹس ایپ کھولتے ہیں۔ لیکن جیسے ہی میٹا اے پی آئی منسلک ہو جائے گی، تو فیس بک اور انسٹاگرام کے اشتہارات سے لیڈز فورا خودکار طریقے سے سی آر ایم میں آ جائیں گی، سی آر ایم کے اندر ہی باضابطہ لائیو چیٹ پینل کھل جائے گا، اور خودکار خوش آمدیدی پیغامات اور کوٹیشنز براہ راست سسٹم سے گاہک کو روانہ ہوں گی۔"*

### کال ایجنٹ ویڈیو گائیڈ (Urdu Narration Transcript)
1. **پہلا لاگ ان اور پاس ورڈ سیکیورٹی**:
   *"السلام علیکم۔ وولٹ آن سولر سی آر ایم میں تمام کال ایجنٹس کا خیر مقدم ہے۔ جب مینیجر آپ کا اکاؤنٹ بناتا ہے تو آپ کو ایک عارضی پاس ورڈ ملتا ہے۔ پہلی بار لاگ ان کرتے ہی سسٹم آپ سے اپنا ذاتی خفیہ پاس ورڈ سیٹ کرواتا ہے۔ یہ اینٹی فراڈ سیکیورٹی کا حصہ ہے تاکہ آپ کا کام اور کمیشن صرف آپ کے کنٹرول میں رہے۔"*
2. **صبح کی حاضری (Check-In)**:
   *"پاس ورڈ سیٹ کرنے کے بعد آپ اپنے ڈیش بورڈ پر آ جاتے ہیں۔ یہاں سب سے اہم قدم چیک ان کا بٹن دبانا ہے۔ یاد رکھیں، جب تک آپ چیک ان نہیں ہوں گے، سسٹم آپ کو غیر حاضر سمجھے گا اور راؤنڈ رابن پول سے آپ کو کوئی بھی نئی لیڈ موصول نہیں ہوگی۔ چیک ان ہوتے ہی آپ کی ڈیوٹی فعال ہو جاتی ہے۔"*
3. **نئی لیڈ قبول کرنا (۵ منٹ کی حد)**:
   *"جب کوئی نئی لیڈ آپ کو اسائن ہوتی ہے تو ڈیش بورڈ پر پانچ منٹ کا ٹائمر شروع ہو جاتا ہے۔ آپ نے فورا ایکسیپٹ کا بٹن دبانا ہے۔ اگر آپ پانچ منٹ کے اندر لیڈ قبول نہیں کریں گے، تو سسٹم کسٹمر کے تحفظ کے لیے وہ لیڈ آپ سے واپس لے کر اگلے ایجنٹ کو منتقل کر دے گا۔"*
4. **گاہک سے رابطہ، فون ماسکنگ اور کال لاگ**:
   *"لیڈ قبول کرنے کے بعد کسٹمر کی تفصیلات کھلتی ہیں۔ فون نمبر سیکیورٹی کے تحت ماسک یعنی جزوی طور پر چھپا ہوا ہوتا ہے۔ جیسے ہی آپ کال یا واٹس ایپ کا بٹن دباتے ہیں، رابطہ ہو جاتا ہے اور آپ کی کوشش کا ٹائم اور پروف سی آر ایم میں لاک ہو جاتا ہے۔ کال کے بعد گفتگو کا احوال نوٹس میں لازمی درج کریں۔"*
5. **پائپ لائن افقی اسکرول اور ڈیل فائنلائزیشن**:
   *"پائپ لائن اسکرین پر آپ اپنی تمام لیڈز کو مختلف مراحل میں باآسانی دیکھ سکتے ہیں۔ ہم نے ماؤس کے گریب کرسر اور موبائل سوائپ کے ساتھ افقی اسکرولنگ شامل کی ہے تاکہ پائپ لائن بغیر کسی دقت کے چل سکے۔ ڈیل ون ہونے پر مینیجر کے پاس پروف ریویو جائے گا جو آپ کی سیلز کی تصدیق کرے گا۔"*
6. **واٹس ایپ چیٹ کا مستقبل**:
   *"اور آخر میں: جب آفیشل میٹا واٹس ایپ کلاؤڈ اے پی آئی فعال ہو جائے گی، تو آپ کو اپنے ذاتی فون سے کسٹمر کو میسج کرنے کی ضرورت بالکل نہیں رہے گی۔ آپ براہ راست سی آر ایم کے اندر سے ہی کمپنی کے آفیشل نمبر سے کسٹمر کے ساتھ چیٹ کر سکیں گے اور لائیو جواب دے سکیں گے۔ شکریہ اور آپ کا کام کامیاب رہے!"*
