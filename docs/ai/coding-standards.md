# Coding standards and performance

Rules for every AI tool and person writing code here. `AGENTS.md` has the short version; this is the detail.
Pattern to copy for each rule: the file named next to it.

The app runs on **free tiers** (Vercel Hobby, Atlas M0 512 MB, Cloudinary free) and busy agents use it **on phones over mobile data**. Every rule below exists because of one of those two facts.

---

## Part A — Performance

### A1. Database (MongoDB + Mongoose)
| Rule | Do | Don't |
|---|---|---|
| One connection | `await connectDb()` (cached per server instance, `src/server/db/connection.ts`) | `mongoose.connect()` / `createConnection()` in a request |
| Reads are lean | `.lean()` on every read you don't `.save()` | Hydrated documents just to read fields |
| Only the fields you show | `.select('name phone status')` | Loading `input`, `extra`, `payload`, arrays you don't use |
| Every list has a limit | `.limit(25)` + `skip` paging; dropdowns ≤ 200 | `Model.find(match)` with no limit in a page or API |
| Indexes match queries | Each list's filter + sort has a `schema.index(...)`; listed in `docs/ai/schema.md` | Sorting/filtering a big collection on an unindexed field |
| No queries in loops | Collect ids → one `{ _id: { $in: ids } }` query → `Map` | `for (const x of rows) await Model.findById(x.id)` |
| Independent awaits run together | `const [a, b] = await Promise.all([...])` (`src/app/(crm)/quotations/page.tsx`) | `await a; await b;` when b doesn't need a |
| Atomic writes | `updateOne({ _id }, { $set, $inc })`, upsert with a unique key (`src/server/services/saved-quotations.ts`) | `find` → change → `save()` when no hooks are needed (slow and racy) |
| Many documents | `insertMany` / `bulkWrite` | One `create()` per row in a loop |
| Counting | `countDocuments(sameMatch)` beside the page query in `Promise.all` | Loading all rows to count them |
| Text search | Escape user input before `new RegExp(...)` (`listCentralQuotations`); search a few indexed fields | Unescaped regex from the client; regex over every field |
| Transactions | `withTransaction` only for multi-document rules that must hold together | Wrapping single-document writes in a transaction |
| Storage (512 MB) | Files → Cloudinary (`storageKey`); TTL indexes on logs/notifications; PDFs built on demand | Binary files, base64 images or generated PDFs in Mongo |

Bounded loops (e.g. ≤ 3 manager candidates in `manager-contact.ts`) may query inside the loop — say why in a comment.

### A2. Server work and requests
- **Scope first, then filter:** `{ $and: [scope, filter] }` — security rule that also keeps queries small.
- **Same data once per request:** wrap per-request lookups in React `cache()` (`requireUser` in `src/server/auth/session.ts`). Don't re-read the session user or the same lead in one request.
- **Don't make the user wait for side effects:** push, WhatsApp, webhook processing and ticks run after the response with `after()` from `next/server` (`src/app/api/webhooks/whatsapp/route.ts`) or after the commit. Side-effect helpers never throw into the main action.
- **Long or repeated work goes to jobs/cron** (`jobs` collection, `/api/cron/tick`), not into a page request. Keep a request to a few seconds.
- **Lazy-load heavy server code** used by one rare action: `const { x } = await import('@/server/services/…')` (Google Drive backup in `src/server/actions.ts`).
- **Rate-limit expensive actions** with `hit(key, max, windowMs)` (`src/server/services/rate-limit.ts`) — quotations, PDFs, uploads, logins.
- **Region:** Vercel functions must run in the same region as the Atlas cluster; every query is a network round trip.

### A3. Caching (Next.js 16)
- CRM pages and APIs show **per-user, live** data: route handlers that return user data set `export const dynamic = 'force-dynamic'` and `Cache-Control: private, no-store`.
- After a mutation call `refresh()` (current page) or `revalidatePath('/path')` — never a full reload.
- Shared, slow-changing outside data (voltonsolar.com catalog) uses a small in-memory cache with a freshness time and a timeout fallback (`src/server/services/website.ts`).
- `'use cache'` / `cacheLife` need `cacheComponents` in `next.config.ts`, which is **off**. Don't add them without asking. Read `node_modules/next/dist/docs/` before any caching change.

### A4. What goes to the browser
- **Server Components by default.** `'use client'` only on the smallest leaf that needs state, effects or browser APIs. Never turn a whole page into a client component.
- **View models, not documents:** map to the plain shapes in `src/domain/view-models.ts` with only the fields the screen shows. Lists never carry big blobs (quotation `input`, `extra`, message bodies) — fetch them when one row is opened (`/api/quotations/saved/[id]`).
- **Props are serialised into the page:** don't pass the same large list to many client components (e.g. one dialog per table row with the full leads list). Pass it once, or fetch on open.
- **Client fetches** only for interactive lookups (pickers, manager number). Share one request per page with a module-level promise (`src/components/crm/quotation-manager-button.tsx`) and ignore stale answers after unmount (`live` flag).
- **Polling:** use `AutoRefresh` / `usePollInterval` (pauses when the tab is hidden or someone is typing). Never add your own `setInterval` that fetches; never poll faster than 30 s.
- **Lists:** paginate on the server (20–25 rows). Mobile shows cards, desktop a table — both from the same rows.
- **`useMemo` only for real work** (e.g. `quotationLines(q)` on every keystroke). React 19 — no blanket `memo`/`useCallback`.
- **Instant feedback:** every button that waits shows pending state within 200 ms (`useTransition`, `SubmitButton`, `disabled={pending}`) and blocks double taps. Open new tabs synchronously in the click, then set their URL.

