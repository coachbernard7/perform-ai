#!/usr/bin/env python3
"""Verify that a fresh browser profile can load and reload the exported PWA app."""
import json
import os
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

base = os.environ.get("PERFORM_AI_PWA_URL", "http://127.0.0.1:4194").rstrip("/")
requires_worker = urlparse(base).scheme == "https"
errors: list[str] = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    context = browser.new_context()
    page = context.new_page()
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(str(error)))

    page.goto(f"{base}/app/", wait_until="networkidle")
    page.wait_for_timeout(1200)
    initial_text = page.locator("body").inner_text()
    if requires_worker:
        page.wait_for_function("""async () => {
          const registration = await navigator.serviceWorker.getRegistration('/app/');
          return Boolean(registration?.active);
        }""", timeout=15000)
    worker = page.evaluate("""async () => {
      if (!('serviceWorker' in navigator)) return { supported: false };
      const registration = await navigator.serviceWorker.getRegistration('/app/');
      return { supported: true, active: registration?.active?.scriptURL ?? null };
    }""")
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(800)
    reloaded_text = page.locator("body").inner_text()
    bundle = page.locator("script[src*='_expo/static/js/web/entry-']").get_attribute("src")
    bundle_check = page.evaluate("""async (src) => {
      const response = await fetch(src, { cache: 'reload' });
      const opening = (await response.text()).slice(0, 80);
      return { ok: response.ok, contentType: response.headers.get('content-type'), opening };
    }""", bundle)
    browser.close()

result = {
    "initialRendered": "PERFORM AI" in initial_text,
    "reloadRendered": "PERFORM AI" in reloaded_text,
    "serviceWorker": worker,
    "bundle": bundle,
    "bundleCheck": bundle_check,
    "errors": errors,
}
print(json.dumps(result, indent=2))
if not result["initialRendered"] or not result["reloadRendered"]:
    raise SystemExit("PERFORM AI did not render before and after PWA reload.")
if not bundle_check["ok"] or "javascript" not in (bundle_check["contentType"] or "").lower() or bundle_check["opening"].lstrip().startswith("<"):
    raise SystemExit("The app bundle did not return JavaScript.")
if any("Response body is already used" in error or "Unexpected token '<'" in error for error in errors):
    raise SystemExit("The PWA reload generated a stale-cache console error.")
if requires_worker and not worker.get("active"):
    raise SystemExit("The HTTPS deployment did not activate its service worker.")
if not requires_worker and worker.get("active"):
    raise SystemExit("The local HTTP test unexpectedly registered a service worker.")
