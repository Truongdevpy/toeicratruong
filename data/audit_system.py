import sqlite3
import json
from pathlib import Path

db_path = r"C:\Users\truon\Downloads\toeicratruong\data\data\crawler.db"
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print("Tables in crawler.db:", tables)
for t in tables:
    c.execute(f"SELECT count(*) FROM {t}")
    cnt = c.fetchone()[0]
    print(f"  {t}: {cnt} rows")

c.execute("PRAGMA table_info(tests)")
print("\ntests schema:", [r[1] for r in c.fetchall()])

c.execute("PRAGMA table_info(questions)")
print("\nquestions schema:", [r[1] for r in c.fetchall()])

c.execute("PRAGMA table_info(passages)")
print("\npassages schema:", [r[1] for r in c.fetchall()])

conn.close()
