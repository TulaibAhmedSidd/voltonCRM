# 2026-10-16 — done

## Global Notification Switch & Muting in Database
- **Requested Goal**: Turn off notifications for everything via a DB setting flag (no deletion of notification functionality, keeping all models, pipelines, and push mechanics intact).
- **Schema & Enum Registration**:
  - Registered `'notifications'` in `SETTING_KEYS` in `src/domain/constants.ts`.
  - Added `NotificationSettings` interface (`{ enabled: boolean }`) and default `{ enabled: true }` in `src/server/services/settings.ts`.
  - Added fast in-memory caching with 5-second TTL in `src/server/services/settings.ts` so notification checks impose zero DB overhead during batch jobs, invalidating on `setSetting`.
- **Short-Circuited Notification Dispatchers**:
  - `notify(...)` in `src/server/services/common.ts`: Checks `getSetting('notifications')` and exits immediately before creating `Notification` documents or dispatching push notifications when `enabled === false`.
  - `sendPush(...)` in `src/server/services/push.ts`: Checks `getSetting('notifications')` and skips web-push delivery when `enabled === false`.
- **Database Setting Applied**:
  - Set `{ key: 'notifications', value: { enabled: false } }` in the active MongoDB `settings` collection. All notifications and push alerts are now completely muted.
- **Admin & Manager Settings UI**:
  - Added **System notifications** card to `src/app/(crm)/settings/page.tsx` accessible to both Admins, Super Admins, and Managers.
  - Displays live status badge (`Active` or `Muted`).
  - Provides a master switch form with toggle to re-enable or mute notifications at any time.
  - Added `saveNotificationSettingsAction` in `src/server/actions.ts` with role guard (`requireRole('admin', 'manager')`) and audit logging to `AuditLog`.

## Lead Deduplication & Excel Import Verification
- Cleaned duplicate lead records in `volton_crm` database (59 unique leads preserved; duplicates cleanly removed).
- Verified Excel/CSV import tab and column auto-detection in `src/server/services/sheet.ts` and `src/components/crm/sheet-sources.tsx`.

## Verification & Tests
- `npm run typecheck`: Passed with 0 errors.
- `npm run lint`: Passed with 0 errors.
- Added `tests/unit/notifications.test.ts` verifying enum and schema registration.
- Added test in `tests/db/push.test.ts` verifying that setting `notifications.enabled = false` completely silences in-app notification insertion and push delivery. All 3 tests in `tests/db/push.test.ts` passed.
