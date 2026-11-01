#!/usr/bin/env python3
"""Verify browser-origin audio analysis through the configured HTTPS API."""
import base64
import json
import os
import subprocess
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

origin = os.environ.get("PERFORM_AI_BROWSER_ORIGIN", "https://4197-i3qm4qhwmo7dq531qbqfx-dcfe856d.us1.manus.computer").rstrip("/")
api = os.environ.get("PERFORM_AI_TRANSCRIPTION_API", "https://3000-i3qm4qhwmo7dq531qbqfx-dcfe856d.us1.manus.computer").rstrip("/")

with tempfile.TemporaryDirectory() as temp_dir:
    audio = Path(temp_dir) / "probe.wav"
    subprocess.run(
        ["espeak-ng", "-w", str(audio), "Perform AI transcription probe. Open clearly, then close now."],
        check=True,
    )
    audio_base64 = base64.b64encode(audio.read_bytes()).decode("ascii")

    input_payload = {
        "audioBase64": audio_base64,
        "mimeType": "audio/wav",
        "expectedText": "Perform AI transcription probe. Open clearly, then close now.",
        "sections": ["Perform AI transcription probe.", "Open clearly, then close now."],
        "fillerWords": ["um", "uh"],
        "retries": {},
        "revealed": [],
    }
    request_body = json.dumps({"0": {"json": input_payload}})

    errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        page = browser.new_page()
        page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"{origin}/app/", wait_until="networkidle")
        result = page.evaluate(
            """async ({ api, body }) => {
              const response = await fetch(`${api}/api/trpc/rehearsal.transcribeAndAnalyze?batch=1`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body,
              });
              return { status: response.status, payload: await response.json() };
            }""",
            {"api": api, "body": request_body},
        )
        browser.close()

item = result.get("payload", [{}])[0]
analysis = item.get("result", {}).get("data", {}).get("json") or item.get("result", {}).get("data")
if result.get("status") != 200 or not isinstance(analysis, dict) or not analysis.get("transcript"):
    raise SystemExit(json.dumps({"result": result, "errors": errors}, indent=2))
if "perform ai transcription probe" not in analysis["transcript"].lower():
    raise SystemExit(json.dumps({"analysis": analysis, "errors": errors}, indent=2))
if errors:
    raise SystemExit(json.dumps({"analysis": analysis, "errors": errors}, indent=2))

print(json.dumps({
    "origin": origin,
    "transcript": analysis["transcript"],
    "accuracyPercent": analysis.get("accuracyPercent"),
    "spokenWpm": analysis.get("spokenWpm"),
    "consoleErrors": errors,
}, indent=2))
