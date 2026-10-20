import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
from pathlib import Path
from collections import Counter

mock_dir = Path(r"C:\Users\truon\Downloads\toeicratruong\data\data\web_ready\mock_tests")

tests_summary = []
for f in mock_dir.glob("*.json"):
    data = json.loads(f.read_text(encoding="utf-8"))
    meta = data.get("meta", {})
    qs = data.get("questions", [])
    
    with_ans = sum(1 for q in qs if q.get("correct_answer") and str(q.get("correct_answer")).strip())
    with_audio = sum(1 for q in qs if q.get("audio_url") or q.get("local_audio"))
    with_image = sum(1 for q in qs if q.get("image_url") or q.get("local_image"))
    
    tests_summary.append({
        "file": f.name,
        "site": meta.get("site"),
        "test_type": meta.get("test_type"),
        "total_qs": len(qs),
        "with_ans": with_ans,
        "with_audio": with_audio,
        "with_image": with_image
    })

print(f"Total mock test files: {len(tests_summary)}")
fully_ans = [t for t in tests_summary if t["with_ans"] == t["total_qs"] and t["total_qs"] > 0]
zero_ans = [t for t in tests_summary if t["with_ans"] == 0 and t["total_qs"] > 0]
part_ans = [t for t in tests_summary if 0 < t["with_ans"] < t["total_qs"]]

print(f"Fully answered: {len(fully_ans)}")
print(f"Partially answered: {len(part_ans)}")
print(f"Zero answered: {len(zero_ans)}")

print("\nBreakdown of fully answered:")
print(Counter(t["site"] for t in fully_ans))

print("\nBreakdown of zero answered by site and test_type:")
for t in zero_ans[:15]:
    print(" ", t)

