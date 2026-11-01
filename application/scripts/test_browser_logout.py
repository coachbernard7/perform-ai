#!/usr/bin/env python3
"""Verify a real private account can log in and use the universal logout control."""
import os
from playwright.sync_api import sync_playwright

base = os.environ.get("PERFORM_AI_LOGOUT_URL", "https://4198-i3qm4qhwmo7dq531qbqfx-dcfe856d.us1.manus.computer").rstrip("/")
password = os.environ["PERFORM_AI_TEST_PASSWORD"]
errors: list[str] = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    context = browser.new_context()
    page = context.new_page()
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(f"{base}/app/login", wait_until="networkidle")
    inputs = page.locator("input")
    inputs.nth(0).fill("CoachBernard")
    inputs.nth(1).fill(password)
    page.get_by_role("button", name="Log in", exact=True).click()
    page.get_by_role("button", name="Log out", exact=True).wait_for(timeout=10000)
    visible_before = page.get_by_role("button", name="Log out", exact=True).is_visible()
    page.get_by_role("button", name="Log out", exact=True).click()
    page.wait_for_url("**/app/login", timeout=10000)
    page.get_by_role("button", name="Log in", exact=True).wait_for(timeout=10000)
    authenticated_after = page.evaluate("""async () => {
      const response = await fetch('/app/account-auth.php?action=status', { credentials: 'include' });
      return (await response.json()).authenticated;
    }""")
    visible_after = page.get_by_role("button", name="Log out", exact=True).count() > 0 and page.get_by_role("button", name="Log out", exact=True).is_visible()
    browser.close()

if not visible_before or visible_after or authenticated_after or errors:
    raise SystemExit(f"logout check failed: visible_before={visible_before}, visible_after={visible_after}, authenticated_after={authenticated_after}, errors={errors}")
print("Browser login and universal logout verification: PASS")
