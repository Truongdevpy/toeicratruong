import json
from pathlib import Path

mock_dir = Path("data/web_ready/mock_tests")
catalog_path = Path("data/web_ready/tests_catalog.json")

with open(catalog_path, "r", encoding="utf-8") as f:
    catalog = json.load(f)

study4_tests = [t for t in catalog if t.get("site") == "study4"]

sample_missing_opts = []
for t in study4_tests:
    fname = t.get("file_name", f"{t['id']}.json")
    p = mock_dir / fname
    if not p.exists():
        p = mock_dir / f"{t['id']}.json"
    if not p.exists():
        continue
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    qs = data.get("questions", [])
    for q in qs:
        part = q.get("part", 1)
        if part in [1, 3, 4, 5, 6, 7]:
            opts = q.get("options") or {}
            missing = [k for k in ["A", "B", "C", "D"] if not (opts.get(k) or q.get(f"option_{k.lower()}"))]
            if missing:
                sample_missing_opts.append({
                    "test_id": t["id"],
                    "test_type": t.get("test_type"),
                    "part": part,
                    "q_num": q.get("question_number"),
                    "missing": missing,
                    "q": q
                })
                if len(sample_missing_opts) >= 5:
                    break
    if len(sample_missing_opts) >= 5:
        break

print(f"Sample missing options count: {len(sample_missing_opts)}")
for s in sample_missing_opts:
    print(f"Test {s['test_id']} (Type: {s['test_type']}), Part {s['part']}, Q{s['q_num']}: Missing {s['missing']}")
    print("  Question text:", s['q'].get('question_text') or s['q'].get('question'))
    print("  Options:", s['q'].get('options'))
    print("  Keys:", list(s['q'].keys()))
