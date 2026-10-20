import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import re

base = "https://dauenglish.com"
r_index = httpx.get(f"{base}/assets/index-laDVicvl.js", timeout=15)

# Find any asset mentioning mock-test or storage or audio_url
chunks = set(re.findall(r'assets/[a-zA-Z0-9_\-]+\.js', r_index.text))

for c in sorted(chunks):
    try:
        res = httpx.get(f"{base}/{c}", timeout=10)
        t = res.text
        if "mock-test" in t or "mock_test" in t or "audio_url" in t:
            print(f"Match in {c}:")
            for m in re.finditer(r"(https://[^\s\"']+|supabase[^\s\"']+|\.storage[^\s\"']+|mock-test[^\s\"']+)", t):
                val = m.group(0)
                if len(val) < 150:
                    print("  ", val)
    except Exception as e:
        pass
