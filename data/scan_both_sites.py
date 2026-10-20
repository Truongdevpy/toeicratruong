import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import re
from bs4 import BeautifulSoup

for site in ["https://dauenglish.com", "https://dautoeic.vn"]:
    try:
        r = httpx.get(site, follow_redirects=True, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        scripts = [s.get("src") for s in soup.find_all("script") if s.get("src") and "_next" in s.get("src")]
        print(f"{site} -> found {len(scripts)} scripts")
        all_from = set()
        for s in scripts:
            url = site + s if s.startswith("/") else s
            try:
                res = httpx.get(url, timeout=15)
                matches = re.findall(r"\.from\(['\"]([a-zA-Z0-9_\-]+)['\"]", res.text)
                all_from.update(matches)
            except Exception as e:
                pass
        print(f"{site} tables: {sorted(all_from)}")
    except Exception as e:
        print(f"{site} error: {e}")
