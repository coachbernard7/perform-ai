#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC="$ROOT/release/hostgator-public_html"
CONFIG="${PERFORM_AI_ACCOUNT_CONFIG:?Set PERFORM_AI_ACCOUNT_CONFIG to a private accounts.php file}"
PASSWORD="${PERFORM_AI_TEST_PASSWORD:?Set PERFORM_AI_TEST_PASSWORD for local account testing}"
PORT="${PERFORM_AI_RELEASE_TEST_PORT:-4196}"
TMP="$(mktemp -d)"
JAR="$TMP/cookies.txt"
cleanup() {
  status=$?
  [[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null || true
  if [[ "$status" -ne 0 && -f "$TMP/php.log" ]]; then
    printf '%s\n' 'Clean-release PHP server log:' >&2
    sed -E 's/(password=)[^& ]+/\1[redacted]/g' "$TMP/php.log" >&2
  fi
  rm -rf "$TMP"
  exit "$status"
}
trap cleanup EXIT

[[ -s "$PUBLIC/index.html" ]]
[[ -s "$PUBLIC/app/account-auth.php" ]]
[[ -s "$PUBLIC/app/service-worker.js" ]]
php -r '$image=imagecreatetruecolor(320,180); $colour=imagecolorallocate($image,57,255,136); imagefill($image,0,0,$colour); imagejpeg($image,$argv[1],90); imagedestroy($image);' "$TMP/source.jpg"

PERFORM_AI_ACCOUNT_CONFIG="$CONFIG" \
PERFORM_AI_PROFILE_STORAGE_DIR="$TMP/profiles" \
PERFORM_AI_REGISTRATION_STORAGE_DIR="$TMP/registrations" \
PERFORM_AI_PLAN_STORAGE_DIR="$TMP/plans" \
SPR_PAYMENT_STORAGE_DIR="$TMP/payment-submissions" \
php -S "127.0.0.1:$PORT" -t "$PUBLIC" >"$TMP/php.log" 2>&1 &
SERVER_PID=$!
BASE="http://127.0.0.1:$PORT"

for _ in {1..50}; do
  if curl -fsS "$BASE/" >/dev/null 2>&1; then break; fi
  sleep 0.1
done
curl -fsS "$BASE/" >/dev/null
printf '%s\n' 'Checking landing and app export'
curl -fsS "$BASE/" | grep -q 'Blue with green rain'
curl -fsS "$BASE/app/" | grep -q '<!DOCTYPE html>'
printf '%s\n' 'Checking anonymous account status'
curl -fsS "$BASE/app/account-auth.php?action=status" >"$TMP/status.json"
php -r '$d=json_decode(file_get_contents($argv[1]),true); exit(($d["ok"]??false)&&!($d["authenticated"]??true) ? 0 : 1);' "$TMP/status.json"

curl -fsS -c "$JAR" -X POST "$BASE/app/account-auth.php?action=login" \
  -H 'Content-Type: application/json' \
  --data "{\"identifier\":\"coachbernard\",\"password\":\"$PASSWORD\"}" >"$TMP/login.json"
CSRF="$(php -r '$d=json_decode(file_get_contents($argv[1]),true); if(!($d["ok"]??false)||(($d["account"]["membership"]??"")!=="permanent_free_trial")) exit(1); echo $d["csrfToken"]??"";' "$TMP/login.json")"
test -n "$CSRF"

printf '%s\n' 'Checking authenticated thumbnail conversion'
curl -fsS -b "$JAR" -X POST "$BASE/app/profile-thumbnail.php?action=upload" \
  -H "X-Perform-AI-CSRF: $CSRF" \
  -F "thumbnail=@$TMP/source.jpg;type=image/jpeg" >"$TMP/thumbnail.json"
THUMBNAIL="$(php -r '$d=json_decode(file_get_contents($argv[1]),true); if(!($d["ok"]??false)||empty($d["thumbnailUrl"])) exit(1); echo $d["thumbnailUrl"];' "$TMP/thumbnail.json")"
curl -fsS -b "$JAR" "$BASE/app/$THUMBNAIL" >"$TMP/thumb.jpg"
php -r '$s=getimagesize($argv[1]); exit($s && $s[0]===128 && $s[1]===128 ? 0 : 1);' "$TMP/thumb.jpg"

printf '%s\n' 'Checking pending registration'
USERNAME="releasecheck$(date +%s)"
curl -fsS -X POST "$BASE/app/account-auth.php?action=register" \
  -H 'Content-Type: application/json' \
  --data "{\"name\":\"Release Check\",\"username\":\"$USERNAME\",\"email\":\"$USERNAME@example.test\",\"password\":\"ReleaseCheck#2026\",\"plan\":\"pro\"}" >"$TMP/register.json"
php -r '$d=json_decode(file_get_contents($argv[1]),true); $a=$d["account"]??[]; exit(($d["ok"]??false)&&($a["membership"]??"")==="pending_manual_verification"&&($a["selectedPlan"]??"")==="pro" ? 0 : 1);' "$TMP/register.json"

printf '%s\n' 'Checking submitted-unverified payment proof'
STATUS="$(curl -sS -o "$TMP/payment.json" -w '%{http_code}' -X POST "$BASE/app/submit-payment.php" \
  -H "Origin: $BASE" -H 'X-Speech-Rehearser: proof-v1' \
  -F plan=pro -F plan_label=Pro -F plan_price='£10' -F payment_method=bnb-bep20 \
  -F network='BNB Smart Chain (BEP-20)' -F wallet_address=0x64B637D97d9d9844212aAeA4eb981DBc3E3f3eB6 \
  -F txid=0xabcdef1234567890 -F email=release-check@example.test)"
[[ "$STATUS" == "201" ]]
grep -q 'pending_manual_verification' "$TMP/payment.json"

printf '%s\n' 'Checking corrected PWA worker and JavaScript bundle'
grep -Fxq 'const CACHE = "perform-ai-app-v2";' "$PUBLIC/app/service-worker.js"
BUNDLE="$(sed -n 's#.*src="\(/app/_expo/static/js/web/entry-[^"]*\.js\)".*#\1#p' "$PUBLIC/app/index.html")"
test -n "$BUNDLE"
curl -fsSI "$BASE$BUNDLE" | grep -qi '^Content-Type: application/javascript'
curl -fsS "$BASE$BUNDLE" >"$TMP/bundle.js"
head -c 64 "$TMP/bundle.js" | grep -q 'var __BUNDLE_START_TIME__'

echo 'Exact generated HostGator release passed landing, app, login, registration, thumbnail, payment, PWA cache revision, and JavaScript bundle checks.'
