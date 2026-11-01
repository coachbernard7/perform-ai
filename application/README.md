# AΩ Perform AI — Macgyver review update

This source was restored from the user's checksum-verified delivery. The new review adds a floating animated Macgyver web/PWA assistant, browser voice controls, authenticated PHP text coaching/recorded transcription and private account memory. See [the current review and rollback plan](../docs/MACGYVER-UPDATE-REVIEW.md). Existing live sites are unchanged. Later ACTOR-MODE-DEV edits and the separate Vite preview are not in this source baseline.

Use Node 20+ and the pinned pnpm 9.12.0 (`packageManager`). The included `.npmrc` hoisted layout is required by Expo/NativeWind. Run `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm lint`, and `pnpm test`. Do not run database migrations or original production release scripts for this preview. In the managed cloud, `bash ../scripts/setup-cloud.sh` installs the tested tools without changing system directories; Expo settings use `__UNSAFE_EXPO_HOME_DIRECTORY=/tmp/perform-expo` and telemetry is disabled.

For web development run `pnpm exec expo start --web --port 8081`. This serves the UI; authenticated PHP calls need a PHP host or synthetic fixture. On Windows, use that explicit command instead of the old POSIX dev script. HostGator serves static files and PHP, with no Node process required. The permanent OpenAI key belongs only in `perform-ai-private/coaching.php`, outside public_html.

Build the isolated public review with `bash scripts/build_macgyver_review.sh` (Bash/cloud). It creates `../releases/perform-ai-macgyver-preview-flat.zip`, intended only for the proposed `public_html/perform-macgyver-review/` folder after review/approval. The web build explicitly clears the old managed API URL. Never upload the entire source or review bundle to public_html.

Additional verification commands:

```sh
python3 scripts/test_macgyver_php.py
node scripts/test_macgyver_browser.cjs
python3 scripts/test_macgyver_built.py
```

PHP tests require PHP 8.1+ with cURL/Fileinfo. `PERFORM_PHP_BIN`, `PERFORM_PHP_CURL` and `PERFORM_PHP_FILEINFO` select the runtime/extensions. Browser tests use Playwright via `PERFORM_PLAYWRIGHT_PATH` and system Chromium via `PERFORM_CHROMIUM_PATH`. In the cloud setup these are `/tmp/perform-php-runtime/usr/bin/php8.4`, `/tmp/perform-php-runtime/usr/lib/php/20240924/{curl,fileinfo}.so`, `/tmp/perform-browser-check/node_modules/@playwright/test` and `/usr/bin/chromium`; set `LD_LIBRARY_PATH=/tmp/perform-php-runtime/usr/lib/x86_64-linux-gnu`. All fixtures are synthetic and make no OpenAI calls. The built test starts/stops its own temporary PHP server.

The widget can be reused in another web application by loading public/macgyver-widget.js and calling `window.AOMacgyver.mount` with that app's same-origin endpoint, label/avatar and allowlisted navigation callback, then setting its authenticated context. Optional `targets` and `commands` configure that app's capability IDs and exact local navigation phrases; the defaults are Perform AI screens. Destroy it on unmount; update context after account/route changes. The server must verify identity, origin, CSRF, revision and quotas itself, and include its authoritative `account` ID in memory/save/turn responses. Never share credentials or import users' memory across apps just by reusing the widget. Native Expo assistant UI, direct provider WebRTC, device validation and driving/background operation remain pending.

## Original release documentation (historical)

**Speech Rehearser** is one Expo SDK 57 application for iPhone, Android, and the web. The same React Native/TypeScript source powers the phone app and the production web export; there is no separate hand-written HTML product.

The app stores scripts, settings, transcripts, metrics, and rehearsal history locally. It supports microphone recording, a replaceable server transcription provider on native/managed deployments, browser Web Speech transcription on compatible web browsers, ordered live script following, token-level script comparison, separate completion and accuracy measures, spoken WPM, filler counts, pause metrics when timestamps are available, clean section retries, weak-section practice, six-stage progressive memory, priority Quick Train, presentation slides, speaker notes, practice questions, and audience simulation.

Document import supports **TXT, PDF, DOCX, and PPTX**. Native clients send a bounded multipart file to the project server for in-memory extraction. The static HostGator web build extracts documents locally in the browser. Text-layer PDFs are supported; scanned PDFs require OCR and are reported as unsupported rather than silently saved empty.

Payments include the supplied BNB BEP-20, Ethereum/ERC-20, and USDT TRC-20 destinations, Trust Wallet universal links, QR codes, copy fallback, the supplied Revolut link, private PHP proof intake, and an authenticated manual-review page. Submitted evidence remains **pending manual verification** until a reviewer records a decision; no decision activates access automatically.

## Development

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

Use the generated Expo Go QR with an SDK 57-compatible Expo Go client. To create the HostGator upload ZIP from this same source, run:

```bash
pnpm release:hostgator
```

That command creates a complete source-review archive and a separate production HostGator upload archive after enforcing all release gates.

See `DEPLOYMENT.md` for cPanel/FTP steps, `CRYPTO-PAYMENTS.md` for the payment workflow, and `FEATURE-COMPLETION.md` for evidence and known limitations.
