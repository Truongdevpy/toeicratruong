# -*- coding: utf-8 -*-
import sys, time, json, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent.parent
SCREENSHOTS_DIR = BASE_DIR / "screenshots"
BACKEND_URL = "http://127.0.0.1:8001"
FRONTEND_URL = "http://127.0.0.1:5173"

def get_demo_token(role: str) -> str:
    url = f"{BACKEND_URL}/api/auth/demo"
    data = json.dumps({"role": role}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8")).get("access_token", "")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.25)
    page = ctx.new_page()

    vip_token = get_demo_token("vip")
    page.goto(FRONTEND_URL)
    page.evaluate("(t) => { localStorage.setItem('toeic_token', t); }", vip_token)
    page.goto(f"{FRONTEND_URL}/mock-tests", wait_until="networkidle")
    time.sleep(2)

    thi_thu = page.get_by_role("button", name="Thi thử").first
    print("Found Thi thu:", thi_thu.is_visible())
    thi_thu.scroll_into_view_if_needed()
    thi_thu.click()
    time.sleep(1.5)

    # In modal: find 'Bắt đầu'
    start_btn = page.locator("div.fixed button:has-text('Bắt đầu')").first
    print("Found start btn:", start_btn.is_visible())
    start_btn.click()
    time.sleep(3)

    out = SCREENSHOTS_DIR / "03_vip" / "05_phong_thi_thuc_te_ets_full_test.png"
    page.screenshot(path=str(out))
    print("Captured:", out)

    browser.close()
