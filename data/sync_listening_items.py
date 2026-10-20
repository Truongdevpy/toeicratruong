import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from config import DAUTOEIC_CONFIG, DB_PATH

token = Path("dau_auth_token.txt").read_text().strip()
headers = {
    "apikey": DAUTOEIC_CONFIG["supabase_anon_key"],
    "Authorization": f"Bearer {token}",
}
url = f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1"

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

c.execute("""
CREATE TABLE IF NOT EXISTS listening_items (
    id TEXT PRIMARY KEY,
    site TEXT NOT NULL,
    set_id TEXT,
    toeic_part INTEGER,
    title_vi TEXT,
    title_en TEXT,
    audio_url TEXT,
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
conn.commit()

now_iso = datetime.now(timezone.utc).isoformat()
all_items = []
offset = 0
limit = 1000

print("Fetching all listening_items from Dau TOEIC...")
with httpx.Client(headers=headers, timeout=30) as client:
    while True:
        r = client.get(
            f"{url}/listening_items?select=*&limit={limit}&offset={offset}",
            headers={"Range": f"{offset}-{offset + limit - 1}"}
        )
        if r.status_code not in (200, 206):
            print(f"Error fetching at offset {offset}: {r.status_code}")
            break
        batch = r.json()
        if not batch or not isinstance(batch, list):
            break
        all_items.extend(batch)
        print(f"  Fetched {len(all_items)} listening items...")
        if len(batch) < limit:
            break
        offset += len(batch)

print(f"Total listening items fetched: {len(all_items)}")

for item in all_items:
    c.execute("""
    INSERT OR REPLACE INTO listening_items (
        id, site, set_id, toeic_part, title_vi, title_en,
        audio_url, transcript, translation_vi, hint,
        duration_seconds, difficulty_level, category, raw_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        f"dautoeic_{item['id']}",
        "dautoeic",
        item.get("set_id"),
        item.get("toeic_part"),
        item.get("title_vi"),
        item.get("title_en"),
        item.get("audio_url"),
        item.get("transcript"),
        item.get("translation_vi"),
        item.get("hint"),
        item.get("duration_seconds"),
        item.get("difficulty_level"),
        item.get("category"),
        json.dumps(item, ensure_ascii=False),
        now_iso
    ))

conn.commit()
print("SUCCESS: Synced all listening_items into crawler.db!")
