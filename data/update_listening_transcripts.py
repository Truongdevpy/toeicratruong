import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
import re

conn = sqlite3.connect("data/crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("""
    SELECT q.*, d.local_path as resolved_local_audio
    FROM questions q
    LEFT JOIN downloads d ON q.audio_url = d.url
    WHERE q.part IN (1, 2) AND q.audio_url IS NOT NULL AND q.audio_url != ''
    ORDER BY q.site, q.test_id, q.part, q.question_number
""")
rows = c.fetchall()
print(f"Updating listening_items for {len(rows)} Part 1 & Part 2 questions...")

count = 0
for q in rows:
    part = q["part"]
    ans = (q["correct_answer"] or "A").strip().upper()
    
    if part == 1:
        # Choose the correct option sentence
        opt_key = f"option_{ans.lower()}"
        sentence = q[opt_key] or q["option_a"] or ""
    elif part == 2:
        # Question prompt
        sentence = q["question_text"] or ""
        # If question prompt is short, append correct response
        opt_key = f"option_{ans.lower()}"
        resp = q[opt_key] or ""
        if resp and len(sentence) < 30:
            sentence = f"{sentence} — {resp}"
    
    clean_sentence = re.sub(r'<[^>]+>', '', sentence).strip()
    if len(clean_sentence) < 8:
        continue
        
    item_id = f"listen_item_{q['id']}"
    local_audio = q["resolved_local_audio"] or ""
    
    c.execute("""
        UPDATE listening_items
        SET transcript = ?,
            local_audio = ?
        WHERE id = ?
    """, (clean_sentence, local_audio, item_id))
    count += 1

conn.commit()
print(f"Updated {count} listening_items with authentic sentences!")
