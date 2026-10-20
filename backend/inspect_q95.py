# -*- coding: utf-8 -*-
import json
from pathlib import Path

p = Path("C:/Users/truon/Downloads/toeicratruong/data/data/web_ready/mock_tests/study4_7059.json")
data = json.loads(p.read_text(encoding="utf-8"))
qs = data.get("questions", [])
for num in [95, 96, 97, 98, 99, 100]:
    q = next((x for x in qs if x.get("question_number") == num), None)
    if q:
        print(f"\nQ#{num}:")
        print("  local_audio:", q.get("local_audio"))
        print("  audio_url:", q.get("audio_url"))
        print("  local_image:", q.get("local_image"))
        print("  image_url:", q.get("image_url"))
