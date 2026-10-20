import sqlite3
import os

db_path = r"C:\Users\truon\Downloads\toeicratruong\data\data\crawler.db"
print("DB exists:", os.path.exists(db_path))
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cur.fetchall()
    print("Tables in crawler.db:", tables)
    for t in tables:
        tname = t[0]
        cur.execute(f"SELECT count(*) FROM {tname}")
        cnt = cur.fetchone()[0]
        print(f"  {tname}: {cnt} rows")
