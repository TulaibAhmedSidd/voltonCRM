# Volt On CRM — Implementation Plan (2026-10-13)

## 1. Overview
Enhance Volt On CRM and Main Website with:
1. Low-latency database migration & notification optimization.
2. Shortened lead timelines & data maintenance guidance for managers.
3. Team attendance check & balance section with missing check-in/out alerts.
4. Persistent agent check-in/check-out warning banner.
5. Cloudinary account migration (`CLOUDINARY_*_NEW`) & image asset migration.
6. High-efficiency client & server image compression for both projects.
7. Agent & Manager Ease-of-Use & workflow features.

---

## 2. Completed Milestones

### Phase A: Database & Performance Optimization
- **Low-Latency Database Migration**: Switched active connection to `volton.mwjlimq.mongodb.net` (`volton_crm` & `volton_db`), bringing round-trip ping down to ~35ms–45ms.
- **Notification Retention & Truncation**:
  - Reduced notification TTL index from 90 days to 1 day (`86,400s`) in `src/server/db/models/system.ts`.
  - Added 24-hour filter to `listNotifications` in `src/server/services/queries.ts`.
  - Purged 1,233 stale notification documents.
- **Old Cluster Truncation**: Cleared last 4 days of test data on `cluster0.iy47j.mongodb.net`.
- **Shortened Lead Timeline**:
  - Created `src/components/crm/lead-timeline.tsx` capping timeline events to 8 by default.
  - Added filter category chips: `All`, `Notes`, `Calls & Proof`, `Assignments`.
  - Added single-tap expand/collapse toggle.

### Phase B: Attendance Tracking & User Warning Banner
- **Team Attendance Check & Balance**:
  - Implemented `getTeamAttendanceHistory()` in `src/server/services/queries.ts`.
  - Created `src/components/crm/team-attendance-section.tsx` with 3 real-time alert cards:
    - ⚠️ *Missing Check-in Today* (agents on duty who forgot to check in).
    - ⚠️ *Missing Past Check-outs* (shifts left unclosed from past days).
    - 🟢 *Currently on Duty* (total active checked-in agents).
  - Integrated into `/team?section=attendance`.
- **Persistent User Check-in/Out Warning Banner**:
  - Created `src/components/crm/check-in-reminder-banner.tsx`.
  - Mounted in `src/app/(crm)/layout.tsx` for `agent`, `field_agent`, and `staff`.
  - Shows warning banner when offline with 1-tap "Check in now" button.
  - Shows active shift reminder with 1-tap break and confirmed checkout.

### Phase C: Cloudinary Account Switch & Image Migration
- **Environment Keys**:
  - Synced `CLOUDINARY_CLOUD_NAME_NEW`, `CLOUDINARY_API_KEY_NEW`, `CLOUDINARY_API_SECRET_NEW` in `.env` (CRM) and `.env.local` (Website).
  - Updated `src/lib/env.ts`, `src/server/services/cloudinary.ts`, `src/server/services/admin.ts`, and `app/lib/cloudinary.js`.
- **Image Migration**:
  - Identified 36 unique Cloudinary images across `brands`, `products`, and `teammembers` in website DB.
  - Uploaded all 36 images to new Cloudinary cloud (`ctrhzh2q`).
  - Updated MongoDB documents so 0 images remain on old cloud (`dmstryfl9`).
- **High-Efficiency Dual-Layer Compression**:
  - **Website Client**: Added canvas WebP compression (max 1920px, 85% quality) in `app/components/ImageUpload.jsx`.
  - **Website Cloudinary**: Added `quality: 'auto:good'`, `fetch_format: 'auto'`, and `max_width: 1920` transformation in `app/lib/cloudinary.js`.
  - **CRM Phone**: Enhanced `compressImage` in `src/components/crm/contact-actions.tsx` to 1600px with WebP/JPEG 0.82 for razor-sharp text and ~140KB file sizes.

---

## 3. Next Up: Agent & Manager Ease-of-Use Features

### Step 1: Agent One-Tap Quick Call Outcomes & Notes
- On lead cards and contact forms, provide quick 1-tap chips:
  - *“No Answer / Ringing”*
  - *“Customer Busy — Call Evening”*
  - *“Interested — Send Quote on WhatsApp”*
  - *“Wrong Number / Invalid”*
- Automatically fills note and selects outcome with a single tap.

### Step 2: One-Tap WhatsApp Click-to-Chat with Pre-Filled Template
- Direct WhatsApp link opening `https://wa.me/92300xxxxxxx?text=...` with standard Volt On Solar company introduction and customer name pre-filled.

### Step 3: Manager SLA & Uncontacted Lead Alert
- Highlight raw/assigned leads sitting without first contact for > 30 minutes with an amber alert badge.

### Step 4: Manager One-Tap Bulk Reassign for Offline Agents
- In `/team`, button to reassign leads from absent agents who did not check in today to checked-in agents on duty.

### Step 5: Meta Conversions API (CAPI) Integration
- Setup server event dispatcher for qualified leads (`stage` transitions) linking back to Meta Dataset ID `1105656635448583`.
