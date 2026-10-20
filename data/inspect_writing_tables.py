import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import re

for chunk in ['WritingPart1Image-CwSJhcqY.js', 'useWritingPart2-Cx-3DznG.js']:
    r = httpx.get(f"https://dauenglish.com/assets/{chunk}", timeout=15)
    print(f"=== {chunk} ===")
    matches = re.findall(r"\.from\(['\"]([a-zA-Z0-9_\-]+)['\"]\)", r.text)
    print("Tables:", set(matches))
    for m in re.finditer(r"\.from\(['\"]([a-zA-Z0-9_\-]+)['\"]\)", r.text):
        idx = m.start()
        print("Context:", r.text[idx:idx+150])
