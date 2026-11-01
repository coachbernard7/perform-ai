# PERFORM AI — HostGator Deployment

## Production layout

This release is prepared for **`https://performai.co.uk`**. The deployment intentionally separates the public and private experiences. The root **`/`** serves the PERFORM AI landing page and gateway; the private rehearsal application is served from **`/app/`**. The Expo SDK 57 source is compiled into ordinary static HTML, CSS, JavaScript, fonts, and images. HostGator does not need Node.js, Python, or Java to serve the web application.

The application bundle includes small PHP endpoints under `/app/` for payment-proof intake, authenticated manual review, account sessions, and low-resolution profile thumbnails. The actual account configuration and uploaded thumbnail files remain outside `public_html`.

> **Recorded-audio transcription prerequisite:** HostGator can serve this static/PHP release but cannot run the project’s Node/tRPC speech-transcription service. Before offering recorded-audio transcription and managed accuracy scoring at performai.co.uk, deploy the Node API and a Whisper-compatible provider separately over HTTPS, set `EXPO_PUBLIC_API_BASE_URL` to that API, rebuild, and test a real recording. Browser Web Speech may offer live recognition where supported, but is not a consistent server-transcription replacement.

## Release artifacts

Run `pnpm release:hostgator` from the project directory. The release command runs TypeScript, lint, tests, Expo Doctor, native and web bundles, PHP syntax checks, strict archive validation, and checksum generation.

| Artifact | Purpose |
| --- | --- |
| `perform_ai_source.zip` | Reviewable source archive; excludes dependencies, caches, secrets, and user data. |
| `perform_ai_hostgator_release.zip` | Production upload archive. Its contents belong directly in the document root. |

## cPanel deployment

Open HostGator cPanel and use **File Manager** to locate the document root for `performai.co.uk`, usually `public_html`. Back up the current website before changing it. Upload `perform_ai_hostgator_release.zip` to that document root and extract it there. The extracted `index.html`, `.htaccess`, `app/`, `_expo/`, `assets/`, and remaining files must be directly inside the document root, not inside an additional archive folder.

Use cPanel **MultiPHP Manager** to select PHP 8.1 or newer. Enable both **Fileinfo** and **GD**. GD is required to centre-crop and convert a selected profile image into the app’s 128 × 128 JPEG thumbnail.

Create the following directories one level above `public_html`, owned by the cPanel user and never web-accessible:

```text
/home/CPANEL_USER/perform-ai-private/
/home/CPANEL_USER/perform-ai-private/profile-thumbnails/
/home/CPANEL_USER/perform-ai-private/registrations/
/home/CPANEL_USER/spr-private/
```

Copy `hostgator/accounts.example.php` from the source archive to `/home/CPANEL_USER/perform-ai-private/accounts.php`. Replace example accounts with each authorised user and a bcrypt password hash. Use `membership => 'permanent_free_trial'` for every owner-authorised account that should never require a payment gate. Generate a hash only in a trusted PHP shell with `php -r 'echo password_hash("CHANGE_THIS", PASSWORD_DEFAULT), PHP_EOL;'`. Do **not** put plaintext passwords or the accounts file in `public_html`.

New self-service registrations are stored as password-hashed JSON records in `perform-ai-private/registrations/`. The registrant chooses a plan, but the account state remains `pending_manual_verification` until an authorised reviewer handles payment proof. This storage folder must be writable by the PHP user and must remain outside `public_html`.

## Subscription catalogue administration

Any configured account with `role => 'admin'` can open **Profile → Subscription administration**. The administrator can set each public package’s GBP amount and choose **weekly**, **monthly**, **3-monthly**, **6-monthly**, or **annual** billing. The public landing page and registration screen read the same PHP catalogue. Changes are stored in `perform-ai-private/subscription-catalog.json`, outside `public_html`; the PHP user needs write access to `perform-ai-private`. Changing a display price or cadence does **not** process a payment, change an existing entitlement, or bypass manual payment verification.

The existing payment-review configuration remains private: create `spr-private/reviewer.json` as documented in `CRYPTO-PAYMENTS.md`, or configure `SPR_REVIEW_USER` and `SPR_REVIEW_PASSWORD_HASH`. The HostGator release uses a sibling private path by default; use `PERFORM_AI_ACCOUNT_CONFIG`, `PERFORM_AI_PROFILE_STORAGE_DIR`, or `SPR_PAYMENT_STORAGE_DIR` only when the cPanel layout differs.

Enable SSL before launch. The supplied `.htaccess` redirects HTTP to HTTPS, protects helper files, marks session/PHP responses as non-cacheable, and serves the Expo single-page application for `/app/` routes.

## FTPS deployment

Use FTPS or SFTP when available. Upload the **contents** of `release/hostgator-public_html` to the domain document root, including hidden `.htaccess`. Do not upload source code, dependency folders, `accounts.php`, or the private storage directories to `public_html`.

## Required post-deployment checks

Open `https://performai.co.uk/` and test the landing gateway to `/app/`. As a visitor, confirm that the app layout and training previews can be viewed, while script creation, private library, rehearsal, results, saved history, payments, and profile-thumbnail upload require login.

Sign in using each authorised username and email. Confirm that a successful session exposes private features and logout revokes them. Upload a test profile image and confirm the result is a centre-cropped **128 × 128 JPEG**. Confirm the original image is not stored under `public_html`; after logout, request `/app/profile-thumbnail.php?action=view` and confirm it returns **401**.

Create a private script, complete a rehearsal, close the browser, and reopen the app to confirm local script and history persistence. Test TXT, DOCX, PPTX, and text-layer PDF import. Verify the payment flow, submit a test TXID and small proof image, and confirm the submission remains pending manual verification. Use the private reviewer page to record a test decision, then delete the test record and proof before launch.

Finally, check an installed PWA and each global display choice: Blue + Green Rain, Black + Gold, Black + Light Blue, and White + Black / Blue. Confirm that Blue + Green Rain is the default, the falling code is green and moves only in that mode, the supplied Saint Bernard branding is visible, the root favicon loads, deep `/app/` routes refresh, and HTTP redirects to HTTPS.

## Updating the site

Rebuild the release archive and replace the document-root contents. The service worker is network-first; `index.html`, `service-worker.js`, and PHP endpoints are deliberately non-cacheable. If an installed web app still displays an earlier version, close it and clear stored site data once before reopening.
