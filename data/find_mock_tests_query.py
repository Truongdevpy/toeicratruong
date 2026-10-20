import sys
sys.stdout.reconfigure(encoding="utf-8")
import re
from pathlib import Path

for p in Path("temp_js").glob("*.js"):
    text = p.read_text(encoding="utf-8", errors="ignore")
    if '.from("mock_tests")' in text or ".from('mock_tests')" in text:
        print(f"File: {p.name}")
        for m in re.finditer(r'\.from\(["\']mock_tests["\']\)\.select\([^)]*\)', text):
            print("  Query:", m.group(0))
