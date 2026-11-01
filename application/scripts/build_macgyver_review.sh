#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export EXPO_NO_TELEMETRY=1
export EXPO_OFFLINE=1
export EXPO_PUBLIC_PERFORM_BASE_PATH=/perform-macgyver-review/app
export EXPO_PUBLIC_API_BASE_URL=
export CI=1
# Prime NativeWind's generated CSS before Metro indexes the filesystem.
node scripts/prime-css.cjs
./node_modules/.bin/expo export --platform web --output-dir review-build/site/perform-macgyver-review/app --max-workers 2 --clear
python3 scripts/prepare_macgyver_review.py
