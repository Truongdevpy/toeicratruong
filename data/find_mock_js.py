import re
from pathlib import Path

for p in list(Path(".").glob("*.js")) + list(Path("temp_js").glob("*.js")):
    text = p.read_text(encoding="utf-8", errors="ignore")
    if "mock_tests" in text or "mock_test_sets" in text:
        print(f"Found in {p.name}")
        for line in text.split(";"):
            if "mock_tests" in line or "mock_test_sets" in line:
                if len(line) < 300:
                    print("  ", line.strip())
