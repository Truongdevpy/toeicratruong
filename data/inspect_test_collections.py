import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
from collections import Counter

conn = sqlite3.connect(r"C:\Users\truon\Downloads\toeicratruong\data\data\crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("SELECT site, collection_id, count(*) as count FROM tests GROUP BY site, collection_id")
for r in c.fetchall():
    print(dict(r))

c.execute("SELECT id, name, slug, total_questions, duration_minutes FROM tests WHERE site='dautoeic' LIMIT 5")
print("\nDau TOEIC tests sample:")
for r in c.fetchall():
    print(" ", dict(r))

c.execute("SELECT id, name, slug, total_questions, duration_minutes FROM tests WHERE site='study4' LIMIT 10")
print("\nStudy4 tests sample:")
for r in c.fetchall():
    print(" ", dict(r))

conn.close()
