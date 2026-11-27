# SpendScope

A calm, editorial-styled **expense & budget tracker** built with Next.js — the web companion to the
SpendScope Android app. Works instantly in **Guest mode** (data stays in your browser) and can
optionally **sync with Supabase** so Web and Android share the same data.

**Highlights:** multi-account tracking • keypad/voice/receipt-OCR transaction entry • budgets •
Spend Buckets • categories • analytics • CSV/PDF export • 24 financial calculators • reminders •
PIN/passkey App Lock • light/dark themes with accent colors.

## 📚 Documentation

Everything about the project lives in [`docs/`](./docs/README.md):

| Doc | Contents |
| --- | --- |
| [docs/README.md](./docs/README.md) | Overview, rules, map of the docs |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Stack, layers, folders, routing, state, boot flow |
| [docs/DATA_AND_SYNC.md](./docs/DATA_AND_SYNC.md) | IndexedDB + Supabase schema, sync engine, guest→cloud merge |
| [docs/FEATURES.md](./docs/FEATURES.md) | Every feature, its files and rules |
| [docs/CALCULATORS.md](./docs/CALCULATORS.md) | The 24 calculators and the engine |
| [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) | Theme tokens, fonts, loaders, 404 |
| [docs/SECURITY_AND_PRIVACY.md](./docs/SECURITY_AND_PRIVACY.md) | Auth, RLS, App Lock, third-party calls |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | Setup, scripts, tests, deploy, troubleshooting |
| [docs/HISTORY_AND_DECISIONS.md](./docs/HISTORY_AND_DECISIONS.md) | Why things are the way they are, audits, tech debt |

## 🚀 Quick start

```bash
npm install
cp .env.example .env.local   # add Supabase URL + publishable key (optional: guest mode works without)
npm run dev                  # http://localhost:3000
```

```bash
npm test          # unit tests (Vitest)
npm run lint      # ESLint
npm run build     # production build
npm run test:e2e  # Playwright (run `npm run build` first)
```
