# Project requirements

## Animated floating AI Macgyver

The user requires the animated floating AI Macgyver that accepts instructions in all their applications and projects. Treat it as a standard feature of Perform AI and carry the same requirement into other projects when their repositories become available.

- Reuse the existing Macgyver assistant/component when its source is available. Do not quietly substitute a different chatbot or claim integration before it works.
- Keep a persistent, minimizable floating animated avatar available across application screens, including responsive layouts. Respect reduced-motion preferences and avoid covering important controls.
- Support typed instructions and voice interaction where the device/browser permits it. Show listening, processing, speaking and error states accurately. Do not imply listening when the microphone is inactive.
- Let Macgyver understand the current application/screen and carry out instructions through explicit application capabilities. Never claim an action completed unless the application confirms it.
- Preserve each application's credentials, login boundaries and each user's private memory. Do not embed permanent provider keys in the widget or merge memory across applications by default.
- Retain existing Live Coach, practice, history and account flows. The floating assistant complements them.
- Follow the user's existing deployment hold: build and review preview changes before modifying the working website. No hosting upgrade is authorized.

The user has now supplied the complete delivery, source and HostGator archives. Their checksums match. The application source is restored under `application/`, preserving the root recovery documentation/tools. It is the Expo release baseline supplied by the user; later ACTOR-MODE-DEV changes and the different Vite /perform-coach-preview/ source are not included. Do not overwrite those builds or assume their features are in this source.

The new Macgyver integration is in `application/public/macgyver-widget.js`, mounted by `components/macgyver-bridge.tsx`, with authenticated PHP coaching/transcription and private memory. It uses the existing AΩ guardian art as a configurable animated avatar. No existing Macgyver implementation was in the archives, and no other app repositories have been modified. Review `docs/MACGYVER-UPDATE-REVIEW.md` and `application/README.md` for current setup, test evidence, limits and the isolated preview plan. Never put private PHP configuration or provider keys in public/source ZIPs.

See docs/MACGYVER-INTEGRATION.md for the integration and verification requirements.
