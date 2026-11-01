#!/usr/bin/env bash
set -euo pipefail
BASE="${PERFORM_AI_TEST_URL:-http://127.0.0.1:4186}/app"
PASSWORD="${PERFORM_AI_TEST_PASSWORD:?PERFORM_AI_TEST_PASSWORD is required}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# label|mixed-case identifier|expected role|expected lowercase username|expected lowercase email
accounts=(
  'Admin|ADMIN|admin|admin|admin@becctv.co.uk'
  'Coach Bernard|BERNARD@BECCTV.CO.UK|admin|coachbernard|bernard@becctv.co.uk'
  'Chrissy Buchweitz|CHRISSYB|admin|chrissyb|christinebuchweitz@gmail.com'
  'Jordyn Linklater|JORDYNJASONLINKLATER@GMAIL.COM|user|jordynl|jordynjasonlinklater@gmail.com'
  'Judy Steenekamp|HELLO@DIGITALTRIBE.BUSINESS|user|judys|hello@digitaltribe.business'
  'Tracey Allman|TJLEGACY|user|tjlegacy|traceyallman@vodamail.co.za'
)

for entry in "${accounts[@]}"; do
  IFS='|' read -r label identifier role username email <<<"$entry"
  response="$TMP/${username}.json"
  curl -fsS -X POST "$BASE/account-auth.php?action=login" -H 'Content-Type: application/json' --data "{\"identifier\":\"$identifier\",\"password\":\"$PASSWORD\"}" >"$response"
  php -r '$d=json_decode(file_get_contents($argv[1]),true); $a=$d["account"]??[]; exit(($d["ok"]??false)&&($a["role"]??"")===$argv[2]&&($a["username"]??"")===$argv[3]&&($a["email"]??"")===$argv[4]&&($a["membership"]??"")==="permanent_free_trial" ? 0 : 1);' "$response" "$role" "$username" "$email"
  printf '%s: authenticated as %s (%s) with permanent free trial\n' "$label" "$username" "$role"
done

echo 'All three administrators and three users passed case-normalized account verification.'
