#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/release/hostgator-public_html}"
APP_OUT="$OUT/app"
HOSTGATOR_ZIP="${2:-/home/ubuntu/perform_ai_hostgator_release.zip}"
SOURCE_ZIP="${3:-/home/ubuntu/perform_ai_source.zip}"
IOS_CHECK="$ROOT/release/ios-bundle-check"
VALIDATOR="/home/ubuntu/skills/speech-rehearsal-release-builder/scripts/validate_release.py"

rm -rf "$OUT" "$IOS_CHECK"
rm -f "$HOSTGATOR_ZIP" "$HOSTGATOR_ZIP.sha256" "$SOURCE_ZIP" "$SOURCE_ZIP.sha256"
mkdir -p "$APP_OUT"
cd "$ROOT"

printf '%s\n' '== TypeScript =='
pnpm check
printf '%s\n' '== Lint =='
pnpm lint
printf '%s\n' '== Unit and integration tests =='
pnpm test
printf '%s\n' '== PHP payment workflow =='
php -l hostgator/submit-payment.php
php -l hostgator/payment-storage.php
php -l hostgator/plan-storage.php
php -l hostgator/plan-catalog.php
php -l hostgator/payment-review.php
php -l hostgator/account-auth.php
php -l hostgator/profile-thumbnail.php
bash scripts/test_php_payment.sh
if [[ -n "${PERFORM_AI_ACCOUNT_CONFIG:-}" && -n "${PERFORM_AI_TEST_PASSWORD:-}" ]]; then
  bash scripts/test_php_account.sh
  bash scripts/test_php_plan_catalog.sh
else
  printf '%s\n' 'Skipping local account integration check: private test configuration was not supplied.'
fi
printf '%s\n' '== Expo project health =='
npx expo-doctor@latest
printf '%s\n' '== Native iOS production bundle =='
npx expo export --platform ios --output-dir "$IOS_CHECK"

printf '%s\n' '== PERFORM AI web export =='
npx expo export --platform web --output-dir "$APP_OUT"
node scripts/inject_perform_ai_web_shell.mjs "$APP_OUT/index.html"
cp -R public/. "$APP_OUT/"
cp hostgator/.htaccess "$OUT/.htaccess"
cp hostgator/landing-index.html "$OUT/index.html"
cp assets/brand/performai-stbernard.png "$OUT/stbernard.png"
cp assets/brand/performai-stbernard.ico "$OUT/stbernard.ico"
cp assets/brand/performai-stbernard.ico "$OUT/favicon.ico"
cp hostgator/submit-payment.php \
  hostgator/payment-storage.php \
  hostgator/plan-storage.php \
  hostgator/plan-catalog.php \
  hostgator/payment-review.php \
  hostgator/account-auth.php \
  hostgator/profile-thumbnail.php \
  hostgator/service-worker.js \
  hostgator/manifest.webmanifest \
  "$APP_OUT/"
cp README.md DEPLOYMENT.md CRYPTO-PAYMENTS.md FEATURE-COMPLETION.md "$OUT/"

printf '%s\n' '== PHP syntax =='
php -l "$APP_OUT/submit-payment.php"
php -l "$APP_OUT/payment-storage.php"
php -l "$APP_OUT/plan-storage.php"
php -l "$APP_OUT/plan-catalog.php"
php -l "$APP_OUT/payment-review.php"
php -l "$APP_OUT/account-auth.php"
php -l "$APP_OUT/profile-thumbnail.php"

if [[ -n "${PERFORM_AI_ACCOUNT_CONFIG:-}" && -n "${PERFORM_AI_TEST_PASSWORD:-}" ]]; then
  printf '%s\n' '== Exact generated HostGator release =='
  bash scripts/test_exact_hostgator_release.sh
else
  printf '%s\n' 'Skipping exact generated-release account check: private test configuration was not supplied.'
fi

if [[ -f "$VALIDATOR" ]]; then
  printf '%s\n' '== Strict release validation =='
  python3 "$VALIDATOR" "$ROOT" --web-dist "$OUT" --hostgator --require-proof-handler --strict
fi

printf '%s\n' '== HostGator upload archive =='
(
  cd "$OUT"
  zip -qr "$HOSTGATOR_ZIP" .
)
unzip -t "$HOSTGATOR_ZIP" >/dev/null
if unzip -Z1 "$HOSTGATOR_ZIP" | grep -Eq '^(node_modules|\.git|\.env)(/|$)|(^|/)(recordings|uploads|proofs|payment-submissions)(/|$)'; then
  echo "Unsafe HostGator release content detected" >&2
  exit 1
fi

printf '%s\n' '== Source-review archive =='
(
  cd "$ROOT"
  zip -qr "$SOURCE_ZIP" . \
    -x 'node_modules/*' '.git/*' '.expo/*' '.manus-logs/*' 'release/*' 'dist/*' 'build/*' \
       '*.env' '.env*' '*.log' '*.pem' '*.key' '*.p12' '*.pfx' 'hostgator/payment-submissions/*'
)
unzip -t "$SOURCE_ZIP" >/dev/null
SOURCE_LIST="$(unzip -Z1 "$SOURCE_ZIP")"
for required in package.json pnpm-lock.yaml app/rehearse.tsx lib/rehearsal.ts server/routers.ts tests/rehearsal.test.ts scripts/build_hostgator_release.sh; do
  grep -Fxq "$required" <<<"$SOURCE_LIST" || { echo "Source archive is missing $required" >&2; exit 1; }
done
if grep -Eq '^(node_modules|\.git|\.expo|\.manus-logs|release)(/|$)|(^|/)\.env($|\.)' <<<"$SOURCE_LIST"; then
  echo "Unsafe source archive content detected" >&2
  exit 1
fi

sha256sum "$HOSTGATOR_ZIP" > "$HOSTGATOR_ZIP.sha256"
sha256sum "$SOURCE_ZIP" > "$SOURCE_ZIP.sha256"
rm -rf "$IOS_CHECK"

echo "HostGator landing root: $OUT"
echo "PERFORM AI app route: /app/"
echo "HostGator archive: $HOSTGATOR_ZIP"
echo "Source archive: $SOURCE_ZIP"
cat "$HOSTGATOR_ZIP.sha256"
cat "$SOURCE_ZIP.sha256"
