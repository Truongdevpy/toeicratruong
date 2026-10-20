import httpx
import re
from bs4 import BeautifulSoup

base = "https://dautoeic.vn"
r = httpx.get(base, follow_redirects=True, timeout=20)
soup = BeautifulSoup(r.text, "html.parser")
scripts = [s.get("src") for s in soup.find_all("script") if s.get("src") and s.get("src").startswith("/_next/")]

print(f"Found {len(scripts)} scripts on dautoeic.vn")
all_from = set()
all_rpc = set()
all_storage = set()
all_endpoints = set()

for s in scripts:
    url = base + s
    try:
        res = httpx.get(url, timeout=15)
        js = res.text
        all_from.update(re.findall(r"\.from\(['\"]([a-zA-Z0-9_\-]+)['\"]", js))
        all_rpc.update(re.findall(r"\.rpc\(['\"]([a-zA-Z0-9_\-]+)['\"]", js))
        all_storage.update(re.findall(r"\.storage\.from\(['\"]([a-zA-Z0-9_\-]+)['\"]", js))
        # Look for supabase URLs or keys
        keys = re.findall(r"sb_publishable_[a-zA-Z0-9_\-]+", js)
        if keys:
            print("Found keys in", s, keys)
        supa_urls = re.findall(r"https://[a-zA-Z0-9_\-]+\.supabase\.co", js)
        if supa_urls:
            print("Found supabase url in", s, supa_urls)
    except Exception as e:
        print(f"Error {s}: {e}")

print("All .from tables on dautoeic.vn:", sorted(all_from))
print("All .rpc on dautoeic.vn:", sorted(all_rpc))
print("All storage buckets on dautoeic.vn:", sorted(all_storage))
