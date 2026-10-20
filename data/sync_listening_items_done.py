import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
import json
import os
from datetime import datetime, timezone

conn = sqlite3.connect("data/crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

try:
    c.execute("ALTER TABLE listening_items ADD COLUMN local_audio TEXT")
    conn.commit()
    print("Added local_audio column.")
except Exception:
    pass

now_iso = datetime.now(timezone.utc).isoformat()

c.execute("""
    SELECT q.*, d.local_path as resolved_local_audio
    FROM questions q
    LEFT JOIN downloads d ON q.audio_url = d.url
    WHERE q.part IN (1, 2, 3, 4) AND q.audio_url IS NOT NULL AND q.audio_url != ''
    ORDER BY q.site, q.test_id, q.part, q.question_number
""")
q_listening = c.fetchall()
print(f"Found {len(q_listening)} authentic listening questions for listening_items.")

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

conn.commit()

c.execute("SELECT COUNT(*) FROM listening_items")
print(f"SUCCESS: Total rows in listening_items: {c.fetchone()[0]}")
