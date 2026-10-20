import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx

for chunk in ['WritingPart1Image-CwSJhcqY.js', 'useWritingPart2-Cx-3DznG.js']:
    r = httpx.get(f"https://dauenglish.com/assets/{chunk}", timeout=15)
    print(f"=== {chunk} ===")
    print(r.text[:2000])
