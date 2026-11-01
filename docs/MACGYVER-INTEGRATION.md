# Animated floating AI Macgyver across AΩ applications

## User requirement

Every application and project should include the same animated floating AI Macgyver, capable of accepting instructions. This requirement includes Perform AI and the user's other applications. It is a shared product standard, not evidence that any application already includes the feature.

Reuse the existing Macgyver implementation once its source is identified. Maintain one reusable core for the avatar, animation states, instruction interface and transport, with a small adapter for each application's available actions and account context. Avoid separate assistants that diverge in behavior or identity.

## User experience

- A recognizable animated floating Macgyver avatar appears across screens, with minimize, open and close controls. Position it so mobile navigation, forms and practice controls remain usable.
- Opening the avatar presents an instruction interface with typed input and supported microphone/spoken-response controls.
- Listening, processing, speaking, paused, disconnected and error states reflect the actual underlying operation.
- Voice output, animation and visibility can be controlled. Respect prefers-reduced-motion, keyboard focus, accessible names and touch targets. Do not start microphones or audio automatically.
- Preserve instructions during an in-progress request and provide recovery after connection failure without silently repeating actions.

## Application adapter

Each app provides its own name, current screen, supported capabilities and authenticated server connection. Share only context needed for the instruction; never send all stored documents or conversation history automatically.

For Perform AI, candidate capabilities are navigation to existing screens, preparing a practice brief, selecting a discipline, asking a coaching question and recalling the signed-in user's saved coaching notes. These are proposed integration points, not implemented capabilities in this checkout. Verify actual app APIs before binding them.

Interpret instructions server-side when AI is needed. Validate any requested action against the current app's capability allowlist and the user's authorization. Do not execute arbitrary generated JavaScript, shell commands, SQL or file paths. Return actual success/failure from the action handler; do not present the model's proposed action as completed work. Destructive, external publishing and other approval-sensitive actions require their existing authorization flow.

The Macgyver interface must coexist with Live Coach, practice recording and device audio. It must coordinate microphone/audio ownership rather than run two recognition loops at once. The interface does not establish driving, screen-lock or background-audio readiness.

## Credentials and memory

Keep permanent provider credentials outside the web root and outside client bundles, using the app's own backend. Preserve existing authentication and usage limits. Direct provider voice should use short-lived browser authorization where supported.

The server determines the authenticated user's identity and memory scope; a user id or app id supplied by the browser is not authorization. Keep each application's configuration and each user's history separate. Do not assign anonymous prototype history to an account, replace accounts.php, or automatically merge Ready Mind and Perform AI memory. Any later cross-app memory sharing needs an explicit reviewed contract.

## Verification before rollout

1. Confirm the existing Macgyver source and the current source of each target app.
2. Integrate it in the Perform AI review preview first, preserving the working site and guest history.
3. Verify typed instructions, actual action results, navigation across screens, unavailable capabilities and provider errors.
4. Verify microphone permission grant/denial, interruptions, pause/resume, reconnect, audio ownership and preserving an unfinished instruction.
5. Verify account switching and correct-user memory isolation with synthetic accounts.
6. Verify keyboard, mobile layout, reduced motion and that the avatar does not obscure controls.
7. Validate actual devices at home, then review together before any approved release.
8. Reuse the core in each additional application through an app-specific adapter and its own preview review.

## Current evidence and blocker

The workspace and remote perform-ai branch currently contain only the initial README as application source. The earlier hosted preview and locally generated release bundles are not present in this checkout. No Macgyver implementation or other target-app repositories are available here. Git remote inspection succeeded; this is missing source, not a request for another API key.

Integration is blocked on locating the existing Macgyver implementation and restoring the current Perform AI source. A repository link or a source/review bundle without real credentials can supply these. Do not upload private hosting configuration, passwords, API keys or user memory. No deployment or UI integration is claimed by these documents.
