import sqlite3

conn = sqlite3.connect("data/crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT * FROM media WHERE site='dautoeic' AND test_id LIKE '%4fb65467%' LIMIT 10")
for r in c.fetchall():
    print(dict(r))
conn.close()
