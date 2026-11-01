# Macgyver and HostGator PHP review update

Prepared 1 November 2026. Built and tested locally; NOT uploaded or deployed. The user's three delivery archives are retained unchanged. Their embedded checksums match the separately uploaded source/release. No real OpenAI call, payment, email or hosting change was made.

## What changed

The supplied Expo application is restored under application/. The other Vite perform-coach-preview and later local ACTOR-MODE-DEV work were not in these archives. This is a review update to the supplied release, not a replacement of either running preview or the actor development folder.

- A floating Macgyver web/PWA assistant is mounted across the app's screens. It accepts typed instructions, supports browser speech input/output and continuation, and handles explicit navigation instructions through an allowlist. It offers personality, installed-device voice and speed controls, notes and a conversation export. Its guardian image animates within a fixed button; OS reduced motion is respected. This is a new reusable integration using existing AΩ guardian artwork, not an imported Macgyver from another repository.
- The standalone public/macgyver-widget.js can be reused with another app's context, backend and navigation adapter. No other applications were modified. Native Expo builds currently omit this web widget; native voice/assistant work is still pending.
- Authenticated PHP coaching and recorded-audio transcription use the existing private Perform AI key via perform-ai-private/coaching.php. Web recording analysis now uses the PHP adapter when a browser transcript is unavailable. HostGator does not run Node. Native/managed legacy Node routes remain optional and are not deployed by this package.
- Macgyver conversations, notes and voice preferences are stored per server-authenticated user with locks, atomic writes and optimistic revisions. No client-supplied user path is trusted. A GET expected-account guard and auth change broadcasts prevent stale tabs from loading another user's memory.
- Rehearsal script/history storage is now scoped to the signed-in account. The original spr-core-state-v1 guest records remain unchanged and unassigned. They are not automatically imported. Browser-local recordings still have browser lifetime/storage limitations; durable audio backup remains unfinished.
- Login limits persist outside cookies; sessions expire after one hour. Preview cookies follow the actual app folder. PHP AI requests require authentication, matching account, same-origin requests and CSRF tokens.
- Service-worker cache cleanup is scoped to this application path; unrelated app caches are preserved. Preview paths and the PDF worker support the isolated folder. A valid tagged PDF previously rejected by the old parser now imports through the already included PDF.js parser. Explicitly empty API configuration no longer restores a stale development server from .env.

## Private files and test account compatibility

The review build sets PERFORM_AI_PREVIEW_MODE server-side. It reads the already created perform-ai-private/coaching-users.php test accounts without modifying that file. Username, hash and stable id remain the same; an in-memory adapter supplies the older UI's account shape. No owner accounts or registration records are read/imported for preview login. Existing accounts.php and the Vite prototype history stay untouched.

Preview conversation/usage data goes to perform-ai-private/macgyver-review-v1; preview login counters to macgyver-review-auth-limits; preview thumbnails have a separate folder. New directories use 700 and data/config files 600. Registration, payment submission and payment review are disabled in the public review build. Source production mode uses the original account configuration and a different Macgyver data namespace; any promotion requires its own review.

The public ZIP contains no real keys, account hashes, memory, recordings or private templates. Public files are 644 and folders 755. PHP helpers are denied direct HTTP access by the preview .htaccess. Browser-local account keys provide UI separation, not a security boundary against other scripts on the same origin or access to the local device. Server-side coaching memory is authenticated independently.

## Conservative test limits

The PHP adapter shares one enforced request counter across Macgyver text turns and recorded transcription: default 20 provider requests globally and 8 per user per rolling 24 hours. Existing coaching.php text_daily_global_limit/text_daily_user_limit can lower these; failed provider attempts consume quota. Ordinary authenticated requests are limited to 120/minute, login to 8/IP/15 minutes and registration to 3/IP/hour (registration is disabled in the preview). Clearing cookies does not reset counters. Text output defaults to 300 tokens; recordings are capped at 5 MB and checked by server MIME sniffing.

These limits cover this adapter namespace, not the separate older coaching preview or other apps in OpenAI's Default project. They do not enforce a dollar cap. Audio duration/cost varies with encoding, and provider credit auto-reload is not an application spending limit. Project notifications are alerts unless the provider explicitly documents enforcement. Start with one short text request and a short synthetic recording; check actual provider usage after each. The previously reported $10 balance has not been rechecked.

