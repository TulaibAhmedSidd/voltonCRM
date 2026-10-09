# Connect the WhatsApp numbers Volton already uses (Coexistence)

**Coexistence** = a number that runs in the **WhatsApp Business app** is also connected to the CRM.
- Staff keep using the app on the same phone. **No new SIM.**
- Every customer message arrives in the CRM. A new customer becomes a **lead**; an existing customer's message goes on their lead.
- Every message staff send **from the phone** is copied into the CRM and counts as proof for that employee.
- Up to **6 months of old chats** and the phone's **contact names** are copied once, if you allow it during setup.
  Old chats are saved on the customer but **no lead is opened** — they become a lead only when they write again.
- Not covered: **calls** made in the app, broadcast lists, disappearing / view-once messages, groups.

## Part A — one-time setup in Meta (about 10 minutes)
1. **developers.facebook.com** → My Apps → **Volton CRM**.
2. Left menu → **Add product** → **Facebook Login for Business** → *Set up*.
3. **Facebook Login for Business → Settings**:
   - Client OAuth login: **Yes**. Web OAuth login: **Yes**. Login with the JavaScript SDK: **Yes**.
   - **Allowed domains for the JavaScript SDK**: `https://volton-crm.vercel.app` (your CRM address).
   - **Valid OAuth redirect URIs**: `https://volton-crm.vercel.app/`
   - Save.
4. **Facebook Login for Business → Configurations → Create configuration**:
   - Name: `WhatsApp connect`.
   - Login variation: **WhatsApp Embedded Signup**.
   - Assets: **WhatsApp accounts**.
   - Permissions: `whatsapp_business_management`, `whatsapp_business_messaging` (and `business_management` if listed).
   - **Create**, then copy the **Configuration ID** (digits).
5. **App settings → Basic**: under **App domains**, add `volton-crm.vercel.app`. Save.
6. Vercel → Settings → Environment Variables → add:
   - `META_APP_ID` = the App ID at the top of the app dashboard (digits).
   - `META_ES_CONFIG_ID` = the Configuration ID from step 4.
   - Then **Redeploy**.

## Part B — before connecting a phone
- On that phone, **update the WhatsApp Business app** from Play Store / App Store.
- The number should have been used on the **Business app for at least a week** (Meta's rule).
- Keep the phone **on the internet** and unlocked while you connect.
- The person pressing Connect must be an **admin** of the Volton business portfolio and of the app.

## Part C — connect a number (repeat for each number)
1. CRM → **Settings → WhatsApp numbers**.
2. Choose **"Number already on WhatsApp Business app"**.
3. **Whose phone is it on?** Pick the employee (or "Shared company number").
4. Press **Connect WhatsApp number**. Meta's window opens:
   - Log in with Facebook → choose the **Volton solar** business portfolio.
   - Choose **Connect your existing WhatsApp Business app** → enter the number.
   - On the **phone**, open the WhatsApp Business app — follow Meta's message there (scan the QR code / confirm).
   - When asked, **allow sharing chat history** (needed to copy old chats).
   - Finish.
5. The CRM shows **"Connected Volt On (+92 …)"**. Old chats arrive over the next hours (shown under the number).

## Check it works (2 minutes)
1. From another phone, send "Salam" to the connected number.
   → The message appears on the phone **and** a new lead appears in the CRM (source **WhatsApp chat**).
2. Reply **from the phone**. → The reply appears on the lead's WhatsApp tab as sent from the phone.

## If something is wrong
| Problem | Fix |
|---|---|
| Button says "add META_APP_ID and META_ES_CONFIG_ID" | Part A step 6, then Redeploy |
| Meta window: "URL blocked" / "domain not allowed" | Part A steps 3 and 5 — the CRM address must be in both places |
| No "Connect your existing WhatsApp Business app" option | Update the app on the phone; the number must be on the Business app (not normal WhatsApp) for 7+ days. If Meta says the app is not allowed to onboard, Meta wants the app to be a **Tech Provider**: app dashboard → WhatsApp → *Become Tech Provider* (needs business verification). Send me a photo of the message. |
| Connected, but chats don't arrive | Settings shows the number as Connected? Send me a photo of Company admin → System health. |
| "Chat history not shared" under the number | History was declined in the Meta window. It can only be shared at connection time. |
