import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
import json
import re
from pathlib import Path
from collections import defaultdict

conn = sqlite3.connect("data/crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("""
    SELECT id, site, set_id, toeic_part, title_vi, title_en, audio_url, local_audio, transcript, translation_vi
    FROM listening_items
    WHERE transcript IS NOT NULL AND length(trim(transcript)) > 10
    ORDER BY toeic_part, id
""")
items = c.fetchall()
print(f"Loaded {len(items)} items for dictation.")

challenges_by_set = defaultdict(list)
all_challenges = []

for idx, item in enumerate(items):
    raw_sentence = item["transcript"].strip()
    words = raw_sentence.split()
    masked_words = [("_____" if i % 3 == 1 else w) for i, w in enumerate(words)]
    keywords = [re.sub(r'[^\w]', '', w) for w in words if len(w) > 4][:4]
    
    audio_path = item["local_audio"] or item["audio_url"]
    if audio_path and not audio_path.startswith("http"):
        audio_url = f"/{audio_path.replace(chr(92), '/')}"
    else:
        audio_url = audio_path or ""

    diff = "Easy" if len(words) <= 7 else ("Medium" if len(words) <= 12 else "Hard")

    ch = {
        "id": item["id"],
        "set_id": item["set_id"],
        "part": item["toeic_part"],
        "title": item["title_vi"] or f"Luyện chép chính tả câu {idx + 1}",
        "audio_url": audio_url,
        "full_sentence": raw_sentence,
        "blanks_sentence": " ".join(masked_words),
        "keywords": keywords,
        "vietnamese_translation": item["translation_vi"] or "",
        "difficulty": diff
    }
    all_challenges.append(ch)
    challenges_by_set[item["set_id"]].append(ch)

out_file = Path("data/web_ready/dictation_challenges.json")
out_file.write_text(json.dumps({
    "total": len(all_challenges),
    "challenges": all_challenges[:100],  # default sample
    "all_challenges_count": len(all_challenges),
    "total_sets": len(challenges_by_set)
}, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"SUCCESS: Saved {len(all_challenges)} dictation challenges across {len(challenges_by_set)} sets to {out_file}!")
