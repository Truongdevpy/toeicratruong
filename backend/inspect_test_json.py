import json
from pathlib import Path

p = Path("C:/Users/truon/Downloads/toeicratruong/data/data/web_ready/mock_tests/study4_224.json")
data = json.loads(p.read_text(encoding="utf-8"))
print("Meta:", data.get("meta"))
qs = data.get("questions", [])
print("Total questions:", len(qs))
for i in [0, 1, 5, 6, 7, 30, 31, 70, 71, 100, 101]:
    if i < len(qs):
        q = qs[i]
        print(f"\n--- Q#{q.get('question_number')} (Part {q.get('part')}) ---")
        print("text:", q.get("question_text"))
        print("local_audio:", q.get("local_audio"))
        print("audio_url:", q.get("audio_url"))
        print("local_image:", q.get("local_image"))
        print("image_url:", q.get("image_url"))
        print("audio_start_time:", q.get("audio_start_time"), "audio_end_time:", q.get("audio_end_time"))
        print("options:", q.get("options"))
        print("correct:", q.get("correct_answer"))
