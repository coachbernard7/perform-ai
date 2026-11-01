#!/usr/bin/env python3
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4182"
REPORT = Path("/home/ubuntu/perform-ai-device-layout-report.json")
results = {}
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    for name, width, height in [("phone", 390, 844), ("ipad", 834, 1194)]:
        page = browser.new_page(viewport={"width": width, "height": height})
        page.goto(f"{BASE}/", wait_until="networkidle")
        root_width = page.evaluate("document.documentElement.scrollWidth")
        page.get_by_role("link", name="Open app").first.click()
        page.wait_for_timeout(1000)
        app_width = page.evaluate("document.documentElement.scrollWidth")
        page.screenshot(path=f"/home/ubuntu/perform-ai-{name}-app-final.png", full_page=True)
        results[name] = {
            "viewport": f"{width}x{height}",
            "root_no_horizontal_overflow": root_width <= width + 1,
            "app_no_horizontal_overflow": app_width <= width + 1,
            "visitor_preview_visible": page.get_by_text("Visitor preview", exact=True).count() > 0,
        }
        page.close()
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.goto(f"{BASE}/app/", wait_until="networkidle")
    page.wait_for_timeout(500)
    manifest = page.locator('link[rel="manifest"]').count() > 0
    service_worker_script = page.locator('script').evaluate_all("nodes => nodes.some(node => node.textContent.includes('serviceWorker.register'))")
    results["pwa"] = {"manifest_link_present": manifest, "service_worker_registration_present": service_worker_script}
    page.close()
    browser.close()

REPORT.write_text(json.dumps(results, indent=2))
required = [
    results["phone"]["root_no_horizontal_overflow"], results["phone"]["app_no_horizontal_overflow"],
    results["ipad"]["root_no_horizontal_overflow"], results["ipad"]["app_no_horizontal_overflow"],
    results["phone"]["visitor_preview_visible"], results["ipad"]["visitor_preview_visible"],
    results["pwa"]["manifest_link_present"], results["pwa"]["service_worker_registration_present"],
]
if not all(required):
    raise SystemExit(f"Device layout/PWA check failed: {results}")
print("Phone and iPad browser-emulation layout plus PWA shell checks passed.")
