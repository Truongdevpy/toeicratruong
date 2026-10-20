import sys
sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("https://study4.com/", timeout=30000)
    page.wait_for_timeout(3000)
    links = page.query_selector_all("a")
    for a in links:
        text = a.inner_text().strip()
        href = a.get_attribute("href") or ""
        if any(k in text.lower() for k in ["đăng nhập", "đăng ký", "login", "register", "sign in", "sign up"]):
            print(f"Auth link: text={text!r}, href={href!r}, class={a.get_attribute('class')}")
    browser.close()
