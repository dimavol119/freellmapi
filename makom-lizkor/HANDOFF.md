# Makom Lizkor — project handoff (updated 2026-11-09)

## Redesign and hardening (2026-11-09, sixth round)

- **New visual identity:** archive-notebook logo (`mobile-source/assets/logo-mark.svg`), warm paper palette with ink text and one terracotta accent (`CLASSIC` in `src/theme.ts`; Halloween still derives from it), Frank Ruhl Libre + Assistant self-hosted in `mobile-source/public/fonts` (OFL licences included, no third-party requests), paper grain via CSS.
- **Original illustrations** drawn for the project (`mobile-source/assets/art/*.svg` sources, PNGs used by the app): hero, seven topic drawings (cards without photos), empty state, sign-in panel, divider. No stock or AI images.
- Glyph icons (✳ ⌕ ▦ ◷ ♧ ⚙) removed; topics shown with colour dots (`TOPIC_COLORS`). Inputs are 16px (stops iPhone zoom on focus). Phone header compacted; desktop no longer shows both sidebar and bottom bar; toast centred.
- **Bug fixed:** all modals were mirrored in Hebrew (they render outside the LTR root); each modal root now sets `direction:'ltr'` like the main view.
- **Download window** (header "הורדה"): install steps per device, Chrome's install prompt when offered, and "download all my data".
- **Errors:** every server error code (25) has its own Hebrew message with ru/en translations; a client test reads the server source and fails if a new code lacks one.
- **Slow connections:** request timeout scales with upload size (20 s + ~40 KB/s, max 4 min) instead of a flat 20 s.
- **Shared addresses (mobile CGNAT, home Wi-Fi):** registration limit per address raised 5→20/hour and auth 30→60/15 min; the per-account failed sign-in limit (10/15 min) is unchanged.
- `public/privacy.html` rewritten in the new look and updated (verification, image shrinking, self-hosted fonts, installed app cache).

Validation: 44 server tests, 52 client tests, both TypeScript checks, web export and server build pass. Playwright at 1366×900, iPhone 13 and Pixel 7: registration/sign-in/device-items flow, email verification flow (email "enabled", outbound blocked, planted code), installable app cache (only shell, fonts, icons; no `/api`, no private text), offline start, download window, privacy page.

## Email verification at registration (2026-11-09, fifth round)

**Deploy step: apply `drizzle/0004_email_verification.sql` to production D1 before (or together with) the new server build.** It adds `accounts.email_verified_at` and the `email_verifications` table and sets existing accounts to 0. Migrations 0000–0003 are unchanged; 0004 and its snapshot were generated with drizzle-kit (plus the UPDATE line).

- `email_verified_at`: NULL = new account waiting for its code; 0 = existed before verification (never blocked, can verify voluntarily in settings); >0 = verified.
- Uses the existing password-reset email config (Brevo free tier); no new secret. Without that config nothing is blocked.
- Registration sends an 8-digit code (30 min, 5 tries, resend 5/hour). Registration succeeds even if sending fails (`verificationSent:false`, code discarded, "send a new code").
- Until verified (and email configured), only `/api/account/verify`, `/verify/send`, `/account/email` (fix a typo, password required, only while unverified), logout and account deletion work; everything else returns 403 `EMAIL_NOT_VERIFIED`.
- Google-created accounts are verified; a completed password reset marks the address verified. Codes are bound to account id and address; changing the address invalidates the old code.
- Session/register/login responses include `emailVerified`, `verificationRequired`.
- Server tests no longer reach the network (`fetch` is blocked by default in `tests/accounts.test.cjs`).

Validation: 43 server tests, 50 client tests, both TypeScript checks, web export and server build pass. Playwright (iPhone 13) against local wrangler with migration 0004 and email "enabled" but outbound mail blocked by this environment (a known code was planted in local D1 to stand in for the email): register with a typo → verification screen, "New" disabled, `/api/memories` 403 → fix the address via suggestion + password → wrong code refused → right code verifies → first item saved → no screen after reload → "✓ verified" in settings. Real email delivery through Brevo was not exercised here.

## Security review (2026-11-12)

Full report: `SECURITY-REPORT.md`. Highlights: no secrets anywhere in code or history; React 19.2.9 (fixes an unauthenticated RCE in React Server Components), next 16.4.6, zod 4, build tools updated, 20 unused template packages removed (`components/ui`, `hooks`); API: security headers, HTTPS-only, GET/POST/PUT only, Fetch-Metadata + JSON-only CSRF checks, real-image byte checks on new uploads (≤ ~7.5 MB each), read rate limit, sliding failed-login window, `POST /api/auth/logout-all`, privacy-safe security event log; site: strict CSP and headers in `public/_headers` (service-worker registration moved to `register-sw.js`). Tests: 53 server, 52 client. Live attacks (XSS, CSRF, clickjacking, IDOR, brute force, file probing) all blocked.

