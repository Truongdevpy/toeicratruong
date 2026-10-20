import sqlite3

conn = sqlite3.connect("data/crawler.db")
c = conn.cursor()

for t in ["tests", "questions", "passages", "parts", "downloads", "media"]:
    c.execute(f"SELECT site, count(*) FROM {t} GROUP BY site")
    print(f"--- {t} by site ---")
    for row in c.fetchall():
        print(row)
