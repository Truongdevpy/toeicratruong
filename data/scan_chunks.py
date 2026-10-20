import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import re

base = "https://dauenglish.com"
r = httpx.get(f"{base}/assets/index-laDVicvl.js", timeout=20)
index_js = r.text

chunks = set(re.findall(r'assets/[a-zA-Z0-9_\-]+\.js', index_js))
print(f"Found {len(chunks)} chunks referenced in index-*.js")

all_from = set()
for chunk in chunks:
    try:
        res = httpx.get(f"{base}/{chunk}", timeout=15)
        matches = re.findall(r'\.from\(["\']([a-zA-Z0-9_\-]+)["\']\)', res.text)
        if matches:
            all_from.update(matches)
            print(f"  {chunk} -> {matches}")
    except Exception as e:
        pass

print("\nALL Supabase tables referenced across all frontend chunks:")
for t in sorted(all_from):
    print(f"  - {t}")
