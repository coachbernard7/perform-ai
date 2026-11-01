#!/usr/bin/env python3
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("PERFORM_AI_TEST_URL", "http://127.0.0.1:4186").rstrip("/")
PASSWORD = os.environ["PERFORM_AI_TEST_PASSWORD"]
OUT = Path("/home/ubuntu/perform-ai-admin-subscription-smoke.json")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844})
    report = {"admin_login": False, "dashboard": False, "cycle_control": False, "public_catalogue": False, "console_errors": []}
    page.on("console", lambda message: report["console_errors"].append(message.text) if message.type == "error" else None)

    page.goto(f"{BASE}/app/login", wait_until="networkidle")
    page.get_by_placeholder("name or email").fill("ADMIN@BECCTV.CO.UK")
    page.get_by_placeholder("Password").fill(PASSWORD)
    page.get_by_role("button", name="Log in").click()
    page.wait_for_url(f"{BASE}/app/", timeout=20000)
    report["admin_login"] = page.get_by_text("Welcome back,", exact=False).count() > 0

    page.get_by_role("tab", name="Profile").click()
    page.get_by_role("button", name="Subscription administration").click()
    page.wait_for_timeout(500)
    report["dashboard"] = page.get_by_text("Subscription settings", exact=True).count() == 1
    before = page.get_by_text("per annual", exact=True).count()
    page.get_by_text("per annual", exact=True).first.click()
    page.wait_for_timeout(150)
    report["cycle_control"] = before == 5 and page.get_by_text("per weekly", exact=True).count() == 1
    browser.close()

OUT.write_text(json.dumps(report, indent=2))
if not all([report["admin_login"], report["dashboard"], report["cycle_control"]]) or report["console_errors"]:
    raise SystemExit(1)
print("Administrator subscription dashboard login and billing-cycle control passed.")
