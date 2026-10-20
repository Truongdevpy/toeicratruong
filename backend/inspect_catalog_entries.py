# -*- coding: utf-8 -*-
import json
from pathlib import Path

p = Path("C:/Users/truon/Downloads/toeicratruong/data/data/web_ready/tests_catalog.json")
cat = json.loads(p.read_text(encoding="utf-8"))
print(f"Total catalog entries: {len(cat)}")
for t in cat[:10]:
    print(t.get("id"), "|", t.get("name"), "|", t.get("file_name"), "|", t.get("test_type"))
