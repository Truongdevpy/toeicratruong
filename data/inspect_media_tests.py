import sqlite3

conn = sqlite3.connect("data/crawler.db")
c = conn.cursor()
c.execute("SELECT DISTINCT test_id, count(*) FROM media GROUP BY test_id")
for r in c.fetchall():
    print(r)
conn.close()