### A5. Bundle, assets, dependencies
- **No new npm dependency without asking the owner.** Prefer platform APIs (`fetch`, `Intl`, `crypto`, `URL`) and what is already installed.
- Icons: named imports from `lucide-react` only. No icon fonts, no image icons.
- Images: `next/image` with `sizes`; compress photos on the phone (~150 KB) before upload; videos are skipped on the free plan.
- Fonts: the ones already set in the layout; no extra font families.
- Service worker (`public/sw.js`) caches static files only — never pages, API responses or customer data.

### A6. Performance checklist before you commit
- [ ] Every new query: `.lean()`, `.select()`, `.limit()`, and an index for its filter + sort.
- [ ] No `await` of a query inside a loop over rows.
- [ ] Independent awaits in `Promise.all`.
- [ ] Lists send only display fields; big data loads on open.
- [ ] No new polling, no new dependency, no new client page.
- [ ] Side effects after the response / commit.

---

## Part B — Our coding standard

### B1. TypeScript
- `strict` everywhere. No `any`, no `@ts-ignore`/`@ts-expect-error` to hide a problem — use `unknown` and narrow.
- Enum values come only from `src/domain/constants.ts`; use their union types (`Stage`, `Role`, `QuotationStatus`).
- Validate every boundary with Zod (`src/domain/schemas`, `src/domain/quotation.ts`): form data, JSON bodies, query params, webhook payloads. Never trust ids or roles from the client.

### B2. Naming and files
| Thing | Style | Example |
|---|---|---|
| Files and folders | kebab-case | `saved-quotation-picker.tsx` |
| Components, types, interfaces | PascalCase | `SavedQuotationPicker`, `LeadDetail` |
| Functions, variables | camelCase, verb first for functions | `listSavedQuotations`, `managerFor` |
| Server Actions | end with `Action` | `saveQuotationSetupAction` |
| Constants arrays | UPPER_SNAKE `as const` | `QUOTE_TEMPLATES` |
| Mongo fields | camelCase; money integer PKR; dates `Date` (UTC) | `wonValuePkr`, `issuedAt` |

- Where code lives: routes in `src/app`, business logic in `src/server/services/<area>.ts`, pure rules in `src/domain`, helpers in `src/lib`, UI in `src/components/{ui,common,crm}` (layer rules in `docs/ai/architecture.md`).
- Keep files focused: a service per area; split a component when it passes ~300 lines or does two jobs.
- Reuse before you build: check `docs/ai/components.md` and existing services first.

### B3. Style
- 2 spaces, single quotes, no semicolons, trailing commas in multi-line lists. Long lines are fine (~150 chars) when they read clearly.
- There is no Prettier config: **match the file you are editing.** Don't reformat lines you didn't change.
- Keep each file's line endings (the repo uses CRLF checkouts via `core.autocrlf`); never convert a whole file.

### B4. Comments
- One short JSDoc line above every exported function, component and model: **what it does and why**, in plain English (`/** "Send to manager": opens the manager's WhatsApp … */`).
- Inside functions, comment only the non-obvious (a business rule, a race, a free-tier limit). No comments that repeat the code, no commented-out code, no TODOs without an owner.

### B5. Errors and logging
- Messages users see: `throw new UserError('plain words')`. Everything else becomes "Something went wrong".
- Actions return `ActionState` (`{ ok, message }`); wrap bodies with `attempt()` / `errorState()`.
- Never swallow an error silently: `console.error('what failed:', e instanceof Error ? e.message : e)`.
- Never log phone numbers, CNICs, message text, tokens or passwords.

### B6. Words on screen
- Simple English a busy agent understands on a phone ("Send to manager", "Saved as …"). No jargon, no codes.
- Shared UI text goes in `src/i18n/en.ts`; colours only through theme tokens (`docs/ai/design-system.md`).

### B7. Tests
- Pure rules → `tests/unit`; services, routes and actions → `tests/db` (in-memory MongoDB). Copy the setup of a nearby test.
- Test behaviour a user cares about (who can see it, totals, limits), not implementation details.
- Never run tests, seeds or scripts against the production database.

### B8. Git
- Conventional commits: `feat(area): …`, `fix(area): …`, `docs:`, `test:`, `chore:`. Message says what changed for the user.
- Push only to the working branch the owner names; merge to `main` only when the owner says so. Never force-push, never `--no-verify`.

### B9. Definition of done
1. Code follows Parts A and B.
2. Tests added/updated; `npm run check` passes (lint + typecheck + tests + AI check).
3. UI checked at 390 px and 1280 px.
4. Docs updated: `docs/ai/schema.md` (collections/indexes), `docs/ai/components.md` (new components).
5. Progress logged (`daily-progress` skill).
