#!/usr/bin/env python3
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("PERFORM_AI_QA_URL", "http://127.0.0.1:4193")
OUT = Path("/home/ubuntu/perform-ai-four-theme-qa.json")
LANDING = Path("/home/ubuntu/perform-ai-four-theme-landing.png")
APP = Path("/home/ubuntu/perform-ai-four-theme-app.png")
report = {"landingThemes": [], "appThemeButtons": 0, "brandBelowTopInset": False, "iconVisible": False, "errors": []}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    page = context.new_page()
    page.on("pageerror", lambda error: report["errors"].append(str(error)))
    page.goto(BASE + "/", wait_until="domcontentloaded", timeout=60000)
    page.get_by_role("heading", name="Perform when it matters.").wait_for(timeout=15000)
    for name, expected in [("Blue with green rain", "blue"), ("Black with light blue", "black-blue"), ("White with black and blue", "white"), ("Black and gold", "black-gold")]:
        page.get_by_role("button", name=name).click()
        if page.locator("html").get_attribute("data-theme") == expected:
            report["landingThemes"].append(expected)
    page.get_by_role("button", name="Blue with green rain").click()
    page.screenshot(path=str(LANDING), full_page=False)

    app = context.new_page()
    app.goto(BASE + "/app/", wait_until="domcontentloaded", timeout=60000)
    app.get_by_text("Private rehearsal.").wait_for(timeout=30000)
    report["appThemeButtons"] = app.get_by_role("toolbar", name="Colour themes").get_by_role("button").count()
    brand = app.get_by_text("PERFORM AI").last
    box = brand.bounding_box()
    # Browser emulation has no native iPhone safe inset. SafeAreaView adds it at runtime.
    report["brandBelowTopInset"] = box is not None and box["y"] >= 80
    icon = app.locator('img[src*="icon"]').first
    report["iconVisible"] = icon.is_visible()
    app.screenshot(path=str(APP), full_page=False)
    browser.close()

OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
if report["landingThemes"] != ["blue", "black-blue", "white", "black-gold"] or report["appThemeButtons"] != 4 or not report["brandBelowTopInset"] or not report["iconVisible"] or report["errors"]:
    raise SystemExit("Four-theme visual QA failed")
