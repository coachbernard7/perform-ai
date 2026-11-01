# PERFORM AI — Windows Local Test Before HostGator Upload

## Purpose

This guide runs the exact HostGator production build on a Windows computer before any FTP upload. It serves the parking page at `/` and the rehearsal application at `/app/`. It also enables the PHP account gateway and low-resolution profile-thumbnail workflow locally.

## Files to use

Download the final delivery ZIP. Extract it to a short path such as `C:\perform-ai-final`. Inside it, use `perform_ai_hostgator_release.zip` for the website and `perform_ai_source.zip` for source and configuration templates.

Create this test layout:

```text
C:\perform-ai-test\
├── public\                 ← extract perform_ai_hostgator_release.zip here
└── perform-ai-private\
    ├── accounts.php         ← create from accounts.example.php
    └── profile-thumbnails\ ← PHP creates this when needed
    └── registrations\      ← PHP creates pending self-registration records here
```

Do **not** place `accounts.php` inside `public`. It contains password hashes and must remain outside the local web root, just as it will on HostGator.

## Install PHP

Install PHP 8.1 or newer with the `fileinfo` and `gd` extensions enabled. If PHP is already installed, verify it with:

```powershell
php -v
php -m | Select-String "fileinfo|gd"
```

If either extension is unavailable, enable it in `php.ini` before starting the server. GD is required for 128 × 128 profile-thumbnail conversion.

## Create local account configuration

Extract `hostgator/accounts.example.php` from `perform_ai_source.zip` to `C:\perform-ai-test\perform-ai-private\accounts.php`. Generate a bcrypt hash for each local test password instead of storing a password in the file:

```powershell
php -r "echo password_hash('CHOOSE_A_TEST_PASSWORD', PASSWORD_DEFAULT), PHP_EOL;"
```

Paste only the resulting hash into `accounts.php`, following the example structure. Enter each authorised username, email, display name, role, and phone number as required. Set every owner-authorised account to `membership => 'permanent_free_trial'`; this is the permanent free-trial entitlement and does not require a payment step. Keep this file private.

## Start the local production server

In PowerShell, run:

```powershell
cd C:\perform-ai-test\public
php -S 127.0.0.1:4184
```

Open <http://127.0.0.1:4184/> in a desktop browser. The root page is the PERFORM AI landing gateway. Select **Open app** to reach <http://127.0.0.1:4184/app/>. Local HTTP intentionally does not register a service worker, preventing cached-PWA interference during this desktop test.

## Test checklist

As a visitor, confirm that the app shell is visible but scripts, rehearsal, saved history, payment submission, and profile upload request login. Check that the password eye control changes between hidden and visible text. Register a harmless test account, select a plan, and confirm the profile displays **PLAN PENDING** rather than automatically activating payment access. Then log in with a configured permanent-free-trial account and confirm the profile displays **PERMANENT FREE TRIAL**. Create a short two-section script, run a rehearsal, use **Retry this section**, and confirm that the session appears in Performance History after a page refresh.

Test the six Progressive Memory stages, keyword and first-letter modes, blind mode, Quick Train, weak sections, Practice Questions, and Audience Simulation. Import one TXT, one text-layer PDF, one DOCX, and one PPTX containing speaker notes. Confirm that the imported presentation preserves slide order, title/body text, bullets, and notes.

Upload a profile image. Confirm that the displayed account image is visibly low resolution and square. The endpoint converts it to a 128 × 128 JPEG and stores it outside `public`.

Use the payment screen only with harmless test references. The manual-review workflow is separate from the account login. Do not test a real payment during local validation.

## Transcription test limitation

The local static build has the same architecture as HostGator: it does not run the Node transcription API. Compatible desktop browsers may offer Web Speech live recognition, but this is not a reliable iPhone or iPad production path. A recorded take may be saved without a speech score unless `EXPO_PUBLIC_API_BASE_URL` was set at build time to a separately deployed secure transcription API. Read `LIVE-TRANSCRIPTION-ARCHITECTURE.md` before treating recorded-audio scoring as live.

## PWA and mobile checks

Use Chromium or Edge for the local functional check. The PWA service worker is intentionally enabled only for the final HTTPS site, where installation is browser-controlled. On an iPhone or iPad, open the final HTTPS site in Safari after a future deployment, use **Share → Add to Home Screen**, and then test microphone permission, recording, and any configured transcription API on the physical device. Local `http://127.0.0.1` testing cannot replace an HTTPS physical-device microphone test.

## Stop the server

Return to the PowerShell window and press `Ctrl+C`.
