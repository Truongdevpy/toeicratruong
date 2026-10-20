import sqlite3

conn = sqlite3.connect("C:/Users/truon/Downloads/toeicratruong/data/data/crawler.db")
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print("Tables in crawler.db:", tables)

for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    cnt = cur.fetchone()[0]
    print(f"Table {t}: {cnt} rows")

cur.execute("PRAGMA table_info(tests)")
print("tests cols:", [c[1] for c in cur.fetchall()])

cur.execute("PRAGMA table_info(questions)")
print("questions cols:", [c[1] for c in cur.fetchall()])

cur.execute("SELECT test_id, name, total_questions, duration_minutes FROM tests LIMIT 10")
for r in cur.fetchall():
    print(r)
