> Historical supplied-release document. It does not certify the current Macgyver update. See ../docs/MACGYVER-UPDATE-REVIEW.md for current scope, tests and remaining checks.

# PERFORM AI — Final Delivery Manifest

This delivery is intended for **local computer testing before any HostGator upload**. No HostGator upload was performed as part of this delivery.

## Included materials

| File | Purpose |
| --- | --- |
| `perform_ai_source.zip` | Complete application source, tests, build scripts, and documentation. It excludes dependencies, credentials, private account files, recordings, payment proofs, and mutable customer data. |
| `perform_ai_hostgator_release.zip` | The direct-upload static/PHP production package for the `performai.co.uk` document root. Do not upload it until local testing is accepted and private cPanel configuration is prepared. |
| `perform_ai_source.zip.sha256` | SHA-256 checksum for the source archive. |
| `perform_ai_hostgator_release.zip.sha256` | SHA-256 checksum for the HostGator archive. |
| `README-START-HERE.md` | Short starting guide for local evaluation. |
| `WINDOWS-LOCAL-TEST.md` | Windows PHP local-test setup and recovery instructions. |
| `DEPLOYMENT.md` | HostGator/cPanel upload, private PHP storage, account, and payment-review configuration instructions. |
| `LIVE-TRANSCRIPTION-ARCHITECTURE.md` | Required external HTTPS Node transcription API architecture and physical-device validation boundary. |
| `CRYPTO-PAYMENTS.md` | Manual crypto/Revolut proof workflow and reviewer-storage guidance. |
| `FEATURE-COMPLETION.md` | Feature status, including manual pace, pause/resume, stopped-take review, and replay controls. |
| `FINAL-TEST-REPORT.md` | Automated, browser, release-package, and remaining physical-device test status. |
| `PERFORM_AI_DEVELOPER_BUILD_PROMPT.md` | Complete from-scratch handoff prompt for a new developer; it contains placeholders rather than private credentials or provider secrets. |
| `PERFORM-AI-HOSTGATOR-PRESENTATION-SCRIPT.md` | Deployment presentation script and speaker notes. |
| `four-theme-camera-safe-qa.md` | Four-theme, Saint Bernard, and camera-safe visual QA record. |

## Current verified release scope

The release contains the exact four global themes: **Blue + Green Rain** by default, **Black + Gold**, **Black + Light Blue**, and **White + Black / Blue**. The shared authenticated shell shows a visible **Log out** control on every app screen and sends the user directly to login after session destruction.

The rehearsal flow includes Slow (80 WPM), Steady (110 WPM), and Brisk (140 WPM) manual pace guidance. It never auto-advances sections. It supports Record & analyse, Pause recording, Resume recording, Stop & review take, immediate replay before analysis, and 0.75×, 1×, and 1.25× playback speed. The browser interaction test verified this sequence with a controlled microphone. Physical iPhone/iPad microphone and audio-session testing remains required.

## Required test order

First test the local Windows package using `WINDOWS-LOCAL-TEST.md`. Verify the landing gateway, four themes, password visibility, login/logout, protected library, registration, plan selection, permanent-free-trial owner configuration, administrator display-price/cadence controls, script creation, pace controls, pause/resume, stopped-take replay, imports, history, profile thumbnail, and manual payment-proof workflow.

Review `LIVE-TRANSCRIPTION-ARCHITECTURE.md` before judging recorded-audio transcription. The static/PHP HostGator package cannot itself run the Node/Whisper service. Deploy the separate HTTPS API and complete physical iPhone and iPad recording, pause/resume, replay, transcript, scoring, and history tests before advertising dependable live audio analysis.

Only after local testing is accepted should `perform_ai_hostgator_release.zip` be extracted into the `performai.co.uk` document root. Configure account, profile, registration, plan, payment-proof, and reviewer storage outside `public_html`. Do not upload the source archive or private local-test configuration.
