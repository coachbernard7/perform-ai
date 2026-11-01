# PERFORM AI — HostGator Deployment and Transcription Architecture

**Deck footer:** © 2020 PERFORM AI · Alpha Omega Core Devolopement

## Purpose

This document contains the complete speaking script and speaker notes for the eight-slide **PERFORM AI — HostGator Deployment & Transcription Architecture** deck. It is written to explain the deployment accurately: the HostGator package is a static Expo web application with limited PHP sidecars, while reliable recorded-audio transcription requires a separately deployed HTTPS Node API.

## Slide 1 — PERFORM AI at performai.co.uk

### On-screen message

**PERFORM AI at performai.co.uk**

Final deployment briefing: a secure public gateway, private rehearsal application, and honest transcription boundary.

### Speaker notes

PERFORM AI now has a clear deployment shape. The public domain is **performai.co.uk**, and the private rehearsal application opens behind the gateway at **/app/**. The purpose of this briefing is accuracy. It separates the capabilities that the completed HostGator release can safely deliver from the capabilities that require an independently deployed transcription service.

The product can be launched as a secure rehearsal gateway, an authenticated private-script application, and a PHP-assisted account and payment-review system. It must not be described as a fully live recorded-audio transcription product until the separate Node transcription API has been deployed and tested.

## Slide 2 — Production topology: a public gateway and private app

### On-screen message

The root domain serves the public landing page. The authenticated rehearsal application runs from **/app/**. Private PHP storage remains outside `public_html`.

### Speaker notes

The root landing page is deliberately public and minimal. Visitors can see the PERFORM AI identity, the available display themes, package options, login, registration, and the gateway into the app. Public pages do not list private script titles or content.

The Expo application is served from **/app/**. A visitor can see the basic application shell and training previews, but private scripts, saved history, rehearsal text, payment proof submission, and profile thumbnail upload remain behind the account session.

The PHP sidecars are deliberately narrow. They manage account sessions, registration records, low-resolution profile thumbnails, payment-proof intake, and manual payment review. Accounts, registrations, profile images, proof files, reviewer configuration, and the subscription catalogue belong outside `public_html`.

## Slide 3 — What HostGator can — and cannot — do

### On-screen message

HostGator serves the static/PHP application. It does not run the Node transcription service or hold Whisper-provider keys.

### Speaker notes

HostGator can serve the compiled Expo application, its Progressive Web App files, client-side document import, local history, the public gateway, PHP session endpoints, manual payment proof intake, and the private reviewer workflow.

HostGator cannot run the project’s Node/tRPC transcription server. It also must not hold a transcription-provider key in public JavaScript, `public_html`, QR code data, or a client bundle. This distinction matters because an audio recording can be created on the device, but it cannot be scored reliably from a recorded file unless an API exists that can securely send it to the chosen transcription provider.

Browser Web Speech may provide live recognition in compatible browsers. It is a browser feature rather than a PERFORM AI managed service, so it varies by browser, language, device, network policy, and operating system. It must remain an optional convenience rather than a reliable production contract.[1]

## Slide 4 — Reliable transcription needs a managed HTTPS API

### On-screen message

Device recording → managed Node API → transcription provider → real transcript and score.

### Speaker notes

The reliable production flow begins when the user chooses to transcribe a recorded take. The app records on the device after microphone permission is granted. It then sends the audio to the configured API base URL, for example **https://api.performai.co.uk**.

The managed Node API is the only component that holds the provider credential. It validates the incoming audio, calls the Whisper-compatible provider, receives a transcript and any available timestamps, and returns the data needed for comparison. PERFORM AI can then calculate accuracy, correct words, missing words, additional words, substitutions, words per minute, aligned script following, weak sections, and pause metrics when timestamps are returned.

Safari on iPhone and iPad should be assumed to require this API path for dependable recorded-audio scoring. Browser speech recognition may not be available or consistent enough to make a reliable product promise on those devices.[1] [2] [3]

## Slide 5 — HostGator deployment runbook

### On-screen message

Upload the production archive directly into the document root. Configure PHP, HTTPS, and private storage outside the web root.

### Speaker notes

Start by backing up the existing `performai.co.uk` document root. Upload **perform_ai_hostgator_release.zip** into the correct document root, normally `public_html`, and extract its contents directly there. The root `index.html`, `.htaccess`, `app/`, `_expo/`, and assets must not be placed inside an extra archive folder.

Set HostGator to PHP 8.1 or newer. Enable the Fileinfo and GD PHP extensions. Fileinfo validates uploaded files, while GD creates the centre-cropped 128 by 128 pixel profile JPEG.

Create the private folders one level above `public_html`. The private account configuration, registrations, profile thumbnails, payment evidence, reviewer configuration, and subscription catalogue must stay there. Do not upload the source project, dependency folders, `.env` values, plaintext credentials, or private storage to the public web directory.

Finally, test HTTPS, the root-to-app gateway, deep app route refreshes, account login, logout, the PWA, theme switching, and the manual payment review flow.

## Slide 6 — Accounts, trials, plans, and payment review

### On-screen message

Accounts normalize usernames and emails to lowercase. Owner accounts have permanent free trials. Administrators control display price and billing cadence, while payment approval remains manual.

### Speaker notes

PERFORM AI normalizes usernames and email addresses to lowercase during registration and at login. This means mixed-case credentials still match the canonical lower-case account record. The configured owner accounts include administrators and users with the **permanent_free_trial** entitlement.

New users can register and choose a visible package. The available package names are Basic, Pro, Elite, Sovereign, and Multiverse. Registration records the chosen plan, but it does not activate a paid membership automatically. The account remains pending manual verification until payment evidence has been reviewed.

An authenticated administrator can open **Profile → Subscription administration**. The dashboard changes the public display amount in GBP and one of five billing cycles: weekly, monthly, 3-monthly, 6-monthly, or annual. These changes are catalogue settings only. They do not process a payment, modify an existing entitlement, or approve a proof of payment.

Crypto and Revolut links, payment QR codes, TXID/reference entry, and proof-image upload are supported. Every submission begins unverified. Only the protected manual reviewer action may mark it verified or rejected.

## Slide 7 — Launch test plan before claiming transcription is live

### On-screen message

Run browser, HostGator, and physical device tests. Do not claim transcription is live until a real recording produces a real scored transcript through the managed API.

### Speaker notes

The local and browser checks cover the landing gateway, theme controls, login, password visibility, registration, packages, protected routes, saved history, document imports, rehearsal modes, retries, weak-section focus, Quick Train, practice questions, audience simulation, account normalization, and plan administration.

The production HostGator check covers the HTTPS redirect, root-to-app gateway, deep links, PWA files, favicon, PHP session handling, profile thumbnail generation, payment evidence intake, manual review, and public plan catalogue.

After the API has been configured, test physical iPhone and iPad devices. On each one, grant microphone permission, record a known phrase, pause and resume once, finish the take, and confirm that the result includes a real transcript, accuracy, WPM, correct words, missing words, additional words, substitutions, and a stored history item. Also test a browser where Web Speech is unavailable. This proves the managed API path is genuinely carrying the scoring workflow.[1] [2] [3]

## Slide 8 — Decision path to a production-ready launch

### On-screen message

Test locally → deploy HostGator → deploy Node transcription API → configure API base URL and repeat device tests.

### Speaker notes

The practical next step is to test the complete final delivery package locally before any HostGator upload. Confirm the landing page, account gateway, prefilled accounts, private rehearsal paths, admin catalogue controls, imports, and payment review behavior.

Next, deploy the static and PHP HostGator release. This creates a working PERFORM AI gateway and authenticated rehearsal application. It does not by itself make recorded-audio transcription live.

In parallel, deploy the existing Node transcription server to a managed HTTPS platform. Configure the provider URL and secret key in that server environment only. Set `EXPO_PUBLIC_API_BASE_URL` to the API host, rebuild the Expo web application, and upload the new HostGator archive.

Finally, repeat the real device tests. Only when a physical iPhone and iPad return an actual transcript and score through the managed API should recorded-audio transcription be presented as a production capability.

## References

[1]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API "Web Speech API"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia "MediaDevices: getUserMedia() method"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder "MediaRecorder"
