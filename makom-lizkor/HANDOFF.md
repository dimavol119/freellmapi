# Makom Lizkor — project handoff (updated 2026-11-09)

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

Release: `public/` already contains the new web export (`index-ab7c7a6d….js`); older bundles are kept so open tabs keep working. Run the server build and publish as before.

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
- Registration does not yet verify email ownership. Do not auto-link OAuth accounts merely because email strings match. Existing email users sign in first, then link Google in settings.
- Native store packages and Apple/SMS login are not released/configured.
- Web reminders export calendar events; no closed-browser web push.
- No account-to-account sharing. Google Drive/iCloud backup uses manual file export/share, not automatic sync.
- Workspace save limit: 20 MB. No promise of unlimited free storage or permanent free provider availability.
- On a failed session lookup, the UI asks to retry rather than opening a potentially wrong workspace. Offline guest startup could be designed separately with an explicit account/local mode choice.

Archive intentionally excludes node_modules, .git, environment secrets, build cache, local databases, logs, and real user data. Public contact address in privacy.html is intentionally public and owner-approved.
