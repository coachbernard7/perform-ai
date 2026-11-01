#!/usr/bin/env python3
import json
import time
from pathlib import Path

from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:4176/"
OUT = Path("/home/ubuntu/speech-presentation-rehearser/docs")
OUT.mkdir(parents=True, exist_ok=True)
FRAME_A = OUT / "matrix-rain-frame-a.png"
FRAME_B = OUT / "matrix-rain-frame-b.png"
REPORT = OUT / "matrix-rain-motion.json"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_selector("text=Speech Rehearser", timeout=30000)
    page.evaluate(
        """
        () => {
          const key = 'spr-core-state-v1';
          const current = JSON.parse(localStorage.getItem(key) || '{"scripts":[],"sessions":[],"settings":{}}');
          current.settings = { ...current.settings, theme: 'matrix', reduceMotion: false, focusMode: false, fillerWords: ['um', 'uh', 'erm'] };
          localStorage.setItem(key, JSON.stringify(current));
        }
        """
    )
    page.reload(wait_until="domcontentloaded", timeout=60000)
    page.wait_for_selector('[data-testid="matrix-column-0"]', timeout=15000)
    count = page.locator('[data-testid^="matrix-column-"]').count()
    before = page.locator('[data-testid^="matrix-column-"]').evaluate_all(
        "nodes => nodes.slice(0, 8).map(node => getComputedStyle(node).transform)"
    )
    page.screenshot(path=str(FRAME_A), full_page=False)
    time.sleep(4.2)
    after = page.locator('[data-testid^="matrix-column-"]').evaluate_all(
        "nodes => nodes.slice(0, 8).map(node => getComputedStyle(node).transform)"
    )
    page.screenshot(path=str(FRAME_B), full_page=False)
    browser.close()

first = Image.open(FRAME_A).convert("RGB")
second = Image.open(FRAME_B).convert("RGB")
difference = ImageChops.difference(first, second)
changed_bbox = difference.getbbox()
changed_columns = sum(a != b for a, b in zip(before, after))
report = {
    "viewport": [390, 844],
    "columnCount": count,
    "sampledColumns": len(before),
    "changedSampledColumns": changed_columns,
    "framesDiffer": changed_bbox is not None,
    "beforeTransforms": before,
    "afterTransforms": after,
}
REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
if count < 9 or changed_columns < 7 or changed_bbox is None:
    raise SystemExit("Matrix rain motion verification failed")
