import sqlite3
import json

conn = sqlite3.connect("data/crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT id, name, slug, total_questions FROM tests WHERE site='dautoeic'")
rows = c.fetchall()
print(f"Total dautoeic tests in DB: {len(rows)}")
for r in rows:
    print(dict(r))
conn.close()
