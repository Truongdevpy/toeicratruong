import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import re

base = "https://dauenglish.com"
r_index = httpx.get(f"{base}/assets/index-laDVicvl.js", timeout=15)
chunks = set(re.findall(r'assets/[a-zA-Z0-9_\-]+\.js', r_index.text))

found = []
for c in chunks:
    try:
        res = httpx.get(f"{base}/{c}", timeout=10)
        t = res.text
        if "mock-test" in t or "supabase" in t:
            # Look for storage url construction
            for m in re.finditer(r'([^;{()]+(?:storage|mock-test|audio_url|image_url)[^;{})]+)', t):
                match_str = m.group(0)
                if any(x in match_str for x in ["getPublicUrl", "mock-test-media", "storage.from", "audio_url", "image_url"]):
                    found.append((c, match_str[:200]))
    except Exception as e:
        pass

for c, s in found[:20]:
    print(f"[{c}] -> {s.strip()}")
