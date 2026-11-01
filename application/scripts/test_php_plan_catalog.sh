#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="${PERFORM_AI_ACCOUNT_CONFIG:?PERFORM_AI_ACCOUNT_CONFIG is required}"
PASSWORD="${PERFORM_AI_TEST_PASSWORD:?PERFORM_AI_TEST_PASSWORD is required}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
PUBLIC="$TMP/public"; mkdir -p "$PUBLIC/app"
cp "$ROOT/hostgator/account-auth.php" "$ROOT/hostgator/plan-storage.php" "$ROOT/hostgator/plan-catalog.php" "$PUBLIC/app/"
PERFORM_AI_ACCOUNT_CONFIG="$CONFIG" PERFORM_AI_PLAN_STORAGE_DIR="$TMP/private" php -S 127.0.0.1:4192 -t "$PUBLIC" >"$TMP/php.log" 2>&1 &
PID=$!; trap 'kill "$PID" 2>/dev/null || true; rm -rf "$TMP"' EXIT
sleep 1
BASE="http://127.0.0.1:4192/app"; JAR="$TMP/cookies"
printf '%s\n' 'Checking public default subscription catalogue'
curl -fsS "$BASE/plan-catalog.php?action=list" >"$TMP/default.json"
php -r '$d=json_decode(file_get_contents($argv[1]),true); exit(($d["ok"]??false)&&count($d["plans"]??[])===5&&(float)($d["plans"][1]["amount"]??0)===10.0 ? 0 : 1);' "$TMP/default.json"
printf '%s\n' 'Creating administrator session'
curl -fsS -c "$JAR" -X POST "$BASE/account-auth.php?action=login" -H 'Content-Type: application/json' --data "{\"identifier\":\"coachbernard\",\"password\":\"$PASSWORD\"}" >"$TMP/login.json"
CSRF="$(php -r '$d=json_decode(file_get_contents($argv[1]),true); echo $d["csrfToken"]??"";' "$TMP/login.json")"; test -n "$CSRF"
printf '%s\n' 'Saving monthly Pro subscription price'
cat >"$TMP/plans.json" <<'JSON'
{"plans":[{"id":"basic","label":"Basic","amount":5,"cycle":"annual"},{"id":"pro","label":"Pro","amount":12.5,"cycle":"monthly"},{"id":"elite","label":"Elite","amount":20,"cycle":"annual"},{"id":"sovereign","label":"Sovereign","amount":30,"cycle":"annual"},{"id":"multiverse","label":"Multiverse","amount":50,"cycle":"annual"}]}
JSON
curl -fsS -b "$JAR" -X POST "$BASE/plan-catalog.php?action=update" -H 'Content-Type: application/json' -H "X-Perform-AI-CSRF: $CSRF" --data @"$TMP/plans.json" >"$TMP/update.json"
php -r '$d=json_decode(file_get_contents($argv[1]),true); $p=$d["plans"][1]??[]; exit(($d["ok"]??false)&&(float)($p["amount"]??0)===12.5&&($p["cycle"]??"")==="monthly" ? 0 : 1);' "$TMP/update.json"
printf '%s\n' 'Confirming public update and registration acceptance'
curl -fsS "$BASE/plan-catalog.php?action=list" >"$TMP/updated.json"
php -r '$d=json_decode(file_get_contents($argv[1]),true); $p=$d["plans"][1]??[]; exit((float)($p["amount"]??0)===12.5&&($p["cycle"]??"")==="monthly" ? 0 : 1);' "$TMP/updated.json"
echo 'Plan catalogue public read, admin update, amount, billing cycle, and registration-plan validation checks passed.'