## Verified locally

- Frozen dependencies from the uploaded lockfile using pinned pnpm 9.12.0 and its hoisted layout; no dependency versions changed.
- TypeScript, lint and the unit/integration suite, including valid PDF import, guest/account key separation, environment override and scoped service-worker cache behavior.
- Real PHP HTTP tests with disposable synthetic users: auth, CSRF/origin checks, stale reads/writes, account isolation, saved voice preferences, conversations, multipart audio MIME handling, shared quotas, persistent login limits, cookie scope and private permissions. Provider functions were replaced only in disposable fixtures.
- Browser tests of the standalone widget cover layout/reduced motion, navigation, failure recovery, account switching, synthetic speech input/output, pause, denied microphone permission, background cleanup, keyboard controls and unmount.
- The exported application was exercised against real PHP with synthetic accounts/provider: login, Macgyver conversation, script creation, navigation, account A/B isolation, refresh and unchanged legacy guest data. Two-tab sign-in changes are also tested. Screenshots are included in the final review bundle.

Tests use local PHP 8.4; the domain was previously assigned inherited PHP 8.3, but its effective web runtime/cURL/Fileinfo have not been exercised here. Mock speech and synthetic providers do not prove real OpenAI access or physical-device audio.

Final source-suite result: 50 tests passed, none skipped. The previously skipped legacy logout test now runs with a complete request fixture. PHP syntax passes for all 13 source PHP files. The browser checks also verify that pausing while a reply is pending prevents later automatic speech, and the built-app checks exercise a sign-in change in a second tab sharing the same session. A browser screenshot shows the real exported app with synthetic data, not a design mockup.

## Backup, preview and rollback

Do not extract the review bundle into public_html. First review the source, screenshot and this plan together. Any preview upload requires approval; the live root, /app/, /PERFORMER, /perform-test/ and /perform-coach-preview/ stay untouched.

Before an approved upload, export each browser's existing guest history and take a fresh cPanel backup of the relevant public folder, hidden routing files and private config/data separately. Store private backups outside public_html. The retained original delivery ZIP is evidence, not a current live-server backup.

The nested public archive perform-ai-macgyver-preview-flat.zip is built ONLY for public_html/perform-macgyver-review/. Confirm that folder is unused. Create it with 755 permissions, upload the flat ZIP inside it and extract there. It contains index.html and app/ directly: no additional perform-macgyver-review folder. The proposed entry URL is https://performai.co.uk/perform-macgyver-review/ (not published yet).

Keep coaching.php and coaching-users.php outside public_html at 600; do not overwrite or resubmit them. The existing test usernames/passwords can sign in to this review through the server-side adapter. Do not share the generated users file or secrets in chat. No hosting upgrade is needed.

First verify anonymous requests cannot read memory or transcribe. After signing in, app/macgyver.php?action=health returns authenticated PHP-version, cURL/Fileinfo, configured-model and key-presence metadata only; no key, paths, session token or memory is returned by that action. Use it to check the actual domain runtime without publishing phpinfo(). Sign in A, save notes/voice, send one real text instruction, reload and recall. Sign in B and check A's data is absent. Verify a second tab updates safely. Then test microphone permission, voice output, hint/repeat/pause, interrupted playback, reconnect/reload and a short recording. Check OpenAI usage after each paid call. Repeat at home on iPhone 15/Safari, Samsung S25/Chrome and iPad Pro M4/Safari.

Rollback of an isolated preview: export any new test memory, retain its private directories, then remove/disable only the newly created perform-macgyver-review public folder. The main sites need no restoration because they were not changed. Do not restore older private memory over newer records or clear all browser site data. If the folder existed before testing, restore its fresh pre-change backup instead.

## Still unfinished

Real provider billing/model access and phone/tablet audio are unverified. This build uses browser speech rather than direct provider WebRTC; screen-lock/background operation and driving readiness are not complete. Later actor-mode additions, saved character casting, Ready Mind integration, a complete PDF manual and rollout to other app repositories remain separate work. No 100%-complete or driving-ready claim is made.
