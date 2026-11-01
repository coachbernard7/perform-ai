#!/usr/bin/env python3
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:4178/app/"
OUT = "/home/ubuntu/speech-rehearser-minimal-landing.png"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="domcontentloaded", timeout=60000)
    page.get_by_text("Private rehearsal.", exact=True).wait_for(timeout=30000)
    page.screenshot(path=OUT, full_page=False)
    browser.close()
