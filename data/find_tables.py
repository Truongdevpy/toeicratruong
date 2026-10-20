import re
from pathlib import Path

tables = set()
for p in list(Path(".").glob("*.js")) + list(Path("temp_js").glob("*.js")):
    text = p.read_text(encoding="utf-8", errors="ignore")
    for m in re.finditer(r"\.from\(['\"]([a-zA-Z0-9_]+)['\"]", text):
        tables.add(m.group(1))

print("Found tables:")
for t in sorted(tables):
    print(" -", t)
