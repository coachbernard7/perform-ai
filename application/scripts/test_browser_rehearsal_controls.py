#!/usr/bin/env python3
"""Exercise recording pause/resume and take review through the production web UI."""
import os
import subprocess
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

base = os.environ.get("PERFORM_AI_REHEARSAL_URL", "https://4200-i3qm4qhwmo7dq531qbqfx-dcfe856d.us1.manus.computer").rstrip("/")
password = os.environ["PERFORM_AI_TEST_PASSWORD"]
errors: list[str] = []

with tempfile.TemporaryDirectory() as temporary:
    fake_audio = Path(temporary) / "fake-microphone.wav"
    subprocess.run(["espeak-ng", "-w", str(fake_audio), "This is a recorded rehearsal take for playback review."], check=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path="/usr/bin/chromium",
            args=[
                "--no-sandbox",
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                f"--use-file-for-fake-audio-capture={fake_audio}",
            ],
        )
        context = browser.new_context(permissions=["microphone"])
        page = context.new_page()
        page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: errors.append(str(error)))

        page.goto(f"{base}/app/login", wait_until="networkidle")
        fields = page.locator("input")
        fields.nth(0).fill("CoachBernard")
        fields.nth(1).fill(password)
        page.get_by_role("button", name="Log in", exact=True).click()
        page.get_by_role("button", name="Add private script", exact=True).wait_for(timeout=10000)
        page.get_by_role("button", name="Add private script", exact=True).click()

        form_fields = page.locator("input")
        form_fields.nth(0).fill("Recording control test")
        page.locator("textarea").fill("This short rehearsal proves that pause, pace, and take playback work clearly.")
        page.get_by_role("button", name="Save & rehearse", exact=True).click()
        page.get_by_text("SCRIPT PACE", exact=True).wait_for(timeout=10000)

        page.get_by_role("button", name="Slow pace, 80 words per minute", exact=True).click()
        page.get_by_text("80 WPM", exact=True).wait_for(timeout=5000)
        page.get_by_role("button", name="Record and analyse", exact=True).click()
        page.get_by_role("button", name="Pause recording", exact=True).wait_for(timeout=10000)
        page.wait_for_timeout(500)
        page.get_by_role("button", name="Pause recording", exact=True).click()
        page.get_by_role("button", name="Resume recording", exact=True).wait_for(timeout=5000)
        page.get_by_role("button", name="Resume recording", exact=True).click()
        page.get_by_role("button", name="Pause recording", exact=True).wait_for(timeout=5000)
        page.wait_for_timeout(500)
        page.get_by_role("button", name="Stop and review take", exact=True).click()
        page.get_by_text("REPLAY YOUR TAKE", exact=True).wait_for(timeout=10000)
        page.get_by_role("button", name="Play at 1 times speed, selected", exact=True).wait_for(timeout=5000)
        page.get_by_role("button", name="Play at 0.75 times speed", exact=True).click()
        page.get_by_role("button", name="Play at 0.75 times speed, selected", exact=True).wait_for(timeout=5000)
        page.get_by_role("button", name="Play recording", exact=True).click()
        page.get_by_role("button", name="Pause playback", exact=True).wait_for(timeout=10000)
        page.get_by_role("button", name="Pause playback", exact=True).click()
        page.get_by_role("button", name="Play recording", exact=True).wait_for(timeout=5000)
        browser.close()

if errors:
    raise SystemExit(f"browser errors: {errors}")
print("Browser pace, pause/resume, stopped-take replay, and playback-speed verification: PASS")
