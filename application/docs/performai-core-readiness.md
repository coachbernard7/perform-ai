# PerformAI Core Readiness Review

## Conclusion

The rehearsal application’s **local comparison and scoring engine is complete and verified**. A controlled spoken WAV file passed through the configured Whisper-compatible provider and then through the real local tRPC mutation. The returned transcript matched the expected sentence exactly and produced **100% accuracy**, **100% completion**, five correct words, zero missing words, zero additions, zero substitutions, and a measured pace of **124 words per minute**.

However, **recorded-audio transcription is not yet deployable as a HostGator-only feature**. The HostGator package is a static Expo web/PWA build with PHP payment files. It does not contain the Node/tRPC transcription service. A direct request to the exported package’s `/api/trpc/rehearsal.transcribeAndAnalyze` route returned HTTP 404. Uploading the package before this is resolved would preserve local scripts, imports, rehearsal timers, browser live recognition on compatible browsers, and transcript comparison when browser text is available, but it would not reliably transcribe uploaded recordings on `performai.co.uk`.

## Verified locally

| Feature | Result | Evidence |
| --- | --- | --- |
| Whisper-compatible provider contract | Passed | A local HTTP fixture accepted the multipart WAV upload, model, language, prompt, and `verbose_json` request format. |
| Live configured provider | Passed | A generated English WAV containing “Open clearly then close now” returned the same transcript with one timestamped segment. |
| Real tRPC speech path | Passed | The same WAV passed base64 intake, size/type validation, configured transcription, transcript analysis, and section result generation. |
| Transcript comparison | Passed | Correct, missing, additional, and substitute words are calculated by alignment rather than by a fabricated completion score. |
| Pace, fillers, and pauses | Passed | Pace is derived from provider duration; fillers are detected from configurable phrases; pauses require timestamped segments. |
| Local persistence | Passed | Scripts, settings, measured sessions, and history persist in device/browser local storage. |
| Document import | Passed | TXT, text-layer PDF, DOCX, PPTX slide text, and PowerPoint speaker notes have fixture coverage. |
| Public landing privacy | Updated and tested | The landing page now contains only minimal privacy messaging and actions. It does not display stored script titles, word counts, or content. The shipped starter script is a non-substantive placeholder, not a reusable speech. |

## What remains before an FTP launch

### 1. Host the transcription API separately

The public website needs a persistent HTTPS API endpoint for the Node/tRPC route and a Whisper-compatible transcription provider. This can be a small Node service at a separate API hostname such as `api.performai.co.uk`, or another managed backend. It must securely hold the transcription provider key and permit the `performai.co.uk` web app to call it. The web build must then be rebuilt with `EXPO_PUBLIC_API_BASE_URL` set to that API URL.

> **Why this matters:** The configured provider succeeds in the managed local environment, but its credentials and Node runtime are not included in the HostGator static upload. HostGator PHP payment intake is intentionally separate from audio transcription.

### 2. Supply the actual Manus File Storage URL for the mascot

The supplied `stbernard.png` has been integrated locally as the canonical mascot, but it is over the WebDev checkpoint media limit. The File Storage URL in the latest message is still the literal placeholder `[Insert URL]`. The actual URL is required to replace the oversized local source cleanly, save the checkpoint, and publish the app state safely.

### 3. Configure the payment-review credentials

The payment-review page correctly remains disabled until reviewer credentials are placed in the private HostGator location documented in `DEPLOYMENT.md`. The proof workflow should be tested once on the live domain using a harmless test submission before accepting real customer evidence.

### 4. Complete live-domain checks after upload

At the time of review, both HTTP and HTTPS requests to the root of `performai.co.uk` returned Apache HTTP 403. This is expected to change only after the release archive is extracted into the intended document root and SSL is confirmed. Before launch, verify HTTPS redirection, Apache SPA refreshes, microphone permission, PWA installation, direct asset access, and the payment proof endpoint on the real domain.

### 5. Perform a physical iPhone rehearsal test

Automated local tests cannot grant microphone permission on an iPhone. Test one real take in Expo Go or the installed build: grant microphone permission, record, pause, resume, finish, confirm a transcript/score, and confirm that the session remains after closing and reopening the app.

## Privacy boundary

The public landing page is now deliberately sparse. It states only that rehearsal is private, provides entry to scripts, and avoids listing any script metadata. No user-specific script is included in source or the static package. Scripts typed into the app are saved locally on that device/browser unless the user deliberately invokes a feature that sends audio for analysis.

Local browser storage is privacy-oriented but **not encrypted at rest**. Users should not use a shared or unmanaged browser profile for confidential scripts. The production transcription API should retain neither audio nor transcripts by default unless a documented retention policy is added.

## Deployment decision

Do **not** upload as a fully featured transcription product yet. The present archive is suitable for a static rehearsal shell with compatible-browser live recognition, local scripts, document imports, payments, and manual proof submission. To advertise or rely on recorded-audio transcription and server-generated scoring at `performai.co.uk`, first provision the separate API described above and run one real recorded-audio end-to-end test against it.

## References

[1]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API "MDN Web Speech API"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia "MDN MediaDevices getUserMedia"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder "MDN MediaRecorder"
