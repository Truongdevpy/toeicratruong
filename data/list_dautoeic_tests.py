import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3

conn = sqlite3.connect(r"C:\Users\truon\Downloads\toeicratruong\data\data\crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("SELECT id, test_id, name, slug FROM tests WHERE site='dautoeic'")
rows = c.fetchall()
for i, r in enumerate(rows):
    print(f"{i+1:2d}. id={r['id']}, test_id={r['test_id']}, name={r['name']}, slug={r['slug']}")

conn.close()
