import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
import json
import os
from datetime import datetime, timezone
from pathlib import Path

conn = sqlite3.connect("data/crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

now_iso = datetime.now(timezone.utc).isoformat()

print("1. Syncing Study4 audio and images into media table...")
c.execute("""
    SELECT DISTINCT q.site, q.test_id, q.part, q.id as question_id, q.audio_url, d.local_path
    FROM questions q
    JOIN downloads d ON q.audio_url = d.url
    WHERE q.audio_url IS NOT NULL AND q.audio_url != '' AND d.status='completed'
""")
audio_matches = c.fetchall()
print(f"Found {len(audio_matches)} question audio downloads.")

for row in audio_matches:
    ext = os.path.splitext(row["local_path"])[1] or ".mp3"
    c.execute("""
        INSERT OR IGNORE INTO media (site, test_id, part, question_id, url, media_type, extension, local_path, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'audio', ?, ?, 'completed', ?)
    """, (row["site"], row["test_id"], row["part"], row["question_id"], row["audio_url"], ext, row["local_path"], now_iso))

c.execute("""
    SELECT DISTINCT site, test_id, part, id as question_id, image_url
    FROM questions
    WHERE image_url IS NOT NULL AND image_url != ''
""")
img_matches = c.fetchall()
print(f"Found {len(img_matches)} questions with image paths.")

for row in img_matches:
    img_path = row["image_url"]
    if os.path.exists(img_path):
        ext = os.path.splitext(img_path)[1] or ".jpg"
        c.execute("""
            INSERT OR IGNORE INTO media (site, test_id, part, question_id, url, media_type, extension, local_path, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'image', ?, ?, 'completed', ?)
        """, (row["site"], row["test_id"], row["part"], row["question_id"], row["image_url"], ext, img_path, now_iso))

conn.commit()

c.execute("SELECT site, media_type, COUNT(*) FROM media GROUP BY site, media_type")
print("\nUpdated Media Table Summary:")
for r in c.fetchall():
    print(f"  {r[0]:<15} {r[1]:<10}: {r[2]}")

print("\n2. Populating listening_items table from authentic listening questions...")
c.execute("""
    CREATE TABLE IF NOT EXISTS listening_items (
        id TEXT PRIMARY KEY,
        site TEXT NOT NULL,
        set_id TEXT,
        toeic_part INTEGER,
        title_vi TEXT,
        title_en TEXT,
        audio_url TEXT,
        local_audio TEXT,
        transcript TEXT,
        translation_vi TEXT,
        hint TEXT,
        duration_seconds REAL,
        difficulty_level INTEGER,
        category TEXT,
        raw_json TEXT,
        created_at TEXT NOT NULL
    );
""")

c.execute("""
    SELECT q.*, d.local_path as resolved_local_audio
    FROM questions q
    LEFT JOIN downloads d ON q.audio_url = d.url
    WHERE q.part IN (1, 2, 3, 4) AND q.audio_url IS NOT NULL AND q.audio_url != ''
    ORDER BY q.site, q.test_id, q.part, q.question_number
""")
q_listening = c.fetchall()
print(f"Found {len(q_listening)} authentic listening questions for listening_items.")

item_count = 0
for q in q_listening:
    raw = {}
    try: raw = json.loads(q["raw_json"]) if q["raw_json"] else {}
    except: pass
    
    transcript = q["passage_text"] or q["question_text"] or ""
    if not transcript and raw:
        transcript = raw.get("transcript") or raw.get("script") or ""
    
    trans_vi = q["instruction"] or raw.get("vietnamese_translation") or raw.get("dich_nghia") or ""
    hint = raw.get("tu_vung") or ""
    if isinstance(hint, list):
        hint = ", ".join(hint)

    local_audio = q["resolved_local_audio"] or ""
    
    item_id = f"listen_item_{q['id']}"
    set_id = f"set_{q['test_id']}_p{q['part']}"
    
    title_vi = f"Luyện nghe Part {q['part']} - Câu {q['question_number']}"
    title_en = f"Listening Part {q['part']} - Q{q['question_number']}"

    c.execute("""
        INSERT OR REPLACE INTO listening_items (
            id, site, set_id, toeic_part, title_vi, title_en,
            audio_url, local_audio, transcript, translation_vi, hint,
            duration_seconds, difficulty_level, category, raw_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        item_id,
        q["site"],
        set_id,
        q["part"],
        title_vi,
        title_en,
        q["audio_url"],
        local_audio,
        transcript,
        trans_vi,
        hint,
        raw.get("duration", 0),
        raw.get("difficulty_level", 1),
        f"Part {q['part']}",
        q["raw_json"],
        now_iso
    ))
    item_count += 1

conn.commit()

c.execute("SELECT COUNT(*) FROM listening_items")
print(f"Total rows in listening_items: {c.fetchone()[0]}")
