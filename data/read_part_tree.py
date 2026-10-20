import sys
sys.stdout.reconfigure(encoding="utf-8")
import re
from pathlib import Path

text = Path("temp_js/MockTestPartTree-DAElzRAl.js").read_text(encoding="utf-8", errors="ignore")
for m in re.finditer(r'mock_tests[^\;]{0,150}', text):
    print("->", m.group(0))
