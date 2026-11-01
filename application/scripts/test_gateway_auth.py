#!/usr/bin/env python3
import json
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("PERFORM_AI_TEST_URL", "http://127.0.0.1:4182")
PASSWORD = os.environ["PERFORM_AI_TEST_PASSWORD"]
REPORT = Path("/home/ubuntu/perform-ai-auth-smoke.json")

report = {"landing": False, "visitor_preview": False, "password_visibility": False, "login": False, "private_library": False, "logout_gate": False, "registration": False, "plan_selection": False, "welcome": False, "console_errors": []}
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.on("console", lambda message: report["console_errors"].append(message.text) if message.type == "error" else None)

    page.goto(f"{BASE}/", wait_until="networkidle")
    report["landing"] = page.get_by_role("link", name="Open app").count() >= 1
    page.get_by_role("link", name="Open app").first.click()
    page.wait_for_timeout(1200)
    report["visitor_preview"] = page.get_by_text("Visitor preview", exact=True).count() > 0

    page.get_by_text("Log in", exact=True).first.click()
    page.locator("input").nth(0).fill("coachbernard")
    password_input = page.locator("input").nth(1)
    password_input.fill(PASSWORD)
    page.get_by_role("button", name="Show password").click()
    visible = page.get_by_text(f"Visible password: {PASSWORD}", exact=True).count() == 1
    page.get_by_role("button", name="Hide password").click()
    hidden = password_input.get_attribute("type") == "password"
    report["password_visibility"] = visible and hidden
    page.get_by_role("button", name="Log in", exact=True).last.click()
    page.wait_for_timeout(800)
    report["login"] = page.get_by_text("Logged in as Coach Bernard").count() > 0

    page.goto(f"{BASE}/app/files", wait_until="networkidle")
    report["private_library"] = page.get_by_text("Your scripts", exact=True).count() > 0

    page.goto(f"{BASE}/app/profile", wait_until="networkidle")
    page.get_by_role("button", name="Log out").click()
    page.wait_for_timeout(500)
    page.goto(f"{BASE}/app/files", wait_until="networkidle")
    report["logout_gate"] = page.get_by_text("Your private library is locked.").count() > 0

    stamp = str(int(time.time() * 1000))[-8:]
    page.goto(f"{BASE}/app/register", wait_until="networkidle")
    page.get_by_placeholder("Your name").fill("Registration Test")
    page.get_by_placeholder("lowercase username").fill(f"trial{stamp}")
    page.get_by_placeholder("you@example.com").fill(f"trial{stamp}@example.com")
    registration_password = page.get_by_placeholder("At least 10 characters")
    registration_password.fill("RegistrationTest#2026")
    page.get_by_role("button", name="Show password").click()
    registration_visible = page.get_by_text("Visible password: RegistrationTest#2026", exact=True).count() == 1
    page.get_by_role("button", name="Hide password").click()
    registration_hidden = registration_password.get_attribute("type") == "password"
    page.get_by_text("Pro", exact=True).click()
    page.get_by_role("button", name="Create account", exact=True).click()
    page.wait_for_timeout(900)
    report["registration"] = page.get_by_text("Welcome back,", exact=False).count() > 0
    report["welcome"] = page.get_by_text("Registration.", exact=False).count() > 0
    report["password_visibility"] = report["password_visibility"] and registration_visible and registration_hidden
    page.goto(f"{BASE}/app/profile", wait_until="networkidle")
    profile_text = page.locator("body").inner_text()
    report["profile_text"] = profile_text
    report["plan_selection"] = "PLAN PENDING" in profile_text and "Selected plan: PRO." in profile_text

    browser.close()

REPORT.write_text(json.dumps(report, indent=2))
required = ["landing", "visitor_preview", "password_visibility", "login", "private_library", "logout_gate", "registration", "plan_selection", "welcome"]
if not all(report[key] for key in required):
    raise SystemExit(f"Gateway auth smoke failed: {report}")
if report["console_errors"]:
    raise SystemExit(f"Gateway auth smoke has browser console errors: {report['console_errors']}")
print("Landing gateway, password visibility, login, registration, plan selection, welcome, private route, and logout checks passed.")
