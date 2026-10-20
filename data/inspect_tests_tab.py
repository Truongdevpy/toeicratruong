import sqlite3

conn = sqlite3.connect("data/crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()
cols = [r[1] for r in c.execute("PRAGMA table_info(tests)").fetchall()]
print("Tests columns:", cols)
c.execute("SELECT * FROM tests WHERE id='dautoeic_0ab9cd18-cf4b-4b5e-909f-ec524c2a9af8'")
row = c.fetchone()
print(dict(row))
conn.close()
