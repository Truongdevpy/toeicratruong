# -*- coding: utf-8 -*-
import json
from pathlib import Path

p = Path("C:/Users/truon/Downloads/toeicratruong/data/data/web_ready/mock_tests/dautoeic_832b2e18-2fd4-444c-b47b-2fcf76812b17.json")
data = json.loads(p.read_text(encoding="utf-8"))
qs = data.get("questions", [])
print("Total questions:", len(qs))
print("Overall audio:", data.get("overall_audio"))
for num in [1, 2, 7, 8, 32, 33, 71, 101, 102]:
    q = next((x for x in qs if x.get("question_number") == num), None)
    if q:
        print(f"\nQ#{num} (Part {q.get('part')}):")
        print("  text:", q.get("question_text"))
        print("  local_audio:", q.get("local_audio"))
        print("  local_image:", q.get("local_image"))
        print("  options:", q.get("options"))
        print("  correct:", q.get("correct_answer"))
