# -*- coding: utf-8 -*-
import sys
import time
import json
import urllib.request
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

    # 1. Student Practice Room
    student_token = get_demo_token("student")
    page.goto(FRONTEND_URL)
    page.evaluate("(t) => { localStorage.setItem('toeic_token', t); }", student_token)
    page.goto(f"{FRONTEND_URL}/practice/listening", wait_until="networkidle")
    time.sleep(2)
    btn = page.locator("button:has-text('Học ngay')").first
    print("Found practice button:", btn.is_visible())
    if btn.is_visible():
        btn.click()
        time.sleep(3)
        out1 = SCREENSHOTS_DIR / "02_student" / "20_phong_luyen_tap_song_ngu_tap_trung.png"
        page.screenshot(path=str(out1))
        print("Captured 20:", out1)

    # 2. VIP Mock Test Room
    vip_token = get_demo_token("vip")
    page.goto(FRONTEND_URL)
    page.evaluate("(t) => { localStorage.setItem('toeic_token', t); }", vip_token)
    page.goto(f"{FRONTEND_URL}/mock-tests", wait_until="networkidle")
    time.sleep(2)
    thi_thu = page.locator("button:has-text('Thi thử')").first
    print("Found Thi thu button:", thi_thu.is_visible())
    if thi_thu.is_visible():
        thi_thu.click()
        time.sleep(2)
        # Inside modal, click Bat dau
        start_btn = page.locator("button:has-text('Bắt đầu')").first
        print("Found Bat dau button:", start_btn.is_visible())
        if start_btn.is_visible():
            start_btn.click()
            time.sleep(3.5)
            out2 = SCREENSHOTS_DIR / "03_vip" / "05_phong_thi_thuc_te_ets_full_test.png"
            page.screenshot(path=str(out2))
            print("Captured 05:", out2)

    browser.close()
print("Done!")
