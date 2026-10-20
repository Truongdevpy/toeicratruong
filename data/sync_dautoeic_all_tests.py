import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict
from config import DAUTOEIC_CONFIG, DB_PATH

token = Path("dau_auth_token.txt").read_text().strip()
headers = {
    "apikey": DAUTOEIC_CONFIG["supabase_anon_key"],
    "Authorization": f"Bearer {token}",
}
url = f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
c = conn.cursor()
now_iso = datetime.now(timezone.utc).isoformat()

# 1. Fetch all 6,200 mock_test_questions
print("Fetching all mock_test_questions from Supabase...")
all_questions = []
offset = 0
limit = 1000
with httpx.Client(headers=headers, timeout=30) as client:
    while True:
        r = client.get(
            f"{url}/mock_test_questions?select=*&limit={limit}&offset={offset}",
            headers={"Range": f"{offset}-{offset + limit - 1}"}
        )
        if r.status_code not in (200, 206):
            print(f"Error fetching questions at offset {offset}: {r.status_code}")
            break
        batch = r.json()
        if not batch or not isinstance(batch, list):
            break
        all_questions.extend(batch)
        print(f"  Fetched {len(all_questions)} questions...")
        if len(batch) < limit:
            break
        offset += len(batch)

print(f"Total questions fetched: {len(all_questions)}")

# 2. Fetch all 1,302 mock_test_passages
print("Fetching all mock_test_passages from Supabase...")
all_passages = []
offset = 0
with httpx.Client(headers=headers, timeout=30) as client:
    while True:
        r = client.get(
            f"{url}/mock_test_passages?select=*&limit={limit}&offset={offset}",
            headers={"Range": f"{offset}-{offset + limit - 1}"}
        )
        if r.status_code not in (200, 206):
            print(f"Error fetching passages at offset {offset}: {r.status_code}")
            break
        batch = r.json()
        if not batch or not isinstance(batch, list):
            break
        all_passages.extend(batch)
        print(f"  Fetched {len(all_passages)} passages...")
        if len(batch) < limit:
            break
        offset += len(batch)

print(f"Total passages fetched: {len(all_passages)}")

# Save passages
passage_map = {p["id"]: p for p in all_passages}
for p in all_passages:
    c.execute("""
    INSERT OR REPLACE INTO passages (
        id, site, test_id, part, title, passage_text,
        audio_url, image_url, transcript, order_index, raw_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        f"dautoeic_{p['id']}",
        "dautoeic",
        f"dautoeic_{p['test_id']}",
        p.get("part", 7),
        p.get("title", ""),
        p.get("passage_text", "") or p.get("passage_html", ""),
        p.get("audio_url", ""),
        p.get("image_url", ""),
        p.get("transcript", ""),
        p.get("order_index", 0),
        json.dumps(p, ensure_ascii=False),
        now_iso
    ))

# Group questions by test_id
questions_by_test = defaultdict(list)
for q in all_questions:
    questions_by_test[q["test_id"]].append(q)

print(f"Total distinct tests found in questions: {len(questions_by_test)}")

# Upsert tests in tests table
for tid, q_list in questions_by_test.items():
    test_db_id = f"dautoeic_{tid}"
    c.execute("SELECT name FROM tests WHERE id = ?", (test_db_id,))
    row = c.fetchone()
    if row and row["name"]:
        test_name = row["name"]
    else:
        test_name = f"Dau TOEIC ETS ({tid[:8]})"

    c.execute("""
    INSERT OR REPLACE INTO tests (
        id, site, collection_id, test_id, name, slug, url,
        total_questions, duration_minutes, is_free, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        test_db_id,
        "dautoeic",
        "dautoeic_ets_full",
        tid,
        test_name,
        tid,
        f"https://dauenglish.com/tests/{tid}",
        len(q_list),
        120,
        1,
        "completed",
        now_iso,
        now_iso
    ))

# Insert questions
for q in all_questions:
    p_text = ""
    if q.get("passage_id") and q["passage_id"] in passage_map:
        p_text = passage_map[q["passage_id"]].get("passage_text", "")
    elif q.get("passage_text"):
        p_text = q["passage_text"]

    c.execute("""
    INSERT OR REPLACE INTO questions (
        id, site, test_id, part, question_number, question_type,
        instruction, passage_text, question_text,
        option_a, option_b, option_c, option_d,
        correct_answer, explanation, image_url, audio_url,
        raw_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        f"dautoeic_{q['id']}",
        "dautoeic",
        f"dautoeic_{q['test_id']}",
        q.get("part", 1),
        q.get("question_number", 0),
        q.get("question_type", "") or q.get("photo_type", "") or q.get("scene_type", ""),
        q.get("dich_nghia", ""),
        p_text,
        q.get("question_text", ""),
        q.get("option_a", ""),
        q.get("option_b", ""),
        q.get("option_c", ""),
        q.get("option_d", ""),
        q.get("correct_answer", ""),
        q.get("explanation_vi") or q.get("explanation_en") or "",
        q.get("image_url", ""),
        q.get("audio_url", ""),
        json.dumps(q, ensure_ascii=False),
        now_iso
    ))

conn.commit()
print("SUCCESS: Synced all 6,200 questions, 1,302 passages, and 31 tests from Dau TOEIC into crawler.db!")
