import sys
sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path

files = []
for p in list(Path(".").glob("*.js")) + list(Path("temp_js").glob("*.js")):
    text = p.read_text(encoding="utf-8", errors="ignore")
    if "mock_test" in text:
        files.append((p.name, p.stat().st_size))

for name, size in sorted(files, key=lambda x: -x[1]):
    print(f"{name:<40} {size} bytes")
