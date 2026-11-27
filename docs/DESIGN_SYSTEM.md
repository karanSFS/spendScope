# Design System

Visual language: **"Calm Editorial"** — warm parchment (light) and espresso (dark), terracotta
accent, serif display headings, rounded cards. It mirrors the Android app's palette.

## 1. Fonts (`src/app/layout.jsx`)

| Variable | Font | Use |
| --- | --- | --- |
| `--font-display` | **Caprasimo** (400) | Headings, logo wordmark — Tailwind `font-display` |
| `--font-sans` | **Figtree** (400–700) | Body/UI (default on `<body>`) |
| `--font-mono` | **JetBrains Mono** | Numbers — utility class `font-mono-num` (tabular figures) |

## 2. Color tokens

Defined three times and kept in sync:

1. `src/app/globals.css` — `:root` (light) and `html.dark` (dark) CSS variables (static defaults, no flash).
2. `src/utils/theme.js` — `EDITORIAL_LIGHT`, `EDITORIAL_DARK`, `buildTheme(mode, customAccent)`.
3. `src/app/provider.jsx` — `CSS_TOKEN_MAP` writes the *runtime* tokens to `<html style>`.

Use only these CSS variables in components (`bg-[var(--home-card)]`, etc.):

| Token | Light | Dark | Meaning |
| --- | --- | --- | --- |
| `--home-background` | `#F5EDDE` | `#1A1714` | Page background |
| `--home-card` | `#FBF7EF` | `#24201C` | Cards, sidebar, modals |
| `--home-border` | `#E1DACD` | `#3A342D` | Borders/dividers |
| `--home-track` | `#E5DECE` | `#332D27` | Bars, chips, hover fills |
| `--home-accent` | `#C88856` | `#D99A6C` | Primary/accent (user-customizable) |
| `--home-on-accent` | `#FFFDFA` | `#FFFDFA` | Text on accent |
| `--home-income` / `-soft` | `#6C7555` / `#EEF3DF` | `#A3AE8B` / `#2A2E22` | Income / positive |
| `--home-expense` | `#966031` | `#D08A55` | Expense |
| `--home-text` / `-secondary` / `-muted` | `#2B2827` / `#68635D` / `#938C7F` | `#F2EADB` / `#C2B9AB` / `#9A9286` | Text levels |
| `--home-destructive` | `#FB4A49` | `#FF8A86` | Errors/delete |
| `--add-sheet-bg`, `--add-key-bg`, `--add-operator-key-bg` | | | Transaction sheet & keypad |
| `--home-category-1…6` | sage/terracotta/brown palette | lighter variants | Chart/breakdown colors (`HOME_CATEGORY_PALETTE`) |

Tailwind aliases (`tailwind.config.mjs`): `bg-background`, `text-foreground`, `bg-card`, `border-border`,
`bg-track`, `bg-primary`, `text-on-primary`, `text-income`, `text-expense`, `text-muted`, etc.
Custom radii: `rounded-card` (22px), `rounded-sheet` (28px), `rounded-pill`. Extra breakpoints include
`xs: 480px` plus several legacy `costomNNN` ones (leftovers from the old UI; currently not referenced
anywhere in `src/`, safe to remove).

> ⚠️ **How theming actually switches:** `ReduxThemeBridge` sets the tokens as **inline CSS variables on
> `<html>`**, which override the `html.dark` stylesheet values. So changing theme must go through
> Redux (`dispatch(changeTheme("dark"|"light"))`, `changePrimaryColor`, `resetThemeAccent`,
> `applyPreferencesTheme`) — merely toggling the `dark` class in DevTools won't recolor the app.

## 3. Accent color

`ACCENT_PRESETS` (28 swatches, default Terracotta `#C88856`, dark default Amber `#D99A6C`) +
custom picker. UI: `components/ThemeChange.jsx` (top-bar palette button) and Settings → Accent.
Saved through `preferencesService.saveAppearancePreference` (synced for signed-in users in Auth
`user_metadata.spendscope_web.appearance`: `appearance_mode` / `accent_color`).

## 4. Layout & components

