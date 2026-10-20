import sqlite3

conn = sqlite3.connect("data/crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()
cols = [r[1] for r in c.execute("PRAGMA table_info(media)").fetchall()]
print("Media cols:", cols)
c.execute("SELECT count(*) as cnt FROM media")
print("Total rows in media:", c.fetchone()["cnt"])
c.execute("SELECT * FROM media LIMIT 5")
for r in c.fetchall():
    print(dict(r))
conn.close()
