# -*- coding: utf-8 -*-
import sys, time, json, urllib.request
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

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
    page = browser.new_page()
    token = get_demo_token("student")
    page.goto(FRONTEND_URL)
    page.evaluate("(t) => { localStorage.setItem('toeic_token', t); }", token)
    page.goto(f"{FRONTEND_URL}/practice/listening", wait_until="networkidle")
    time.sleep(2)
    print("Page URL:", page.url)
    print("Main text:", page.locator("main").inner_text()[:300])
    browser.close()
