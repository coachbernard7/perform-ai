# PERFORM AI — Live Transcription Architecture

## The production boundary

HostGator serves the PERFORM AI landing gateway, the static `/app/` bundle, PHP account sessions, profile thumbnails, local browser history, document imports performed in the browser, and manual payment-proof intake. It **cannot** run the project’s Node/tRPC transcription service or securely hold a Whisper-provider secret.

> Do not present the static HostGator site as a complete recorded-audio transcription service until the separate HTTPS API below has been deployed, configured, and tested on physical Apple devices.

Without the external API, compatible browsers may supply optional Web Speech text. When a transcript is actually received, PERFORM AI can compare it with the selected script and derive accuracy, WPM, correct/missing/additional/changed words, aligned following, fillers, and weak sections. Browser recognition is not a dependable iPhone or iPad production transcription contract.

## Secure deployment topology

Deploy the Node server from the PERFORM AI source archive to a managed Node platform under a separate hostname, for example `https://api.performai.co.uk`. Terminate TLS at that platform or its managed load balancer. Point the `api` DNS record at that service, then confirm that `https://api.performai.co.uk/api/health` returns a successful JSON response before connecting the web app.

Set the following values as **server-side secrets or environment variables** in the managed Node platform. Do not place the provider key in HostGator `public_html`, JavaScript, an Expo `EXPO_PUBLIC_*` variable, a QR code, or either release ZIP.

| Server setting | Purpose |
| --- | --- |
| `NODE_ENV=production` | Enables production-only CORS enforcement. |
| `PORT` | The port supplied by the managed Node platform. |
| `BUILT_IN_FORGE_API_URL` | Base URL of the selected Whisper-compatible transcription provider. |
| `BUILT_IN_FORGE_API_KEY` | Secret bearer token for that provider. |
| `CORS_ALLOWED_ORIGINS=https://performai.co.uk` | Allows only the public PERFORM AI origin to call the API from a browser. Add an explicitly required staging origin as a comma-separated additional value; do not use `*`. |
| `JWT_SECRET`, database, or OAuth values | Configure only if the selected Node deployment enables the corresponding project components. Keep every value server-side. |

The active API route validates accepted audio formats, rejects recordings below 128 bytes or above 16 MB, rate-limits the transcription route, forwards the recording to the provider over HTTPS, and returns a real transcript for the local comparison and scoring flow. Configure platform-level request limits, abuse protection, monitoring, and a privacy retention policy as well; in-memory rate limiting alone is not a full multi-instance production control.

Configure the provider to retain audio only as long as required to process the request. The PERFORM AI server forwards the recording in memory and does not need to write it to the HostGator filesystem. Publish a clear privacy and retention statement before a public launch.

## Connect the generated Expo web app

After the API health check succeeds, rebuild the HostGator release with the public API hostname embedded in the app bundle:

```bash
cd /path/to/speech-presentation-rehearser
EXPO_PUBLIC_API_BASE_URL=https://api.performai.co.uk pnpm release:hostgator
```

`EXPO_PUBLIC_API_BASE_URL` is safe to embed because it is only the API **address**. It must never contain a provider key. The generated client calls `https://api.performai.co.uk/api/trpc`; the Node server keeps the Whisper-compatible provider URL and bearer key private.

Upload the resulting `perform_ai_hostgator_release.zip` only after the rebuilt package passes the normal release gates. See `DEPLOYMENT.md` for the cPanel steps. Uploading a previous archive that was built without `EXPO_PUBLIC_API_BASE_URL` will leave the static app pointing at a non-existent HostGator API path.

## Required launch test

Before claiming that recorded-audio transcription is live, use the deployed HTTPS domain to complete one real recording on a physical iPhone and one on a physical iPad. On each device, grant microphone permission, record a known short phrase, pause and resume once, finish the take, and confirm that the result contains a real transcript, accuracy, WPM, correct/missing/additional/changed words, and a stored history item. Test a browser without Web Speech as well so that the managed API path—not a browser-only fallback—is proven.

If the API is not deployed, present the HostGator package as a **private rehearsal shell with optional browser recognition**, not as a complete transcription product.

## References

[1]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API "MDN Web Speech API"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia "MDN MediaDevices getUserMedia"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder "MDN MediaRecorder"