## Owner decision (2026-11-09)

For now: **website only**, used by the owner and friends they send the link to. No native app build or store release; the native base (icons, ids, APP-BUILD.md) stays in the code for later and does not affect the site. Settings now has "Send to friends": the phone share sheet (WhatsApp etc.) or copying the link on desktop, explaining that each friend gets their own private account.

## App base (2026-11-09, third round)

The owner has no native app yet. Zero-cost path:
- **Installable web app (PWA), works now on iPhone, Galaxy and desktop:** `mobile-source/public/` holds `manifest.webmanifest`, `sw.js`, icons and the `index.html` template (Expo export copies them; lang=he, dir=rtl, theme colour, Apple meta tags). Settings has an "Install as an app" box with per-platform steps and Chrome's install prompt when offered.
- **Service worker rules:** never handles `/api/` or non-GET or cross-origin requests (a client test enforces this); network-first for pages so a release applies at once; stores the start page together with exactly the scripts it references (from the same response) and drops older scripts. Bug found during QA and fixed: the first version could cache the page without its script, giving a black offline screen.
- **Offline:** the app shell opens with "No internet connection" (no private data is shown or cached) and reloads the account automatically when the connection returns.
- **Native base:** brand icon, adaptive icon, splash, `com.makomlizkor.app` for Android and iOS, Russian added to iOS localizations. Android and iOS bundles compile (`expo export --platform android --platform ios`); expo-doctor 18/20 (the 2 failures need exp.host, unreachable here). See `mobile-source/APP-BUILD.md` for a free APK via EAS (owner's own free Expo account). Google Play ($25) and App Store ($99/yr) are not used, per the zero-spend rule.

Validation: 37 server tests, 49 client tests, both TypeScript checks, web/native export and server build pass. Playwright (Pixel 7, iPhone 13) against local wrangler: manifest and service worker active; cache holds only shell, icons and the current script; no `/api` entry and no private text in any cache; offline start shows the message without data; reconnect restores the account items.

## Registration and sign-in update (2026-11-09, second round)

- **New passwords must not be trivially guessable** (`weakPassword` in `lib/account-api.ts`, same rule in `strongPasswordError` in `auth-validation.ts`; a client test compares both): one repeated pattern (fewer than 5 distinct characters), keyboard/digit/alphabet runs, padding with spaces, or the email itself → `WEAK_PASSWORD`. Applies to registration and password reset only; existing users still sign in with old passwords. Checked before the hourly registration limit, so weak attempts do not lock anyone out.
- **Per-account limit on failed sign-ins:** 10 per 15 minutes per email (in addition to the per-IP limit), even across changing IPs. Successful sign-ins are not counted; other accounts are unaffected.
- **Sliding session renewal:** `GET /api/auth/session` extends a session with less than 15 days left back to 30 days (same token, same row). An expired session is never revived.
- **Signing in over another session in the same browser deletes the previous session row.**
- **Email typo suggestion at registration** (`emailSuggestion`): e.g. `gmial.com` → `gmail.com`, with a one-tap fix. There is no email verification, so a mistyped address could never receive a reset code.
- **Phone keyboards:** Next moves between fields; Go/Enter submits registration, sign-in and reset.
- **Sign-in tab by default** on a device that has signed in before (`@makom-lizkor/signed-in-before`, no personal data).
- **Items saved on the device before registering are offered to the account** with a banner at the top (add / not now). Additive; per-user "handled" ids are stored on the device (`@makom-lizkor/device-items-handled/<userId>`), so a second person on the same device is asked separately and nothing moves between accounts automatically.
- **Native reminder status:** the account never stored which reminders are scheduled on a device, so every launch on a phone showed "notification not set". The app now reads the device's scheduled notifications (`scheduledReminderIds`) on load and background refresh.

Validation: 37 server tests, 48 client tests, both TypeScript checks, Expo web export and server build pass. Browser QA with Playwright emulating Pixel 7 and iPhone 13 against local wrangler D1/R2 with synthetic accounts (local state deleted): guest item → register (typo suggestion fixed, weak password refused with no account created, Enter submits) → banner → items moved → banner stays gone after reload → sign out → sign-in tab opens by default → Enter signs in. Native notification reading was type-checked only (no device here).

## Reliability update (2026-11-09)

Fixes found by code review and reproduced with tests (each new test fails on the previous code):

- **No-op saves no longer consume history.** On phones, saving an item with a reminder (and "done") saves twice; the second save is identical once the device-only `notificationScheduled` flag is stripped, yet it created a new revision and pushed a real version out of the three kept. Now the client skips a save whose account content is unchanged (`sameList` in `merge.ts`), and the server returns the current revision without writing when the content is identical (`unchanged:true`). An empty first save creates nothing.
- **Race between devices returns CONFLICT, not a storage error.** If another device saved between reading the account row and reading the previous workspace object, the server returned 503 `STORAGE_UNAVAILABLE` and the client did not merge. The server now re-checks the revision and returns 409 `CONFLICT`, so the existing merge-and-retry runs. A genuinely missing workspace still refuses to overwrite (503).
- **Account deletion sweeps storage again after removing the account row,** so an in-flight save cannot leave a copy of a deleted user's data behind.
- **Phone photos are scaled down in the browser** (`services/images.ts`, `image-size.ts`): longest side 1600 px, JPEG 0.82, only for images over 400 KB; GIFs kept; on any decode failure the original is kept. A 12 MB 4032×3024 photo became ~0.75 MB; before, one or two photos could reach the 20 MB account limit. Existing stored images are not modified. Native (Expo app) image picking is unchanged — not testable here.
- **Web: warning before closing/reloading the tab** while a save is running or the editor holds unsaved text (`beforeunload`). Nothing is written to device storage for this, so no account data touches the shared device.

No schema change, no migration, no new service, secret or paid API. Server API stays backward compatible (`unchanged` is an extra field).

Validation (first round): 32 server tests and 45 client tests pass; TypeScript passes in both projects; Expo web export and server build pass. Local browser QA (wrangler local D1/R2, synthetic `@example.test` accounts, local state deleted afterwards) at 390×844, 412×915 and 1280×900: registration, saving a 12 MB photo (stored 1600×1200), a phone and a desktop session of the same account editing concurrently (CONFLICT → merged, both changes kept), a second account seeing no items/versions of the first (404 on its version), and the close-tab warning. No production data was touched. Real Galaxy/iPhone hardware and native builds were not exercised.

Release: `public/` already contains the new web export (`index-030f5100….js`); older bundles are kept so open tabs keep working. Run the server build and publish as before.

## Storage and recovery update

The account API now copies the current R2 workspace to a private revision snapshot before replacing it. If the old workspace cannot be read or its backup cannot be written, the save fails and the current database pointer stays unchanged. Successful saves retain the three previous revisions (best-effort pruning; a failed cleanup can temporarily leave more). Recovery starts with saves made after this release; previously removed items cannot be retroactively recovered. Account deletion also deletes snapshots.

Authenticated `GET /api/backups` lists revision numbers; `GET /api/backups/:revision` reads only the signed-in user's snapshot. No schema changes or migrations were needed. The 20 MB workspace limit remains, so up to three full historical snapshots increase per-account storage usage; no billing or provider plan was changed. Monitor hosting quotas as usage grows.

The client captures its sync baseline before asynchronous image conversion, rejects overlapping saves, ignores stale refresh results, and checks account changes before each write/retry. A server conflict merges remote additions before retrying.

`mobile-source/src/BackupPanel.tsx` offers dated JSON export, user-initiated sharing to Drive/iCloud, import preview and recovery from previous account versions. `backup.ts` validates version, item count, size and embedded image data. Import/recovery is additive: unchanged duplicates are skipped, differing versions get separate IDs, and current items are never replaced. Restored notifications must be scheduled again. Native file picking uses the installed Expo File API; actual device testing remains necessary. Backup import accepts up to 32 MB for formatted JSON; the server still enforces 20 MB per save.

Drive/iCloud remains MANUAL file export/share and file selection, as previously requested. No Drive OAuth access, refresh token, automatic external upload or user's Drive contents were added/accessed. The UI explicitly tells users to check the saved file and offers no false guarantee that closing a share sheet means upload succeeded.

Validation for this update: 28 backend tests and 43 client tests passed, as did both TypeScript checks, Expo web export and server build. Local browser QA restored a previous revision alongside a newer edit, imported a synthetic JSON backup after preview, then downloaded and parsed the resulting three-item backup. The API confirmed all three titles remained. Mobile-width (390×844) layout checked. Synthetic local test account and its snapshots were deleted afterward. No production account records were changed during testing. Actual Google Drive/iCloud provider apps and native devices were not exercised.

Personal reminders, screenshots, notes and birthdays, with Hebrew / English / Russian UI.
Production: https://makom-lizkor-dima.dimavol11.chatgpt.site/

## Source of truth

- `mobile-source/App.tsx`: Expo / React Native UI, exported to web.
- `mobile-source/src/services/account.ts`: session, authentication and cloud storage client.
- `mobile-source/src/auth-validation.ts`: form validation.
- `lib/account-api.ts`: server API, email/password, Google, Facebook infrastructure and recovery.
- `tests/accounts.test.cjs`: SQLite-backed server integration tests with mocked mail/OAuth.
- `mobile-source/tests/*.test.cjs`: client/domain tests.
- `drizzle/`: applied migrations 0000–0003; do not modify applied SQL.
- `public/index.html` and `public/ui.html`: copies of Expo web export. Rebuild from mobile-source; do not edit generated JS.
- `.openai/hosting.json`: existing Sites project, D1 `DB` and R2 `BUCKET` bindings.

## Current service state

Email/password registration and Google login are enabled. Password recovery is enabled using Brevo's free tier. Codes are sent only to the requesting account's address; no CC/BCC. Runtime secrets are not included in this archive. Importing this ZIP elsewhere does not copy the database, user uploads, OAuth settings or email keys.

Facebook/Meta is deliberately DISABLED (`FACEBOOK_LOGIN_ENABLED=false`). The owner paused this work: this is a personal project without a registered business. Do not invent company details or resume business verification. Basic app configuration exists but public verification and a real OAuth test remain incomplete.

Owner requires zero spending. Do not enable paid APIs, purchase a domain, register a company, add billing, or use AI APIs. Search is ordinary local text search. Do not expose secrets in chat, code, logs or archives.

## Registration audit fixes

- Separate email/password validation, 12–128 character bounds, confirmation on registration/reset, password visibility and autofill hints.
- Disable auth tabs and inputs while requests are pending; reset stale form messages when changing modes.
- Hide unconfigured Facebook from the registration form; retain setup status in settings.
- Successful authentication remains successful if cloud data loading fails: show retry instead of prompting duplicate registration.
- Clear previous account data on account transitions and block saving while loading failed.
- A failed session lookup no longer silently treats an unknown session as a guest.
- Expected account ID accompanies client requests; the server rejects old-tab reads/writes/deletion/logout after another tab changes the account cookie. Older clients without this optional header remain compatible; refresh open tabs after release.
- Prevent late background refresh from restoring items after account transition.
- A failed older reset email cannot delete a newer reset code.

## Validation commands

Audit result: 26 server tests and 37 client tests passed; TypeScript passed in both projects; Expo web export and server production build passed. Local browser checks covered invalid email, short password, mismatched confirmation, switching to login, successful login to a synthetic locally-created account, and logout. At 390×844 the form scrolls to its submit button. The temporary local account was deleted after testing. No real user's password was changed and no live reset emails were sent during this audit.

Use a current Node release supporting `node:sqlite` (tested on Node 24).

```sh
npm ci
node --test tests/accounts.test.cjs
npx tsc --noEmit
cd mobile-source
npm ci
node --test tests/*.test.cjs
npx tsc --noEmit
npx expo export --platform web --output-dir ../web-export
```

Copy `web-export/` contents into `public/`, and copy its index.html to both public/index.html and public/ui.html. Preserve public/privacy.html and favicon.svg. Then run the server build (`npm run build` from the root). Existing Sites publication uses its source/build helper and the same project ID, preserving the public audience.

## Known limits / follow-up

- Tests use local data and mock mail/OAuth, not real owners' passwords. No claim of end-to-end Google consent or real iPhone/Galaxy validation in this audit.
- Registration verifies email ownership when email sending is configured (see above). Do not auto-link OAuth accounts merely because email strings match. Existing email users sign in first, then link Google in settings.
- Native store packages and Apple/SMS login are not released/configured.
- Web reminders export calendar events; no closed-browser web push.
- No account-to-account sharing. Google Drive/iCloud backup uses manual file export/share, not automatic sync.
- Workspace save limit: 20 MB. No promise of unlimited free storage or permanent free provider availability.
- On a failed session lookup, the UI asks to retry rather than opening a potentially wrong workspace. Offline guest startup could be designed separately with an explicit account/local mode choice.

Archive intentionally excludes node_modules, .git, environment secrets, build cache, local databases, logs, and real user data. Public contact address in privacy.html is intentionally public and owner-approved.
