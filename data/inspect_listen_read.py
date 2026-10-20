import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import re

for chunk in ['ListeningPracticeLoader-DxCPXPVJ.js', 'ReadingHome-DqtWThTN.js', 'SpeakHub-DRg4tVU7.js', 'WriteHub-BV_mka8U.js', 'ComingSoonSkill-B3LiWo_z.js']:
    r = httpx.get(f"https://dauenglish.com/assets/{chunk}", timeout=15)
    print(f"\n==================== {chunk} ====================")
    for m in re.finditer(r"\.from\(['\"]([a-zA-Z0-9_\-]+)['\"]\)", r.text):
        idx = m.start()
        print(r.text[idx:idx+200])
