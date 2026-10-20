import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
from bs4 import BeautifulSoup
import re

url_lr = "https://study4.com/tests/toeic/"
url_sw = "https://study4.com/tests/toeic-sw/"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
}

with httpx.Client(headers=headers, follow_redirects=True, timeout=20) as client:
    r_lr = client.get(url_lr)
    print(f"TOEIC LR status: {r_lr.status_code}, len: {len(r_lr.text)}")
    soup_lr = BeautifulSoup(r_lr.text, "html.parser")
    test_links = [a.get("href") for a in soup_lr.find_all("a", href=True) if re.search(r"/tests/\d+/", a.get("href"))]
    print(f"Found {len(test_links)} test links on page 1 of LR. Samples: {test_links[:5]}")
    
    r_sw = client.get(url_sw)
    print(f"TOEIC SW status: {r_sw.status_code}, len: {len(r_sw.text)}")
    soup_sw = BeautifulSoup(r_sw.text, "html.parser")
    sw_links = [a.get("href") for a in soup_sw.find_all("a", href=True) if re.search(r"/tests/\d+/", a.get("href"))]
    print(f"Found {len(sw_links)} test links on page 1 of SW. Samples: {sw_links[:5]}")
    
    if test_links:
        sample_test = "https://study4.com" + test_links[0]
        print(f"\nFetching sample test page: {sample_test}")
        r_test = client.get(sample_test)
        print(f"Test page status: {r_test.status_code}, len: {len(r_test.text)}")
        soup_t = BeautifulSoup(r_test.text, "html.parser")
        # Check buttons, forms, actions, links
        forms = soup_t.find_all("form")
        print(f"Found {len(forms)} forms:")
        for f in forms:
            print("  Form action:", f.get("action"), "method:", f.get("method"), "inputs:", [i.get("name") for i in f.find_all("input")])
        buttons = [b.get("href") or b.get("onclick") or b.text.strip() for b in soup_t.find_all(["a", "button"]) if any(k in b.text.lower() for k in ["luyện tập", "làm bài", "thi thử", "full test", "start"])]
        print(f"Action buttons: {buttons[:10]}")