- **App shell** (`components/shared/AppShell.jsx`): sidebar ≥ `lg`, bottom nav < `lg`; content max
  width 1280px, `px-3 sm:px-6 lg:px-8`.
- Cards: rounded 22–28px, 1px `--home-border`, `--home-card` background. Pills for status chips.
- Shared building blocks (`components/shared/`): `ConfirmDialog`, `EmptyStateCard`, `PeriodFilterBar`,
  `ProportionalBar`, `CategoryIcon` (icon-in-badge from `public/icons` using `icon_key`), `AvatarBadge`,
  `IconPickerModal`, `ColorPickerModal`, `AccountSwitcherModal`, `AuthSplitShell`.
- Modals use `role="dialog"`, `aria-modal`, backdrop `bg-black/50 backdrop-blur-[2px]`, z-index up to 9999.
- Icons: Heroicons v2 (`react-icons/hi2`). Category/bucket artwork: SVG files in `public/icons/*`
  (keys listed in `ICON_GROUPS` / `ALL_ICON_KEYS` / `BUCKET_PRESET_ICONS` in `lib/defaultSeeds.js`).
- Utilities in `globals.css`: `.font-display`, `.font-mono-num`, `.tabular-nums`, `.custom-scrollbar`,
  `.ss-*` loader animations.

## 5. Loaders and 404

### `components/shared/AppLoader.jsx`
Pure markup/CSS (no hooks or Redux) so it is safe inside `PersistGate`, Suspense and `next/dynamic`
fallbacks. Props: `label`, `variant`.

| Variant | Used for | Where |
| --- | --- | --- |
| `page` (default; `data-testid="app-loader"`) | Whole-screen: app hydration, device security check | `provider.jsx` (PersistGate), `AppLockGate` |
| `section` (`min-h-[50vh]`, `data-testid="app-loader-inline"`, `role="status"`) | Route/panel fallbacks | `(private)/loading.jsx`, calculators hub/tools, settings Suspense, bucket detail |
| `compact` | Lists, charts, loan profiles | transactions list, analytics charts, `LoanProfileCalculator` |

Animation: wallet logo in a card, two pulsing rings, a conic-gradient spinner arc, bouncing coin dots,
progress bar (page variant), fade-up text. CSS in `globals.css` (`ss-spin`, `ss-float`,
`ss-pulse-ring`, `ss-coin-bounce`, `ss-progress`, `ss-fade-up`) with
`@media (prefers-reduced-motion: reduce)` disabling them. `src/app/loading.jsx` (root) intentionally returns `null`.

### `/loader-preview` (dev tool)
`app/loader-preview/page.jsx` (server wrapper) + `LoaderPreviewClient.jsx`. Shows the full-screen loader
for 3/5/10 s (click or `Esc` closes), static `section` and `compact` samples, a dark/light toggle and a
link to the 404 page. In production it calls `notFound()` unless `NEXT_PUBLIC_ENABLE_LOADER_PREVIEW=1`.
(Note: it renders the 404 UI with HTTP 200 in prod builds, and is `noindex`.)

### 404 — `app/not-found.jsx`
Server component with metadata. Giant "404" with a floating accent "0", headline
"This page wandered off the budget", floating coins, a "lost receipt" card (Status: Not found), and
buttons **Back to Home** (`/`) and **Open Dashboard** (`/dashboard`). `data-testid="not-found-page"`.

## 6. Responsive rules

Three Playwright viewports are the supported baseline: **desktop 1440×900, tablet 768×1024,
mobile 375×812**. `phase6-light-dark-matrix` asserts no horizontal overflow, no page errors and no
console errors on primary routes in both themes. Keep touch targets ≥ 44px on mobile
(bottom nav items use `min-h-[44px]`).

## 7. Conventions for new UI

- Colors only via CSS variables; no hard-coded hex except category colors/data colors.
- Use `font-display` for page titles (`text-2xl sm:text-3xl`), `font-mono-num` for money.
- Use `formatMoney(amount, currencyCode)` for all amounts; never `toFixed` directly.
- Provide empty, loading (use `AppLoader`) and error states; add `aria-label`s on icon buttons.
- Respect `prefers-reduced-motion` for new animations.
