# SpendScope — Project Documentation

> **Start here.** This folder is the single source of truth for how SpendScope is built.
> It is written so that a human returning after years, or an AI/IDE assistant with no prior
> context, can understand the whole project quickly.
>
> Last verified against the code: **2026-11-27** (app version `0.2.0`, Next.js 15.5, React 19).

## What SpendScope is (30-second version)

SpendScope is a **calm, editorial-styled expense & budget tracker** that runs as a Next.js web app
and is the **web companion to the Android and iOS apps** (the Android source is the sibling folder
`../spend_scope_android`, never modified from this repo).

- **Guest-first:** works instantly with no sign-in; data lives in the browser (IndexedDB).
- **Optional cloud sync:** sign in (Supabase Auth) and the same local data is backed up/synced to
  Supabase Postgres. The cloud database is **shared with the Android/iOS apps and owned by the mobile
  team**; the web adapts to it through a mapping layer (`src/lib/remoteSchema.js`).
- **Features:** multi-account tracking, transactions (keypad/calculator entry, voice entry, receipt
  OCR), budgets, Spend Buckets (savings goals), categories, analytics charts, CSV/PDF export,
  24 financial calculators, reminders, PIN/passkey app lock, light/dark themes with accent colors.

## Documentation map

| File | Read it when you need to… |
| --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Understand the layers, request/data flow, folder layout, state management, how pieces connect |
| [DATA_AND_SYNC.md](./DATA_AND_SYNC.md) | Touch the database, IndexedDB stores, Supabase schema, the offline-first sync engine, guest→cloud merge |
| [FEATURES.md](./FEATURES.md) | Find what every page/feature does, which files implement it, and its business rules |
| [CALCULATORS.md](./CALCULATORS.md) | Work on any of the 24 calculators or `calculatorEngine.js` |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Change colors, theme, fonts, loaders, 404, or any UI convention |
| [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md) | Review auth, RLS, App Lock, what leaves the device, third-party calls |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Set up, run, test, build, deploy; env vars; common commands; troubleshooting |
| [MOBILE_SYNC_CONVENTIONS.md](./MOBILE_SYNC_CONVENTIONS.md) | Share with the Android/iOS devs: the exact conventions the web uses on the shared database, gaps, and optional additive proposals |
| [HISTORY_AND_DECISIONS.md](./HISTORY_AND_DECISIONS.md) | Learn *why* things are the way they are, past audits/fixes, known issues & tech debt |

## The 10 rules you must not break

1. **Never modify the Android project** (`../spend_scope_android`). Web must stay compatible with it.
2. **The Supabase schema is shared with the mobile apps — the web adapts to it, never the reverse.**
   Cloud column/table knowledge lives only in `src/lib/remoteSchema.js`. Any database change must be
   additive and agreed with the Android/iOS developers. See
   [DATA_AND_SYNC.md](./DATA_AND_SYNC.md#3-cloud-schema-supabase-postgres-shared-with-android--ios).
3. **All data access goes through `src/services/*` → `src/lib/localDb.js`.** UI never talks to
   Supabase tables directly. Local write first, sync later (outbox pattern).
4. **Money is aggregated in integer minor units** (`Math.round(x * 100)`), then divided back. Never
   sum floats directly. Zero-decimal currencies (JPY/KRW/VND) are handled in formatters.
5. **Account transfers are neutral.** They are two rows (expense + income) sharing a
   `transfer_group_id` and must be excluded from income/expense totals everywhere
   (dashboard, analytics, CSV, PDF).
6. **Dates:** locally `occurred_at` is *device-local midnight converted to UTC ISO* (or the real
   timestamp for mobile-created rows) and grouped back by local calendar date
   (`src/lib/dateUtils.js`). Remotely it maps to `transactions.created_at`. Don't use raw
   `toISOString().slice(0,10)`.
7. **App Lock / PIN / passkey never leave the device.** The `app_lock` preference is never queued
   to the sync outbox and there are no lock columns in the cloud DB.
8. **No default-data seeding on the server.** Defaults (1 "Default" account + 21 categories) are
   seeded client-side **only after a clean pull** so mobile-created data never collides.
9. **Do not mutate the remote Supabase project** (`supabase/config.toml` → `project_id`) without
   an explicit decision. Web deletes are **soft deletes** (`deleted_at`), never hard deletes.
10. **Keep the theme token system.** Use CSS variables (`var(--home-*)`) — don't hard-code colors.

## Quick commands

```bash
npm install
npm run dev          # http://localhost:3000 (Turbopack)
npm test             # Vitest unit tests (98 tests, 13 files)
npm run lint         # next lint (expected: 0 warnings)
npm run build        # production build
npm run test:e2e     # Playwright (builds must exist; runs on port 3005, 3 viewports)
```

Dev-only visual helpers: `/loader-preview` (all loader variants) and the 404 page at any bad URL.

## Keeping these docs alive

When you change behavior, update the matching doc in the same commit. If you add a feature, add it
to [FEATURES.md](./FEATURES.md) and (if it touches data) [DATA_AND_SYNC.md](./DATA_AND_SYNC.md).
A Cursor rule (`.cursor/rules/spendscope-docs.mdc`) tells AI assistants to read this folder first.
