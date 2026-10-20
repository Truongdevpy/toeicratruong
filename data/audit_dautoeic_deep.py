import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
import os
from collections import Counter
from pathlib import Path

conn = sqlite3.connect(r"C:\Users\truon\Downloads\toeicratruong\data\data\crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("""
    SELECT q.*, t.name as test_name, t.slug as test_slug
    FROM questions q
    JOIN tests t ON q.test_id = t.id OR q.test_id = t.test_id
    WHERE q.site = 'dautoeic'
    ORDER BY q.test_id, q.question_number
""")
dau_qs = [dict(r) for r in c.fetchall()]

c.execute("SELECT url, local_path, status FROM downloads")
dl_map = {r["url"]: r["local_path"] for r in c.fetchall() if r["status"] == "completed"}

print(f"Total Dau TOEIC questions: {len(dau_qs)}")

# Check per part
part_stats = Counter()
audio_missing = []
audio_file_missing = []
image_missing = []
image_file_missing = []
options_missing = []
ans_distribution = Counter()
expl_missing = []

for q in dau_qs:
    p = q["part"]
    qn = q["question_number"]
    ans = q["correct_answer"]
    part_stats[p] += 1
    ans_distribution[ans] += 1
    
    # 1. Options check
    if p == 2:
        if not q["option_a"] or not q["option_b"] or not q["option_c"]:
            options_missing.append((q["id"], p, qn))
    else:
        if not q["option_a"] or not q["option_b"] or not q["option_c"] or not q["option_d"]:
            options_missing.append((q["id"], p, qn))
            
    # 2. Audio check for Listening (Parts 1-4)
    if p in [1, 2, 3, 4]:
        aud = q["audio_url"]
        if not aud:
            audio_missing.append((q["id"], p, qn))
        else:
            loc = dl_map.get(aud) or aud
            # check if exists on disk
            clean = str(loc).replace("\\", "/")
            if not os.path.exists(clean) and not os.path.exists(f"C:/Users/truon/Downloads/toeicratruong/data/{clean}"):
                audio_file_missing.append((q["id"], p, qn, aud, loc))
                
    # 3. Image check for Part 1
    if p == 1:
        img = q["image_url"]
        if not img:
            image_missing.append((q["id"], p, qn))
        else:
            loc = dl_map.get(img) or img
            clean = str(loc).replace("\\", "/")
            if not os.path.exists(clean) and not os.path.exists(f"C:/Users/truon/Downloads/toeicratruong/data/{clean}"):
                image_file_missing.append((q["id"], p, qn, img, loc))

    # 4. Explanation
    if not q["explanation"]:
        expl_missing.append((q["id"], p, qn))

print(f"Questions per Part in Dau TOEIC:")
for p in sorted(part_stats.keys()):
    print(f"  Part {p}: {part_stats[p]} questions")

print(f"\nAnswer distribution in Dau TOEIC:")
for k, v in ans_distribution.most_common():
    print(f"  {k}: {v}")

print(f"\nOptions missing in Dau TOEIC: {len(options_missing)}")
print(f"Audio missing in Listening: {len(audio_missing)}")
print(f"Audio file NOT on disk: {len(audio_file_missing)}")
if audio_file_missing:
    print("  Sample audio not on disk:", audio_file_missing[:3])
print(f"Image missing in Part 1: {len(image_missing)}")
print(f"Image file NOT on disk: {len(image_file_missing)}")
if image_file_missing:
    print("  Sample image not on disk:", image_file_missing[:3])
print(f"Explanation missing in Dau TOEIC: {len(expl_missing)}")

conn.close()
