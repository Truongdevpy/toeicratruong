import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
from bs4 import BeautifulSoup
import re

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
}

def scan_section(base_url, section_name):
    print(f"=== Scanning {section_name}: {base_url} ===")
    page = 1
    tests = {}
    with httpx.Client(headers=headers, follow_redirects=True, timeout=20) as client:
        while True:
            url = f"{base_url}?page={page}" if page > 1 else base_url
            r = client.get(url)
            if r.status_code != 200:
                break
            soup = BeautifulSoup(r.text, "html.parser")
            # find all test links
            page_tests = 0
            for a in soup.find_all("a", href=True):
                href = a.get("href")
                m = re.match(r"^/tests/(\d+)/([^/]+)/?", href)
                if m:
                    tid, slug = m.group(1), m.group(2)
                    title = a.text.strip() or slug
                    if tid not in tests:
                        tests[tid] = {
                            "test_id": tid,
                            "slug": slug,
                            "name": title,
                            "url": f"https://study4.com/tests/{tid}/{slug}/"
                        }
                        page_tests += 1
            print(f"  Page {page}: found {page_tests} new tests (total so far: {len(tests)})")
            
            # Check if there is next page
            next_page = soup.find("a", href=re.compile(rf"[?&]page={page+1}"))
            if not next_page:
                # Also check max page numbers in pagination
                pages = [int(m.group(1)) for a in soup.find_all("a", href=True) if (m := re.search(r"[?&]page=(\d+)", a.get("href")))]
                if not pages or page >= max(pages):
                    break
            page += 1
            if page > 50:
                break
    print(f"Total {section_name} tests: {len(tests)}")
    return tests

lr_tests = scan_section("https://study4.com/tests/toeic/", "TOEIC Listening & Reading")
sw_tests = scan_section("https://study4.com/tests/toeic-sw/", "TOEIC Speaking & Writing")

import json
with open("study4_discovered_catalog.json", "w", encoding="utf-8") as f:
    json.dump({"lr_tests": lr_tests, "sw_tests": sw_tests}, f, ensure_ascii=False, indent=2)
print("Saved discovery catalog to study4_discovered_catalog.json")
