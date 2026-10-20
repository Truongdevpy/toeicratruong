import json
from pathlib import Path

p = Path("C:/Users/truon/Downloads/toeicratruong/data/data/web_ready/mock_tests/study4_7059.json")
data = json.loads(p.read_text(encoding="utf-8"))
qs = data.get("questions", [])

for num in [1, 7, 32, 71, 95, 101]:
    q = next((x for x in qs if x.get("question_number") == num), None)
    if q:
        print(f"\n=== Q#{num} (Part {q.get('part')}) ===")
        print("question_text:", repr(q.get("question_text")))
        print("options:", repr(q.get("options")))
