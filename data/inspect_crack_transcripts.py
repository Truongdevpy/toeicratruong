import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
from pathlib import Path

mock_dir = Path("data/web_ready/mock_tests")

crack_p1 = mock_dir / "dautoeic_832b2e18-2fd4-444c-b47b-2fcf76812b17.json"
with open(crack_p1, "r", encoding="utf-8") as f:
    d = json.load(f)

print("Crack Test 1 Q1:", json.dumps(d["questions"][0], indent=2, ensure_ascii=True))
print("Crack Test 1 Q7 (Part 2):", json.dumps(d["questions"][6], indent=2, ensure_ascii=True))
print("Crack Test 1 Q32 (Part 3):", json.dumps(d["questions"][31], indent=2, ensure_ascii=True))
