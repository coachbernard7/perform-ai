#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="${PERFORM_AI_ACCOUNT_CONFIG:?Set PERFORM_AI_ACCOUNT_CONFIG to a private accounts.php file}"
PASSWORD="${PERFORM_AI_TEST_PASSWORD:?Set PERFORM_AI_TEST_PASSWORD for local account testing}"
PORT="${PERFORM_AI_ACCOUNT_TEST_PORT:-4190}"
TMP="$(mktemp -d)"
trap '[[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null || true; rm -rf "$TMP"' EXIT

php -l "$ROOT/hostgator/account-auth.php" >/dev/null
php -l "$ROOT/hostgator/profile-thumbnail.php" >/dev/null
php -r '$image=imagecreatetruecolor(320,180); $colour=imagecolorallocate($image,57,255,136); imagefill($image,0,0,$colour); imagejpeg($image,$argv[1],90); imagedestroy($image);' "$TMP/source.jpg"
mkdir -p "$TMP/public/app"
cp "$ROOT/hostgator/account-auth.php" "$ROOT/hostgator/profile-thumbnail.php" "$ROOT/hostgator/plan-storage.php" "$TMP/public/app/"

PERFORM_AI_ACCOUNT_CONFIG="$CONFIG" PERFORM_AI_PROFILE_STORAGE_DIR="$TMP/profiles" \
  php -S "127.0.0.1:$PORT" -t "$TMP/public" >"$TMP/php.log" 2>&1 &
SERVER_PID=$!
sleep 1
BASE="http://127.0.0.1:$PORT/app"
JAR="$TMP/cookies.txt"

printf '%s\n' 'Checking anonymous status'
curl -fsS "$BASE/account-auth.php?action=status" >"$TMP/status.json"
php -r '$d=json_decode(file_get_contents($argv[1]),true); exit(($d["authenticated"]??true) ? 1 : 0);' "$TMP/status.json"

printf '%s\n' 'Rejecting invalid password'
code=$(curl -sS -o "$TMP/invalid.json" -w '%{http_code}' -X POST "$BASE/account-auth.php?action=login" -H 'Content-Type: application/json' --data '{"identifier":"coachbernard","password":"wrong"}')
[[ "$code" == "401" ]]

printf '%s\n' 'Creating account session'
curl -fsS -c "$JAR" -X POST "$BASE/account-auth.php?action=login" -H 'Content-Type: application/json' --data "{\"identifier\":\"coachbernard\",\"password\":\"$PASSWORD\"}" >"$TMP/login.json"
CSRF=$(php -r '$d=json_decode(file_get_contents($argv[1]),true); if(!($d["ok"]??false)||empty($d["csrfToken"])||(($d["account"]["membership"]??"")!=="permanent_free_trial")) exit(1); echo $d["csrfToken"];' "$TMP/login.json")

printf '%s\n' 'Creating 128px thumbnail'
curl -fsS -b "$JAR" -X POST "$BASE/profile-thumbnail.php?action=upload" -H "X-Perform-AI-CSRF: $CSRF" -F "thumbnail=@$TMP/source.jpg;type=image/jpeg" >"$TMP/upload.json"
THUMBNAIL=$(php -r '$d=json_decode(file_get_contents($argv[1]),true); if(!($d["ok"]??false)||empty($d["thumbnailUrl"])) exit(1); echo $d["thumbnailUrl"];' "$TMP/upload.json")
printf '%s\n' 'Reading authenticated thumbnail'
curl -fsS -b "$JAR" "$BASE/$THUMBNAIL" >"$TMP/thumb.jpg"
php -r '$s=getimagesize($argv[1]); exit($s && $s[0]===128 && $s[1]===128 ? 0 : 1);' "$TMP/thumb.jpg"

printf '%s\n' 'Destroying account session'
curl -fsS -b "$JAR" -X POST "$BASE/account-auth.php?action=logout" -H "X-Perform-AI-CSRF: $CSRF" >"$TMP/logout.json"
code=$(curl -sS -b "$JAR" -o "$TMP/after-logout.json" -w '%{http_code}' "$BASE/profile-thumbnail.php?action=view")
[[ "$code" == "401" ]]

printf '%s\n' 'Registering pending subscription account'
curl -fsS -c "$JAR" -X POST "$BASE/account-auth.php?action=register" -H 'Content-Type: application/json' --data '{"name":"Registration Test","username":"registrationtest","email":"registration-test@example.com","password":"RegistrationTest#2026","plan":"pro"}' >"$TMP/register.json"
php -r '$d=json_decode(file_get_contents($argv[1]),true); $a=$d["account"]??[]; exit(($d["ok"]??false)&&($d["authenticated"]??false)&&($a["membership"]??"")==="pending_manual_verification"&&($a["selectedPlan"]??"")==="pro" ? 0 : 1);' "$TMP/register.json"

printf '%s\n' 'Rejecting duplicate registration'
code=$(curl -sS -o "$TMP/duplicate.json" -w '%{http_code}' -X POST "$BASE/account-auth.php?action=register" -H 'Content-Type: application/json' --data '{"name":"Registration Test","username":"registrationtest","email":"registration-test@example.com","password":"RegistrationTest#2026","plan":"pro"}')
[[ "$code" == "422" ]]
echo "Account, session, registration, plan selection, CSRF, and 128px thumbnail checks passed."
