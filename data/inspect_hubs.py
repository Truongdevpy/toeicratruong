import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import re

chunks = [
    "ListenHub-Z4q67c5u.js",
    "ReadHub-B1Lyz0Lb.js",
    "SpeakHub-DRg4tVU7.js",
    "WriteHub-BV_mka8U.js",
    "ReadingHome-DqtWThTN.js"
]

for ch in chunks:
    url = f"https://dauenglish.com/assets/{ch}"
    print(f"=== {ch} ===")
    try:
        txt = httpx.get(url, timeout=15).text
        from_matches = re.findall(r'\.from\(["\']([a-zA-Z0-9_\-]+)["\']\)', txt)
        print("Tables:", set(from_matches))
        rpc_matches = re.findall(r'\.rpc\(["\']([a-zA-Z0-9_\-]+)["\']', txt)
        print("RPCs:", set(rpc_matches))
        # Look for fetch or api urls
        fetch_matches = re.findall(r'fetch\(["\']([^"\']+)["\']', txt)
        print("Fetches:", set(fetch_matches))
    except Exception as e:
        print("Error:", e)
