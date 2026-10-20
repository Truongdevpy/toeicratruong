# -*- coding: utf-8 -*-
import json
from pathlib import Path

mock_dir = Path("C:/Users/truon/Downloads/toeicratruong/data/data/web_ready/mock_tests")
catalog_path = Path("C:/Users/truon/Downloads/toeicratruong/data/data/web_ready/tests_catalog.json")

catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
print(f"Catalog has {len(catalog)} tests.")

test_report = []

for t in catalog:
    t_id = t["id"]
    f_name = t.get("file_name", f"{t_id}.json")
    f_path = mock_dir / f_name
    if not f_path.exists():
        continue
    try:
        data = json.loads(f_path.read_text(encoding="utf-8"))
        qs = data.get("questions", [])
        
        # Count listening questions with question-specific audio (not full tape)
        l_qs = [q for q in qs if q.get("part", 1) <= 4]
        p1_imgs = [q for q in qs if q.get("part") == 1 and (q.get("local_image") or q.get("image_url"))]
        
        sliced_audios = 0
        overall = data.get("overall_audio") or t.get("overall_audio")
        
        for q in l_qs:
            aud = q.get("local_audio") or q.get("audio_url")
            if aud:
                aud_str = str(aud).lower()
                is_full = False
                if overall and aud == overall:
                    is_full = True
                elif any(k in aud_str for k in ["economy_toeic", "sample_toeic", "new_real_toeic"]) and not any(k in aud_str for k in ["part_", "q0", "passage_"]):
                    is_full = True
                if not is_full:
                    sliced_audios += 1
                    
        test_report.append({
            "id": t_id,
            "name": t.get("name"),
            "site": t.get("site"),
            "total_q": len(qs),
            "listening_q": len(l_qs),
            "sliced_audios": sliced_audios,
            "p1_imgs": len(p1_imgs),
            "has_overall_audio": bool(overall)
        })
    except Exception as e:
        print(f"Error {t_id}: {e}")

print(f"Analyzed {len(test_report)} tests.")
# Filter tests that have full sliced audio (>= 90% listening audio)
perfect_tests = [r for r in test_report if r["sliced_audios"] >= 50]
print(f"\nTests with high sliced audio coverage ({len(perfect_tests)}):")
for r in perfect_tests:
    print(f" - [{r['site']}] {r['name']} ({r['id']}): sliced_aud={r['sliced_audios']}/{r['listening_q']}, p1_imgs={r['p1_imgs']}")

print("\nTests with overall audio only:")
overall_only = [r for r in test_report if r["sliced_audios"] < 50 and r["has_overall_audio"]]
print(f"Count: {len(overall_only)}")
for r in overall_only[:5]:
    print(f" - {r['name']} ({r['id']})")
