import json
from pathlib import Path

mock_dir = Path("data/web_ready/mock_tests")
catalog_path = Path("data/web_ready/tests_catalog.json")

with open(catalog_path, "r", encoding="utf-8") as f:
    catalog = json.load(f)

missing_opt_tests = {}

for t in catalog:
    if t.get("test_type") != "lr_full":
        continue
    fname = t.get("file_name", f"{t['id']}.json")
    p = mock_dir / fname
    if not p.exists():
        p = mock_dir / f"{t['id']}.json"
    if not p.exists(): continue
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    qs = data.get("questions", [])
    for q in qs:
        part = q.get("part", 1)
        qn = q.get("question_number")
        if part in [1, 3, 4, 5, 6, 7]:
            opts = q.get("options") or {}
            missing = [k for k in ["A", "B", "C", "D"] if not (opts.get(k) or q.get(f"option_{k.lower()}"))]
            if missing:
                if t["id"] not in missing_opt_tests:
                    missing_opt_tests[t["id"]] = []
                missing_opt_tests[t["id"]].append((qn, part, missing))

print(f"Tests with missing options: {len(missing_opt_tests)}")
for tid, items in missing_opt_tests.items():
    print(f"Test {tid}: {len(items)} questions with missing options")
    for qn, part, missing in items[:5]:
        print(f"   Q{qn} (Part {part}): missing {missing}")
