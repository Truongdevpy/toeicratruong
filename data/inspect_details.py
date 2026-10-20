import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import re

for chunk in ['SpeakHub-DRg4tVU7.js', 'WriteHub-BV_mka8U.js', 'ComingSoonSkill-B3LiWo_z.js', 'ListeningPracticeLoader-DxCPXPVJ.js', 'ReadingHome-DqtWThTN.js']:
    r = httpx.get(f"https://dauenglish.com/assets/{chunk}", timeout=15)
    print(f"=== {chunk} ===")
    froms = re.findall(r"\.from\(['\"]([a-zA-Z0-9_\-]+)['\"]", r.text)
    rpcs = re.findall(r"\.rpc\(['\"]([a-zA-Z0-9_\-]+)['\"]", r.text)
    print("Tables:", set(froms))
    print("RPCs:", set(rpcs))
    # Print occurrences of table queries with select
    selects = re.findall(r"\.from\(['\"]([a-zA-Z0-9_\-]+)['\"]\)\.select\(([^)]+)\)", r.text)
    print("Selects:", selects[:5])
