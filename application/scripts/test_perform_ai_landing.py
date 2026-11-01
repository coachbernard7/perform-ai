#!/usr/bin/env python3
import json
import os
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = os.environ.get("PERFORM_AI_LANDING_URL", "http://127.0.0.1:4178/")
OUT = Path("/home/ubuntu/perform-ai-landing-qa.json")
report = {
    "landing": False,
    "blueGreenDefault": False,
    "themeSwitch": False,
    "greenRainMoved": False,
    "privateCopy": False,
    "consoleErrors": [],
    "pageErrors": [],
}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    page.on("console", lambda message: report["consoleErrors"].append(f"{message.text} @ {message.location.get('url', '')}") if message.type == "error" else None)
    page.on("pageerror", lambda error: report["pageErrors"].append(str(error)))
    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    page.get_by_role("heading", name="Perform when it matters.").wait_for(timeout=15000)
    body = page.locator("body").inner_text()
    report["landing"] = page.get_by_role("link", name="Open PERFORM AI").get_attribute("href") == "/app/"
    report["privateCopy"] = "Master Your Message" not in body and "Production smoke script" not in body and "Private scripts are not bundled" in body
    report["blueGreenDefault"] = page.locator("html").get_attribute("data-theme") == "blue"

    canvas = page.locator("#rain")
    before = canvas.evaluate("node => node.toDataURL()")
    time.sleep(0.35)
    after = canvas.evaluate("node => node.toDataURL()")
    report["greenRainMoved"] = before != after
    page.get_by_role("button", name="Black with light blue").click()
    black_blue = page.locator("html").get_attribute("data-theme") == "black-blue"
    page.get_by_role("button", name="White with black and blue").click()
    white = page.locator("html").get_attribute("data-theme") == "white"
    page.get_by_role("button", name="Black and gold").click()
    black_gold = page.locator("html").get_attribute("data-theme") == "black-gold"
    page.get_by_role("button", name="Blue with green rain").click()
    blue = page.locator("html").get_attribute("data-theme") == "blue"
    persisted = page.evaluate("() => localStorage.getItem('perform-ai-landing-theme')") == "blue"
    report["themeSwitch"] = black_blue and white and black_gold and blue and persisted
    browser.close()

OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
if not all([report["landing"], report["blueGreenDefault"], report["themeSwitch"], report["greenRainMoved"], report["privateCopy"], not report["consoleErrors"], not report["pageErrors"]]):
    raise SystemExit("PERFORM AI landing QA failed")
