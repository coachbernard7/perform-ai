#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${SPR_PHP_TEST_PORT:-4177}"
BASE="http://127.0.0.1:$PORT"
PRIVATE_ROOT="$(mktemp -d)"
STORAGE="$PRIVATE_ROOT/payment-submissions"
COOKIE_JAR="$PRIVATE_ROOT/cookies.txt"
SERVER_LOG="$PRIVATE_ROOT/php-server.log"
PASSWORD='SPR-test-review-password'
mkdir -p "$STORAGE"
HASH="$(php -r 'echo password_hash($argv[1], PASSWORD_DEFAULT);' "$PASSWORD")"
printf '{"username":"reviewer","password_hash":"%s"}\n' "$HASH" > "$PRIVATE_ROOT/reviewer.json"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then kill "$SERVER_PID" 2>/dev/null || true; fi
  rm -rf "$PRIVATE_ROOT"
}
trap cleanup EXIT

SPR_PAYMENT_STORAGE_DIR="$STORAGE" php -S "127.0.0.1:$PORT" -t "$ROOT/hostgator" >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!
for _ in {1..30}; do
  if curl -fsS "$BASE/submit-payment.php" >/dev/null 2>&1; then break; fi
  sleep 0.1
done

STATUS="$(curl -sS -o /tmp/spr-submit.json -w '%{http_code}' -X POST "$BASE/submit-payment.php" \
  -H "Origin: $BASE" -H 'X-Speech-Rehearser: proof-v1' \
  -F plan=pro -F plan_label=Pro -F plan_price=£10 -F payment_method=bnb-bep20 \
  -F network='BNB Smart Chain (BEP-20)' -F wallet_address=0x64B637D97d9d9844212aAeA4eb981DBc3E3f3eB6 \
  -F txid=0xabcdef1234567890 -F email=test@example.com)"
[[ "$STATUS" == "201" ]] || { cat /tmp/spr-submit.json; exit 1; }
REFERENCE="$(sed -n 's/.*"reference":"\([^"]*\)".*/\1/p' /tmp/spr-submit.json)"
[[ "$REFERENCE" =~ ^SPR-[A-F0-9]{10}$ ]]
RECORD="$STORAGE/$(printf '%s' "$REFERENCE" | tr '[:upper:]' '[:lower:]').json"
grep -q '"status": "submitted_unverified"' "$RECORD"

UNAUTH="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/payment-review.php")"
[[ "$UNAUTH" == "401" ]]
curl -fsS -u "reviewer:$PASSWORD" -c "$COOKIE_JAR" "$BASE/payment-review.php" > /tmp/spr-review.html
CSRF="$(sed -n 's/.*name="csrf" value="\([^"]*\)".*/\1/p' /tmp/spr-review.html | head -1)"
[[ -n "$CSRF" ]]
curl -fsS -u "reviewer:$PASSWORD" -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE/payment-review.php" \
  --data-urlencode "csrf=$CSRF" --data-urlencode "reference=$REFERENCE" \
  --data-urlencode 'decision=approved_manual' --data-urlencode 'note=Explorer and recipient checked in test.' > /tmp/spr-review-result.html
grep -q 'approved_manual' "$RECORD"
grep -q '"reviewed_by": "reviewer"' "$RECORD"
grep -q 'Explorer and recipient checked in test' "$RECORD"

printf 'PHP payment workflow passed: %s\n' "$REFERENCE"
