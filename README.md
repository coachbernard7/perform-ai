# AΩ Perform AI

The supplied application source is restored in [application](application/README.md). The current update adds an animated floating Macgyver web assistant, protected PHP coaching/transcription and separate account memory. It is a locally tested review build, not a deployed or driving-ready release.

See [review, validation and rollback](docs/MACGYVER-UPDATE-REVIEW.md). Run `bash scripts/setup-cloud.sh` for the managed cloud tools; work from `application/` using pinned pnpm 9.12.0. `bash application/scripts/build_macgyver_review.sh` builds the separate review folder after dependencies are installed. Real provider access/device audio still require validation, and other app repositories have not been integrated.

The animated floating AI Macgyver is a shared requirement across the user's applications. See [integration requirements](docs/MACGYVER-INTEGRATION.md) and [project instructions](AGENTS.md). The reusable component is supplied here; each additional application needs its own authenticated backend and capability adapter.

[Source collection instructions](docs/SOURCE-RECOVERY.md) describe the tested Windows source-export helper used to collect the current ACTOR-MODE-DEV source for review without changing or deploying the app.
