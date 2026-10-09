# Volt On Solar CRM — Employee & Manager Operational Guide (English & اردو)

---

## 📌 Contents / فہرست
1. [General Setup & Mobile PWA Install / ایپ انسٹالیشن اور لاگ ان](#1-general-setup--mobile-pwa-install)
2. [Call Agents Step-by-Step Guide / کال ایجنٹس کے لیے مکمل طریقہ کار](#2-call-agents-guide)
3. [Field Agents Step-by-Step Guide / فیلڈ ایجنٹس کے لیے مکمل طریقہ کار](#3-field-agents-guide)
4. [Managers Operational Guide & Auto-Assign / مینجرز کے لیے گائیڈ اور آٹو اسائن](#4-managers-guide)
5. [Anti-Fraud & Quality Assurance / اینٹی فراڈ اور سیکیورٹی قوانین](#5-anti-fraud--qa-rules)

---

## 1. General Setup & Mobile PWA Install / ایپ انسٹالیشن اور لاگ ان

### English
* **Login URL**: [https://volton-crm.vercel.app/login](https://volton-crm.vercel.app/login)
* **First Time Sign-In**: If your manager or administrator created your account with a temporary password, the system requires you to choose a new, secure password upon your first login.
* **Installing as a Mobile App (PWA)**:
  * **Android**: Open the link in Google Chrome. Tap the yellow **"Install app"** banner or tap Chrome menu (⋮) → **Add to Home screen**.
  * **iPhone / iOS**: Open in Safari. Tap the **Share** button (box with upward arrow) → scroll down and tap **Add to Home Screen**.

### اردو (Urdu)
* **لاگ ان لنک**: [https://volton-crm.vercel.app/login](https://volton-crm.vercel.app/login)
* **پہلی بار لاگ ان**: اگر مینجر نے آپ کا اکاؤنٹ عارضی پاس ورڈ کے ساتھ بنایا ہے، تو پہلے لاگ ان پر نیا مضبوط پاس ورڈ رکھنا لازمی ہے۔
* **موبائل میں ایپ کی طرح انسٹال کرنا**:
  * **اینڈرائیڈ (Android)**: گوگل کروم میں لنک کھولیں اور **Install app** کا بٹن دبائیں۔
  * **آئی فون (iPhone)**: سفاری براؤزر میں کھول کر نیچے **Share** کا بٹن دبائیں اور **Add to Home Screen** منتخب کریں۔

---

## 2. Call Agents Guide / کال ایجنٹس کے لیے مکمل طریقہ کار

### English: Daily Step-by-Step Workflow
1. **Morning Check-In**:
   * Open the app at start of shift and tap **Check in** on your Dashboard.
   * *Rule*: You will **only** receive incoming leads if you are checked in.
   * If taking a lunch or prayer break, tap **Start break**. Tap **End break** when you return.
2. **Accepting New Leads (SLA: 5 Minutes)**:
   * Leads arrive in a fair, fixed round-robin order (`Agent 1 → Agent 2 → Agent 3 → ...`).
   * When a lead is assigned to you, a yellow **Accept [Lead No]** button appears.
   * Customer phone numbers are masked until accepted.
   * You have **5 minutes** to accept. If not accepted, the lead automatically bounces to the next agent.
3. **Contacting Customer via WhatsApp / Phone**:
   * Tap **WhatsApp chat**, **WhatsApp call**, or **Phone call**.
   * *Important*: The server logs the exact tap timestamp before launching the app. Stay away from the CRM while talking to the customer (minimum 30 seconds for connected calls).
4. **Logging Outcomes & Proof**:
   * Return to the CRM and complete the outcome sheet:
     * **Call Result**: Connected, Busy, No Answer, Number Off, Wrong Number.
     * **Customer Response**: Interested, Deal won, Callback requested, Not interested.
     * **Screenshot**: Upload a fresh screenshot of your WhatsApp chat or phone call log.
5. **Cadence & Follow-ups**:
   * 1st call → 2nd call (+1 day) → 3rd call (+3 days) → Marked Dead after 3 no-answers.
   * Check the **Follow-ups** tab daily for scheduled reminders.

### اردو: روزمرہ کا طریقہ کار
1. **صبح کی حاضری (Check-In)**:
   * ڈیوٹی شروع کرتے ہی ڈیش بورڈ پر **Check in** کا بٹن دبائیں۔ بغیر چیک ان کے سسٹم آپ کو لیڈز نہیں دے گا۔
   * کھانے یا نماز کے وقفے کے لیے **Start break** دبائیں، اور واپس آ کر **End break** کریں۔
2. **نئی لیڈ قبول کرنا (۵ منٹ کی حد)**:
   * سسٹم خود بخود باری باری (Round-Robin) لیڈز دیتا ہے۔
   * نئی لیڈ آنے پر بڑا پیلا بٹن **Accept [لیڈ نمبر]** آئے گا۔ گاہک کا نمبر قبول کرنے سے پہلے چھپا رہتا ہے۔
   * اگر ۵ منٹ میں قبول نہ کی تو لیڈ اگلے ساتھی کو چلی جائے گی۔
3. **کسٹمر سے رابطہ (واٹس ایپ / فون کال)**:
   * **WhatsApp** یا **Phone call** کا بٹن دبائیں۔
   * بٹن دبانے کا ٹائم سرور ریکارڈ کرتا ہے۔ بات چیت مکمل کر کے CRM میں واپس آئیں۔
4. **کال کا رزلٹ اور اسکرین شاٹ کا ثبوت**:
   * رزلٹ درج کریں: بات ہوئی (Connected)، مصروف (Busy)، نمبر بند (Number Off)، یا جواب نہیں (No Answer)۔
   * کال یا واٹس ایپ چیٹ کا تازہ اسکرین شاٹ اپلوڈ کریں۔
5. **ڈیل ڈن ہونا (Deal Won)**:
   * جب گاہک سولر سسٹم فائنل کر لے تو **Deal won** منتخب کریں اور کل رقم لکھیں۔ یہ ڈیل مینجر کی منظوری کے بعد آپ کے کھاتے میں آئے گی۔

---

## 3. Field Agents Guide / فیلڈ ایجنٹس کے لیے مکمل طریقہ کار

### English
1. **Daily Check-In**: Check in on your dashboard at the start of your shift.
2. **Least Active kW Dispatch**:
   * Site survey visits are assigned automatically based on least active kW load (`active assigned visits × system kW`).
   * Field agents with the least load receive the next visit first.
3. **Conducting Site Visits**:
   * Tap **Site visits** in the navigation.
   * View the customer address, Google Maps link, and solar requirements.
   * Conduct site inspection, check roof type, shadow levels, and electricity bill details.
   * Update status to **Completed** or **Rescheduled** with site photos.

### اردو
1. **صبح کی حاضری**: روزانہ اپنے ڈیش بورڈ پر چیک ان کریں۔
2. **وزٹس کی منصفانہ تقسیم**: سسٹم وزٹ اس فیلڈ ایجنٹ کو دیتا ہے جس کے پاس سب سے کم کلو واٹ (kW) کا کام باقی ہو۔
3. **سائٹ وزٹ کا طریقہ**:
   * **Site visits** مینو میں جا کر گاہک کا پتہ اور گوگل میپ لوکیشن دیکھیں۔
   * چھت کا سائز، نیٹ میٹرنگ اور بجلی کے بل کی تفصیلات چیک کر کے سائٹ وزٹ مکمل کریں۔

---

## 4. Managers Guide / مینجرز کے لیے گائیڈ اور آٹو اسائن

### English: Manager Operations & Dashboard Controls
1. **Live Team Board**:
   * View checked-in agents, their current active leads, and time elapsed since last activity.
2. **Auto-Assign Leads Toggle (Dashboard)**:
   * Located directly on the Manager Dashboard.
   * 🟢 **ON (Active)**: New leads from Google Sheet and Meta WhatsApp are automatically routed directly to checked-in agents in round-robin order without requiring manual manager intervention. Any leads waiting in queue are assigned immediately.
   * 🟡 **OFF (Manual)**: Leads wait in the **Waiting for assignment** queue, allowing the manager to inspect each customer and manually assign to specific agents.
3. **Pipeline Board**:
   * View full Kanban stages.
   * **Desktop & Mobile Scrolling**: Click and drag horizontally with the grab cursor (`cursor-grab`) or swipe smoothly on mobile.
4. **Proof Review & Anti-Fraud Approvals**:
   * Closes (Deal won, Not interested, Dead, Wrong number) require manager review.
   * Flagged attempts (suspicious call duration, reused screenshots) appear with red warning badges at the top of the queue.
   * Tap **Mark OK** to approve sales numbers or **Dispute** to reopen the lead.

### اردو: مینجرز کے لیے ہدایات
1. **لائیو ٹیم مانیٹرنگ**: ڈیش بورڈ پر دیکھیں کہ کون سے ایجنٹس حاضر ہیں، کس کے پاس کتنی لیڈز ہیں، اور آخری کال کب ہوئی۔
2. **ڈیش بورڈ پر آٹو اسائن ٹوگل (Auto-Assign Leads Toggle)**:
   * 🟢 **آن (Active)**: تمام نئی اور قطار میں رکی ہوئی لیڈز خود بخود حاضر ایجنٹس میں تقسیم ہو جائیں گی۔ مینجر کی مینوئل مداخلت کی ضرورت نہیں۔
   * 🟡 **آف (Manual)**: لیڈز **Waiting for assignment** باکس میں رک جائیں گی تاکہ مینجر خود دیکھ کر مرضی کے ایجنٹ کو دے سکے۔
3. **پائپ لائن (Pipeline Board)**:
   * تمام مراحل (Stages) ایک نظر میں دیکھیں۔
   * ماؤس سے ڈریگ کر کے یا انگلی سے سوائپ کر کے بائیں دائیں اسکرول کریں۔
4. **پروف ریویو (Proof Review)**:
   * ڈیل ڈن ہونے پر ایجنٹ کا اسکرین شاٹ اور کوٹیشن چیک کر کے **Mark OK** کریں تاکہ سیلز میں شامل ہو سکے۔
   * مشکوک کالز کی نشاندہی کے لیے سرخ رنگ کا وارننگ بیج چیک کریں۔

---

## 5. Anti-Fraud & QA Rules / اینٹی فراڈ اور سیکیورٹی قوانین

| Rule / قانون | Mechanism / سسٹم کا عمل | Purpose / مقصد |
|---|---|---|
| **Server Timestamps** | Tap recorded on server before dialer opens | Fake zero-second calls blocked |
| **Minimum Away Time** | Requires $\ge 30\text{s}$ away for connected calls | Prevents fake call completions |
| **Fresh Screenshot Proof** | Validates Cloudinary upload time & hash | Screenshot reuse blocked |
| **Phone Number Masking** | Unaccepted leads hide customer numbers | Prevents cherry-picking |
| **Manager Deal Approval** | Agent closes set `closeReview: pending` | Fake sales stopped |
| **Department Isolation** | Scoped queries via `leadScope` / `guards.ts` | Data leak between departments blocked |
