# Development Guide

## 1. Prerequisites

- **Node.js** — developed on Node **22.x** (npm 10). Use a current LTS; the toolchain (Next 15.5,
  Vite 8, Vitest 5, Playwright 1.65) is recent.
- **Google Chrome** (optional): Playwright uses the system Chrome at
  `/Applications/Google Chrome.app/...` when present and `CI` is unset; otherwise install Playwright's
  Chromium: `npx playwright install chromium`.
- Optional: Supabase CLI for migrations (`supabase/config.toml` is already linked to a project).

## 2. Setup

```bash
cd spendScope
npm install
cp .env.example .env.local      # then fill in values
npm run dev                      # http://localhost:3000
```

### Environment variables

| Variable | Required | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | for cloud sync | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | for cloud sync | Publishable/anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY` also accepted) |
| `NEXT_PUBLIC_ENABLE_LOADER_PREVIEW` | no | `1` exposes `/loader-preview` in production builds |

If the Supabase variables are missing (or contain `placeholder`), `isSupabaseConfigured` is false and the
app runs **guest-only** — no errors. `next.config.mjs` falls back to a placeholder host for image config.
`next.config.mjs` also lists `allowedDevOrigins` (`127.0.0.1`, `192.168.1.4`) — update the LAN IP when
testing from a phone on your network.

## 3. Scripts (`package.json`)

| Script | Command | Notes |
| --- | --- | --- |
| `npm run dev` | `next dev --turbopack` | Dev server |
| `npm run build` | `next build` | Production build (prints route/bundle sizes) |
| `npm start` | `next start` | Serve the build |
| `npm run lint` | `next lint` | ESLint flat config: `next/core-web-vitals`; target **0 warnings** |
| `npm test` | `vitest run` | Unit tests |
| `npm run test:watch` | `vitest` | Watch mode |
| `npm run test:e2e` | `playwright test` | E2E; needs a production build first |

## 4. Testing

### Unit (`tests/unit/*.test.js`, Vitest + jsdom + `fake-indexeddb`)

| File | Covers |
| --- | --- |
| `calculatorEngine.test.js` | All 24 calculators + audit edge cases/reconciliation |
| `budgetMath.test.js` | Budget scaling, summary, transfers excluded, Budget Mode |
| `dateUtils.test.js` | Local-midnight conversions, period bounds |
| `expressionParser.test.js` | Precedence, unary minus, errors |
| `localDb.test.js` | Per-owner isolation, idempotent seeding (1 + 21), outbox, `app_lock` never queued |
| `syncEngine.test.js` | Shared-schema push/pull: ordering, soft deletes, local-only transfers, pull-before-seed, Auth-metadata settings, satellite reuse |
| `accountsAndBuckets.test.js` | Account rules, bucket totals/reorder |
| `categoriesAndSettings.test.js` | Category delete → Other, transfers, 4 reset modes, PIN/ICS |
| `loanProfilesService.test.js` | Loan validation/sync |
| `authService.test.js` | 12-char policy, profile stored in Auth `user_metadata` |
| `remoteSchema.test.js` | Shared-DB mapping layer: icons/avatars, kind/date derivation, satellites, soft deletes, bucket totals, loans |
| `exports.test.js` | CSV escaping/injection, PDF generation, totals reconcile |
| `phase5Advanced.test.js` | Receipt OCR parser, voice parser, PIN lockout, reminders, guest→cloud merge |

Alias `@` → `src` (vitest config). Setup file loads `fake-indexeddb/auto` and jest-dom matchers.
State at 2026-11-27: **98 tests passing** (13 files).

### End-to-end (`tests/e2e/*.spec.mjs`, Playwright)

| Spec | Scenario |
| --- | --- |
| `phase1-navigation` | Landing, "Continue as Guest", all routes, no horizontal overflow |
| `phase2-core-finance` | Account switching, keypad expressions, filtering, analytics, bucket CRUD |
| `phase3-categories-settings` | Category CRUD, 3-mode color picker, reassign on delete, transfers, Budget Mode, Reset |
| `phase4-calculators` | Hub, 4 loan tools, currency propagation, layouts |
| `phase5-advanced-sync` | Self-hosted OCR (0 third-party requests), PIN `0000` + lockout, reminders, backup preview |
| `phase6-light-dark-matrix` | Every primary route in Light & Dark: no overflow/page errors/console errors |

Config (`playwright.config.mjs`): `baseURL http://127.0.0.1:3005`; runs **`npx next start -p 3005 -H 127.0.0.1`**
(`reuseExistingServer: false`, so **run `npm run build` first** and make sure port 3005 is free);
projects `desktop 1440×900`, `tablet 768×1024`, `mobile 375×812`; `fullyParallel`, CI retries = 1.
State at 2026-11-27: **18/18 passing** (one occasionally-flaky timing case in phase3 was observed
under heavy parallel load; re-running passed).

### Definition of done for a change
`npm run lint` (0 warnings) → `npm test` → `npm run build` → relevant e2e spec(s). Add/adjust tests
for any calculation, sync or money-handling change.

## 5. Working with the database

- The database is **shared with the Android/iOS apps and owned by the mobile team**. This repo has no
  migrations (`supabase/migrations/README.md`). Never run `supabase db push`/reset from here.
- Cloud knowledge lives in `src/lib/remoteSchema.js`; extend it (and `tests/unit/remoteSchema.test.js`)
  instead of sprinkling column names around. Read the mobile-compatibility rules
  ([DATA_AND_SYNC.md §3.4](./DATA_AND_SYNC.md#34-mobile-compatibility-rules)).
- IndexedDB changes need `DB_VERSION` bump + `upgrade` logic in `src/lib/localDb.js`.
- If you add a synced entity: update `ENTITY_STORES`, `UPSERT_ORDER` / `DELETE_ORDER`,
  `remoteSchema.js` (`buildRemoteWrites`, `buildRemoteDeletes`, `mapRemoteSnapshot`), `pullRemote`,
  guest merge, reset/delete services and tests. A new cloud table/column needs mobile-team agreement.

## 6. Deployment

- Hosted on **Vercel** (`https://spend-scope-mu.vercel.app`). Set the two Supabase env vars in the Vercel
  project. Git remote: `origin → github.com/karanSFS/spendScope`.
- In Supabase Auth settings add the production URL to **Site URL / Redirect URLs** (local config only
  lists `localhost:3000`).
- After deploy: smoke test sign-up, sign-in, add a transaction, sync, sign-out (keep + wipe), App Lock.

## 7. Conventions

- Language: JavaScript (JSX). Path alias `@/` → `src/`.
- Client components start with `"use client"`; services/libs are framework-agnostic (they run in
  jsdom tests).
- Keep money math in minor units; format via `formatMoney`.
- Don't call Supabase from components; go through services/hooks.
- Commit messages in the repo are imperative sentences ("Add animations and enhance 404 page design").
- Update `docs/` with behavior changes.

## 8. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| App shows only guest mode, never syncs | Supabase env vars missing/placeholder → check `.env.local`, restart dev server |
| E2E fails to start | Port 3005 busy, or no production build (`npm run build`) |
| E2E "browser not found" | No system Chrome → `npx playwright install chromium` |
| Theme doesn't change when toggling `dark` class manually | Tokens are inline vars set from Redux — use the theme toggle/actions |
| Sync stuck "Sync retry" | Open the banner message/`lastError`; RLS or constraint violation (check payload vs schema); click Retry |
| Duplicate default account/categories after mobile-app data exists | Seeding happened before pull — seeding must stay *after* a successful `pullRemote` |
| Numbers off by 0.01 | Something summed floats; aggregate with `Math.round(x*100)` |
| Transaction on wrong day | Used UTC date string instead of `dateUtils` local-midnight helpers |
| Wipe all local data in dev | DevTools → Application → IndexedDB → delete `spendscope_*`; clear localStorage key `persist:root` |
| Charts/OCR blank on first load | Lazy chunks still loading (`AppLoader` shows) — check console/network |
