import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import sqlite3
import json
from pathlib import Path

# 1. Search in questions raw_json
conn = sqlite3.connect(r"C:\Users\truon\Downloads\toeicratruong\data\data\crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("SELECT raw_json FROM questions WHERE site='study4' LIMIT 10")
for i, r in enumerate(c.fetchall()):
    rj = json.loads(r["raw_json"]) if r["raw_json"] else {}
    print(f"Sample study4 raw_json {i}: keys={list(rj.keys())}")
    # print sample values
    print("  ", {k: str(v)[:80] for k, v in rj.items() if k not in ["images", "audios"]})

# 2. Check if other tables have study4 answers
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [t[0] for t in c.fetchall()]
for t in tables:
    if t in ["questions", "tests", "downloads"]: continue
    c.execute(f"PRAGMA table_info({t})")
    cols = [col[1] for col in c.fetchall()]
    print(f"Table {t} columns:", cols)

conn.close()

# 3. Check data directory for study4 JSON files or crawler dumps
print("\nSearching data folder for study4 files...")
for p in Path(r"C:\Users\truon\Downloads\toeicratruong\data").rglob("*.json"):
    if "study4" in p.name.lower() or "study4" in str(p.parent).lower():
        print("Found:", p, f"({p.stat().st_size} bytes)")

