#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:?Usage: probe_transcription_api.sh https://api.example.com}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

espeak-ng -w "$TMP/probe.wav" 'Perform AI transcription probe. Open clearly, then close now.'
node - "$TMP/probe.wav" >"$TMP/body.json" <<'NODE'
const fs = require('fs');
const audioBase64 = fs.readFileSync(process.argv[2]).toString('base64');
const input = {
  audioBase64,
  mimeType: 'audio/wav',
  expectedText: 'Perform AI transcription probe. Open clearly, then close now.',
  sections: ['Perform AI transcription probe.', 'Open clearly, then close now.'],
  fillerWords: ['um', 'uh'],
  retries: {},
  revealed: [],
};
process.stdout.write(JSON.stringify({ 0: { json: input } }));
NODE

curl -fsS --max-time 150 \
  -X POST "${BASE_URL%/}/api/trpc/rehearsal.transcribeAndAnalyze?batch=1" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  --data-binary "@$TMP/body.json" >"$TMP/response.json"

node - "$TMP/response.json" <<'NODE'
const fs = require('fs');
const response = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const item = response?.[0];
const payload = item?.result?.data?.json ?? item?.result?.data;
if (!payload || typeof payload.transcript !== 'string' || !payload.transcript.trim()) {
  console.error(JSON.stringify(response, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ transcript: payload.transcript, accuracyPercent: payload.accuracyPercent, spokenWpm: payload.spokenWpm }, null, 2));
NODE
