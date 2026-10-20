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

    student_token = get_demo_token("student")
    page.goto(FRONTEND_URL)
    page.evaluate("(t) => { localStorage.setItem('toeic_token', t); }", student_token)

    # 1. Listening practice
    page.goto(f"{FRONTEND_URL}/practice/listening", wait_until="networkidle")
    time.sleep(2)
    out_listen = SCREENSHOTS_DIR / "02_student" / "04_luyen_nghe_part1_4.png"
    page.screenshot(path=str(out_listen))
    print("Recaptured:", out_listen)

    # 2. Reading practice
    page.goto(f"{FRONTEND_URL}/practice/reading", wait_until="networkidle")
    time.sleep(2)
    out_read = SCREENSHOTS_DIR / "02_student" / "05_luyen_doc_part5_7.png"
    page.screenshot(path=str(out_read))
    print("Recaptured:", out_read)

    # 3. Guest vocabulary & grammar if needed
    page.evaluate("() => { localStorage.clear(); }")
    page.goto(f"{FRONTEND_URL}/practice/vocabulary", wait_until="networkidle")
    time.sleep(1.5)
    page.screenshot(path=str(SCREENSHOTS_DIR / "01_guest" / "05_kho_tu_vung.png"))

    browser.close()
print("Recapture complete!")
