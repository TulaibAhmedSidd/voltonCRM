# 2026-10-13 — done

## Database Migration & Notification Optimization
- Switched CRM and website active databases to the low-latency cluster (`volton.mwjlimq.mongodb.net`, databases `volton_crm` and `volton_db`). Round-trip latency reduced from ~170ms to ~35ms–45ms.
- Shortened notification retention policy from 90 days to 1 day (86,400s) with MongoDB TTL index in `src/server/db/models/system.ts`.
- Filtered `listNotifications` in `src/server/services/queries.ts` to show only the last 24 hours.
- Cleaned 1,233 stale notification documents (>24h old) from the active database.
- Cleaned test data created in the last 4 days from the old cluster (`cluster0.iy47j.mongodb.net`).

## Shortened Lead Timeline & Notes
- Built `src/components/crm/lead-timeline.tsx` client component:
  - Caps event history to the latest 8 events by default to eliminate heavy DOM lag on mobile phones.
  - Category filter chips: `All`, `Notes`, `Calls & Proof`, `Assignments`.
  - Expand/collapse toggle button ("Show all X events" / "Show latest 8 only").
- Integrated into `src/app/(crm)/leads/[id]/page.tsx` under the Timeline & Notes tab with clean actor details (who received, who was assigned, who reassigned).

## Team Attendance Check & Balance Section
- Added `getTeamAttendanceHistory()` query in `src/server/services/queries.ts` returning 14-day history, duration worked, missing check-ins, and unclosed past shifts.
- Built `src/components/crm/team-attendance-section.tsx` in **Team &rarr; Attendance history** (`/team?section=attendance`):
  - ⚠️ **Missing Check-in Today**: Alert card listing all agents who are active today but forgot to check in.
  - ⚠️ **Missing Past Check-outs**: Alert card highlighting shifts left open from past days.
  - 🟢 **Currently on Duty**: Live count of checked-in staff.
  - Search by employee name and filter chips (`All`, `Today`, `On Duty`, `Missing Check-out`).
  - Attendance table showing Employee Name & Role, Date (PKT), Check-in Time (PKT), Check-out Time (PKT), and net duration worked.

## User Shift Warning Banner
- Built `src/components/crm/check-in-reminder-banner.tsx` and mounted in `src/app/(crm)/layout.tsx`:
  - Persistent amber warning at the top of all pages when an agent/field agent/staff has not checked in today:
    *"⚠️ You are not checked in today! You are currently offline — new customer leads and site visits will not be assigned to you until you check in."*
  - Instant 1-tap **"Check in now"** button right inside the banner.
  - When working, displays active shift tracker (*"Shift active · Checked in at HH:MM PKT"*) with break toggle and confirmed check out.

## Cloudinary New Account Migration & Image Migration
- Configured new Cloudinary credentials (`CLOUDINARY_CLOUD_NAME_NEW`, `CLOUDINARY_API_KEY_NEW`, `CLOUDINARY_API_SECRET_NEW`) in `.env` (CRM) and `.env.local` (Website).
- Updated `src/lib/env.ts`, `src/server/services/cloudinary.ts`, `src/server/services/admin.ts`, and `app/lib/cloudinary.js`.
- Migrated all **36 unique images** across `brands` (5), `products` (30), and `teammembers` (1) from the old Cloudinary account (`dmstryfl9`) to the new Cloudinary account (`ctrhzh2q`).
- Verified in database: 0 old Cloudinary links remaining; all 36 images updated and pointing to `ctrhzh2q`.

## High-Efficiency Image Compression in Both Projects
- **Website Client**: Added canvas WebP compression (max 1920px, 85% quality) in `app/components/ImageUpload.jsx`, shrinking 10MB raw photos to ~180KB–250KB before upload.
- **Website Cloudinary**: Added `quality: 'auto:good'`, `fetch_format: 'auto'`, and `max_width: 1920` transformation in `app/lib/cloudinary.js`.
- **CRM Phone**: Enhanced `compressImage` in `src/components/crm/contact-actions.tsx` to 1600px with WebP/JPEG 0.82 for call/WhatsApp proof screenshots, keeping file sizes at ~120KB–180KB while preserving sharp text and timestamps.

## Testing & Verification
- `npm run typecheck`: Passed with 0 errors.
- `npm run lint`: Passed with 0 errors across `src/**`.
- `npm run test`: 26 test files / 325 tests passed.
