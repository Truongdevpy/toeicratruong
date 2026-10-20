from pathlib import Path
import re

text = Path("temp_js/useMockTestPractice-1n_HwFpN.js").read_text(encoding="utf-8")
# Look for function qe or where qe is defined
matches = re.findall(r'(function qe\([^)]*\)\{[^}]+\}|const qe\s*=\s*[^;]+;)', text)
for m in matches:
    print(m)
if not matches:
    # Look for imports
    print("Imports in useMockTestPractice:")
    for line in text[:2000].split(";"):
        if "qe" in line:
            print(line)
