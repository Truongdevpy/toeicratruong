import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx

for chunk in ['SpeakHub-DRg4tVU7.js', 'ComingSoonSkill-B3LiWo_z.js']:
    r = httpx.get(f"https://dauenglish.com/assets/{chunk}", timeout=15)
    print(f"=== {chunk} ===")
    print(r.text)
