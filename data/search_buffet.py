import sqlite3

conn = sqlite3.connect("data/crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("""
    SELECT q.test_id, t.name, t.site, q.part, q.question_number
    FROM questions q
    JOIN tests t ON q.test_id = t.id OR q.test_id = t.test_id
    WHERE q.option_a LIKE '%restaurant buffet is filled with food%'
""")
rows = c.fetchall()
for r in rows:
    print(dict(r))
conn.close()
