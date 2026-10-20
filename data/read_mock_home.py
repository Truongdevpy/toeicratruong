import sys
sys.stdout.reconfigure(encoding="utf-8")
import re
from pathlib import Path

p = Path("temp_js/MockTestHome-BhOcUYLd.js")
text = p.read_text(encoding="utf-8", errors="ignore")
matches = re.findall(r"\.from\([^)]+\)[^;]{0,200}", text)
for m in matches:
    print("Match:", m)
