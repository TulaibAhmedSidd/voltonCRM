---
trigger: always_on
description: Volt On CRM coding standard and performance rules — apply to every code change.
---

# Coding standard and performance (always)

Full guide: `docs/ai/coding-standards.md`. Project rules: `AGENTS.md`.

**Database**
- `await connectDb()` only; never open new connections.
- Reads: `.lean()` + `.select(only needed fields)` + `.limit()` (pages 20–25, dropdowns ≤ 200).
- Every filter + sort used by a list has a `schema.index(...)` (and a row in `docs/ai/schema.md`).
- No query inside a loop over rows — one `$in` query, then a `Map`.
- Independent awaits in `Promise.all`. Atomic `updateOne`/upsert instead of find → save.
- No files, base64 or PDFs in Mongo (Atlas M0 512 MB) — Cloudinary / built on demand.

**Server**
- Scope first: `{ $and: [scope, filter] }`; load records through `src/server/auth/guards.ts`.
- Side effects (push, WhatsApp, webhooks) after the response with `after()` or after commit; they never throw.
- Per-user routes: `dynamic = 'force-dynamic'` + `Cache-Control: private, no-store`. No `'use cache'` (cacheComponents is off).
- Rate-limit expensive actions with `hit()`.

**Browser**
- Server Components by default; `'use client'` only on small leaves.
- Send view models with display fields only; load big data (quotation input, extra) when one row is opened.
- Polling only through `AutoRefresh` / `usePollInterval` (≥ 30 s). Pending state on every waiting button; no double taps.
- No new npm dependency without asking. Icons from `lucide-react` only.

**Standard**
- TypeScript strict, no `any` / `@ts-ignore`; Zod at every boundary; enums only from `src/domain/constants.ts`.
- kebab-case files, PascalCase components, camelCase functions, actions end in `Action`.
- Match the file's style (2 spaces, single quotes, no semicolons) and line endings; don't reformat untouched lines.
- One plain-English JSDoc line on every export (what + why); no commented-out code.
- Users see `UserError('plain words')`; never log phones, CNICs, message text or secrets.
- Tests for every service (`tests/db`, in-memory Mongo) — never against the production database.
- Done = `npm run check` passes, UI checked at 390 px and 1280 px, docs updated.
