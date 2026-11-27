# Security & Privacy

## 1. Data location

| Mode | Where data lives | Leaves the device? |
| --- | --- | --- |
| Guest | Browser IndexedDB `spendscope_guest` | **No** |
| Signed in | IndexedDB `spendscope_user_<id>` **and** Supabase Postgres (RLS-protected) | Yes — to your Supabase project only |

Preferences that never leave the device: `app_lock` (PIN hash, salt, lockout state, passkey id),
`sync_meta`, `reminder_meta`, `guest_migration_*`. Only `appearance` (light/dark + accent) syncs.

## 2. Authentication

- Supabase Auth, email + password. Minimum **12 characters** (client check + `supabase/config.toml`
  `minimum_password_length = 12`). Error messages mapped in `authService.getAuthErrorMessage`.
- Only the **publishable (anon-level) key** is used in the browser:
  `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (`NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a legacy fallback). Never put a service-role key in
  this repo or in `NEXT_PUBLIC_*` variables.
- Session is persisted by supabase-js itself (`persistSession`, `autoRefreshToken`,
  `detectSessionInUrl`). The Redux store deliberately does **not** persist auth; legacy `token` /
  `use_role` cookies are deleted on boot.
- Re-authentication for destructive actions: Reset Data asks for the account password
  (`verifyUserPassword`) when signed in, or the word `RESET` as a guest.

## 3. Database security (RLS)

- RLS enabled on all 8 tables; `anon` role has **no privileges**; `authenticated` has CRUD, filtered by
  `owner_id = (select auth.uid())`.
- Child inserts/updates verify parents belong to the same user (e.g., a transaction's account,
  category and counterparty account).
- Functions use `set search_path = ''`; `handle_new_user` is `security definer` and execute is revoked
  from `public`, `anon`, `authenticated`.
- Client queries also add `.eq("owner_id", ownerId)` as defense in depth.
- Use the Supabase advisors (security + performance) after any schema change.

## 4. App Lock (device-local)

Implemented in `src/lib/webSecurity.js` and `components/shared/AppLockGate.jsx`.

- 4-digit PIN → **PBKDF2-SHA256**, 60 000 iterations, random 16-byte salt (WebCrypto).
- **5 wrong attempts → 4-minute lockout**; countdown persisted so reloads don't reset it.
- Optional WebAuthn passkey (platform authenticator) for convenience. **No server verification** — it's
  a user-presence gate for the local UI, not strong authentication of data at rest.
- Re-locks after 60 s hidden; `spendscope:lock-now` locks immediately.
- ⚠️ **Limits:** it is a UI privacy gate. IndexedDB contents are *not encrypted*; someone with browser
  profile access can read them. Say so in any user-facing claims.
- The lock is never written to the sync outbox (unit-tested) and there are no lock columns in Postgres.

## 5. Input safety

- **CSV export** neutralizes formula injection and follows RFC-4180 escaping (`lib/csvExport.js`).
- **Expression parser** (`lib/expressionParser.js`) never uses `eval`/`Function`.
- PDF text is sanitized to WinAnsi before drawing.
- Loan/account/profile inputs are validated in services (bounds mirror DB CHECK constraints).
- React escapes output by default; there is no `dangerouslySetInnerHTML` in the app (verify with grep
  when changing).

## 6. Third-party network calls

| Call | Why | Notes |
| --- | --- | --- |
| Supabase (project URL) | Auth + sync | Only when configured and signed in |
| `https://open.er-api.com/v6/latest/USD` | Currency Converter live rates | Falls back to bundled rates; no user data sent |
| Google Fonts | `next/font/google` | Fonts are downloaded at build time and self-hosted by Next |
| Vercel hosting | Serving the app | |

**Receipt OCR makes no third-party requests** — Tesseract worker, WASM and English language data are
served from `public/tesseract/`; the Playwright test asserts zero external requests. Voice entry uses
the browser's Web Speech API; in Chrome this may send audio to the browser vendor's speech service
(outside the app's control).

## 7. Operational guidance

- Keep `.env.local` out of git (`.gitignore` covers `.env*` except `.env.example`).
- The Supabase `project_id` in `supabase/config.toml` is not a secret; keys are.
- Never run destructive SQL against the shared remote project without explicit approval — the same
  tables are used by the Android app and its users.
- Deleting data through the web issues **hard deletes** to Supabase (Android may soft-delete via
  `deleted_at`); the web pull ignores rows with `deleted_at` set.
- Review `public/google…html` and `sitemap.xml` domain if the production domain changes.
